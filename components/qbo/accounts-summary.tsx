'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  qboId: string;
  name: string;
  accountType: string;
  accountSubType: string | null;
  classification: string | null;
  currentBalance: number | null;
  active: boolean;
}

const CLASSIFICATION_ORDER = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
const CLASSIFICATION_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Asset: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Liability: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Equity: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Revenue: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Expense: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
};

export function AccountsSummary({ refreshKey }: { refreshKey?: number }) {
  const [grouped, setGrouped] = useState<Record<string, Account[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qbo/accounts');
      const data = await res.json();
      setGrouped(data.grouped || {});
      const initial: Record<string, boolean> = {};
      for (const key of Object.keys(data.grouped || {})) {
        initial[key] = true;
      }
      setExpanded(initial);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, refreshKey]);

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    const aIdx = CLASSIFICATION_ORDER.indexOf(a);
    const bIdx = CLASSIFICATION_ORDER.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Chart of Accounts</h2>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (sortedKeys.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Chart of Accounts</h2>
        <div className="mt-6 flex flex-col items-center text-center">
          <Wallet className="h-10 w-10 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            No accounts synced yet. Sync your QuickBooks data to see accounts here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Chart of Accounts</h2>
        <p className="text-sm text-gray-500">
          {Object.values(grouped).flat().length} accounts across{' '}
          {sortedKeys.length} classifications
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {sortedKeys.map((classification) => {
          const accounts = grouped[classification];
          const style = CLASSIFICATION_STYLES[classification] || {
            bg: 'bg-gray-50',
            text: 'text-gray-700',
            border: 'border-gray-200',
          };
          const total = accounts.reduce(
            (sum, a) => sum + (a.currentBalance ?? 0),
            0
          );
          const isExpanded = expanded[classification];

          return (
            <div key={classification}>
              <button
                onClick={() => toggle(classification)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <span
                    className={cn(
                      'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                      style.bg,
                      style.text,
                      style.border
                    )}
                  >
                    {classification}
                  </span>
                  <span className="text-xs text-gray-400">
                    {accounts.length} accounts
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(total)}
                </span>
              </button>
              {isExpanded && (
                <div className="bg-gray-50/30 px-4 pb-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between rounded-md px-4 py-2 text-sm transition-colors hover:bg-gray-100"
                    >
                      <div>
                        <span className={cn('text-gray-900', !account.active && 'line-through opacity-50')}>
                          {account.name}
                        </span>
                        {account.accountSubType && (
                          <span className="ml-2 text-xs text-gray-400">
                            {account.accountSubType}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'font-mono text-sm',
                          (account.currentBalance ?? 0) < 0
                            ? 'text-red-600'
                            : 'text-gray-700'
                        )}
                      >
                        {formatCurrency(account.currentBalance)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
