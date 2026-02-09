import { Building2, Scale, ShieldCheck, Network } from 'lucide-react';

const participants = [
  {
    icon: Network,
    label: 'Tallyview',
    description: 'Founding validators',
  },
  {
    icon: Building2,
    label: 'Foundations',
    description: 'Run validator nodes and participate in the network',
  },
  {
    icon: Scale,
    label: 'State AG offices',
    description: 'Validate for their jurisdiction',
  },
  {
    icon: ShieldCheck,
    label: 'Audit firms',
    description: 'Big 4 and governance orgs can participate',
  },
];

export default function ValidatorNetwork() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
          Shared infrastructure
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
          The validator network
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Shared accountability infrastructure, not one company&apos;s database. Foundations,
          regulators, and audit firms can run validator nodes alongside Tallyview.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-5">
          {participants.map(({ icon: Icon, label, description }) => (
            <div
              key={label}
              className="flex min-w-[200px] max-w-[240px] flex-col items-center rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-center"
            >
              <div className="rounded-2xl bg-brand-avalanche/10 p-3 text-brand-avalanche">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-brand-navy">{label}</h3>
              <p className="mt-2 text-xs text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
