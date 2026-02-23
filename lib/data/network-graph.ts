import { nonprofits } from './nonprofits';
import { boardMembers } from './board-members';
import { vendors } from './vendors';
import { getCrossOrgBoardMembers } from './board-members';
import { getSharedVendors, getFlaggedVendors } from './vendors';
export type NodeType = 'org' | 'person' | 'vendor' | 'address';
export type LinkType = 'board-seat' | 'payment' | 'related-party' | 'shared-address';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  /** For org: risk score 0-100. For person: 1 if has businessRelationships else 0. For vendor: 1 if flagged else 0. */
  riskScore?: number;
  /** Org: annual budget. Vendor: total payments. */
  value?: number;
  /** Org: anomaly count. Person: org count. Vendor: org count. */
  anomalyCount?: number;
  /** Full name / long label for detail panel */
  fullName?: string;
  /** Extra metadata for detail panel */
  metadata?: Record<string, unknown>;
}

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
  /** Payment amount for payment links */
  value?: number;
  /** Related-party flag for payment links */
  relatedParty?: boolean;
}

export interface NetworkGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function getOrgById(id: string) {
  return nonprofits.find((o) => o.id === id);
}

function getShortOrgName(name: string): string {
  if (name.length <= 20) return name;
  const parts = name.split(' ');
  if (parts[0] === 'Portland' || parts[0] === 'Northwest' || parts[0] === 'River' || parts[0] === 'Cascade') {
    return parts.slice(0, 2).join(' ');
  }
  return parts.slice(0, 2).join(' ') + '…';
}

function getPersonLastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

function getShortVendorName(name: string): string {
  if (name.length <= 18) return name;
  return name.replace(/\s+(LLC|Inc\.?|Co\.?|Group)$/i, '').slice(0, 18) + '…';
}

/**
 * Transforms nonprofit, board member, vendor, and shared-address data into
 * nodes and links for the force-directed network graph.
 * Includes only cross-org entities to keep the graph readable (~30 nodes, ~60 links).
 */
export function buildNetworkGraph(): NetworkGraphData {
  const crossOrgMembers = getCrossOrgBoardMembers();
  const sharedVendors = getSharedVendors();
  const flaggedVendors = getFlaggedVendors();

  // Persons to include: cross-org OR have business relationships (single-org but related-party)
  const personIds = new Set<string>();
  crossOrgMembers.forEach((bm) => personIds.add(bm.id));
  boardMembers.forEach((bm) => {
    if (bm.businessRelationships && bm.businessRelationships.length > 0) personIds.add(bm.id);
  });

  // Orgs that appear in any cross-org relationship (board or vendor)
  const orgIds = new Set<string>();
  crossOrgMembers.forEach((bm) => bm.organizationIds.forEach((id) => orgIds.add(id)));
  sharedVendors.forEach((v) => v.organizationIds.forEach((id) => orgIds.add(id)));
  flaggedVendors.forEach((v) => v.organizationIds.forEach((id) => orgIds.add(id)));

  // Vendors: shared across orgs OR flagged (related-party / sole-source)
  const vendorIds = new Set<string>();
  sharedVendors.forEach((v) => vendorIds.add(v.id));
  flaggedVendors.forEach((v) => vendorIds.add(v.id));

  // Shared addresses (entities at same physical location)
  const addressMap: Record<string, { vendors: typeof vendors; boardMembers: typeof boardMembers }> = {};
  vendors.forEach((v) => {
    if (v.address) {
      if (!addressMap[v.address]) addressMap[v.address] = { vendors: [], boardMembers: [] };
      addressMap[v.address].vendors.push(v);
    }
  });
  boardMembers.forEach((bm) => {
    if (bm.address) {
      if (!addressMap[bm.address]) addressMap[bm.address] = { vendors: [], boardMembers: [] };
      addressMap[bm.address].boardMembers.push(bm);
    }
  });
  const sharedAddresses = Object.entries(addressMap).filter(
    ([, data]) => data.vendors.length + data.boardMembers.length > 1
  );

  const nodes: GraphNode[] = [];
  const linkSet = new Set<string>();

  function linkKey(source: string, target: string, type: LinkType) {
    return `${source}|${target}|${type}`;
  }
  function addLink(source: string, target: string, type: LinkType, value?: number, relatedParty?: boolean) {
    const key = linkKey(source, target, type);
    if (linkSet.has(key)) return;
    linkSet.add(key);
    links.push({ source, target, type, value, relatedParty });
  }

  const links: GraphLink[] = [];

  // --- Nodes: Orgs
  orgIds.forEach((id) => {
    const org = getOrgById(id);
    if (!org) return;
    nodes.push({
      id,
      type: 'org',
      label: getShortOrgName(org.name),
      fullName: org.name,
      riskScore: org.riskScore,
      value: org.annualBudget,
      anomalyCount: org.anomalyIds?.length ?? 0,
      metadata: {
        ein: org.ein,
        complianceScore: org.complianceScore,
        programArea: org.programArea,
        city: org.city,
        state: org.state,
      },
    });
  });

  // --- Nodes: Persons
  personIds.forEach((id) => {
    const bm = boardMembers.find((b) => b.id === id);
    if (!bm) return;
    const hasBusiness = !!(bm.businessRelationships && bm.businessRelationships.length > 0);
    nodes.push({
      id,
      type: 'person',
      label: getPersonLastName(bm.name),
      fullName: bm.name,
      riskScore: hasBusiness ? 1 : 0,
      anomalyCount: bm.organizationIds.length,
      metadata: {
        title: bm.title,
        organizationIds: bm.organizationIds,
        businessRelationships: bm.businessRelationships,
        address: bm.address,
      },
    });
  });

  // --- Nodes: Vendors
  vendorIds.forEach((id) => {
    const v = vendors.find((x) => x.id === id);
    if (!v) return;
    nodes.push({
      id,
      type: 'vendor',
      label: getShortVendorName(v.name),
      fullName: v.name,
      riskScore: v.relatedPartyFlag ? 1 : 0,
      value: v.totalPayments,
      anomalyCount: v.organizationIds.length,
      metadata: {
        totalPayments: v.totalPayments,
        paymentCount: v.paymentCount,
        relatedPartyFlag: v.relatedPartyFlag,
        soleSoureFlag: v.soleSoureFlag,
        relatedBoardMemberId: v.relatedBoardMemberId,
        address: v.address,
      },
    });
  });

  // --- Nodes: Addresses (only those with 2+ entities)
  sharedAddresses.forEach(([address]) => {
    const nodeId = `addr:${address}`;
    nodes.push({
      id: nodeId,
      type: 'address',
      label: address.length > 25 ? address.slice(0, 22) + '…' : address,
      fullName: address,
      metadata: { address },
    });
  });

  // --- Links: Board seats (person -> org)
  crossOrgMembers.forEach((bm) => {
    bm.organizationIds.forEach((orgId) => {
      if (orgIds.has(orgId)) addLink(bm.id, orgId, 'board-seat');
    });
  });
  boardMembers.forEach((bm) => {
    if (!personIds.has(bm.id)) return;
    bm.organizationIds.forEach((orgId) => {
      if (orgIds.has(orgId)) addLink(bm.id, orgId, 'board-seat');
    });
  });

  // --- Links: Payment (org -> vendor) and related-party
  vendorIds.forEach((vendorId) => {
    const v = vendors.find((x) => x.id === vendorId);
    if (!v) return;
    v.organizationIds.forEach((orgId) => {
      if (orgIds.has(orgId)) {
        addLink(orgId, vendorId, 'payment', v.totalPayments, v.relatedPartyFlag);
      }
    });
    if (v.relatedPartyFlag && v.relatedBoardMemberId && personIds.has(v.relatedBoardMemberId)) {
      addLink(v.relatedBoardMemberId, vendorId, 'related-party');
    }
  });

  // --- Links: Shared address (address -> person, address -> vendor)
  sharedAddresses.forEach(([address]) => {
    const nodeId = `addr:${address}`;
    const data = addressMap[address];
    data.boardMembers.forEach((bm) => {
      if (personIds.has(bm.id)) addLink(nodeId, bm.id, 'shared-address');
    });
    data.vendors.forEach((v) => {
      if (vendorIds.has(v.id)) addLink(nodeId, v.id, 'shared-address');
    });
  });

  return { nodes, links };
}
