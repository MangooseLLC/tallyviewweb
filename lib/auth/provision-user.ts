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

  const existing = await prisma.user.findFirst({
    where: { OR: [{ supabaseId }, { email }] },
    include: { memberships: { include: { org: true } } },
  });

  if (existing) {
    if (existing.supabaseId !== supabaseId) {
      const updatedUser = await prisma.user.update({
        where: { id: existing.id },
        data: { supabaseId },
        include: { memberships: { include: { org: true } } },
      });
      return { user: updatedUser, isNew: false };
    }

    return { user: existing, isNew: false };
  }

  const newUser = await prisma.user.create({
    data: { supabaseId, email, name: null, avatarUrl: null },
  });

  const org = await prisma.organization.create({
    data: { name: `${email.split('@')[0]}'s Organization` },
  });

  await prisma.orgMembership.create({
    data: { userId: newUser.id, orgId: org.id, role: 'OWNER' },
  });

  const user = await prisma.user.findUnique({
    where: { id: newUser.id },
    include: { memberships: { include: { org: true } } },
  });

  return { user, isNew: true };
}
