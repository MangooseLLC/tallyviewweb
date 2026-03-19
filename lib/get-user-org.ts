import { prisma } from '@/lib/prisma';
import { getSessionEmail } from '@/lib/auth-session';

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
 * Resolves the current session user's organization.
 * Returns null if not authenticated — no unauthenticated fallback.
 */
export async function getUserOrg(): Promise<OrgResult> {
  try {
    const email = await getSessionEmail();

    if (!email) {
      return { org: null, error: 'Not authenticated' };
    }

    const user = await prisma.user.findUnique({
      where: { email },
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
  } catch (error) {
    console.error('getUserOrg error:', error);
    return { org: null, error: 'Failed to resolve organization' };
  }
}
