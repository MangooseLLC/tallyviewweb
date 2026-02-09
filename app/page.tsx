import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  Scale,
  LineChart,
  Link2,
  Radar,
} from 'lucide-react';
import WaitlistForm from '@/components/landing/WaitlistForm';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,186,66,0.16),_transparent_45%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-20 pt-8">
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

          <div className="mt-16 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
                Accountability Intelligence
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                The Accountability Intelligence Layer
                <span className="block text-brand-gold">for Public Money</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-200 md:text-lg">
                Tallyview sits on top of existing nonprofit accounting systems to
                deliver real-time compliance automation and cross-organization
                oversight intelligence.
              </p>
              <div className="mt-8 max-w-xl">
                <WaitlistForm buttonLabel="Join waitlist" />
                <p className="mt-4 text-xs text-slate-300">
                  Early access for nonprofits, foundations, regulators, and investigators.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                Pipeline Overview
              </p>
              <div className="mt-4 space-y-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-4 w-4 text-brand-gold" />
                  <p>Connects to QuickBooks, Xero, Sage Intacct, NetSuite, and 20+ others.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Radar className="mt-0.5 h-4 w-4 text-brand-gold" />
                  <p>Continuously maps transactions into 990 categories and detects anomalies.</p>
                </div>
                <div className="flex items-start gap-3">
                  <LineChart className="mt-0.5 h-4 w-4 text-brand-gold" />
                  <p>Generates real-time portfolio intelligence for oversight stakeholders.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-brand-navy/60 p-4">
                <p className="text-xs text-slate-300">
                  The progressive 990 is not the product. It is the distribution
                  strategy for the accountability layer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
              The Thesis
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
              Plaid for nonprofit accountability
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Plaid does not compete with banks. It sits on top of whatever bank
              you use and creates a data layer that powers entirely different
              products. Tallyview does the same for nonprofit accounting systems
              to create a real-time accountability intelligence layer.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                Accounting Systems
                <p className="mt-2 text-xs text-slate-500">
                  QuickBooks, Xero, Sage Intacct, NetSuite, and 20+ others
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px flex-1 bg-slate-200" />
                Data Layer
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold/10 p-4 text-sm font-semibold text-brand-navy">
                Tallyview Intelligence Layer
                <p className="mt-2 text-xs font-normal text-slate-600">
                  Continuous mapping, anomaly detection, cross-org benchmarking
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="h-px flex-1 bg-slate-200" />
                Accountability Outcomes
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-700">
                Oversight Intelligence
                <p className="mt-2 text-xs text-slate-500">
                  Foundation portfolio views, regulator triage, investigation workbench
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
            Two-Sided Value
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
            One data pipeline. Two distinct products.
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">For Nonprofits</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Progressive 990 generation that builds throughout the year</li>
                <li>Board-ready financial reports and audit prep packages</li>
                <li>Anomaly detection on vendor payments and expense drift</li>
                <li>Restricted fund tracking with real-time compliance</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-brand-gold/30 bg-brand-gold/10 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-gold/30 p-2 text-brand-navy">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">
                  For Oversight Stakeholders
                </h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Real-time portfolio intelligence across connected grantees</li>
                <li>Risk scoring, anomaly alerts, and peer benchmarking</li>
                <li>Cross-organization entity mapping and fraud pattern detection</li>
                <li>Investigation workbench with evidence-ready briefs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
          How It Works
        </p>
        <h2 className="mt-4 text-3xl font-semibold text-brand-navy">
          Connect. Intelligence. Accountability.
        </h2>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                <Link2 className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">01</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Connect</h3>
            <p className="mt-3 text-sm text-slate-600">
              Nonprofits link their existing accounting system in minutes. No
              migration. No rip-and-replace.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-gold/30 p-2 text-brand-navy">
                <Radar className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">02</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Intelligence</h3>
            <p className="mt-3 text-sm text-slate-600">
              AI maps transactions to 990 categories, benchmarks performance,
              and flags anomalies across the connected network.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">03</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Accountability</h3>
            <p className="mt-3 text-sm text-slate-600">
              Foundations, regulators, and investigators receive real-time
              oversight intelligence and evidence packages.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-brand-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h3 className="text-2xl font-semibold">
                Join the waitlist for early access.
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                Share your role and we will reach out with demo access and launch timing.
              </p>
            </div>
            <WaitlistForm buttonLabel="Get early access" />
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 md:flex-row">
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
