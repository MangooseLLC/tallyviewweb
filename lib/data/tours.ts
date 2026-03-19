import type { DriveStep } from 'driver.js';

export interface TourConfig {
  personaId: string;
  steps: DriveStep[];
}

export const tours: TourConfig[] = [
  {
    personaId: 'sarah-chen',
    steps: [
      {
        element: '[data-tour="stat-990"]',
        popover: {
          title: '990 Completion',
          description: 'Track your Form 990 progress throughout the year. Tallyview classifies transactions into 990 categories as they come in.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="stat-compliance"]',
        popover: {
          title: 'Compliance Score',
          description: 'Real-time compliance monitoring powered by the Accountability Chain. Rules and violations are tracked on-chain.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="stat-anomalies"]',
        popover: {
          title: 'Anomaly Alerts',
          description: 'AI-powered anomaly detection flags vendor concentration, expense ratio drift, compensation outliers, and revenue anomalies.',
          side: 'bottom',
        },
      },
      {
        element: '[data-tour="verified-badge"]',
        popover: {
          title: 'Tallyview Verified',
          description: 'Your verified credential backed by on-chain attestation. Share this with funders and auditors as proof of financial integrity.',
          side: 'left',
        },
      },
      {
        element: '[data-tour="pipeline-status"]',
        popover: {
          title: 'On-Chain Pipeline',
          description: 'See the full pipeline: data flows from QuickBooks through AI classification, anomaly detection, and onto the Accountability Chain.',
          side: 'left',
        },
      },
    ],
  },
  {
    personaId: 'marcus-thompson',
    steps: [
      {
        popover: {
          title: 'Foundation Portfolio View',
          description: 'As a Program Officer, you see all your grantees at a glance — their financial health, compliance status, and risk alerts.',
        },
      },
      {
        element: '[data-tour="portfolio-health"]',
        popover: {
          title: 'Portfolio Health',
          description: 'Monitor the aggregate health of your grantee portfolio with trend data and risk scoring.',
          side: 'bottom',
        },
      },
    ],
  },
  {
    personaId: 'director-rivera',
    steps: [
      {
        popover: {
          title: 'Regulator Dashboard',
          description: 'As a Deputy AG, you have a jurisdiction-wide view of nonprofit compliance, risk hotspots, and investigation priorities.',
        },
      },
    ],
  },
  {
    personaId: 'jessica-park',
    steps: [
      {
        popover: {
          title: 'Investigation Workbench',
          description: 'As a forensic investigator, you have tools for entity analysis, fraud pattern matching, and evidence chain management.',
        },
      },
    ],
  },
];

export function getTourForPersona(personaId: string): TourConfig | undefined {
  return tours.find(t => t.personaId === personaId);
}
