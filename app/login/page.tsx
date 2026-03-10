'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  ArrowRight,
  FileText,
  Mail,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { continueWithEmail, appUser, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [nextRoute, setNextRoute] = useState<'/dashboard' | '/onboarding' | null>(null);

  useEffect(() => {
    if (!isLoading && appUser) {
      router.replace(nextRoute ?? '/dashboard');
    }
  }, [isLoading, appUser, nextRoute, router]);

  const handleContinue = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await continueWithEmail(email.trim());
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setNextRoute(result.isNewUser ? '/onboarding' : '/dashboard');
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={280}
              height={78}
              className="h-14 w-auto brightness-0 invert"
              priority
            />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white max-w-2xl mx-auto leading-tight">
            The Accountability Intelligence Layer<br />
            <span className="text-brand-gold">for Public Money</span>
          </h1>
        </div>

        <div className="w-full max-w-md mb-10">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-gold" />
              <h2 className="text-lg font-semibold text-white">Enter your email</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Continue with your work email to access Tallyview.
            </p>
            <form onSubmit={handleContinue} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="you@example.com"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/40 transition-all"
              />
              {error && (
                <p className="text-sm text-red-400">{error}</p>
              )}
              <button
                type="submit"
                disabled={!email.trim() || submitting}
                className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Continuing...</>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-gold transition-colors"
            >
              Or explore the demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <footer className="py-4 text-center space-y-2">
        <Link
          href="/case-files"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold hover:text-brand-gold-light"
        >
          <FileText className="h-3.5 w-3.5" />
          Tallyview Case Files
        </Link>
        <p className="text-xs text-gray-500">
          Tallyview &copy; 2026
        </p>
      </footer>
    </div>
  );
}
