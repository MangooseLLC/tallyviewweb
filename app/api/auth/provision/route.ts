import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { provisionUserFromSupabase } from '@/lib/auth/provision-user';

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

    const result = await provisionUserFromSupabase({
      id: supabaseUser.id,
      email: supabaseUser.email,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Provision error:', err);
    return NextResponse.json({ error: 'Failed to provision user' }, { status: 500 });
  }
}
