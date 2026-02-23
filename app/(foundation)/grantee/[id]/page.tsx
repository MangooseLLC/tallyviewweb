'use client';

import { useParams } from 'next/navigation';
import { getNonprofitById } from '@/lib/data/nonprofits';
import { getAnomaliesByOrg } from '@/lib/data/anomalies';
import { grants } from '@/lib/data/grants';
import { getBoardMembersByOrg, getCrossOrgBoardMembers } from '@/lib/data/board-members';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { TallyviewVerifiedBadge } from '@/components/shared/TallyviewVerifiedBadge';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { ExpenseBreakdownChart } from '@/components/charts/ExpenseBreakdownChart';
import { StatCard } from '@/components/shared/StatCard';
import {
  formatCurrency,
  formatPercent,
  formatRelativeTime,
  getRiskBgColor,
} from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import {
  Building2,
  Calendar,
  DollarSign,
  AlertTriangle,
  ShieldCheck,
  Wifi,
  WifiOff,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  MapPin,
  Hash,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function GranteeDetailPage() {
  const params = useParams();
  const orgId = params.id as string;
  const org = getNonprofitById(orgId);

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">Grantee Not Found</h2>
        <p className="text-sm text-gray-500 mt-1">
          No grantee found with ID &quot;{orgId}&quot;
        </p>
        <Link
          href="/foundation/portfolio"
          className="mt-4 text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to portfolio
        </Link>
      </div>
    );
  }

  const orgAnomalies = getAnomaliesByOrg(orgId);
  const orgGrants = grants.filter((g) => g.granteeId === orgId);
  const boardMembers = getBoardMembersByOrg(orgId);
  const crossOrgMembers = getCrossOrgBoardMembers();
  const crossOrgForThisOrg = boardMembers.filter((bm) =>
    crossOrgMembers.some((cm) => cm.id === bm.id)
  );

  const latestFinancials = org.financials[org.financials.length - 1];
  const prevFinancials = org.financials.length > 12 ? org.financials[org.financials.length - 13] : org.financials[0];
  const revenueChange = latestFinancials && prevFinancials
    ? ((latestFinancials.revenue.total - prevFinancials.revenue.total) / prevFinancials.revenue.total) * 100
    : 0;

  const isConnected = new Date(org.lastSync) > new Date('2026-01-01');

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <Link
        href="/foundation/portfolio"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Portfolio
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{org.name}</h1>
              {org.complianceScore >= 80 && <TallyviewVerifiedBadge size="sm" />}
            </div>
            <p className="mt-2 text-sm text-gray-600 max-w-2xl">{org.mission}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" /> EIN: {org.ein}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {org.city}, {org.state}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Founded {org.foundedYear}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Budget: {formatCurrency(org.annualBudget, true)}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> {org.programArea}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" /> ED: {org.executiveDirector}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-1">Risk Score</p>
              <RiskScoreBadge score={org.riskScore} size="lg" showLabel />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Revenue YTD"
          value={formatCurrency(org.revenueYTD, true)}
          trend={revenueChange >= 0 ? 'up' : 'down'}
          trendValue={`${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}% YoY`}
        />
        <StatCard
          title="Expenses YTD"
          value={formatCurrency(org.expensesYTD, true)}
        />
        <StatCard
          title="Net Assets"
          value={formatCurrency(org.netAssetsTotal, true)}
        />
        <StatCard
          title="Cash Reserves"
          value={`${org.cashReserveMonths} mo`}
          variant={org.cashReserveMonths < 2 ? 'danger' : org.cashReserveMonths < 3 ? 'warning' : 'default'}
        />
        <StatCard
          title="Compliance Score"
          value={`${org.complianceScore}/100`}
          variant={org.complianceScore >= 80 ? 'success' : org.complianceScore >= 60 ? 'warning' : 'danger'}
        />
        <StatCard
          title="Active Alerts"
          value={orgAnomalies.filter((a) => a.status === 'New').length}
          variant={orgAnomalies.filter((a) => a.status === 'New').length > 3 ? 'danger' : 'default'}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Revenue vs Expenses (12 months)</h2>
          <RevenueChart data={org.financials} height={280} />
        </div>

        {/* Expense Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
          <ExpenseBreakdownChart
            program={latestFinancials?.expenses.program || 0}
            management={latestFinancials?.expenses.management || 0}
            fundraising={latestFinancials?.expenses.fundraising || 0}
            programRatio={org.programExpenseRatio}
            managementRatio={org.managementExpenseRatio}
            fundraisingRatio={org.fundraisingExpenseRatio}
            height={200}
          />
          {/* Peer comparison */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">vs Peer Benchmarks</h3>
            {[
              { label: 'Program Expense Ratio', value: org.programExpenseRatio, benchmark: 78, suffix: '%' },
              { label: 'Admin Overhead', value: org.managementExpenseRatio, benchmark: 14, suffix: '%', invertColor: true },
              { label: 'Cash Reserve Months', value: org.cashReserveMonths, benchmark: 3.0, suffix: ' mo' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{item.value}{item.suffix}</span>
                  <span className="text-gray-400">vs {item.benchmark}{item.suffix}</span>
                  {item.invertColor ? (
                    item.value <= item.benchmark ? (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    )
                  ) : (
                    item.value >= item.benchmark ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Score Breakdown + Connected System */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk Score Breakdown */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Risk Score Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Financial Health', score: Math.min(100, Math.round(org.riskScore * 0.95 + Math.random() * 10)), weight: '30%' },
              { label: 'Governance & Compliance', score: org.complianceScore, weight: '25%' },
              { label: 'Operational Efficiency', score: Math.min(100, Math.round(org.programExpenseRatio + 5)), weight: '20%' },
              { label: 'Fraud Pattern Indicators', score: org.riskScore >= 60 ? Math.round(75 + Math.random() * 20) : Math.round(20 + Math.random() * 30), weight: '15%' },
              { label: 'Reporting & Transparency', score: org.filing990Status === 'Current' ? Math.round(80 + Math.random() * 15) : Math.round(25 + Math.random() * 25), weight: '10%' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{item.weight}</span>
                    <span className={cn(
                      'font-semibold',
                      item.score >= 75 ? 'text-green-600' :
                      item.score >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    )}>{item.score}</span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      item.score >= 75 ? 'bg-green-500' :
                      item.score >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                    )}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connected System Status */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Connected Systems</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center">
                    <Wifi className="h-4 w-4 text-green-600" />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <WifiOff className="h-4 w-4 text-red-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">{org.connectedSystem}</p>
                  <p className="text-xs text-gray-500">Last synced: {formatRelativeTime(org.lastSync)}</p>
                </div>
              </div>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                isConnected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              )}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Form 990 Filing</p>
                  <p className="text-xs text-gray-500">IRS E-File Status</p>
                </div>
              </div>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                org.filing990Status === 'Current' ? 'bg-green-50 text-green-700' :
                org.filing990Status === 'Overdue' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              )}>
                {org.filing990Status}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Audit Opinion</p>
                  <p className="text-xs text-gray-500">Most Recent Independent Audit</p>
                </div>
              </div>
              <span className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                org.auditOpinion === 'Unqualified' ? 'bg-green-50 text-green-700' :
                org.auditOpinion === 'Qualified' ? 'bg-amber-50 text-amber-700' :
                'bg-red-50 text-red-700'
              )}>
                {org.auditOpinion}
              </span>
            </div>
          </div>

          {/* Grants for this org */}
          {orgGrants.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Grants</h3>
              <div className="space-y-2">
                {orgGrants.map((grant) => (
                  <div key={grant.id} className="flex items-center justify-between text-xs rounded-md bg-gray-50 px-3 py-2">
                    <div>
                      <span className="font-medium text-gray-700">{formatCurrency(grant.amount, true)}</span>
                      <span className="text-gray-400 ml-2">{grant.programArea}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            grant.utilizationPercent >= 60 ? 'bg-teal-500' :
                            grant.utilizationPercent >= 30 ? 'bg-amber-500' :
                            'bg-red-500'
                          )}
                          style={{ width: `${grant.utilizationPercent}%` }}
                        />
                      </div>
                      <span className="text-gray-500">{grant.utilizationPercent}%</span>
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        grant.status === 'Active' ? 'bg-green-50 text-green-600' :
                        grant.status === 'Suspended' ? 'bg-red-50 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {grant.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Anomalies Section */}
      {orgAnomalies.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">Anomaly Alerts</h2>
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">
              {orgAnomalies.length} total
            </span>
          </div>
          <div className="space-y-3">
            {orgAnomalies
              .sort((a, b) => {
                const severityOrder = { High: 0, Medium: 1, Low: 2, Info: 3 };
                return severityOrder[a.severity] - severityOrder[b.severity];
              })
              .map((anomaly) => (
                <AnomalyAlertCard key={anomaly.id} anomaly={anomaly} />
              ))}
          </div>
        </div>
      )}

      {/* Board Composition */}
      {boardMembers.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">Board Composition</h2>
            {crossOrgForThisOrg.length > 0 && (
              <span className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-medium">
                {crossOrgForThisOrg.length} cross-org flags
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {boardMembers.map((bm) => {
              const isCrossOrg = crossOrgMembers.some((cm) => cm.id === bm.id);
              return (
                <div
                  key={bm.id}
                  className={cn(
                    'rounded-lg border p-3',
                    isCrossOrg ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{bm.name}</p>
                      <p className="text-xs text-gray-500">{bm.title}</p>
                    </div>
                    {isCrossOrg && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Cross-Org
                      </span>
                    )}
                  </div>
                  {isCrossOrg && (
                    <p className="mt-2 text-[11px] text-amber-600">
                      Also serves: {bm.organizationIds.filter((id) => id !== orgId).length} other org(s)
                    </p>
                  )}
                  {bm.businessRelationships && bm.businessRelationships.length > 0 && (
                    <p className="mt-1 text-[11px] text-red-500 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Has vendor relationships
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
