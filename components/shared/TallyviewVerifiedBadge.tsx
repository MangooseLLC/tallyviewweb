'use client';

import { ShieldCheck, ShieldAlert, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FUJI_EXPLORER_URL, CONTRACTS } from '@/lib/chain/config';

export interface AttestationData {
  timestamp: number;
  merkleRoot: string;
  live: boolean;
}

interface TallyviewVerifiedBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
  attestation?: AttestationData | null;
}

export function TallyviewVerifiedBadge({ size = 'sm', className, attestation }: TallyviewVerifiedBadgeProps) {
  if (attestation === undefined || attestation === null) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}>
        <ShieldCheck className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-semibold">Tallyview Verified</span>
      </div>
    );
  }

  if (!attestation.live) {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}>
        <ShieldAlert className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        <span className="font-semibold">Chain unavailable</span>
      </div>
    );
  }

  const date = attestation.timestamp > 0
    ? new Date(attestation.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <a
      href={`${FUJI_EXPLORER_URL}/address/${CONTRACTS.auditLedger}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-green-50 text-green-800 border border-green-200 hover:bg-green-100 transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className
      )}
    >
      <ShieldCheck className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'text-green-600')} />
      <span className="font-semibold">Verified on-chain</span>
      {date && <span className="text-green-600">&middot; {date}</span>}
      <ExternalLink className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
    </a>
  );
}
