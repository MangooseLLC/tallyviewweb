/**
 * Simulated QuickBooks Online data for Bright Futures Youth Services.
 * 6 months: October 2025 through March 2026.
 *
 * Shaped like Codat-normalized QuickBooks API responses.
 * All dollar values in cents to avoid floating-point issues.
 */

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface RevenueBySource {
  grants: number;
  donations: number;
  programFees: number;
  investmentIncome: number;
  other: number;
  total: number;
}

export interface ExpensesByFunction {
  program: number;
  management: number;
  fundraising: number;
  total: number;
}

export interface Transaction {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  category: 'program' | 'management' | 'fundraising';
  description: string;
}

export interface VendorPayment {
  vendor: string;
  amount: number;
  paymentCount: number;
}

export interface CompensationEntry {
  name: string;
  title: string;
  type: 'executive' | 'key-employee' | 'contractor';
  annualCompensation: number;
  benefits: number;
}

export interface BalanceSheet {
  totalAssets: number;
  totalLiabilities: number;
  netAssets: {
    unrestricted: number;
    temporarilyRestricted: number;
    permanentlyRestricted: number;
    total: number;
  };
  cashAndEquivalents: number;
}

export interface DonorContribution {
  donor: string;
  amount: number;
  restricted: boolean;
  purpose?: string;
}

export interface MonthlyFinancialPackage {
  orgId: string;
  orgName: string;
  month: string; // YYYY-MM
  revenue: RevenueBySource;
  expenses: ExpensesByFunction;
  transactions: Transaction[];
  vendorPayments: VendorPayment[];
  compensation: CompensationEntry[];
  balanceSheet: BalanceSheet;
  donors: DonorContribution[];
  metadata: {
    source: 'quickbooks-online';
    syncedAt: string;
    ein: string;
    fiscalYearStart: string;
    mission: string;
  };
}

// ---------------------------------------------------------------------------
//  Data
// ---------------------------------------------------------------------------

const ORG_ID = 'org-bright-futures';
const ORG_NAME = 'Bright Futures Youth Services';
const EIN = '93-1234567';
const MISSION = 'Empowering underserved youth through education, mentorship, and community engagement programs across the Pacific Northwest.';

const COMPENSATION: CompensationEntry[] = [
  { name: 'Sarah Chen', title: 'CEO / Executive Director', type: 'executive', annualCompensation: 185_000_00, benefits: 37_000_00 },
  { name: 'Marcus Williams', title: 'CFO', type: 'executive', annualCompensation: 155_000_00, benefits: 31_000_00 },
  { name: 'Diana Torres', title: 'Program Director', type: 'key-employee', annualCompensation: 125_000_00, benefits: 25_000_00 },
  { name: 'James Okafor', title: 'Development Director', type: 'key-employee', annualCompensation: 115_000_00, benefits: 23_000_00 },
  { name: 'Priya Sharma', title: 'IT Consultant', type: 'contractor', annualCompensation: 96_000_00, benefits: 0 },
];

function makeMonth(
  monthStr: string,
  revenue: RevenueBySource,
  expenses: ExpensesByFunction,
  transactions: Transaction[],
  vendorPayments: VendorPayment[],
  balanceSheet: BalanceSheet,
  donors: DonorContribution[]
): MonthlyFinancialPackage {
  return {
    orgId: ORG_ID,
    orgName: ORG_NAME,
    month: monthStr,
    revenue,
    expenses,
    transactions,
    vendorPayments,
    compensation: COMPENSATION,
    balanceSheet,
    donors,
    metadata: {
      source: 'quickbooks-online',
      syncedAt: new Date().toISOString(),
      ein: EIN,
      fiscalYearStart: '2025-10-01',
      mission: MISSION,
    },
  };
}

function rev(g: number, d: number, p: number, inv: number, o: number): RevenueBySource {
  return { grants: g, donations: d, programFees: p, investmentIncome: inv, other: o, total: g + d + p + inv + o };
}

function exp(prog: number, mgmt: number, fund: number): ExpensesByFunction {
  return { program: prog, management: mgmt, fundraising: fund, total: prog + mgmt + fund };
}

// ---------------------------------------------------------------------------
//  6 months of data: Oct 2025 – Mar 2026
// ---------------------------------------------------------------------------

export const PIPELINE_MONTHS: MonthlyFinancialPackage[] = [
  makeMonth(
    '2025-10',
    rev(420_000_00, 85_000_00, 62_000_00, 3_200_00, 1_500_00),
    exp(385_000_00, 98_000_00, 42_000_00),
    [
      { id: 'tx-oct-001', date: '2025-10-03', vendor: 'City Office Supply Co', amount: 12_500_00, category: 'program', description: 'Classroom supplies Q4' },
      { id: 'tx-oct-002', date: '2025-10-07', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease October' },
      { id: 'tx-oct-003', date: '2025-10-12', vendor: 'Bright Horizons Catering', amount: 18_200_00, category: 'program', description: 'After-school meal program' },
      { id: 'tx-oct-004', date: '2025-10-15', vendor: 'Apex Digital Marketing', amount: 28_000_00, category: 'fundraising', description: 'Fall campaign design' },
      { id: 'tx-oct-005', date: '2025-10-22', vendor: 'Reeves & Associates LLC', amount: 35_000_00, category: 'management', description: 'Legal and compliance counsel' },
      { id: 'tx-oct-006', date: '2025-10-28', vendor: 'EduTech Solutions', amount: 22_000_00, category: 'program', description: 'Learning platform licenses' },
    ],
    [
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 35_000_00, paymentCount: 1 },
      { vendor: 'Apex Digital Marketing', amount: 28_000_00, paymentCount: 1 },
      { vendor: 'EduTech Solutions', amount: 22_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 18_200_00, paymentCount: 1 },
      { vendor: 'City Office Supply Co', amount: 12_500_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_250_000_00,
      totalLiabilities: 820_000_00,
      netAssets: { unrestricted: 2_180_000_00, temporarilyRestricted: 950_000_00, permanentlyRestricted: 300_000_00, total: 3_430_000_00 },
      cashAndEquivalents: 1_620_000_00,
    },
    [
      { donor: 'Gates Foundation', amount: 250_000_00, restricted: true, purpose: 'STEM programming' },
      { donor: 'Community Foundation of Denver', amount: 120_000_00, restricted: true, purpose: 'Scholarship fund' },
      { donor: 'Individual donors (aggregated)', amount: 85_000_00, restricted: false },
    ]
  ),

  makeMonth(
    '2025-11',
    rev(380_000_00, 145_000_00, 58_000_00, 3_100_00, 800_00),
    exp(392_000_00, 95_000_00, 55_000_00),
    [
      { id: 'tx-nov-001', date: '2025-11-04', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease November' },
      { id: 'tx-nov-002', date: '2025-11-08', vendor: 'Bright Horizons Catering', amount: 19_500_00, category: 'program', description: 'After-school meal program' },
      { id: 'tx-nov-003', date: '2025-11-12', vendor: 'Apex Digital Marketing', amount: 42_000_00, category: 'fundraising', description: 'Giving Tuesday campaign' },
      { id: 'tx-nov-004', date: '2025-11-18', vendor: 'School Bus Transportation Inc', amount: 28_000_00, category: 'program', description: 'Student transportation Q4' },
      { id: 'tx-nov-005', date: '2025-11-22', vendor: 'Reeves & Associates LLC', amount: 32_000_00, category: 'management', description: 'Annual audit preparation' },
      { id: 'tx-nov-006', date: '2025-11-28', vendor: 'SafeGuard Insurance', amount: 15_000_00, category: 'management', description: 'Directors & officers policy' },
    ],
    [
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Apex Digital Marketing', amount: 42_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 32_000_00, paymentCount: 1 },
      { vendor: 'School Bus Transportation Inc', amount: 28_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 19_500_00, paymentCount: 1 },
      { vendor: 'SafeGuard Insurance', amount: 15_000_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_310_000_00,
      totalLiabilities: 815_000_00,
      netAssets: { unrestricted: 2_225_000_00, temporarilyRestricted: 970_000_00, permanentlyRestricted: 300_000_00, total: 3_495_000_00 },
      cashAndEquivalents: 1_580_000_00,
    },
    [
      { donor: 'Walton Family Foundation', amount: 150_000_00, restricted: true, purpose: 'Literacy initiative' },
      { donor: 'End-of-year donors (aggregated)', amount: 145_000_00, restricted: false },
    ]
  ),

  makeMonth(
    '2025-12',
    rev(350_000_00, 310_000_00, 55_000_00, 4_500_00, 2_000_00),
    exp(410_000_00, 102_000_00, 68_000_00),
    [
      { id: 'tx-dec-001', date: '2025-12-02', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease December' },
      { id: 'tx-dec-002', date: '2025-12-05', vendor: 'Apex Digital Marketing', amount: 52_000_00, category: 'fundraising', description: 'Year-end campaign production' },
      { id: 'tx-dec-003', date: '2025-12-10', vendor: 'Bright Horizons Catering', amount: 16_000_00, category: 'program', description: 'Holiday program meals' },
      { id: 'tx-dec-004', date: '2025-12-15', vendor: 'EduTech Solutions', amount: 38_000_00, category: 'program', description: 'Annual license renewal + expansion' },
      { id: 'tx-dec-005', date: '2025-12-18', vendor: 'Reeves & Associates LLC', amount: 45_000_00, category: 'management', description: 'Year-end legal review + tax prep' },
      { id: 'tx-dec-006', date: '2025-12-22', vendor: 'PrintWorks Inc', amount: 8_500_00, category: 'fundraising', description: 'Annual report printing' },
    ],
    [
      { vendor: 'Apex Digital Marketing', amount: 52_000_00, paymentCount: 1 },
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'EduTech Solutions', amount: 38_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 16_000_00, paymentCount: 1 },
      { vendor: 'PrintWorks Inc', amount: 8_500_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_450_000_00,
      totalLiabilities: 800_000_00,
      netAssets: { unrestricted: 2_350_000_00, temporarilyRestricted: 1_000_000_00, permanentlyRestricted: 300_000_00, total: 3_650_000_00 },
      cashAndEquivalents: 1_750_000_00,
    },
    [
      { donor: 'Gates Foundation', amount: 100_000_00, restricted: true, purpose: 'STEM programming (Q2 installment)' },
      { donor: 'Year-end individual donors (aggregated)', amount: 310_000_00, restricted: false },
      { donor: 'Silicon Valley Community Foundation', amount: 75_000_00, restricted: true, purpose: 'Teacher professional development' },
    ]
  ),

  makeMonth(
    '2026-01',
    rev(400_000_00, 72_000_00, 60_000_00, 3_800_00, 1_200_00),
    exp(375_000_00, 92_000_00, 38_000_00),
    [
      { id: 'tx-jan-001', date: '2026-01-06', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease January' },
      { id: 'tx-jan-002', date: '2026-01-10', vendor: 'City Office Supply Co', amount: 14_000_00, category: 'program', description: 'Spring semester supplies' },
      { id: 'tx-jan-003', date: '2026-01-14', vendor: 'Bright Horizons Catering', amount: 18_800_00, category: 'program', description: 'After-school meal program' },
      { id: 'tx-jan-004', date: '2026-01-20', vendor: 'Reeves & Associates LLC', amount: 28_000_00, category: 'management', description: 'Q1 compliance review' },
      { id: 'tx-jan-005', date: '2026-01-25', vendor: 'School Bus Transportation Inc', amount: 28_000_00, category: 'program', description: 'Student transportation Q1' },
      { id: 'tx-jan-006', date: '2026-01-30', vendor: 'TechForward Consulting', amount: 18_000_00, category: 'program', description: 'Database migration project' },
    ],
    [
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 28_000_00, paymentCount: 1 },
      { vendor: 'School Bus Transportation Inc', amount: 28_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 18_800_00, paymentCount: 1 },
      { vendor: 'TechForward Consulting', amount: 18_000_00, paymentCount: 1 },
      { vendor: 'City Office Supply Co', amount: 14_000_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_520_000_00,
      totalLiabilities: 790_000_00,
      netAssets: { unrestricted: 2_430_000_00, temporarilyRestricted: 1_000_000_00, permanentlyRestricted: 300_000_00, total: 3_730_000_00 },
      cashAndEquivalents: 1_820_000_00,
    },
    [
      { donor: 'Walton Family Foundation', amount: 100_000_00, restricted: true, purpose: 'Literacy initiative (Q2 installment)' },
      { donor: 'Individual donors (aggregated)', amount: 72_000_00, restricted: false },
    ]
  ),

  makeMonth(
    '2026-02',
    rev(390_000_00, 68_000_00, 61_000_00, 3_400_00, 900_00),
    exp(382_000_00, 96_000_00, 40_000_00),
    [
      { id: 'tx-feb-001', date: '2026-02-03', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease February' },
      { id: 'tx-feb-002', date: '2026-02-07', vendor: 'Bright Horizons Catering', amount: 17_600_00, category: 'program', description: 'After-school meal program' },
      { id: 'tx-feb-003', date: '2026-02-11', vendor: 'Apex Digital Marketing', amount: 25_000_00, category: 'fundraising', description: 'Spring gala materials' },
      { id: 'tx-feb-004', date: '2026-02-18', vendor: 'Reeves & Associates LLC', amount: 30_000_00, category: 'management', description: 'Grant compliance review' },
      { id: 'tx-feb-005', date: '2026-02-22', vendor: 'EduTech Solutions', amount: 22_000_00, category: 'program', description: 'Learning platform monthly' },
      { id: 'tx-feb-006', date: '2026-02-27', vendor: 'Neighborhood Print & Copy', amount: 6_500_00, category: 'fundraising', description: 'Gala invitations' },
    ],
    [
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 30_000_00, paymentCount: 1 },
      { vendor: 'Apex Digital Marketing', amount: 25_000_00, paymentCount: 1 },
      { vendor: 'EduTech Solutions', amount: 22_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 17_600_00, paymentCount: 1 },
      { vendor: 'Neighborhood Print & Copy', amount: 6_500_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_480_000_00,
      totalLiabilities: 785_000_00,
      netAssets: { unrestricted: 2_395_000_00, temporarilyRestricted: 1_000_000_00, permanentlyRestricted: 300_000_00, total: 3_695_000_00 },
      cashAndEquivalents: 1_780_000_00,
    },
    [
      { donor: 'Community Foundation of Denver', amount: 60_000_00, restricted: true, purpose: 'Scholarship fund (spring)' },
      { donor: 'Individual donors (aggregated)', amount: 68_000_00, restricted: false },
    ]
  ),

  makeMonth(
    '2026-03',
    rev(410_000_00, 92_000_00, 63_000_00, 3_600_00, 1_100_00),
    exp(395_000_00, 99_000_00, 45_000_00),
    [
      { id: 'tx-mar-001', date: '2026-03-02', vendor: 'Metro Property Mgmt', amount: 45_000_00, category: 'management', description: 'Facility lease March' },
      { id: 'tx-mar-002', date: '2026-03-06', vendor: 'Bright Horizons Catering', amount: 19_000_00, category: 'program', description: 'After-school meal program' },
      { id: 'tx-mar-003', date: '2026-03-10', vendor: 'Reeves & Associates LLC', amount: 38_000_00, category: 'management', description: '990 preparation kickoff' },
      { id: 'tx-mar-004', date: '2026-03-15', vendor: 'School Bus Transportation Inc', amount: 28_000_00, category: 'program', description: 'Student transportation Q1 final' },
      { id: 'tx-mar-005', date: '2026-03-20', vendor: 'Apex Digital Marketing', amount: 30_000_00, category: 'fundraising', description: 'Spring gala event coordination' },
      { id: 'tx-mar-006', date: '2026-03-28', vendor: 'TechForward Consulting', amount: 22_000_00, category: 'program', description: 'Database migration phase 2' },
    ],
    [
      { vendor: 'Metro Property Mgmt', amount: 45_000_00, paymentCount: 1 },
      { vendor: 'Reeves & Associates LLC', amount: 38_000_00, paymentCount: 1 },
      { vendor: 'Apex Digital Marketing', amount: 30_000_00, paymentCount: 1 },
      { vendor: 'School Bus Transportation Inc', amount: 28_000_00, paymentCount: 1 },
      { vendor: 'TechForward Consulting', amount: 22_000_00, paymentCount: 1 },
      { vendor: 'Bright Horizons Catering', amount: 19_000_00, paymentCount: 1 },
    ],
    {
      totalAssets: 4_540_000_00,
      totalLiabilities: 780_000_00,
      netAssets: { unrestricted: 2_460_000_00, temporarilyRestricted: 1_000_000_00, permanentlyRestricted: 300_000_00, total: 3_760_000_00 },
      cashAndEquivalents: 1_850_000_00,
    },
    [
      { donor: 'Gates Foundation', amount: 150_000_00, restricted: true, purpose: 'STEM programming (Q3 installment)' },
      { donor: 'Spring campaign donors (aggregated)', amount: 92_000_00, restricted: false },
    ]
  ),
];

/** All months available in the pipeline, in chronological order */
export const PIPELINE_MONTH_LABELS = PIPELINE_MONTHS.map((m) => m.month);

/** Aggregate vendor payments across all processed months */
export function aggregateVendorPayments(
  months: MonthlyFinancialPackage[]
): Map<string, { total: number; paymentCount: number }> {
  const map = new Map<string, { total: number; paymentCount: number }>();
  for (const m of months) {
    for (const vp of m.vendorPayments) {
      const existing = map.get(vp.vendor) ?? { total: 0, paymentCount: 0 };
      existing.total += vp.amount;
      existing.paymentCount += vp.paymentCount;
      map.set(vp.vendor, existing);
    }
  }
  return map;
}

/** Aggregate revenue across all processed months */
export function aggregateRevenue(months: MonthlyFinancialPackage[]): RevenueBySource {
  const agg: RevenueBySource = { grants: 0, donations: 0, programFees: 0, investmentIncome: 0, other: 0, total: 0 };
  for (const m of months) {
    agg.grants += m.revenue.grants;
    agg.donations += m.revenue.donations;
    agg.programFees += m.revenue.programFees;
    agg.investmentIncome += m.revenue.investmentIncome;
    agg.other += m.revenue.other;
    agg.total += m.revenue.total;
  }
  return agg;
}

/** Aggregate expenses across all processed months */
export function aggregateExpenses(months: MonthlyFinancialPackage[]): ExpensesByFunction {
  const agg: ExpensesByFunction = { program: 0, management: 0, fundraising: 0, total: 0 };
  for (const m of months) {
    agg.program += m.expenses.program;
    agg.management += m.expenses.management;
    agg.fundraising += m.expenses.fundraising;
    agg.total += m.expenses.total;
  }
  return agg;
}
