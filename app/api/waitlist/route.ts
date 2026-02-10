import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { ALLOWED_WAITLIST_ROLES } from '@/lib/utils/constants';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0]?.trim() : null;
  return ip ?? request.headers.get('x-real-ip') ?? 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) return false;
  if (now >= entry.resetAt) {
    rateLimitMap.delete(ip);
    return false;
  }
  return entry.count >= RATE_LIMIT_MAX_REQUESTS;
}

function recordRequest(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again in a minute.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const email = (body as Record<string, unknown>).email;
  const role = typeof (body as Record<string, unknown>).role === 'string'
    ? (body as Record<string, unknown>).role as string
    : undefined;
  const roleTrimmed = role?.trim();

  if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Please provide a valid email address.' },
      { status: 400 }
    );
  }

  if (roleTrimmed && !ALLOWED_WAITLIST_ROLES.includes(roleTrimmed)) {
    return NextResponse.json(
      { success: false, error: 'Invalid role.' },
      { status: 400 }
    );
  }

  if (!process.env.POSTGRES_URL) {
    console.error('Waitlist submission failed: Missing POSTGRES_URL environment variable.');
    return NextResponse.json(
      { success: false, error: 'Waitlist is not yet configured. Please try again later.' },
      { status: 503 }
    );
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    await sql`
      INSERT INTO waitlist (email, role)
      VALUES (${normalizedEmail}, ${roleTrimmed ?? null})
      ON CONFLICT (email)
      DO UPDATE SET role = COALESCE(EXCLUDED.role, waitlist.role)
    `;

    recordRequest(ip);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { success: false, error: 'Unable to join the waitlist.' },
      { status: 500 }
    );
  }
}
