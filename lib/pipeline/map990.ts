import type { MonthlyFinancialPackage } from './ingest';
import { aggregateRevenue, aggregateExpenses } from './ingest';
import type { Section990 } from '@/lib/types';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface FieldData {
  line: string;
  label: string;
  value: string;
  source: 'quickbooks' | 'computed' | 'manual';
  confidence: number;
}

export interface Map990Result {
  sections: Section990[];
  sampleFields: Record<string, FieldData[]>;
  monthsProcessed: string[];
  overallCompletion: number;
  aiConfidence: number;
}

// ---------------------------------------------------------------------------
//  Progressive completion model
// ---------------------------------------------------------------------------

function financialCompletion(n: number): number {
  return Math.min(95, Math.round((n / 12) * 100));
}

function compensationCompletion(n: number): number {
  if (n >= 12) return 100;
  if (n >= 3) return 85;
  return Math.round((n / 12) * 70);
}

function contributorsCompletion(n: number): number {
  if (n >= 12) return 100;
  const quarters = Math.floor(n / 3);
  return Math.min(95, quarters * 25);
}

function summaryCompletion(n: number): number {
  return n > 0 ? 100 : 0;
}

function checklistCompletion(partIXCompletion: number): number {
  return partIXCompletion >= 50 ? 100 : 0;
}

function sectionStatus(completion: number): 'Complete' | 'In Progress' | 'Not Started' {
  if (completion >= 100) return 'Complete';
  if (completion > 0) return 'In Progress';
  return 'Not Started';
}

// ---------------------------------------------------------------------------
//  AI confidence model
// ---------------------------------------------------------------------------

function computeAiConfidence(n: number, mappingCertainty: number): number {
  const dataCompleteness = n / 12;
  const base = dataCompleteness * 0.6 + mappingCertainty * 0.3;
  const manualPending = n < 12 ? 0.05 : 0;
  return Math.round(Math.min(0.95, base + 0.1 - manualPending) * 100);
}

// ---------------------------------------------------------------------------
//  Dollars helper
// ---------------------------------------------------------------------------

function fmtDollars(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ---------------------------------------------------------------------------
//  Main mapping function
// ---------------------------------------------------------------------------

export function generate990Progress(months: MonthlyFinancialPackage[]): Map990Result {
  const n = months.length;
  const monthLabels = months.map((m) => m.month);

  const rev = aggregateRevenue(months);
  const exp = aggregateExpenses(months);
  const latestBalance = months.length > 0 ? months[months.length - 1].balanceSheet : null;

  const partVIIICompletion = financialCompletion(n);
  const partIXCompletion = financialCompletion(n);

  const sections: Section990[] = [
    {
      id: 'part-i',
      name: 'Part I: Summary',
      status: sectionStatus(summaryCompletion(n)),
      completion: summaryCompletion(n),
      notes: n > 0 ? 'Auto-populated from QuickBooks org profile' : 'Awaiting data',
      aiConfidence: n > 0 ? 98 : 0,
    },
    {
      id: 'part-iii',
      name: 'Part III: Statement of Program Service Accomplishments',
      status: 'Not Started',
      completion: 0,
      notes: 'Requires manual narrative input — cannot be auto-generated from financial data',
      aiConfidence: 0,
    },
    {
      id: 'part-iv',
      name: 'Part IV: Checklist of Required Schedules',
      status: sectionStatus(checklistCompletion(partIXCompletion)),
      completion: checklistCompletion(partIXCompletion),
      notes: partIXCompletion >= 50 ? 'Auto-determined from expense and revenue data' : 'Pending Part IX data',
      aiConfidence: partIXCompletion >= 50 ? 95 : 0,
    },
    {
      id: 'part-vii',
      name: 'Part VII: Compensation of Officers, Directors, Key Employees',
      status: sectionStatus(compensationCompletion(n)),
      completion: compensationCompletion(n),
      notes: n >= 3 ? `${months[0].compensation.length} individuals mapped from payroll data` : 'Awaiting quarterly payroll data',
      aiConfidence: n >= 3 ? 90 : 0,
    },
    {
      id: 'part-viii',
      name: 'Part VIII: Statement of Revenue',
      status: sectionStatus(partVIIICompletion),
      completion: partVIIICompletion,
      notes: `${n} of 12 months processed — revenue mapped by source`,
      aiConfidence: Math.round(partVIIICompletion * 0.95),
    },
    {
      id: 'part-ix',
      name: 'Part IX: Statement of Functional Expenses',
      status: sectionStatus(partIXCompletion),
      completion: partIXCompletion,
      notes: `${n} of 12 months processed — program/management/fundraising split`,
      aiConfidence: Math.round(partIXCompletion * 0.93),
    },
    {
      id: 'part-x',
      name: 'Part X: Balance Sheet',
      status: sectionStatus(financialCompletion(n)),
      completion: financialCompletion(n),
      notes: latestBalance ? 'Latest balance sheet snapshot from QuickBooks' : 'Awaiting data',
      aiConfidence: latestBalance ? Math.round(financialCompletion(n) * 0.92) : 0,
    },
    {
      id: 'schedule-a',
      name: 'Schedule A: Public Charity Status and Public Support',
      status: sectionStatus(financialCompletion(n)),
      completion: financialCompletion(n),
      notes: 'Public support test computed from revenue sources',
      aiConfidence: Math.round(financialCompletion(n) * 0.88),
    },
    {
      id: 'schedule-b',
      name: 'Schedule B: Schedule of Contributors',
      status: sectionStatus(contributorsCompletion(n)),
      completion: contributorsCompletion(n),
      notes: `Donors exceeding $5,000 threshold identified from ${n} months`,
      aiConfidence: Math.round(contributorsCompletion(n) * 0.85),
    },
    {
      id: 'schedule-o',
      name: 'Schedule O: Supplemental Information',
      status: 'Not Started',
      completion: 0,
      notes: 'Requires manual narrative input',
      aiConfidence: 0,
    },
  ];

  // Sample fields for interactive display
  const sampleFields: Record<string, FieldData[]> = {};

  if (n > 0) {
    const meta = months[0].metadata;
    sampleFields['part-i'] = [
      { line: '1', label: 'Organization Name', value: months[0].orgName, source: 'quickbooks', confidence: 100 },
      { line: '2', label: 'EIN', value: meta.ein, source: 'quickbooks', confidence: 100 },
      { line: '3', label: 'Mission Statement', value: meta.mission, source: 'quickbooks', confidence: 95 },
      { line: '12', label: 'Total Revenue', value: fmtDollars(rev.total), source: 'computed', confidence: partVIIICompletion },
      { line: '18', label: 'Total Expenses', value: fmtDollars(exp.total), source: 'computed', confidence: partIXCompletion },
    ];

    sampleFields['part-viii'] = [
      { line: '1a', label: 'Federated campaigns', value: '$0', source: 'computed', confidence: 90 },
      { line: '1b', label: 'Membership dues', value: '$0', source: 'computed', confidence: 90 },
      { line: '1c', label: 'Fundraising events', value: fmtDollars(rev.donations), source: 'quickbooks', confidence: 88 },
      { line: '1f', label: 'Government grants', value: fmtDollars(rev.grants), source: 'quickbooks', confidence: 92 },
      { line: '2a', label: 'Program service revenue', value: fmtDollars(rev.programFees), source: 'quickbooks', confidence: 90 },
      { line: '8', label: 'Investment income', value: fmtDollars(rev.investmentIncome), source: 'quickbooks', confidence: 95 },
      { line: '12', label: 'Total revenue', value: fmtDollars(rev.total), source: 'computed', confidence: partVIIICompletion },
    ];

    sampleFields['part-ix'] = [
      { line: '25A', label: 'Program services expenses', value: fmtDollars(exp.program), source: 'quickbooks', confidence: 88 },
      { line: '25B', label: 'Management and general expenses', value: fmtDollars(exp.management), source: 'quickbooks', confidence: 88 },
      { line: '25C', label: 'Fundraising expenses', value: fmtDollars(exp.fundraising), source: 'quickbooks', confidence: 85 },
      { line: '25', label: 'Total functional expenses', value: fmtDollars(exp.total), source: 'computed', confidence: partIXCompletion },
    ];

    if (months[0].compensation.length > 0) {
      sampleFields['part-vii'] = months[0].compensation.map((c, i) => ({
        line: `${i + 1}`,
        label: `${c.name} — ${c.title}`,
        value: `${fmtDollars(c.annualCompensation)} + ${fmtDollars(c.benefits)} benefits`,
        source: 'quickbooks' as const,
        confidence: 90,
      }));
    }

    if (latestBalance) {
      sampleFields['part-x'] = [
        { line: '16', label: 'Total assets', value: fmtDollars(latestBalance.totalAssets), source: 'quickbooks', confidence: 92 },
        { line: '26', label: 'Total liabilities', value: fmtDollars(latestBalance.totalLiabilities), source: 'quickbooks', confidence: 92 },
        { line: '27', label: 'Unrestricted net assets', value: fmtDollars(latestBalance.netAssets.unrestricted), source: 'quickbooks', confidence: 88 },
        { line: '28', label: 'Temporarily restricted net assets', value: fmtDollars(latestBalance.netAssets.temporarilyRestricted), source: 'quickbooks', confidence: 88 },
        { line: '29', label: 'Permanently restricted net assets', value: fmtDollars(latestBalance.netAssets.permanentlyRestricted), source: 'quickbooks', confidence: 90 },
        { line: '33', label: 'Total net assets or fund balances', value: fmtDollars(latestBalance.netAssets.total), source: 'computed', confidence: 90 },
      ];
    }

    // Schedule B: donors exceeding $5K
    const allDonors = months.flatMap((m) => m.donors);
    const donorMap = new Map<string, number>();
    for (const d of allDonors) {
      donorMap.set(d.donor, (donorMap.get(d.donor) ?? 0) + d.amount);
    }
    const majorDonors = [...donorMap.entries()]
      .filter(([, amount]) => amount > 500_000) // $5,000 in cents
      .sort((a, b) => b[1] - a[1]);

    if (majorDonors.length > 0) {
      sampleFields['schedule-b'] = majorDonors.map(([donor, amount], i) => ({
        line: `${i + 1}`,
        label: donor,
        value: fmtDollars(amount),
        source: 'quickbooks' as const,
        confidence: 85,
      }));
    }
  }

  const totalCompletion = sections.reduce((sum, s) => sum + s.completion, 0);
  const overallCompletion = Math.round(totalCompletion / sections.length);

  const mappingCertainty = n > 0 ? 0.85 : 0;
  const aiConfidence = computeAiConfidence(n, mappingCertainty);

  return {
    sections,
    sampleFields,
    monthsProcessed: monthLabels,
    overallCompletion,
    aiConfidence,
  };
}
