'use client';

import { investigations, getTotalEstimatedRecovery } from '@/lib/data/investigations';
import { fraudTypologies } from '@/lib/data/fraud-typologies';
import { StatCard } from '@/components/shared/StatCard';
import { formatCurrency, formatRelativeTime, formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  Search,
  DollarSign,
  Fingerprint,
  ArrowRight,
  Clock,
  FileText,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { CaseStage } from '@/lib/types';

const stageOrder: CaseStage[] = ['Tip', 'Analysis', 'Discovery', 'Filing', 'Recovery'];

const stageColors: Record<CaseStage, string> = {
  Tip: '#94a3b8',
  Analysis: '#3b82f6',
  Discovery: '#eab308',
  Filing: '#f97316',
  Recovery: '#22c55e',
};

const stageBgColors: Record<CaseStage, string> = {
  Tip: 'bg-gray-100 text-gray-700',
  Analysis: 'bg-blue-100 text-blue-700',
  Discovery: 'bg-yellow-100 text-yellow-700',
  Filing: 'bg-orange-100 text-orange-700',
  Recovery: 'bg-green-100 text-green-700',
};

export default function InvestigatorDashboard() {
  const totalRecovery = getTotalEstimatedRecovery();
  const stageCounts = stageOrder.map((stage) => ({
    stage,
    count: investigations.filter((c) => c.stage === stage).length,
  }));

  // Recovery by fraud type
  const fraudTypeMap = new Map<string, number>();
  investigations.forEach((c) => {
    const current = fraudTypeMap.get(c.fraudType) || 0;
    fraudTypeMap.set(c.fraudType, current + c.estimatedRecovery);
  });
  const recoveryByFraudType = Array.from(fraudTypeMap.entries())
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => b.value - a.value);

  // Fraud patterns matched (sum of frequency in data)
  const totalPatterns = fraudTypologies.reduce((sum, ft) => sum + ft.frequencyInData, 0);

  // Recent activity feed
  const recentCases = [...investigations]
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
    .slice(0, 8);

  const activityActions: Record<string, string> = {
    'case-001': 'New evidence documents uploaded',
    'case-002': 'Entity relationship map updated',
    'case-003': 'Qui tam complaint draft finalized',
    'case-004': 'Funder interviews scheduled',
    'case-005': 'Expense classification analysis complete',
    'case-006': 'Initial tip assessment started',
    'case-007': 'Vendor contract review in progress',
    'case-008': 'Document metadata analysis running',
    'case-009': 'Federal agency coordination call completed',
    'case-010': 'Board conflict matrix updated',
    'case-011': 'Settlement offer under review — $5.2M',
    'case-012': 'Whistleblower interview completed',
  };

  const activityIcons: Record<CaseStage, React.ReactNode> = {
    Tip: <AlertTriangle className="h-3.5 w-3.5 text-gray-500" />,
    Analysis: <Search className="h-3.5 w-3.5 text-blue-500" />,
    Discovery: <FileText className="h-3.5 w-3.5 text-yellow-600" />,
    Filing: <Scale className="h-3.5 w-3.5 text-orange-500" />,
    Recovery: <DollarSign className="h-3.5 w-3.5 text-green-500" />,
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investigator Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Qui Tam Investigation Pipeline — Case Overview & Analytics
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Active Cases"
          value={investigations.length}
          subtitle="Across all stages"
          icon={<Briefcase className="h-5 w-5" />}
          trend="up"
          trendValue="2 new this month"
        />
        <StatCard
          title="Cases in Discovery"
          value={investigations.filter((c) => c.stage === 'Discovery').length}
          subtitle="Active document review"
          icon={<Search className="h-5 w-5" />}
        />
        <StatCard
          title="Potential Recovery Value"
          value={formatCurrency(totalRecovery, true)}
          subtitle={formatCurrency(totalRecovery)}
          icon={<DollarSign className="h-5 w-5" />}
          variant="success"
          trend="up"
          trendValue="$5.6M added this month"
        />
        <StatCard
          title="Fraud Patterns Matched"
          value={totalPatterns}
          subtitle={`Across ${fraudTypologies.length} typologies`}
          icon={<Fingerprint className="h-5 w-5" />}
          variant="warning"
        />
      </div>

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
                  <div
                    className="h-full rounded-md transition-all duration-500 flex items-center px-3"
                    style={{
                      width: `${Math.max(widthPercent, 8)}%`,
                      backgroundColor: stageColors[stage],
                    }}
                  >
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                </div>
                <div className="w-24 text-xs text-gray-500">
                  {formatCurrency(
                    investigations
                      .filter((c) => c.stage === stage)
                      .reduce((s, c) => s + c.estimatedRecovery, 0),
                    true
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {stageOrder.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1">
              <span
                className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full',
                  stageBgColors[stage]
                )}
              >
                {stage}
              </span>
              {i < stageOrder.length - 1 && (
                <ArrowRight className="h-3 w-3 text-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* Recovery by Fraud Type Chart */}
        <div className="col-span-3 rounded-lg border bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Recovery Value by Fraud Type
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={recoveryByFraudType}
                layout="vertical"
                margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v, true)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="type"
                  type="category"
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                  width={200}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [formatCurrency(Number(value ?? 0)), 'Est. Recovery']}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {recoveryByFraudType.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? '#14b8a6' : index === 1 ? '#0d9488' : '#5eead4'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Case Activity */}
        <div className="col-span-2 rounded-lg border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Case Activity</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          <div className="space-y-0.5">
            {recentCases.map((c) => (
              <div
                key={c.id}
                className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0"
              >
                <div className="mt-0.5 flex-shrink-0">
                  {activityIcons[c.stage]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {c.caseName.split(' - ')[0]}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {activityActions[c.id] || 'Case updated'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded',
                        stageBgColors[c.stage]
                      )}
                    >
                      {c.stage}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatRelativeTime(c.lastActivity)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[11px] font-semibold text-gray-700">
                    {formatCurrency(c.estimatedRecovery, true)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
