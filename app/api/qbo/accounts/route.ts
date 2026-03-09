import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const org = await prisma.organization.findFirst({
      where: { qboRealmId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!org) {
      return NextResponse.json({ accounts: [], grouped: {} });
    }

    const accounts = await prisma.account.findMany({
      where: { orgId: org.id },
      orderBy: [{ accountType: 'asc' }, { name: 'asc' }],
    });

    const grouped: Record<string, typeof accounts> = {};
    for (const account of accounts) {
      const key = account.classification || account.accountType || 'Other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(account);
    }

    return NextResponse.json({ accounts, grouped });
  } catch (error) {
    console.error('Accounts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
