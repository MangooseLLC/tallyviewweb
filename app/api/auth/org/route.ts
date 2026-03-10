import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionEmail } from '@/lib/auth-session';

export async function PATCH(request: NextRequest) {
  try {
    const email = await getSessionEmail();
    if (!email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { memberships: { where: { role: 'OWNER' }, take: 1 } },
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const org = await prisma.organization.update({
      where: { id: user.memberships[0].orgId },
      data: { name: name.trim() },
    });

    return NextResponse.json({ org });
  } catch (err) {
    console.error('Org update error:', err);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
