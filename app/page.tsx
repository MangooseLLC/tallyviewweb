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
import { PublicNav } from '@/components/layouts/PublicNav';

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,186,66,0.16),_transparent_45%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col pb-16 pt-0">
          <PublicNav variant="dark" />

          <div className="mt-12 px-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-gold">
                Automated 990 & Audit Prep
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
                <span className="block">Your 990 builds itself.</span>
                <span className="block text-brand-gold">Your books stay audit-ready.</span>
                <span className="block">Your nonprofit is trusted.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-200 md:text-lg">
                Tallyview connects to your accounting system, classifies transactions
                into 990 categories, catches errors early, and keeps an independent
                compliance record that funders and auditors can check.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 max-w-xl">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light w-full sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 w-full sm:w-auto"
                >
                  View Demo
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold">
                At a glance
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
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_350px]">
            <div className="rounded-3xl border border-brand-navy/10 bg-white p-6 shadow-sm lg:p-8">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-brand-navy/10 p-2 text-brand-navy">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-brand-navy">Nonprofits</h3>
              </div>
              <ul className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <li>Progressive 990 that builds throughout the year</li>
                <li>Board-ready financials and audit prep</li>
                <li>Error detection on vendor payments and allocation errors</li>
                <li>Restricted fund tracking and compliance</li>
                <li className="sm:col-span-2">Tallyview Verified credential backed by ongoing on-chain attestation</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-brand-navy p-6 shadow-sm lg:p-8 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-white/10 p-2 text-brand-gold">
                  <Scale className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-white">Overseers</h3>
              </div>
              <p className="mt-4 text-sm text-slate-300 leading-relaxed">
                Tallyview gives foundations, regulators, and auditors verified financial summaries from the organizations they oversee.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
                  Independent verifiable records
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-gold" />
                  Real-time compliance visibility
                </li>
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

      <section className="bg-brand-navy text-white">
        <div className="mx-auto w-full max-w-4xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold md:text-4xl">
            Ready to automate your compliance?
          </h2>
          <p className="mt-4 text-base text-slate-300 md:text-lg max-w-2xl mx-auto">
            Connect your accounting system in minutes and keep your books audit-ready all year.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gold px-6 py-3.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 w-full sm:w-auto"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-8">
          <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-3">
                <Image
                  src="/tallyview-logo.svg"
                  alt="Tallyview"
                  width={32}
                  height={32}
                  className="h-8 w-8 opacity-70 grayscale"
                />
                <span className="font-serif text-lg font-bold text-slate-700">
                  Tallyview
                </span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-500">
                Helping nonprofits stay audit-ready with automated 990
                classification, real-time compliance monitoring, and
                blockchain-verified financial records.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">Legal</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <span className="text-sm text-slate-400 cursor-default">
                    Privacy Policy
                  </span>
                </li>
                <li>
                  <span className="text-sm text-slate-400 cursor-default">
                    Terms of Service
                  </span>
                </li>
                <li>
                  <span className="text-sm text-slate-400 cursor-default">
                    License Agreement
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">Resources</h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <Link
                    href="/case-files"
                    className="text-sm text-slate-500 transition hover:text-brand-navy"
                  >
                    Case Files
                  </Link>
                </li>
                <li>
                  <Link
                    href="/transparency"
                    className="text-sm text-slate-500 transition hover:text-brand-navy"
                  >
                    Transparency Scores
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@tallyview.com"
                    className="text-sm text-slate-500 transition hover:text-brand-navy"
                  >
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-800">
                Connect With Us
              </h4>
              <ul className="mt-4 space-y-3">
                <li>
                  <a
                    href="https://x.com/tallyviewcom"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-500 transition hover:text-brand-navy"
                  >
                    X (Twitter)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/showcase/tallyview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-500 transition hover:text-brand-navy"
                  >
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-200 pt-8 text-center">
            <p className="text-sm text-slate-400">
              &copy; {new Date().getFullYear()} Tallyview. All rights reserved.
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Built with transparency in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
