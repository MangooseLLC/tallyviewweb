'use client';

import { FormEvent, useState } from 'react';
import { cn } from '@/lib/utils';

export const WAITLIST_ROLES = [
  { value: '', label: 'I am a...' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'regulator', label: 'Regulator' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'validator_partner', label: 'Validator Partner' },
] as const;

type WaitlistFormProps = {
  className?: string;
  buttonLabel?: string;
  placeholder?: string;
  showRoleSelector?: boolean;
};

export default function WaitlistForm({
  className,
  buttonLabel = 'Join waitlist',
  placeholder = 'Enter your email',
  showRoleSelector = false,
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const body: { email: string; role?: string } = { email };
      if (showRoleSelector && role) body.role = role;

      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatus('error');
        setMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setMessage('You are on the list. We will be in touch.');
      setEmail('');
      if (showRoleSelector) setRole('');
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const inputClasses =
    'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-400 shadow-sm transition focus:border-brand-gold/50 focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:ring-offset-2 focus:ring-offset-brand-navy';

  return (
    <form onSubmit={handleSubmit} className={cn('w-full', className)}>
      <div className="flex flex-col gap-3">
        {showRoleSelector && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={cn(inputClasses, 'cursor-pointer appearance-none')}
            aria-label="Your role"
          >
            {WAITLIST_ROLES.map(({ value, label }) => (
              <option key={value || 'default'} value={value} className="bg-brand-navy text-white">
                {label}
              </option>
            ))}
          </select>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={placeholder}
            className={inputClasses}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center rounded-xl bg-brand-gold px-5 py-3 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === 'loading' ? 'Submitting...' : buttonLabel}
          </button>
        </div>
      </div>
      {message && (
        <p
          className={cn(
            'mt-3 text-sm',
            status === 'success' ? 'text-emerald-300' : 'text-red-300'
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}
