'use client';

import { investigations, getTotalEstimatedRecovery } from '@/lib/data/investigations';
import { fraudTypologies } from '@/lib/data/fraud-typologies';
import { StatCard } from '@/components/shared/StatCard';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Briefcase, Search, DollarSign, Fingerprint, ArrowRight, Clock, FileText, AlertTriangle, Scale, Users,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CaseStage } from '@/lib/types';

const stageOrder: CaseStage[] = ['Tip', 'Analysis', 'Discovery', 'Filing', 'Recovery'];
const stageColors: Record<CaseStage, string> = { Tip: '#94a3b8', Analysis: '#3b82f6', Discovery: '#eab308', Filing: '#f97316', Recovery: '#22c55e' };
const stageBgColors: Record<CaseStage, string> = { Tip: 'bg-gray-100 text-gray-700', Analysis: 'bg-blue-100 text-blue-700', Discovery: 'bg-yellow-100 text-yellow-700', Filing: 'bg-orange-100 text-orange-700', Recovery: 'bg-green-100 text-green-700' };

interface ChainCaseSummary {
  evidenceCount: number;
  stage: string;
  live: boolean;
}

interface SharedEntityInfo {
  entityId: string;
  label: string;
  entityType: string;
}

interface ChainData {
  caseSummary: ChainCaseSummary | null;
  sharedEntities: SharedEntityInfo[];
  sharedEntitiesLive: boolean;
}

interface InvestigatorDashboardContentProps {
  chainData: ChainData;
}

export function InvestigatorDashboardContent({ chainData }: InvestigatorDashboardContentProps) {
  const totalRecovery = getTotalEstimatedRecovery();
  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: investigations.filter((c) => c.stage === stage).length,
  }));

  const fraudTypeMap = new Map<string, number>();
  investigations.forEach((c) => {
    const current = fraudTypeMap.get(c.fraudType) || 0;
    fraudTypeMap.set(c.fraudType, current + c.estimatedRecovery);
  });
  const recoveryByFraudType = Array.from(fraudTypeMap.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);

  const totalPatterns = fraudTypologies.reduce((sum, ft) => sum + ft.frequencyInData, 0);
  const groupCounts = {
    asset: fraudTypologies.filter(ft => ft.categoryGroup === 'Asset Misappropriation').length,
    corruption: fraudTypologies.filter(ft => ft.categoryGroup === 'Corruption').length,
    reporting: fraudTypologies.filter(ft => ft.categoryGroup === 'Financial Reporting').length,
  };

  const recentCases = [...investigations]
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, 8);

  const activityActions: Record<string, string> = {
    'case-001': 'New evidence documents uploaded', 'case-002': 'Entity relationship map updated',
    'case-003': 'Qui tam complaint draft finalized', 'case-004': 'Funder interviews scheduled',
    'case-005': 'Expense classification analysis complete', 'case-006': 'Initial tip assessment started',
    'case-007': 'Vendor contract review in progress', 'case-008': 'Document metadata analysis running',
    'case-009': 'Federal agency coordination call completed', 'case-010': 'Board conflict matrix updated',
    'case-011': 'Settlement offer under review — $5.2M', 'case-012': 'Whistleblower interview completed',
  };

  const activityIcons: Record<CaseStage, React.ReactNode> = {
    Tip: <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />, Analysis: <Search className="h-3.5 w-3.5 text-blue-500" />,
    Discovery: <FileText className="h-3.5 w-3.5 text-yellow-600" />, Filing: <Scale className="h-3.5 w-3.5 text-orange-500" />,
    Recovery: <DollarSign className="h-3.5 w-3.5 text-green-500" />,
  };

  const { caseSummary, sharedEntities, sharedEntitiesLive } = chainData;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investigator Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Qui Tam Investigation Pipeline — Case Overview & Analytics</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Active Cases" value={investigations.length} subtitle={caseSummary?.live ? `Lead case: ${caseSummary.evidenceCount} evidence items` : 'Across all stages'} icon={<Briefcase className="h-5 w-5" />} trend="up" trendValue="2 new this month" />
        <StatCard title="Cases in Discovery" value={investigations.filter((c) => c.stage === 'Discovery').length} subtitle="Active document review" icon={<Search className="h-5 w-5" />} />
        <StatCard title="Potential Recovery Value" value={formatCurrency(totalRecovery, true)} subtitle={formatCurrency(totalRecovery)} icon={<DollarSign className="h-5 w-5" />} variant="success" trend="up" trendValue="$5.6M added this month" />
        <StatCard title="Fraud Patterns Matched" value={totalPatterns} subtitle={`${fraudTypologies.length} typologies: ${groupCounts.asset} asset, ${groupCounts.corruption} corruption, ${groupCounts.reporting} reporting`} icon={<Fingerprint className="h-5 w-5" />} variant="warning" />
      </div>

      {/* Cross-Org Intelligence Card */}
      {sharedEntitiesLive && sharedEntities.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Cross-Org Intelligence</h3>
            <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">From EntityGraph</span>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-700 font-medium">Live from Fuji</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {sharedEntities.map((entity) => (
              <div key={entity.entityId} className="bg-white rounded-lg border border-amber-200 p-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    entity.entityType === 'Person' ? 'bg-blue-50 text-blue-700' :
                    entity.entityType === 'Vendor' ? 'bg-purple-50 text-purple-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>{entity.entityType}</span>
                  <span className="text-xs font-medium text-gray-900">{entity.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Shared across multiple organizations</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Case Pipeline */}
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Case Pipeline Overview</h3>
        <div className="space-y-3">
          {stageCounts.map(({ stage, count }) => {
            const maxCount = Math.max(...stageCounts.map((s) => s.count));
            const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            return (
              <div key={stage} className="flex items-center gap-3">
                <div className="w-24 text-xs font-medium text-gray-600 text-right">{stage}</div>
                <div className="flex-1 h-8 bg-gray-50 rounded-md overflow-hidden relative">
                  <div className="h-full rounded-md transition-all duration-500 flex items-center px-3" style={{ width: `${Math.max(widthPercent, 8)}%`, backgroundColor: stageColors[stage] }}>
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
                <div className="w-24 text-xs text-gray-500">
                  {formatCurrency(investigations.filter((c) => c.stage === stage).reduce((s, c) => s + c.estimatedRecovery, 0), true)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {stageOrder.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1">
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', stageBgColors[stage])}>{stage}</span>
              {i < stageOrder.length - 1 && <ArrowRight className="h-3 w-3 text-gray-300" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recovery Value by Fraud Type</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={recoveryByFraudType} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={200} />
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <Tooltip formatter={(value: any) => [formatCurrency(Number(value ?? 0)), 'Est. Recovery']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {recoveryByFraudType.map((_, index) => (<Cell key={index} fill={index === 0 ? '#14b8a6' : index === 1 ? '#0d9488' : '#5eead4'} />))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-2 rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Case Activity</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-0.5">
            {recentCases.map((c) => (
              <div key={c.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="mt-0.5 flex-shrink-0">{activityIcons[c.stage]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{c.caseName.split(' - ')[0]}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{activityActions[c.id] || 'Case updated'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', stageBgColors[c.stage])}>{c.stage}</span>
                    <span className="text-[10px] text-gray-400">{formatRelativeTime(c.lastActivity)}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-semibold text-gray-700">{formatCurrency(c.estimatedRecovery, true)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
