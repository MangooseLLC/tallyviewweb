/**
 * Deletes every user in Supabase Auth for this project.
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (never commit; server-only)
 *
 * Run from repo root:
 *   node --env-file=.env.local scripts/delete-all-supabase-auth-users.mjs --yes
 *
 * Or: npm run supabase:delete-all-users -- --yes
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isConfirmed = process.argv.includes('--yes');

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

if (!isConfirmed) {
  exitWithError(
    'Refusing to run without --yes (destructive). Example:\n' +
      '  node --env-file=.env.local scripts/delete-all-supabase-auth-users.mjs --yes',
  );
}

if (!supabaseUrl || !serviceRoleKey) {
  exitWithError(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'Load them via --env-file=.env.local or export them in your shell.',
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const perPage = 1000;
let page = 1;
let totalDeleted = 0;

for (;;) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });

  if (error) {
    exitWithError(`listUsers failed: ${error.message}`);
  }

  const users = data?.users ?? [];
  if (users.length === 0) {
    break;
  }

  for (const user of users) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      exitWithError(`deleteUser(${user.id}) failed: ${deleteError.message}`);
    }
    console.log(`Deleted auth user: ${user.id} (${user.email ?? 'no email'})`);
    totalDeleted += 1;
  }

  if (users.length < perPage) {
    break;
  }
  page += 1;
}

console.log(`Done. Deleted ${totalDeleted} Supabase Auth user(s).`);
console.log(
  'Note: Rows in your app database (Prisma User, etc.) are separate — remove those if you want a full reset.',
);
