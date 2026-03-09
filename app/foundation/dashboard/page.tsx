import { getLatestAudit, getOrgAnomalySummary } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { FoundationDashboardContent } from '@/components/foundation/FoundationDashboardContent';

export default async function FoundationDashboardPage() {
  const orgAddress = getOrgAddress('org-bright-futures');

  const [attestation, anomalies] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress) : Promise.resolve(null),
    orgAddress ? getOrgAnomalySummary(orgAddress) : Promise.resolve({ total: 0, open: 0, critical: 0, live: false }),
  ]);

  const chainData = {
    anomalySummary: anomalies,
    attestation: attestation
      ? { timestamp: attestation.timestamp, merkleRoot: attestation.merkleRoot, live: attestation.live }
      : null,
  };

  return <FoundationDashboardContent chainData={chainData} />;
}
