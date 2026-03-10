'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { personas } from '@/lib/data/personas';
import { PersonaRole } from '@/lib/types';
import {
  Building2,
  Landmark,
  Shield,
  Scale,
  ArrowRight,
  FileText,
  Mail,
  KeyRound,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const roleIcons: Record<PersonaRole, React.ReactNode> = {
  nonprofit: <Building2 className="h-6 w-6" />,
  foundation: <Landmark className="h-6 w-6" />,
  regulator: <Shield className="h-6 w-6" />,
  investigator: <Scale className="h-6 w-6" />,
};

const roleRoutes: Record<PersonaRole, string> = {
  nonprofit: '/dashboard',
  foundation: '/foundation/dashboard',
  regulator: '/regulator/dashboard',
  investigator: '/investigator/dashboard',
};

const RESEND_COOLDOWN = 60;

export default function LoginPage() {
  const router = useRouter();
  const { login, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await sendOtp(email);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStep('code');
    setCooldown(RESEND_COOLDOWN);
  };

  const handleVerifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await verifyOtp(email, code);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push('/onboarding');
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError('');
    const result = await sendOtp(email);
    if (result.error) {
      setError(result.error);
      return;
    }
    setCooldown(RESEND_COOLDOWN);
  };

  const handleDemoLogin = (personaId: string, role: PersonaRole) => {
    login(personaId);
    router.push(roleRoutes[role]);
  };

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo & Header */}
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

        {/* Auth Card */}
        <div className="w-full max-w-md mb-10">
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            {step === 'email' ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-5 w-5 text-brand-gold" />
                  <h2 className="text-lg font-semibold text-white">Sign in</h2>
                </div>
                <p className="text-sm text-gray-400 mb-5">
                  Enter your email and we&apos;ll send you a verification code.
                </p>
                <form onSubmit={handleSendCode} className="space-y-4">
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
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      'Send verification code'
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setStep('email'); setCode(''); setError(''); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300 mb-4 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>
                <div className="flex items-center gap-2 mb-4">
                  <KeyRound className="h-5 w-5 text-brand-gold" />
                  <h2 className="text-lg font-semibold text-white">Enter code</h2>
                </div>
                <p className="text-sm text-gray-400 mb-5">
                  We sent a 6-digit code to <span className="text-white font-medium">{email}</span>
                </p>
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                    placeholder="000000"
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/40 transition-all"
                  />
                  {error && (
                    <p className="text-sm text-red-400">{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={code.length !== 6 || submitting}
                    className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                    ) : (
                      'Verify'
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={cooldown > 0}
                      className="text-xs text-gray-400 hover:text-brand-gold disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                    >
                      {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full max-w-4xl mb-8">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Or explore the demo</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {/* Demo Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full">
          {personas.map((persona) => (
            <button
              key={persona.id}
              onClick={() => handleDemoLogin(persona.id, persona.role)}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 text-left transition-all duration-300 hover:bg-white/10 hover:border-brand-gold/40 hover:shadow-xl hover:shadow-brand-gold/5 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-lg flex-shrink-0',
                  persona.color
                )}>
                  {roleIcons[persona.role]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">{persona.name}</h3>
                    <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-brand-gold group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm text-gray-400 mt-0.5">{persona.title}</p>
                  <p className="text-sm text-brand-gold/80 font-medium mt-1">{persona.organization}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{persona.orgDetail}</p>
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-xs text-gray-400">{persona.description}</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center space-y-2">
        <Link
          href="/case-files"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold hover:text-brand-gold-light"
        >
          <FileText className="h-3.5 w-3.5" />
          Tallyview Case Files
        </Link>
        <p className="text-xs text-gray-500">
          Demo environment with synthetic data &bull; Tallyview &copy; 2026
        </p>
      </footer>
    </div>
  );
}
