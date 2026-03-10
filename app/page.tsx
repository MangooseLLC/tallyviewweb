import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Scale,
  LineChart,
  Link2,
  Radar,
  Lock,
} from 'lucide-react';
import ArchitectureDiagram from '@/components/landing/ArchitectureDiagram';
import VerifiedBadge from '@/components/landing/VerifiedBadge';
import InstitutionalProof from '@/components/landing/InstitutionalProof';
import ValidatorNetwork from '@/components/landing/ValidatorNetwork';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,186,66,0.16),_transparent_45%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8">
          <nav className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-3">
              <Image
                src="/tallyview-logo.svg"
                alt="Tallyview"
                width={200}
                height={56}
                className="h-9 w-auto brightness-0 invert"
                priority
              />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-brand-gold/60 hover:text-brand-gold"
            >
              View Demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
                Nonprofit financial compliance
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                Your 990 builds itself.
                <span className="block text-brand-gold">Your books stay audit-ready.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-200 md:text-lg">
                Tallyview connects to your accounting system, classifies transactions
                into 990 categories, catches errors early, and keeps an independent
                compliance record that funders and auditors can check.
              </p>
              <div className="mt-8 flex max-w-xl gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light"
                >
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                How It Works
              </p>
              <div className="mt-4 space-y-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Connects to QuickBooks, Xero, Sage Intacct, and 20+ others. No data migration.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Sorts your transactions into 990 categories as they come in.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Each classification gets recorded on the Tallyview Accountability Chain. You can point auditors and funders to it.</p>
                </div>
                <div className="flex items-start gap-3">
                  <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>You get a Tallyview Verified credential you can include in grant applications.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-brand-navy/60 p-4">
                <p className="text-xs text-slate-300">
                  One integration. Your compliance stays current. Funders and auditors see verified summaries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
                The Platform
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-brand-navy md:text-3xl">
                What Tallyview does with your data
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Tallyview connects to your accounting system and turns financial
                activity into classified, verified data. We process it, then
                record commitments on the Tallyview Accountability Chain so
                funders and auditors can verify the results.
              </p>
            </div>
            <ArchitectureDiagram />
          </div>
        </div>
      </section>

      <VerifiedBadge />

      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
            Who We Serve
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-brand-navy md:text-3xl">
            Built for nonprofits and the people who oversee them.
          </h2>
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Nonprofits</h3>
              </div>
              <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                <li>Progressive 990 that builds throughout the year</li>
                <li>Board-ready financials and audit prep</li>
                <li>Error detection on vendor payments and allocation errors</li>
                <li>Restricted fund tracking and compliance</li>
                <li>Tallyview Verified credential backed by ongoing on-chain attestation</li>
              </ul>
            </div>
            <p className="text-sm text-slate-600">
              Tallyview also gives foundations, regulators, and auditors verified financial summaries from the organizations they oversee.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
            How It Works
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-brand-navy md:text-3xl">
            Connect. Organize. Verify. Prove.
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                <Link2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">01</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Connect</h3>
            <p className="mt-3 text-sm text-slate-600">
              Link your accounting system. Takes a few minutes. Nothing to migrate.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-gold/30 p-2 text-brand-navy">
                <Radar className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">02</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Organize</h3>
            <p className="mt-3 text-sm text-slate-600">
              Transactions get sorted into 990 categories and compared to similar orgs.
            </p>
          </div>
          <div className="rounded-3xl border border-brand-avalanche/30 bg-brand-avalanche/5 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-avalanche/20 p-2 text-brand-avalanche">
                <Lock className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">03</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Verify</h3>
            <p className="mt-3 text-sm text-slate-600">
              Classifications and compliance states get written to the Tallyview
              Accountability Chain. That record is independent and permanent.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">04</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Prove</h3>
            <p className="mt-3 text-sm text-slate-600">
              Funders, board members, and auditors can check your verified record directly.
            </p>
          </div>
          </div>
        </div>
      </section>

      <InstitutionalProof />
      <ValidatorNetwork />

      <footer className="bg-brand-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-400 md:flex-row">
            <p>Tallyview &copy; 2026</p>
            <Link href="/case-files" className="hover:text-brand-gold">
              Tallyview Case Files
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
