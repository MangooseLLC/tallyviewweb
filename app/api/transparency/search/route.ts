import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * GET /api/transparency/search?q=keyword
 * Proxies to ProPublica nonprofit search for typeahead.
 */
export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = checkRateLimit(`transparency-search:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ organizations: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const ppRes = await fetch(
      `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(q)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!ppRes.ok) {
      return NextResponse.json({ organizations: [] });
    }

    const data = await ppRes.json();
    const orgs = (data.organizations || []).slice(0, 20).map((org: Record<string, unknown>) => ({
      ein: org.ein,
      name: org.name,
      state: org.state,
      city: org.city,
      nteeCode: org.ntee_code,
    }));

    return NextResponse.json({ organizations: orgs });
  } catch (err) {
    console.error('ProPublica search proxy error:', err);
    return NextResponse.json({ organizations: [] });
  }
}
