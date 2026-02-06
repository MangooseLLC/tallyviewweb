import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const sitePassword = process.env.SITE_PASSWORD;

    // If no password is configured, allow access
    if (!sitePassword) {
      return NextResponse.json({ success: true });
    }

    if (password === sitePassword) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Incorrect password.' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request.' }, { status: 400 });
  }
}
