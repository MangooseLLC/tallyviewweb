import { type Address } from 'viem';
import { getLatestAudit, getOrgComplianceSummary, getOrgAnomalySummary, getOrgGraphSummary } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { PIPELINE_MONTHS, PIPELINE_MONTH_LABELS } from '@/lib/pipeline/ingest';
import { generate990Progress, generate990FromQBO, type Map990Result } from '@/lib/pipeline/map990';
import { NonprofitDashboardContent } from '@/components/nonprofit/NonprofitDashboardContent';
import { getUserOrg } from '@/lib/get-user-org';
import { getOrgFinancials, type DashboardOrg } from '@/lib/qbo-financials';

export default async function NonprofitDashboard() {
  const { org } = await getUserOrg();

  let orgData: DashboardOrg | null = null;
  let progress: Map990Result;
  let monthLabels: string[];

  if (org) {
    orgData = await getOrgFinancials(org.id);
    progress = await generate990FromQBO(org.id);
    monthLabels = orgData.financials.map((f) => f.month);
  } else {
    progress = generate990Progress(PIPELINE_MONTHS);
    monthLabels = PIPELINE_MONTH_LABELS;
  }

  const orgAddress =
    org?.chainAddress
      ? (org.chainAddress as Address)
      : org
        ? null
        : getOrgAddress('org-bright-futures');

  const chainUnavailable = { activeRules: 0, totalViolations: 0, overdueDeadlines: 0, live: false };
  const anomalyUnavailable = { total: 0, open: 0, critical: 0, live: false };
  const graphUnavailable = { totalEdges: 0, activeEdges: 0, uniqueEntities: 0, live: false };

  const [attestation, compliance, anomalies, entityGraph] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress).catch(() => null) : Promise.resolve(null),
    orgAddress ? getOrgComplianceSummary(orgAddress).catch(() => chainUnavailable) : Promise.resolve(chainUnavailable),
    orgAddress ? getOrgAnomalySummary(orgAddress).catch(() => anomalyUnavailable) : Promise.resolve(anomalyUnavailable),
    orgAddress ? getOrgGraphSummary(orgAddress).catch(() => graphUnavailable) : Promise.resolve(graphUnavailable),
  ]);

  const monthRange = monthLabels.length > 0
    ? `${monthLabels[0]} \u2013 ${monthLabels[monthLabels.length - 1]}`
    : '';

  const chainData = {
    attestation: attestation
      ? { timestamp: attestation.timestamp, merkleRoot: attestation.merkleRoot, live: attestation.live }
      : null,
    complianceSummary: compliance,
    anomalySummary: anomalies,
    entityGraphSummary: entityGraph,
    completion990: progress.overallCompletion,
    monthsProcessed: monthLabels.length,
    monthRange,
  };

  return <NonprofitDashboardContent chainData={chainData} orgData={orgData} />;
}
