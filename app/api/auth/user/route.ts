import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionEmail } from '@/lib/auth-session';

export async function GET() {
  try {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: { org: true },
        },
      },
    });

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Auth user error:', err);
    return NextResponse.json({ user: null });
  }
}
