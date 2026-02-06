'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  className,
  onClick,
  variant = 'default',
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-white border-gray-200',
    danger: 'bg-white border-red-200',
    warning: 'bg-white border-amber-200',
    success: 'bg-white border-green-200',
  };

  const valueStyles = {
    default: 'text-gray-900',
    danger: 'text-red-600',
    warning: 'text-amber-600',
    success: 'text-green-600',
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-5 shadow-sm transition-shadow hover:shadow-md',
        variantStyles[variant],
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className={cn('text-2xl font-bold', valueStyles[variant])}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        {icon && (
          <div className={cn(
            'rounded-lg p-2',
            variant === 'danger' ? 'bg-red-50 text-red-600' :
            variant === 'warning' ? 'bg-amber-50 text-amber-600' :
            variant === 'success' ? 'bg-green-50 text-green-600' :
            'bg-gray-50 text-gray-600'
          )}>
            {icon}
          </div>
        )}
      </div>
      {trend && trendValue && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
          {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
          {trend === 'neutral' && <Minus className="h-3.5 w-3.5 text-gray-400" />}
          <span className={cn(
            'text-xs font-medium',
            trend === 'up' ? 'text-green-600' :
            trend === 'down' ? 'text-red-600' : 'text-gray-500'
          )}>
            {trendValue}
          </span>
        </div>
      )}
    </div>
  );
}
