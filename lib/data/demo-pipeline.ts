export interface DemoPipelineStage {
  key: string;
  label: string;
  description: string;
  data: Record<string, unknown>;
  durationMs: number;
}

export const demoPipelineStages: DemoPipelineStage[] = [
  {
    key: 'connect',
    label: 'Connect QuickBooks',
    description: 'Securely link your accounting system via OAuth. No data migration required.',
    data: {
      source: 'QuickBooks Online',
      org: 'Bright Futures Youth Services',
      accounts: 47,
      transactions: 1284,
    },
    durationMs: 800,
  },
  {
    key: 'classify',
    label: 'AI Classification',
    description: 'GPT-4o-mini classifies each transaction into IRS Form 990 line categories.',
    data: {
      model: 'GPT-4o-mini',
      classified: 1284,
      categories: ['Program Services', 'Management & General', 'Fundraising'],
      confidence: '94.2%',
    },
    durationMs: 1200,
  },
  {
    key: 'attest',
    label: 'Audit Attestation',
    description: 'A Merkle root of your financial data is submitted to the AuditLedger smart contract.',
    data: {
      contract: 'AuditLedger',
      merkleRoot: '0x7a3f...c8b2',
      chain: 'Avalanche Fuji',
      period: 'March 2026',
    },
    durationMs: 1000,
  },
  {
    key: 'detect',
    label: 'Anomaly Detection',
    description: 'Five detection rules scan for compensation outliers, expense ratio drift, vendor concentration, revenue anomalies, and governance flags.',
    data: {
      rules: 5,
      findings: 2,
      details: [
        'Vendor "Summit Consulting Group" receives 43.2% of payments',
        'Program expense ratio (62.1%) below 65% threshold',
      ],
    },
    durationMs: 900,
  },
  {
    key: 'entities',
    label: 'Entity Graph',
    description: 'Vendor relationships are mapped into the EntityGraph smart contract for cross-org analysis.',
    data: {
      vendors: 8,
      edges: 8,
      entityTypes: ['Vendor'],
    },
    durationMs: 1100,
  },
  {
    key: 'compliance',
    label: 'Compliance Reporting',
    description: 'Overhead ratio and other compliance metrics are reported to the ComplianceEngine contract.',
    data: {
      rules: ['Overhead ratio < 25%'],
      currentOverhead: '18.4%',
      status: 'Compliant',
    },
    durationMs: 700,
  },
];
