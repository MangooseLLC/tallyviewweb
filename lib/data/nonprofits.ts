import { NonprofitOrg, MonthlyFinancials } from '../types';

function generateMonthlyFinancials(annualBudget: number, healthFactor: number, months: number = 24): MonthlyFinancials[] {
  const result: MonthlyFinancials[] = [];
  const monthlyBase = annualBudget / 12;
  let cashPosition = annualBudget * 0.2;
  let unrestricted = annualBudget * 0.4;
  let tempRestricted = annualBudget * 0.15;
  const permRestricted = annualBudget * 0.05;

  for (let i = 0; i < months; i++) {
    const date = new Date(2024, i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const seasonFactor = 1 + 0.15 * Math.sin((date.getMonth() - 3) * Math.PI / 6);
    const yearGrowth = i >= 12 ? 1.05 : 1.0;
    const noiseFactor = 0.9 + Math.random() * 0.2;

    const contributions = monthlyBase * 0.35 * seasonFactor * yearGrowth * noiseFactor;
    const grants = monthlyBase * 0.40 * (0.8 + Math.random() * 0.4) * yearGrowth;
    const programServiceRevenue = monthlyBase * 0.20 * seasonFactor * yearGrowth * noiseFactor;
    const investmentIncome = monthlyBase * 0.05 * (0.7 + Math.random() * 0.6);
    const totalRevenue = contributions + grants + programServiceRevenue + investmentIncome;

    const programRatio = 0.75 + (healthFactor / 100) * 0.08;
    const mgmtRatio = 0.12 + (1 - healthFactor / 100) * 0.06;
    const fundRatio = 1 - programRatio - mgmtRatio;

    const expenseBase = monthlyBase * 0.92 * yearGrowth * (0.9 + Math.random() * 0.2);
    const program = expenseBase * programRatio;
    const management = expenseBase * mgmtRatio;
    const fundraising = expenseBase * fundRatio;
    const totalExpenses = program + management + fundraising;

    const salaries = totalExpenses * 0.55;
    const benefits = totalExpenses * 0.12;
    const occupancy = totalExpenses * 0.10;
    const travel = totalExpenses * 0.05 * seasonFactor;
    const professionalFees = totalExpenses * 0.08;
    const supplies = totalExpenses * 0.06;
    const other = totalExpenses - salaries - benefits - occupancy - travel - professionalFees - supplies;

    cashPosition += (totalRevenue - totalExpenses);
    if (cashPosition < 0) cashPosition = annualBudget * 0.02;
    unrestricted += (totalRevenue - totalExpenses) * 0.6;
    tempRestricted += (totalRevenue - totalExpenses) * 0.3;

    result.push({
      month: monthStr,
      revenue: {
        contributions: Math.round(contributions),
        grants: Math.round(grants),
        programServiceRevenue: Math.round(programServiceRevenue),
        investmentIncome: Math.round(investmentIncome),
        total: Math.round(totalRevenue),
      },
      expenses: {
        program: Math.round(program),
        management: Math.round(management),
        fundraising: Math.round(fundraising),
        total: Math.round(totalExpenses),
      },
      expensesByNature: {
        salaries: Math.round(salaries),
        benefits: Math.round(benefits),
        occupancy: Math.round(occupancy),
        travel: Math.round(travel),
        professionalFees: Math.round(professionalFees),
        supplies: Math.round(supplies),
        other: Math.round(other),
      },
      cashPosition: Math.round(cashPosition),
      netAssets: {
        unrestricted: Math.round(unrestricted),
        temporarilyRestricted: Math.round(tempRestricted),
        permanentlyRestricted: Math.round(permRestricted),
        total: Math.round(unrestricted + tempRestricted + permRestricted),
      },
    });
  }
  return result;
}

export const nonprofits: NonprofitOrg[] = [
  // PRIMARY ORG - Katy Alyst's org
  {
    id: 'org-bright-futures',
    name: 'Bright Futures Youth Services',
    ein: '93-1234567',
    mission: 'Empowering underserved youth through education, mentorship, and community engagement programs across the Pacific Northwest.',
    programArea: 'Youth Services',
    annualBudget: 4200000,
    state: 'Oregon',
    city: 'Portland',
    foundedYear: 2008,
    executiveDirector: 'Katy Alyst',
    riskScore: 82,
    complianceScore: 92,
    connectedSystem: 'QuickBooks Online',
    lastSync: '2026-02-06T10:00:00',
    filing990Status: 'Current',
    auditOpinion: 'Unqualified',
    boardMemberIds: ['bm-002', 'bm-004', 'bm-006', 'bm-007', 'bm-008', 'bm-009'],
    topVendorIds: ['vendor-bright-star', 'vendor-001', 'vendor-002', 'vendor-003', 'vendor-004', 'vendor-005', 'vendor-006', 'vendor-007', 'vendor-008'],
    financials: generateMonthlyFinancials(4200000, 85),
    restrictedFunds: [
      { id: 'rf-001', funder: 'Gates Foundation', grantName: 'Youth STEM Grant', amount: 180000, purpose: 'STEM education programs for K-8 students', spent: 127400, remaining: 52600, utilizationPercent: 70.8, complianceStatus: 'Compliant', deadline: '2026-08-31', startDate: '2025-09-01' },
      { id: 'rf-002', funder: 'Oregon DCF', grantName: 'After-School Programs', amount: 95000, purpose: 'After-school care for at-risk youth', spent: 82100, remaining: 12900, utilizationPercent: 86.4, complianceStatus: 'Compliant', deadline: '2026-06-30', startDate: '2025-07-01' },
      { id: 'rf-003', funder: 'Meyer Memorial Trust', grantName: 'Community Engagement Initiative', amount: 250000, purpose: 'Community-based youth mentorship expansion', spent: 61200, remaining: 188800, utilizationPercent: 24.5, complianceStatus: 'On Track', deadline: '2027-03-31', startDate: '2025-04-01' },
      { id: 'rf-004', funder: 'Collins Foundation', grantName: 'Leadership Development', amount: 75000, purpose: 'Youth leadership training and workshops', spent: 48200, remaining: 26800, utilizationPercent: 64.3, complianceStatus: 'Compliant', deadline: '2026-12-31', startDate: '2025-01-01' },
      { id: 'rf-005', funder: 'Nike Community Impact', grantName: 'Sports & Wellness Program', amount: 120000, purpose: 'Youth sports and physical wellness programs', spent: 89400, remaining: 30600, utilizationPercent: 74.5, complianceStatus: 'Compliant', deadline: '2026-09-30', startDate: '2025-10-01' },
    ],
    anomalyIds: ['anom-001', 'anom-002', 'anom-003', 'anom-004', 'anom-046', 'anom-064', 'anom-075'],
    programExpenseRatio: 78.3,
    managementExpenseRatio: 14.1,
    fundraisingExpenseRatio: 7.6,
    cashReserveMonths: 3.2,
    revenueYTD: 3847291,
    expensesYTD: 3201488,
    netAssetsTotal: 2891044,
  },

  // HIGH-RISK ORGS
  {
    id: 'org-cascade',
    name: 'Cascade Community Alliance',
    ein: '93-2345678',
    mission: 'Building stronger communities through collaborative social services and advocacy.',
    programArea: 'Community Development',
    annualBudget: 1800000,
    state: 'Oregon',
    city: 'Portland',
    foundedYear: 2012,
    executiveDirector: 'John Reeves',
    riskScore: 31,
    complianceScore: 38,
    connectedSystem: 'QuickBooks Online',
    lastSync: '2026-01-15T14:30:00',
    filing990Status: 'Delinquent',
    auditOpinion: 'Qualified',
    boardMemberIds: ['bm-001', 'bm-003', 'bm-010', 'bm-011'],
    topVendorIds: ['vendor-reeves-assoc', 'vendor-gray-mgmt', 'vendor-welling-consulting', 'vendor-001'],
    financials: generateMonthlyFinancials(1800000, 30),
    restrictedFunds: [
      { id: 'rf-010', funder: 'Pacific NW Community Foundation', grantName: 'Community Services', amount: 350000, purpose: 'Community development programs', spent: 298000, remaining: 52000, utilizationPercent: 85.1, complianceStatus: 'At Risk', deadline: '2026-06-30', startDate: '2025-01-01' },
    ],
    anomalyIds: ['anom-005', 'anom-006', 'anom-007', 'anom-008', 'anom-009', 'anom-047', 'anom-048', 'anom-061', 'anom-074', 'anom-078'],
    programExpenseRatio: 58.2,
    managementExpenseRatio: 28.4,
    fundraisingExpenseRatio: 13.4,
    cashReserveMonths: 1.1,
    revenueYTD: 1044000,
    expensesYTD: 1520000,
    netAssetsTotal: 312000,
  },
  {
    id: 'org-portland-gardens',
    name: 'Portland Urban Gardens Initiative',
    ein: '93-3456789',
    mission: 'Creating sustainable urban green spaces and community gardens throughout Portland.',
    programArea: 'Environment',
    annualBudget: 1200000,
    state: 'Oregon',
    city: 'Portland',
    foundedYear: 2015,
    executiveDirector: 'Margaret White',
    riskScore: 38,
    complianceScore: 45,
    connectedSystem: 'Xero',
    lastSync: '2026-02-05T09:15:00',
    filing990Status: 'Current',
    auditOpinion: 'Unqualified',
    boardMemberIds: ['bm-001', 'bm-005', 'bm-012', 'bm-013'],
    topVendorIds: ['vendor-reeves-assoc', 'vendor-009', 'vendor-001'],
    financials: generateMonthlyFinancials(1200000, 35),
    restrictedFunds: [
      { id: 'rf-020', funder: 'Pacific NW Community Foundation', grantName: 'Green Spaces', amount: 175000, purpose: 'Urban garden development', spent: 112000, remaining: 63000, utilizationPercent: 64.0, complianceStatus: 'On Track', deadline: '2026-09-30', startDate: '2025-03-01' },
    ],
    anomalyIds: ['anom-010', 'anom-011', 'anom-012', 'anom-051', 'anom-062', 'anom-076'],
    programExpenseRatio: 61.0,
    managementExpenseRatio: 26.0,
    fundraisingExpenseRatio: 13.0,
    cashReserveMonths: 1.8,
    revenueYTD: 980000,
    expensesYTD: 1050000,
    netAssetsTotal: 445000,
  },
  {
    id: 'org-river-valley',
    name: 'River Valley Health Outreach',
    ein: '93-4567890',
    mission: 'Providing accessible healthcare services to underserved rural communities in the Willamette Valley.',
    programArea: 'Health',
    annualBudget: 2800000,
    state: 'Oregon',
    city: 'Salem',
    foundedYear: 2010,
    executiveDirector: 'Dr. James Patterson',
    riskScore: 42,
    complianceScore: 51,
    connectedSystem: 'Sage Intacct',
    lastSync: '2026-02-04T16:45:00',
    filing990Status: 'Overdue',
    auditOpinion: 'Qualified',
    boardMemberIds: ['bm-001', 'bm-014', 'bm-015'],
    topVendorIds: ['vendor-reeves-assoc', 'vendor-011', 'vendor-005'],
    financials: generateMonthlyFinancials(2800000, 40),
    restrictedFunds: [
      { id: 'rf-030', funder: 'Pacific NW Community Foundation', grantName: 'Rural Health Access', amount: 220000, purpose: 'Mobile health clinic expansion', spent: 145000, remaining: 75000, utilizationPercent: 65.9, complianceStatus: 'At Risk', deadline: '2026-07-31', startDate: '2025-02-01' },
    ],
    anomalyIds: ['anom-013', 'anom-014', 'anom-015', 'anom-052', 'anom-065', 'anom-080'],
    programExpenseRatio: 68.5,
    managementExpenseRatio: 21.0,
    fundraisingExpenseRatio: 10.5,
    cashReserveMonths: 0.7,
    revenueYTD: 2100000,
    expensesYTD: 2450000,
    netAssetsTotal: 520000,
  },
  {
    id: 'org-nw-digital',
    name: 'Northwest Digital Literacy Project',
    ein: '93-5678901',
    mission: 'Bridging the digital divide through technology education and access programs.',
    programArea: 'Education',
    annualBudget: 650000,
    state: 'Oregon',
    city: 'Portland',
    foundedYear: 2018,
    executiveDirector: 'Rachel Kim',
    riskScore: 44,
    complianceScore: 48,
    connectedSystem: 'QuickBooks Online',
    lastSync: '2025-12-21T11:00:00',
    filing990Status: 'Overdue',
    auditOpinion: 'Unqualified',
    boardMemberIds: ['bm-001', 'bm-016', 'bm-017'],
    topVendorIds: ['vendor-reeves-assoc', 'vendor-016', 'vendor-019'],
    financials: generateMonthlyFinancials(650000, 42),
    restrictedFunds: [
      { id: 'rf-040', funder: 'Pacific NW Community Foundation', grantName: 'Digital Access', amount: 90000, purpose: 'Computer labs in community centers', spent: 10800, remaining: 79200, utilizationPercent: 12.0, complianceStatus: 'At Risk', deadline: '2026-08-31', startDate: '2025-05-01' },
    ],
    anomalyIds: ['anom-016', 'anom-017', 'anom-018', 'anom-063', 'anom-077'],
    programExpenseRatio: 65.0,
    managementExpenseRatio: 24.0,
    fundraisingExpenseRatio: 11.0,
    cashReserveMonths: 1.4,
    revenueYTD: 410000,
    expensesYTD: 480000,
    netAssetsTotal: 178000,
  },

  // HEALTHY ORGS (remaining to reach 50+)
  { id: 'org-willamette-edu', name: 'Willamette Education Fund', ein: '93-6789012', mission: 'Supporting educational excellence in Willamette Valley schools.', programArea: 'Education', annualBudget: 8500000, state: 'Oregon', city: 'Salem', foundedYear: 2001, executiveDirector: 'Dr. Patricia Huang', riskScore: 88, complianceScore: 94, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T08:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-018'], topVendorIds: ['vendor-002', 'vendor-010'], financials: generateMonthlyFinancials(8500000, 90), restrictedFunds: [], anomalyIds: ['anom-019', 'anom-053'], programExpenseRatio: 82.1, managementExpenseRatio: 11.4, fundraisingExpenseRatio: 6.5, cashReserveMonths: 4.8, revenueYTD: 7200000, expensesYTD: 6800000, netAssetsTotal: 12500000 },
  { id: 'org-columbia-health', name: 'Columbia Gorge Health Initiative', ein: '93-7890123', mission: 'Improving community health outcomes across the Columbia Gorge region.', programArea: 'Health', annualBudget: 5200000, state: 'Oregon', city: 'Hood River', foundedYear: 2005, executiveDirector: 'Dr. Michael Chen', riskScore: 72, complianceScore: 78, connectedSystem: 'NetSuite', lastSync: '2026-02-06T07:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-019'], topVendorIds: ['vendor-011', 'vendor-018'], financials: generateMonthlyFinancials(5200000, 75), restrictedFunds: [], anomalyIds: ['anom-020', 'anom-055'], programExpenseRatio: 76.5, managementExpenseRatio: 15.2, fundraisingExpenseRatio: 8.3, cashReserveMonths: 3.1, revenueYTD: 4400000, expensesYTD: 4100000, netAssetsTotal: 5800000 },
  { id: 'org-metro-housing', name: 'Metro Portland Housing Alliance', ein: '93-8901234', mission: 'Creating affordable housing solutions for Portland metro area families.', programArea: 'Housing', annualBudget: 12000000, state: 'Oregon', city: 'Portland', foundedYear: 1998, executiveDirector: 'James Wilson', riskScore: 76, complianceScore: 81, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T09:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-020'], topVendorIds: ['vendor-013'], financials: generateMonthlyFinancials(12000000, 78), restrictedFunds: [], anomalyIds: ['anom-021', 'anom-054'], programExpenseRatio: 80.2, managementExpenseRatio: 13.1, fundraisingExpenseRatio: 6.7, cashReserveMonths: 2.9, revenueYTD: 10200000, expensesYTD: 9800000, netAssetsTotal: 18400000 },
  { id: 'org-coast-enviro', name: 'Oregon Coast Environmental Trust', ein: '93-9012345', mission: 'Protecting and preserving the Oregon coastline through conservation and education.', programArea: 'Environment', annualBudget: 3400000, state: 'Oregon', city: 'Newport', foundedYear: 2003, executiveDirector: 'Karen Miller', riskScore: 85, complianceScore: 89, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T16:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-021'], topVendorIds: ['vendor-014'], financials: generateMonthlyFinancials(3400000, 86), restrictedFunds: [], anomalyIds: ['anom-022', 'anom-056'], programExpenseRatio: 79.8, managementExpenseRatio: 12.7, fundraisingExpenseRatio: 7.5, cashReserveMonths: 4.2, revenueYTD: 2900000, expensesYTD: 2700000, netAssetsTotal: 4200000 },
  { id: 'org-bend-youth', name: 'Bend Youth & Family Services', ein: '93-0123456', mission: 'Supporting families and youth in Central Oregon through counseling and advocacy.', programArea: 'Youth Services', annualBudget: 2100000, state: 'Oregon', city: 'Bend', foundedYear: 2007, executiveDirector: 'Amanda Brooks', riskScore: 68, complianceScore: 74, connectedSystem: 'Xero', lastSync: '2026-02-06T06:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-022'], topVendorIds: ['vendor-010', 'vendor-019'], financials: generateMonthlyFinancials(2100000, 70), restrictedFunds: [], anomalyIds: ['anom-023', 'anom-057'], programExpenseRatio: 74.5, managementExpenseRatio: 16.8, fundraisingExpenseRatio: 8.7, cashReserveMonths: 2.6, revenueYTD: 1780000, expensesYTD: 1650000, netAssetsTotal: 1950000 },
  { id: 'org-salem-food', name: 'Salem Community Food Bank', ein: '93-1122334', mission: 'Eliminating hunger in the Salem community through food distribution and nutrition education.', programArea: 'Food Security', annualBudget: 4800000, state: 'Oregon', city: 'Salem', foundedYear: 1995, executiveDirector: 'Robert Garcia', riskScore: 84, complianceScore: 88, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T10:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-023'], topVendorIds: ['vendor-015'], financials: generateMonthlyFinancials(4800000, 85), restrictedFunds: [], anomalyIds: ['anom-024', 'anom-058'], programExpenseRatio: 81.3, managementExpenseRatio: 12.2, fundraisingExpenseRatio: 6.5, cashReserveMonths: 3.5, revenueYTD: 4100000, expensesYTD: 3800000, netAssetsTotal: 5600000 },
  { id: 'org-eugene-arts', name: 'Eugene Arts Collective', ein: '93-2233445', mission: 'Fostering artistic expression and cultural vibrancy in the Eugene community.', programArea: 'Arts', annualBudget: 1400000, state: 'Oregon', city: 'Eugene', foundedYear: 2011, executiveDirector: 'Diana Lee', riskScore: 78, complianceScore: 83, connectedSystem: 'FreshBooks', lastSync: '2026-02-05T14:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-024'], topVendorIds: ['vendor-012'], financials: generateMonthlyFinancials(1400000, 80), restrictedFunds: [], anomalyIds: ['anom-025', 'anom-059'], programExpenseRatio: 77.2, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.3, cashReserveMonths: 3.0, revenueYTD: 1180000, expensesYTD: 1100000, netAssetsTotal: 1650000 },
  { id: 'org-medford-health', name: 'Medford Community Health Center', ein: '93-3344556', mission: 'Providing comprehensive healthcare to underserved populations in Southern Oregon.', programArea: 'Health', annualBudget: 6800000, state: 'Oregon', city: 'Medford', foundedYear: 2000, executiveDirector: 'Dr. Lisa Chang', riskScore: 66, complianceScore: 72, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T08:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-025'], topVendorIds: ['vendor-011', 'vendor-020'], financials: generateMonthlyFinancials(6800000, 68), restrictedFunds: [], anomalyIds: ['anom-026', 'anom-060'], programExpenseRatio: 75.8, managementExpenseRatio: 16.0, fundraisingExpenseRatio: 8.2, cashReserveMonths: 2.4, revenueYTD: 5700000, expensesYTD: 5500000, netAssetsTotal: 7200000 },
  { id: 'org-portland-literacy', name: 'Portland Literacy Network', ein: '93-4455667', mission: 'Advancing literacy and lifelong learning across Portland communities.', programArea: 'Education', annualBudget: 1600000, state: 'Oregon', city: 'Portland', foundedYear: 2013, executiveDirector: 'Tom Washington', riskScore: 80, complianceScore: 85, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T09:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-004'], topVendorIds: ['vendor-016'], financials: generateMonthlyFinancials(1600000, 82), restrictedFunds: [], anomalyIds: ['anom-027'], programExpenseRatio: 78.9, managementExpenseRatio: 13.6, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.4, revenueYTD: 1350000, expensesYTD: 1280000, netAssetsTotal: 1890000 },
  { id: 'org-green-spaces', name: 'Green Spaces Portland', ein: '93-5566778', mission: 'Creating and maintaining urban green spaces for community wellness.', programArea: 'Environment', annualBudget: 900000, state: 'Oregon', city: 'Portland', foundedYear: 2016, executiveDirector: 'Amy Morrison', riskScore: 86, complianceScore: 90, connectedSystem: 'Xero', lastSync: '2026-02-06T07:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-005'], topVendorIds: [], financials: generateMonthlyFinancials(900000, 87), restrictedFunds: [], anomalyIds: ['anom-028'], programExpenseRatio: 80.5, managementExpenseRatio: 12.0, fundraisingExpenseRatio: 7.5, cashReserveMonths: 4.0, revenueYTD: 760000, expensesYTD: 710000, netAssetsTotal: 1100000 },
  { id: 'org-cascade-alliance', name: 'Cascade Alliance for Children', ein: '93-6677889', mission: 'Advocating for children\'s rights and welfare in the Cascade region.', programArea: 'Youth Services', annualBudget: 2400000, state: 'Oregon', city: 'Bend', foundedYear: 2009, executiveDirector: 'Christine Yang', riskScore: 75, complianceScore: 80, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T15:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-002'], topVendorIds: [], financials: generateMonthlyFinancials(2400000, 77), restrictedFunds: [], anomalyIds: ['anom-029'], programExpenseRatio: 77.0, managementExpenseRatio: 14.8, fundraisingExpenseRatio: 8.2, cashReserveMonths: 3.1, revenueYTD: 2030000, expensesYTD: 1920000, netAssetsTotal: 2800000 },
  { id: 'org-metro-arts', name: 'Metro Arts Council', ein: '93-7788990', mission: 'Supporting arts education and cultural programming across the Portland metro area.', programArea: 'Arts', annualBudget: 3100000, state: 'Oregon', city: 'Portland', foundedYear: 2004, executiveDirector: 'Victoria Nash', riskScore: 71, complianceScore: 76, connectedSystem: 'NetSuite', lastSync: '2026-02-06T08:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: ['bm-003'], topVendorIds: ['vendor-welling-consulting', 'vendor-009'], financials: generateMonthlyFinancials(3100000, 73), restrictedFunds: [], anomalyIds: ['anom-030', 'anom-079'], programExpenseRatio: 75.5, managementExpenseRatio: 15.8, fundraisingExpenseRatio: 8.7, cashReserveMonths: 2.8, revenueYTD: 2620000, expensesYTD: 2480000, netAssetsTotal: 3500000 },

  // Additional orgs to reach 50+
  { id: 'org-hood-river', name: 'Hood River Conservation Society', ein: '93-8899001', mission: 'Preserving natural resources and habitat in the Hood River Valley.', programArea: 'Environment', annualBudget: 1100000, state: 'Oregon', city: 'Hood River', foundedYear: 2014, executiveDirector: 'Mark Stevens', riskScore: 83, complianceScore: 87, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T13:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1100000, 84), restrictedFunds: [], anomalyIds: ['anom-031', 'anom-066'], programExpenseRatio: 79.2, managementExpenseRatio: 13.1, fundraisingExpenseRatio: 7.7, cashReserveMonths: 3.6, revenueYTD: 930000, expensesYTD: 870000, netAssetsTotal: 1350000 },
  { id: 'org-klamath-youth', name: 'Klamath Youth Development', ein: '93-9900112', mission: 'Nurturing leadership and potential in Klamath Basin youth.', programArea: 'Youth Services', annualBudget: 780000, state: 'Oregon', city: 'Klamath Falls', foundedYear: 2017, executiveDirector: 'Jennifer Blackwood', riskScore: 77, complianceScore: 81, connectedSystem: 'Xero', lastSync: '2026-02-06T06:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(780000, 79), restrictedFunds: [], anomalyIds: ['anom-032', 'anom-067'], programExpenseRatio: 76.8, managementExpenseRatio: 14.9, fundraisingExpenseRatio: 8.3, cashReserveMonths: 3.2, revenueYTD: 660000, expensesYTD: 620000, netAssetsTotal: 920000 },
  { id: 'org-ashland-theater', name: 'Ashland Community Theater', ein: '93-0011223', mission: 'Enriching Southern Oregon through accessible performing arts.', programArea: 'Arts', annualBudget: 950000, state: 'Oregon', city: 'Ashland', foundedYear: 2006, executiveDirector: 'Robert Lane', riskScore: 79, complianceScore: 84, connectedSystem: 'FreshBooks', lastSync: '2026-02-05T12:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(950000, 81), restrictedFunds: [], anomalyIds: ['anom-033', 'anom-068'], programExpenseRatio: 77.5, managementExpenseRatio: 14.2, fundraisingExpenseRatio: 8.3, cashReserveMonths: 3.0, revenueYTD: 800000, expensesYTD: 750000, netAssetsTotal: 1100000 },
  { id: 'org-corvallis-stem', name: 'Corvallis STEM Academy', ein: '93-1122335', mission: 'Advancing STEM education for Oregon youth through hands-on learning.', programArea: 'Education', annualBudget: 2200000, state: 'Oregon', city: 'Corvallis', foundedYear: 2015, executiveDirector: 'Dr. Neil Patel', riskScore: 81, complianceScore: 86, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T09:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2200000, 83), restrictedFunds: [], anomalyIds: ['anom-034', 'anom-069'], programExpenseRatio: 79.5, managementExpenseRatio: 13.0, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.4, revenueYTD: 1860000, expensesYTD: 1750000, netAssetsTotal: 2600000 },
  { id: 'org-grants-pass', name: 'Grants Pass Community Kitchen', ein: '93-2233446', mission: 'Fighting hunger and food insecurity in Josephine County.', programArea: 'Food Security', annualBudget: 1500000, state: 'Oregon', city: 'Grants Pass', foundedYear: 2010, executiveDirector: 'Maria Gonzalez', riskScore: 65, complianceScore: 70, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T14:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1500000, 67), restrictedFunds: [], anomalyIds: ['anom-035', 'anom-070'], programExpenseRatio: 75.0, managementExpenseRatio: 16.5, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.0, revenueYTD: 1270000, expensesYTD: 1200000, netAssetsTotal: 1680000 },
  { id: 'org-albany-housing', name: 'Albany Affordable Housing Corp', ein: '93-3344557', mission: 'Developing and managing affordable housing in the mid-Willamette Valley.', programArea: 'Housing', annualBudget: 7500000, state: 'Oregon', city: 'Albany', foundedYear: 2002, executiveDirector: 'Frank Dawson', riskScore: 55, complianceScore: 62, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T07:45:00', filing990Status: 'Overdue', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(7500000, 57), restrictedFunds: [], anomalyIds: ['anom-036', 'anom-071', 'anom-081'], programExpenseRatio: 73.2, managementExpenseRatio: 17.5, fundraisingExpenseRatio: 9.3, cashReserveMonths: 2.1, revenueYTD: 6350000, expensesYTD: 6100000, netAssetsTotal: 9200000 },
  { id: 'org-pendleton-rodeo', name: 'Pendleton Heritage Foundation', ein: '93-4455668', mission: 'Preserving Eastern Oregon cultural heritage and traditions.', programArea: 'Arts', annualBudget: 600000, state: 'Oregon', city: 'Pendleton', foundedYear: 2008, executiveDirector: 'Bill Crawford', riskScore: 82, complianceScore: 86, connectedSystem: 'FreshBooks', lastSync: '2026-02-04T10:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(600000, 83), restrictedFunds: [], anomalyIds: ['anom-037'], programExpenseRatio: 78.0, managementExpenseRatio: 14.0, fundraisingExpenseRatio: 8.0, cashReserveMonths: 4.5, revenueYTD: 510000, expensesYTD: 480000, netAssetsTotal: 750000 },
  { id: 'org-astoria-marine', name: 'Astoria Marine Research Center', ein: '93-5566779', mission: 'Advancing marine science and coastal ecosystem research.', programArea: 'Environment', annualBudget: 3800000, state: 'Oregon', city: 'Astoria', foundedYear: 2006, executiveDirector: 'Dr. Eric Larson', riskScore: 69, complianceScore: 73, connectedSystem: 'NetSuite', lastSync: '2026-02-05T11:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(3800000, 71), restrictedFunds: [], anomalyIds: ['anom-038'], programExpenseRatio: 76.0, managementExpenseRatio: 15.5, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.7, revenueYTD: 3220000, expensesYTD: 3050000, netAssetsTotal: 4600000 },
  { id: 'org-tillamook-ag', name: 'Tillamook Agricultural Education', ein: '93-6677880', mission: 'Promoting sustainable agriculture education in Tillamook County.', programArea: 'Education', annualBudget: 450000, state: 'Oregon', city: 'Tillamook', foundedYear: 2019, executiveDirector: 'Sarah Jensen', riskScore: 84, complianceScore: 88, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T08:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(450000, 85), restrictedFunds: [], anomalyIds: ['anom-039'], programExpenseRatio: 80.0, managementExpenseRatio: 12.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.8, revenueYTD: 380000, expensesYTD: 355000, netAssetsTotal: 520000 },
  { id: 'org-roseburg-health', name: 'Roseburg Rural Health Network', ein: '93-7788991', mission: 'Connecting rural communities with essential healthcare services.', programArea: 'Health', annualBudget: 4100000, state: 'Oregon', city: 'Roseburg', foundedYear: 2004, executiveDirector: 'Dr. Christine Palmer', riskScore: 70, complianceScore: 75, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T07:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(4100000, 72), restrictedFunds: [], anomalyIds: ['anom-040', 'anom-082'], programExpenseRatio: 76.5, managementExpenseRatio: 15.0, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.5, revenueYTD: 3470000, expensesYTD: 3300000, netAssetsTotal: 4900000 },
  { id: 'org-hermiston-family', name: 'Hermiston Family Services', ein: '93-8899002', mission: 'Supporting families through crisis intervention and community programs.', programArea: 'Community Development', annualBudget: 1300000, state: 'Oregon', city: 'Hermiston', foundedYear: 2012, executiveDirector: 'Nancy Rodriguez', riskScore: 81, complianceScore: 85, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T16:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1300000, 82), restrictedFunds: [], anomalyIds: ['anom-041', 'anom-083'], programExpenseRatio: 78.5, managementExpenseRatio: 13.5, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.3, revenueYTD: 1100000, expensesYTD: 1040000, netAssetsTotal: 1550000 },
  { id: 'org-newport-ocean', name: 'Newport Ocean Conservation', ein: '93-9900113', mission: 'Protecting marine ecosystems through research and advocacy.', programArea: 'Environment', annualBudget: 2600000, state: 'Oregon', city: 'Newport', foundedYear: 2007, executiveDirector: 'Dr. Janet Wu', riskScore: 67, complianceScore: 73, connectedSystem: 'Xero', lastSync: '2026-02-06T09:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2600000, 69), restrictedFunds: [], anomalyIds: ['anom-042', 'anom-084'], programExpenseRatio: 75.8, managementExpenseRatio: 15.5, fundraisingExpenseRatio: 8.7, cashReserveMonths: 2.3, revenueYTD: 2200000, expensesYTD: 2100000, netAssetsTotal: 3100000 },
  { id: 'org-coos-bay', name: 'Coos Bay Community Foundation', ein: '93-0011224', mission: 'Building community capacity through strategic grantmaking and leadership.', programArea: 'Community Development', annualBudget: 5500000, state: 'Oregon', city: 'Coos Bay', foundedYear: 1999, executiveDirector: 'George Mitchell', riskScore: 79, complianceScore: 83, connectedSystem: 'NetSuite', lastSync: '2026-02-05T15:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(5500000, 80), restrictedFunds: [], anomalyIds: ['anom-043', 'anom-085'], programExpenseRatio: 77.5, managementExpenseRatio: 14.2, fundraisingExpenseRatio: 8.3, cashReserveMonths: 3.0, revenueYTD: 4650000, expensesYTD: 4400000, netAssetsTotal: 6500000 },
  { id: 'org-the-dalles', name: 'The Dalles Heritage Museum', ein: '93-1122336', mission: 'Preserving and sharing the rich history of the Columbia Plateau.', programArea: 'Arts', annualBudget: 380000, state: 'Oregon', city: 'The Dalles', foundedYear: 2001, executiveDirector: 'Helen Baker', riskScore: 87, complianceScore: 91, connectedSystem: 'FreshBooks', lastSync: '2026-02-04T11:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(380000, 88), restrictedFunds: [], anomalyIds: ['anom-044'], programExpenseRatio: 81.0, managementExpenseRatio: 12.0, fundraisingExpenseRatio: 7.0, cashReserveMonths: 5.2, revenueYTD: 320000, expensesYTD: 300000, netAssetsTotal: 480000 },
  { id: 'org-mcminnville-wine', name: 'McMinnville Arts & Culture', ein: '93-2233447', mission: 'Celebrating arts and cultural diversity in Yamhill County.', programArea: 'Arts', annualBudget: 720000, state: 'Oregon', city: 'McMinnville', foundedYear: 2014, executiveDirector: 'Laura Simmons', riskScore: 73, complianceScore: 77, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T10:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(720000, 75), restrictedFunds: [], anomalyIds: ['anom-045'], programExpenseRatio: 76.0, managementExpenseRatio: 15.5, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.8, revenueYTD: 610000, expensesYTD: 575000, netAssetsTotal: 850000 },
  { id: 'org-springfield-ed', name: 'Springfield Education Alliance', ein: '93-3344558', mission: 'Improving educational outcomes for Springfield area students.', programArea: 'Education', annualBudget: 1800000, state: 'Oregon', city: 'Springfield', foundedYear: 2011, executiveDirector: 'Michael Brown', riskScore: 80, complianceScore: 84, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T08:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1800000, 82), restrictedFunds: [], anomalyIds: ['anom-049', 'anom-072'], programExpenseRatio: 78.0, managementExpenseRatio: 14.0, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.1, revenueYTD: 1520000, expensesYTD: 1440000, netAssetsTotal: 2100000 },
  { id: 'org-lake-oswego', name: 'Lake Oswego Youth Athletics', ein: '93-4455669', mission: 'Providing youth sports and recreation programs in the Lake Oswego area.', programArea: 'Youth Services', annualBudget: 850000, state: 'Oregon', city: 'Lake Oswego', foundedYear: 2016, executiveDirector: 'Chris Andrews', riskScore: 76, complianceScore: 80, connectedSystem: 'Xero', lastSync: '2026-02-06T07:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(850000, 78), restrictedFunds: [], anomalyIds: ['anom-050', 'anom-073'], programExpenseRatio: 76.5, managementExpenseRatio: 15.0, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.9, revenueYTD: 720000, expensesYTD: 680000, netAssetsTotal: 1020000 },

  // Additional to reach 50+
  { id: 'org-31', name: 'Central Oregon Food Hub', ein: '93-5501001', mission: 'Connecting local farmers with food-insecure communities.', programArea: 'Food Security', annualBudget: 920000, state: 'Oregon', city: 'Redmond', foundedYear: 2018, executiveDirector: 'Jason Fields', riskScore: 83, complianceScore: 87, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T06:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(920000, 84), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 79.0, managementExpenseRatio: 13.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.5, revenueYTD: 780000, expensesYTD: 730000, netAssetsTotal: 1100000 },
  { id: 'org-32', name: 'Deschutes River Conservancy', ein: '93-5501002', mission: 'Restoring and protecting the Deschutes River watershed.', programArea: 'Environment', annualBudget: 2100000, state: 'Oregon', city: 'Bend', foundedYear: 2003, executiveDirector: 'Peter Morrison', riskScore: 87, complianceScore: 91, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T09:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2100000, 88), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 81.0, managementExpenseRatio: 12.0, fundraisingExpenseRatio: 7.0, cashReserveMonths: 4.2, revenueYTD: 1780000, expensesYTD: 1680000, netAssetsTotal: 2800000 },
  { id: 'org-33', name: 'Portland Immigrant Welcome Center', ein: '93-5501003', mission: 'Helping immigrants and refugees build new lives in Portland.', programArea: 'Community Development', annualBudget: 3200000, state: 'Oregon', city: 'Portland', foundedYear: 2008, executiveDirector: 'Amira Hassan', riskScore: 84, complianceScore: 88, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T10:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(3200000, 85), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 80.0, managementExpenseRatio: 12.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.3, revenueYTD: 2710000, expensesYTD: 2560000, netAssetsTotal: 3800000 },
  { id: 'org-34', name: 'Southern Oregon Land Trust', ein: '93-5501004', mission: 'Conserving working farms, forests, and natural areas in Southern Oregon.', programArea: 'Environment', annualBudget: 4500000, state: 'Oregon', city: 'Medford', foundedYear: 2001, executiveDirector: 'Daniel Hayes', riskScore: 89, complianceScore: 93, connectedSystem: 'NetSuite', lastSync: '2026-02-06T08:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(4500000, 90), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 82.0, managementExpenseRatio: 11.5, fundraisingExpenseRatio: 6.5, cashReserveMonths: 5.0, revenueYTD: 3820000, expensesYTD: 3600000, netAssetsTotal: 6200000 },
  { id: 'org-35', name: 'Eugene Family YMCA', ein: '93-5501005', mission: 'Building healthy spirit, mind and body for all in Lane County.', programArea: 'Youth Services', annualBudget: 9200000, state: 'Oregon', city: 'Eugene', foundedYear: 1952, executiveDirector: 'Mark Reinhart', riskScore: 90, complianceScore: 94, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T07:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(9200000, 91), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 83.0, managementExpenseRatio: 11.0, fundraisingExpenseRatio: 6.0, cashReserveMonths: 4.5, revenueYTD: 7800000, expensesYTD: 7350000, netAssetsTotal: 14000000 },
  { id: 'org-36', name: 'Hillsboro Technology Education', ein: '93-5501006', mission: 'Providing technology training and digital skills to underserved communities.', programArea: 'Education', annualBudget: 1600000, state: 'Oregon', city: 'Hillsboro', foundedYear: 2017, executiveDirector: 'Rachel Park', riskScore: 82, complianceScore: 86, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T09:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1600000, 83), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 78.5, managementExpenseRatio: 13.5, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.2, revenueYTD: 1350000, expensesYTD: 1280000, netAssetsTotal: 1900000 },
  { id: 'org-37', name: 'Beaverton Community Health', ein: '93-5501007', mission: 'Promoting health equity in the Beaverton community.', programArea: 'Health', annualBudget: 2400000, state: 'Oregon', city: 'Beaverton', foundedYear: 2012, executiveDirector: 'Dr. Sharon Lee', riskScore: 78, complianceScore: 82, connectedSystem: 'Xero', lastSync: '2026-02-06T10:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2400000, 79), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 77.0, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.8, revenueYTD: 2030000, expensesYTD: 1920000, netAssetsTotal: 2800000 },
  { id: 'org-38', name: 'Gresham Arts Center', ein: '93-5501008', mission: 'Making the arts accessible to all Gresham residents.', programArea: 'Arts', annualBudget: 580000, state: 'Oregon', city: 'Gresham', foundedYear: 2015, executiveDirector: 'Emily Watson', riskScore: 85, complianceScore: 89, connectedSystem: 'FreshBooks', lastSync: '2026-02-05T14:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(580000, 86), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 79.5, managementExpenseRatio: 13.0, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.8, revenueYTD: 490000, expensesYTD: 460000, netAssetsTotal: 700000 },
  { id: 'org-39', name: 'Tigard-Tualatin Family Center', ein: '93-5501009', mission: 'Strengthening families through education, support, and community connection.', programArea: 'Community Development', annualBudget: 1100000, state: 'Oregon', city: 'Tigard', foundedYear: 2013, executiveDirector: 'Michelle Torres', riskScore: 81, complianceScore: 85, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T08:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1100000, 82), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 78.0, managementExpenseRatio: 14.0, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.0, revenueYTD: 930000, expensesYTD: 880000, netAssetsTotal: 1300000 },
  { id: 'org-40', name: 'Clackamas County Housing Authority', ein: '93-5501010', mission: 'Providing affordable housing solutions in Clackamas County.', programArea: 'Housing', annualBudget: 8700000, state: 'Oregon', city: 'Oregon City', foundedYear: 1996, executiveDirector: 'Richard Green', riskScore: 77, complianceScore: 81, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T09:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(8700000, 78), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 77.5, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.0, cashReserveMonths: 2.5, revenueYTD: 7380000, expensesYTD: 6960000, netAssetsTotal: 11500000 },

  // Fill to 50+
  { id: 'org-41', name: 'Multnomah Youth Partnership', ein: '93-5501011', mission: 'Connecting at-risk youth with mentors and opportunities.', programArea: 'Youth Services', annualBudget: 1900000, state: 'Oregon', city: 'Portland', foundedYear: 2009, executiveDirector: 'Kevin Hill', riskScore: 79, complianceScore: 83, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T10:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(1900000, 80), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 77.5, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.1, revenueYTD: 1610000, expensesYTD: 1520000, netAssetsTotal: 2200000 },
  { id: 'org-42', name: 'Marion County Food Network', ein: '93-5501012', mission: 'Coordinating food assistance across Marion County.', programArea: 'Food Security', annualBudget: 3400000, state: 'Oregon', city: 'Salem', foundedYear: 2005, executiveDirector: 'Patricia Gomez', riskScore: 86, complianceScore: 90, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T07:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(3400000, 87), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 80.5, managementExpenseRatio: 12.5, fundraisingExpenseRatio: 7.0, cashReserveMonths: 3.8, revenueYTD: 2880000, expensesYTD: 2720000, netAssetsTotal: 4100000 },
  { id: 'org-43', name: 'Rogue Valley Health Foundation', ein: '93-5501013', mission: 'Improving health outcomes across the Rogue Valley.', programArea: 'Health', annualBudget: 5800000, state: 'Oregon', city: 'Ashland', foundedYear: 2002, executiveDirector: 'Dr. Sandra Kim', riskScore: 85, complianceScore: 89, connectedSystem: 'NetSuite', lastSync: '2026-02-06T08:15:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(5800000, 86), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 80.0, managementExpenseRatio: 13.0, fundraisingExpenseRatio: 7.0, cashReserveMonths: 4.0, revenueYTD: 4920000, expensesYTD: 4640000, netAssetsTotal: 7500000 },
  { id: 'org-44', name: 'Washington County Education Fund', ein: '93-5501014', mission: 'Supporting public education excellence in Washington County.', programArea: 'Education', annualBudget: 2900000, state: 'Oregon', city: 'Hillsboro', foundedYear: 2007, executiveDirector: 'Janet Phillips', riskScore: 83, complianceScore: 87, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T09:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2900000, 84), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 79.0, managementExpenseRatio: 13.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.5, revenueYTD: 2460000, expensesYTD: 2320000, netAssetsTotal: 3500000 },
  { id: 'org-45', name: 'Lane County Housing Services', ein: '93-5501015', mission: 'Providing housing assistance and homeless prevention services.', programArea: 'Housing', annualBudget: 6200000, state: 'Oregon', city: 'Eugene', foundedYear: 2000, executiveDirector: 'Thomas Reed', riskScore: 74, complianceScore: 79, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T07:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(6200000, 76), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 76.5, managementExpenseRatio: 15.0, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.6, revenueYTD: 5260000, expensesYTD: 4960000, netAssetsTotal: 8200000 },
  { id: 'org-46', name: 'Yamhill Valley Arts Alliance', ein: '93-5501016', mission: 'Nurturing creativity and artistic expression in Yamhill Valley.', programArea: 'Arts', annualBudget: 420000, state: 'Oregon', city: 'Newberg', foundedYear: 2020, executiveDirector: 'Claire Bennett', riskScore: 88, complianceScore: 92, connectedSystem: 'FreshBooks', lastSync: '2026-02-05T13:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(420000, 89), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 80.0, managementExpenseRatio: 12.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 4.2, revenueYTD: 356000, expensesYTD: 335000, netAssetsTotal: 520000 },
  { id: 'org-47', name: 'Portland Veterans Outreach', ein: '93-5501017', mission: 'Supporting veterans transitioning to civilian life in Portland.', programArea: 'Community Development', annualBudget: 2700000, state: 'Oregon', city: 'Portland', foundedYear: 2010, executiveDirector: 'Major (Ret.) David Kim', riskScore: 82, complianceScore: 86, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-06T10:00:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(2700000, 83), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 79.0, managementExpenseRatio: 13.5, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.3, revenueYTD: 2290000, expensesYTD: 2160000, netAssetsTotal: 3200000 },
  { id: 'org-48', name: 'Josephine County Health Clinic', ein: '93-5501018', mission: 'Providing affordable healthcare in rural Josephine County.', programArea: 'Health', annualBudget: 3500000, state: 'Oregon', city: 'Grants Pass', foundedYear: 2006, executiveDirector: 'Dr. Anna Lewis', riskScore: 76, complianceScore: 80, connectedSystem: 'Sage Intacct', lastSync: '2026-02-06T08:45:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(3500000, 77), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 77.0, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.5, cashReserveMonths: 2.7, revenueYTD: 2970000, expensesYTD: 2800000, netAssetsTotal: 4200000 },
  { id: 'org-49', name: 'Umatilla Cultural Heritage Center', ein: '93-5501019', mission: 'Preserving and celebrating Native American cultural heritage.', programArea: 'Arts', annualBudget: 850000, state: 'Oregon', city: 'Pendleton', foundedYear: 2011, executiveDirector: 'Robert Whitefeather', riskScore: 84, complianceScore: 88, connectedSystem: 'QuickBooks Online', lastSync: '2026-02-05T15:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(850000, 85), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 79.5, managementExpenseRatio: 13.0, fundraisingExpenseRatio: 7.5, cashReserveMonths: 3.6, revenueYTD: 720000, expensesYTD: 680000, netAssetsTotal: 1050000 },
  { id: 'org-50', name: 'Lincoln City Youth Development', ein: '93-5501020', mission: 'Empowering coastal youth through education and recreation.', programArea: 'Youth Services', annualBudget: 620000, state: 'Oregon', city: 'Lincoln City', foundedYear: 2019, executiveDirector: 'Amy Russell', riskScore: 80, complianceScore: 84, connectedSystem: 'Xero', lastSync: '2026-02-06T06:30:00', filing990Status: 'Current', auditOpinion: 'Unqualified', boardMemberIds: [], topVendorIds: [], financials: generateMonthlyFinancials(620000, 81), restrictedFunds: [], anomalyIds: [], programExpenseRatio: 77.5, managementExpenseRatio: 14.5, fundraisingExpenseRatio: 8.0, cashReserveMonths: 3.2, revenueYTD: 525000, expensesYTD: 495000, netAssetsTotal: 780000 },
];

export function getNonprofitById(id: string): NonprofitOrg | undefined {
  return nonprofits.find(org => org.id === id);
}

export function getHighRiskNonprofits(): NonprofitOrg[] {
  return nonprofits.filter(org => org.riskScore < 45).sort((a, b) => a.riskScore - b.riskScore);
}

export function getNonprofitsByProgramArea(area: string): NonprofitOrg[] {
  return nonprofits.filter(org => org.programArea === area);
}
