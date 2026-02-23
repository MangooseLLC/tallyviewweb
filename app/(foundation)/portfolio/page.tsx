'use client';

import { useState, useMemo } from 'react';
import { nonprofits } from '@/lib/data/nonprofits';
import { grants } from '@/lib/data/grants';
import { anomalies } from '@/lib/data/anomalies';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { Search, SlidersHorizontal, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { ProgramArea } from '@/lib/types';

type SortField = 'name' | 'grantAmount' | 'riskScore' | 'complianceScore' | 'alerts';
type SortDir = 'asc' | 'desc';

const PROGRAM_AREAS: ProgramArea[] = [
  'Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security',
];

const RISK_LEVELS = [
  { label: 'High Risk', min: 0, max: 44, color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Elevated', min: 45, max: 59, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { label: 'Moderate', min: 60, max: 74, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { label: 'Low Risk', min: 75, max: 100, color: 'bg-green-100 text-green-700 border-green-200' },
];

export default function PortfolioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgramArea, setSelectedProgramArea] = useState<ProgramArea | 'All'>('All');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string | 'All'>('All');
  const [sortField, setSortField] = useState<SortField>('riskScore');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Build enriched grantee data
  const granteeData = useMemo(() => {
    return nonprofits.map((org) => {
      const orgGrants = grants.filter(g => g.granteeId === org.id);
      const totalGrantAmount = orgGrants.reduce((sum, g) => sum + g.amount, 0);
      const orgAnomalies = anomalies.filter(a => a.organizationId === org.id);
      const alertCount = orgAnomalies.filter(a => a.status === 'New' || a.status === 'Escalated').length;

      return {
        ...org,
        grantAmount: totalGrantAmount,
        alertCount,
      };
    });
  }, []);

  // Filter + sort
  const filteredData = useMemo(() => {
    let data = [...granteeData];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (org) =>
          org.name.toLowerCase().includes(q) ||
          org.city.toLowerCase().includes(q) ||
          org.executiveDirector.toLowerCase().includes(q)
      );
    }

    if (selectedProgramArea !== 'All') {
      data = data.filter((org) => org.programArea === selectedProgramArea);
    }

    if (selectedRiskLevel !== 'All') {
      const level = RISK_LEVELS.find((l) => l.label === selectedRiskLevel);
      if (level) {
        data = data.filter((org) => org.riskScore >= level.min && org.riskScore <= level.max);
      }
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'grantAmount':
          cmp = a.grantAmount - b.grantAmount;
          break;
        case 'riskScore':
          cmp = a.riskScore - b.riskScore;
          break;
        case 'complianceScore':
          cmp = a.complianceScore - b.complianceScore;
          break;
        case 'alerts':
          cmp = a.alertCount - b.alertCount;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [granteeData, searchQuery, selectedProgramArea, selectedRiskLevel, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 text-gray-300" />;
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 text-teal-600" />
    ) : (
      <ChevronDown className="h-3 w-3 text-teal-600" />
    );
  };

  const filing990Color = (status: string) => {
    switch (status) {
      case 'Current':
        return 'text-green-600 bg-green-50';
      case 'Overdue':
        return 'text-amber-600 bg-amber-50';
      case 'Delinquent':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Grantee Portfolio</h1>
        <p className="mt-1 text-sm text-gray-500">
          {filteredData.length} of {granteeData.length} grantees shown
        </p>
      </div>

      {/* Search + Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, city, or executive director..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>

        {/* Filter Rows */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium mr-1">Risk:</span>
          <button
            onClick={() => setSelectedRiskLevel('All')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              selectedRiskLevel === 'All'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {RISK_LEVELS.map((level) => (
            <button
              key={level.label}
              onClick={() => setSelectedRiskLevel(level.label === selectedRiskLevel ? 'All' : level.label)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                selectedRiskLevel === level.label
                  ? level.color
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {level.label}
            </button>
          ))}

          <span className="text-gray-300 mx-1">|</span>
          <span className="text-xs text-gray-500 font-medium mr-1">Area:</span>
          <select
            value={selectedProgramArea}
            onChange={(e) => setSelectedProgramArea(e.target.value as ProgramArea | 'All')}
            className="rounded-md border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600 focus:border-teal-400 focus:outline-none"
          >
            <option value="All">All Areas</option>
            {PROGRAM_AREAS.map((area) => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Organization <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('grantAmount')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Grant Amount <SortIcon field="grantAmount" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Program Area
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('riskScore')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Risk Score <SortIcon field="riskScore" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('complianceScore')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Compliance <SortIcon field="complianceScore" />
                  </button>
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  990 Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Last Sync
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort('alerts')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Alerts <SortIcon field="alerts" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.map((org) => (
                <tr
                  key={org.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/foundation/grantee/${org.id}`}
                      className="flex items-center gap-2 group-hover:text-teal-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700 truncate max-w-[220px]">
                          {org.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{org.city}, {org.state}</p>
                      </div>
                      <ExternalLink className="h-3 w-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                    {formatCurrency(org.grantAmount, true)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {org.programArea}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RiskScoreBadge score={org.riskScore} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            org.complianceScore >= 80 ? 'bg-green-500' :
                            org.complianceScore >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          )}
                          style={{ width: `${org.complianceScore}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{org.complianceScore}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                      filing990Color(org.filing990Status)
                    )}>
                      {org.filing990Status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {formatRelativeTime(org.lastSync)}
                  </td>
                  <td className="px-4 py-3">
                    {org.alertCount > 0 ? (
                      <span className={cn(
                        'inline-flex items-center justify-center h-5 min-w-[20px] rounded-full text-[11px] font-bold',
                        org.alertCount >= 5 ? 'bg-red-100 text-red-700' :
                        org.alertCount >= 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {org.alertCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
