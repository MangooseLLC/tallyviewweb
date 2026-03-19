import { keccak256, toHex, type Address } from 'viem';
import { getUserOrg } from '@/lib/get-user-org';
import { prisma } from '@/lib/prisma';
import { publicClient, getRelayWalletClient } from '@/lib/chain/client';
import { CONTRACTS, txUrl } from '@/lib/chain/config';
import { auditLedgerAbi } from '@/lib/chain/abis/AuditLedger';
import { generateMerkleRoot, SCHEMA_HASH } from '@/lib/pipeline/hash';
import { buildFinancialPackage } from '@/lib/pipeline/from-qbo';
import { runAnomalyDetection } from '@/lib/pipeline/detect';
import {
  recordAnomalyOnChain,
  createEntityOnChain,
  createEdgeOnChain,
  createComplianceRule,
  reportComplianceValue,
  deriveEntityId,
  deriveEdgeId,
  deriveRuleId,
  withTxAllowListFallback,
} from '@/lib/chain/writes';
import { EntityType, RelationshipType, RuleType } from '@/lib/chain/types';
import { slugify, deriveOrgAddress } from '@/lib/chain/org-utils';

/**
 * POST /api/chain/pipeline
 * Runs the full on-chain pipeline via SSE so the client can track each step.
 */
export async function POST() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(step: string, data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ step, ...data })}\n\n`));
      }

      let pipelineJobId: string | null = null;
      let pipelineSucceeded = false;

      try {
        const walletClient = getRelayWalletClient();
        if (!walletClient) {
          send('error', { message: 'Relay wallet not configured' });
          controller.close();
          return;
        }

        const { org, error: orgError } = await getUserOrg();
        if (!org) {
          send('error', { message: orgError || 'Authentication required' });
          controller.close();
          return;
        }

        // ---- Idempotency: check for in-flight pipeline ----
        const recentJob = await prisma.syncJob.findFirst({
          where: { orgId: org.id, status: 'RUNNING', startedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } },
        });
        if (recentJob) {
          send('error', { message: 'A pipeline is already running for this organization. Please wait.' });
          controller.close();
          return;
        }
        const pipelineJob = await prisma.syncJob.create({
          data: { orgId: org.id, status: 'RUNNING' },
        });
        pipelineJobId = pipelineJob.id;

        // ---- Step 1: Build financial package ----
        send('building', { status: 'started' });
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;

        const pkg = await buildFinancialPackage(org.id, org.name, monthStr);
        send('building', { status: 'done' });

        // ---- Ensure on-chain identity ----
        let chainAddress: Address | null = null;
        if (org.chainAddress) {
          const { isAddress, getAddress } = await import('viem');
          if (!isAddress(org.chainAddress)) {
            send('error', { message: 'Corrupted on-chain address in database' });
            controller.close();
            return;
          }
          chainAddress = getAddress(org.chainAddress);
        }
        if (!chainAddress) {
          send('registering', { status: 'started' });
          const derived = deriveOrgAddress(org.id);
          const slug = slugify(org.name);
          if (slug.length < 3) {
            send('error', { message: 'Organization name too short for on-chain registration (min 3 chars)' });
            controller.close();
            return;
          }

          const isRegistered = await publicClient.readContract({
            address: CONTRACTS.auditLedger,
            abi: auditLedgerAbi,
            functionName: 'isOrganizationRegistered',
            args: [derived],
          });

          if (!isRegistered) {
            const einHash = keccak256(toHex('\u2014'));
            const h = await withTxAllowListFallback(() =>
              walletClient.writeContract({
                address: CONTRACTS.auditLedger,
                abi: auditLedgerAbi,
                functionName: 'registerOrganization',
                args: [derived, slug, einHash],
              })
            );
            await publicClient.waitForTransactionReceipt({ hash: h });
          }

          await prisma.organization.update({
            where: { id: org.id },
            data: { chainAddress: derived },
          });
          chainAddress = derived;
          send('registering', { status: 'done' });
        }

        // ---- Step 2: Attest (AuditLedger) ----
        send('attesting', { status: 'started' });
        const alreadyAttested = await publicClient.readContract({
          address: CONTRACTS.auditLedger,
          abi: auditLedgerAbi,
          functionName: 'hasAuditForPeriod',
          args: [chainAddress, year, month],
        });

        let attestTxHash: string | null = null;
        const { merkleRoot } = generateMerkleRoot(pkg);

        if (!alreadyAttested) {
          const h = await walletClient.writeContract({
            address: CONTRACTS.auditLedger,
            abi: auditLedgerAbi,
            functionName: 'submitAudit',
            args: [chainAddress, year, month, merkleRoot, SCHEMA_HASH],
          });
          await publicClient.waitForTransactionReceipt({ hash: h });
          attestTxHash = h;

          await prisma.auditSubmission.create({
            data: { orgId: org.id, year, month, merkleRoot, schemaHash: SCHEMA_HASH, txHash: h },
          });
        }
        send('attesting', { status: 'done', txHash: attestTxHash, alreadyAttested, merkleRoot });

        // ---- Step 3: Anomaly Detection ----
        send('detecting', { status: 'started' });
        const findings = runAnomalyDetection([pkg]);
        const anomalyTxHashes: string[] = [];

        for (const finding of findings) {
          try {
            const result = await recordAnomalyOnChain(chainAddress, finding);
            anomalyTxHashes.push(result.txHash);
          } catch (err) {
            console.error('Anomaly write failed:', err);
          }
        }
        send('detecting', { status: 'done', findingsCount: findings.length, txHashes: anomalyTxHashes });

        // ---- Step 4: Entity Graph (vendors only — QBO has no board data) ----
        send('mapping_entities', { status: 'started' });
        const entityTxHashes: string[] = [];
        const seenVendors = new Set<string>();

        for (const vp of pkg.vendorPayments) {
          const name = vp.vendor.trim();
          if (!name || seenVendors.has(name.toLowerCase())) continue;
          seenVendors.add(name.toLowerCase());

          const entityId = deriveEntityId(name);
          const identityHash = keccak256(toHex(name.toLowerCase()));
          const edgeId = deriveEdgeId(entityId, chainAddress);

          try {
            const entityResult = await createEntityOnChain(entityId, EntityType.Vendor, identityHash, name);
            entityTxHashes.push(entityResult.txHash);
          } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (!msg.includes('EntityAlreadyExists')) console.error('Entity write failed:', err);
          }

          try {
            const edgeResult = await createEdgeOnChain(
              edgeId,
              entityId,
              chainAddress,
              RelationshipType.VendorPayee,
              Math.floor(Date.now() / 1000),
              keccak256(toHex(JSON.stringify({ vendor: name, org: org.id }))),
            );
            entityTxHashes.push(edgeResult.txHash);
          } catch (err) {
            const msg = err instanceof Error ? err.message : '';
            if (!msg.includes('EdgeAlreadyExists')) console.error('Edge write failed:', err);
          }
        }
        send('mapping_entities', { status: 'done', vendorCount: seenVendors.size, txHashes: entityTxHashes });

        // ---- Step 5: Compliance Rules ----
        send('compliance', { status: 'started' });
        const complianceTxHashes: string[] = [];

        const overheadRuleId = deriveRuleId(chainAddress, 'overhead-ratio');
        const totalExpenses = pkg.expenses.program + pkg.expenses.management + pkg.expenses.fundraising;
        const overheadPct = totalExpenses > 0 ? Math.round((pkg.expenses.management / totalExpenses) * 10000) : 0;

        try {
          await createComplianceRule(
            overheadRuleId,
            chainAddress,
            RuleType.OverheadRatio,
            'Management overhead must stay below 25%',
            BigInt(2500),
            Math.floor(Date.now() / 1000),
            0,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : '';
          if (!msg.includes('RuleAlreadyExists') && !msg.includes('already exists')) {
            console.error('Compliance rule creation failed:', err);
          }
        }

        try {
          const result = await reportComplianceValue(overheadRuleId, BigInt(overheadPct));
          complianceTxHashes.push(result.txHash);
        } catch (err) {
          console.error('Compliance report failed:', err);
        }

        send('compliance', { status: 'done', txHashes: complianceTxHashes });

        // ---- Complete ----
        pipelineSucceeded = true;
        send('complete', {
          status: 'done',
          summary: {
            merkleRoot,
            attestTxHash,
            anomalies: findings.length,
            vendors: seenVendors.size,
            explorerUrl: attestTxHash ? txUrl(attestTxHash) : null,
          },
        });
      } catch (err) {
        console.error('Pipeline error:', err);
        send('error', { message: err instanceof Error ? err.message : 'Pipeline failed' });
      } finally {
        if (pipelineJobId) {
          await prisma.syncJob.update({
            where: { id: pipelineJobId },
            data: {
              status: pipelineSucceeded ? 'COMPLETED' : 'FAILED',
              completedAt: new Date(),
            },
          }).catch(() => {});
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
