'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchResult {
  ein: string;
  name: string;
  state: string;
  city: string;
  nteeCode: string;
}

interface LeaderboardEntry {
  ein: string;
  name: string;
  state: string;
  overallScore: number;
  programExpenseRatio: number | null;
  revenueTotal: number | null;
  dataVintage: string | null;
}

export default function TransparencyPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    clearTimeout(searchTimeout.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transparency/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.organizations || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    if (leaderboardLoaded) return;
    setLeaderboardError(null);
    try {
      const res = await fetch('/api/transparency/leaderboard?limit=25');
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setLeaderboard(data.scores || []);
      setLeaderboardLoaded(true);
    } catch (err) {
      console.error('Leaderboard error:', err);
      setLeaderboardError('Failed to load leaderboard. Try again.');
    }
  }, [leaderboardLoaded]);

  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand-navy/5 px-3 py-1 text-xs font-medium text-brand-navy mb-4">
          <BarChart3 className="h-3.5 w-3.5" />
          Nonprofit Transparency Scores
        </div>
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          How transparent is your nonprofit?
        </h1>
        <p className="mt-3 text-sm text-slate-500 md:text-base">
          Search by name or EIN to see a transparency score based on public IRS filings,
          governance indicators, and compliance data.
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by nonprofit name or EIN..."
            aria-label="Search nonprofits by name or EIN"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-navy/30 focus:ring-2 focus:ring-brand-navy/10"
          />
          {searching && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 rounded-full border-2 border-brand-navy border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
            {results.map((org) => (
              <Link
                key={org.ein}
                href={`/transparency/${org.ein}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-slate-900">{org.name}</p>
                  <p className="text-xs text-slate-400">
                    EIN: {org.ein} &bull; {org.city}, {org.state}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
        {results.length === 0 && query.trim().length >= 2 && !searching && (
          <p className="mt-3 text-center text-sm text-slate-400">
            No organizations found for &quot;{query}&quot;
          </p>
        )}
      </div>

      <div className="border-t border-slate-100 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand-navy" />
            Leaderboard
          </h2>
          {!leaderboardLoaded && (
            <button
              onClick={loadLeaderboard}
              className="text-xs font-medium text-brand-navy hover:underline"
            >
              Load top scores
            </button>
          )}
        </div>

        {leaderboardError && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {leaderboardError}
          </div>
        )}

        {leaderboard.length > 0 ? (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Organization</th>
                  <th className="px-4 py-2.5">State</th>
                  <th className="px-4 py-2.5 text-right">Score</th>
                  <th className="px-4 py-2.5 text-right">Program %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.ein} className="border-t border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="px-4 py-2.5 text-xs text-slate-400">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/transparency/${entry.ein}`} className="font-medium text-brand-navy hover:underline">
                        {entry.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{entry.state || '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={cn(
                        'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold',
                        entry.overallScore >= 80 ? 'bg-emerald-50 text-emerald-700' :
                        entry.overallScore >= 60 ? 'bg-amber-50 text-amber-700' :
                        'bg-red-50 text-red-700',
                      )}>
                        {entry.overallScore}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {entry.programExpenseRatio != null ? `${(entry.programExpenseRatio * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : leaderboardLoaded ? (
          <p className="text-sm text-slate-400 text-center py-8">
            No scores computed yet. Search for a nonprofit above to generate its first score.
          </p>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            Click &quot;Load top scores&quot; to see the leaderboard of scored nonprofits.
          </p>
        )}
      </div>
    </div>
  );
}
