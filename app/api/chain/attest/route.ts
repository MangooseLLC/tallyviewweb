import { NextResponse } from 'next/server';
import { keccak256, toHex, type Address } from 'viem';
import { getUserOrg } from '@/lib/get-user-org';
import { prisma } from '@/lib/prisma';
import { publicClient, getRelayWalletClient } from '@/lib/chain/client';
import { CONTRACTS, FUJI_EXPLORER_URL } from '@/lib/chain/config';
import { auditLedgerAbi } from '@/lib/chain/abis/AuditLedger';
import { generateMerkleRoot, SCHEMA_HASH } from '@/lib/pipeline/hash';
import { buildFinancialPackage } from '@/lib/pipeline/from-qbo';
import { slugify, deriveOrgAddress } from '@/lib/chain/org-utils';

export async function POST() {
  const walletClient = getRelayWalletClient();
  if (!walletClient) {
    return NextResponse.json(
      { error: 'Attestation relay not configured', details: 'RELAY_PRIVATE_KEY is missing' },
      { status: 503 }
    );
  }

  const { org, error: orgError } = await getUserOrg();
  if (!org) {
    return NextResponse.json(
      { error: orgError || 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    let chainAddress: Address | null = null;
    if (org.chainAddress) {
      const { isAddress, getAddress } = await import('viem');
      if (!isAddress(org.chainAddress)) {
        return NextResponse.json({ error: 'Corrupted on-chain address in database' }, { status: 500 });
      }
      chainAddress = getAddress(org.chainAddress);
    }

    // --- Auto-provision on-chain identity if needed ---
    if (!chainAddress) {
      const derived = deriveOrgAddress(org.id);
      const slug = slugify(org.name);
      if (slug.length < 3) {
        return NextResponse.json(
          { error: 'Organization name too short for on-chain registration (min 3 chars)' },
          { status: 400 }
        );
      }

      const isRegistered = await publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'isOrganizationRegistered',
        args: [derived],
      });

      if (!isRegistered) {
        const einHash = keccak256(toHex('\u2014'));

        try {
          const regHash = await walletClient.writeContract({
            address: CONTRACTS.auditLedger,
            abi: auditLedgerAbi,
            functionName: 'registerOrganization',
            args: [derived, slug, einHash],
          });
          await publicClient.waitForTransactionReceipt({ hash: regHash });
        } catch (regErr) {
          const msg = regErr instanceof Error ? regErr.message : '';
          if (msg.includes('OrgNotProvisioned') || msg.includes('TxAllowList')) {
            const disableHash = await walletClient.writeContract({
              address: CONTRACTS.auditLedger,
              abi: auditLedgerAbi,
              functionName: 'setAvalancheMode',
              args: [false],
            });
            await publicClient.waitForTransactionReceipt({ hash: disableHash });

            const retryHash = await walletClient.writeContract({
              address: CONTRACTS.auditLedger,
              abi: auditLedgerAbi,
              functionName: 'registerOrganization',
              args: [derived, slug, einHash],
            });
            await publicClient.waitForTransactionReceipt({ hash: retryHash });
          } else {
            throw regErr;
          }
        }
      }

      await prisma.organization.update({
        where: { id: org.id },
        data: { chainAddress: derived },
      });

      chainAddress = derived;
    }

    // --- Determine attestation period ---
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // --- Idempotency: check if already attested ---
    const alreadySubmitted = await publicClient.readContract({
      address: CONTRACTS.auditLedger,
      abi: auditLedgerAbi,
      functionName: 'hasAuditForPeriod',
      args: [chainAddress, year, month],
    });

    if (alreadySubmitted) {
      const existing = await prisma.auditSubmission.findUnique({
        where: { orgId_year_month: { orgId: org.id, year, month } },
      });

      return NextResponse.json({
        success: true,
        alreadyAttested: true,
        year,
        month,
        merkleRoot: existing?.merkleRoot ?? 'on-chain',
        txHash: existing?.txHash ?? null,
        explorerUrl: existing?.txHash ? `${FUJI_EXPLORER_URL}/tx/${existing.txHash}` : null,
      });
    }

    // --- Build financial package and Merkle root ---
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const pkg = await buildFinancialPackage(org.id, org.name, monthStr);
    const { merkleRoot } = generateMerkleRoot(pkg);

    // --- Submit on-chain ---
    const txHash = await walletClient.writeContract({
      address: CONTRACTS.auditLedger,
      abi: auditLedgerAbi,
      functionName: 'submitAudit',
      args: [chainAddress, year, month, merkleRoot, SCHEMA_HASH],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    // --- Persist locally ---
    await prisma.auditSubmission.create({
      data: {
        orgId: org.id,
        year,
        month,
        merkleRoot,
        schemaHash: SCHEMA_HASH,
        txHash,
      },
    });

    return NextResponse.json({
      success: true,
      alreadyAttested: false,
      year,
      month,
      merkleRoot,
      txHash,
      explorerUrl: `${FUJI_EXPLORER_URL}/tx/${txHash}`,
      blockNumber: Number(receipt.blockNumber),
    });
  } catch (err) {
    console.error('Attestation error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Attestation failed', details: message },
      { status: 502 }
    );
  }
}
