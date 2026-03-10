import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { setSessionEmailCookie } from '@/lib/auth-session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const syntheticSupabaseId = `email:${email}`;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseId: syntheticSupabaseId },
          { email },
        ],
      },
      include: {
        memberships: {
          include: { org: true },
        },
      },
    });

    if (existing) {
      if (existing.supabaseId !== syntheticSupabaseId) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { supabaseId: syntheticSupabaseId },
        });
      }
      const response = NextResponse.json({ user: existing, isNew: false });
      setSessionEmailCookie(response, email);
      return response;
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          supabaseId: syntheticSupabaseId,
          email,
          name: null,
          avatarUrl: null,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${email.split('@')[0]}'s Organization`,
        },
      });

      await tx.orgMembership.create({
        data: {
          userId: newUser.id,
          orgId: org.id,
          role: 'OWNER',
        },
      });

      return tx.user.findUnique({
        where: { id: newUser.id },
        include: {
          memberships: {
            include: { org: true },
          },
        },
      });
    });

    const response = NextResponse.json({ user, isNew: true });
    setSessionEmailCookie(response, email);
    return response;
  } catch (err) {
    console.error('Provision error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
}
