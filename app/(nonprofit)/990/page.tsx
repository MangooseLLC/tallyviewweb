import { getLatestAudit } from '@/lib/chain/reads';
import { getOrgAddress } from '@/lib/chain/config';
import { PIPELINE_MONTHS } from '@/lib/pipeline/ingest';
import { generate990Progress } from '@/lib/pipeline/map990';
import { Form990Content } from '@/components/nonprofit/Form990Content';

export default async function Form990Page() {
  const orgAddress = getOrgAddress('org-bright-futures');

  const [attestation, progress] = await Promise.all([
    orgAddress ? getLatestAudit(orgAddress) : Promise.resolve(null),
    Promise.resolve(generate990Progress(PIPELINE_MONTHS)),
  ]);

  return (
    <Form990Content
      orgName="Bright Futures Youth Services"
      ein="93-1234567"
      sections={progress.sections}
      sampleFields={progress.sampleFields}
      monthsProcessed={progress.monthsProcessed}
      overallCompletion={progress.overallCompletion}
      aiConfidence={progress.aiConfidence}
      attestation={attestation}
    />
  );
}
