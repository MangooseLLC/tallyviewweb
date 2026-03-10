export const APP_NAME = 'Tallyview';
export const APP_TAGLINE = 'The Accountability Intelligence Layer for Public Money';
export const APP_VERSION = 'v1.0';
export const DEMO_YEAR = 2026;
export const CURRENT_DATE = '2026-02-06';

export const PROGRAM_AREAS = [
  'Youth Services',
  'Health',
  'Education',
  'Environment',
  'Arts',
  'Housing',
  'Community Development',
  'Food Security',
] as const;

export const CONNECTED_SYSTEMS = [
  'QuickBooks Online',
  'Xero',
  'Sage Intacct',
  'NetSuite',
  'FreshBooks',
] as const;

export const RISK_THRESHOLDS = {
  HIGH: 44,
  MODERATE: 60,
  ELEVATED: 74,
  LOW: 100,
} as const;

/** Single source of truth for waitlist role options (form + API validation). */
export const WAITLIST_ROLES = [
  { value: '', label: 'I am a...' },
  { value: 'nonprofit', label: 'Nonprofit' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'regulator', label: 'Regulator' },
  { value: 'investigator', label: 'Investigator' },
  { value: 'validator_partner', label: 'Validator Partner' },
] as const;

export const ALLOWED_WAITLIST_ROLES: string[] = WAITLIST_ROLES.filter(
  (r) => r.value !== ''
).map((r) => r.value);

export const NAV_ITEMS = {
  nonprofit: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'QuickBooks', href: '/quickbooks', icon: 'Link2' },
    { label: 'Progressive 990', href: '/990', icon: 'FileText' },
    { label: 'Board Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Audit Prep', href: '/audit-prep', icon: 'ClipboardCheck' },
    { label: 'Anomaly Alerts', href: '/anomalies', icon: 'AlertTriangle' },
    { label: 'Restricted Funds', href: '/restricted-funds', icon: 'Lock' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
  foundation: [
    { label: 'Portfolio Dashboard', href: '/foundation/dashboard', icon: 'LayoutDashboard' },
    { label: 'Grantee Portfolio', href: '/foundation/portfolio', icon: 'Building2' },
    { label: 'Risk Alerts', href: '/foundation/alerts', icon: 'AlertTriangle' },
    { label: 'Peer Benchmarking', href: '/foundation/benchmarking', icon: 'GitCompare' },
    { label: 'Portfolio Reports', href: '/foundation/reports', icon: 'FileBarChart' },
    { label: 'Settings', href: '/foundation/settings', icon: 'Settings' },
  ],
  regulator: [
    { label: 'Jurisdiction Dashboard', href: '/regulator/dashboard', icon: 'LayoutDashboard' },
    { label: 'Risk Map', href: '/regulator/jurisdiction', icon: 'Map' },
    { label: 'Investigation Queue', href: '/regulator/investigations', icon: 'Search' },
    { label: 'Entity Analysis', href: '/regulator/entity-analysis', icon: 'Network' },
    { label: 'Reports', href: '/regulator/reports', icon: 'FileBarChart' },
  ],
  investigator: [
    { label: 'Dashboard', href: '/investigator/dashboard', icon: 'LayoutDashboard' },
    { label: 'Investigation Workbench', href: '/investigator/workbench', icon: 'Microscope' },
    { label: 'Active Cases', href: '/investigator/cases', icon: 'Briefcase' },
    { label: 'Fraud Typologies', href: '/investigator/fraud-typologies', icon: 'Database' },
  ],
} as const;
