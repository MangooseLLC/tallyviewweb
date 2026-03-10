import { isValidCategoryId } from './taxonomy';

// ---------------------------------------------------------------------------
//  Deterministic QBO AccountType/SubType → IRS 990 category mapping
// ---------------------------------------------------------------------------

type RuleKey = string; // "AccountType" or "AccountType::AccountSubType"

/**
 * Priority lookup: first try "type::subType", then fall back to "type".
 * Values are 990 category IDs from taxonomy.ts.
 */
const ACCOUNT_RULES: Record<RuleKey, string> = {
  // ── Revenue (Part VIII) ─────────────────────────────────────────────
  'Income::ServiceFeeIncome':           'part-viii-line-2',
  'Income::SalesOfProductIncome':       'part-viii-line-10',
  'Income::OtherPrimaryIncome':         'part-viii-line-2',
  'Income::NonProfitIncome':            'part-viii-line-1',
  'Income::UnappliedCashPaymentIncome': 'part-viii-line-11',
  'Income':                             'part-viii-line-11',

  'Other Income::DividendIncome':       'part-viii-line-3',
  'Other Income::InterestEarned':       'part-viii-line-3',
  'Other Income::OtherInvestmentIncome':'part-viii-line-3',
  'Other Income::TaxExemptInterest':    'part-viii-line-3',
  'Other Income::GainLossOnSaleOfFixedAssets': 'part-viii-line-7',
  'Other Income::RentalIncomeNonOperating':    'part-viii-line-6',
  'Other Income::UnrealisedLossOnSecuritiesNetOfTax': 'part-viii-line-3',
  'Other Income':                       'part-viii-line-11',

  // ── Expenses (Part IX) ─────────────────────────────────────────────
  'Expense::PayrollExpenses':           'part-ix-line-7',
  'Expense::Salary And Wage':           'part-ix-line-7',
  'Expense::PayrollTaxExpenses':        'part-ix-line-10',
  'Expense::EmployeeBenefits':          'part-ix-line-9',
  'Expense::PensionAndProfitSharing':   'part-ix-line-8',

  'Expense::LegalAndProfessionalFees':  'part-ix-line-11g',
  'Expense::Legal':                     'part-ix-line-11b',
  'Expense::Accounting':                'part-ix-line-11c',
  'Expense::BookkeeperExpenses':        'part-ix-line-11c',
  'Expense::ManagementFee':             'part-ix-line-11a',
  'Expense::FundraisingExpense':        'part-ix-line-11e',
  'Expense::LobbyingExpense':           'part-ix-line-11d',
  'Expense::InvestmentManagementFee':   'part-ix-line-11f',

  'Expense::OfficeExpenses':            'part-ix-line-13',
  'Expense::OfficeGeneralAdministrativeExpenses': 'part-ix-line-13',
  'Expense::ShippingFreightDelivery':   'part-ix-line-13',
  'Expense::SuppliesMaterials':         'part-ix-line-13',
  'Expense::PrintingAndReproduction':   'part-ix-line-13',
  'Expense::Postage':                   'part-ix-line-13',
  'Expense::Stationery':                'part-ix-line-13',

  'Expense::Advertising':               'part-ix-line-12',
  'Expense::PromotionalMeals':          'part-ix-line-12',

  'Expense::RentOrLeaseOfBuildings':    'part-ix-line-16',
  'Expense::Rent':                      'part-ix-line-16',
  'Expense::Utilities':                 'part-ix-line-16',
  'Expense::RepairMaintenance':         'part-ix-line-16',
  'Expense::CleaningExpense':           'part-ix-line-16',
  'Expense::LandscapingExpense':        'part-ix-line-16',

  'Expense::Travel':                    'part-ix-line-17',
  'Expense::TravelMeals':              'part-ix-line-17',
  'Expense::Auto':                      'part-ix-line-17',
  'Expense::GasAndFuel':                'part-ix-line-17',
  'Expense::ParkingAndTolls':           'part-ix-line-17',

  'Expense::Entertainment':             'part-ix-line-19',
  'Expense::EntertainmentMeals':        'part-ix-line-19',
  'Expense::ConventionsAndMeetings':    'part-ix-line-19',
  'Expense::Training':                  'part-ix-line-19',

  'Expense::InterestPaid':              'part-ix-line-20',
  'Expense::MortgageInterest':          'part-ix-line-20',
  'Expense::FinanceCosts':              'part-ix-line-20',

  'Expense::DepreciationAndAmortisation': 'part-ix-line-22',
  'Expense::Depreciation':              'part-ix-line-22',
  'Expense::Amortization':              'part-ix-line-22',

  'Expense::Insurance':                 'part-ix-line-23',
  'Expense::GeneralInsurance':          'part-ix-line-23',
  'Expense::LiabilityInsurance':        'part-ix-line-23',
  'Expense::WorkersCompensation':       'part-ix-line-23',

  'Expense::GrantsAndDonations':        'part-ix-line-1',
  'Expense::CharitableContributions':   'part-ix-line-1',

  'Expense::TaxesPaid':                 'part-ix-line-24',
  'Expense::OtherBusinessExpenses':     'part-ix-line-24',
  'Expense::OtherMiscellaneousExpense': 'part-ix-line-24',
  'Expense::DuesSubscriptions':         'part-ix-line-24',
  'Expense::BankCharges':               'part-ix-line-24',
  'Expense::BadDebts':                  'part-ix-line-24',
  'Expense::PenaltiesSettlements':      'part-ix-line-24',
  'Expense::CostOfGoodsSold':           'part-ix-line-24',
  'Expense':                            'part-ix-line-24',

  'Other Expense':                      'part-ix-line-24',

  'Cost of Goods Sold':                 'part-ix-line-24',

  // ── Balance Sheet — Assets (Part X) ────────────────────────────────
  'Bank':                               'part-x-line-1',
  'Bank::Checking':                     'part-x-line-1',
  'Bank::Savings':                      'part-x-line-2',
  'Bank::MoneyMarket':                  'part-x-line-2',
  'Bank::RentsHeldInTrust':             'part-x-line-1',
  'Bank::TrustAccounts':                'part-x-line-1',
  'Bank::CashOnHand':                   'part-x-line-1',
  'Bank::CashAndCashEquivalents':       'part-x-line-1',

  'Accounts Receivable':                'part-x-line-4',
  'Other Current Asset::PrepaidExpenses': 'part-x-line-9',
  'Other Current Asset::Inventory':     'part-x-line-8',
  'Other Current Asset::LoansToOfficers': 'part-x-line-5',
  'Other Current Asset::AllowanceForBadDebts': 'part-x-line-4',
  'Other Current Asset::UndepositedFunds': 'part-x-line-1',
  'Other Current Asset':                'part-x-line-15',

  'Fixed Asset':                        'part-x-line-10',
  'Fixed Asset::Buildings':             'part-x-line-10',
  'Fixed Asset::LeaseholdImprovements': 'part-x-line-10',
  'Fixed Asset::FurnitureAndFixtures':  'part-x-line-10',
  'Fixed Asset::Vehicles':              'part-x-line-10',
  'Fixed Asset::MachineryAndEquipment': 'part-x-line-10',
  'Fixed Asset::Land':                  'part-x-line-10',
  'Fixed Asset::AccumulatedDepreciation': 'part-x-line-10',
  'Fixed Asset::OtherFixedAssets':      'part-x-line-10',

  'Other Asset':                        'part-x-line-15',
  'Other Asset::Goodwill':              'part-x-line-14',
  'Other Asset::IntangibleAssets':      'part-x-line-14',
  'Other Asset::Investments':           'part-x-line-11',
  'Other Asset::SecurityDeposits':      'part-x-line-15',

  // ── Balance Sheet — Liabilities (Part X) ───────────────────────────
  'Accounts Payable':                   'part-x-line-17',
  'Credit Card':                        'part-x-line-17',

  'Other Current Liability':            'part-x-line-17',
  'Other Current Liability::DeferredRevenue': 'part-x-line-19',
  'Other Current Liability::LineOfCredit':    'part-x-line-22',
  'Other Current Liability::PayrollLiabilities': 'part-x-line-17',
  'Other Current Liability::SalesTaxPayable':    'part-x-line-17',
  'Other Current Liability::LoansPayable':       'part-x-line-22',

  'Long Term Liability':                'part-x-line-23',
  'Long Term Liability::NotesPayable':  'part-x-line-23',
  'Long Term Liability::ShareholderNotesPayable': 'part-x-line-22',
  'Long Term Liability::OtherLongTermLiabilities': 'part-x-line-25',

  // ── Equity (Part X net assets) ─────────────────────────────────────
  'Equity':                             'part-x-line-27',
  'Equity::RetainedEarnings':           'part-x-line-27',
  'Equity::OpeningBalanceEquity':       'part-x-line-27',
  'Equity::PartnerContributions':       'part-x-line-27',
  'Equity::PartnerDistributions':       'part-x-line-27',
};

// ---------------------------------------------------------------------------
//  Account classification
// ---------------------------------------------------------------------------

export interface AccountInput {
  qboId: string;
  accountType: string;
  accountSubType: string | null;
}

export function classifyAccountByRules(account: AccountInput): string | null {
  if (account.accountSubType) {
    const specificKey = `${account.accountType}::${account.accountSubType}`;
    const match = ACCOUNT_RULES[specificKey];
    if (match && isValidCategoryId(match)) return match;
  }

  const generalKey = account.accountType;
  const match = ACCOUNT_RULES[generalKey];
  if (match && isValidCategoryId(match)) return match;

  return null;
}

// ---------------------------------------------------------------------------
//  Account lookup map for transaction derivation
// ---------------------------------------------------------------------------

export interface AccountWithCategory {
  qboId: string;
  irs990Category: string | null;
}

/**
 * Build a lookup: QBO account ID → irs990Category.
 * Used to derive a transaction's category from its linked account.
 */
export function buildAccountCategoryMap(
  accounts: AccountWithCategory[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const a of accounts) {
    if (a.irs990Category && isValidCategoryId(a.irs990Category)) {
      map.set(a.qboId, a.irs990Category);
    }
  }
  return map;
}
