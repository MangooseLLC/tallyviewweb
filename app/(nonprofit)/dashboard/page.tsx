'use client';

import { getNonprofitById } from '@/lib/data/nonprofits';
import { getAnomaliesByOrg } from '@/lib/data/anomalies';
import { StatCard } from '@/components/shared/StatCard';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { TallyviewVerifiedBadge } from '@/components/shared/TallyviewVerifiedBadge';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { ExpenseBreakdownChart } from '@/components/charts/ExpenseBreakdownChart';
import { formatCurrency, formatRelativeTime } from '@/lib/utils/formatters';
import { CheckCircle, Clock, ShieldCheck, FileText, CircleDot, Wifi } from 'lucide-react';

export default function NonprofitDashboard() {
  const org = getNonprofitById('org-bright-futures')!;
  const anomalies = getAnomaliesByOrg('org-bright-futures').filter(a => a.status !== 'Resolved').slice(0, 4);

  const ytdFinancials = org.financials.slice(-12);
  const totalExpenses = ytdFinancials.reduce((s, f) => s + f.expenses.total, 0);
  const programTotal = ytdFinancials.reduce((s, f) => s + f.expenses.program, 0);
  const mgmtTotal = ytdFinancials.reduce((s, f) => s + f.expenses.management, 0);
  const fundTotal = ytdFinancials.reduce((s, f) => s + f.expenses.fundraising, 0);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bright Futures Youth Services — Financial Overview</p>
        </div>
        <TallyviewVerifiedBadge size="md" />
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="990 Completion"
          value="73%"
          subtitle="On track for filing"
          icon={<FileText className="h-5 w-5" />}
          variant="success"
          trend="up"
          trendValue="8% this month"
        />
        <StatCard
          title="Compliance Score"
          value="92/100"
          icon={<ShieldCheck className="h-5 w-5" />}
          variant="success"
          trend="up"
          trendValue="Up from 87 last month"
        />
        <StatCard
          title="Audit Readiness"
          value="High"
          subtitle="All critical items complete"
          icon={<CheckCircle className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="Days Until Filing"
          value="142"
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
                <p className="text-lg font-bold text-gray-900">{formatCurrency(org.revenueYTD)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Total Expenses YTD</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(org.expensesYTD)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Net Assets</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(org.netAssetsTotal)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <p className="text-[11px] text-gray-500">Cash Position</p>
                <p className="text-base font-semibold text-gray-900">$847,201</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500">Months of Operating Reserve</p>
                <p className="text-base font-semibold text-gray-900">{org.cashReserveMonths}</p>
              </div>
            </div>
            <RevenueChart data={org.financials} height={200} />
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
              programRatio={org.programExpenseRatio}
              managementRatio={org.managementExpenseRatio}
              fundraisingRatio={org.fundraisingExpenseRatio}
            />
          </div>
        </div>

        {/* Right Column - 2 cols */}
        <div className="col-span-2 space-y-6">
          {/* Recent Anomaly Alerts */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Anomaly Alerts</h3>
            <div className="space-y-2">
              {anomalies.map(anomaly => (
                <AnomalyAlertCard key={anomaly.id} anomaly={anomaly} compact />
              ))}
            </div>
          </div>

          {/* Restricted Fund Status */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Restricted Fund Status</h3>
            <div className="space-y-3">
              {org.restrictedFunds.slice(0, 3).map(fund => (
                <div key={fund.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-900">{fund.funder}</p>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      fund.complianceStatus === 'Compliant' ? 'bg-green-50 text-green-700' :
                      fund.complianceStatus === 'On Track' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {fund.complianceStatus === 'Compliant' ? '✅' : fund.complianceStatus === 'On Track' ? '🟡' : '🔴'} {fund.complianceStatus}
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

          {/* Connected System */}
          <div className="rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Connected Accounting System</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Wifi className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{org.connectedSystem}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CircleDot className="h-3 w-3 text-green-500" />
                  <span className="text-[11px] text-green-600 font-medium">Connected</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Last sync</span>
                <span className="text-gray-700">{formatRelativeTime(org.lastSync)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Transactions mapped</span>
                <span className="text-gray-700 font-medium">4,847</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
