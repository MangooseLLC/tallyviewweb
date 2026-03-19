import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeTransparencyScore, type ScoringInput } from '@/lib/transparency/scoring';
import { checkRateLimit } from '@/lib/rate-limit';

const CACHE_HOURS = 24;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function GET(
  request: NextRequest,
  { params }: { params: { ein: string } },
) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`transparency-ein:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  const ein = params.ein.replace(/-/g, '').trim();
  if (!/^\d{9}$/.test(ein)) {
    return NextResponse.json({ error: 'Invalid EIN format' }, { status: 400 });
  }

  try {
    const cached = await prisma.transparencyScore.findUnique({ where: { ein } });
    if (cached) {
      const age = Date.now() - cached.computedAt.getTime();
      if (age < CACHE_HOURS * 60 * 60 * 1000) {
        const { rawData: _raw, ...publicScore } = cached;
        return NextResponse.json({ score: publicScore, source: 'cache' });
      }
    }

    const fetchController = new AbortController();
    const fetchTimeout = setTimeout(() => fetchController.abort(), 10_000);
    const ppRes = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/organizations/${ein}.json`,
      { signal: fetchController.signal },
    );
    clearTimeout(fetchTimeout);
    if (!ppRes.ok) {
      if (cached) {
        const { rawData: _raw, ...publicScore } = cached;
        return NextResponse.json({ score: publicScore, source: 'stale_cache' });
      }
      return NextResponse.json({ error: 'Organization not found in ProPublica database' }, { status: 404 });
    }

    const ppData = await ppRes.json();
    const org = ppData.organization;
    const filing = ppData.filings_with_data?.[0];

    const input: ScoringInput = {
      ein,
      name: org?.name || `EIN ${ein}`,
      state: org?.state,
      nteeCode: org?.ntee_code,
      filingYear: filing?.tax_prd_yr,
      totalRevenue: filing?.totrevenue,
      totalExpenses: filing?.totfuncexpns,
      totalAssets: filing?.totassetsend,
      programExpenses: filing?.totprgmservexp,
      managementExpenses: undefined,
      fundraisingExpenses: undefined,
      netAssets: filing?.totnetassetend,
      has990Filed: !!filing,
    };

    const result = computeTransparencyScore(input);

    const saved = await prisma.transparencyScore.upsert({
      where: { ein },
      create: {
        ein,
        name: input.name,
        state: input.state,
        nteeCode: input.nteeCode,
        overallScore: result.overallScore,
        financialHealth: result.financialHealth,
        governanceScore: result.governanceScore,
        transparencyScore: result.transparencyScore,
        complianceScore: result.complianceScore,
        programExpenseRatio: result.programExpenseRatio,
        revenueTotal: input.totalRevenue,
        assetsTotal: input.totalAssets,
        filingYear: input.filingYear,
        dataVintage: filing ? `FY${filing.tax_prd_yr}` : null,
        rawData: ppData,
      },
      update: {
        name: input.name,
        state: input.state,
        nteeCode: input.nteeCode,
        overallScore: result.overallScore,
        financialHealth: result.financialHealth,
        governanceScore: result.governanceScore,
        transparencyScore: result.transparencyScore,
        complianceScore: result.complianceScore,
        programExpenseRatio: result.programExpenseRatio,
        revenueTotal: input.totalRevenue,
        assetsTotal: input.totalAssets,
        filingYear: input.filingYear,
        dataVintage: filing ? `FY${filing.tax_prd_yr}` : null,
        rawData: ppData,
        computedAt: new Date(),
      },
    });

    const { rawData: _raw, ...publicScore } = saved;
    return NextResponse.json({ score: publicScore, source: 'computed' });
  } catch (err) {
    console.error('Transparency score error:', err);
    return NextResponse.json({ error: 'Failed to compute score' }, { status: 500 });
  }
}
