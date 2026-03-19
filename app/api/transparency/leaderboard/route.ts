import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/transparency/leaderboard?limit=25&state=CA
 * Returns top-scoring organizations from the cached TransparencyScore table.
 */
export async function GET(request: NextRequest) {
  const rawLimit = parseInt(request.nextUrl.searchParams.get('limit') || '25', 10);
  const limit = Math.min(100, Number.isNaN(rawLimit) ? 25 : Math.max(1, rawLimit));
  const rawState = request.nextUrl.searchParams.get('state');
  const state = rawState && /^[A-Z]{2}$/i.test(rawState) ? rawState.toUpperCase() : undefined;

  try {
    const scores = await prisma.transparencyScore.findMany({
      where: state ? { state } : undefined,
      orderBy: { overallScore: 'desc' },
      take: limit,
      select: {
        ein: true,
        name: true,
        state: true,
        overallScore: true,
        financialHealth: true,
        governanceScore: true,
        transparencyScore: true,
        complianceScore: true,
        programExpenseRatio: true,
        revenueTotal: true,
        filingYear: true,
        dataVintage: true,
      },
    });

    return NextResponse.json({ scores, total: scores.length });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ scores: [], total: 0 }, { status: 500 });
  }
}
