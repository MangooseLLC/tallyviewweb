import type { NextResponse } from 'next/server';

const STATE_MAX_AGE_SEC = 600;

/**
 * OAuth state cookie must be sent back on Intuit's redirect to /api/qbo/callback.
 * Host-only cookies break when users start on apex and the redirect URI is www (or vice versa).
 * For production tallyview.com, use a shared parent domain.
 */
export function getQboOAuthStateCookieOptions(hostHeader: string | null): {
  domain?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  maxAge: number;
  path: string;
} {
  const host = (hostHeader ?? '').split(':')[0].toLowerCase();
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: STATE_MAX_AGE_SEC,
    path: '/',
  };
  if (host === 'tallyview.com' || host === 'www.tallyview.com') {
    return { ...base, domain: '.tallyview.com' };
  }
  return base;
}

export function clearQboOAuthStateCookie(
  response: NextResponse,
  hostHeader: string | null,
): void {
  const host = (hostHeader ?? '').split(':')[0].toLowerCase();
  const base = {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  if (host === 'tallyview.com' || host === 'www.tallyview.com') {
    response.cookies.set('qbo_oauth_state', '', { ...base, domain: '.tallyview.com' });
    return;
  }
  response.cookies.delete('qbo_oauth_state');
}
