'use client';

import { useState } from 'react';
import type { Section990 } from '@/lib/types';
import type { FieldData } from '@/lib/pipeline/map990';
import type { LatestAuditResult } from '@/lib/chain/reads';
import { FUJI_EXPLORER_URL } from '@/lib/chain/config';
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
  Link as LinkIcon,
  Database,
  Shield,
} from 'lucide-react';

interface Form990ContentProps {
  orgName: string;
  ein: string;
  sections: Section990[];
  sampleFields: Record<string, FieldData[]>;
  monthsProcessed: string[];
  overallCompletion: number;
  aiConfidence: number;
  attestation: LatestAuditResult | null;
}

const TOTAL_MONTHS = 12;
const ALL_MONTHS = [
  '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
  '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09',
];
const MONTH_SHORT = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];

function getStatusEmoji(status: string) {
  switch (status) {
    case 'Complete': return '\u2705';
    case 'In Progress': return '\uD83D\uDFE1';
    case 'Not Started': return '\uD83D\uDD34';
    default: return '\u26AA';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Complete': return 'bg-green-50 text-green-700 border-green-200';
    case 'In Progress': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'Not Started': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function getCompletionBarColor(completion: number) {
  if (completion === 100) return 'bg-green-500';
  if (completion >= 70) return 'bg-amber-500';
  if (completion >= 40) return 'bg-yellow-500';
  if (completion > 0) return 'bg-orange-400';
  return 'bg-gray-200';
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 90) return { dot: 'bg-green-400', text: 'text-green-600' };
  if (confidence >= 70) return { dot: 'bg-yellow-400', text: 'text-yellow-600' };
  return { dot: 'bg-red-400', text: 'text-red-600' };
}

function sourceTag(source: string) {
  if (source === 'quickbooks') return { label: 'QuickBooks Online', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (source === 'computed') return { label: 'Computed', color: 'bg-purple-50 text-purple-700 border-purple-200' };
  return { label: 'Manual', color: 'bg-gray-50 text-gray-600 border-gray-200' };
}

export function Form990Content({
  orgName,
  ein,
  sections,
  sampleFields,
  monthsProcessed,
  overallCompletion,
  aiConfidence,
  attestation,
}: Form990ContentProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const processedSet = new Set(monthsProcessed);

  const completeSections = sections.filter(s => s.status === 'Complete').length;
  const inProgressSections = sections.filter(s => s.status === 'In Progress').length;
  const notStartedSections = sections.filter(s => s.status === 'Not Started').length;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form 990 Builder</h1>
        <p className="text-sm text-gray-500 mt-0.5">{orgName} &mdash; Tax Year 2025</p>
      </div>

      {/* Data Sources Header */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Database className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Data Pipeline</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">QuickBooks Online</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-medium">Tallyview Pipeline</span>
          <span className="text-gray-400">&rarr;</span>
          <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">Avalanche Fuji</span>
          {attestation?.live && (
            <a
              href={`${FUJI_EXPLORER_URL}/address/${attestation.submitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
            >
              <Shield className="h-3 w-3" />
              <span>{monthsProcessed.length} attestations</span>
              <span className="text-gray-400 font-mono">{attestation.merkleRoot.slice(0, 10)}...</span>
              <LinkIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Months Timeline */}
      <div className="bg-white rounded-lg border p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Clock className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {monthsProcessed.length} of {TOTAL_MONTHS} Months Processed
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {ALL_MONTHS.map((month, i) => {
            const processed = processedSet.has(month);
            return (
              <div key={month} className="flex flex-col items-center flex-1">
                <div className={`h-2.5 w-2.5 rounded-full ${processed ? 'bg-amber-500' : 'bg-gray-200'}`} />
                <span className={`text-[9px] mt-1 ${processed ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                  {MONTH_SHORT[i]}
                </span>
              </div>
            );
          })}
        </div>
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
              <p className="text-xs text-gray-500">
                {monthsProcessed.length < 12
                  ? `${12 - monthsProcessed.length} months remaining — estimated completion at current pace`
                  : 'All months processed — ready for review'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">
              <Bot className="h-3 w-3" /> AI Confidence: {aiConfidence}%
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
              <Sparkles className="h-3 w-3" /> AI-Assisted
            </span>
          </div>
        </div>

        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${overallCompletion}%` }}
          />
        </div>

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
          <p className="text-xs text-gray-500 mt-0.5">Click any section to view form fields, data source, and AI confidence</p>
        </div>

        <div className="divide-y">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const fields = sampleFields[section.id];

            return (
              <div key={section.id}>
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>

                  <div className="flex-shrink-0 w-5 text-center">
                    <span className="text-sm">{getStatusEmoji(section.status)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{section.name}</p>
                      {section.completion > 0 && section.status !== 'Not Started' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 font-medium">Source: QuickBooks</span>
                      )}
                    </div>
                    {section.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{section.notes}</p>
                    )}
                  </div>

                  <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge(section.status)}`}>
                    {section.status}
                  </span>

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

                {isExpanded && (
                  <div className="px-5 pb-4 bg-gray-50/50">
                    <div className="ml-9 space-y-3">
                      {(section.aiConfidence ?? 0) > 0 && (
                        <div className="flex items-center gap-2 py-2 px-3 bg-blue-50 rounded-lg border border-blue-100">
                          <Bot className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-blue-700 font-medium">AI Confidence: {section.aiConfidence}%</span>
                          <div className="flex-1 h-1 bg-blue-100 rounded-full overflow-hidden ml-2">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${section.aiConfidence}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Attestation badge per section group */}
                      {attestation?.live && section.completion > 0 && section.status !== 'Not Started' && (
                        <a
                          href={`${FUJI_EXPLORER_URL}/address/${attestation.submitter}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 py-2 px-3 bg-amber-50 rounded-lg border border-amber-100 hover:bg-amber-100 transition-colors"
                        >
                          <Shield className="h-4 w-4 text-amber-600" />
                          <span className="text-xs text-amber-700 font-medium">Attested on-chain</span>
                          <span className="text-[10px] text-amber-500 font-mono">{attestation.merkleRoot.slice(0, 18)}...</span>
                          <LinkIcon className="h-3 w-3 text-amber-400 ml-auto" />
                        </a>
                      )}

                      {fields ? (
                        <div className="space-y-2">
                          {fields.map((field, idx) => {
                            const conf = getConfidenceColor(field.confidence);
                            const src = sourceTag(field.source);
                            return (
                              <div key={idx} className="flex items-start justify-between gap-4 py-2 px-3 bg-white rounded-lg border">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs font-medium text-gray-500">
                                      {field.line && <span className="text-gray-400 mr-1">Line {field.line}</span>}
                                      {field.label}
                                    </p>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${src.color} font-medium`}>{src.label}</span>
                                  </div>
                                  <p className="text-sm text-gray-900 mt-0.5">{field.value}</p>
                                </div>
                                <div className="flex-shrink-0 flex items-center gap-1.5">
                                  <div className={`h-2 w-2 rounded-full ${conf.dot}`} />
                                  <span className={`text-[10px] font-medium ${conf.text}`}>{field.confidence}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-4 px-3 bg-white rounded-lg border text-center">
                          <p className="text-xs text-gray-400">
                            {section.status === 'Not Started'
                              ? 'This section requires manual input and cannot be auto-populated from financial data.'
                              : 'All fields auto-populated and verified. No manual review needed.'}
                          </p>
                        </div>
                      )}

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
            <p className="text-xs text-gray-500 mt-0.5">EIN: {ein} &middot; Tax Year: 2025 &middot; Fiscal Year Start: October 1</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Filing deadline</p>
            <p className="text-sm font-semibold text-gray-900">June 28, 2026</p>
            {attestation?.live && (
              <p className="text-xs text-amber-600 mt-0.5">
                Latest attestation: {attestation.year}/{attestation.month}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
