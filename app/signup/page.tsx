'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { appUser, isAuthenticated, isDemoMode, isLoading, logout, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExitSession() {
    if (isDemoMode) {
      logout();
      router.refresh();
      return;
    }

    await signOut();
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setEmailSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      const provisionRes = await fetch('/api/auth/provision', {
        method: 'POST',
      });

      if (!provisionRes.ok) {
        const data = await provisionRes.json().catch(() => ({}));
        setError(data.error || 'Account created but setup failed. Try signing in.');
        return;
      }

      const provisionData = await provisionRes.json().catch(() => ({}));
      window.location.assign(provisionData.isNew ? '/onboarding' : '/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light px-4">
        <div className="h-8 w-8 rounded-full border-2 border-brand-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light px-4">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 flex justify-center">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={180}
              height={50}
              className="h-8 w-auto brightness-0 invert"
              priority
            />
          </Link>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <h1 className="text-xl font-semibold text-white">You&apos;re already signed in</h1>
            <p className="mt-1 text-sm text-slate-300">
              {appUser?.email
                ? `Signed in as ${appUser.email}.`
                : 'Your current session is already active.'}
            </p>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light"
              >
                Go to Dashboard
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={handleExitSession}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign Out and Create Another Account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-navy via-brand-navy to-brand-navy-light px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Image
            src="/tallyview-logo.svg"
            alt="Tallyview"
            width={180}
            height={50}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <h1 className="text-xl font-semibold text-white">Create account</h1>
          <p className="mt-1 text-sm text-slate-300">
            Start with a one-time email code
          </p>

          {emailSent ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-brand-gold/20 bg-brand-gold/10 px-4 py-3 text-sm text-slate-200">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-brand-gold" />
                  <div>
                    <p className="font-medium text-white">Check your email</p>
                    <p className="mt-1 text-slate-300">
                      We sent a 6-digit sign-in code to `{email.trim().toLowerCase()}`.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-xs font-medium text-slate-300">
                    Verification Code
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 pl-10 text-sm tracking-[0.3em] text-white placeholder-slate-400 outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50"
                      placeholder="123456"
                    />
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otpCode.trim().length < 6}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light disabled:opacity-50"
                >
                  {loading ? 'Verifying code...' : 'Verify Code'}
                  {!loading && <ArrowRight className="h-3.5 w-3.5" />}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setEmailSent(false);
                  setOtpCode('');
                  setError(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-gold/50 focus:ring-1 focus:ring-brand-gold/50"
                  placeholder="you@nonprofit.org"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light disabled:opacity-50"
              >
                {loading ? 'Sending code...' : 'Email Me a Sign-Up Code'}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-gold hover:underline">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-white"
          >
            Or try the interactive demo
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
