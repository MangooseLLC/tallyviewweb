import { Shield, ExternalLink } from 'lucide-react';

export default function VerifiedBadge() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
          The Credential
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
          Tallyview Verified
        </h2>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          A credential that shows your organization&apos;s financials are monitored and verified
          on an ongoing basis. Grant applications can reference it. Board members use it for
          D&amp;O liability. Donors check it before giving. Auditors use it to narrow audit scope.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              When foundations start requiring Tallyview Verified in grant agreements, more
              nonprofits sign up and the verification network grows. The credential is valuable
              because it sits on a shared, tamper-proof record anyone can check.
            </p>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                Non-transferable, revocable if compliance lapses
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                Backed by ongoing on-chain attestation
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-gold" />
                No wallet or tokens. You never interact with the chain directly.
              </li>
            </ul>
          </div>
          <div className="flex flex-col items-center rounded-3xl border border-brand-gold/30 bg-brand-gold/10 p-8">
            <div className="flex items-center gap-3 rounded-2xl border border-brand-gold/40 bg-white px-6 py-4 shadow-sm">
              <Shield className="h-10 w-10 text-brand-gold" />
              <div>
                <p className="font-semibold text-brand-navy">Tallyview Verified</p>
                <p className="text-xs text-slate-500">Ongoing attestation</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-navy underline decoration-brand-gold underline-offset-2 hover:no-underline"
            >
              Verify on-chain
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
