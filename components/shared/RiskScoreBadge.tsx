'use client';

import { cn } from '@/lib/utils';

interface RiskScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskScoreBadge({ score, size = 'md', showLabel = false }: RiskScoreBadgeProps) {
  const getColor = () => {
    if (score >= 75) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-500', label: 'Low Risk' };
    if (score >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-500', label: 'Moderate' };
    if (score >= 45) return { bg: 'bg-orange-100', text: 'text-orange-700', ring: 'ring-orange-500', label: 'Elevated' };
    return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-500', label: 'High Risk' };
  };

  const colors = getColor();
  const sizeClasses = {
    sm: 'h-7 w-7 text-[10px]',
    md: 'h-9 w-9 text-xs',
    lg: 'h-12 w-12 text-sm',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        'inline-flex items-center justify-center rounded-full font-bold ring-2',
        colors.bg, colors.text, colors.ring,
        sizeClasses[size]
      )}>
        {score}
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium', colors.text)}>{colors.label}</span>
      )}
    </div>
  );
}
