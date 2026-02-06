'use client';

import { useState, useMemo } from 'react';
import { getAnomaliesByOrg } from '@/lib/data/anomalies';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { AlertSeverity, AlertCategory } from '@/lib/types';
import { AlertTriangle, Filter, Search } from 'lucide-react';

const severityOptions: AlertSeverity[] = ['High', 'Medium', 'Low', 'Info'];
const categoryOptions: AlertCategory[] = [
  'Financial Health',
  'Governance',
  'Compliance',
  'Fraud Pattern',
  'Vendor',
  'Compensation',
  'Expense Allocation',
];

export default function AnomaliesPage() {
  const allAnomalies = getAnomaliesByOrg('org-bright-futures');
  const [selectedSeverity, setSelectedSeverity] = useState<AlertSeverity | 'All'>('All');
  const [selectedCategory, setSelectedCategory] = useState<AlertCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnomalies = useMemo(() => {
    return allAnomalies.filter(a => {
      if (selectedSeverity !== 'All' && a.severity !== selectedSeverity) return false;
      if (selectedCategory !== 'All' && a.category !== selectedCategory) return false;
      if (searchQuery && !a.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allAnomalies, selectedSeverity, selectedCategory, searchQuery]);

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allAnomalies.length };
    severityOptions.forEach(s => {
      counts[s] = allAnomalies.filter(a => a.severity === s).length;
    });
    return counts;
  }, [allAnomalies]);

  const severityButtonColor = (severity: string, isActive: boolean) => {
    if (!isActive) return 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50';
    switch (severity) {
      case 'High': return 'bg-red-50 text-red-700 border-red-200';
      case 'Medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'Low': return 'bg-green-50 text-green-700 border-green-200';
      case 'Info': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anomaly Alerts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {allAnomalies.length} total alerts for Bright Futures Youth Services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-50 text-red-700">
              🔴 {severityCounts['High'] || 0} High
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-50 text-yellow-700">
              🟡 {severityCounts['Medium'] || 0} Medium
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 text-green-700">
              🟢 {severityCounts['Low'] || 0} Low
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700">
              🔵 {severityCounts['Info'] || 0} Info
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 shadow-sm space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search anomalies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
            <Filter className="h-3.5 w-3.5" />
            Severity:
          </div>
          <button
            onClick={() => setSelectedSeverity('All')}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${severityButtonColor('All', selectedSeverity === 'All')}`}
          >
            All ({severityCounts['All']})
          </button>
          {severityOptions.map(severity => (
            <button
              key={severity}
              onClick={() => setSelectedSeverity(selectedSeverity === severity ? 'All' : severity)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${severityButtonColor(severity, selectedSeverity === severity)}`}
            >
              {severity} ({severityCounts[severity] || 0})
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
            <Filter className="h-3.5 w-3.5" />
            Category:
          </div>
          <button
            onClick={() => setSelectedCategory('All')}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
              selectedCategory === 'All'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {categoryOptions.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? 'All' : category)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                selectedCategory === category
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filteredAnomalies.length === 0 ? (
        <div className="bg-white rounded-lg border p-10 shadow-sm text-center">
          <AlertTriangle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No anomalies match your filters</p>
          <button
            onClick={() => { setSelectedSeverity('All'); setSelectedCategory('All'); setSearchQuery(''); }}
            className="text-xs text-amber-600 hover:text-amber-700 mt-2 font-medium"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{filteredAnomalies.length} anomal{filteredAnomalies.length === 1 ? 'y' : 'ies'} found</p>
          {filteredAnomalies.map(anomaly => (
            <AnomalyAlertCard key={anomaly.id} anomaly={anomaly} />
          ))}
        </div>
      )}
    </div>
  );
}
