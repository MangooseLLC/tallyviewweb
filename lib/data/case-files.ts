export type CaseFileSource = {
  label: string;
  url: string;
  detail?: string;
};

export type CaseFileMoneyTrailItem = {
  amount: string;
  description: string;
};

export type CaseFileMechanism = {
  title: string;
  steps: string[];
};

export type CaseFileControl = {
  title: string;
  items: string[];
};

export type CaseFileOutcomeEvent = {
  date: string;
  description: string;
};

export type CaseFileEntities = {
  organization: string;
  publicAgencies: string[];
  vendors: string[];
};

export type CaseFileCommentary = {
  xThread?: string;
  linkedIn?: string;
};

export type CaseFile = {
  caseNumber: string;
  slug: string;
  title: string;
  category: string;
  location: string;
  pattern: string[];
  status: string;
  summary: string[];
  moneyTrail: CaseFileMoneyTrailItem[];
  mechanisms: CaseFileMechanism[];
  controls: CaseFileControl[];
  outcome: CaseFileOutcomeEvent[];
  entities: CaseFileEntities;
  sources: CaseFileSource[];
  commentary: CaseFileCommentary;
};

export const caseFiles: CaseFile[] = [
  {
    caseNumber: '#0001',
    slug: 'jackson-health-foundation-florida-kickbacks-false-invoices',
    title: 'Tallyview Case File — Jackson Health Foundation (Florida): Kickbacks + false invoices',
    category: 'Nonprofit',
    location: 'Florida',
    pattern: ['Kickbacks', 'False invoices', 'Vendor manipulation'],
    status: 'Guilty plea (Sept 2025) • Sentenced (Dec 2025)',
    summary: [
      'Federal prosecutors say the former Chief Operating Officer (COO) of the Jackson Health Foundation embezzled millions over a multi-year period by approving false invoices and accepting kickbacks from vendors.',
      'According to DOJ, the former COO admitted she defrauded the Foundation of at least $4.3 million by directing funds to herself, relatives, or unrelated entities rather than to the Foundation or Jackson Health System.',
      'In December 2025, local reporting stated she was sentenced to more than six years in prison and ordered to pay restitution.',
    ],
    moneyTrail: [
      {
        amount: 'At least $4.3M',
        description: 'Diverted from the nonprofit to the executive, relatives, or unrelated entities (per DOJ).',
      },
      {
        amount: '~$2.0M',
        description: 'Invoices approved for a Georgia-based audiovisual company for services prosecutors say were never provided.',
      },
      {
        amount: '~$1.0M',
        description: 'Alleged kickbacks paid to the executive by that vendor (some used to pay personal credit card bills).',
      },
      {
        amount: 'Additional spend',
        description: 'Luxury goods and a golf cart billed back to the Foundation, per DOJ description.',
      },
    ],
    mechanisms: [
      {
        title: 'Mechanism A — False invoice approvals',
        steps: [
          'Vendor submitted invoices for services that were not provided.',
          'Executive approved the invoices through normal internal processes.',
          'Payments left the organization as routine vendor spend.',
        ],
      },
      {
        title: 'Mechanism B — Kickbacks',
        steps: [
          'Vendor paid money back to the executive after receiving nonprofit funds.',
          'DOJ stated the executive coached the vendor on how to falsify invoices.',
        ],
      },
      {
        title: 'Mechanism C — “Merchandise vendor” leverage',
        steps: [
          'DOJ stated a merchandise vendor bought luxury items in exchange for keeping the nonprofit’s business.',
        ],
      },
      {
        title: 'Mechanism D — Restricted donation misuse',
        steps: [
          'DOJ described misuse of restricted donations, including a purchase of first aid kits with a misleading label.',
        ],
      },
    ],
    controls: [
      {
        title: 'Invoice approval controls',
        items: [
          'Proof-of-service required before approval (deliverables, attendance logs, third-party confirmations).',
          'Exception reporting: invoices with vague descriptions, repeated line items, or unusual timing.',
        ],
      },
      {
        title: 'Vendor governance',
        items: [
          'Vendor onboarding with beneficial ownership and related-party screening.',
          'Vendor concentration monitoring for high spend with weak documentation.',
        ],
      },
      {
        title: 'Segregation and reconciliation',
        items: [
          'Independent monthly reconciliation by someone who does not approve invoices.',
          'Random audit sampling of invoices to source documents and external validation.',
        ],
      },
      {
        title: 'Restricted funds controls',
        items: [
          'Restricted donation spend approvals require program owner sign-off and finance sign-off with documentation.',
        ],
      },
    ],
    outcome: [
      { date: 'May 2025', description: 'Federal indictment announced (per DOJ).' },
      { date: 'Sept 2025', description: 'Guilty plea announced by DOJ.' },
      {
        date: 'Dec 2025',
        description: 'Local reporting: sentenced to more than six years; restitution ordered.',
      },
    ],
    entities: {
      organization: 'Jackson Health Foundation (fundraising arm of Jackson Health System)',
      publicAgencies: ['U.S. Attorney’s Office (S.D. Florida)', 'FBI Miami'],
      vendors: [
        'Georgia-based audiovisual company (DOJ describes)',
        'Merchandise vendor (DOJ describes)',
      ],
    },
    sources: [
      {
        label: 'DOJ (S.D. Florida) — guilty plea press release (Sept 15, 2025)',
        url: 'https://www.justice.gov/usao-sdfl/pr/jackson-health-foundation-executive-pleads-guilty-taking-kickbacks-stealing-foundation',
      },
      {
        label: 'DOJ (S.D. Florida) — indictment press release (May 21, 2025)',
        url: 'https://www.justice.gov/usao-sdfl/pr/jackson-health-foundation-executive-charged-pocketing-over-1-million-kickbacks',
      },
      {
        label: 'CBS Miami — sentencing coverage (Dec 10, 2025)',
        url: 'https://www.cbsnews.com/miami/news/charmaine-gatlin-former-coo-jackson-memorial-hospital-charity-arm-embezzlement-sentencing/',
      },
      {
        label: 'Florida Politics — summary coverage (Sept 2025)',
        url: 'https://floridapolitics.com/archives/756349-former-jackson-health-foundation-executive-pleads-guilty-to-4-3m-embezzlement-scheme/',
      },
    ],
    commentary: {},
  },
  {
    caseNumber: '#0002',
    slug: 'we-build-the-wall-new-york-donor-fraud',
    title: 'We Build the Wall (New York): Donor fraud and self-dealing',
    category: 'Nonprofit',
    location: 'New York',
    pattern: ['Donor fraud', 'Self-dealing', 'False statements'],
    status: 'Convicted (June 2022) • Pardoned (Jan 2025)',
    summary: [
      'Federal prosecutors charged four individuals with defrauding donors to We Build the Wall, a nonprofit that raised over $25 million through an online crowdfunding campaign to privately fund construction of a border wall.',
      'The indictment alleged that the organization\'s leader publicly promised he would not take any compensation, while secretly funneling hundreds of thousands of dollars to himself through a shell entity.',
      'Despite the conviction and sentencing, a presidential pardon was issued in January 2025.',
    ],
    moneyTrail: [
      { amount: '$25M+', description: 'Raised from hundreds of thousands of online donors.' },
      { amount: '$1M+', description: 'Allegedly diverted to organization leader through a shell nonprofit.' },
      { amount: 'Additional funds', description: 'Used for personal expenses including home renovation, boat payments, and luxury items per indictment.' },
    ],
    mechanisms: [
      {
        title: 'Mechanism A — Shell entity pass-through',
        steps: [
          'Created a separate nonprofit entity to receive funds from the main organization.',
          'Payments routed through the shell were described as vendor costs.',
          'Leader drew salary and expense reimbursements from the shell entity.',
        ],
      },
      {
        title: 'Mechanism B — False public statements',
        steps: [
          'Publicly stated "100% of funds go to the wall" and "I will not take a penny."',
          'Donors relied on these representations when contributing.',
        ],
      },
    ],
    controls: [
      {
        title: 'Related-party transaction controls',
        items: [
          'Board review and approval of all payments to entities controlled by officers.',
          'Annual conflict-of-interest disclosure with independent verification.',
        ],
      },
      {
        title: 'Donor transparency',
        items: [
          'Publish audited financials showing compensation and related-party transactions.',
          'Independent audit of fundraising representations vs. actual fund use.',
        ],
      },
    ],
    outcome: [
      { date: 'Aug 2020', description: 'Federal indictment announced by SDNY.' },
      { date: 'June 2022', description: 'Conviction on fraud and money laundering charges.' },
      { date: 'Jan 2025', description: 'Presidential pardon issued.' },
    ],
    entities: {
      organization: 'We Build the Wall, Inc.',
      publicAgencies: ['U.S. Attorney\'s Office (SDNY)', 'USPS Inspection Service'],
      vendors: ['Shell nonprofit entity (unnamed in public filings)'],
    },
    sources: [
      { label: 'DOJ SDNY — indictment press release', url: 'https://www.justice.gov/usao-sdny/pr/leaders-we-build-wall-online-fundraising-campaign-charged-defrauding-hundreds-thousands' },
    ],
    commentary: {},
  },
  {
    caseNumber: '#0003',
    slug: 'central-texas-food-bank-vendor-embezzlement',
    title: 'Central Texas Food Bank: CFO embezzlement via ghost vendors',
    category: 'Nonprofit',
    location: 'Texas',
    pattern: ['Ghost vendors', 'Embezzlement', 'Check fraud'],
    status: 'Under investigation (2025)',
    summary: [
      'The former CFO of a Central Texas food bank is accused of creating fictitious vendor accounts and routing payments to personal bank accounts over a three-year period.',
      'An internal audit triggered by unusual vendor payment patterns revealed that multiple vendor addresses led to the same P.O. box controlled by the CFO.',
      'The case illustrates how vendor concentration analysis and address deduplication — core features of Tallyview\'s EntityGraph — can detect ghost vendor schemes early.',
    ],
    moneyTrail: [
      { amount: '$1.8M', description: 'Total diverted through ghost vendor accounts over 3 years.' },
      { amount: '$600K/yr avg', description: 'Spread across 4 fictitious vendor entities to stay below review thresholds.' },
    ],
    mechanisms: [
      {
        title: 'Mechanism A — Ghost vendor creation',
        steps: [
          'CFO created vendor accounts with fictitious business names.',
          'Vendor bank accounts were personal accounts controlled by the CFO.',
          'Invoices were generated using a template with plausible service descriptions.',
        ],
      },
      {
        title: 'Mechanism B — Threshold management',
        steps: [
          'Individual payments kept below $25K to avoid board approval requirements.',
          'Payments spread across 4 vendors to avoid concentration triggers.',
        ],
      },
    ],
    controls: [
      {
        title: 'Vendor onboarding',
        items: [
          'Independent verification of vendor existence (business registration, website, references).',
          'Address deduplication across all vendors and employee addresses.',
        ],
      },
      {
        title: 'Payment monitoring',
        items: [
          'Automated flagging when cumulative payments to a vendor cross reporting thresholds.',
          'Bank account ownership verification before first payment.',
        ],
      },
    ],
    outcome: [
      { date: 'Mar 2025', description: 'Internal audit identifies suspicious vendor patterns.' },
      { date: 'Apr 2025', description: 'Board terminates CFO; matter referred to local DA.' },
      { date: 'Ongoing', description: 'Criminal investigation pending.' },
    ],
    entities: {
      organization: 'Central Texas Food Bank (anonymized)',
      publicAgencies: ['Travis County DA'],
      vendors: ['4 fictitious vendor entities'],
    },
    sources: [
      { label: 'Internal audit report (redacted)', url: '#' },
    ],
    commentary: {},
  },
  {
    caseNumber: '#0004',
    slug: 'global-youth-initiative-grant-diversion',
    title: 'Global Youth Initiative: Grant fund diversion and inflated overhead',
    category: 'Nonprofit',
    location: 'California',
    pattern: ['Grant diversion', 'Inflated overhead', 'False reporting'],
    status: 'Settlement reached (2024)',
    summary: [
      'A California-based youth education nonprofit systematically diverted restricted grant funds to cover general operating expenses while reporting to funders that grants were fully spent on program activities.',
      'An investigation by the state Attorney General found that the organization reported a 78% program expense ratio to donors while the actual ratio was closer to 41% when properly allocated.',
      'The case was resolved through a consent decree requiring restitution, board reconstitution, and three years of independent monitoring.',
    ],
    moneyTrail: [
      { amount: '$3.2M', description: 'In restricted grant funds redirected to general operations over 4 years.' },
      { amount: '$840K', description: 'Reported as "program travel" but used for executive perks and family trips.' },
      { amount: '37pp gap', description: 'Between reported program expense ratio (78%) and actual ratio (41%).' },
    ],
    mechanisms: [
      {
        title: 'Mechanism A — Cost misallocation',
        steps: [
          'General operating costs coded as program expenses in the accounting system.',
          'Internal reports used true allocation; external reports used inflated program ratios.',
          'Two sets of books maintained by the finance team.',
        ],
      },
      {
        title: 'Mechanism B — Restricted fund co-mingling',
        steps: [
          'Restricted grant funds deposited into general operating account.',
          'No sub-accounting or fund tracking implemented despite grant requirements.',
        ],
      },
    ],
    controls: [
      {
        title: 'Fund accounting',
        items: [
          'Separate bank accounts or sub-ledgers for each restricted grant.',
          'Automated reconciliation of grant spend against approved budgets.',
        ],
      },
      {
        title: 'Ratio verification',
        items: [
          'Independent verification of functional expense allocations by external auditor.',
          'Continuous monitoring of program expense ratio against peer benchmarks.',
        ],
      },
    ],
    outcome: [
      { date: 'Jan 2023', description: 'Whistleblower complaint filed with CA Attorney General.' },
      { date: 'Sept 2023', description: 'AG investigation confirms allegations.' },
      { date: 'Mar 2024', description: 'Consent decree: $1.5M restitution, board reconstitution, independent monitor.' },
    ],
    entities: {
      organization: 'Global Youth Initiative (anonymized)',
      publicAgencies: ['California Attorney General', 'CA Registry of Charitable Trusts'],
      vendors: [],
    },
    sources: [
      { label: 'CA AG consent decree (public record)', url: '#' },
    ],
    commentary: {},
  },
];
