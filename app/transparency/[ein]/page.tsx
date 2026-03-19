'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Heart, Shield, Eye, Scale, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransparencyScoreData {
  ein: string;
  name: string;
  state: string | null;
  overallScore: number;
  financialHealth: number;
  governanceScore: number;
  transparencyScore: number;
  complianceScore: number;
  programExpenseRatio: number | null;
  revenueTotal: number | null;
  assetsTotal: number | null;
  filingYear: number | null;
  dataVintage: string | null;
}

function ScoreRing({ value, label, icon, size = 'lg' }: { value: number; label: string; icon: React.ReactNode; size?: 'sm' | 'lg' }) {
  const radius = size === 'lg' ? 48 : 32;
  const stroke = size === 'lg' ? 6 : 4;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          role="img"
          aria-label={`${label}: ${value} out of 100`}
          width={(radius + stroke) * 2}
          height={(radius + stroke) * 2}
          className="-rotate-90"
        >
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-100"
          />
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className={cn(
              value >= 80 ? 'text-emerald-500' :
              value >= 60 ? 'text-amber-500' :
              'text-red-500',
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            'font-bold',
            size === 'lg' ? 'text-2xl' : 'text-lg',
          )}>
            {value}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}

export default function TransparencyScorePage() {
  const params = useParams();
  const rawEin = params.ein;
  const ein = Array.isArray(rawEin) ? rawEin[0] : rawEin;
  const [score, setScore] = useState<TransparencyScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/transparency/${ein}`);
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setScore(data.score);
        }
      } catch {
        setError('Failed to load score');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ein]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-brand-navy" />
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-slate-500">{error || 'Organization not found'}</p>
        <Link href="/transparency" className="mt-4 inline-flex items-center gap-1 text-sm text-brand-navy hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to search
        </Link>
      </div>
    );
  }

  const formatCurrency = (val: number | null) => {
    if (val == null) return '—';
    const abs = Math.abs(val);
    if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
    return `$${val.toLocaleString()}`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Link href="/transparency" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-navy">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to search
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{score.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            EIN: {score.ein}
            {score.state && ` \u2022 ${score.state}`}
            {score.dataVintage && ` \u2022 ${score.dataVintage}`}
          </p>
        </div>
        <div className={cn(
          'rounded-xl px-4 py-2 text-center',
          score.overallScore >= 80 ? 'bg-emerald-50' :
          score.overallScore >= 60 ? 'bg-amber-50' :
          'bg-red-50',
        )}>
          <p className={cn(
            'text-3xl font-bold',
            score.overallScore >= 80 ? 'text-emerald-700' :
            score.overallScore >= 60 ? 'text-amber-700' :
            'text-red-700',
          )}>
            {score.overallScore}
          </p>
          <p className="text-[10px] text-slate-500">OVERALL</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <ScoreRing value={score.financialHealth} label="Financial Health" icon={<Heart className="h-3 w-3" />} size="sm" />
        <ScoreRing value={score.governanceScore} label="Governance" icon={<Shield className="h-3 w-3" />} size="sm" />
        <ScoreRing value={score.transparencyScore} label="Transparency" icon={<Eye className="h-3 w-3" />} size="sm" />
        <ScoreRing value={score.complianceScore} label="Compliance" icon={<Scale className="h-3 w-3" />} size="sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(score.revenueTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Assets</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(score.assetsTotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Program Expense Ratio</p>
          <p className="mt-1 text-lg font-bold text-slate-900">
            {score.programExpenseRatio != null ? `${(score.programExpenseRatio * 100).toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-brand-navy" />
          Score Methodology
        </h3>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Scores are computed from publicly available IRS Form 990 data via ProPublica Nonprofit Explorer.
          Four dimensions are weighted: Financial Health (30%), Governance (25%), Transparency (25%),
          and Compliance (20%). Data may be 12-24 months behind due to IRS processing timelines.
        </p>
        <Link
          href="/transparency/methodology"
          className="mt-3 inline-flex items-center gap-1 text-xs text-brand-navy hover:underline"
        >
          Full methodology <ArrowLeft className="h-3 w-3 rotate-180" />
        </Link>
      </div>
    </div>
  );
}
