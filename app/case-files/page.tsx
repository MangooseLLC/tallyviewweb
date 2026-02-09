import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { caseFiles } from '@/lib/data/case-files';

export default function CaseFilesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300">
          <FileText className="h-3.5 w-3.5 text-brand-gold" />
          Canonical public money fraud case files
        </div>
        <h1 className="text-3xl font-semibold text-white md:text-4xl">
          Tallyview Case Files
        </h1>
        <p className="max-w-2xl text-sm text-gray-300 md:text-base">
          A canonical file depository for public money fraud. Each case file is a
          longform summary of allegations, outcomes, and practical control lessons.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {caseFiles.map((caseFile) => (
          <Link
            key={caseFile.slug}
            href={`/case-files/${caseFile.slug}`}
            className="group flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 transition hover:border-brand-gold/40 hover:bg-white/10"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{caseFile.location}</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {caseFile.title}
                </h2>
                <p className="mt-2 text-sm text-gray-300">
                  {caseFile.summary[0]}
                </p>
              </div>
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
            </div>
            <div className="mt-6 flex items-center justify-between text-xs text-gray-400">
              <span>{caseFile.status}</span>
              <span className="inline-flex items-center gap-1 text-brand-gold">
                Read case file
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
