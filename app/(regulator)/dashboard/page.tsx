'use client';

import { nonprofits, getHighRiskNonprofits } from '@/lib/data/nonprofits';
import { anomalies } from '@/lib/data/anomalies';
import { investigations } from '@/lib/data/investigations';
import { StatCard } from '@/components/shared/StatCard';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { formatCurrency, formatNumber, formatPercent, getRiskBgColor, getSeverityColor } from '@/lib/utils/formatters';
import {
  Building2,
  Link2,
  AlertTriangle,
  Search,
  DollarSign,
  Shield,
  TrendingDown,
  MapPin,
} from 'lucide-react';

// Region mapping for Oregon cities
const REGION_MAP: Record<string, string> = {
  Portland: 'Portland Metro',
  Beaverton: 'Portland Metro',
  Hillsboro: 'Portland Metro',
  Gresham: 'Portland Metro',
  Tigard: 'Portland Metro',
  'Lake Oswego': 'Portland Metro',
  'Oregon City': 'Portland Metro',
  Salem: 'Willamette Valley',
  Albany: 'Willamette Valley',
  Corvallis: 'Willamette Valley',
  McMinnville: 'Willamette Valley',
  Eugene: 'Willamette Valley',
  Springfield: 'Willamette Valley',
  Newberg: 'Willamette Valley',
  Medford: 'Southern Oregon',
  Ashland: 'Southern Oregon',
  'Grants Pass': 'Southern Oregon',
  'Klamath Falls': 'Southern Oregon',
  Roseburg: 'Southern Oregon',
  Bend: 'Central Oregon',
  Redmond: 'Central Oregon',
  Pendleton: 'Eastern Oregon',
  Hermiston: 'Eastern Oregon',
  'The Dalles': 'Eastern Oregon',
  'Hood River': 'Eastern Oregon',
  Newport: 'Oregon Coast',
  Astoria: 'Oregon Coast',
  Tillamook: 'Oregon Coast',
  'Lincoln City': 'Oregon Coast',
  'Coos Bay': 'Oregon Coast',
};

const REGIONS = ['Portland Metro', 'Willamette Valley', 'Southern Oregon', 'Central Oregon', 'Eastern Oregon', 'Oregon Coast'];

function getRegion(city: string): string {
  return REGION_MAP[city] || 'Other';
}

export default function RegulatorDashboardPage() {
  const highRiskOrgs = getHighRiskNonprofits();
  const highRiskAnomalies = anomalies.filter(a => a.severity === 'High');
  const activeInvestigations = investigations.filter(i => i.stage !== 'Recovery');
  const totalEstimatedFraud = investigations.reduce((sum, c) => sum + c.estimatedRecovery, 0);

  // Top 10 highest-risk orgs sorted by riskScore ascending
  const topRiskOrgs = [...nonprofits].sort((a, b) => a.riskScore - b.riskScore).slice(0, 10);

  // Region breakdown
  const regionData = REGIONS.map(region => {
    const orgs = nonprofits.filter(org => getRegion(org.city) === region);
    const highRisk = orgs.filter(org => org.riskScore < 45);
    return {
      region,
      total: orgs.length,
      connected: orgs.length,
      highRisk: highRisk.length,
      avgRisk: orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.riskScore, 0) / orgs.length) : 0,
    };
  });

  // Stats by program area
  const programAreas = ['Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security'];
  const programAreaStats = programAreas.map(area => {
    const orgs = nonprofits.filter(o => o.programArea === area);
    return {
      area,
      count: orgs.length,
      totalBudget: orgs.reduce((s, o) => s + o.annualBudget, 0),
      avgRisk: orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.riskScore, 0) / orgs.length) : 0,
      highRisk: orgs.filter(o => o.riskScore < 45).length,
    };
  });

  // Stats by org size
  const sizeCategories = [
    { label: 'Small (<$1M)', filter: (b: number) => b < 1_000_000 },
    { label: 'Medium ($1M–$5M)', filter: (b: number) => b >= 1_000_000 && b < 5_000_000 },
    { label: 'Large ($5M–$10M)', filter: (b: number) => b >= 5_000_000 && b < 10_000_000 },
    { label: 'Very Large (>$10M)', filter: (b: number) => b >= 10_000_000 },
  ];
  const sizeStats = sizeCategories.map(cat => {
    const orgs = nonprofits.filter(o => cat.filter(o.annualBudget));
    return {
      label: cat.label,
      count: orgs.length,
      avgRisk: orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.riskScore, 0) / orgs.length) : 0,
      totalBudget: orgs.reduce((s, o) => s + o.annualBudget, 0),
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Oregon Department of Justice — Charitable Activities Section</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Registered Charities in Oregon"
          value={formatNumber(24847)}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          title="Connected to Tallyview"
          value={formatNumber(1247)}
          subtitle="5.0% of registered"
          icon={<Link2 className="h-5 w-5" />}
          variant="success"
        />
        <StatCard
          title="High Risk Flagged"
          value="23"
          variant="danger"
          icon={<AlertTriangle className="h-5 w-5" />}
          subtitle={`${highRiskAnomalies.length} active high-severity alerts`}
        />
        <StatCard
          title="Active Investigations"
          value={activeInvestigations.length.toString()}
          icon={<Search className="h-5 w-5" />}
          variant="warning"
        />
        <StatCard
          title="Estimated Fraud Exposure"
          value="$12.4M"
          icon={<DollarSign className="h-5 w-5" />}
          variant="danger"
          subtitle={`Across ${investigations.length} cases`}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Jurisdiction Breakdown - takes 2 cols */}
        <div className="xl:col-span-2 bg-white rounded-lg border shadow-sm">
          <div className="p-5 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-gray-900">Jurisdiction Breakdown by Region</h2>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Connected Orgs</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">High Risk</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Risk Score</th>
                </tr>
              </thead>
              <tbody>
                {regionData.map((r, idx) => (
                  <tr key={r.region} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-5 py-3 font-medium text-gray-900">{r.region}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{r.connected}</td>
                    <td className="px-5 py-3 text-right">
                      {r.highRisk > 0 ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          {r.highRisk}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRiskBgColor(r.avgRisk)}`}>
                        {r.avgRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-gray-50 font-medium">
                  <td className="px-5 py-3 text-gray-900">Total</td>
                  <td className="px-5 py-3 text-right text-gray-900">{regionData.reduce((s, r) => s + r.connected, 0)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      {regionData.reduce((s, r) => s + r.highRisk, 0)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="text-xs text-gray-500">
                      {Math.round(regionData.reduce((s, r) => s + r.avgRisk * r.total, 0) / regionData.reduce((s, r) => s + r.total, 0))} avg
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="space-y-6">
          {/* By Org Size */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">By Organization Size</h3>
            <div className="space-y-3">
              {sizeStats.map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-700">{s.label}</p>
                    <p className="text-[10px] text-gray-400">{s.count} orgs · {formatCurrency(s.totalBudget, true)} total</p>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRiskBgColor(s.avgRisk)}`}>
                    {s.avgRisk} avg
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* By Program Area */}
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">By Program Area</h3>
            <div className="space-y-2.5">
              {programAreaStats.sort((a, b) => a.avgRisk - b.avgRisk).map(pa => (
                <div key={pa.area} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-700">{pa.area}</p>
                    {pa.highRisk > 0 && (
                      <span className="text-[10px] bg-red-100 text-red-700 rounded-full px-1.5 py-0.5">{pa.highRisk} risk</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{pa.count}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getRiskBgColor(pa.avgRisk)}`}>
                      {pa.avgRisk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Risk Organizations */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-900">Top Risk Organizations</h2>
            </div>
            <span className="text-xs text-gray-400">Sorted by risk score (lowest = highest risk)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Budget</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Compliance</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">990 Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key Issues</th>
              </tr>
            </thead>
            <tbody>
              {topRiskOrgs.map((org, idx) => {
                const orgAnomalies = anomalies.filter(a => a.organizationId === org.id && a.severity === 'High');
                const filing990Class = org.filing990Status === 'Current'
                  ? 'bg-green-100 text-green-700'
                  : org.filing990Status === 'Overdue'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700';

                return (
                  <tr key={org.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-5 py-3">
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{org.name}</p>
                        <p className="text-[10px] text-gray-400">{org.programArea} · EIN: {org.ein}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">{org.city}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-700">{formatCurrency(org.annualBudget, true)}</td>
                    <td className="px-5 py-3 text-center">
                      <RiskScoreBadge score={org.riskScore} size="sm" />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getRiskBgColor(org.complianceScore)}`}>
                        {org.complianceScore}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${filing990Class}`}>
                        {org.filing990Status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {orgAnomalies.slice(0, 2).map(a => (
                          <span key={a.id} className="inline-block text-[10px] bg-red-50 text-red-600 rounded px-1.5 py-0.5 truncate max-w-[220px]">
                            {a.category}
                          </span>
                        ))}
                        {org.filing990Status !== 'Current' && (
                          <span className="inline-block text-[10px] bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">
                            Filing {org.filing990Status}
                          </span>
                        )}
                        {org.cashReserveMonths < 1.5 && (
                          <span className="inline-block text-[10px] bg-orange-50 text-orange-600 rounded px-1.5 py-0.5">
                            Low Cash Reserve
                          </span>
                        )}
                      </div>
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
