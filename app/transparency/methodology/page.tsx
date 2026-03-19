import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Scoring Methodology | Nonprofit Transparency Scores | Tallyview',
  description: 'How Tallyview computes nonprofit transparency scores from public IRS 990 data.',
};

export default function MethodologyPage() {
  const dimensions = [
    {
      name: 'Financial Health',
      weight: '30%',
      factors: [
        'Program expense ratio (>75% ideal)',
        'Management overhead ratio (<15% ideal)',
        'Operating margin (positive but not excessive)',
      ],
    },
    {
      name: 'Governance',
      weight: '25%',
      factors: [
        'Board size (5-15 members ideal)',
        'Board independence ratio (>67% ideal)',
        'Conflict of interest policy',
        'Whistleblower policy',
      ],
    },
    {
      name: 'Transparency',
      weight: '25%',
      factors: [
        'Form 990 filing on record',
        'Independent audit completed',
        'Financial data publicly available',
        'Compensation disclosure',
      ],
    },
    {
      name: 'Compliance',
      weight: '20%',
      factors: [
        'Form 990 filed',
        'Filing within 2 years of current year',
        'Governance policies in place',
      ],
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Scoring Methodology</h1>
        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
          Tallyview Transparency Scores summarize a nonprofit&apos;s financial health,
          governance, transparency, and compliance into a single 0-100 score. Scores
          are computed from publicly available IRS Form 990 data accessed through
          ProPublica&apos;s Nonprofit Explorer API.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Data Source</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          All data comes from IRS Form 990 filings made available through the
          ProPublica Nonprofit Explorer. Due to IRS processing timelines, the most
          recent available data is typically 12-24 months old. Tallyview surfaces the
          &quot;data vintage&quot; (filing year) on every score to help users assess
          currency.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed">
          Scores are cached for 24 hours and recomputed on the next lookup.
          Organizations connected to Tallyview may receive enhanced scores that
          incorporate real-time data from their accounting systems.
        </p>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Score Dimensions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {dimensions.map((dim) => (
            <div key={dim.name} className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">{dim.name}</h3>
                <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
                  {dim.weight}
                </span>
              </div>
              <ul className="space-y-1.5">
                {dim.factors.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-brand-navy shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Score Ranges</h2>
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="rounded-lg bg-emerald-50 p-4">
            <p className="text-2xl font-bold text-emerald-700">80-100</p>
            <p className="mt-1 text-xs text-emerald-600">Strong transparency</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-2xl font-bold text-amber-700">60-79</p>
            <p className="mt-1 text-xs text-amber-600">Moderate transparency</p>
          </div>
          <div className="rounded-lg bg-red-50 p-4">
            <p className="text-2xl font-bold text-red-700">0-59</p>
            <p className="mt-1 text-xs text-red-600">Needs improvement</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Limitations</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
            Scores are based on publicly available data only and may not reflect the full picture of an organization.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
            IRS data can be 12-24 months behind. Check the data vintage for each score.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
            Governance data (board composition, policies) is not always available in 990 filings.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 rounded-full bg-slate-400 shrink-0" />
            Scores should not be used as the sole basis for funding or regulatory decisions.
          </li>
        </ul>
      </section>
    </div>
  );
}
