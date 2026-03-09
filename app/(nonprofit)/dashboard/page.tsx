import { getLatestAudit, getOrgComplianceSummary, getOrgAnomalySummary } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { PIPELINE_MONTHS, PIPELINE_MONTH_LABELS } from '@/lib/pipeline/ingest';
import { generate990Progress } from '@/lib/pipeline/map990';
import { NonprofitDashboardContent } from '@/components/nonprofit/NonprofitDashboardContent';

export default async function NonprofitDashboard() {
  const orgAddress = getOrgAddress('org-bright-futures');

  const [attestation, compliance, anomalies] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress) : Promise.resolve(null),
    orgAddress ? getOrgComplianceSummary(orgAddress) : Promise.resolve({ activeRules: 0, totalViolations: 0, overdueDeadlines: 0, live: false }),
    orgAddress ? getOrgAnomalySummary(orgAddress) : Promise.resolve({ total: 0, open: 0, critical: 0, live: false }),
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

  return <NonprofitDashboardContent chainData={chainData} />;
}
