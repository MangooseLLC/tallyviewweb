'use client';

import { useState, useMemo } from 'react';
import { investigations } from '@/lib/data/investigations';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Search,
  ArrowUpDown,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
  Scale,
  DollarSign,
  Shield,
  Clock,
  Briefcase,
} from 'lucide-react';

type SortField = 'evidenceStrength' | 'estimatedRecovery' | 'riskScore';
type SortDir = 'asc' | 'desc';

const stageColors: Record<string, string> = {
  Tip: 'bg-blue-100 text-blue-700 border-blue-200',
  Analysis: 'bg-purple-100 text-purple-700 border-purple-200',
  Discovery: 'bg-amber-100 text-amber-700 border-amber-200',
  Filing: 'bg-orange-100 text-orange-700 border-orange-200',
  Recovery: 'bg-green-100 text-green-700 border-green-200',
};

const stageOrder: Record<string, number> = {
  Tip: 0,
  Analysis: 1,
  Discovery: 2,
  Filing: 3,
  Recovery: 4,
};

export default function InvestigationsPage() {
  const [sortField, setSortField] = useState<SortField>('evidenceStrength');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => {
    return [...investigations].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'evidenceStrength':
          cmp = a.evidenceStrength - b.evidenceStrength;
          break;
        case 'estimatedRecovery':
          cmp = a.estimatedRecovery - b.estimatedRecovery;
          break;
        case 'riskScore':
          cmp = stageOrder[a.stage] - stageOrder[b.stage];
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [sortField, sortDir]);

  const totalExposure = investigations.reduce((s, c) => s + c.estimatedRecovery, 0);
  const avgEvidence = Math.round(investigations.reduce((s, c) => s + c.evidenceStrength, 0) / investigations.length);
  const stageGroups = investigations.reduce((acc, c) => {
    acc[c.stage] = (acc[c.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={cn(
        'flex items-center gap-1 text-xs font-medium transition-colors',
        sortField === field ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
      {sortField === field && (
        sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investigation Queue</h1>
        <p className="text-sm text-gray-500 mt-1">Prioritized organizations flagged for investigation</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-amber-600" />
            <p className="text-xs font-medium text-gray-500">Total Cases</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{investigations.length}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(stageGroups).map(([stage, count]) => (
              <span key={stage} className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border', stageColors[stage])}>
                {stage}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-red-500" />
            <p className="text-xs font-medium text-gray-500">Total Estimated Exposure</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExposure, true)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Across all active cases</p>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-medium text-gray-500">Avg Evidence Strength</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{avgEvidence}%</p>
          <div className="mt-2 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-amber-500 transition-all" style={{ width: `${avgEvidence}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-lg border shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <p className="text-xs font-medium text-gray-500">Most Recent Activity</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDate(investigations.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))[0].lastActivity)}</p>
          <p className="text-[10px] text-gray-400 mt-1">Latest case update</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-4 bg-white rounded-lg border shadow-sm px-5 py-3">
        <span className="text-xs text-gray-400 font-medium">Sort by:</span>
        <SortButton field="evidenceStrength" label="Evidence Strength" />
        <SortButton field="estimatedRecovery" label="Exposure Amount" />
        <SortButton field="riskScore" label="Case Stage" />
      </div>

      {/* Investigation Cards */}
      <div className="space-y-4">
        {sorted.map((inv) => {
          const isExpanded = expandedId === inv.id;
          return (
            <div key={inv.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
              {/* Header Row */}
              <div
                className="px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : inv.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{inv.targetOrgName}</h3>
                      <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border', stageColors[inv.stage])}>
                        {inv.stage}
                      </span>
                      <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                        {inv.fraudType}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{inv.description}</p>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Exposure</p>
                      <p className="text-sm font-bold text-red-600">{formatCurrency(inv.estimatedRecovery, true)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Evidence</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              inv.evidenceStrength >= 80 ? 'bg-green-500' :
                              inv.evidenceStrength >= 60 ? 'bg-yellow-500' :
                              inv.evidenceStrength >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            )}
                            style={{ width: `${inv.evidenceStrength}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700">{inv.evidenceStrength}%</span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t px-5 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Key Findings */}
                    <div className="lg:col-span-2">
                      <h4 className="text-xs font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Primary Risk Factors
                      </h4>
                      <ul className="space-y-2">
                        {inv.keyFindings.map((finding, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Case Details */}
                    <div className="space-y-3">
                      <div className="bg-white rounded-lg border p-3 space-y-2.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Case ID</span>
                          <span className="font-mono text-gray-700">{inv.id}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Assigned Attorney</span>
                          <span className="font-medium text-gray-700">{inv.assignedAttorney}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Opened</span>
                          <span className="text-gray-700">{formatDate(inv.openedDate)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Last Activity</span>
                          <span className="text-gray-700">{formatDate(inv.lastActivity)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Est. Recovery</span>
                          <span className="font-semibold text-red-600">{formatCurrency(inv.estimatedRecovery)}</span>
                        </div>
                      </div>

                      {/* Evidence Strength Bar */}
                      <div className="bg-white rounded-lg border p-3">
                        <p className="text-[10px] text-gray-400 mb-1.5">Evidence Strength</p>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-3 rounded-full transition-all',
                              inv.evidenceStrength >= 80 ? 'bg-green-500' :
                              inv.evidenceStrength >= 60 ? 'bg-yellow-500' :
                              inv.evidenceStrength >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            )}
                            style={{ width: `${inv.evidenceStrength}%` }}
                          />
                        </div>
                        <p className="text-xs font-semibold text-gray-700 mt-1">{inv.evidenceStrength}% confidence</p>
                      </div>

                      {/* Action Button */}
                      <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shadow-sm">
                        <FileText className="h-3.5 w-3.5" />
                        Generate Investigation Brief
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
