import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileText,
  Gavel,
  MapPin,
  Scale,
  Shield,
} from 'lucide-react';
import { caseFiles } from '@/lib/data/case-files';

type CaseFilePageProps = {
  params: { slug: string };
};

function renderCommentaryLink(label: string, value?: string) {
  if (!value) return null;
  const isUrl = value.startsWith('http');
  return (
    <li className="text-sm text-gray-300">
      <span className="text-gray-400">{label}</span>{' '}
      {isUrl ? (
        <a className="text-brand-gold hover:underline" href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </li>
  );
}

export default function CaseFilePage({ params }: CaseFilePageProps) {
  const caseFile = caseFiles.find((item) => item.slug === params.slug);

  if (!caseFile) {
    notFound();
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Link
          href="/case-files"
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-brand-gold"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Case Files
        </Link>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-brand-gold">
              <FileText className="h-3.5 w-3.5" />
              {caseFile.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {caseFile.location}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            {caseFile.title}
          </h1>
          <div className="flex flex-wrap gap-2 text-xs text-gray-300">
            {caseFile.pattern.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-300">
            <span className="text-brand-gold">Status:</span> {caseFile.status}
          </p>
        </div>

        <blockquote className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
          This Case File summarizes allegations and outcomes described in public court filings and official statements.
          Sources are linked at the bottom.
        </blockquote>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">What happened (summary)</h2>
        <div className="space-y-3 text-sm text-gray-300">
          {caseFile.summary.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Money trail (how dollars moved)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {caseFile.moneyTrail.map((item) => (
            <div
              key={item.amount}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <p className="text-lg font-semibold text-brand-gold">{item.amount}</p>
              <p className="mt-2 text-sm text-gray-300">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">How it worked (mechanism)</h2>
        <div className="space-y-4">
          {caseFile.mechanisms.map((mechanism) => (
            <div
              key={mechanism.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <h3 className="text-sm font-semibold text-white">{mechanism.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {mechanism.steps.map((step) => (
                  <li key={step} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-gold" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Controls that should have stopped it (practical)</h2>
        <div className="space-y-4">
          {caseFile.controls.map((control) => (
            <div
              key={control.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <h3 className="text-sm font-semibold text-white">{control.title}</h3>
              <ul className="mt-3 space-y-2 text-sm text-gray-300">
                {control.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <ClipboardCheck className="mt-0.5 h-4 w-4 text-brand-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Outcome (where the case stands)</h2>
        <div className="space-y-3">
          {caseFile.outcome.map((event) => (
            <div
              key={event.date}
              className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300 md:flex-row md:items-center md:justify-between"
            >
              <span className="font-semibold text-brand-gold">{event.date}</span>
              <span>{event.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Entities referenced</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            <div className="flex items-center gap-2 text-brand-gold">
              <Building2 className="h-4 w-4" />
              Organization
            </div>
            <p className="mt-3">{caseFile.entities.organization}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            <div className="flex items-center gap-2 text-brand-gold">
              <Shield className="h-4 w-4" />
              Public agencies
            </div>
            <ul className="mt-3 space-y-2">
              {caseFile.entities.publicAgencies.map((agency) => (
                <li key={agency}>{agency}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
            <div className="flex items-center gap-2 text-brand-gold">
              <Scale className="h-4 w-4" />
              Vendors
            </div>
            <ul className="mt-3 space-y-2">
              {caseFile.entities.vendors.map((vendor) => (
                <li key={vendor}>{vendor}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Sources</h2>
        <ul className="space-y-2 text-sm text-gray-300">
          {caseFile.sources.map((source) => (
            <li key={source.label} className="flex items-start gap-2">
              <BadgeCheck className="mt-0.5 h-4 w-4 text-brand-gold" />
              <span>{source.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Commentary by Khori</h2>
        <ul className="space-y-2">
          {renderCommentaryLink('X thread:', caseFile.commentary.xThread)}
          {renderCommentaryLink('LinkedIn post:', caseFile.commentary.linkedIn)}
        </ul>
      </section>
    </div>
  );
}
