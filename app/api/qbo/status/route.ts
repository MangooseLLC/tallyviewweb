import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst();

    if (!org) {
      return NextResponse.json({
        connected: false,
        hasEnvTokens: !!(process.env.QBO_ACCESS_TOKEN && process.env.QBO_REALM_ID),
      });
    }

    const transactionCount = await prisma.transaction.count({
      where: { orgId: org.id },
    });
    const accountCount = await prisma.account.count({
      where: { orgId: org.id },
    });

    return NextResponse.json({
      connected: true,
      orgId: org.id,
      orgName: org.name,
      realmId: org.qboRealmId,
      lastSyncedAt: org.lastSyncedAt,
      transactionCount,
      accountCount,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}
