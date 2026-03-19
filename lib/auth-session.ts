import { createClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';

async function getSessionUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getSessionEmail(): Promise<string | null> {
  return (await getSessionUser())?.email?.trim().toLowerCase() ?? null;
}

export async function getSessionUserId(): Promise<string | null> {
  return (await getSessionUser())?.id ?? null;
}
