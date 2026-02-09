import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_ROLES = ['nonprofit', 'foundation', 'regulator', 'investigator', 'validator_partner'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email;
    const role = typeof body?.role === 'string' ? body.role.trim() : undefined;

    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role.' },
        { status: 400 }
      );
    }

    // Check if Supabase is configured before attempting to connect
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Waitlist submission failed: Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
      return NextResponse.json(
        { success: false, error: 'Waitlist is not yet configured. Please try again later.' },
        { status: 503 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const row: { email: string; role?: string } = { email: email.toLowerCase().trim() };
    if (role) row.role = role;
    const { error } = await supabaseAdmin
      .from('waitlist')
      .upsert(row, { onConflict: 'email' });

    if (error) {
      console.error('Supabase waitlist upsert error:', error.message);
      return NextResponse.json(
        { success: false, error: 'Unable to join the waitlist.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Waitlist API error:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }
}
