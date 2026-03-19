'use client';

import { useState } from 'react';
import { fraudTypologies } from '@/lib/data/fraud-typologies';
import { cn } from '@/lib/utils';
import type { DetectionDifficulty, FraudCategoryGroup } from '@/lib/types';
import {
  Search,
  AlertTriangle,
  Briefcase,
  ChevronDown,
  ChevronRight,
  XCircle,
  Radar,
  BarChart3,
  FileText,
  Database,
  Activity,
} from 'lucide-react';

const categoryGroups: FraudCategoryGroup[] = ['Asset Misappropriation', 'Corruption', 'Financial Reporting'];
const categories = Array.from(new Set(fraudTypologies.map((ft) => ft.category))).sort();

const categoryColors: Record<string, string> = {
  'Cash / Revenue': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Expense / Disbursement': 'bg-sky-100 text-sky-700 border-sky-200',
  Procurement: 'bg-blue-100 text-blue-700 border-blue-200',
  Compensation: 'bg-purple-100 text-purple-700 border-purple-200',
  Governance: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Fund Management': 'bg-teal-100 text-teal-700 border-teal-200',
  Payroll: 'bg-rose-100 text-rose-700 border-rose-200',
  'Financial Reporting': 'bg-orange-100 text-orange-700 border-orange-200',
  Assets: 'bg-slate-100 text-slate-700 border-slate-200',
};

const groupColors: Record<FraudCategoryGroup, string> = {
  'Asset Misappropriation': 'border-red-300 bg-red-50 text-red-700',
  Corruption: 'border-amber-300 bg-amber-50 text-amber-700',
  'Financial Reporting': 'border-blue-300 bg-blue-50 text-blue-700',
};

const difficultyColors: Record<DetectionDifficulty, string> = {
  Low: 'bg-green-100 text-green-700',
  'Low-Medium': 'bg-lime-100 text-lime-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Hard: 'bg-red-100 text-red-700',
};

export default function FraudTypologiesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [groupFilter, setGroupFilter] = useState<FraudCategoryGroup | 'All'>('All');
  const [expandedTypology, setExpandedTypology] = useState<string | null>(null);

  const filteredTypologies = fraudTypologies.filter((ft) => {
    if (groupFilter !== 'All' && ft.categoryGroup !== groupFilter) return false;
    if (categoryFilter !== 'All' && ft.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        ft.name.toLowerCase().includes(q) ||
        ft.description.toLowerCase().includes(q) ||
        ft.redFlags.some((rf) => rf.toLowerCase().includes(q)) ||
        ft.financialSignatures.some((fs) => fs.toLowerCase().includes(q)) ||
        ft.detectionMethods.some((dm) => dm.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalFrequency = fraudTypologies.reduce((s, ft) => s + ft.frequencyInData, 0);
  const maxFrequency = Math.max(...fraudTypologies.map((f) => f.frequencyInData));

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fraud Typology Database</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {fraudTypologies.length} fraud typologies across {categoryGroups.length} ACFE categories — {totalFrequency} total pattern matches in Tallyview data
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, description, red flags, financial signatures, or detection methods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 font-medium mr-1">ACFE Group:</span>
          <button
            onClick={() => { setGroupFilter('All'); setCategoryFilter('All'); }}
            className={cn(
              'text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors',
              groupFilter === 'All' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            All ({fraudTypologies.length})
          </button>
          {categoryGroups.map((g) => {
            const count = fraudTypologies.filter((ft) => ft.categoryGroup === g).length;
            return (
              <button
                key={g}
                onClick={() => { setGroupFilter(groupFilter === g ? 'All' : g); setCategoryFilter('All'); }}
                className={cn(
                  'text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors',
                  groupFilter === g ? groupColors[g] : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                )}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 font-medium mr-1">Category:</span>
          {categories
            .filter((cat) => groupFilter === 'All' || fraudTypologies.some((ft) => ft.categoryGroup === groupFilter && ft.category === cat))
            .map((cat) => {
              const count = fraudTypologies.filter((ft) =>
                ft.category === cat && (groupFilter === 'All' || ft.categoryGroup === groupFilter)
              ).length;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? 'All' : cat)}
                  className={cn(
                    'text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors',
                    categoryFilter === cat ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {cat} ({count})
                </button>
              );
            })}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTypologies.map((ft) => {
          const isExpanded = expandedTypology === ft.id;
          return (
            <div
              key={ft.id}
              className={cn(
                'rounded-lg border bg-white shadow-sm transition-all',
                isExpanded && 'ring-1 ring-amber-200 shadow-md'
              )}
            >
              <button
                onClick={() => setExpandedTypology(isExpanded ? null : ft.id)}
                className="w-full text-left p-4 flex items-center gap-4"
              >
                <div className="flex-shrink-0">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900">{ft.name}</h3>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border', categoryColors[ft.category] || 'bg-gray-100 text-gray-600 border-gray-200')}>
                      {ft.category}
                    </span>
                    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', difficultyColors[ft.detectionDifficulty])}>
                      {ft.detectionDifficulty} detection
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-1">{ft.description}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Red Flags</p>
                    <p className="text-sm font-bold text-gray-700">{ft.redFlags.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Frequency</p>
                    <p className="text-sm font-bold text-amber-600">{ft.frequencyInData}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Cases</p>
                    <p className="text-sm font-bold text-gray-700">{ft.exampleCases.length}</p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          Red Flags
                        </h4>
                        <div className="space-y-1.5">
                          {ft.redFlags.map((flag, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                              {flag}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-blue-500" />
                          Financial Signatures
                        </h4>
                        <div className="space-y-1.5">
                          {ft.financialSignatures.map((sig, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                              {sig}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <XCircle className="h-3.5 w-3.5 text-amber-500" />
                          Control Failures
                        </h4>
                        <div className="space-y-1.5">
                          {ft.controlFailures.map((cf, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                              {cf}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <Radar className="h-3.5 w-3.5 text-amber-600" />
                          Detection Methods
                        </h4>
                        <div className="space-y-1.5">
                          {ft.detectionMethods.map((dm, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                              {dm}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-gray-500" />
                          Data Requirements
                        </h4>
                        <div className="space-y-1.5">
                          {ft.dataRequirements.map((dr, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] text-gray-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" />
                              {dr}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                          Example Cases
                        </h4>
                        <div className="space-y-1.5">
                          {ft.exampleCases.map((ec, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                              <span className={cn(ec.includes('current') || ec.includes('ongoing') ? 'text-amber-700 font-medium' : 'text-gray-600')}>
                                {ec}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                            <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                            Frequency in Tallyview Data
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(ft.frequencyInData / maxFrequency) * 100}%` }} />
                            </div>
                            <span className="text-xs font-bold text-amber-600 w-12 text-right">
                              {ft.frequencyInData} hits
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {((ft.frequencyInData / totalFrequency) * 100).toFixed(1)}% of all detected patterns
                          </p>
                        </div>
                      </div>

                      {ft.related990Lines.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-gray-500" />
                            Related 990 Lines
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {ft.related990Lines.map((line, i) => (
                              <span key={i} className="text-[10px] bg-gray-100 text-gray-600 rounded px-2 py-0.5">
                                {line}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredTypologies.length === 0 && (
          <div className="rounded-lg border bg-white shadow-sm py-12 text-center">
            <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No typologies match your search</p>
            <button
              onClick={() => { setSearchQuery(''); setCategoryFilter('All'); setGroupFilter('All'); }}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium mt-1"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
