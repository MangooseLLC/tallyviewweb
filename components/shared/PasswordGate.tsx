'use client';

import { useState, useEffect, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, FileText } from 'lucide-react';

const SESSION_KEY = 'tallyview_site_unlocked';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();
  const isPublicCaseFiles = pathname.startsWith('/case-files');

  // Check sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored === 'true') {
        setUnlocked(true);
      }
    } catch {
      // sessionStorage not available
    }
    setLoading(false);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        try {
          sessionStorage.setItem(SESSION_KEY, 'true');
        } catch {
          // sessionStorage not available
        }
        setUnlocked(true);
      } else {
        setError('Incorrect password. Please try again.');
        setPassword('');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isPublicCaseFiles) {
    return <>{children}</>;
  }

  // Show nothing while checking session
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/tallyview-logo.svg"
            alt="Tallyview"
            width={220}
            height={62}
            className="h-12 w-auto brightness-0 invert mx-auto mb-6"
            priority
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Lock className="h-3.5 w-3.5 text-brand-gold" />
            <span className="text-xs text-gray-400 font-medium">Protected Access</span>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Enter password to continue
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            This site is password protected.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4.5 w-4.5" />
              ) : (
                <Eye className="h-4.5 w-4.5" />
              )}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!password.trim() || submitting}
            className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:ring-offset-2 focus:ring-offset-brand-navy"
          >
            {submitting ? 'Verifying...' : 'Continue'}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="mt-12 flex flex-col items-center gap-2 text-xs text-gray-600">
        <Link
          href="/case-files"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-gold hover:text-brand-gold-light"
        >
          <FileText className="h-3.5 w-3.5" />
          Tallyview Case Files
        </Link>
        <p>Tallyview &copy; 2026</p>
      </div>
    </div>
  );
}
