'use client';

import { getNonprofitById } from '@/lib/data/nonprofits';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { Landmark, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

function getComplianceBadge(status: string) {
  switch (status) {
    case 'Compliant':
      return { className: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="h-3 w-3" />, emoji: '✅' };
    case 'On Track':
      return { className: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: <Clock className="h-3 w-3" />, emoji: '🟡' };
    case 'At Risk':
      return { className: 'bg-red-50 text-red-700 border-red-200', icon: <AlertTriangle className="h-3 w-3" />, emoji: '🔴' };
    case 'Non-Compliant':
      return { className: 'bg-red-100 text-red-800 border-red-300', icon: <AlertTriangle className="h-3 w-3" />, emoji: '🔴' };
    default:
      return { className: 'bg-gray-50 text-gray-700 border-gray-200', icon: null, emoji: '⚪' };
  }
}

function getUtilizationColor(percent: number) {
  if (percent > 85) return 'bg-amber-400';
  if (percent > 50) return 'bg-amber-400';
  if (percent > 25) return 'bg-blue-400';
  return 'bg-gray-300';
}

export default function RestrictedFundsPage() {
  const org = getNonprofitById('org-bright-futures')!;
  const funds = org.restrictedFunds;

  const totalRestricted = funds.reduce((s, f) => s + f.amount, 0);
  const totalSpent = funds.reduce((s, f) => s + f.spent, 0);
  const totalRemaining = funds.reduce((s, f) => s + f.remaining, 0);
  const avgUtilization = Math.round(funds.reduce((s, f) => s + f.utilizationPercent, 0) / funds.length * 10) / 10;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Restricted Funds</h1>
        <p className="text-sm text-gray-500 mt-0.5">Grant tracking and compliance monitoring</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Restricted</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalRestricted)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{funds.length} active grants</p>
        </div>
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Spent</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(totalSpent)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{Math.round((totalSpent / totalRestricted) * 100)}% of total</p>
        </div>
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <p className="text-xs text-gray-500">Total Remaining</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(totalRemaining)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Across all grants</p>
        </div>
        <div className="bg-white rounded-lg border p-5 shadow-sm">
          <p className="text-xs text-gray-500">Avg. Utilization</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{avgUtilization}%</p>
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${avgUtilization}%` }} />
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">All Restricted Grants</h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Funder</th>
                <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Purpose</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Amount</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Spent</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Remaining</th>
                <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Utilization</th>
                <th className="text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-3 py-3">Compliance</th>
                <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {funds.map(fund => {
                const badge = getComplianceBadge(fund.complianceStatus);
                return (
                  <tr key={fund.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{fund.funder}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fund.grantName}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <p className="text-xs text-gray-600 max-w-[200px] line-clamp-2">{fund.purpose}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(fund.amount)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="text-sm text-gray-700">{formatCurrency(fund.spent)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(fund.remaining)}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700">{fund.utilizationPercent}%</span>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[80px]">
                          <div
                            className={`h-full rounded-full ${getUtilizationColor(fund.utilizationPercent)}`}
                            style={{ width: `${fund.utilizationPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                        {badge.emoji} {fund.complianceStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-xs text-gray-600">{formatDate(fund.deadline)}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Individual Fund Cards (detailed view) */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Fund Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {funds.map(fund => {
            const badge = getComplianceBadge(fund.complianceStatus);
            return (
              <div key={fund.id} className="bg-white rounded-lg border p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{fund.funder}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{fund.grantName}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                    {badge.emoji} {fund.complianceStatus}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mb-3">{fund.purpose}</p>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400">Restricted</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(fund.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Spent</p>
                    <p className="text-sm font-semibold text-amber-600">{formatCurrency(fund.spent)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">Remaining</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(fund.remaining)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getUtilizationColor(fund.utilizationPercent)}`}
                      style={{ width: `${fund.utilizationPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{fund.utilizationPercent}%</span>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t text-[11px] text-gray-400">
                  <span>Start: {formatDate(fund.startDate)}</span>
                  <span>Deadline: {formatDate(fund.deadline)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
