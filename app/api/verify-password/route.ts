import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const sitePassword = process.env.SITE_PASSWORD;

    if (!sitePassword) {
      return NextResponse.json({ success: true });
    }

    if (typeof password === 'string' && constantTimeEquals(password, sitePassword)) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
}
