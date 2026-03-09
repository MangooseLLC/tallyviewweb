'use client';

import { StatCard } from '@/components/shared/StatCard';
import { RiskScoreBadge } from '@/components/shared/RiskScoreBadge';
import { AnomalyAlertCard } from '@/components/shared/AnomalyAlertCard';
import { TallyviewVerifiedBadge, type AttestationData } from '@/components/shared/TallyviewVerifiedBadge';
import { PortfolioHealthTrend } from '@/components/charts/PortfolioHealthTrend';
import { nonprofits, getHighRiskNonprofits } from '@/lib/data/nonprofits';
import { anomalies } from '@/lib/data/anomalies';
import { getTotalPortfolioValue } from '@/lib/data/grants';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Users,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface ChainData {
  anomalySummary: { total: number; open: number; critical: number; live: boolean };
  attestation: AttestationData | null;
}

interface FoundationDashboardContentProps {
  chainData: ChainData;
}

export function FoundationDashboardContent({ chainData }: FoundationDashboardContentProps) {
  const totalPortfolio = getTotalPortfolioValue();
  const { anomalySummary, attestation } = chainData;

  const recentAlerts = [...anomalies]
    .sort((a, b) => new Date(b.detectedDate).getTime() - new Date(a.detectedDate).getTime())
    .slice(0, 10);

  const lowRisk = nonprofits.filter(o => o.riskScore >= 75).length;
  const moderateRisk = nonprofits.filter(o => o.riskScore >= 60 && o.riskScore < 75).length;
  const elevatedRisk = nonprofits.filter(o => o.riskScore >= 45 && o.riskScore < 60).length;
  const highRisk = nonprofits.filter(o => o.riskScore < 45).length;

  const heatmapSquares = nonprofits
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((org) => {
      let color = 'bg-green-400';
      if (org.riskScore < 45) color = 'bg-red-400';
      else if (org.riskScore < 60) color = 'bg-orange-400';
      else if (org.riskScore < 75) color = 'bg-yellow-400';
      const isLighthouse = org.id === 'org-bright-futures';
      return { id: org.id, name: org.name, score: org.riskScore, color, isLighthouse };
    });

  const moderateAlertValue = anomalySummary.live ? anomalySummary.open.toString() : '18';
  const moderateAlertSubtitle = anomalySummary.live
    ? `${anomalySummary.total} total from chain`
    : 'Across 12 organizations';

  const highRiskDetails = [
    {
      id: 'org-cascade', name: 'Cascade Community Alliance', grantAmount: 350000, riskScore: 31,
      findings: ['Revenue declined 42% YoY while executive compensation increased 28%', '990 filing 11 months overdue', "Shared vendor address with board chair's consulting firm"],
    },
    {
      id: 'org-portland-gardens', name: 'Portland Urban Gardens Initiative', grantAmount: 175000, riskScore: 38,
      findings: ['Program expense ratio dropped from 82% to 61% in 12 months', 'Three largest vendors are sole-source with no competitive bidding ($312K)', 'New CFO position at 40% above median for org size'],
    },
    {
      id: 'org-river-valley', name: 'River Valley Health Outreach', grantAmount: 220000, riskScore: 42,
      findings: ['Cash reserves below 1 month operating expenses', 'Audit opinion downgraded — material weakness in internal controls', 'Projected to exhaust operating funds within 4 months'],
    },
    {
      id: 'org-nw-digital', name: 'Northwest Digital Literacy Project', grantAmount: 90000, riskScore: 44,
      findings: ['Grant utilization at 12% with 60% of grant period elapsed', 'No financial activity in QuickBooks for 47 days', 'Board member serves on 4 boards, all using same vendor'],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Portfolio Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Real-time portfolio health overview across all active grantees</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Active Grantees" value="217" subtitle="Across 8 program areas" trend="up" trendValue="+12 this quarter" icon={<Users className="h-5 w-5" />} />
        <StatCard title="Total Portfolio Value" value={formatCurrency(totalPortfolio, true)} subtitle={formatCurrency(totalPortfolio)} trend="up" trendValue="+8.3% YoY" icon={<DollarSign className="h-5 w-5" />} />
        <StatCard title="High Risk Grantees" value="4" subtitle="Requires immediate attention" variant="danger" trend="down" trendValue="Down from 7 in Q3" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard
          title="Moderate Alerts"
          value={moderateAlertValue}
          subtitle={moderateAlertSubtitle}
          variant="warning"
          trend="down"
          trendValue={anomalySummary.live ? 'Live from chain' : '-3 from last month'}
          icon={<AlertCircle className="h-5 w-5" />}
        />
        <StatCard title="Avg Compliance Score" value="84/100" subtitle="Portfolio-wide average" variant="success" trend="up" trendValue="Up from 79 last quarter" icon={<ShieldCheck className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Portfolio Health Heatmap</h2>
              <p className="text-xs text-gray-500 mt-0.5">Each square represents a grantee, colored by risk level</p>
            </div>
            <Link href="/foundation/portfolio" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-1">
            {heatmapSquares.map((sq) => (
              <div key={sq.id} className="relative">
                <Link
                  href={`/foundation/grantee/${sq.id}`}
                  className={`block h-5 w-5 rounded-sm ${sq.color} hover:ring-2 hover:ring-offset-1 hover:ring-gray-400 transition-all`}
                  title={`${sq.name}: ${sq.score}`}
                />
                {sq.isLighthouse && attestation?.live && (
                  <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500 border border-white" title="Onchain Verified" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-green-400" /><span>{lowRisk} Low Risk</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-yellow-400" /><span>{moderateRisk} Moderate</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-orange-400" /><span>{elevatedRisk} Elevated</span></div>
            <div className="flex items-center gap-1.5"><div className="h-3 w-3 rounded-sm bg-red-400" /><span>{highRisk} High Risk</span></div>
            {attestation?.live && (
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                <span className="text-green-600 font-medium">Onchain Verified</span>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Alerts</h2>
            <Link href="/foundation/alerts" className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {recentAlerts.map((alert) => (
              <AnomalyAlertCard key={alert.id} anomaly={alert} compact />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <h2 className="text-sm font-semibold text-gray-900">High-Risk Grantees Alert Panel</h2>
          <span className="text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">{highRiskDetails.length} organizations</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {highRiskDetails.map((org) => (
            <Link key={org.id} href={`/foundation/grantee/${org.id}`} className="block rounded-lg border border-gray-200 p-4 hover:border-red-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{org.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{formatCurrency(org.grantAmount)} grant</p>
                </div>
                <RiskScoreBadge score={org.riskScore} size="sm" />
              </div>
              <ul className="space-y-1.5">
                {org.findings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                    <span className="text-xs text-gray-600 leading-relaxed">{finding}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-1 text-xs text-amber-600 font-medium">
                View details <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Portfolio Health Trend</h2>
          <p className="text-xs text-gray-500 mt-0.5">Average compliance score and high-risk organization count over the past 12 months</p>
        </div>
        <PortfolioHealthTrend height={280} />
      </div>
    </div>
  );
}
