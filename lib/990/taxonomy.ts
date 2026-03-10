import { z } from 'zod';

// ---------------------------------------------------------------------------
//  IRS Form 990 Category Taxonomy — v1: Parts VIII, IX, X
// ---------------------------------------------------------------------------

export interface Category990 {
  id: string;
  part: string;
  line: string;
  label: string;
  description: string;
  keywords: string[];
}

export const CATEGORIES: Category990[] = [
  // -------------------------------------------------------------------------
  //  Part VIII — Statement of Revenue
  // -------------------------------------------------------------------------
  {
    id: 'part-viii-line-1',
    part: 'VIII',
    line: '1',
    label: 'Contributions, gifts, grants',
    description: 'Federated campaigns, membership dues, fundraising events, related organizations, government grants, all other contributions',
    keywords: ['contribution', 'donation', 'gift', 'grant', 'fundraising', 'membership', 'dues', 'pledge'],
  },
  {
    id: 'part-viii-line-2',
    part: 'VIII',
    line: '2',
    label: 'Program service revenue',
    description: 'Revenue from program-related services, fees, contracts',
    keywords: ['program', 'service', 'fee', 'tuition', 'admission', 'client', 'contract', 'earned revenue'],
  },
  {
    id: 'part-viii-line-3',
    part: 'VIII',
    line: '3',
    label: 'Investment income',
    description: 'Interest, dividends, and other investment income',
    keywords: ['interest', 'dividend', 'investment', 'securities', 'bond', 'yield', 'capital gain'],
  },
  {
    id: 'part-viii-line-4',
    part: 'VIII',
    line: '4',
    label: 'Income from investment of tax-exempt bond proceeds',
    description: 'Income from tax-exempt bond proceeds',
    keywords: ['bond proceeds', 'tax-exempt bond'],
  },
  {
    id: 'part-viii-line-5',
    part: 'VIII',
    line: '5',
    label: 'Royalties',
    description: 'Income from royalties',
    keywords: ['royalty', 'royalties', 'licensing', 'intellectual property'],
  },
  {
    id: 'part-viii-line-6',
    part: 'VIII',
    line: '6',
    label: 'Net rental income',
    description: 'Rental income from real and personal property',
    keywords: ['rental income', 'rent received', 'lease income', 'property income'],
  },
  {
    id: 'part-viii-line-7',
    part: 'VIII',
    line: '7',
    label: 'Net gain from sale of assets',
    description: 'Gain or loss from sale of assets other than inventory',
    keywords: ['sale of asset', 'gain on sale', 'disposal', 'asset sale'],
  },
  {
    id: 'part-viii-line-8',
    part: 'VIII',
    line: '8',
    label: 'Net income from fundraising events',
    description: 'Gross income from fundraising events less direct expenses',
    keywords: ['fundraising event', 'gala', 'benefit', 'auction', 'event income'],
  },
  {
    id: 'part-viii-line-9',
    part: 'VIII',
    line: '9',
    label: 'Net income from gaming activities',
    description: 'Gross income from gaming activities less direct expenses',
    keywords: ['gaming', 'lottery', 'raffle', 'bingo'],
  },
  {
    id: 'part-viii-line-10',
    part: 'VIII',
    line: '10',
    label: 'Net income from sales of inventory',
    description: 'Gross sales of inventory less costs and direct expenses',
    keywords: ['inventory', 'merchandise', 'product sales', 'cost of goods'],
  },
  {
    id: 'part-viii-line-11',
    part: 'VIII',
    line: '11',
    label: 'Other revenue',
    description: 'Miscellaneous revenue not classified elsewhere',
    keywords: ['miscellaneous', 'other income', 'sundry'],
  },

  // -------------------------------------------------------------------------
  //  Part IX — Statement of Functional Expenses
  // -------------------------------------------------------------------------
  {
    id: 'part-ix-line-1',
    part: 'IX',
    line: '1',
    label: 'Grants and other assistance — domestic organizations',
    description: 'Grants to domestic organizations and governments',
    keywords: ['grant expense', 'grant paid', 'subaward', 'pass-through'],
  },
  {
    id: 'part-ix-line-2',
    part: 'IX',
    line: '2',
    label: 'Grants and other assistance — domestic individuals',
    description: 'Grants and assistance to domestic individuals',
    keywords: ['scholarship', 'fellowship', 'stipend', 'individual grant', 'assistance'],
  },
  {
    id: 'part-ix-line-3',
    part: 'IX',
    line: '3',
    label: 'Grants and other assistance — foreign',
    description: 'Grants and assistance to foreign organizations/individuals',
    keywords: ['foreign grant', 'international aid', 'overseas'],
  },
  {
    id: 'part-ix-line-4',
    part: 'IX',
    line: '4',
    label: 'Benefits paid to or for members',
    description: 'Benefits paid to members',
    keywords: ['member benefit', 'member payment'],
  },
  {
    id: 'part-ix-line-5',
    part: 'IX',
    line: '5',
    label: 'Compensation of current officers, directors, key employees',
    description: 'Compensation of current officers, directors, trustees, and key employees',
    keywords: ['officer salary', 'director compensation', 'executive pay', 'key employee'],
  },
  {
    id: 'part-ix-line-6',
    part: 'IX',
    line: '6',
    label: 'Compensation not included above',
    description: 'Compensation of disqualified persons not included on line 5',
    keywords: ['disqualified person', 'former officer'],
  },
  {
    id: 'part-ix-line-7',
    part: 'IX',
    line: '7',
    label: 'Other salaries and wages',
    description: 'Other employee salaries and wages',
    keywords: ['salary', 'wages', 'payroll', 'compensation', 'pay'],
  },
  {
    id: 'part-ix-line-8',
    part: 'IX',
    line: '8',
    label: 'Pension plan accruals and contributions',
    description: 'Pension plan and retirement contributions',
    keywords: ['pension', 'retirement', '401k', '403b', 'retirement plan'],
  },
  {
    id: 'part-ix-line-9',
    part: 'IX',
    line: '9',
    label: 'Other employee benefits',
    description: 'Health insurance, life insurance, and other benefits',
    keywords: ['health insurance', 'benefits', 'life insurance', 'disability', 'employee benefit', 'medical'],
  },
  {
    id: 'part-ix-line-10',
    part: 'IX',
    line: '10',
    label: 'Payroll taxes',
    description: 'Payroll taxes (FICA, unemployment, etc.)',
    keywords: ['payroll tax', 'FICA', 'unemployment', 'FUTA', 'SUTA', 'social security', 'medicare tax'],
  },
  {
    id: 'part-ix-line-11a',
    part: 'IX',
    line: '11a',
    label: 'Fees for services — management',
    description: 'Management fees',
    keywords: ['management fee'],
  },
  {
    id: 'part-ix-line-11b',
    part: 'IX',
    line: '11b',
    label: 'Fees for services — legal',
    description: 'Legal fees',
    keywords: ['legal', 'attorney', 'lawyer', 'law firm'],
  },
  {
    id: 'part-ix-line-11c',
    part: 'IX',
    line: '11c',
    label: 'Fees for services — accounting',
    description: 'Accounting and audit fees',
    keywords: ['accounting', 'audit', 'CPA', 'bookkeeping', 'tax preparation'],
  },
  {
    id: 'part-ix-line-11d',
    part: 'IX',
    line: '11d',
    label: 'Fees for services — lobbying',
    description: 'Lobbying fees',
    keywords: ['lobbying', 'government relations'],
  },
  {
    id: 'part-ix-line-11e',
    part: 'IX',
    line: '11e',
    label: 'Fees for services — fundraising',
    description: 'Professional fundraising services',
    keywords: ['fundraising service', 'development consultant'],
  },
  {
    id: 'part-ix-line-11f',
    part: 'IX',
    line: '11f',
    label: 'Fees for services — investment management',
    description: 'Investment management fees',
    keywords: ['investment management', 'portfolio management', 'asset management'],
  },
  {
    id: 'part-ix-line-11g',
    part: 'IX',
    line: '11g',
    label: 'Fees for services — other',
    description: 'Other professional fees',
    keywords: ['professional fee', 'consultant', 'contractor', 'professional service'],
  },
  {
    id: 'part-ix-line-12',
    part: 'IX',
    line: '12',
    label: 'Advertising and promotion',
    description: 'Advertising and promotion expenses',
    keywords: ['advertising', 'promotion', 'marketing', 'media', 'PR', 'public relations'],
  },
  {
    id: 'part-ix-line-13',
    part: 'IX',
    line: '13',
    label: 'Office expenses',
    description: 'Office supplies and expenses',
    keywords: ['office', 'supplies', 'stationery', 'postage', 'printing', 'copying'],
  },
  {
    id: 'part-ix-line-14',
    part: 'IX',
    line: '14',
    label: 'Information technology',
    description: 'IT expenses, software, and technology',
    keywords: ['technology', 'software', 'IT', 'computer', 'internet', 'web', 'hosting', 'SaaS', 'cloud'],
  },
  {
    id: 'part-ix-line-15',
    part: 'IX',
    line: '15',
    label: 'Royalties',
    description: 'Royalty expenses',
    keywords: ['royalty expense'],
  },
  {
    id: 'part-ix-line-16',
    part: 'IX',
    line: '16',
    label: 'Occupancy',
    description: 'Rent, utilities, maintenance of office/facilities',
    keywords: ['rent', 'lease', 'occupancy', 'utilities', 'electric', 'gas', 'water', 'maintenance', 'janitorial'],
  },
  {
    id: 'part-ix-line-17',
    part: 'IX',
    line: '17',
    label: 'Travel',
    description: 'Travel expenses',
    keywords: ['travel', 'airfare', 'hotel', 'lodging', 'mileage', 'transportation'],
  },
  {
    id: 'part-ix-line-18',
    part: 'IX',
    line: '18',
    label: 'Payments of travel for entertainment of public officials',
    description: 'Travel/entertainment expenses for public officials',
    keywords: ['official travel', 'government entertainment'],
  },
  {
    id: 'part-ix-line-19',
    part: 'IX',
    line: '19',
    label: 'Conferences, conventions, and meetings',
    description: 'Conference and meeting expenses',
    keywords: ['conference', 'convention', 'meeting', 'seminar', 'workshop', 'training'],
  },
  {
    id: 'part-ix-line-20',
    part: 'IX',
    line: '20',
    label: 'Interest',
    description: 'Interest expense',
    keywords: ['interest expense', 'loan interest', 'mortgage interest'],
  },
  {
    id: 'part-ix-line-21',
    part: 'IX',
    line: '21',
    label: 'Payments to affiliates',
    description: 'Payments to affiliated organizations',
    keywords: ['affiliate', 'affiliated organization'],
  },
  {
    id: 'part-ix-line-22',
    part: 'IX',
    line: '22',
    label: 'Depreciation, depletion, and amortization',
    description: 'Depreciation and amortization',
    keywords: ['depreciation', 'amortization', 'depletion'],
  },
  {
    id: 'part-ix-line-23',
    part: 'IX',
    line: '23',
    label: 'Insurance',
    description: 'Insurance expenses (non-employee)',
    keywords: ['insurance', 'liability insurance', 'property insurance', 'D&O', 'general insurance'],
  },
  {
    id: 'part-ix-line-24',
    part: 'IX',
    line: '24',
    label: 'Other expenses',
    description: 'All other expenses not categorized on lines 1-23',
    keywords: ['miscellaneous expense', 'other expense', 'sundry expense'],
  },

  // -------------------------------------------------------------------------
  //  Part X — Balance Sheet
  // -------------------------------------------------------------------------
  {
    id: 'part-x-line-1',
    part: 'X',
    line: '1',
    label: 'Cash — non-interest-bearing',
    description: 'Cash and cash equivalents',
    keywords: ['cash', 'checking', 'petty cash', 'cash on hand'],
  },
  {
    id: 'part-x-line-2',
    part: 'X',
    line: '2',
    label: 'Savings and temporary cash investments',
    description: 'Savings accounts, money market, CDs',
    keywords: ['savings', 'money market', 'CD', 'certificate of deposit', 'temporary investment'],
  },
  {
    id: 'part-x-line-3',
    part: 'X',
    line: '3',
    label: 'Pledges and grants receivable',
    description: 'Pledges and grants receivable',
    keywords: ['receivable', 'pledge receivable', 'grant receivable', 'accounts receivable'],
  },
  {
    id: 'part-x-line-4',
    part: 'X',
    line: '4',
    label: 'Accounts receivable',
    description: 'Accounts receivable, net',
    keywords: ['accounts receivable', 'trade receivable', 'AR'],
  },
  {
    id: 'part-x-line-5',
    part: 'X',
    line: '5',
    label: 'Loans and other receivables',
    description: 'Loans from officers, directors, key employees, and other receivables',
    keywords: ['loan receivable', 'note receivable', 'employee loan'],
  },
  {
    id: 'part-x-line-6',
    part: 'X',
    line: '6',
    label: 'Loans and other receivables',
    description: 'Loans from other disqualified persons',
    keywords: ['disqualified loan'],
  },
  {
    id: 'part-x-line-7',
    part: 'X',
    line: '7',
    label: 'Notes and loans receivable',
    description: 'Other notes and loans receivable, net',
    keywords: ['notes receivable'],
  },
  {
    id: 'part-x-line-8',
    part: 'X',
    line: '8',
    label: 'Inventories for sale or use',
    description: 'Inventories for sale or use',
    keywords: ['inventory', 'supplies inventory'],
  },
  {
    id: 'part-x-line-9',
    part: 'X',
    line: '9',
    label: 'Prepaid expenses and deferred charges',
    description: 'Prepaid expenses',
    keywords: ['prepaid', 'deferred charge', 'prepaid expense', 'prepaid rent', 'prepaid insurance'],
  },
  {
    id: 'part-x-line-10',
    part: 'X',
    line: '10',
    label: 'Land, buildings, and equipment',
    description: 'Land, buildings, and equipment less accumulated depreciation',
    keywords: ['land', 'building', 'equipment', 'fixed asset', 'property', 'furniture', 'vehicle', 'leasehold'],
  },
  {
    id: 'part-x-line-11',
    part: 'X',
    line: '11',
    label: 'Investments — publicly traded securities',
    description: 'Investments in publicly traded securities',
    keywords: ['stock', 'bond', 'mutual fund', 'ETF', 'publicly traded', 'marketable securities'],
  },
  {
    id: 'part-x-line-12',
    part: 'X',
    line: '12',
    label: 'Investments — other securities',
    description: 'Other securities investments',
    keywords: ['private equity', 'hedge fund', 'alternative investment'],
  },
  {
    id: 'part-x-line-13',
    part: 'X',
    line: '13',
    label: 'Investments — program-related',
    description: 'Program-related investments',
    keywords: ['program-related investment', 'PRI', 'mission investment'],
  },
  {
    id: 'part-x-line-14',
    part: 'X',
    line: '14',
    label: 'Intangible assets',
    description: 'Intangible assets',
    keywords: ['intangible', 'goodwill', 'patent', 'trademark', 'copyright'],
  },
  {
    id: 'part-x-line-15',
    part: 'X',
    line: '15',
    label: 'Other assets',
    description: 'Other assets not classified above',
    keywords: ['other asset'],
  },
  {
    id: 'part-x-line-17',
    part: 'X',
    line: '17',
    label: 'Accounts payable and accrued expenses',
    description: 'Accounts payable and accrued expenses',
    keywords: ['accounts payable', 'AP', 'accrued expense', 'accrued liability'],
  },
  {
    id: 'part-x-line-18',
    part: 'X',
    line: '18',
    label: 'Grants payable',
    description: 'Grants payable',
    keywords: ['grants payable'],
  },
  {
    id: 'part-x-line-19',
    part: 'X',
    line: '19',
    label: 'Deferred revenue',
    description: 'Deferred revenue',
    keywords: ['deferred revenue', 'unearned revenue', 'advance payment'],
  },
  {
    id: 'part-x-line-20',
    part: 'X',
    line: '20',
    label: 'Tax-exempt bond liabilities',
    description: 'Tax-exempt bond liabilities',
    keywords: ['tax-exempt bond liability'],
  },
  {
    id: 'part-x-line-21',
    part: 'X',
    line: '21',
    label: 'Escrow or custodial account liability',
    description: 'Escrow or custodial account liability',
    keywords: ['escrow', 'custodial'],
  },
  {
    id: 'part-x-line-22',
    part: 'X',
    line: '22',
    label: 'Loans and other payables',
    description: 'Loans from officers, directors, key employees, and related persons',
    keywords: ['loan payable', 'note payable', 'mortgage', 'line of credit'],
  },
  {
    id: 'part-x-line-23',
    part: 'X',
    line: '23',
    label: 'Secured mortgages and notes payable',
    description: 'Secured mortgages and notes payable to unrelated third parties',
    keywords: ['mortgage payable', 'secured note'],
  },
  {
    id: 'part-x-line-24',
    part: 'X',
    line: '24',
    label: 'Unsecured notes and loans payable',
    description: 'Unsecured notes and loans payable to unrelated third parties',
    keywords: ['unsecured loan', 'unsecured note'],
  },
  {
    id: 'part-x-line-25',
    part: 'X',
    line: '25',
    label: 'Other liabilities',
    description: 'Other liabilities not classified above',
    keywords: ['other liability'],
  },
  {
    id: 'part-x-line-27',
    part: 'X',
    line: '27',
    label: 'Unrestricted net assets',
    description: 'Unrestricted net assets or fund balances',
    keywords: ['unrestricted', 'net assets without donor restrictions'],
  },
  {
    id: 'part-x-line-28',
    part: 'X',
    line: '28',
    label: 'Temporarily restricted net assets',
    description: 'Temporarily restricted net assets',
    keywords: ['temporarily restricted', 'net assets with donor restrictions'],
  },
  {
    id: 'part-x-line-29',
    part: 'X',
    line: '29',
    label: 'Permanently restricted net assets',
    description: 'Permanently restricted net assets',
    keywords: ['permanently restricted', 'endowment'],
  },
];

// ---------------------------------------------------------------------------
//  Validation
// ---------------------------------------------------------------------------

export const VALID_CATEGORY_IDS = new Set(CATEGORIES.map((c) => c.id));

export const irs990CategorySchema = z
  .string()
  .refine((id) => VALID_CATEGORY_IDS.has(id), {
    message: 'Invalid 990 category ID',
  });

export function isValidCategoryId(id: string): boolean {
  return VALID_CATEGORY_IDS.has(id);
}

// ---------------------------------------------------------------------------
//  Functional classification bridge
//  Maps fine-grained 990 line items → functional class for the existing UI
// ---------------------------------------------------------------------------

type FunctionalClass = 'program' | 'management' | 'fundraising' | 'revenue' | 'balance-sheet' | 'other';

const FUNDRAISING_LINES = new Set(['11e', '11d']);
const MANAGEMENT_LINES = new Set(['11a', '11b', '11c', '11f', '11g', '13', '14', '20', '22', '23']);

export function categoryToFunctionalClass(categoryId: string): FunctionalClass {
  if (categoryId.startsWith('part-viii-')) return 'revenue';
  if (categoryId.startsWith('part-x-')) return 'balance-sheet';

  if (categoryId.startsWith('part-ix-')) {
    const line = categoryId.replace('part-ix-line-', '');
    if (FUNDRAISING_LINES.has(line)) return 'fundraising';
    if (MANAGEMENT_LINES.has(line)) return 'management';
    return 'program';
  }

  return 'other';
}

export function getCategoryById(id: string): Category990 | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoriesByPart(part: string): Category990[] {
  return CATEGORIES.filter((c) => c.part === part);
}
