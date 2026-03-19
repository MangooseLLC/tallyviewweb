'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/case-files', label: 'Case Files' },
  { href: '/transparency', label: 'Transparency Scores' },
  { href: '/demo', label: 'Demo' },
];

interface PublicNavProps {
  variant?: 'light' | 'dark';
}

export function PublicNav({ variant = 'light' }: PublicNavProps) {
  const pathname = usePathname();
  const isDark = variant === 'dark';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className={cn(
      'relative px-6 py-4',
      isDark ? 'border-b border-white/10' : 'border-b border-slate-200',
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/tallyview-logo.svg"
              alt="Tallyview"
              width={160}
              height={44}
              className={cn('h-7 w-auto', isDark && 'brightness-0 invert')}
              priority
            />
          </Link>
          <div className="hidden items-center gap-5 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'text-sm font-medium transition',
                  pathname?.startsWith(link.href)
                    ? isDark ? 'text-brand-gold' : 'text-brand-navy'
                    : isDark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className={cn(
              'text-sm font-medium transition',
              isDark ? 'text-slate-300 hover:text-white' : 'text-slate-500 hover:text-slate-900',
            )}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition',
              isDark
                ? 'border border-white/20 bg-white/10 text-white hover:border-brand-gold/60 hover:text-brand-gold'
                : 'bg-brand-navy text-white hover:bg-brand-navy-light',
            )}
          >
            Sign Up
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={cn('md:hidden p-1', isDark ? 'text-white' : 'text-slate-700')}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className={cn(
          'absolute left-0 right-0 top-full z-50 flex flex-col gap-1 px-6 py-4 md:hidden',
          isDark ? 'border-b border-white/10 bg-brand-navy' : 'border-b border-slate-200 bg-white shadow-lg',
        )}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'rounded-lg px-3 py-2.5 text-sm font-medium transition',
                pathname?.startsWith(link.href)
                  ? isDark ? 'bg-white/10 text-brand-gold' : 'bg-slate-50 text-brand-navy'
                  : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50',
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2 border-t border-current/10 pt-3">
            <Link href="/login" onClick={() => setMobileOpen(false)} className={cn('px-3 py-2 text-sm font-medium', isDark ? 'text-slate-300' : 'text-slate-600')}>
              Sign In
            </Link>
            <Link
              href="/signup"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-semibold',
                isDark ? 'bg-brand-gold text-brand-navy' : 'bg-brand-navy text-white',
              )}
            >
              Sign Up <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
