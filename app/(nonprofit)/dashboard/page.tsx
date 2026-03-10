import { type Address } from 'viem';
import { getLatestAudit, getOrgComplianceSummary, getOrgAnomalySummary } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { PIPELINE_MONTHS, PIPELINE_MONTH_LABELS } from '@/lib/pipeline/ingest';
import { generate990Progress } from '@/lib/pipeline/map990';
import { NonprofitDashboardContent } from '@/components/nonprofit/NonprofitDashboardContent';
import { getUserOrg } from '@/lib/get-user-org';
import { getOrgFinancials, type DashboardOrg } from '@/lib/qbo-financials';

export default async function NonprofitDashboard() {
  const { org } = await getUserOrg();
  const isRealUser = !!org?.qboRealmId;

  let orgData: DashboardOrg | null = null;

  if (isRealUser) {
    orgData = await getOrgFinancials(org!.id);
  }

  const orgAddress = isRealUser
    ? (org!.chainAddress ? (org!.chainAddress as Address) : null)
    : getOrgAddress('org-bright-futures');

  const chainUnavailable = { activeRules: 0, totalViolations: 0, overdueDeadlines: 0, live: false };
  const anomalyUnavailable = { total: 0, open: 0, critical: 0, live: false };

  const [attestation, compliance, anomalies] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress) : Promise.resolve(null),
    orgAddress ? getOrgComplianceSummary(orgAddress) : Promise.resolve(chainUnavailable),
    orgAddress ? getOrgAnomalySummary(orgAddress) : Promise.resolve(anomalyUnavailable),
  ]);

  const progress = generate990Progress(PIPELINE_MONTHS);
  const monthLabels = PIPELINE_MONTH_LABELS;
  const monthRange = monthLabels.length > 0
    ? `${monthLabels[0]} \u2013 ${monthLabels[monthLabels.length - 1]}`
    : '';

  const chainData = {
    attestation: attestation
      ? { timestamp: attestation.timestamp, merkleRoot: attestation.merkleRoot, live: attestation.live }
      : null,
    complianceSummary: compliance,
    anomalySummary: anomalies,
    completion990: progress.overallCompletion,
    monthsProcessed: monthLabels.length,
    monthRange,
  };

  return <NonprofitDashboardContent chainData={chainData} orgData={orgData} />;
}
