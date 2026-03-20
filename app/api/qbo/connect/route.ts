import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/qbo-auth';
import { getQboOAuthStateCookieOptions } from '@/lib/qbo-oauth-cookie';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const state = crypto.randomBytes(16).toString('hex');

    const url = getAuthorizationUrl(state);

    const response = NextResponse.json({ url, state });

    // Store state in a cookie for CSRF validation on callback
    response.cookies.set(
      'qbo_oauth_state',
      state,
      getQboOAuthStateCookieOptions(request.headers.get('host')),
    );

    return response;
  } catch (error) {
    console.error('Connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
