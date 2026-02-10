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
  Lock,
  Search,
} from 'lucide-react';
import WaitlistForm from '@/components/landing/WaitlistForm';
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
                Accountability Intelligence
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                The Accountability Chain
                <span className="block text-brand-gold">for Public Money</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-200 md:text-lg">
                Tallyview connects to the accounting systems nonprofits already
                use. It monitors transactions in real time, flags anomalies, and
                records every finding on a tamper-proof ledger that nonprofits,
                funders, regulators, and investigators can verify for themselves.
              </p>
              <div className="mt-8 max-w-xl">
                <WaitlistForm buttonLabel="Join waitlist" />
                <p className="mt-4 text-xs text-slate-300">
                  Early access for nonprofits, foundations, regulators, and forensic investigators.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                How It Works
              </p>
              <div className="mt-4 space-y-4 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Integrates with QuickBooks, Xero, Sage Intacct, NetSuite, and 20+ accounting systems.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Classifies transactions into 990 categories and flags anomalies in real time.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Every attestation is written to an immutable chain. No one can change the record, not even the organization.</p>
                </div>
                <div className="flex items-start gap-3">
                  <LineChart className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
                  <p>Delivers real-time portfolio intelligence to funders, regulators, and investigators.</p>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-brand-navy/60 p-4">
                <p className="text-xs text-slate-300">
                  One integration. Compliance automation for organizations, real-time oversight for everyone else.
                </p>
              </div>
              <p className="mt-4 text-center text-[10px] uppercase tracking-wider text-slate-400">
                Powered by Avalanche
              </p>
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
                Real-time accountability for public money
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Tallyview connects to the accounting systems nonprofits already use
                and turns financial activity into real-time oversight data. We run
                it through our intelligence layer, then record commitments on the
                Tallyview Accountability Chain so anyone can verify the results.
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
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Nonprofits</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Progressive 990 that builds throughout the year</li>
                <li>Board-ready financials and audit prep</li>
                <li>Anomaly detection on vendor payments and allocation errors</li>
                <li>Restricted fund tracking with real-time compliance</li>
                <li className="font-medium text-brand-navy">Earn a Tallyview Verified credential backed by ongoing on-chain attestation</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-brand-gold/30 bg-brand-gold/10 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-gold/30 p-2 text-brand-navy">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Foundations</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Real-time financial visibility across grantees</li>
                <li>Risk scores, anomaly alerts, peer benchmarking</li>
                <li>Cross-org entity resolution and fraud pattern detection</li>
                <li className="font-medium text-brand-navy">Grant agreements as smart contracts that enforce reporting automatically</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                  <Scale className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Regulators</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Jurisdiction dashboard and risk map</li>
                <li>Investigation queue and entity analysis</li>
                <li>Reports and triage tools</li>
                <li className="font-medium text-brand-navy">Query board members and vendors across state lines on a shared verification layer</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-brand-avalanche/20 bg-brand-avalanche/5 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-avalanche/20 p-2 text-brand-avalanche">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Investigators</h3>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>Investigation workbench and fraud typologies</li>
                <li>Active cases and exportable briefs</li>
                <li>Full audit trails</li>
                <li className="font-medium text-brand-navy">Every anomaly and evidence finding timestamped on an immutable record</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-navy">
            How It Works
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-brand-navy md:text-3xl">
            Connect. Detect. Verify. Surface.
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
              Organizations link their existing accounting system in minutes.
              No data migration. No workflow disruption.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-gold/30 p-2 text-brand-navy">
                <Radar className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">02</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Detect</h3>
            <p className="mt-3 text-sm text-slate-600">
              Transactions are classified into 990 categories, benchmarked
              against peers, and screened for anomalies across the network.
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
              Transaction classifications, anomaly flags, and compliance states are
              recorded on the Tallyview Accountability Chain. The record cannot be
              changed after the fact.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                <Scale className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-slate-400">04</span>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-brand-navy">Surface</h3>
            <p className="mt-3 text-sm text-slate-600">
              Foundations, regulators, and investigators get real-time
              oversight reports instead of waiting for annual filings.
            </p>
          </div>
          </div>
        </div>
      </section>

      <InstitutionalProof />
      <ValidatorNetwork />

      <footer className="bg-brand-navy text-white">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h3 className="text-2xl font-semibold">
                Request early access.
              </h3>
              <p className="mt-3 text-sm text-slate-300">
                We are onboarding early users now. Share your role and email and we will
                follow up with demo access and timing.
              </p>
            </div>
            <WaitlistForm buttonLabel="Get early access" showRoleSelector />
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-400 md:flex-row">
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
