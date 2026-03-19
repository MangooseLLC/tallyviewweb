import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Nonprofit Transparency Scores | Tallyview',
  description: 'Explore transparency scores for U.S. nonprofits based on public 990 filings, governance, and compliance data.',
};

export default function TransparencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={180}
              height={50}
              className="h-7 w-auto"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/transparency"
              className="text-sm font-medium text-slate-600 hover:text-brand-navy transition"
            >
              Directory
            </Link>
            <Link
              href="/transparency/methodology"
              className="text-sm font-medium text-slate-600 hover:text-brand-navy transition"
            >
              Methodology
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-navy transition hover:bg-slate-50"
            >
              Demo
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Scores derived from public IRS filings via ProPublica Nonprofit Explorer &bull; Tallyview &copy; 2026
      </footer>
    </div>
  );
}
