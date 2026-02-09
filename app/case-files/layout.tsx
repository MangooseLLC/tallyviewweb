import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Tallyview Case Files',
  description: 'A canonical file depository for public money fraud.',
};

export default function CaseFilesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-navy text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={180}
              height={50}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
            <span className="hidden text-xs text-gray-300 md:inline">
              The Accountability Intelligence Layer for Public Money
            </span>
          </Link>
          <Link
            href="/case-files"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-brand-gold transition hover:border-brand-gold/40 hover:bg-white/5"
          >
            Case Files
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-white/10 py-6 text-center text-xs text-gray-400">
        Tallyview &copy; 2026
      </footer>
    </div>
  );
}
