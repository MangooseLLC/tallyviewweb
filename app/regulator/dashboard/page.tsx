import { getOrgAnomalySummary, getCasesForOrg, getOrgGraphSummary } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { RegulatorDashboardContent } from '@/components/regulator/RegulatorDashboardContent';

export default async function RegulatorDashboardPage() {
  const orgAddress = getOrgAddress('org-bright-futures');

  const [anomalies, cases, graph] = await Promise.all([
    orgAddress ? getOrgAnomalySummary(orgAddress) : Promise.resolve({ total: 0, open: 0, critical: 0, live: false }),
    orgAddress ? getCasesForOrg(orgAddress) : Promise.resolve({ caseIds: [], live: false }),
    orgAddress ? getOrgGraphSummary(orgAddress) : Promise.resolve({ totalEdges: 0, activeEdges: 0, uniqueEntities: 0, live: false }),
  ]);

  const chainData = {
    anomalySummary: anomalies,
    casesCount: cases.caseIds.length,
    casesLive: cases.live,
    graphSummary: graph,
  };

  return <RegulatorDashboardContent chainData={chainData} />;
}
