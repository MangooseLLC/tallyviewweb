'use client';

import { useState, useMemo } from 'react';
import { anomalies } from '@/lib/data/anomalies';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { cn } from '@/lib/utils';
import type { AlertSeverity, AlertCategory, AlertStatus } from '@/lib/types';
import { AlertTriangle, Filter, Search } from 'lucide-react';

const SEVERITIES: AlertSeverity[] = ['High', 'Medium', 'Low', 'Info'];
const CATEGORIES: AlertCategory[] = [
  'Financial Health',
  'Governance',
  'Compliance',
  'Fraud Pattern',
  'Vendor',
  'Compensation',
  'Expense Allocation',
];
const STATUSES: AlertStatus[] = ['New', 'Reviewed', 'Resolved', 'Escalated'];

const severityButtonColor: Record<AlertSeverity, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low: 'bg-green-100 text-green-700 border-green-200',
  Info: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function AlertsPage() {
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<AlertStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = useMemo(() => {
    let data = [...anomalies];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (a) =>
          a.description.toLowerCase().includes(q) ||
          a.organizationName.toLowerCase().includes(q)
      );
    }

    if (selectedSeverity !== 'All') {
      data = data.filter((a) => a.severity === selectedSeverity);
    }
    if (selectedCategory !== 'All') {
      data = data.filter((a) => a.category === selectedCategory);
    }
    if (selectedStatus !== 'All') {
      data = data.filter((a) => a.status === selectedStatus);
    }

    // Sort: High first, then by date
    const severityOrder: Record<string, number> = { High: 0, Medium: 1, Low: 2, Info: 3 };
    data.sort((a, b) => {
      const sevCmp = severityOrder[a.severity] - severityOrder[b.severity];
      if (sevCmp !== 0) return sevCmp;
      return new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime();
    });

    return data;
  }, [searchQuery, selectedSeverity, selectedCategory, selectedStatus]);

  // Counts
  const counts = {
    High: anomalies.filter((a) => a.severity === 'High').length,
    Medium: anomalies.filter((a) => a.severity === 'Medium').length,
    Low: anomalies.filter((a) => a.severity === 'Low').length,
    Info: anomalies.filter((a) => a.severity === 'Info').length,
    New: anomalies.filter((a) => a.status === 'New').length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Risk Alerts</h1>
          <p className="mt-1 text-sm text-gray-500">
            {filteredAlerts.length} alerts across your grantee portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
            {counts.High} High
          </span>
          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-bold text-yellow-700">
            {counts.Medium} Medium
          </span>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
            {counts.Low} Low
          </span>
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
            {counts.Info} Info
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search alerts by description or organization..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium mr-1">Severity:</span>
          <button
            onClick={() => setSelectedSeverity('All')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              selectedSeverity === 'All'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            All ({anomalies.length})
          </button>
          {SEVERITIES.map((sev) => (
            <button
              key={sev}
              onClick={() => setSelectedSeverity(sev === selectedSeverity ? 'All' : sev)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                selectedSeverity === sev
                  ? severityButtonColor[sev]
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {sev} ({counts[sev]})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium ml-5 mr-1">Category:</span>
          <button
            onClick={() => setSelectedCategory('All')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              selectedCategory === 'All'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? 'All' : cat)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                selectedCategory === cat
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium ml-5 mr-1">Status:</span>
          <button
            onClick={() => setSelectedStatus('All')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
              selectedStatus === 'All'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status === selectedStatus ? 'All' : status)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                selectedStatus === status
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Cards */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
            <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No alerts match your filters</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-4 py-2 bg-gray-50/60 border-b border-gray-100 flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{alert.organizationName}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{alert.id}</span>
              </div>
              <div className="p-4">
                <AnomalyAlertCard anomaly={alert} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
