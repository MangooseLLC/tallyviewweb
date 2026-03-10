import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserOrg } from '@/lib/get-user-org';
import { QBOClient } from '@/lib/qbo-client';

export async function GET() {
  try {
    const { org, error } = await getUserOrg();

    if (!org || !org.qboRealmId) {
      return NextResponse.json({
        connected: false,
        hasEnvTokens: !!(process.env.QBO_ACCESS_TOKEN && process.env.QBO_REALM_ID),
        ...(error ? { message: error } : {}),
      });
    }

    const [transactionCount, accountCount, classifiedCount] = await Promise.all([
      prisma.transaction.count({ where: { orgId: org.id } }),
      prisma.account.count({ where: { orgId: org.id } }),
      prisma.transaction.count({ where: { orgId: org.id, irs990Category: { not: null } } }),
    ]);

    let tokenExpired =
      !!org.tokenExpiresAt && new Date() >= new Date(org.tokenExpiresAt);

    let qboCompanyName: string | null = null;

    // Live-check the token by calling QBO, even if our DB says it's valid
    if (!tokenExpired && org.accessToken) {
      try {
        const client = new QBOClient(org.accessToken, org.qboRealmId);
        const info = await client.getCompanyInfo();
        qboCompanyName =
          (info as { CompanyInfo?: { CompanyName?: string } })?.CompanyInfo
            ?.CompanyName || null;
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401')) {
          tokenExpired = true;
        }
      }
    }

    return NextResponse.json({
      connected: true,
      tokenExpired,
      orgId: org.id,
      orgName: org.name,
      qboCompanyName,
      realmId: org.qboRealmId,
      lastSyncedAt: org.lastSyncedAt,
      transactionCount,
      accountCount,
      classifiedCount,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
