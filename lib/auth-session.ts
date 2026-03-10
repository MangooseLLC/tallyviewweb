import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const AUTH_EMAIL_COOKIE = 'tallyview_email';

export async function getSessionEmail() {
  const cookieStore = await cookies();
  const email = cookieStore.get(AUTH_EMAIL_COOKIE)?.value?.trim().toLowerCase() ?? '';
  return email || null;
}

export function setSessionEmailCookie(response: NextResponse, email: string) {
  response.cookies.set(AUTH_EMAIL_COOKIE, email.trim().toLowerCase(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearSessionEmailCookie(response: NextResponse) {
  response.cookies.delete(AUTH_EMAIL_COOKIE);
}
