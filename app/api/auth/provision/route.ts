import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const existing = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
      include: {
        memberships: {
          include: { org: true },
        },
      },
    });

    if (existing) {
      return NextResponse.json({ user: existing });
    }

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          supabaseId: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        },
      });

      const org = await tx.organization.create({
        data: {
          name: `${supabaseUser.email!.split('@')[0]}'s Organization`,
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

    return NextResponse.json({ user });
  } catch (err) {
    console.error('Provision error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
}
