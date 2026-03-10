import { getLatestAudit } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { PIPELINE_MONTHS } from '@/lib/pipeline/ingest';
import { generate990Progress, generate990FromQBO } from '@/lib/pipeline/map990';
import { Form990Content } from '@/components/nonprofit/Form990Content';
import { getUserOrg } from '@/lib/get-user-org';
import type { Address } from 'viem';

export const dynamic = 'force-dynamic';

export default async function Form990Page() {
  const { org } = await getUserOrg();

  const useRealData = !!org?.qboRealmId;

  const rawAddr = org?.chainAddress ?? null;
  const orgAddress: Address | null =
    rawAddr && rawAddr.startsWith('0x')
      ? (rawAddr as Address)
      : getOrgAddress('org-bright-futures');

  const [attestation, progress] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress) : Promise.resolve(null),
    useRealData
      ? generate990FromQBO(org.id)
      : Promise.resolve(generate990Progress(PIPELINE_MONTHS)),
  ]);

  return (
    <Form990Content
      orgName={useRealData ? org.name : 'Bright Futures Youth Services'}
      ein={useRealData ? '\u2014' : '93-1234567'}
      sections={progress.sections}
      sampleFields={progress.sampleFields}
      monthsProcessed={progress.monthsProcessed}
      overallCompletion={progress.overallCompletion}
      aiConfidence={progress.aiConfidence}
      attestation={attestation}
    />
  );
}
