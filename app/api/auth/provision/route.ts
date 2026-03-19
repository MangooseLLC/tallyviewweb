import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/provision
 * Called after Supabase signup to create the Prisma User + Organization + Membership.
 * Derives supabaseId and email from the authenticated Supabase session (never from the body).
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser || !supabaseUser.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabaseId = supabaseUser.id;
    const email = supabaseUser.email.trim().toLowerCase();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { OR: [{ supabaseId }, { email }] },
        include: { memberships: { include: { org: true } } },
      });

      if (existing) {
        if (existing.supabaseId !== supabaseId) {
          await tx.user.update({
            where: { id: existing.id },
            data: { supabaseId },
          });
        }
        return { user: existing, isNew: false };
      }

      const newUser = await tx.user.create({
        data: { supabaseId, email, name: null, avatarUrl: null },
      });

      const org = await tx.organization.create({
        data: { name: `${email.split('@')[0]}'s Organization` },
      });

      await tx.orgMembership.create({
        data: { userId: newUser.id, orgId: org.id, role: 'OWNER' },
      });

      const user = await tx.user.findUnique({
        where: { id: newUser.id },
        include: { memberships: { include: { org: true } } },
      });

      return { user, isNew: true };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Provision error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
}
