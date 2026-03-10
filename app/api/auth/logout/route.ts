import { NextResponse } from 'next/server';
import { clearSessionEmailCookie } from '@/lib/auth-session';

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearSessionEmailCookie(response);
  return response;
}
