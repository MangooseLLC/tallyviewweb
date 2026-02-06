'use client';

import { cn } from '@/lib/utils';
import { Anomaly } from '@/lib/types';
import { getSeverityColor, formatRelativeTime } from '@/lib/utils/formatters';
import { AlertTriangle, CheckCircle, Eye, ArrowUpRight } from 'lucide-react';

interface AnomalyAlertCardProps {
  anomaly: Anomaly;
  compact?: boolean;
  onClick?: () => void;
}

export function AnomalyAlertCard({ anomaly, compact = false, onClick }: AnomalyAlertCardProps) {
  const severityEmoji = {
    High: '🔴',
    Medium: '🟡',
    Low: '🟢',
    Info: '🔵',
  };

  const statusIcon = {
    New: <AlertTriangle className="h-3.5 w-3.5" />,
    Reviewed: <Eye className="h-3.5 w-3.5" />,
    Resolved: <CheckCircle className="h-3.5 w-3.5" />,
    Escalated: <ArrowUpRight className="h-3.5 w-3.5" />,
  };

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-gray-50',
          onClick && 'cursor-pointer'
        )}
        onClick={onClick}
      >
        <span className="mt-0.5 text-sm">{severityEmoji[anomaly.severity]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 line-clamp-2">{anomaly.description}</p>
          <p className="mt-1 text-xs text-gray-400">{formatRelativeTime(anomaly.detectedDate)}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all hover:shadow-sm',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="mt-0.5 text-sm">{severityEmoji[anomaly.severity]}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                getSeverityColor(anomaly.severity)
              )}>
                {anomaly.severity}
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                {anomaly.category}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-gray-700">{anomaly.description}</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-xs text-gray-400">{formatRelativeTime(anomaly.detectedDate)}</span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {statusIcon[anomaly.status]} {anomaly.status}
              </span>
              <span className="text-xs text-gray-300">|</span>
              <span className="text-xs text-blue-500">AI Confidence: {anomaly.aiConfidence}%</span>
            </div>
          </div>
        </div>
      </div>
      {anomaly.recommendedAction && (
        <div className="mt-3 rounded-md bg-gray-50 p-2.5">
          <p className="text-xs text-gray-500">
            <span className="font-medium">Recommended: </span>
            {anomaly.recommendedAction}
          </p>
        </div>
      )}
    </div>
  );
}
