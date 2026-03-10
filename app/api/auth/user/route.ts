import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();

    if (error || !supabaseUser) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: supabaseUser.id },
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
