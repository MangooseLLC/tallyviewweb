'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Brain,
  Building2,
  DollarSign,
  FileSearch,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Loader2,
  Sparkles,
  Target,
  Scale,
  ChevronRight,
  Flag,
  Lightbulb,
  TrendingUp,
  Link2,
  Zap,
  Eye,
} from 'lucide-react';

type AnalysisState = 'idle' | 'analyzing' | 'complete';

export default function InvestigationWorkbench() {
  const [tipText, setTipText] = useState(
    'Anonymous tip: Executive Director of Northwest Community Health ($8M budget) steering procurement contracts to company owned by spouse. Multiple sole-source contracts over $50K.'
  );
  const [analysisState, setAnalysisState] = useState<AnalysisState>('complete');

  const handleAnalyze = () => {
    setAnalysisState('analyzing');
    setTimeout(() => setAnalysisState('complete'), 3000);
  };

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Investigation Workbench</h1>
            <span className="text-[10px] font-semibold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Engine 3
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-powered tip analysis, entity profiling, and fraud pattern matching
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Sparkles className="h-3.5 w-3.5 text-teal-500" />
          <span>Tallyview AI v3.2</span>
        </div>
      </div>

      {/* Split Panel Layout */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* LEFT PANEL — Input */}
        <div className="col-span-4 space-y-4 sticky top-6">
          <div className="rounded-lg border bg-white shadow-sm">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <FileSearch className="h-4 w-4 text-teal-600" />
                <h3 className="text-sm font-semibold text-gray-900">Tip Input</h3>
              </div>
              <p className="text-[11px] text-gray-500">
                Paste a whistleblower tip, complaint, or suspicious activity description
              </p>
            </div>
            <div className="p-4">
              <textarea
                value={tipText}
                onChange={(e) => setTipText(e.target.value)}
                className="w-full h-40 text-sm text-gray-700 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-gray-50 placeholder:text-gray-400"
                placeholder="Enter tip or complaint text..."
              />
              <button
                onClick={handleAnalyze}
                disabled={analysisState === 'analyzing' || !tipText.trim()}
                className={cn(
                  'mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all',
                  analysisState === 'analyzing'
                    ? 'bg-teal-100 text-teal-700 cursor-wait'
                    : 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-sm'
                )}
              >
                {analysisState === 'analyzing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Analyze Tip
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Analysis Metadata */}
          {analysisState === 'complete' && (
            <div className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">
                Analysis Metadata
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Processing Time', value: '2.4s' },
                  { label: 'Data Sources Queried', value: '14' },
                  { label: 'Entities Resolved', value: '7' },
                  { label: 'Model', value: 'Tallyview-FCA-v3.2' },
                  { label: 'Timestamp', value: 'Feb 6, 2026 10:34 AM' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-500">{item.label}</span>
                    <span className="text-[11px] font-medium text-gray-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Results */}
        <div className="col-span-8 space-y-5">
          {analysisState === 'idle' && (
            <div className="rounded-lg border bg-white shadow-sm p-16 text-center">
              <Brain className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-gray-500">No Analysis Yet</h3>
              <p className="text-xs text-gray-400 mt-1">
                Enter a tip or complaint in the input panel and click Analyze to begin.
              </p>
            </div>
          )}

          {analysisState === 'analyzing' && (
            <div className="space-y-4">
              {[
                'Resolving entities...',
                'Querying financial databases...',
                'Matching fraud typologies...',
                'Generating evidence brief...',
              ].map((step, i) => (
                <div key={i} className="rounded-lg border bg-white shadow-sm p-5">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-500" />
                      <span className="text-xs font-medium text-teal-600">{step}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-full" />
                      <div className="h-3 bg-gray-100 rounded w-5/6" />
                      <div className="h-3 bg-gray-100 rounded w-4/6" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {analysisState === 'complete' && (
            <div className="space-y-5">
              {/* Risk Score Banner */}
              <div className="rounded-lg border bg-gradient-to-r from-teal-600 to-emerald-600 p-5 shadow-sm text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur">
                      <span className="text-2xl font-bold">78</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold opacity-90">Overall Risk Score</h3>
                      <p className="text-lg font-bold">High probability of actionable findings</p>
                      <p className="text-xs opacity-75 mt-0.5">
                        Based on entity analysis, typology matching, and comparable case outcomes
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1.5 justify-end">
                      <Sparkles className="h-3.5 w-3.5 opacity-75" />
                      <span className="text-xs font-medium opacity-90">AI Confidence</span>
                    </div>
                    <p className="text-3xl font-bold">94%</p>
                  </div>
                </div>
              </div>

              {/* 1. Entity Profile */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-teal-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Entity Profile</h3>
                    <span className="text-[10px] bg-teal-50 text-teal-600 font-medium px-1.5 py-0.5 rounded">
                      Auto-resolved
                    </span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          Organization
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                          Northwest Community Health Alliance
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          Mission
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Providing comprehensive health services to underserved communities in the
                          Pacific Northwest region
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          EIN
                        </p>
                        <p className="text-xs text-gray-700 font-mono mt-0.5">91-0847235</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          Annual Budget
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-0.5">$8,000,000</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          Executive Director
                        </p>
                        <p className="text-xs text-gray-700 mt-0.5">
                          Margaret Chen{' '}
                          <span className="text-red-500 font-medium">(Subject of tip)</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">
                          Board Composition
                        </p>
                        <p className="text-xs text-gray-700 mt-0.5">
                          7 members — 3 independent, 2 community, 1 ex-officio, 1 vacancy
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'IRS Filing Status', value: 'Current', color: 'text-green-600' },
                        { label: 'Last Audit', value: '2024 — Qualified', color: 'text-amber-600' },
                        { label: 'State Registration', value: 'WA Active', color: 'text-green-600' },
                        {
                          label: 'Risk Score',
                          value: '72/100',
                          color: 'text-orange-600',
                        },
                      ].map((item) => (
                        <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-[10px] text-gray-500">{item.label}</p>
                          <p className={cn('text-xs font-semibold mt-0.5', item.color)}>
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Vendor Analysis */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Vendor Analysis</h3>
                  <span className="text-[10px] text-gray-400 ml-auto">Top vendors by payment volume</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left py-2.5 px-4 font-semibold text-gray-600">
                          Vendor
                        </th>
                        <th className="text-right py-2.5 px-4 font-semibold text-gray-600">
                          Total Payments
                        </th>
                        <th className="text-center py-2.5 px-4 font-semibold text-gray-600">
                          Contracts
                        </th>
                        <th className="text-center py-2.5 px-4 font-semibold text-gray-600">
                          Sole-Source
                        </th>
                        <th className="text-center py-2.5 px-4 font-semibold text-gray-600">
                          Related Party
                        </th>
                        <th className="text-center py-2.5 px-4 font-semibold text-gray-600">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[
                        {
                          vendor: 'Pacific Health Supplies LLC',
                          payments: 2400000,
                          contracts: 14,
                          soleSource: true,
                          relatedParty: true,
                          risk: 'Critical',
                        },
                        {
                          vendor: 'Meridian IT Solutions',
                          payments: 680000,
                          contracts: 6,
                          soleSource: true,
                          relatedParty: false,
                          risk: 'High',
                        },
                        {
                          vendor: 'Columbia Insurance Group',
                          payments: 420000,
                          contracts: 2,
                          soleSource: false,
                          relatedParty: false,
                          risk: 'Low',
                        },
                        {
                          vendor: 'Northwest Staffing Partners',
                          payments: 380000,
                          contracts: 4,
                          soleSource: true,
                          relatedParty: false,
                          risk: 'Medium',
                        },
                        {
                          vendor: 'Chen Family Properties LLC',
                          payments: 240000,
                          contracts: 1,
                          soleSource: true,
                          relatedParty: true,
                          risk: 'Critical',
                        },
                      ].map((row) => (
                        <tr key={row.vendor} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-4">
                            <span className="font-medium text-gray-900">{row.vendor}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-gray-700">
                            {formatCurrency(row.payments)}
                          </td>
                          <td className="py-2.5 px-4 text-center text-gray-600">{row.contracts}</td>
                          <td className="py-2.5 px-4 text-center">
                            {row.soleSource ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                <Flag className="h-2.5 w-2.5" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {row.relatedParty ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="h-2.5 w-2.5" /> Yes
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={cn(
                                'text-[10px] font-medium px-2 py-0.5 rounded-full',
                                row.risk === 'Critical'
                                  ? 'bg-red-100 text-red-700'
                                  : row.risk === 'High'
                                  ? 'bg-orange-100 text-orange-700'
                                  : row.risk === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              )}
                            >
                              {row.risk}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Fraud Typology Match */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <Target className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Fraud Typology Match</h3>
                </div>
                <div className="p-4 space-y-4">
                  {[
                    {
                      name: 'Conflict of Interest — Undisclosed Related Party',
                      match: 91,
                      color: 'bg-red-500',
                      bgColor: 'bg-red-50',
                      textColor: 'text-red-700',
                      description:
                        'Financial relationships between organization insiders and vendors not disclosed on conflict of interest forms. Strong match with ED-spouse vendor relationship.',
                    },
                    {
                      name: 'Procurement Steering',
                      match: 87,
                      color: 'bg-orange-500',
                      bgColor: 'bg-orange-50',
                      textColor: 'text-orange-700',
                      description:
                        'Directing contracts to insider-controlled vendors without competitive bidding. 14 sole-source contracts to spouse-owned company matches this pattern closely.',
                    },
                    {
                      name: 'Vendor Concentration',
                      match: 73,
                      color: 'bg-yellow-500',
                      bgColor: 'bg-yellow-50',
                      textColor: 'text-yellow-700',
                      description:
                        'Single vendor receiving 30% of total organizational expenditures. Above the 25% concentration threshold for nonprofit procurement guidelines.',
                    },
                  ].map((typology) => (
                    <div key={typology.name} className={cn('rounded-lg p-4', typology.bgColor)}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className={cn('text-sm font-semibold', typology.textColor)}>
                          {typology.name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'text-xs font-bold px-2 py-0.5 rounded-full text-white',
                              typology.color
                            )}
                          >
                            {typology.match}% match
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                        <div
                          className={cn('h-2 rounded-full transition-all duration-700', typology.color)}
                          style={{ width: `${typology.match}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed">
                        {typology.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Comparable Cases */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Comparable FCA Cases</h3>
                  <span className="text-[10px] text-gray-400 ml-auto">
                    Historical qui tam outcomes
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    {
                      name: 'U.S. ex rel. Smith v. Greenfield Healthcare',
                      type: 'Procurement Steering',
                      outcome: 'Settled',
                      recovery: 12000000,
                      year: '2023',
                      similarity: 89,
                      detail:
                        'CEO directed medical supply contracts to shell company. 18-month investigation, settled before trial.',
                    },
                    {
                      name: 'State v. Pacific Youth Services',
                      type: 'Vendor Concentration / Sole-Source',
                      outcome: 'Judgment',
                      recovery: 4200000,
                      year: '2022',
                      similarity: 82,
                      detail:
                        'Board member funneled contracts to personal business. State AG joined after qui tam filing.',
                    },
                    {
                      name: 'U.S. ex rel. Johnson v. Metro Services Corp',
                      type: 'Related Party Transactions',
                      outcome: 'Settled',
                      recovery: 6100000,
                      year: '2024',
                      similarity: 76,
                      detail:
                        'Multiple board members had undisclosed vendor relationships. DOJ intervention within 6 months.',
                    },
                    {
                      name: 'U.S. v. Central Valley Nonprofit Alliance',
                      type: 'Conflict of Interest',
                      outcome: 'Judgment',
                      recovery: 5300000,
                      year: '2023',
                      similarity: 71,
                      detail:
                        'Executive steered $3.2M in contracts to spouse-controlled entity. Full trial, criminal referral.',
                    },
                  ].map((caseItem) => (
                    <div
                      key={caseItem.name}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100/80 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-teal-700">
                            {caseItem.similarity}%
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">
                            {caseItem.name}
                          </p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {caseItem.year}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">{caseItem.detail}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {caseItem.type}
                          </span>
                          <span
                            className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded',
                              caseItem.outcome === 'Settled'
                                ? 'bg-blue-50 text-blue-600'
                                : 'bg-purple-50 text-purple-600'
                            )}
                          >
                            {caseItem.outcome}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-green-600">
                          {formatCurrency(caseItem.recovery, true)}
                        </p>
                        <p className="text-[10px] text-gray-400">Recovery</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Evidence Brief */}
              <div className="rounded-lg border bg-white shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                  <FileSearch className="h-4 w-4 text-teal-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Evidence Brief</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 font-medium px-1.5 py-0.5 rounded ml-1">
                    AI Generated
                  </span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Key Findings */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-teal-600" />
                      Key Findings
                    </h4>
                    <div className="space-y-2">
                      {[
                        {
                          finding:
                            'Pacific Health Supplies LLC is registered to the residential address of David Chen, spouse of ED Margaret Chen.',
                          source: 'WA Secretary of State, Business Entity Search',
                          confidence: 97,
                        },
                        {
                          finding:
                            '$2.4M paid to Pacific Health Supplies over 3 fiscal years across 14 contracts, all below the $200K board approval threshold.',
                          source: 'IRS Form 990 Schedule O, Financial Records',
                          confidence: 94,
                        },
                        {
                          finding:
                            'No competitive bidding documentation exists for any contract with Pacific Health Supplies. All coded as "sole-source — specialized services."',
                          source: 'Procurement Records, Board Minutes Review',
                          confidence: 91,
                        },
                        {
                          finding:
                            'Margaret Chen did not disclose spousal relationship on annual conflict of interest forms for FY2023, FY2024, or FY2025.',
                          source: 'Conflict of Interest Disclosure Forms',
                          confidence: 88,
                        },
                      ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-800 leading-relaxed">{item.finding}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Link2 className="h-2.5 w-2.5 text-gray-400" />
                              <span className="text-[10px] text-gray-500 italic">
                                Source: {item.source}
                              </span>
                              <span className="text-[10px] font-medium text-teal-600 ml-auto">
                                {item.confidence}% conf.
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Next Steps */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                      Recommended Next Steps
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          step: 'Subpoena bank records for Pacific Health Supplies LLC',
                          priority: 'High',
                        },
                        {
                          step: 'Depose former procurement manager (resigned Oct 2025)',
                          priority: 'High',
                        },
                        {
                          step: 'Request board minutes for all contract approval meetings',
                          priority: 'Medium',
                        },
                        {
                          step: 'File FOIA for state grant compliance reports',
                          priority: 'Medium',
                        },
                        {
                          step: 'Engage forensic accountant for contract pricing analysis',
                          priority: 'High',
                        },
                        {
                          step: 'Cross-reference vendor with other nonprofits in network',
                          priority: 'Low',
                        },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className="flex items-start gap-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-100/50"
                        >
                          <ChevronRight className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[11px] text-gray-700">{item.step}</p>
                            <span
                              className={cn(
                                'text-[9px] font-medium mt-1 inline-block px-1.5 py-0.5 rounded',
                                item.priority === 'High'
                                  ? 'bg-red-100 text-red-600'
                                  : item.priority === 'Medium'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-gray-100 text-gray-500'
                              )}
                            >
                              {item.priority} Priority
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legal Basis */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-indigo-500" />
                      Legal Basis Assessment
                    </h4>
                    <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100/50">
                      <p className="text-[11px] text-gray-700 leading-relaxed">
                        <strong>False Claims Act (31 U.S.C. Section 3729-3733):</strong> Organization receives
                        federal grant funding for community health programs. Diversion of funds through
                        self-dealing procurement likely constitutes false claims for federal funds.
                        Estimated treble damages basis: $2.4M x 3 = $7.2M plus penalties.
                      </p>
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-indigo-100">
                        <div className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-indigo-500" />
                          <span className="text-[10px] font-medium text-indigo-600">
                            FCA Viability: Strong
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-medium text-green-600">
                            Est. Recovery: $8.2M
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3 text-gray-500" />
                          <span className="text-[10px] font-medium text-gray-500">
                            Relator Share (15-25%): $1.2M-$2.1M
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
