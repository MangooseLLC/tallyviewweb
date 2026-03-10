import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
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
