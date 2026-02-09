export type CaseFileSource = {
  label: string;
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
      },
      {
        label: 'DOJ (S.D. Florida) — indictment press release (May 21, 2025)',
      },
      {
        label: 'CBS Miami — sentencing coverage (Dec 10, 2025)',
      },
      {
        label: 'Florida Politics — summary coverage (Sept 2025)',
      },
    ],
    commentary: {
      xThread: 'PASTE YOUR PERSONAL X THREAD LINK',
      linkedIn: 'PASTE YOUR PERSONAL LINKEDIN POST LINK',
    },
  },
];
