'use client';

import { useState } from 'react';
import { getNonprofitById } from '@/lib/data/nonprofits';
import { formatCurrency } from '@/lib/utils/formatters';
import { Section990 } from '@/lib/types';
import {
  FileText,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Bot,
  DollarSign,
} from 'lucide-react';

const sections990: Section990[] = [
  { id: 's-1', name: 'Part I: Summary', status: 'Complete', completion: 100, notes: 'Auto-populated from QuickBooks', aiConfidence: 98 },
  { id: 's-2', name: 'Part III: Program Service Accomplishments', status: 'In Progress', completion: 60, notes: 'Needs narrative review', aiConfidence: 72 },
  { id: 's-3', name: 'Part IV: Checklist of Required Schedules', status: 'Complete', completion: 100, notes: 'Auto-determined', aiConfidence: 99 },
  { id: 's-4', name: 'Part VII: Compensation', status: 'In Progress', completion: 85, notes: '2 contractor entries need classification', aiConfidence: 81 },
  { id: 's-5', name: 'Part VIII: Revenue', status: 'Complete', completion: 100, notes: '', aiConfidence: 97 },
  { id: 's-6', name: 'Part IX: Functional Expenses', status: 'Complete', completion: 95, notes: '12 transactions need manual category confirmation', aiConfidence: 89 },
  { id: 's-7', name: 'Part X: Balance Sheet', status: 'Complete', completion: 100, notes: '', aiConfidence: 96 },
  { id: 's-8', name: 'Schedule A: Public Charity Status', status: 'Complete', completion: 100, notes: '', aiConfidence: 99 },
  { id: 's-9', name: 'Schedule B: Contributors', status: 'In Progress', completion: 70, notes: 'Awaiting Q4 major gift confirmations', aiConfidence: 75 },
  { id: 's-10', name: 'Schedule D: Supplemental Financial', status: 'Complete', completion: 100, notes: '', aiConfidence: 94 },
  { id: 's-11', name: 'Schedule O: Supplemental Information', status: 'Not Started', completion: 0, notes: 'Narrative sections pending', aiConfidence: 0 },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'Complete':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'In Progress':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'Not Started':
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    default:
      return null;
  }
}

function getStatusEmoji(status: string) {
  switch (status) {
    case 'Complete': return '✅';
    case 'In Progress': return '🟡';
    case 'Not Started': return '🔴';
    default: return '⚪';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Complete':
      return 'bg-green-50 text-green-700 border-green-200';
    case 'In Progress':
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Not Started':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getCompletionBarColor(completion: number) {
  if (completion === 100) return 'bg-green-500';
  if (completion >= 70) return 'bg-amber-500';
  if (completion >= 40) return 'bg-yellow-500';
  if (completion > 0) return 'bg-orange-400';
  return 'bg-gray-200';
}

// Sample expanded section fields
const sampleFields: Record<string, { label: string; value: string; confidence: number }[]> = {
  's-1': [
    { label: 'Organization Name', value: 'Bright Futures Youth Services', confidence: 99 },
    { label: 'EIN', value: '93-1234567', confidence: 99 },
    { label: 'Gross Receipts', value: '$3,847,291', confidence: 97 },
    { label: 'Total Revenue', value: '$3,847,291', confidence: 96 },
    { label: 'Total Expenses', value: '$3,201,488', confidence: 97 },
    { label: 'Net Assets (EOY)', value: '$2,891,044', confidence: 95 },
  ],
  's-2': [
    { label: 'Program 1: STEM Education', value: 'Provided STEM workshops to 1,240 youth across 14 school sites...', confidence: 68 },
    { label: 'Program 2: After-School Care', value: 'Operated daily after-school programs serving 380 at-risk youth...', confidence: 74 },
    { label: 'Program 3: Mentorship', value: '[Draft pending narrative input]', confidence: 45 },
  ],
  's-4': [
    { label: 'Executive Director', value: 'Sarah Chen — $142,000', confidence: 98 },
    { label: 'Program Director', value: 'Marcus Johnson — $98,500', confidence: 97 },
    { label: 'Contractor: IT Services', value: 'TechPDX LLC — $34,200 [Needs classification]', confidence: 62 },
    { label: 'Contractor: Marketing', value: 'Greenleaf Media — $28,500 [Needs classification]', confidence: 58 },
  ],
  's-6': [
    { label: 'Total Functional Expenses', value: '$3,201,488', confidence: 94 },
    { label: 'Program Services (78.3%)', value: '$2,506,765', confidence: 91 },
    { label: 'Management & General (14.1%)', value: '$451,410', confidence: 88 },
    { label: 'Fundraising (7.6%)', value: '$243,313', confidence: 90 },
    { label: 'Manual Review Items', value: '12 transactions pending category confirmation', confidence: 72 },
  ],
  's-9': [
    { label: 'Gates Foundation', value: '$180,000', confidence: 99 },
    { label: 'Oregon DCF', value: '$95,000', confidence: 99 },
    { label: 'Meyer Memorial Trust', value: '$250,000', confidence: 99 },
    { label: 'Q4 Major Gifts (3 donors)', value: '[Pending confirmation — estimated $125,000]', confidence: 55 },
  ],
};

export default function Form990Page() {
  const org = getNonprofitById('org-bright-futures')!;
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const overallCompletion = 73;

  const completeSections = sections990.filter(s => s.status === 'Complete').length;
  const inProgressSections = sections990.filter(s => s.status === 'In Progress').length;
  const notStartedSections = sections990.filter(s => s.status === 'Not Started').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form 990 Builder</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bright Futures Youth Services — Tax Year 2025</p>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{overallCompletion}% Complete</h2>
              <p className="text-xs text-gray-500">Estimated completion: March 2026 at current pace</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
              <Sparkles className="h-3 w-3" /> AI-Assisted
            </span>
          </div>
        </div>

        {/* Large Progress Bar */}
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${overallCompletion}%` }}
          />
        </div>

        {/* Status Badges Row */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{completeSections}</span> Complete</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-yellow-500" />
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{inProgressSections}</span> In Progress</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-gray-600"><span className="font-semibold text-gray-900">{notStartedSections}</span> Not Started</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
            <DollarSign className="h-3 w-3" />
            <span className="font-medium">$4,200 estimated savings vs. manual preparation</span>
          </div>
        </div>
      </div>

      {/* 990 Section Breakdown */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <h3 className="text-sm font-semibold text-gray-900">990 Section Breakdown</h3>
          <p className="text-xs text-gray-500 mt-0.5">Click any section to view form fields and AI confidence</p>
        </div>

        <div className="divide-y">
          {sections990.map((section) => {
            const isExpanded = expandedSection === section.id;
            const fields = sampleFields[section.id];

            return (
              <div key={section.id}>
                {/* Section Row */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </div>

                  <div className="flex-shrink-0 w-5 text-center">
                    <span className="text-sm">{getStatusEmoji(section.status)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{section.name}</p>
                    {section.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{section.notes}</p>
                    )}
                  </div>

                  <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(section.status)}`}>
                    {section.status}
                  </span>

                  {/* Completion mini bar */}
                  <div className="flex-shrink-0 w-24 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getCompletionBarColor(section.completion)}`}
                        style={{ width: `${section.completion}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 font-medium w-8 text-right">{section.completion}%</span>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50/50">
                    <div className="ml-9 space-y-3">
                      {/* AI Confidence Banner */}
                      {(section.aiConfidence ?? 0) > 0 && (
                        <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                          <Bot className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-blue-700 font-medium">
                            AI Confidence: {section.aiConfidence}%
                          </span>
                          <div className="flex-1 h-1 bg-blue-100 rounded-full overflow-hidden ml-2">
                            <div
                              className="h-full bg-blue-400 rounded-full"
                              style={{ width: `${section.aiConfidence}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Form Fields */}
                      {fields ? (
                        <div className="space-y-2">
                          {fields.map((field, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-4 py-2 px-3 bg-white rounded-lg border">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-gray-500">{field.label}</p>
                                <p className="text-sm text-gray-900 mt-0.5">{field.value}</p>
                              </div>
                              <div className="flex-shrink-0 flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full ${
                                  field.confidence >= 90 ? 'bg-green-400' :
                                  field.confidence >= 70 ? 'bg-yellow-400' :
                                  'bg-red-400'
                                }`} />
                                <span className={`text-[10px] font-medium ${
                                  field.confidence >= 90 ? 'text-green-600' :
                                  field.confidence >= 70 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {field.confidence}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-4 px-3 bg-white rounded-lg border text-center">
                          <p className="text-xs text-gray-400">
                            {section.status === 'Not Started'
                              ? 'This section has not been started yet. Fields will populate as data becomes available.'
                              : 'All fields auto-populated and verified. No manual review needed.'
                            }
                          </p>
                        </div>
                      )}

                      {/* Savings note */}
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <Sparkles className="h-3 w-3" />
                        <span>$4,200 estimated savings vs. manual preparation</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom summary card */}
      <div className="bg-white rounded-lg border p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Filing Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">EIN: {org.ein} &middot; Tax Year: 2025 &middot; Fiscal Year End: December 31</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Filing deadline</p>
            <p className="text-sm font-semibold text-gray-900">June 28, 2026</p>
            <p className="text-xs text-gray-400 mt-0.5">142 days remaining</p>
          </div>
        </div>
      </div>
    </div>
  );
}
