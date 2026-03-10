import { prisma } from '@/lib/prisma';
import type { MonthlyFinancials, RestrictedFund } from '@/lib/types';

export interface DashboardOrg {
  name: string;
  revenueYTD: number;
  expensesYTD: number;
  netAssetsTotal: number;
  cashPosition: number;
  cashReserveMonths: number;
  programExpenseRatio: number;
  managementExpenseRatio: number;
  fundraisingExpenseRatio: number;
  financials: MonthlyFinancials[];
  restrictedFunds: RestrictedFund[];
}

const REVENUE_TYPES = new Set([
  'Invoice', 'SalesReceipt', 'Payment', 'Deposit', 'RefundReceipt',
]);

const EXPENSE_TYPES = new Set([
  'Bill', 'Purchase', 'BillPayment', 'VendorCredit', 'Expense',
  'Check', 'CreditCardCredit',
]);

const CASH_SUBTYPES = new Set([
  'checking', 'savings', 'moneymarket', 'cashonhand',
  'cashequivalents', 'trustaccounts',
]);

function isRevenue(sourceType: string): boolean {
  return REVENUE_TYPES.has(sourceType);
}

function isExpense(sourceType: string): boolean {
  return EXPENSE_TYPES.has(sourceType);
}

function normalizeSub(raw: string): string {
  return (raw || '').toLowerCase().replace(/[\s_-]+/g, '');
}

export async function getOrgFinancials(orgId: string): Promise<DashboardOrg> {
  const [org, transactions, accounts] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.transaction.findMany({
      where: { orgId },
      select: { sourceType: true, amount: true, txnDate: true, irs990Category: true },
      orderBy: { txnDate: 'asc' },
    }),
    prisma.account.findMany({
      where: { orgId },
      select: { accountType: true, accountSubType: true, classification: true, currentBalance: true },
    }),
  ]);

  const name = org?.name || 'My Organization';

  // --- YTD totals ---
  let revenueYTD = 0;
  let expensesYTD = 0;

  for (const txn of transactions) {
    if (isRevenue(txn.sourceType)) {
      revenueYTD += txn.amount;
    } else if (isExpense(txn.sourceType)) {
      expensesYTD += txn.amount;
    }
  }

  // --- Account-based metrics ---
  let cashPosition = 0;
  let totalAssets = 0;
  let totalLiabilities = 0;

  for (const acct of accounts) {
    const bal = acct.currentBalance ?? 0;
    const sub = normalizeSub(acct.accountSubType || '');
    const cls = (acct.classification || '').toLowerCase();

    if (CASH_SUBTYPES.has(sub)) {
      cashPosition += bal;
    }
    if (cls === 'asset') {
      totalAssets += bal;
    } else if (cls === 'liability') {
      totalLiabilities += bal;
    }
  }

  const netAssetsTotal = totalAssets - totalLiabilities;

  const monthlyExpenseAvg = expensesYTD > 0 ? expensesYTD / Math.max(getMonthsElapsed(transactions), 1) : 0;
  const cashReserveMonths = monthlyExpenseAvg > 0
    ? Math.round((cashPosition / monthlyExpenseAvg) * 10) / 10
    : 0;

  // --- Expense ratios (compute early so we can apply in the monthly loop) ---
  const { programRatio, managementRatio, fundraisingRatio } = computeExpenseRatios(transactions);

  // --- Monthly financials ---
  const monthMap = new Map<string, { revenue: number; expenses: number }>();

  for (const txn of transactions) {
    const month = txn.txnDate.toISOString().slice(0, 7);
    if (!monthMap.has(month)) {
      monthMap.set(month, { revenue: 0, expenses: 0 });
    }
    const entry = monthMap.get(month)!;
    if (isRevenue(txn.sourceType)) {
      entry.revenue += txn.amount;
    } else if (isExpense(txn.sourceType)) {
      entry.expenses += txn.amount;
    }
  }

  const sortedMonths = [...monthMap.keys()].sort();

  let startingCash = cashPosition;
  for (const month of sortedMonths) {
    const data = monthMap.get(month)!;
    startingCash = startingCash - data.revenue + data.expenses;
  }

  let runningCash = startingCash;
  const financials: MonthlyFinancials[] = sortedMonths.map((month) => {
    const data = monthMap.get(month)!;
    runningCash = runningCash + data.revenue - data.expenses;

    return {
      month,
      revenue: {
        contributions: 0,
        grants: 0,
        programServiceRevenue: data.revenue,
        investmentIncome: 0,
        total: data.revenue,
      },
      expenses: {
        program: data.expenses * programRatio,
        management: data.expenses * managementRatio,
        fundraising: data.expenses * fundraisingRatio,
        total: data.expenses,
      },
      expensesByNature: {
        salaries: 0,
        benefits: 0,
        occupancy: 0,
        travel: 0,
        professionalFees: 0,
        supplies: 0,
        other: data.expenses,
      },
      cashPosition: Math.max(runningCash, 0),
      netAssets: {
        unrestricted: netAssetsTotal,
        temporarilyRestricted: 0,
        permanentlyRestricted: 0,
        total: netAssetsTotal,
      },
    };
  });

  return {
    name,
    revenueYTD,
    expensesYTD,
    netAssetsTotal,
    cashPosition,
    cashReserveMonths,
    programExpenseRatio: Math.round(programRatio * 1000) / 10,
    managementExpenseRatio: Math.round(managementRatio * 1000) / 10,
    fundraisingExpenseRatio: Math.round(fundraisingRatio * 1000) / 10,
    financials,
    restrictedFunds: [],
  };
}

function getMonthsElapsed(
  transactions: { txnDate: Date }[]
): number {
  if (transactions.length === 0) return 0;
  const first = transactions[0].txnDate;
  const last = transactions[transactions.length - 1].txnDate;
  return (
    (last.getFullYear() - first.getFullYear()) * 12 +
    (last.getMonth() - first.getMonth()) +
    1
  );
}

function computeExpenseRatios(
  transactions: { sourceType: string; amount: number; irs990Category: string | null }[]
): { programRatio: number; managementRatio: number; fundraisingRatio: number } {
  const expenseTxns = transactions.filter((t) => isExpense(t.sourceType));

  const classified = expenseTxns.filter((t) => t.irs990Category);
  if (classified.length === 0) {
    return { programRatio: 0.80, managementRatio: 0.15, fundraisingRatio: 0.05 };
  }

  let program = 0;
  let management = 0;
  let fundraising = 0;
  let total = 0;

  for (const txn of classified) {
    const cat = (txn.irs990Category || '').toLowerCase();
    total += txn.amount;
    if (cat.includes('fundrais')) {
      fundraising += txn.amount;
    } else if (cat.includes('management') || cat.includes('general') || cat.includes('admin')) {
      management += txn.amount;
    } else {
      program += txn.amount;
    }
  }

  if (total === 0) {
    return { programRatio: 0.80, managementRatio: 0.15, fundraisingRatio: 0.05 };
  }

  return {
    programRatio: program / total,
    managementRatio: management / total,
    fundraisingRatio: fundraising / total,
  };
}
