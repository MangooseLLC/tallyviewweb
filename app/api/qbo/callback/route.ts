import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/qbo-auth';
import { QBOClient } from '@/lib/qbo-client';
import { prisma } from '@/lib/prisma';
import { getSessionEmail } from '@/lib/auth-session';
import { encrypt } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const errorParam = searchParams.get('error');

    const sessionEmail = await getSessionEmail();
    if (!sessionEmail) {
      return NextResponse.redirect(
        new URL('/login?redirect=/quickbooks&error=auth_required', request.url)
      );
    }

    if (errorParam) {
      console.error('OAuth error from Intuit:', errorParam);
      return NextResponse.redirect(
        new URL('/onboarding?error=oauth_denied', request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/onboarding?error=missing_params', request.url)
      );
    }

    const storedState = request.cookies.get('qbo_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch:', { storedState, state });
      return NextResponse.redirect(
        new URL('/onboarding?error=state_mismatch', request.url)
      );
    }

    const tokens = await exchangeCodeForTokens(code);

    const client = new QBOClient(tokens.access_token, realmId);
    let companyName = 'QuickBooks Company';
    try {
      const info = await client.getCompanyInfo();
      companyName = info?.CompanyInfo?.CompanyName || companyName;
    } catch {
      // fall through with default name
    }

    const user = await prisma.user.findUnique({
      where: { email: sessionEmail },
      include: { memberships: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (user && user.memberships.length > 0) {
      const encryptedAccess = process.env.TOKEN_ENCRYPTION_KEY ? encrypt(tokens.access_token) : tokens.access_token;
      const encryptedRefresh = process.env.TOKEN_ENCRYPTION_KEY ? encrypt(tokens.refresh_token) : tokens.refresh_token;

      await prisma.organization.update({
        where: { id: user.memberships[0].orgId },
        data: {
          name: companyName,
          qboRealmId: realmId,
          accessToken: encryptedAccess,
          refreshToken: encryptedRefresh,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
    }

    const response = NextResponse.redirect(
      new URL('/onboarding?connected=true', request.url)
    );

    response.cookies.delete('qbo_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/onboarding?error=callback_failed', request.url)
    );
  }
}
