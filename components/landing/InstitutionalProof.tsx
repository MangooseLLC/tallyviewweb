import { Building2, Landmark, Scale, MapPin, FileCheck } from 'lucide-react';

const items = [
  {
    icon: Building2,
    title: 'Deloitte + Avalanche',
    description: 'Disaster relief disbursement tracking for FEMA — document authentication and streamlined reimbursement on an Avalanche subnet.',
  },
  {
    icon: Landmark,
    title: 'California DMV',
    description: '42 million car titles digitized on Avalanche.',
  },
  {
    icon: Scale,
    title: 'Wyoming',
    description: 'State-backed FRNT stablecoin on an Avalanche L1, overseen by the State Treasurer with monthly audits mandated by law.',
  },
  {
    icon: FileCheck,
    title: 'U.S. Dept. of Commerce',
    description: 'First federal agency to put economic statistical data on-chain — GDP data published to Avalanche (August 2025).',
  },
  {
    icon: MapPin,
    title: 'Bergen County, NJ',
    description: '5-year deal with Balcony: 370,000+ property records ($240B in real estate value) digitized on an Avalanche L1.',
  },
];

export default function InstitutionalProof() {
  return (
    <section className="bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
          Institutional credibility
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
          Built on infrastructure governments already trust
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          Tallyview is not pioneering government blockchain adoption — it&apos;s riding a wave
          that&apos;s already breaking. Avalanche is already in production with federal, state, and
          local government use cases.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy w-fit">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-brand-navy">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
