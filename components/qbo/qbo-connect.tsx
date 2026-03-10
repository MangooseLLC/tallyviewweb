'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  Link2,
  AlertCircle,
  Database,
  Brain,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatus {
  connected: boolean;
  hasEnvTokens?: boolean;
  orgId?: string;
  orgName?: string;
  realmId?: string;
  lastSyncedAt?: string | null;
  transactionCount?: number;
  accountCount?: number;
}

interface SyncResult {
  success: boolean;
  orgName?: string;
  synced?: {
    accounts: number;
    invoices: number;
    bills: number;
    purchases: number;
    journalEntries: number;
  };
  error?: string;
  details?: string;
}

interface ClassifyResult {
  success: boolean;
  accountsMapped?: number;
  transactionsMapped?: number;
  rulesClassified?: number;
  aiClassified?: number;
  lowConfidenceCount?: number;
  failedBatches?: number;
  skippedAlreadyClassified?: number;
  error?: string;
  details?: string;
}

export function QBOConnect({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/qbo/status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setError('Failed to check connection status');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/qbo/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Failed to initiate connection');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch('/api/qbo/sync', { method: 'POST' });
      const data: SyncResult = await res.json();
      if (data.error) {
        setError(data.details || data.error);
      } else {
        setSyncResult(data);
        await fetchStatus();
        onSyncComplete?.();
      }
    } catch {
      setError('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const handleClassify = async (force = false) => {
    setClassifying(true);
    setClassifyResult(null);
    setError(null);
    try {
      const res = await fetch('/api/qbo/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data: ClassifyResult = await res.json();
      if (data.error) {
        setError(data.details || data.error);
      } else {
        setClassifyResult(data);
      }
    } catch {
      setError('Classification failed. Check console for details.');
    } finally {
      setClassifying(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            QuickBooks Connection
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {status?.connected
              ? 'Connected to QuickBooks Online sandbox'
              : 'Connect your QuickBooks Online account to sync financial data'}
          </p>
        </div>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
            status?.connected
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-500'
          )}
        >
          {status?.connected ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" />
              Not Connected
            </>
          )}
        </div>
      </div>

      {status?.connected && (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Company</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {status.orgName}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Realm ID</p>
            <p className="mt-0.5 text-sm font-mono text-gray-900">
              {status.realmId}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Last Synced</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {formatDate(status.lastSyncedAt)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-gray-500">Records</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              <Database className="mr-1 inline h-3.5 w-3.5" />
              {status.transactionCount ?? 0} txns · {status.accountCount ?? 0}{' '}
              accts
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {status?.connected || status?.hasEnvTokens ? (
          <>
            <button
              onClick={handleSync}
              disabled={syncing || classifying}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                'bg-[hsl(210,100%,12%)] text-white hover:bg-[hsl(210,100%,18%)]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <RefreshCw
                className={cn('h-4 w-4', syncing && 'animate-spin')}
              />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {status?.connected && (status.transactionCount ?? 0) > 0 && (
              <>
                <button
                  onClick={() => handleClassify(false)}
                  disabled={classifying || syncing}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    'bg-indigo-600 text-white hover:bg-indigo-700',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Brain
                    className={cn('h-4 w-4', classifying && 'animate-pulse')}
                  />
                  {classifying ? 'Classifying...' : 'Classify for 990'}
                </button>
                <button
                  onClick={() => handleClassify(true)}
                  disabled={classifying || syncing}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    'border border-indigo-300 text-indigo-700 hover:bg-indigo-50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  Reclassify All
                </button>
                {classifyResult?.success && (
                  <a
                    href="/990"
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    View 990
                  </a>
                )}
              </>
            )}
          </>
        ) : (
          <button
            onClick={handleConnect}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-[#2CA01C] text-white hover:bg-[#248F16]'
            )}
          >
            <Link2 className="h-4 w-4" />
            Connect QuickBooks
          </button>
        )}
      </div>

      {syncResult?.success && syncResult.synced && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm font-medium text-green-800">
            Sync completed successfully
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-green-700">
            <span>{syncResult.synced.accounts} accounts</span>
            <span>{syncResult.synced.invoices} invoices</span>
            <span>{syncResult.synced.bills} bills</span>
            <span>{syncResult.synced.purchases} purchases</span>
            <span>{syncResult.synced.journalEntries} journal entries</span>
          </div>
        </div>
      )}

      {classifyResult?.success && (
        <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-sm font-medium text-indigo-800">
            990 classification complete
          </p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-indigo-700">
            <span>{classifyResult.accountsMapped} accounts mapped</span>
            <span>{classifyResult.transactionsMapped} transactions mapped</span>
            <span>{classifyResult.rulesClassified} by rules</span>
            <span>{classifyResult.aiClassified} by AI</span>
            {(classifyResult.skippedAlreadyClassified ?? 0) > 0 && (
              <span>{classifyResult.skippedAlreadyClassified} already classified</span>
            )}
          </div>
          {(classifyResult.lowConfidenceCount ?? 0) > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {classifyResult.lowConfidenceCount} transactions need review (low confidence)
            </div>
          )}
          {(classifyResult.failedBatches ?? 0) > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5" />
              {classifyResult.failedBatches} batch(es) failed — some transactions may be unclassified
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-0.5 text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
