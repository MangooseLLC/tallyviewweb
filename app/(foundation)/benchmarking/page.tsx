'use client';

import { useState, useMemo } from 'react';
import { nonprofits } from '@/lib/data/nonprofits';
import { formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { ArrowLeftRight, ChevronDown, Info } from 'lucide-react';

export default function BenchmarkingPage() {
  const [selectedOrgId, setSelectedOrgId] = useState('org-bright-futures');

  const selectedOrg = nonprofits.find((o) => o.id === selectedOrgId);

  // Calculate peer medians by program area
  const peerMedians = useMemo(() => {
    if (!selectedOrg) return null;

    const peers = nonprofits.filter(
      (o) => o.programArea === selectedOrg.programArea && o.id !== selectedOrgId
    );

    const median = (values: number[]) => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    return {
      programExpenseRatio: median(peers.map((p) => p.programExpenseRatio)),
      managementExpenseRatio: median(peers.map((p) => p.managementExpenseRatio)),
      fundraisingExpenseRatio: median(peers.map((p) => p.fundraisingExpenseRatio)),
      cashReserveMonths: median(peers.map((p) => p.cashReserveMonths)),
      riskScore: median(peers.map((p) => p.riskScore)),
      complianceScore: median(peers.map((p) => p.complianceScore)),
      peerCount: peers.length,
    };
  }, [selectedOrg, selectedOrgId]);

  if (!selectedOrg || !peerMedians) return null;

  // Calculate exec compensation relative to budget (estimated)
  const execCompRatio = (selectedOrg.annualBudget * 0.04); // ~4% estimate
  const peerExecComp = (selectedOrg.annualBudget * 0.035); // peer at 3.5%

  const comparisonData = [
    {
      metric: 'Program Expense Ratio',
      org: selectedOrg.programExpenseRatio,
      peerMedian: Math.round(peerMedians.programExpenseRatio * 10) / 10,
      unit: '%',
      higherIsBetter: true,
    },
    {
      metric: 'Admin Overhead',
      org: selectedOrg.managementExpenseRatio,
      peerMedian: Math.round(peerMedians.managementExpenseRatio * 10) / 10,
      unit: '%',
      higherIsBetter: false,
    },
    {
      metric: 'Exec Comp % of Budget',
      org: Math.round((execCompRatio / selectedOrg.annualBudget) * 1000) / 10,
      peerMedian: 3.5,
      unit: '%',
      higherIsBetter: false,
    },
    {
      metric: 'Cash Reserves (months)',
      org: selectedOrg.cashReserveMonths,
      peerMedian: Math.round(peerMedians.cashReserveMonths * 10) / 10,
      unit: ' mo',
      higherIsBetter: true,
    },
  ];

  const barChartData = comparisonData.map((d) => ({
    name: d.metric,
    [selectedOrg.name.split(' ').slice(0, 2).join(' ')]: d.org,
    'Peer Median': d.peerMedian,
  }));

  const orgShortName = selectedOrg.name.split(' ').slice(0, 2).join(' ');

  // Additional deep comparison metrics
  const deepMetrics = [
    { label: 'Risk Score', org: selectedOrg.riskScore, peer: Math.round(peerMedians.riskScore), format: (v: number) => `${v}/100`, higherBetter: true },
    { label: 'Compliance Score', org: selectedOrg.complianceScore, peer: Math.round(peerMedians.complianceScore), format: (v: number) => `${v}/100`, higherBetter: true },
    { label: 'Program Expense Ratio', org: selectedOrg.programExpenseRatio, peer: Math.round(peerMedians.programExpenseRatio * 10) / 10, format: (v: number) => `${v}%`, higherBetter: true },
    { label: 'Management Expense Ratio', org: selectedOrg.managementExpenseRatio, peer: Math.round(peerMedians.managementExpenseRatio * 10) / 10, format: (v: number) => `${v}%`, higherBetter: false },
    { label: 'Fundraising Ratio', org: selectedOrg.fundraisingExpenseRatio, peer: Math.round(peerMedians.fundraisingExpenseRatio * 10) / 10, format: (v: number) => `${v}%`, higherBetter: false },
    { label: 'Cash Reserve Months', org: selectedOrg.cashReserveMonths, peer: Math.round(peerMedians.cashReserveMonths * 10) / 10, format: (v: number) => `${v} mo`, higherBetter: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Peer Benchmarking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Compare grantee performance against peers in the same program area
          </p>
        </div>
      </div>

      {/* Org Selector */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-gray-700">Select grantee to benchmark:</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full appearance-none rounded-md border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
            >
              {nonprofits
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="h-3.5 w-3.5" />
            Comparing against {peerMedians.peerCount} peers in {selectedOrg.programArea}
          </div>
        </div>
      </div>

      {/* Bar Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {comparisonData.map((metric, idx) => (
          <div key={metric.metric} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">{metric.metric}</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn(
                  'font-medium',
                  metric.higherIsBetter
                    ? metric.org >= metric.peerMedian ? 'text-green-600' : 'text-red-600'
                    : metric.org <= metric.peerMedian ? 'text-green-600' : 'text-red-600'
                )}>
                  {metric.org}{metric.unit}
                </span>
                <span className="text-gray-400">vs</span>
                <span className="text-gray-500">{metric.peerMedian}{metric.unit} median</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={[
                  { name: orgShortName, value: metric.org },
                  { name: 'Peer Median', value: metric.peerMedian },
                ]}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={50}>
                  {[
                    <rect key="org" fill="#14B8A6" />,
                    <rect key="peer" fill="#94A3B8" />,
                  ]}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Detailed Comparison Table */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Detailed Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Metric</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{selectedOrg.name}</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Peer Median</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Difference</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deepMetrics.map((m) => {
                const diff = m.org - m.peer;
                const isGood = m.higherBetter ? diff >= 0 : diff <= 0;
                return (
                  <tr key={m.label} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm text-gray-700">{m.label}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{m.format(m.org)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{m.format(m.peer)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-sm font-medium',
                        isGood ? 'text-green-600' : 'text-red-600'
                      )}>
                        {diff >= 0 ? '+' : ''}{Math.round(diff * 10) / 10}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                        isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {isGood ? 'Above Peer' : 'Below Peer'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
