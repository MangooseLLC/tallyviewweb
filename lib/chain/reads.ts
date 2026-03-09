import { type Address } from 'viem';
import { publicClient } from './client';
import { CONTRACTS } from './config';
import { auditLedgerAbi } from './abis/AuditLedger';
import { complianceEngineAbi } from './abis/ComplianceEngine';
import { anomalyRegistryAbi } from './abis/AnomalyRegistry';
import { entityGraphAbi } from './abis/EntityGraph';
import { evidenceVaultAbi } from './abis/EvidenceVault';

const TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('chain read timeout')), TIMEOUT_MS);
    }),
  ]);
}

// ---------------------------------------------------------------------------
//  AuditLedger
// ---------------------------------------------------------------------------

export interface LatestAuditResult {
  year: number;
  month: number;
  merkleRoot: string;
  schemaHash: string;
  timestamp: number;
  submitter: string;
  live: boolean;
}

export async function getLatestAudit(org: Address): Promise<LatestAuditResult> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'getLatestAudit',
        args: [org],
      })
    );
    return {
      year: result[0],
      month: result[1],
      merkleRoot: result[2].merkleRoot,
      schemaHash: result[2].schemaHash,
      timestamp: Number(result[2].timestamp),
      submitter: result[2].submitter,
      live: true,
    };
  } catch {
    return {
      year: 0,
      month: 0,
      merkleRoot: '0x',
      schemaHash: '0x',
      timestamp: 0,
      submitter: '0x',
      live: false,
    };
  }
}

export async function nameOf(org: Address): Promise<{ name: string; live: boolean }> {
  try {
    const name = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'nameOf',
        args: [org],
      })
    );
    return { name, live: true };
  } catch {
    return { name: '', live: false };
  }
}

export interface OrgRecordResult {
  name: string;
  registeredAt: number;
  latestYear: number;
  latestMonth: number;
  active: boolean;
  live: boolean;
}

export async function getOrganization(org: Address): Promise<OrgRecordResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'getOrganization',
        args: [org],
      })
    );
    return {
      name: r.name,
      registeredAt: Number(r.registeredAt),
      latestYear: r.latestYear,
      latestMonth: r.latestMonth,
      active: r.active,
      live: true,
    };
  } catch {
    return { name: '', registeredAt: 0, latestYear: 0, latestMonth: 0, active: false, live: false };
  }
}

export async function getSubmissionCount(org: Address): Promise<{ count: number; live: boolean }> {
  try {
    const count = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'getSubmissionCount',
        args: [org],
      })
    );
    return { count: Number(count), live: true };
  } catch {
    return { count: 0, live: false };
  }
}

export interface AuditEntryResult {
  merkleRoot: string;
  schemaHash: string;
  timestamp: number;
  submitter: string;
  live: boolean;
}

export async function getAudit(
  org: Address,
  year: number,
  month: number
): Promise<AuditEntryResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.auditLedger,
        abi: auditLedgerAbi,
        functionName: 'getAudit',
        args: [org, year, month],
      })
    );
    return {
      merkleRoot: r.merkleRoot,
      schemaHash: r.schemaHash,
      timestamp: Number(r.timestamp),
      submitter: r.submitter,
      live: true,
    };
  } catch {
    return { merkleRoot: '0x', schemaHash: '0x', timestamp: 0, submitter: '0x', live: false };
  }
}

// ---------------------------------------------------------------------------
//  ComplianceEngine
// ---------------------------------------------------------------------------

export interface ComplianceSummaryResult {
  activeRules: number;
  totalViolations: number;
  overdueDeadlines: number;
  live: boolean;
}

export async function getOrgComplianceSummary(
  org: Address
): Promise<ComplianceSummaryResult> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.complianceEngine,
        abi: complianceEngineAbi,
        functionName: 'getOrgComplianceSummary',
        args: [org],
      })
    );
    return {
      activeRules: Number(result[0]),
      totalViolations: Number(result[1]),
      overdueDeadlines: Number(result[2]),
      live: true,
    };
  } catch {
    return { activeRules: 0, totalViolations: 0, overdueDeadlines: 0, live: false };
  }
}

export async function getRulesForOrg(
  org: Address
): Promise<{ ruleIds: string[]; live: boolean }> {
  try {
    const ruleIds = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.complianceEngine,
        abi: complianceEngineAbi,
        functionName: 'getRulesForOrg',
        args: [org],
      })
    );
    return { ruleIds: ruleIds as string[], live: true };
  } catch {
    return { ruleIds: [], live: false };
  }
}

export async function getDeadlinesForOrg(
  org: Address
): Promise<{ deadlineIds: string[]; live: boolean }> {
  try {
    const ids = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.complianceEngine,
        abi: complianceEngineAbi,
        functionName: 'getDeadlinesForOrg',
        args: [org],
      })
    );
    return { deadlineIds: ids as string[], live: true };
  } catch {
    return { deadlineIds: [], live: false };
  }
}

export interface DeadlineResult {
  org: string;
  filingType: string;
  dueDate: number;
  completedDate: number;
  status: number;
  live: boolean;
}

export async function getDeadline(deadlineId: `0x${string}`): Promise<DeadlineResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.complianceEngine,
        abi: complianceEngineAbi,
        functionName: 'getDeadline',
        args: [deadlineId],
      })
    );
    return {
      org: r.org,
      filingType: r.filingType,
      dueDate: Number(r.dueDate),
      completedDate: Number(r.completedDate),
      status: r.status,
      live: true,
    };
  } catch {
    return { org: '0x', filingType: '', dueDate: 0, completedDate: 0, status: 0, live: false };
  }
}

// ---------------------------------------------------------------------------
//  AnomalyRegistry
// ---------------------------------------------------------------------------

export interface AnomalySummaryResult {
  total: number;
  open: number;
  critical: number;
  live: boolean;
}

export async function getOrgAnomalySummary(
  org: Address
): Promise<AnomalySummaryResult> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.anomalyRegistry,
        abi: anomalyRegistryAbi,
        functionName: 'getOrgAnomalySummary',
        args: [org],
      })
    );
    return {
      total: Number(result[0]),
      open: Number(result[1]),
      critical: Number(result[2]),
      live: true,
    };
  } catch {
    return { total: 0, open: 0, critical: 0, live: false };
  }
}

export async function getAnomaliesByStatus(
  org: Address,
  status: number
): Promise<{ indices: number[]; live: boolean }> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.anomalyRegistry,
        abi: anomalyRegistryAbi,
        functionName: 'getAnomaliesByStatus',
        args: [org, status],
      })
    );
    return { indices: (result as bigint[]).map(Number), live: true };
  } catch {
    return { indices: [], live: false };
  }
}

const SEVERITY_LABELS = ['Info', 'Low', 'Medium', 'High', 'Critical'] as const;
const CATEGORY_LABELS = [
  'FinancialHealth', 'Governance', 'FraudPattern', 'CompensationOutlier',
  'VendorConcentration', 'ExpenseAllocation', 'RevenueAnomaly',
  'RelatedParty', 'DocumentProvenance', 'Custom',
] as const;
const ANOMALY_STATUS_LABELS = ['New', 'Reviewed', 'Resolved', 'Escalated'] as const;

export interface AnomalyResult {
  org: string;
  severity: string;
  category: string;
  confidenceBps: number;
  detectedAt: number;
  status: string;
  title: string;
  evidenceHash: string;
  relatedRuleId: string;
  reviewedBy: string;
  reviewedAt: number;
  live: boolean;
}

export async function getAnomaly(index: number): Promise<AnomalyResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.anomalyRegistry,
        abi: anomalyRegistryAbi,
        functionName: 'getAnomaly',
        args: [BigInt(index)],
      })
    );
    return {
      org: r.org,
      severity: SEVERITY_LABELS[r.severity] ?? 'Unknown',
      category: CATEGORY_LABELS[r.category] ?? 'Custom',
      confidenceBps: r.confidenceBps,
      detectedAt: Number(r.detectedAt),
      status: ANOMALY_STATUS_LABELS[r.status] ?? 'Unknown',
      title: r.title,
      evidenceHash: r.evidenceHash,
      relatedRuleId: r.relatedRuleId,
      reviewedBy: r.reviewedBy,
      reviewedAt: Number(r.reviewedAt),
      live: true,
    };
  } catch {
    return {
      org: '0x', severity: 'Unknown', category: 'Unknown', confidenceBps: 0,
      detectedAt: 0, status: 'Unknown', title: '', evidenceHash: '0x',
      relatedRuleId: '0x', reviewedBy: '0x', reviewedAt: 0, live: false,
    };
  }
}

export async function getAnomalyCount(): Promise<{ count: number; live: boolean }> {
  try {
    const count = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.anomalyRegistry,
        abi: anomalyRegistryAbi,
        functionName: 'getAnomalyCount',
      })
    );
    return { count: Number(count), live: true };
  } catch {
    return { count: 0, live: false };
  }
}

// ---------------------------------------------------------------------------
//  EntityGraph
// ---------------------------------------------------------------------------

export interface GraphSummaryResult {
  totalEdges: number;
  activeEdges: number;
  uniqueEntities: number;
  live: boolean;
}

export async function getOrgGraphSummary(org: Address): Promise<GraphSummaryResult> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.entityGraph,
        abi: entityGraphAbi,
        functionName: 'getOrgGraphSummary',
        args: [org],
      })
    );
    return {
      totalEdges: Number(result[0]),
      activeEdges: Number(result[1]),
      uniqueEntities: Number(result[2]),
      live: true,
    };
  } catch {
    return { totalEdges: 0, activeEdges: 0, uniqueEntities: 0, live: false };
  }
}

export async function getSharedEntities(
  orgA: Address,
  orgB: Address
): Promise<{ entityIds: string[]; live: boolean }> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.entityGraph,
        abi: entityGraphAbi,
        functionName: 'getSharedEntities',
        args: [orgA, orgB],
      })
    );
    return { entityIds: result as string[], live: true };
  } catch {
    return { entityIds: [], live: false };
  }
}

const ENTITY_TYPE_LABELS = ['Person', 'Vendor', 'Address'] as const;

export interface EntityResult {
  entityType: string;
  createdAt: number;
  active: boolean;
  identityHash: string;
  label: string;
  live: boolean;
}

export async function getEntity(entityId: `0x${string}`): Promise<EntityResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.entityGraph,
        abi: entityGraphAbi,
        functionName: 'getEntity',
        args: [entityId],
      })
    );
    return {
      entityType: ENTITY_TYPE_LABELS[r.entityType] ?? 'Unknown',
      createdAt: Number(r.createdAt),
      active: r.active,
      identityHash: r.identityHash,
      label: r.label,
      live: true,
    };
  } catch {
    return {
      entityType: 'Unknown', createdAt: 0, active: false,
      identityHash: '0x', label: '', live: false,
    };
  }
}

export async function getEntitiesForOrg(
  org: Address
): Promise<{ entityIds: string[]; live: boolean }> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.entityGraph,
        abi: entityGraphAbi,
        functionName: 'getEntitiesForOrg',
        args: [org],
      })
    );
    return { entityIds: result as string[], live: true };
  } catch {
    return { entityIds: [], live: false };
  }
}

// ---------------------------------------------------------------------------
//  EvidenceVault
// ---------------------------------------------------------------------------

const STAGE_LABELS = ['Tip', 'Analysis', 'Discovery', 'Filing', 'Recovery', 'Closed'] as const;

export interface CaseSummaryResult {
  evidenceCount: number;
  stage: string;
  isSealed: boolean;
  live: boolean;
}

export async function getCaseSummary(caseId: `0x${string}`): Promise<CaseSummaryResult> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.evidenceVault,
        abi: evidenceVaultAbi,
        functionName: 'getCaseSummary',
        args: [caseId],
      })
    );
    return {
      evidenceCount: Number(result[0]),
      stage: STAGE_LABELS[result[1]] ?? 'Unknown',
      isSealed: result[2],
      live: true,
    };
  } catch {
    return { evidenceCount: 0, stage: 'Unknown', isSealed: false, live: false };
  }
}

export async function getCasesForOrg(
  org: Address
): Promise<{ caseIds: string[]; live: boolean }> {
  try {
    const result = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.evidenceVault,
        abi: evidenceVaultAbi,
        functionName: 'getCasesForOrg',
        args: [org],
      })
    );
    return { caseIds: result as string[], live: true };
  } catch {
    return { caseIds: [], live: false };
  }
}

export interface CaseResult {
  targetOrg: string;
  stage: string;
  openedAt: number;
  isSealed: boolean;
  leadInvestigator: string;
  closedAt: number;
  title: string;
  live: boolean;
}

export async function getCase(caseId: `0x${string}`): Promise<CaseResult> {
  try {
    const r = await withTimeout(
      publicClient.readContract({
        address: CONTRACTS.evidenceVault,
        abi: evidenceVaultAbi,
        functionName: 'getCase',
        args: [caseId],
      })
    );
    return {
      targetOrg: r.targetOrg,
      stage: STAGE_LABELS[r.stage] ?? 'Unknown',
      openedAt: Number(r.openedAt),
      isSealed: r.isSealed,
      leadInvestigator: r.leadInvestigator,
      closedAt: Number(r.closedAt),
      title: r.title,
      live: true,
    };
  } catch {
    return {
      targetOrg: '0x', stage: 'Unknown', openedAt: 0, isSealed: false,
      leadInvestigator: '0x', closedAt: 0, title: '', live: false,
    };
  }
}
