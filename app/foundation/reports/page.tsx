'use client';

import { cn } from '@/lib/utils';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  FileBarChart,
  Clock,
} from 'lucide-react';

const reportMonths = [
  {
    id: 'report-jan-2026',
    month: 'January 2026',
    date: '2026-02-03',
    status: 'Published',
    highlights: {
      portfolioScore: 83,
      scoreChange: +1,
      highRiskOrgs: 4,
      highRiskChange: 0,
      totalAlerts: 85,
      resolvedAlerts: 22,
      newGrants: 3,
      totalValue: '$34.2M',
    },
    keyFindings: [
      'Cascade Community Alliance risk score deteriorated to 31 — recommend grant suspension review',
      'Portfolio average compliance score improved to 83 from 82',
      '4 organizations maintain high-risk status for 3+ consecutive months',
      'NW Digital Literacy Project grant utilization critically low at 12%',
      '22 alerts resolved this month, 15 new alerts generated',
    ],
  },
  {
    id: 'report-dec-2025',
    month: 'December 2025',
    date: '2026-01-05',
    status: 'Published',
    highlights: {
      portfolioScore: 82,
      scoreChange: +1,
      highRiskOrgs: 4,
      highRiskChange: -1,
      totalAlerts: 78,
      resolvedAlerts: 18,
      newGrants: 5,
      totalValue: '$33.8M',
    },
    keyFindings: [
      'High-risk org count decreased from 5 to 4 with successful remediation',
      'Year-end giving season drove 12% increase in grantee revenue',
      'Portland Urban Gardens risk score continued decline',
      '18 alerts resolved through active engagement',
    ],
  },
  {
    id: 'report-nov-2025',
    month: 'November 2025',
    date: '2025-12-04',
    status: 'Published',
    highlights: {
      portfolioScore: 81,
      scoreChange: 0,
      highRiskOrgs: 5,
      highRiskChange: 0,
      totalAlerts: 72,
      resolvedAlerts: 14,
      newGrants: 2,
      totalValue: '$33.1M',
    },
    keyFindings: [
      'Portfolio health stabilized after Q3 adjustments',
      'River Valley Health Outreach flagged for going concern risk',
      'Compliance score steady across portfolio',
      '14 alerts resolved, 12 new alerts detected',
    ],
  },
];

export default function ReportsPage() {
  const latestReport = reportMonths[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portfolio Reports</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monthly portfolio health reports and analysis
        </p>
      </div>

      {/* Latest Report Preview */}
      <div className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileBarChart className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Portfolio Health Report — {latestReport.month}
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                Published {latestReport.date}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
            Latest
          </span>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-5">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Portfolio Score</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{latestReport.highlights.portfolioScore}</span>
              <span className={cn(
                'text-xs font-medium flex items-center gap-0.5 mb-1',
                latestReport.highlights.scoreChange >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {latestReport.highlights.scoreChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {latestReport.highlights.scoreChange >= 0 ? '+' : ''}{latestReport.highlights.scoreChange}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">High Risk Orgs</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-red-600">{latestReport.highlights.highRiskOrgs}</span>
              <span className="text-xs font-medium text-gray-400 mb-1">
                {latestReport.highlights.highRiskChange === 0
                  ? 'No change'
                  : `${latestReport.highlights.highRiskChange > 0 ? '+' : ''}${latestReport.highlights.highRiskChange}`}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Alerts Resolved</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-green-600">{latestReport.highlights.resolvedAlerts}</span>
              <span className="text-xs font-medium text-gray-400 mb-1">
                of {latestReport.highlights.totalAlerts} total
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Portfolio Value</p>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-2xl font-bold text-gray-900">{latestReport.highlights.totalValue}</span>
            </div>
          </div>
        </div>

        {/* Key Findings */}
        <div className="mb-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Findings</h3>
          <ul className="space-y-1.5">
            {latestReport.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-sm text-gray-600">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Download Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <button className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 transition-colors">
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <FileText className="h-4 w-4" />
            Executive Summary
          </button>
        </div>
      </div>

      {/* Previous Reports */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Previous Reports</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportMonths.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{report.month}</p>
                    <p className="text-[11px] text-gray-400">{report.date}</p>
                  </div>
                </div>
                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
                  {report.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="text-center rounded-md bg-gray-50 px-2 py-1.5">
                  <p className="text-[10px] text-gray-400">Score</p>
                  <p className="text-sm font-bold text-gray-900">{report.highlights.portfolioScore}</p>
                </div>
                <div className="text-center rounded-md bg-gray-50 px-2 py-1.5">
                  <p className="text-[10px] text-gray-400">High Risk</p>
                  <p className="text-sm font-bold text-red-600">{report.highlights.highRiskOrgs}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Download className="h-3 w-3" />
                  PDF
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  <Download className="h-3 w-3" />
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
