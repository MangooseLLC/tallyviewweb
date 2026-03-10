import { prisma } from '@/lib/prisma';
import type {
  MonthlyFinancialPackage,
  RevenueBySource,
  ExpensesByFunction,
  Transaction as PipelineTxn,
  VendorPayment,
  BalanceSheet,
} from './ingest';

/**
 * Builds a MonthlyFinancialPackage from QBO-synced Prisma data.
 * This bridges the gap between the database schema and the pipeline's
 * Merkle tree hash input format.
 */
export async function buildFinancialPackage(
  orgId: string,
  orgName: string,
  month: string
): Promise<MonthlyFinancialPackage> {
  const [y, m] = month.split('-').map(Number);
  const startDate = new Date(Date.UTC(y, m - 1, 1));
  const endDate = new Date(Date.UTC(y, m, 1));

  const [transactions, accounts] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        orgId,
        txnDate: { gte: startDate, lt: endDate },
      },
      orderBy: { txnDate: 'asc' },
    }),
    prisma.account.findMany({ where: { orgId } }),
  ]);

  // --- Revenue ---
  let programFees = 0;
  for (const txn of transactions) {
    if (txn.sourceType === 'Invoice') programFees += Math.round(txn.amount * 100);
  }
  const revenue: RevenueBySource = {
    grants: 0,
    donations: 0,
    programFees,
    investmentIncome: 0,
    other: 0,
    total: programFees,
  };

  // --- Expenses ---
  let programExp = 0;
  let managementExp = 0;
  let fundraisingExp = 0;
  let totalExp = 0;

  for (const txn of transactions) {
    if (txn.sourceType !== 'Bill' && txn.sourceType !== 'Purchase') continue;
    const amt = Math.round(txn.amount * 100);
    totalExp += amt;

    const cat = (txn.irs990Category || '').toLowerCase();
    if (cat.includes('fundrais')) {
      fundraisingExp += amt;
    } else if (cat.includes('management') || cat.includes('general') || cat.includes('admin')) {
      managementExp += amt;
    } else if (cat) {
      programExp += amt;
    }
  }

  // If no 990 classification, use default ratios
  if (programExp === 0 && managementExp === 0 && fundraisingExp === 0 && totalExp > 0) {
    programExp = Math.round(totalExp * 0.80);
    managementExp = Math.round(totalExp * 0.15);
    fundraisingExp = totalExp - programExp - managementExp;
  }

  const expenses: ExpensesByFunction = {
    program: programExp,
    management: managementExp,
    fundraising: fundraisingExp,
    total: totalExp,
  };

  // --- Transactions ---
  const pipelineTxns: PipelineTxn[] = transactions
    .filter((t) => t.sourceType === 'Bill' || t.sourceType === 'Purchase')
    .map((t) => {
      const cat = (t.irs990Category || '').toLowerCase();
      let category: 'program' | 'management' | 'fundraising' = 'program';
      if (cat.includes('fundrais')) category = 'fundraising';
      else if (cat.includes('management') || cat.includes('general') || cat.includes('admin')) category = 'management';

      return {
        id: t.qboId,
        date: t.txnDate.toISOString().slice(0, 10),
        vendor: t.vendorName || t.accountName || 'Unknown',
        amount: Math.round(t.amount * 100),
        category,
        description: t.description || '',
      };
    });

  // --- Vendor payments ---
  const vendorMap = new Map<string, { total: number; count: number }>();
  for (const txn of pipelineTxns) {
    const existing = vendorMap.get(txn.vendor) ?? { total: 0, count: 0 };
    existing.total += txn.amount;
    existing.count += 1;
    vendorMap.set(txn.vendor, existing);
  }
  const vendorPayments: VendorPayment[] = [...vendorMap.entries()].map(
    ([vendor, { total, count }]) => ({ vendor, amount: total, paymentCount: count })
  );

  // --- Balance sheet ---
  let totalAssets = 0;
  let totalLiabilities = 0;
  let cashAndEquivalents = 0;

  for (const acct of accounts) {
    const bal = Math.round((acct.currentBalance ?? 0) * 100);
    const cls = (acct.classification || '').toLowerCase();
    const sub = (acct.accountSubType || '').toLowerCase();

    if (cls === 'asset') totalAssets += bal;
    else if (cls === 'liability') totalLiabilities += bal;

    if (sub.includes('checking') || sub.includes('savings') || sub.includes('money market')) {
      cashAndEquivalents += bal;
    }
  }

  const netAssetsTotal = totalAssets - totalLiabilities;
  const balanceSheet: BalanceSheet = {
    totalAssets,
    totalLiabilities,
    netAssets: {
      unrestricted: netAssetsTotal,
      temporarilyRestricted: 0,
      permanentlyRestricted: 0,
      total: netAssetsTotal,
    },
    cashAndEquivalents,
  };

  return {
    orgId,
    orgName,
    month,
    revenue,
    expenses,
    transactions: pipelineTxns,
    vendorPayments,
    compensation: [],
    balanceSheet,
    donors: [],
    metadata: {
      source: 'quickbooks-online',
      syncedAt: new Date().toISOString(),
      ein: '\u2014',
      fiscalYearStart: `${y}-01-01`,
      mission: '',
    },
  };
}
