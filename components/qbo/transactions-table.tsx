'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  qboId: string;
  sourceType: string;
  txnDate: string;
  description: string | null;
  amount: number;
  accountName: string | null;
  vendorName: string | null;
  customerName: string | null;
  status: string | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SOURCE_TYPE_STYLES: Record<string, string> = {
  Invoice: 'bg-blue-50 text-blue-700 border-blue-200',
  Bill: 'bg-orange-50 text-orange-700 border-orange-200',
  Purchase: 'bg-red-50 text-red-700 border-red-200',
  JournalEntry: 'bg-gray-100 text-gray-700 border-gray-200',
  BillPayment: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function TransactionsTable({ refreshKey }: { refreshKey?: number }) {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('txnDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (sourceFilter) params.set('sourceType', sourceFilter);

      const res = await fetch(`/api/qbo/transactions?${params}`);
      const json = await res.json();
      if (json.error) {
        console.error('Transaction API error:', json.error);
        setData({ transactions: [], total: 0, page: 1, pageSize: 25, totalPages: 0 });
      } else {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, debouncedSearch, sourceFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const sourceTypes = ['Invoice', 'Bill', 'Purchase', 'JournalEntry', 'BillPayment'];

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transactions
            </h2>
            <p className="text-sm text-gray-500">
              {data ? `${data.total} total records` : 'Loading...'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-[hsl(40,90%,61%)] focus:ring-1 focus:ring-[hsl(40,90%,61%)]"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[hsl(40,90%,61%)] focus:ring-1 focus:ring-[hsl(40,90%,61%)]"
            >
              <option value="">All Types</option>
              {sourceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {[
                { key: 'txnDate', label: 'Date' },
                { key: 'sourceType', label: 'Type' },
                { key: 'description', label: 'Description' },
                { key: 'amount', label: 'Amount' },
              ].map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:text-gray-700"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Vendor / Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Account
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && !data ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  No transactions found. Click &quot;Sync Now&quot; to pull data from
                  QuickBooks.
                </td>
              </tr>
            ) : (
              data?.transactions.map((txn) => (
                <tr
                  key={txn.id}
                  className="transition-colors hover:bg-gray-50/50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {formatDate(txn.txnDate)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                        SOURCE_TYPE_STYLES[txn.sourceType] ||
                          'bg-gray-100 text-gray-700'
                      )}
                    >
                      {txn.sourceType}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-sm text-gray-900">
                    {txn.description || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {formatCurrency(txn.amount)}
                  </td>
                  <td className="max-w-[150px] truncate px-4 py-3 text-sm text-gray-600">
                    {txn.vendorName || txn.customerName || '—'}
                  </td>
                  <td className="max-w-[150px] truncate px-4 py-3 text-sm text-gray-600">
                    {txn.accountName || '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {txn.status ? (
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          txn.status === 'Paid'
                            ? 'bg-green-50 text-green-700'
                            : txn.status === 'Open'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        {txn.status}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <p className="text-sm text-gray-500">
            Showing {(data.page - 1) * data.pageSize + 1}–
            {Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
              const start = Math.max(
                1,
                Math.min(page - 2, data.totalPages - 4)
              );
              const pageNum = start + i;
              if (pageNum > data.totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                    pageNum === page
                      ? 'bg-[hsl(210,100%,12%)] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
