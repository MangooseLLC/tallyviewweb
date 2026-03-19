import { prisma } from '@/lib/prisma';

interface ProvisionableSupabaseUser {
  id: string;
  email: string;
}

export interface ProvisionUserResult {
  user: {
    id: string;
    supabaseId: string | null;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    memberships: {
      id: string;
      role: string;
      org: {
        id: string;
        name: string;
      };
    }[];
  } | null;
  isNew: boolean;
}

export async function provisionUserFromSupabase(
  supabaseUser: ProvisionableSupabaseUser
): Promise<ProvisionUserResult> {
  const supabaseId = supabaseUser.id;
  const email = supabaseUser.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
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
}
