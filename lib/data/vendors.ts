import { Vendor } from '../types';

export const vendors: Vendor[] = [
  // Flagged vendors (related party / cross-org)
  { id: 'vendor-reeves-assoc', name: 'Reeves & Associates LLC', totalPayments: 287000, paymentCount: 24, address: '1847 NW Flanders St, Portland, OR', organizationIds: ['org-cascade', 'org-portland-gardens', 'org-river-valley', 'org-nw-digital'], relatedPartyFlag: true, relatedBoardMemberId: 'bm-001', soleSoureFlag: true },
  { id: 'vendor-welling-consulting', name: 'Welling Consulting Group', totalPayments: 156000, paymentCount: 12, organizationIds: ['org-cascade', 'org-metro-arts'], relatedPartyFlag: true, relatedBoardMemberId: 'bm-003', soleSoureFlag: true },
  { id: 'vendor-bright-star', name: 'Bright Star Consulting', totalPayments: 47200, paymentCount: 8, organizationIds: ['org-bright-futures'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-gray-mgmt', name: 'Gray Management Services', totalPayments: 198000, paymentCount: 18, address: '1847 NW Flanders St, Portland, OR', organizationIds: ['org-cascade'], relatedPartyFlag: true, relatedBoardMemberId: 'bm-010', soleSoureFlag: true },

  // Normal vendors used across orgs
  { id: 'vendor-001', name: 'Pacific Office Solutions', totalPayments: 89000, paymentCount: 45, organizationIds: ['org-bright-futures', 'org-cascade', 'org-portland-gardens'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-002', name: 'Northwest IT Services', totalPayments: 124000, paymentCount: 12, organizationIds: ['org-bright-futures', 'org-willamette-edu'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-003', name: 'Cascade Printing Co.', totalPayments: 34000, paymentCount: 28, organizationIds: ['org-bright-futures', 'org-cascade'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-004', name: 'Portland Catering Group', totalPayments: 67000, paymentCount: 18, organizationIds: ['org-bright-futures'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-005', name: 'Metro Insurance Agency', totalPayments: 45000, paymentCount: 4, organizationIds: ['org-bright-futures', 'org-portland-gardens', 'org-river-valley'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-006', name: 'Columbia River Janitorial', totalPayments: 28800, paymentCount: 12, organizationIds: ['org-bright-futures'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-007', name: 'Oregon Legal Services LLC', totalPayments: 52000, paymentCount: 6, organizationIds: ['org-bright-futures', 'org-cascade'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-008', name: 'Willamette Web Design', totalPayments: 18500, paymentCount: 3, organizationIds: ['org-bright-futures'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-009', name: 'PDX Marketing Group', totalPayments: 72000, paymentCount: 12, organizationIds: ['org-portland-gardens', 'org-metro-arts'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-010', name: 'Beaverton Supplies Inc.', totalPayments: 41000, paymentCount: 35, organizationIds: ['org-willamette-edu', 'org-bend-youth'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-011', name: 'Salem Healthcare Supplies', totalPayments: 93000, paymentCount: 24, organizationIds: ['org-river-valley', 'org-columbia-health', 'org-medford-health'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-012', name: 'Eugene Creative Studio', totalPayments: 31000, paymentCount: 8, organizationIds: ['org-eugene-arts'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-013', name: 'Bend Construction LLC', totalPayments: 156000, paymentCount: 6, organizationIds: ['org-metro-housing'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-014', name: 'Coast Environmental Testing', totalPayments: 48000, paymentCount: 12, organizationIds: ['org-coast-enviro'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-015', name: 'Portland Food Distributors', totalPayments: 210000, paymentCount: 52, organizationIds: ['org-salem-food'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-016', name: 'Tech4Good Solutions', totalPayments: 87000, paymentCount: 9, organizationIds: ['org-nw-digital', 'org-portland-literacy'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-017', name: 'Morrison & Partners CPA', totalPayments: 38000, paymentCount: 4, organizationIds: ['org-bright-futures', 'org-cascade', 'org-portland-gardens'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-018', name: 'Interstate Courier Service', totalPayments: 22000, paymentCount: 40, organizationIds: ['org-bright-futures', 'org-columbia-health'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-019', name: 'Deschutes Property Management', totalPayments: 96000, paymentCount: 12, organizationIds: ['org-bend-youth', 'org-nw-digital'], relatedPartyFlag: false, soleSoureFlag: false },
  { id: 'vendor-020', name: 'Rogue Valley Transportation', totalPayments: 54000, paymentCount: 18, organizationIds: ['org-medford-health'], relatedPartyFlag: false, soleSoureFlag: false },
];

export function getVendorsByOrg(orgId: string): Vendor[] {
  return vendors.filter(v => v.organizationIds.includes(orgId));
}

export function getFlaggedVendors(): Vendor[] {
  return vendors.filter(v => v.relatedPartyFlag);
}

export function getSharedVendors(): Vendor[] {
  return vendors.filter(v => v.organizationIds.length > 1);
}
