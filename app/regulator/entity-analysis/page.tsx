'use client';

import { getCrossOrgBoardMembers, boardMembers } from '@/lib/data/board-members';
import { getSharedVendors, getFlaggedVendors, vendors } from '@/lib/data/vendors';
import { nonprofits } from '@/lib/data/nonprofits';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Network,
  AlertTriangle,
  Users,
  Building2,
  MapPin,
  Link2,
  ShieldAlert,
  Eye,
  ExternalLink,
  Flag,
} from 'lucide-react';

function getOrgName(orgId: string): string {
  return nonprofits.find(o => o.id === orgId)?.name || orgId;
}

function getBoardMemberName(bmId: string): string {
  return boardMembers.find(bm => bm.id === bmId)?.name || bmId;
}

export default function EntityAnalysisPage() {
  const crossOrgMembers = getCrossOrgBoardMembers();
  const sharedVendors = getSharedVendors();
  const flaggedVendors = getFlaggedVendors();

  // Address analysis: find entities sharing the same address
  const addressMap: Record<string, { vendors: typeof vendors; boardMembers: typeof crossOrgMembers }> = {};

  vendors.forEach(v => {
    if (v.address) {
      if (!addressMap[v.address]) addressMap[v.address] = { vendors: [], boardMembers: [] };
      addressMap[v.address].vendors.push(v);
    }
  });

  boardMembers.forEach(bm => {
    if (bm.address) {
      if (!addressMap[bm.address]) addressMap[bm.address] = { vendors: [], boardMembers: [] };
      addressMap[bm.address].boardMembers.push(bm);
    }
  });

  const sharedAddresses = Object.entries(addressMap).filter(
    ([, data]) => data.vendors.length + data.boardMembers.length > 1
  );

  // Flagged patterns
  const flaggedPatterns = [
    {
      id: 'fp-1',
      severity: 'High' as const,
      title: 'Cross-Org Board-Vendor Self-Dealing Network',
      description: 'Board member John Reeves serves on 4 nonprofit boards, all using vendor Reeves & Associates LLC',
      entities: ['John Reeves (Board Member)', 'Reeves & Associates LLC (Vendor)', 'Cascade Community Alliance', 'Portland Urban Gardens Initiative', 'River Valley Health Outreach', 'NW Digital Literacy Project'],
      totalExposure: '$287,000+ in related-party payments',
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    {
      id: 'fp-2',
      severity: 'High' as const,
      title: 'Shared Address & Registered Agent Pattern',
      description: 'Three organizations at 1847 NW Flanders St share a registered agent and have overlapping vendor payments',
      entities: ['Reeves & Associates LLC', 'Gray Management Services', 'John Reeves (Board Chair)', '1847 NW Flanders St, Portland, OR'],
      totalExposure: '$485,000 in combined vendor payments',
      icon: <MapPin className="h-5 w-5" />,
    },
    {
      id: 'fp-3',
      severity: 'Medium' as const,
      title: 'Dual Board Membership — Grantee-Funder Connection',
      description: 'Board member David Kim serves on boards of Bright Futures Youth Services and Cascade Alliance for Children',
      entities: ['David Kim (Board Treasurer)', 'Bright Futures Youth Services', 'Cascade Alliance for Children'],
      totalExposure: 'Potential conflict in grant allocation decisions',
      icon: <Users className="h-5 w-5" />,
    },
    {
      id: 'fp-4',
      severity: 'Medium' as const,
      title: 'Board Secretary with Vendor Relationship',
      description: 'Patricia Welling serves on two org boards while operating Welling Consulting Group, a vendor to both',
      entities: ['Patricia Welling (Board Secretary)', 'Welling Consulting Group', 'Cascade Community Alliance', 'Metro Arts Council'],
      totalExposure: '$156,000 in related-party payments',
      icon: <Link2 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Entity Analysis</h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-[10px] font-semibold">
            <Eye className="h-3 w-3" />
            WOW Feature
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Cross-organizational connection analysis — revealing hidden relationships between entities</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 text-amber-600">
            <Users className="h-4 w-4" />
            <p className="text-xs font-medium text-gray-500">Cross-Org Board Members</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{crossOrgMembers.length}</p>
          <p className="text-[10px] text-gray-400">Serving on multiple boards</p>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 text-red-500">
            <Flag className="h-4 w-4" />
            <p className="text-xs font-medium text-gray-500">Flagged Vendors</p>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-1">{flaggedVendors.length}</p>
          <p className="text-[10px] text-gray-400">Related-party transactions</p>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 text-blue-500">
            <Network className="h-4 w-4" />
            <p className="text-xs font-medium text-gray-500">Shared Vendors</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sharedVendors.length}</p>
          <p className="text-[10px] text-gray-400">Vendors serving multiple orgs</p>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 text-purple-500">
            <MapPin className="h-4 w-4" />
            <p className="text-xs font-medium text-gray-500">Shared Addresses</p>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{sharedAddresses.length}</p>
          <p className="text-[10px] text-gray-400">Entities at same location</p>
        </div>
      </div>

      {/* Flagged Patterns Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-gray-900">Flagged Connection Patterns</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">AI-identified patterns requiring investigation</p>
        </div>
        <div className="divide-y">
          {flaggedPatterns.map(pattern => (
            <div key={pattern.id} className="p-5 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={cn(
                  'rounded-lg p-2.5 shrink-0',
                  pattern.severity === 'High' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                )}>
                  {pattern.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{pattern.title}</h3>
                    <span className={cn(
                      'text-[10px] font-medium rounded-full px-2 py-0.5 border',
                      pattern.severity === 'High'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    )}>
                      {pattern.severity} Severity
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{pattern.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pattern.entities.map((entity, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {entity}
                      </span>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-400">Estimated exposure:</span>
                    <span className="text-[10px] font-semibold text-red-600">{pattern.totalExposure}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Org Board Members */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Cross-Organization Board Member Connections</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Board members serving on multiple nonprofit boards</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Board Member</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizations Served</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Relationships</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Flag</th>
              </tr>
            </thead>
            <tbody>
              {crossOrgMembers.map((bm, idx) => {
                const hasBusinessRelationship = bm.businessRelationships && bm.businessRelationships.length > 0;
                return (
                  <tr key={bm.id} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30', hasBusinessRelationship && 'border-l-2 border-l-red-400')}>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{bm.name}</p>
                        {bm.address && <p className="text-[10px] text-gray-400">{bm.address}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">{bm.title}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {bm.organizationIds.map(orgId => (
                          <span key={orgId} className="inline-flex items-center text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                            {getOrgName(orgId)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {hasBusinessRelationship ? (
                        <div className="flex flex-wrap gap-1">
                          {bm.businessRelationships!.map(vendorId => {
                            const vendor = vendors.find(v => v.id === vendorId);
                            return (
                              <span key={vendorId} className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 rounded-full px-2 py-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {vendor?.name || vendorId}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">None identified</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {hasBusinessRelationship ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                          Related Party
                        </span>
                      ) : bm.organizationIds.length >= 3 ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Multi-Board
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                          Dual-Board
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared Vendor Network */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Shared Vendor Network</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Vendors serving multiple organizations — flagged for concentration and related-party risk</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizations Served</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Payments</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Related Party</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sole Source</th>
              </tr>
            </thead>
            <tbody>
              {sharedVendors.sort((a, b) => (b.relatedPartyFlag ? 1 : 0) - (a.relatedPartyFlag ? 1 : 0) || b.totalPayments - a.totalPayments).map((vendor, idx) => (
                <tr key={vendor.id} className={cn(
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30',
                  vendor.relatedPartyFlag && 'border-l-2 border-l-red-400'
                )}>
                  <td className="px-5 py-3">
                    <div>
                      <p className="font-medium text-gray-900 text-xs">{vendor.name}</p>
                      {vendor.address && <p className="text-[10px] text-gray-400">{vendor.address}</p>}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-1">
                      {vendor.organizationIds.map(orgId => (
                        <span key={orgId} className="inline-flex items-center text-[10px] bg-blue-50 text-blue-700 rounded-full px-2 py-0.5">
                          {getOrgName(orgId)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn('text-xs font-medium', vendor.relatedPartyFlag ? 'text-red-600' : 'text-gray-700')}>
                      {formatCurrency(vendor.totalPayments)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{vendor.paymentCount}</td>
                  <td className="px-5 py-3 text-center">
                    {vendor.relatedPartyFlag ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Yes — {vendor.relatedBoardMemberId ? getBoardMemberName(vendor.relatedBoardMemberId) : 'Unknown'}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">No</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {vendor.soleSoureFlag ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        Sole Source
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Address Analysis */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Address Analysis</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Entities sharing the same registered address</p>
        </div>
        <div className="divide-y">
          {sharedAddresses.map(([address, data]) => (
            <div key={address} className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg p-2 bg-red-50 text-red-600 shrink-0">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-gray-900">{address}</h4>
                    <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">
                      {data.vendors.length + data.boardMembers.length} entities
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.vendors.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">VENDORS</p>
                        <div className="space-y-1.5">
                          {data.vendors.map(v => (
                            <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700">{v.name}</p>
                                <p className="text-[10px] text-gray-400">{v.organizationIds.length} orgs · {v.paymentCount} transactions</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-red-600">{formatCurrency(v.totalPayments)}</p>
                                {v.relatedPartyFlag && (
                                  <span className="text-[10px] text-red-500">Related Party</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.boardMembers.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium mb-1.5">BOARD MEMBERS</p>
                        <div className="space-y-1.5">
                          {data.boardMembers.map(bm => (
                            <div key={bm.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                              <div>
                                <p className="text-xs font-medium text-gray-700">{bm.name}</p>
                                <p className="text-[10px] text-gray-400">{bm.title} · {bm.organizationIds.length} orgs</p>
                              </div>
                              {bm.businessRelationships && bm.businessRelationships.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                  Vendor Link
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
