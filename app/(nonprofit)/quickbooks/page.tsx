'use client';

import { useState } from 'react';
import { QBOConnect } from '@/components/qbo/qbo-connect';
import { TransactionsTable } from '@/components/qbo/transactions-table';
import { AccountsSummary } from '@/components/qbo/accounts-summary';

export default function QuickBooksPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSyncComplete = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">QuickBooks Integration</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your QBO connection, sync data, and classify transactions</p>
      </div>

      <QBOConnect onSyncComplete={handleSyncComplete} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TransactionsTable refreshKey={refreshKey} />
        </div>
        <div className="lg:col-span-1">
          <AccountsSummary refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
}
