import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/qbo-auth';
import { QBOClient } from '@/lib/qbo-client';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const errorParam = searchParams.get('error');

    // Determine redirect base: authenticated users go to /onboarding, others to /qbo-dashboard
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    const redirectBase = supabaseUser ? '/onboarding' : '/qbo-dashboard';

    if (errorParam) {
      console.error('OAuth error from Intuit:', errorParam);
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=oauth_denied`, request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=missing_params`, request.url)
      );
    }

    const storedState = request.cookies.get('qbo_oauth_state')?.value;
    if (!storedState || storedState !== state) {
      console.error('OAuth state mismatch:', { storedState, state });
      return NextResponse.redirect(
        new URL(`${redirectBase}?error=state_mismatch`, request.url)
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

    // If authenticated user, link QBO to their existing org
    if (supabaseUser) {
      const user = await prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
        include: { memberships: { where: { role: 'OWNER' }, take: 1 } },
      });

      if (user && user.memberships.length > 0) {
        await prisma.organization.update({
          where: { id: user.memberships[0].orgId },
          data: {
            qboRealmId: realmId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });
      }
    } else {
      // Unauthenticated flow: upsert by realmId (existing behavior)
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
    }

    const response = NextResponse.redirect(
      new URL(`${redirectBase}?connected=true`, request.url)
    );

    response.cookies.delete('qbo_oauth_state');

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const redirectBase = user ? '/onboarding' : '/qbo-dashboard';
    return NextResponse.redirect(
      new URL(
        `${redirectBase}?error=callback_failed&details=${encodeURIComponent(
          error instanceof Error ? error.message : 'Unknown error'
        )}`,
        request.url
      )
    );
  }
}
