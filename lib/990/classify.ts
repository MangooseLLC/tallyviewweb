import { prisma } from '@/lib/prisma';
import { isValidCategoryId } from './taxonomy';
import { classifyAccountByRules, buildAccountCategoryMap } from './rules';
import { classifyTransactionsWithAI } from './ai-classify';
import type { TransactionInput } from './ai-classify';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface ClassifyOptions {
  force?: boolean;
}

export interface ClassifySummary {
  accountsMapped: number;
  transactionsMapped: number;
  rulesClassified: number;
  aiClassified: number;
  lowConfidenceCount: number;
  failedBatches: number;
  skippedAlreadyClassified: number;
}

// ---------------------------------------------------------------------------
//  Orchestrator
// ---------------------------------------------------------------------------

export async function classifyOrganization(
  orgId: string,
  options: ClassifyOptions = {}
): Promise<ClassifySummary> {
  const { force = false } = options;

  const summary: ClassifySummary = {
    accountsMapped: 0,
    transactionsMapped: 0,
    rulesClassified: 0,
    aiClassified: 0,
    lowConfidenceCount: 0,
    failedBatches: 0,
    skippedAlreadyClassified: 0,
  };

  // ── Step 1: Classify accounts via rules ──────────────────────────────

  const accountFilter = force
    ? { orgId }
    : { orgId, irs990Category: null };

  const accounts = await prisma.account.findMany({
    where: accountFilter,
    select: { id: true, qboId: true, accountType: true, accountSubType: true, irs990Category: true },
  });

  if (!force) {
    const alreadyClassifiedAccounts = await prisma.account.count({
      where: { orgId, irs990Category: { not: null } },
    });
    summary.skippedAlreadyClassified += alreadyClassifiedAccounts;
  }

  const accountUpdates: Array<{ id: string; irs990Category: string }> = [];

  for (const account of accounts) {
    const category = classifyAccountByRules({
      qboId: account.qboId,
      accountType: account.accountType,
      accountSubType: account.accountSubType,
    });

    if (category && isValidCategoryId(category)) {
      accountUpdates.push({ id: account.id, irs990Category: category });
    }
  }

  if (accountUpdates.length > 0) {
    await prisma.$transaction(
      accountUpdates.map((u) =>
        prisma.account.update({
          where: { id: u.id },
          data: { irs990Category: u.irs990Category },
        })
      )
    );
    summary.accountsMapped = accountUpdates.length;
    summary.rulesClassified += accountUpdates.length;
  }

  // ── Step 2: Build account category lookup ────────────────────────────

  const allAccounts = await prisma.account.findMany({
    where: { orgId },
    select: { qboId: true, irs990Category: true },
  });

  const accountCategoryMap = buildAccountCategoryMap(allAccounts);

  // ── Step 3: Classify transactions ────────────────────────────────────

  const txnFilter = force
    ? { orgId }
    : { orgId, irs990Category: null };

  const transactions = await prisma.transaction.findMany({
    where: txnFilter,
    select: {
      id: true,
      qboId: true,
      sourceType: true,
      description: true,
      amount: true,
      accountId: true,
      accountName: true,
      vendorName: true,
      customerName: true,
      irs990Category: true,
    },
  });

  if (!force) {
    const alreadyClassifiedTxns = await prisma.transaction.count({
      where: { orgId, irs990Category: { not: null } },
    });
    summary.skippedAlreadyClassified += alreadyClassifiedTxns;
  }

  const ruleUpdates: Array<{ id: string; irs990Category: string }> = [];
  const needsAI: Array<{ id: string } & TransactionInput> = [];

  for (const txn of transactions) {
    // Try rule-based: derive from linked account
    if (txn.accountId) {
      const category = accountCategoryMap.get(txn.accountId);
      if (category) {
        ruleUpdates.push({ id: txn.id, irs990Category: category });
        continue;
      }
    }

    needsAI.push({
      id: txn.id,
      qboId: txn.qboId,
      sourceType: txn.sourceType,
      description: txn.description,
      amount: txn.amount,
      vendorName: txn.vendorName,
      customerName: txn.customerName,
      accountName: txn.accountName,
    });
  }

  // Write rule-based transaction classifications
  if (ruleUpdates.length > 0) {
    await prisma.$transaction(
      ruleUpdates.map((u) =>
        prisma.transaction.update({
          where: { id: u.id },
          data: { irs990Category: u.irs990Category },
        })
      )
    );
    summary.transactionsMapped += ruleUpdates.length;
    summary.rulesClassified += ruleUpdates.length;
  }

  // ── Step 4: AI classification for remaining transactions ─────────────

  if (needsAI.length > 0) {
    const aiResult = await classifyTransactionsWithAI(
      needsAI.map(({ id: _id, ...rest }) => rest)
    );

    summary.failedBatches = aiResult.failedBatches;
    summary.lowConfidenceCount = aiResult.lowConfidenceCount;

    // Map AI results back to DB IDs.
    // qboId is NOT unique per org (same entity can be Invoice + JournalEntry),
    // so group by qboId to update ALL matching DB records.
    const qboIdToDbIds = new Map<string, string[]>();
    for (const t of needsAI) {
      const existing = qboIdToDbIds.get(t.qboId);
      if (existing) {
        existing.push(t.id);
      } else {
        qboIdToDbIds.set(t.qboId, [t.id]);
      }
    }

    const aiUpdates: Array<{ id: string; irs990Category: string }> = [];

    for (const r of aiResult.results) {
      if (r.irs990Category && isValidCategoryId(r.irs990Category)) {
        const dbIds = qboIdToDbIds.get(r.qboId);
        if (dbIds) {
          for (const dbId of dbIds) {
            aiUpdates.push({ id: dbId, irs990Category: r.irs990Category });
          }
        }
      }
    }

    if (aiUpdates.length > 0) {
      await prisma.$transaction(
        aiUpdates.map((u) =>
          prisma.transaction.update({
            where: { id: u.id },
            data: { irs990Category: u.irs990Category },
          })
        )
      );
      summary.transactionsMapped += aiUpdates.length;
      summary.aiClassified = aiUpdates.length;
    }
  }

  return summary;
}
