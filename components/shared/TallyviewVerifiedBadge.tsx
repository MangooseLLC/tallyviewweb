'use client';

import { ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TallyviewVerifiedBadgeProps {
  size?: 'sm' | 'md';
  className?: string;
}

export function TallyviewVerifiedBadge({ size = 'sm', className }: TallyviewVerifiedBadgeProps) {
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
