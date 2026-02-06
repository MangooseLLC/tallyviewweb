import { BoardMember } from '../types';

export const boardMembers: BoardMember[] = [
  // Cross-org board members (flagged)
  { id: 'bm-001', name: 'John Reeves', title: 'Board Chair', organizationIds: ['org-cascade', 'org-portland-gardens', 'org-river-valley', 'org-nw-digital'], businessRelationships: ['vendor-reeves-assoc'], address: '1847 NW Flanders St, Portland, OR' },
  { id: 'bm-002', name: 'David Kim', title: 'Board Treasurer', organizationIds: ['org-bright-futures', 'org-cascade-alliance'], address: '2200 SW Morrison St, Portland, OR' },
  { id: 'bm-003', name: 'Patricia Welling', title: 'Board Secretary', organizationIds: ['org-cascade', 'org-metro-arts'], businessRelationships: ['vendor-welling-consulting'] },
  { id: 'bm-004', name: 'Robert Tanaka', title: 'Board Member', organizationIds: ['org-bright-futures', 'org-portland-literacy'] },
  { id: 'bm-005', name: 'Linda Morrison', title: 'Board Chair', organizationIds: ['org-portland-gardens', 'org-green-spaces'] },

  // Bright Futures board
  { id: 'bm-006', name: 'Angela Davis', title: 'Board Chair', organizationIds: ['org-bright-futures'] },
  { id: 'bm-007', name: 'Michael Torres', title: 'Board Member', organizationIds: ['org-bright-futures'] },
  { id: 'bm-008', name: 'Susan Park', title: 'Board Member', organizationIds: ['org-bright-futures'] },
  { id: 'bm-009', name: 'James Liu', title: 'Board Member', organizationIds: ['org-bright-futures'] },

  // Cascade Community Alliance board (problematic org)
  { id: 'bm-010', name: 'Thomas Gray', title: 'Executive Committee', organizationIds: ['org-cascade'] },
  { id: 'bm-011', name: 'Karen Foster', title: 'Board Member', organizationIds: ['org-cascade'] },

  // Portland Urban Gardens
  { id: 'bm-012', name: 'Elena Rodriguez', title: 'Board Chair', organizationIds: ['org-portland-gardens'] },
  { id: 'bm-013', name: 'William Cho', title: 'Treasurer', organizationIds: ['org-portland-gardens'] },

  // River Valley Health Outreach
  { id: 'bm-014', name: 'Dr. Sarah Mitchell', title: 'Board Chair', organizationIds: ['org-river-valley'] },
  { id: 'bm-015', name: 'Nancy Chen', title: 'Board Member', organizationIds: ['org-river-valley'] },

  // NW Digital Literacy
  { id: 'bm-016', name: 'Alex Petrov', title: 'Board Chair', organizationIds: ['org-nw-digital'] },
  { id: 'bm-017', name: 'Maria Santos', title: 'Board Member', organizationIds: ['org-nw-digital'] },

  // Other orgs
  { id: 'bm-018', name: 'Richard Huang', title: 'Board Chair', organizationIds: ['org-willamette-edu'] },
  { id: 'bm-019', name: 'Jennifer Wright', title: 'Board Member', organizationIds: ['org-columbia-health'] },
  { id: 'bm-020', name: 'Paul Anderson', title: 'Board Chair', organizationIds: ['org-metro-housing'] },
  { id: 'bm-021', name: 'Diana Ross', title: 'Board Member', organizationIds: ['org-coast-enviro'] },
  { id: 'bm-022', name: 'Steven Park', title: 'Treasurer', organizationIds: ['org-bend-youth'] },
  { id: 'bm-023', name: 'Catherine Bell', title: 'Board Chair', organizationIds: ['org-salem-food'] },
  { id: 'bm-024', name: 'Mark Thompson', title: 'Board Member', organizationIds: ['org-eugene-arts'] },
  { id: 'bm-025', name: 'Lisa Chang', title: 'Board Chair', organizationIds: ['org-medford-health'] },
];

export function getBoardMembersByOrg(orgId: string): BoardMember[] {
  return boardMembers.filter(bm => bm.organizationIds.includes(orgId));
}

export function getCrossOrgBoardMembers(): BoardMember[] {
  return boardMembers.filter(bm => bm.organizationIds.length > 1);
}
