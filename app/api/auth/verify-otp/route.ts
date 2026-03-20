import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionUserFromSupabase } from '@/lib/auth/provision-user';

interface VerifyOtpRequest {
  email?: string;
  token?: string;
  flow?: 'login' | 'signup';
  next?: string;
}

function getSafeNextPath(candidate: string | undefined, fallback: string): string {
  if (!candidate || !candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//')) return fallback;
  return candidate;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as VerifyOtpRequest;
    const email = body.email?.trim().toLowerCase();
    const token = body.token?.trim();
    const flow = body.flow === 'login' ? 'login' : 'signup';
    const next = getSafeNextPath(body.next, '/dashboard');

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Missing email or verification code.' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) {
      console.error('Verify OTP failed:', verifyError);
      return NextResponse.json(
        { error: verifyError.message, stage: 'verify_otp' },
        { status: 401 },
      );
    }

    const user = data.user;
    if (!user?.email) {
      console.error('Verify OTP returned no user for email:', email);
      return NextResponse.json(
        { error: 'Sign-in succeeded but no user session was returned.', stage: 'session' },
        { status: 502 },
      );
    }

    const provisionResult = await provisionUserFromSupabase({
      id: user.id,
      email: user.email,
    });

    const redirectPath = flow === 'signup'
      ? (provisionResult.isNew ? '/onboarding' : '/dashboard')
      : next;

    return NextResponse.json({
      success: true,
      redirectPath,
      isNew: provisionResult.isNew,
    });
  } catch (error) {
    console.error('Verify OTP route error:', error);

    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to complete sign-in.', details, stage: 'server' },
      { status: 500 },
    );
  }
}
