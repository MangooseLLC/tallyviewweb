import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '25')));
    const sortBy = searchParams.get('sortBy') || 'txnDate';
    const rawSortOrder = searchParams.get('sortOrder') || 'desc';
    const sortOrder: 'asc' | 'desc' = rawSortOrder === 'asc' ? 'asc' : 'desc';
    const search = searchParams.get('search') || '';
    const sourceType = searchParams.get('sourceType') || '';

    const org = await prisma.organization.findFirst({
      where: { qboRealmId: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (!org) {
      return NextResponse.json({ transactions: [], total: 0, page, pageSize });
    }

    const where: Record<string, unknown> = { orgId: org.id };

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { accountName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (sourceType) {
      where.sourceType = sourceType;
    }

    const orderBy: Record<string, string> = {};
    const allowedSortFields = ['txnDate', 'amount', 'sourceType', 'description'];
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.txnDate = 'desc';
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      transactions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
