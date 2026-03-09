'use client';

import { Wifi, CircleDot, Shield, Database, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { FUJI_EXPLORER_URL, CONTRACTS } from '@/lib/chain/config';

interface OnchainPipelineStatusProps {
  connectedSystem: string;
  monthsProcessed: number;
  monthRange: string;
  latestAttestation?: {
    timestamp: number;
    merkleRoot: string;
    live: boolean;
  } | null;
  anomalySummary?: {
    total: number;
    open: number;
    live: boolean;
  } | null;
  completion990: number;
  totalMonths: number;
}

export function OnchainPipelineStatus({
  connectedSystem,
  monthsProcessed,
  monthRange,
  latestAttestation,
  anomalySummary,
  completion990,
  totalMonths,
}: OnchainPipelineStatusProps) {
  const chainLive = latestAttestation?.live ?? false;
  const attestationDate = latestAttestation?.timestamp
    ? new Date(latestAttestation.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Onchain Pipeline Status</h3>

      {/* Connected system */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
          <Wifi className="h-5 w-5 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">Connected: {connectedSystem}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <CircleDot className="h-3 w-3 text-green-500" />
            <span className="text-[11px] text-green-600 font-medium">Active</span>
          </div>
        </div>
      </div>

      {/* Status rows */}
      <div className="space-y-2.5 pt-3 border-t">
        <div className="flex justify-between text-[11px]">
          <span className="text-gray-500 flex items-center gap-1.5">
            <Database className="h-3 w-3" /> Months processed
          </span>
          <span className="text-gray-700 font-medium">{monthsProcessed} months: {monthRange}</span>
        </div>

        {latestAttestation && (
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Shield className="h-3 w-3" /> Last attestation
            </span>
            <span className="text-gray-700 font-medium flex items-center gap-1.5">
              {attestationDate ?? 'N/A'}
              {latestAttestation.merkleRoot !== '0x' && (
                <span className="font-mono text-gray-400">{latestAttestation.merkleRoot.slice(0, 10)}...</span>
              )}
              {chainLive && (
                <a
                  href={`${FUJI_EXPLORER_URL}/address/${CONTRACTS.auditLedger}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3 text-amber-500 hover:text-amber-600" />
                </a>
              )}
            </span>
          </div>
        )}

        {anomalySummary && (
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-500 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> Anomaly scan
            </span>
            <span className="text-gray-700 font-medium">
              {anomalySummary.total} findings ({anomalySummary.open} open)
            </span>
          </div>
        )}

        <div className="flex justify-between text-[11px]">
          <span className="text-gray-500 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> 990 progress
          </span>
          <span className="text-gray-700 font-medium">
            {completion990}% complete ({monthsProcessed} of {totalMonths} months)
          </span>
        </div>

        {/* Chain status indicator */}
        <div className="mt-3 pt-2.5 border-t flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${chainLive ? 'bg-green-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className={`text-[11px] font-medium ${chainLive ? 'text-green-600' : 'text-amber-600'}`}>
            {chainLive ? 'Live from Avalanche Fuji' : 'Chain data unavailable'}
          </span>
        </div>
      </div>
    </div>
  );
}
