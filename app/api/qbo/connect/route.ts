import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/qbo-auth';
import crypto from 'crypto';

export async function GET() {
  try {
    const state = crypto.randomBytes(16).toString('hex');

    const url = getAuthorizationUrl(state);

    const response = NextResponse.json({ url, state });

    // Store state in a cookie for CSRF validation on callback
    response.cookies.set('qbo_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
