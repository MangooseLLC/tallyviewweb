'use client';

import { nonprofits } from '@/lib/data/nonprofits';
import { formatCurrency, formatNumber, getRiskBgColor } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import {
  Map,
  MapPin,
  AlertTriangle,
  Shield,
  Building2,
  BarChart3,
} from 'lucide-react';

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
  Newport: 'Coastal Oregon',
  Astoria: 'Coastal Oregon',
  Tillamook: 'Coastal Oregon',
  'Lincoln City': 'Coastal Oregon',
  'Coos Bay': 'Coastal Oregon',
};

const REGIONS = [
  { name: 'Portland Metro', color: 'from-blue-500 to-blue-600' },
  { name: 'Willamette Valley', color: 'from-amber-500 to-amber-600' },
  { name: 'Southern Oregon', color: 'from-amber-500 to-amber-600' },
  { name: 'Central Oregon', color: 'from-purple-500 to-purple-600' },
  { name: 'Eastern Oregon', color: 'from-rose-500 to-rose-600' },
  { name: 'Coastal Oregon', color: 'from-cyan-500 to-cyan-600' },
];

function getRegion(city: string): string {
  return REGION_MAP[city] || 'Other';
}

function getRiskDistribution(orgs: typeof nonprofits) {
  const low = orgs.filter(o => o.riskScore >= 75).length;
  const moderate = orgs.filter(o => o.riskScore >= 60 && o.riskScore < 75).length;
  const elevated = orgs.filter(o => o.riskScore >= 45 && o.riskScore < 60).length;
  const high = orgs.filter(o => o.riskScore < 45).length;
  return { low, moderate, elevated, high };
}

export default function JurisdictionRiskMapPage() {
  const regionData = REGIONS.map(r => {
    const orgs = nonprofits.filter(org => getRegion(org.city) === r.name);
    const dist = getRiskDistribution(orgs);
    const totalBudget = orgs.reduce((s, o) => s + o.annualBudget, 0);
    const avgRisk = orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.riskScore, 0) / orgs.length) : 0;
    return { ...r, orgs, dist, totalBudget, avgRisk, count: orgs.length };
  });

  // Program area breakdown
  const programAreas = ['Youth Services', 'Health', 'Education', 'Environment', 'Arts', 'Housing', 'Community Development', 'Food Security'];
  const programAreaData = programAreas.map(area => {
    const orgs = nonprofits.filter(o => o.programArea === area);
    const dist = getRiskDistribution(orgs);
    const avgRisk = orgs.length > 0 ? Math.round(orgs.reduce((s, o) => s + o.riskScore, 0) / orgs.length) : 0;
    return { area, count: orgs.length, dist, avgRisk };
  });

  const totalOrgs = nonprofits.length;
  const overallDist = getRiskDistribution(nonprofits);
  const avgRisk = Math.round(nonprofits.reduce((s, o) => s + o.riskScore, 0) / totalOrgs);
  const totalBudget = nonprofits.reduce((s, o) => s + o.annualBudget, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Jurisdiction Risk Map</h1>
        <p className="text-sm text-gray-500 mt-1">Visual risk distribution across Oregon regions</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall sidebar */}
        <div className="bg-white rounded-lg border shadow-sm p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Overall Risk Summary</h3>
          </div>

          <div className="text-center py-3">
            <div className={cn(
              'inline-flex items-center justify-center h-20 w-20 rounded-full text-2xl font-bold ring-4',
              avgRisk >= 75 ? 'bg-green-100 text-green-700 ring-green-500' :
              avgRisk >= 60 ? 'bg-yellow-100 text-yellow-700 ring-yellow-500' :
              avgRisk >= 45 ? 'bg-orange-100 text-orange-700 ring-orange-500' :
              'bg-red-100 text-red-700 ring-red-500'
            )}>
              {avgRisk}
            </div>
            <p className="text-xs text-gray-500 mt-2">Average Risk Score</p>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-600">Low Risk (75+)</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">{overallDist.low}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                <span className="text-xs text-gray-600">Moderate (60–74)</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">{overallDist.moderate}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-xs text-gray-600">Elevated (45–59)</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">{overallDist.elevated}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600">High Risk (&lt;45)</span>
              </div>
              <span className="text-xs font-semibold text-gray-900">{overallDist.high}</span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Connected</span>
              <span className="font-medium text-gray-900">{totalOrgs}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total Budget</span>
              <span className="font-medium text-gray-900">{formatCurrency(totalBudget, true)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">High Risk Rate</span>
              <span className="font-medium text-red-600">{((overallDist.high / totalOrgs) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Region Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {regionData.map(r => {
            const total = r.dist.low + r.dist.moderate + r.dist.elevated + r.dist.high;
            return (
              <div key={r.name} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className={cn('h-1.5 bg-gradient-to-r', r.color)} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <h3 className="text-sm font-semibold text-gray-900">{r.name}</h3>
                    </div>
                    <span className={cn(
                      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      getRiskBgColor(r.avgRisk)
                    )}>
                      {r.avgRisk}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{r.count}</p>
                      <p className="text-[10px] text-gray-400">Orgs</p>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(r.totalBudget, true)}</p>
                      <p className="text-[10px] text-gray-400">Total Budget</p>
                    </div>
                    {r.dist.high > 0 && (
                      <>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="text-center">
                          <p className="text-lg font-bold text-red-600">{r.dist.high}</p>
                          <p className="text-[10px] text-red-400">High Risk</p>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Risk distribution bar */}
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1.5">Risk Distribution</p>
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
                      {r.dist.high > 0 && (
                        <div
                          className="bg-red-500 transition-all"
                          style={{ width: `${(r.dist.high / total) * 100}%` }}
                          title={`High Risk: ${r.dist.high}`}
                        />
                      )}
                      {r.dist.elevated > 0 && (
                        <div
                          className="bg-orange-400 transition-all"
                          style={{ width: `${(r.dist.elevated / total) * 100}%` }}
                          title={`Elevated: ${r.dist.elevated}`}
                        />
                      )}
                      {r.dist.moderate > 0 && (
                        <div
                          className="bg-yellow-400 transition-all"
                          style={{ width: `${(r.dist.moderate / total) * 100}%` }}
                          title={`Moderate: ${r.dist.moderate}`}
                        />
                      )}
                      {r.dist.low > 0 && (
                        <div
                          className="bg-green-500 transition-all"
                          style={{ width: `${(r.dist.low / total) * 100}%` }}
                          title={`Low Risk: ${r.dist.low}`}
                        />
                      )}
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <div className="flex gap-3">
                        {r.dist.high > 0 && <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{r.dist.high}</span>}
                        {r.dist.elevated > 0 && <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-orange-400" />{r.dist.elevated}</span>}
                        {r.dist.moderate > 0 && <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />{r.dist.moderate}</span>}
                        <span className="flex items-center gap-1 text-[10px] text-gray-500"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />{r.dist.low}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Program Area Breakdown */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-5 border-b">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-gray-900">Risk Distribution by Program Area</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Area</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orgs</th>
                <th className="px-5 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Risk</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[280px]">Risk Distribution</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">High Risk</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Elevated</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Moderate</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Low Risk</th>
              </tr>
            </thead>
            <tbody>
              {programAreaData.sort((a, b) => a.avgRisk - b.avgRisk).map((pa, idx) => {
                const total = pa.dist.low + pa.dist.moderate + pa.dist.elevated + pa.dist.high;
                return (
                  <tr key={pa.area} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <td className="px-5 py-3 font-medium text-gray-900 text-xs">{pa.area}</td>
                    <td className="px-5 py-3 text-right text-xs text-gray-600">{pa.count}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        getRiskBgColor(pa.avgRisk)
                      )}>
                        {pa.avgRisk}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100">
                        {pa.dist.high > 0 && (
                          <div className="bg-red-500" style={{ width: `${(pa.dist.high / total) * 100}%` }} />
                        )}
                        {pa.dist.elevated > 0 && (
                          <div className="bg-orange-400" style={{ width: `${(pa.dist.elevated / total) * 100}%` }} />
                        )}
                        {pa.dist.moderate > 0 && (
                          <div className="bg-yellow-400" style={{ width: `${(pa.dist.moderate / total) * 100}%` }} />
                        )}
                        {pa.dist.low > 0 && (
                          <div className="bg-green-500" style={{ width: `${(pa.dist.low / total) * 100}%` }} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      {pa.dist.high > 0 ? (
                        <span className="text-red-600 font-medium">{pa.dist.high}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      {pa.dist.elevated > 0 ? (
                        <span className="text-orange-600 font-medium">{pa.dist.elevated}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      {pa.dist.moderate > 0 ? (
                        <span className="text-yellow-600 font-medium">{pa.dist.moderate}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-xs">
                      <span className="text-green-600 font-medium">{pa.dist.low}</span>
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
