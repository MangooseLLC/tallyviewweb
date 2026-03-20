/**
 * Delete specific users from Supabase Auth and Prisma (by email).
 *
 * Prisma: deletes `User` rows; `OrgMembership` cascades automatically.
 * Invitations with `invitedById` set to that user become `invitedById: null`.
 *
 * Env (e.g. via --env-file=.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   DATABASE_URL (and DIRECT_URL if your Prisma setup needs it — same as app)
 *
 * Usage:
 *   node --env-file=.env.local scripts/delete-users-by-email.mjs --yes
 *
 * Or override emails:
 *   node --env-file=.env.local scripts/delete-users-by-email.mjs --yes a@b.com c@d.com
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const DEFAULT_EMAILS = [
  'kdw@khoridale.com',
  'k@mangoose.co',
  'k@mangoose.xyz',
];

function parseArgs(argv) {
  const raw = argv.slice(2);
  const isConfirmed = raw.includes('--yes');
  const emails = raw.filter((a) => a !== '--yes');
  return {
    isConfirmed,
    emails: emails.length > 0 ? emails : DEFAULT_EMAILS,
  };
}

function exitWithError(message) {
  console.error(message);
  process.exit(1);
}

async function findAuthUserIdByEmail(supabase, targetEmail) {
  const normalized = targetEmail.toLowerCase().trim();
  const perPage = 200;
  let page = 1;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers: ${error.message}`);
    }
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? '').toLowerCase().trim() === normalized);
    if (found) {
      return found.id;
    }
    if (users.length < perPage) {
      return null;
    }
    page += 1;
  }
}

async function main() {
  const { isConfirmed, emails } = parseArgs(process.argv);

  if (!isConfirmed) {
    exitWithError(
      'Refusing to run without --yes.\n' +
        '  node --env-file=.env.local scripts/delete-users-by-email.mjs --yes',
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    exitWithError('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  }

  if (!process.env.DATABASE_URL) {
    exitWithError('Missing DATABASE_URL (needed for Prisma).');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const prisma = new PrismaClient();

  try {
    for (const email of emails) {
      const trimmed = email.trim();
      console.log(`\n--- ${trimmed} ---`);

      const authId = await findAuthUserIdByEmail(supabase, trimmed);
      if (authId) {
        const { error } = await supabase.auth.admin.deleteUser(authId);
        if (error) {
          exitWithError(`Supabase deleteUser failed for ${trimmed}: ${error.message}`);
        }
        console.log(`Supabase Auth: deleted (${authId})`);
      } else {
        console.log('Supabase Auth: no user with this email');
      }

      const deleted = await prisma.user.deleteMany({
        where: {
          email: { equals: trimmed, mode: 'insensitive' },
        },
      });
      if (deleted.count > 0) {
        console.log(`Prisma: deleted ${deleted.count} User row(s)`);
      } else {
        console.log('Prisma: no User with this email');
      }
    }

    console.log('\nDone.');
    console.log(
      'Note: Organizations with zero members may still exist; delete those in the DB or dashboard if you want a full org cleanup.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
