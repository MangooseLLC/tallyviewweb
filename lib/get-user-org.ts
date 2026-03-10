import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

interface OrgResult {
  org: {
    id: string;
    name: string;
    qboRealmId: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    lastSyncedAt: Date | null;
    chainAddress: string | null;
  } | null;
  error?: string;
}

/**
 * Resolves the authenticated user's organization.
 * Falls back to findFirst for unauthenticated/demo mode.
 */
export async function getUserOrg(): Promise<OrgResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();

    if (supabaseUser) {
      const user = await prisma.user.findUnique({
        where: { supabaseId: supabaseUser.id },
        include: {
          memberships: {
            include: { org: true },
            take: 1,
          },
        },
      });

      if (!user) {
        return { org: null, error: 'User not found in database' };
      }

      if (user.memberships.length === 0) {
        return { org: null, error: 'No organization linked to your account' };
      }

      return { org: user.memberships[0].org };
    }

    // Unauthenticated fallback — only select non-sensitive fields
    const org = await prisma.organization.findFirst({
      where: { qboRealmId: { not: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        qboRealmId: true,
        lastSyncedAt: true,
        chainAddress: true,
      },
    });

    return {
      org: org
        ? { ...org, accessToken: null, refreshToken: null, tokenExpiresAt: null }
        : null,
    };
  } catch (error) {
    console.error('getUserOrg error:', error);
    return { org: null, error: 'Failed to resolve organization' };
  }
}
