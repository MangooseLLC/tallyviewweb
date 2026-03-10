'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QBOConnect } from '@/components/qbo/qbo-connect';
import { TransactionsTable } from '@/components/qbo/transactions-table';
import { AccountsSummary } from '@/components/qbo/accounts-summary';
import { LogOut } from 'lucide-react';

export default function QBODashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { appUser, signOut } = useAuth();

  const handleSyncComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  const orgName = appUser?.memberships?.[0]?.org?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(210,100%,12%)]">
              <span className="text-sm font-bold text-[hsl(40,90%,61%)]">TV</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Tallyview</h1>
              <p className="text-xs text-gray-500">{orgName || 'QuickBooks Integration'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {appUser && (
              <span className="text-xs text-gray-500">{appUser.email}</span>
            )}
            <button
              onClick={async () => { await signOut(); window.location.href = '/login'; }}
              className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-6">
          {/* Connection Panel */}
          <QBOConnect onSyncComplete={handleSyncComplete} />

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Transactions Table — main content */}
            <div className="lg:col-span-2">
              <TransactionsTable refreshKey={refreshKey} />
            </div>

            {/* Accounts Summary — sidebar */}
            <div className="lg:col-span-1">
              <AccountsSummary refreshKey={refreshKey} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
