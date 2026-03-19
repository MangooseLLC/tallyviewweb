import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionUserFromSupabase } from '@/lib/auth/provision-user';

function getSafeNextPath(candidate: string | null, fallback: string): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  return candidate;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const flow = requestUrl.searchParams.get('flow');
  const next = getSafeNextPath(requestUrl.searchParams.get('next'), '/dashboard');

  if (!code) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('OTP callback exchange failed:', exchangeError);
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const result = await provisionUserFromSupabase({
      id: user.id,
      email: user.email,
    });

    const destination = flow === 'signup' && result.isNew
      ? '/onboarding'
      : next;

    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    console.error('OTP callback failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
