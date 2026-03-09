import { getSharedEntities, getEntity } from '@/lib/chain/reads';
import { getOrgAddress, ORG_ADDRESS_MAP } from '@/lib/chain/config';
import { InvestigatorDashboardContent } from '@/components/investigator/InvestigatorDashboardContent';

export default async function InvestigatorDashboard() {
  const orgAddress = getOrgAddress('org-bright-futures');

  // Only show cross-org intelligence when two distinct on-chain orgs exist.
  const allOrgAddresses = Object.values(ORG_ADDRESS_MAP).filter(
    (addr): addr is NonNullable<typeof addr> => addr != null
  );
  const secondOrg = allOrgAddresses.find((addr) => addr !== orgAddress) ?? null;

  const sharedEntitiesResult =
    orgAddress && secondOrg
      ? await getSharedEntities(orgAddress, secondOrg)
      : { entityIds: [] as string[], live: false };

  const entityDetails = sharedEntitiesResult.live
    ? await Promise.all(
        sharedEntitiesResult.entityIds.slice(0, 6).map(async (id) => {
          const entity = await getEntity(id as `0x${string}`);
          return {
            entityId: id,
            label: entity.label || id.slice(0, 10) + '...',
            entityType: entity.entityType,
          };
        })
      )
    : [];

  const chainData = {
    caseSummary: null as { evidenceCount: number; stage: string; live: boolean } | null,
    sharedEntities: entityDetails,
    sharedEntitiesLive: sharedEntitiesResult.live,
  };

  return <InvestigatorDashboardContent chainData={chainData} />;
}
