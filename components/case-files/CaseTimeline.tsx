'use client';

import type { CaseFileOutcomeEvent } from '@/lib/data/case-files';
import { cn } from '@/lib/utils';

interface CaseTimelineProps {
  events: CaseFileOutcomeEvent[];
}

export function CaseTimeline({ events }: CaseTimelineProps) {
  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-1 bottom-1 w-px bg-white/10" />
      {events.map((event, idx) => (
        <div key={idx} className="relative mb-4 last:mb-0">
          <div className={cn(
            'absolute -left-3.5 top-1.5 h-2.5 w-2.5 rounded-full border-2',
            idx === events.length - 1
              ? 'border-brand-gold bg-brand-gold'
              : 'border-gray-500 bg-brand-navy',
          )} />
          <div className="pl-4">
            <p className="text-xs font-semibold text-brand-gold">{event.date}</p>
            <p className="mt-0.5 text-sm text-gray-300">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
