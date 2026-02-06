'use client';

import { nonprofits } from '@/lib/data/nonprofits';
import { anomalies } from '@/lib/data/anomalies';
import { investigations } from '@/lib/data/investigations';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  FileBarChart,
  Download,
  FileText,
  TrendingUp,
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';

export default function RegulatorReportsPage() {
  // Filing status data
  const filingCurrent = nonprofits.filter(o => o.filing990Status === 'Current').length;
  const filingOverdue = nonprofits.filter(o => o.filing990Status === 'Overdue').length;
  const filingDelinquent = nonprofits.filter(o => o.filing990Status === 'Delinquent').length;
  const totalOrgs = nonprofits.length;

  // Compliance data
  const complianceHigh = nonprofits.filter(o => o.complianceScore >= 80).length;
  const complianceMedium = nonprofits.filter(o => o.complianceScore >= 60 && o.complianceScore < 80).length;
  const complianceLow = nonprofits.filter(o => o.complianceScore >= 40 && o.complianceScore < 60).length;
  const complianceCritical = nonprofits.filter(o => o.complianceScore < 40).length;

  // Anomaly stats
  const anomalyByCategory = anomalies.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const anomalyBySeverity = anomalies.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Program area audit status
  const programAreas = ['Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security'];
  const programAreaStats = programAreas.map(area => {
    const orgs = nonprofits.filter(o => o.programArea === area);
    const qualified = orgs.filter(o => o.auditOpinion === 'Qualified').length;
    const unqualified = orgs.filter(o => o.auditOpinion === 'Unqualified').length;
    const avgCompliance = orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.complianceScore, 0) / orgs.length) : 0;
    return { area, count: orgs.length, qualified, unqualified, avgCompliance };
  });

  // Downloadable reports
  const reports = [
    {
      id: 'r1',
      title: 'Annual Jurisdiction Report — FY 2025',
      description: 'Comprehensive overview of all registered charities, compliance rates, and enforcement actions.',
      type: 'PDF',
      date: 'Jan 31, 2026',
      pages: 47,
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: 'r2',
      title: 'High-Risk Entity Assessment',
      description: 'Detailed analysis of 23 organizations flagged for elevated risk. Includes AI-generated risk factors.',
      type: 'PDF',
      date: 'Feb 5, 2026',
      pages: 28,
      icon: <Shield className="h-5 w-5" />,
    },
    {
      id: 'r3',
      title: 'Quarterly Compliance Trend Report — Q4 2025',
      description: 'Quarter-over-quarter compliance trends, filing rates, and anomaly statistics.',
      type: 'PDF',
      date: 'Jan 15, 2026',
      pages: 19,
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      id: 'r4',
      title: 'Entity Relationship Map — Cross-Org Analysis',
      description: 'Visual network map of board member overlaps, shared vendors, and related-party transactions.',
      type: 'PDF',
      date: 'Feb 3, 2026',
      pages: 12,
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: 'r5',
      title: 'Investigation Pipeline Summary',
      description: `Status report on ${investigations.length} active investigations with estimated recovery amounts.`,
      type: 'PDF',
      date: 'Feb 6, 2026',
      pages: 8,
      icon: <AlertTriangle className="h-5 w-5" />,
    },
    {
      id: 'r6',
      title: 'Connected Organizations Data Export',
      description: 'Raw data export of all connected organization financials, compliance scores, and risk ratings.',
      type: 'CSV',
      date: 'Feb 6, 2026',
      pages: undefined,
      icon: <FileBarChart className="h-5 w-5" />,
    },
  ];

  // Compliance trend data (simulated quarters)
  const complianceTrends = [
    { quarter: 'Q1 2025', avgScore: 74, filingRate: 88, anomalyCount: 42 },
    { quarter: 'Q2 2025', avgScore: 76, filingRate: 90, anomalyCount: 38 },
    { quarter: 'Q3 2025', avgScore: 78, filingRate: 91, anomalyCount: 51 },
    { quarter: 'Q4 2025', avgScore: 77, filingRate: 89, anomalyCount: 67 },
    { quarter: 'Q1 2026', avgScore: 79, filingRate: 92, anomalyCount: anomalies.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Filing status, compliance trends, and downloadable report cards</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Last updated: Feb 6, 2026</span>
        </div>
      </div>

      {/* Filing Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Annual Filing Status */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Annual Filing Status Overview</h2>
          </div>

          <div className="flex items-center gap-6 mb-5">
            <div className="relative h-32 w-32">
              {/* Simulated donut chart with CSS */}
              <svg viewBox="0 0 36 36" className="h-32 w-32 transform -rotate-90">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.915" fill="none"
                  stroke="#10b981" strokeWidth="3"
                  strokeDasharray={`${(filingCurrent / totalOrgs) * 100} ${100 - (filingCurrent / totalOrgs) * 100}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="18" cy="18" r="15.915" fill="none"
                  stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray={`${(filingOverdue / totalOrgs) * 100} ${100 - (filingOverdue / totalOrgs) * 100}`}
                  strokeDashoffset={`${-((filingCurrent / totalOrgs) * 100)}`}
                />
                <circle
                  cx="18" cy="18" r="15.915" fill="none"
                  stroke="#ef4444" strokeWidth="3"
                  strokeDasharray={`${(filingDelinquent / totalOrgs) * 100} ${100 - (filingDelinquent / totalOrgs) * 100}`}
                  strokeDashoffset={`${-((filingCurrent / totalOrgs) * 100 + (filingOverdue / totalOrgs) * 100)}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{totalOrgs}</p>
                  <p className="text-[10px] text-gray-400">Total</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-600">Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{filingCurrent}</span>
                  <span className="text-[10px] text-gray-400">{formatPercent((filingCurrent / totalOrgs) * 100)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-600">Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{filingOverdue}</span>
                  <span className="text-[10px] text-gray-400">{formatPercent((filingOverdue / totalOrgs) * 100)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600">Delinquent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-red-600">{filingDelinquent}</span>
                  <span className="text-[10px] text-gray-400">{formatPercent((filingDelinquent / totalOrgs) * 100)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filing status bar */}
          <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
            <div className="bg-green-500" style={{ width: `${(filingCurrent / totalOrgs) * 100}%` }} />
            <div className="bg-amber-500" style={{ width: `${(filingOverdue / totalOrgs) * 100}%` }} />
            <div className="bg-red-500" style={{ width: `${(filingDelinquent / totalOrgs) * 100}%` }} />
          </div>
        </div>

        {/* Compliance Score Distribution */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Compliance Score Distribution</h2>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-xs text-gray-600">High Compliance (80+)</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{complianceHigh} orgs</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-green-500" style={{ width: `${(complianceHigh / totalOrgs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-xs text-gray-600">Moderate (60–79)</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{complianceMedium} orgs</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-yellow-500" style={{ width: `${(complianceMedium / totalOrgs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                  <span className="text-xs text-gray-600">Low (40–59)</span>
                </div>
                <span className="text-xs font-semibold text-gray-900">{complianceLow} orgs</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-orange-500" style={{ width: `${(complianceLow / totalOrgs) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-xs text-gray-600">Critical (&lt;40)</span>
                </div>
                <span className="text-xs font-semibold text-red-600">{complianceCritical} orgs</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100">
                <div className="h-3 rounded-full bg-red-500" style={{ width: `${(complianceCritical / totalOrgs) * 100}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t flex justify-between text-xs">
            <span className="text-gray-400">Average Compliance Score</span>
            <span className="font-bold text-gray-900">
              {Math.round(nonprofits.reduce((s, o) => s + o.complianceScore, 0) / totalOrgs)}
            </span>
          </div>
        </div>
      </div>

      {/* Compliance Trends */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Compliance Trends</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Quarterly compliance metrics over time</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quarter</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Compliance Score</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Filing Rate</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Anomalies Detected</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">Score Trend</th>
              </tr>
            </thead>
            <tbody>
              {complianceTrends.map((t, idx) => {
                const prevScore = idx > 0 ? complianceTrends[idx - 1].avgScore : t.avgScore;
                const scoreDiff = t.avgScore - prevScore;
                return (
                  <tr key={t.quarter} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-medium text-gray-900 text-xs">{t.quarter}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs font-bold text-gray-900">{t.avgScore}</span>
                      {idx > 0 && (
                        <span className={cn(
                          'ml-1.5 text-[10px] font-medium',
                          scoreDiff > 0 ? 'text-green-600' : scoreDiff < 0 ? 'text-red-600' : 'text-gray-400'
                        )}>
                          {scoreDiff > 0 ? '+' : ''}{scoreDiff}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        'text-xs font-medium',
                        t.filingRate >= 90 ? 'text-green-600' : t.filingRate >= 85 ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {t.filingRate}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="text-xs text-gray-700">{t.anomalyCount}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-gray-100">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              t.avgScore >= 78 ? 'bg-green-500' : t.avgScore >= 75 ? 'bg-yellow-500' : 'bg-orange-500'
                            )}
                            style={{ width: `${t.avgScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Anomaly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Anomalies by Category</h3>
          <div className="space-y-3">
            {Object.entries(anomalyByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{category}</span>
                    <span className="text-xs font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${(count / anomalies.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-white rounded-lg border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Anomalies by Severity</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              { label: 'High', color: 'bg-red-500', textColor: 'text-red-600', count: anomalyBySeverity['High'] || 0 },
              { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-600', count: anomalyBySeverity['Medium'] || 0 },
              { label: 'Low', color: 'bg-green-500', textColor: 'text-green-600', count: anomalyBySeverity['Low'] || 0 },
              { label: 'Info', color: 'bg-blue-500', textColor: 'text-blue-600', count: anomalyBySeverity['Info'] || 0 },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className={cn('h-2.5 w-2.5 rounded-full mx-auto mb-1.5', s.color)} />
                <p className={cn('text-xl font-bold', s.textColor)}>{s.count}</p>
                <p className="text-[10px] text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
            <div className="bg-red-500" style={{ width: `${((anomalyBySeverity['High'] || 0) / anomalies.length) * 100}%` }} />
            <div className="bg-yellow-500" style={{ width: `${((anomalyBySeverity['Medium'] || 0) / anomalies.length) * 100}%` }} />
            <div className="bg-green-500" style={{ width: `${((anomalyBySeverity['Low'] || 0) / anomalies.length) * 100}%` }} />
            <div className="bg-blue-500" style={{ width: `${((anomalyBySeverity['Info'] || 0) / anomalies.length) * 100}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">{anomalies.length} total anomalies detected</p>
        </div>
      </div>

      {/* Downloadable Reports */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Downloadable Report Cards</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Pre-generated reports available for download</p>
        </div>
        <div className="divide-y">
          {reports.map(report => (
            <div key={report.id} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-amber-50 text-amber-600 p-2.5 shrink-0">
                  {report.icon}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{report.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{report.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-gray-400">{report.date}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{report.type}</span>
                    {report.pages && <span className="text-[10px] text-gray-400">{report.pages} pages</span>}
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors shrink-0">
                <Download className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Program Area Audit Summary */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Audit Status by Program Area</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Area</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orgs</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unqualified Audit</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qualified Audit</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Compliance</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">Score Distribution</th>
              </tr>
            </thead>
            <tbody>
              {programAreaStats.sort((a, b) => a.avgCompliance - b.avgCompliance).map((pa, idx) => (
                <tr key={pa.area} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-5 py-3 text-xs font-medium text-gray-900">{pa.area}</td>
                  <td className="px-5 py-3 text-right text-xs text-gray-600">{pa.count}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-green-600 font-medium">{pa.unqualified}</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {pa.qualified > 0 ? (
                      <span className="text-xs text-amber-600 font-medium">{pa.qualified}</span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      pa.avgCompliance >= 80 ? 'bg-green-100 text-green-800' :
                      pa.avgCompliance >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    )}>
                      {pa.avgCompliance}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={cn(
                          'h-2 rounded-full',
                          pa.avgCompliance >= 80 ? 'bg-green-500' :
                          pa.avgCompliance >= 60 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        )}
                        style={{ width: `${pa.avgCompliance}%` }}
                      />
                    </div>
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
