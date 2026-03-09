import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/qbo-auth';
import { QBOClient } from '@/lib/qbo-client';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      console.error('OAuth error from Intuit:', errorParam);
      return NextResponse.redirect(
        new URL('/qbo-dashboard?error=oauth_denied', request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/qbo-dashboard?error=missing_params', request.url)
      );
    }

    // Validate state for CSRF protection
    const storedState = request.cookies.get('qbo_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch:', { storedState, state });
      return NextResponse.redirect(
        new URL('/qbo-dashboard?error=state_mismatch', request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    // Fetch company name from QBO
    const client = new QBOClient(tokens.access_token, realmId);
    let companyName = 'QuickBooks Company';
    try {
      const info = await client.getCompanyInfo();
      companyName = info?.CompanyInfo?.CompanyName || companyName;
    } catch {
      // fall through with default name
    }

    // Upsert organization record
    await prisma.organization.upsert({
      where: { qboRealmId: realmId },
      create: {
        name: companyName,
        qboRealmId: realmId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        name: companyName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    const response = NextResponse.redirect(
      new URL('/qbo-dashboard?connected=true', request.url)
    );

    // Clear the state cookie
    response.cookies.delete('qbo_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/qbo-dashboard?error=callback_failed&details=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        request.url
      )
    );
  }
}
