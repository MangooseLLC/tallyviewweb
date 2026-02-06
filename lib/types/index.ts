export type ProgramArea = 'Youth Services' | 'Health' | 'Education' | 'Environment' | 'Arts' | 'Housing' | 'Community Development' | 'Food Security';
export type ConnectedSystem = 'QuickBooks Online' | 'Xero' | 'Sage Intacct' | 'NetSuite' | 'FreshBooks';
export type Filing990Status = 'Current' | 'Overdue' | 'Delinquent';
export type AuditOpinion = 'Unqualified' | 'Qualified' | 'Adverse' | 'Disclaimer';
export type AlertSeverity = 'High' | 'Medium' | 'Low' | 'Info';
export type AlertCategory = 'Financial Health' | 'Governance' | 'Compliance' | 'Fraud Pattern' | 'Vendor' | 'Compensation' | 'Expense Allocation';
export type AlertStatus = 'New' | 'Reviewed' | 'Resolved' | 'Escalated';
export type CaseStage = 'Tip' | 'Analysis' | 'Discovery' | 'Filing' | 'Recovery';
export type PersonaRole = 'nonprofit' | 'foundation' | 'regulator' | 'investigator';

export interface Persona {
  id: string;
  name: string;
  title: string;
  organization: string;
  orgDetail: string;
  role: PersonaRole;
  description: string;
  avatar: string;
  color: string;
}

export interface BoardMember {
  id: string;
  name: string;
  title: string;
  organizationIds: string[];
  businessRelationships?: string[];
  address?: string;
}

export interface Vendor {
  id: string;
  name: string;
  totalPayments: number;
  paymentCount: number;
  address?: string;
  organizationIds: string[];
  relatedPartyFlag: boolean;
  relatedBoardMemberId?: string;
  soleSoureFlag: boolean;
}

export interface MonthlyFinancials {
  month: string; // YYYY-MM
  revenue: {
    contributions: number;
    grants: number;
    programServiceRevenue: number;
    investmentIncome: number;
    total: number;
  };
  expenses: {
    program: number;
    management: number;
    fundraising: number;
    total: number;
  };
  expensesByNature: {
    salaries: number;
    benefits: number;
    occupancy: number;
    travel: number;
    professionalFees: number;
    supplies: number;
    other: number;
  };
  cashPosition: number;
  netAssets: {
    unrestricted: number;
    temporarilyRestricted: number;
    permanentlyRestricted: number;
    total: number;
  };
}

export interface RestrictedFund {
  id: string;
  funder: string;
  grantName: string;
  amount: number;
  purpose: string;
  spent: number;
  remaining: number;
  utilizationPercent: number;
  complianceStatus: 'Compliant' | 'On Track' | 'At Risk' | 'Non-Compliant';
  deadline: string;
  startDate: string;
}

export interface Anomaly {
  id: string;
  organizationId: string;
  organizationName: string;
  severity: AlertSeverity;
  category: AlertCategory;
  description: string;
  detectedDate: string;
  status: AlertStatus;
  recommendedAction: string;
  aiConfidence: number;
}

export interface NonprofitOrg {
  id: string;
  name: string;
  ein: string;
  mission: string;
  programArea: ProgramArea;
  annualBudget: number;
  state: string;
  city: string;
  foundedYear: number;
  executiveDirector: string;
  riskScore: number;
  complianceScore: number;
  connectedSystem: ConnectedSystem;
  lastSync: string;
  filing990Status: Filing990Status;
  auditOpinion: AuditOpinion;
  boardMemberIds: string[];
  topVendorIds: string[];
  financials: MonthlyFinancials[];
  restrictedFunds: RestrictedFund[];
  anomalyIds: string[];
  programExpenseRatio: number;
  managementExpenseRatio: number;
  fundraisingExpenseRatio: number;
  cashReserveMonths: number;
  revenueYTD: number;
  expensesYTD: number;
  netAssetsTotal: number;
}

export interface Grant {
  id: string;
  foundationId: string;
  granteeId: string;
  granteeName: string;
  amount: number;
  programArea: ProgramArea;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Completed' | 'Suspended';
  utilizationPercent: number;
}

export interface InvestigationCase {
  id: string;
  caseName: string;
  targetOrgName: string;
  targetOrgId?: string;
  fraudType: string;
  estimatedRecovery: number;
  stage: CaseStage;
  assignedAttorney: string;
  lastActivity: string;
  openedDate: string;
  description: string;
  evidenceStrength: number;
  keyFindings: string[];
}

export interface FraudTypology {
  id: string;
  name: string;
  description: string;
  redFlags: string[];
  controlFailures: string[];
  detectionMethods: string[];
  exampleCases: string[];
  frequencyInData: number;
  category: string;
}

export interface Section990 {
  id: string;
  name: string;
  status: 'Complete' | 'In Progress' | 'Not Started';
  completion: number;
  notes: string;
  aiConfidence?: number;
}
