'use client';

import { Fragment, useState } from 'react';
import { investigations } from '@/lib/data/investigations';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { CaseStage } from '@/lib/types';
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Briefcase,
  CheckCircle,
} from 'lucide-react';

const stageOrder: CaseStage[] = ['Tip', 'Analysis', 'Discovery', 'Filing', 'Recovery'];

const stageColors: Record<CaseStage, string> = {
  Tip: 'bg-gray-100 text-gray-700 border-gray-200',
  Analysis: 'bg-blue-100 text-blue-700 border-blue-200',
  Discovery: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Filing: 'bg-orange-100 text-orange-700 border-orange-200',
  Recovery: 'bg-green-100 text-green-700 border-green-200',
};

const stageDotColors: Record<CaseStage, string> = {
  Tip: 'bg-gray-400',
  Analysis: 'bg-blue-500',
  Discovery: 'bg-yellow-500',
  Filing: 'bg-orange-500',
  Recovery: 'bg-green-500',
};

const stagePipelineBg: Record<CaseStage, string> = {
  Tip: 'bg-gray-50 border-gray-200',
  Analysis: 'bg-blue-50 border-blue-200',
  Discovery: 'bg-yellow-50 border-yellow-200',
  Filing: 'bg-orange-50 border-orange-200',
  Recovery: 'bg-green-50 border-green-200',
};

export default function ActiveCases() {
  const [stageFilter, setStageFilter] = useState<CaseStage | 'All'>('All');
  const [fraudTypeFilter, setFraudTypeFilter] = useState<string>('All');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fraudTypes = Array.from(new Set(investigations.map((c) => c.fraudType))).sort();

  const filteredCases = investigations.filter((c) => {
    if (stageFilter !== 'All' && c.stage !== stageFilter) return false;
    if (fraudTypeFilter !== 'All' && c.fraudType !== fraudTypeFilter) return false;
    if (
      searchQuery &&
      !c.caseName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.targetOrgName.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: investigations.filter((c) => c.stage === stage).length,
    recovery: investigations
      .filter((c) => c.stage === stage)
      .reduce((s, c) => s + c.estimatedRecovery, 0),
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Active Cases</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {investigations.length} active investigations across {stageOrder.length} stages
        </p>
      </div>

      {/* Pipeline Status */}
      <div className="rounded-lg border bg-white shadow-sm p-5">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-3">
          Case Pipeline
        </h3>
        <div className="flex items-stretch gap-2">
          {stageCounts.map((item, i) => (
            <div key={item.stage} className="flex items-center flex-1">
              <button
                onClick={() =>
                  setStageFilter(stageFilter === item.stage ? 'All' : item.stage)
                }
                className={cn(
                  'flex-1 rounded-lg border p-3 text-center transition-all hover:shadow-sm',
                  stagePipelineBg[item.stage],
                  stageFilter === item.stage && 'ring-2 ring-amber-500 shadow-sm'
                )}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className={cn('h-2 w-2 rounded-full', stageDotColors[item.stage])} />
                  <span className="text-xs font-semibold text-gray-700">{item.stage}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{item.count}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {formatCurrency(item.recovery, true)}
                </p>
              </button>
              {i < stageCounts.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-300 mx-1 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as CaseStage | 'All')}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-700"
          >
            <option value="All">All Stages</option>
            {stageOrder.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={fraudTypeFilter}
            onChange={(e) => setFraudTypeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-700"
          >
            <option value="All">All Fraud Types</option>
            {fraudTypes.map((ft) => (
              <option key={ft} value={ft}>
                {ft}
              </option>
            ))}
          </select>
        </div>
        {(stageFilter !== 'All' || fraudTypeFilter !== 'All' || searchQuery) && (
          <button
            onClick={() => {
              setStageFilter('All');
              setFraudTypeFilter('All');
              setSearchQuery('');
            }}
            className="text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filteredCases.length} of {investigations.length} cases
        </span>
      </div>

      {/* Cases Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-600 w-8" />
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Case Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Target Org</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Fraud Type</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-600">Est. Recovery</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-600">Stage</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Attorney</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-600">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCases.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className={cn(
                    'hover:bg-gray-50/50 cursor-pointer transition-colors',
                    expandedCase === c.id && 'bg-amber-50/30'
                  )}
                  onClick={() =>
                    setExpandedCase(expandedCase === c.id ? null : c.id)
                  }
                >
                  <td className="py-3 px-4">
                    {expandedCase === c.id ? (
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900">
                      {c.caseName.split(' - ')[0]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{c.targetOrgName}</td>
                  <td className="py-3 px-4">
                    <span className="text-gray-700">{c.fraudType}</span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(c.estimatedRecovery, true)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={cn(
                        'text-[10px] font-medium px-2.5 py-1 rounded-full border',
                        stageColors[c.stage]
                      )}
                    >
                      {c.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{c.assignedAttorney}</td>
                  <td className="py-3 px-4 text-gray-500">
                    {formatRelativeTime(c.lastActivity)}
                  </td>
                </tr>
                {expandedCase === c.id && (
                  <tr key={`${c.id}-expanded`}>
                    <td colSpan={8} className="p-0">
                      <div className="px-8 py-4 bg-gray-50/50 border-b border-gray-100">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Description */}
                          <div className="col-span-2">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                              Case Description
                            </h4>
                            <p className="text-xs text-gray-700 leading-relaxed">
                              {c.description}
                            </p>
                            <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mt-3 mb-1.5">
                              Key Findings
                            </h4>
                            <div className="space-y-1.5">
                              {c.keyFindings.map((finding, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <CheckCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-[11px] text-gray-600">{finding}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Case Metadata */}
                          <div className="space-y-3">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <h4 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
                                Case Details
                              </h4>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-[11px] text-gray-500">Opened</span>
                                  <span className="text-[11px] font-medium text-gray-700">
                                    {formatDate(c.openedDate)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[11px] text-gray-500">Est. Recovery</span>
                                  <span className="text-[11px] font-medium text-green-600">
                                    {formatCurrency(c.estimatedRecovery)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[11px] text-gray-500">Evidence Strength</span>
                                  <span className="text-[11px] font-medium text-gray-700">
                                    {c.evidenceStrength}/100
                                  </span>
                                </div>
                              </div>
                              {/* Evidence Strength Bar */}
                              <div className="mt-2">
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                  <div
                                    className={cn(
                                      'h-1.5 rounded-full',
                                      c.evidenceStrength >= 80
                                        ? 'bg-green-500'
                                        : c.evidenceStrength >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    )}
                                    style={{ width: `${c.evidenceStrength}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filteredCases.length === 0 && (
          <div className="py-12 text-center">
            <Briefcase className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No cases match current filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
