import { type Address, type Hash, keccak256, toHex, parseEther, formatEther } from 'viem';
import { publicClient, getRelayWalletClient } from './client';
import { CONTRACTS } from './config';
import { anomalyRegistryAbi } from './abis/AnomalyRegistry';
import { entityGraphAbi } from './abis/EntityGraph';
import { complianceEngineAbi } from './abis/ComplianceEngine';
import { auditLedgerAbi } from './abis/AuditLedger';
import { EntityType, RelationshipType, RuleType } from './types';
import type { AnomalyFinding } from '@/lib/pipeline/detect';

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`;
const MIN_RELAY_BALANCE = parseEther('0.05');

export interface WriteResult {
  txHash: Hash;
  success: boolean;
}

function getWallet() {
  const wallet = getRelayWalletClient();
  if (!wallet) throw new Error('Relay wallet not configured (RELAY_PRIVATE_KEY missing)');
  return wallet;
}

const BALANCE_CACHE_MS = 30_000;
let cachedBalance: { value: bigint; checkedAt: number } | null = null;

async function checkBalance() {
  const now = Date.now();
  if (cachedBalance && now - cachedBalance.checkedAt < BALANCE_CACHE_MS) {
    if (cachedBalance.value >= MIN_RELAY_BALANCE) return;
  }
  const wallet = getWallet();
  const balance = await publicClient.getBalance({ address: wallet.account.address });
  cachedBalance = { value: balance, checkedAt: now };
  if (balance < MIN_RELAY_BALANCE) {
    throw new Error(
      `Relay wallet underfunded: ${formatEther(balance)} AVAX (need ${formatEther(MIN_RELAY_BALANCE)})`
    );
  }
}

async function waitForTx(hash: Hash): Promise<WriteResult> {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: 60_000,
  });
  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted: ${hash}`);
  }
  return { txHash: hash, success: true };
}

// ---------------------------------------------------------------------------
//  AuditLedger — setAvalancheMode fallback helper
// ---------------------------------------------------------------------------

export async function withTxAllowListFallback(fn: () => Promise<Hash>): Promise<Hash> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('TxAllowList') || msg.includes('OrgNotProvisioned')) {
      const wallet = getWallet();
      const disableHash = await wallet.writeContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'setAvalancheMode',
        args: [false],
      });
      await publicClient.waitForTransactionReceipt({ hash: disableHash });
      return await fn();
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
//  AnomalyRegistry
// ---------------------------------------------------------------------------

export async function recordAnomalyOnChain(
  org: Address,
  finding: AnomalyFinding,
): Promise<WriteResult> {
  await checkBalance();
  const wallet = getWallet();

  const title = finding.title.slice(0, 200);
  const confidence = Math.max(1, Math.min(10000, finding.confidenceBps));

  const hash = await withTxAllowListFallback(() =>
    wallet.writeContract({
      address: CONTRACTS.anomalyRegistry,
      abi: anomalyRegistryAbi,
      functionName: 'recordAnomaly',
      args: [
        org,
        finding.severity,
        finding.category,
        title,
        confidence,
        finding.evidenceHash,
        ZERO_BYTES32,
      ],
    })
  );

  return waitForTx(hash);
}

// ---------------------------------------------------------------------------
//  EntityGraph
// ---------------------------------------------------------------------------

export async function createEntityOnChain(
  entityId: `0x${string}`,
  entityType: EntityType,
  identityHash: `0x${string}`,
  label: string,
): Promise<WriteResult> {
  await checkBalance();
  const wallet = getWallet();

  const hash = await withTxAllowListFallback(() =>
    wallet.writeContract({
      address: CONTRACTS.entityGraph,
      abi: entityGraphAbi,
      functionName: 'createEntity',
      args: [entityId, entityType, identityHash, label.slice(0, 200)],
    })
  );

  return waitForTx(hash);
}

export async function createEdgeOnChain(
  edgeId: `0x${string}`,
  entityId: `0x${string}`,
  org: Address,
  relationshipType: RelationshipType,
  startDate: number,
  evidenceHash: `0x${string}`,
): Promise<WriteResult> {
  await checkBalance();
  const wallet = getWallet();

  const hash = await withTxAllowListFallback(() =>
    wallet.writeContract({
      address: CONTRACTS.entityGraph,
      abi: entityGraphAbi,
      functionName: 'createEdge',
      args: [edgeId, entityId, org, relationshipType, startDate, evidenceHash],
    })
  );

  return waitForTx(hash);
}

// ---------------------------------------------------------------------------
//  ComplianceEngine
// ---------------------------------------------------------------------------

export async function createComplianceRule(
  ruleId: `0x${string}`,
  org: Address,
  ruleType: RuleType,
  label: string,
  threshold: bigint,
  startDate: number,
  endDate: number,
): Promise<WriteResult> {
  await checkBalance();
  const wallet = getWallet();

  const hash = await withTxAllowListFallback(() =>
    wallet.writeContract({
      address: CONTRACTS.complianceEngine,
      abi: complianceEngineAbi,
      functionName: 'createRule',
      args: [ruleId, org, wallet.account.address, ruleType, label, threshold, startDate, endDate],
    })
  );

  return waitForTx(hash);
}

export async function reportComplianceValue(
  ruleId: `0x${string}`,
  amount: bigint,
): Promise<WriteResult> {
  await checkBalance();
  const wallet = getWallet();

  const hash = await withTxAllowListFallback(() =>
    wallet.writeContract({
      address: CONTRACTS.complianceEngine,
      abi: complianceEngineAbi,
      functionName: 'reportValue',
      args: [ruleId, amount],
    })
  );

  return waitForTx(hash);
}

// ---------------------------------------------------------------------------
//  Helpers for pipeline orchestrator
// ---------------------------------------------------------------------------

export function deriveEntityId(vendorName: string): `0x${string}` {
  return keccak256(toHex(`vendor:${vendorName.toLowerCase().trim()}`));
}

export function deriveEdgeId(entityId: `0x${string}`, org: Address): `0x${string}` {
  return keccak256(
    toHex(`edge:${entityId}:${org.toLowerCase()}`),
  );
}

export function deriveRuleId(org: Address, label: string): `0x${string}` {
  return keccak256(toHex(`rule:${org.toLowerCase()}:${label}`));
}
