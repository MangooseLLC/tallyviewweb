'use client';

import { getNonprofitById } from '@/lib/data/nonprofits';
import { getAnomaliesByOrg } from '@/lib/data/anomalies';
import { StatCard } from '@/components/shared/StatCard';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { TallyviewVerifiedBadge, type AttestationData } from '@/components/shared/TallyviewVerifiedBadge';
import { OnchainPipelineStatus } from '@/components/shared/OnchainPipelineStatus';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { ExpenseBreakdownChart } from '@/components/charts/ExpenseBreakdownChart';
import { formatCurrency } from '@/lib/utils/formatters';
import { Clock, ShieldCheck, FileText, AlertTriangle, Link2 } from 'lucide-react';
import type { DashboardOrg } from '@/lib/qbo-financials';
import Link from 'next/link';

interface ChainData {
  attestation: AttestationData | null;
  complianceSummary: { activeRules: number; totalViolations: number; overdueDeadlines: number; live: boolean };
  anomalySummary: { total: number; open: number; critical: number; live: boolean };
  completion990: number;
  monthsProcessed: number;
  monthRange: string;
}

interface NonprofitDashboardContentProps {
  chainData: ChainData;
  orgData?: DashboardOrg | null;
}

export function NonprofitDashboardContent({ chainData, orgData }: NonprofitDashboardContentProps) {
  const isRealUser = !!orgData;

  const demoOrg = isRealUser ? null : getNonprofitById('org-bright-futures')!;
  const anomalies = isRealUser ? [] : getAnomaliesByOrg('org-bright-futures').filter(a => a.status !== 'Resolved').slice(0, 4);

  const resolved: DashboardOrg = orgData ?? {
    name: demoOrg!.name,
    revenueYTD: demoOrg!.revenueYTD,
    expensesYTD: demoOrg!.expensesYTD,
    netAssetsTotal: demoOrg!.netAssetsTotal,
    cashPosition: demoOrg!.financials[demoOrg!.financials.length - 1]?.cashPosition ?? 0,
    cashReserveMonths: demoOrg!.cashReserveMonths,
    programExpenseRatio: demoOrg!.programExpenseRatio,
    managementExpenseRatio: demoOrg!.managementExpenseRatio,
    fundraisingExpenseRatio: demoOrg!.fundraisingExpenseRatio,
    financials: demoOrg!.financials,
    restrictedFunds: demoOrg!.restrictedFunds,
  };

  const {
    name: orgName, revenueYTD, expensesYTD, netAssetsTotal,
    cashPosition, cashReserveMonths, financials,
    programExpenseRatio, managementExpenseRatio, fundraisingExpenseRatio,
    restrictedFunds,
  } = resolved;

  const ytdFinancials = financials.slice(-12);
  const programTotal = ytdFinancials.reduce((s, f) => s + f.expenses.program, 0);
  const mgmtTotal = ytdFinancials.reduce((s, f) => s + f.expenses.management, 0);
  const fundTotal = ytdFinancials.reduce((s, f) => s + f.expenses.fundraising, 0);

  const { attestation, complianceSummary, anomalySummary, completion990, monthsProcessed, monthRange } = chainData;

  const filingDeadline = new Date(2026, 5, 28); // Jun 28, 2026
  const daysUntilFiling = Math.max(
    0,
    Math.ceil((filingDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const chainAvailable = complianceSummary.live || !isRealUser;
  const complianceScore = complianceSummary.live
    ? `${complianceSummary.activeRules} rules`
    : isRealUser ? '—' : '92/100';
  const complianceSubtitle = complianceSummary.live
    ? `${complianceSummary.totalViolations} violations · ${complianceSummary.overdueDeadlines} overdue`
    : isRealUser ? 'Coming soon' : 'Static data';

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{orgName} — Financial Overview</p>
        </div>
        <div className="flex items-center gap-3">
          {isRealUser && (
            <Link
              href="/quickbooks"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <Link2 className="h-3.5 w-3.5" />
              QuickBooks
            </Link>
          )}
          <TallyviewVerifiedBadge size="md" attestation={attestation} />
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="990 Completion"
          value={`${completion990}%`}
          subtitle={`${monthsProcessed} of 12 months processed`}
          icon={<FileText className="h-5 w-5" />}
          variant="success"
          trend="up"
          trendValue="Pipeline-driven"
        />
        <StatCard
          title="Compliance"
          value={complianceScore}
          subtitle={complianceSubtitle}
          icon={<ShieldCheck className="h-5 w-5" />}
          variant={complianceSummary.totalViolations > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Anomalies"
          value={anomalySummary.live ? anomalySummary.total.toString() : '—'}
          subtitle={anomalySummary.live ? `${anomalySummary.open} open · ${anomalySummary.critical} critical` : isRealUser ? 'Coming soon' : 'Chain unavailable'}
          icon={<AlertTriangle className="h-5 w-5" />}
          variant={anomalySummary.critical > 0 ? 'danger' : anomalySummary.open > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Days Until Filing"
          value={daysUntilFiling.toString()}
          subtitle="Deadline: Jun 28, 2026"
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-5 gap-6">
        {/* Left Column - 3 cols */}
        <div className="col-span-3 space-y-6">
          {/* Financial Health Summary */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Financial Health Summary</h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <p className="text-[11px] text-gray-500">Total Revenue YTD</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(revenueYTD)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Total Expenses YTD</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(expensesYTD)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Net Assets</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(netAssetsTotal)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[11px] text-gray-500">Cash Position</p>
                <p className="text-base font-semibold text-gray-900">{formatCurrency(cashPosition)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Months of Operating Reserve</p>
                <p className="text-base font-semibold text-gray-900">{cashReserveMonths}</p>
              </div>
            </div>
            <RevenueChart data={financials} height={200} />
          </div>

          {/* Functional Expense Breakdown */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Functional Expense Breakdown</h3>
              <span className="text-[11px] text-gray-400 bg-gray-50 px-2 py-1 rounded">Peer avg program ratio: 75.1%</span>
            </div>
            <ExpenseBreakdownChart
              program={programTotal}
              management={mgmtTotal}
              fundraising={fundTotal}
              programRatio={programExpenseRatio}
              managementRatio={managementExpenseRatio}
              fundraisingRatio={fundraisingExpenseRatio}
            />
          </div>
        </div>

        {/* Right Column - 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* Recent Anomaly Alerts */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Anomaly Alerts</h3>
            <div className="space-y-2">
              {anomalies.length === 0 && (
                <p className="text-xs text-gray-400 py-3 text-center">No anomaly alerts</p>
              )}
              {anomalies.map(anomaly => (
                <AnomalyAlertCard key={anomaly.id} anomaly={anomaly} compact />
              ))}
            </div>
          </div>

          {/* Restricted Fund Status */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Restricted Fund Status</h3>
            <div className="space-y-3">
              {restrictedFunds.length === 0 && (
                <p className="text-xs text-gray-400 py-3 text-center">No restricted funds tracked yet</p>
              )}
              {restrictedFunds.slice(0, 3).map(fund => (
                <div key={fund.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-900">{fund.funder}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      fund.complianceStatus === 'Compliant' ? 'bg-green-50 text-green-700' :
                      fund.complianceStatus === 'On Track' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {fund.complianceStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{fund.grantName}</p>
                  <div className="mt-2 flex items-center gap-4 text-[11px]">
                    <span className="text-gray-500">{formatCurrency(fund.amount)} restricted</span>
                    <span className="text-gray-500">{formatCurrency(fund.spent)} spent</span>
                    <span className="font-medium text-gray-700">{fund.utilizationPercent}% utilized</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        fund.utilizationPercent > 85 ? 'bg-amber-400' :
                        fund.utilizationPercent > 50 ? 'bg-amber-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${fund.utilizationPercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Onchain Pipeline Status */}
          <OnchainPipelineStatus
            connectedSystem="QuickBooks Online"
            monthsProcessed={monthsProcessed}
            monthRange={monthRange}
            latestAttestation={attestation}
            anomalySummary={anomalySummary.live ? anomalySummary : null}
            completion990={completion990}
            totalMonths={12}
          />
        </div>
      </div>
    </div>
  );
}
