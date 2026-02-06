'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  Circle,
  AlertTriangle,
  Download,
  FileText,
  FolderOpen,
  Clock,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

interface AuditItem {
  id: string;
  label: string;
  category: string;
  completed: boolean;
  critical: boolean;
}

interface DataExport {
  id: string;
  label: string;
  recordCount: number;
  lastUpdated: string;
}

const auditItems: AuditItem[] = [
  { id: 'ai-1', label: 'Bank reconciliations (all 12 months)', category: 'Financial Records', completed: true, critical: true },
  { id: 'ai-2', label: 'Chart of accounts mapping verification', category: 'Financial Records', completed: true, critical: false },
  { id: 'ai-3', label: 'General ledger trial balance', category: 'Financial Records', completed: true, critical: true },
  { id: 'ai-4', label: 'Revenue recognition documentation', category: 'Financial Records', completed: true, critical: true },
  { id: 'ai-5', label: 'Functional expense allocation methodology', category: 'Financial Records', completed: true, critical: true },
  { id: 'ai-6', label: 'Board meeting minutes (all quarters)', category: 'Governance', completed: true, critical: true },
  { id: 'ai-7', label: 'Conflict of interest disclosures', category: 'Governance', completed: true, critical: false },
  { id: 'ai-8', label: 'Executive compensation documentation', category: 'Governance', completed: true, critical: true },
  { id: 'ai-9', label: 'Gift acceptance policy', category: 'Governance', completed: false, critical: false },
  { id: 'ai-10', label: 'Restricted fund tracking reports', category: 'Compliance', completed: true, critical: true },
  { id: 'ai-11', label: 'Grant compliance documentation', category: 'Compliance', completed: true, critical: true },
  { id: 'ai-12', label: 'Payroll tax filings (941s, W-2s)', category: 'Compliance', completed: true, critical: true },
  { id: 'ai-13', label: 'State charitable registration renewal', category: 'Compliance', completed: false, critical: false },
  { id: 'ai-14', label: 'Vendor 1099 documentation', category: 'Vendor & Contracts', completed: true, critical: false },
  { id: 'ai-15', label: 'Contracts over $25,000 with competitive bids', category: 'Vendor & Contracts', completed: true, critical: true },
  { id: 'ai-16', label: 'Insurance certificates (D&O, liability)', category: 'Vendor & Contracts', completed: true, critical: false },
  { id: 'ai-17', label: 'Fixed asset depreciation schedules', category: 'Asset Management', completed: true, critical: false },
  { id: 'ai-18', label: 'Investment policy and performance', category: 'Asset Management', completed: false, critical: false },
];

const dataExports: DataExport[] = [
  { id: 'de-1', label: 'General Ledger Export', recordCount: 4847, lastUpdated: '2 hours ago' },
  { id: 'de-2', label: 'Accounts Payable Aging', recordCount: 142, lastUpdated: '2 hours ago' },
  { id: 'de-3', label: 'Accounts Receivable Aging', recordCount: 87, lastUpdated: '2 hours ago' },
  { id: 'de-4', label: 'Payroll Summary', recordCount: 24, lastUpdated: '1 day ago' },
  { id: 'de-5', label: 'Bank Reconciliations', recordCount: 12, lastUpdated: '3 days ago' },
  { id: 'de-6', label: 'Restricted Fund Transactions', recordCount: 234, lastUpdated: '2 hours ago' },
  { id: 'de-7', label: 'Vendor Payment History', recordCount: 1203, lastUpdated: '2 hours ago' },
  { id: 'de-8', label: 'Board Meeting Documents', recordCount: 16, lastUpdated: '2 weeks ago' },
];

const missingDocs = [
  { label: 'Gift acceptance policy document', severity: 'low' as const },
  { label: 'State charitable registration renewal (due in 60 days)', severity: 'medium' as const },
  { label: 'Investment policy and performance report', severity: 'low' as const },
];

export default function AuditPrepPage() {
  const [items, setItems] = useState(auditItems);
  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const readinessScore = 87;

  const categories = Array.from(new Set(items.map(i => i.category)));

  const toggleItem = (id: string) => {
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Preparation</h1>
        <p className="text-sm text-gray-500 mt-0.5">Organized documentation and readiness tracking</p>
      </div>

      {/* Time Savings Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-500 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">62% reduction in audit prep time</p>
              <p className="text-amber-100 text-xs mt-0.5">Automated data organization saves an estimated 47 hours vs. manual preparation</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-white/80 text-xs">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by Tallyview AI
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column — Score + Checklist */}
        <div className="col-span-2 space-y-6">
          {/* Audit Readiness Score */}
          <div className="bg-white rounded-lg border p-5 shadow-sm">
            <div className="flex items-center gap-5">
              {/* Progress Circle */}
              <div className="relative flex-shrink-0">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke="url(#scoreGradient)" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${readinessScore * 2.64} ${264 - readinessScore * 2.64}`}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#14b8a6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{readinessScore}</p>
                    <p className="text-[10px] text-gray-400">/100</p>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Audit Readiness Score</h3>
                <p className="text-xs text-gray-500 mt-0.5">{completedCount} of {totalCount} checklist items complete</p>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-500 rounded-full"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{Math.round((completedCount / totalCount) * 100)}% checklist completion</p>
              </div>
            </div>
          </div>

          {/* Audit Checklist */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-5 border-b">
              <h3 className="text-sm font-semibold text-gray-900">Audit Preparation Checklist</h3>
              <p className="text-xs text-gray-500 mt-0.5">Toggle items as you verify documentation</p>
            </div>

            {categories.map(category => (
              <div key={category}>
                <div className="px-5 py-2 bg-gray-50 border-b">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{category}</p>
                </div>
                <div className="divide-y">
                  {items.filter(i => i.category === category).map(item => (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      {item.completed ? (
                        <CheckCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {item.label}
                      </span>
                      {item.critical && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-600 flex-shrink-0">
                          Critical
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Missing Documentation */}
          <div className="bg-white rounded-lg border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Missing Documentation</h3>
            </div>
            <div className="space-y-2">
              {missingDocs.map((doc, idx) => (
                <div key={idx} className="flex items-start gap-2 py-2 px-3 bg-amber-50/50 rounded-lg border border-amber-100">
                  <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                    doc.severity === 'medium' ? 'text-amber-500' : 'text-amber-400'
                  }`} />
                  <p className="text-xs text-gray-700">{doc.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pre-Organized Data Exports */}
          <div className="bg-white rounded-lg border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-900">Data Exports</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Pre-organized for auditor review</p>
            <div className="space-y-1.5">
              {dataExports.map(exp => (
                <button
                  key={exp.id}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{exp.label}</p>
                    <p className="text-[10px] text-gray-400">{exp.recordCount.toLocaleString()} records &middot; {exp.lastUpdated}</p>
                  </div>
                  <Download className="h-3 w-3 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-900">Audit Timeline</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Pre-audit prep', date: 'Jan 15 – Feb 28', status: 'active' },
                { label: 'Auditor fieldwork', date: 'Mar 1 – Mar 21', status: 'upcoming' },
                { label: 'Draft review', date: 'Mar 22 – Apr 5', status: 'upcoming' },
                { label: 'Final report', date: 'Apr 15', status: 'upcoming' },
              ].map((step, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                    step.status === 'active' ? 'bg-amber-500' : 'bg-gray-200'
                  }`} />
                  <div>
                    <p className={`text-xs font-medium ${step.status === 'active' ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</p>
                    <p className="text-[10px] text-gray-400">{step.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
