'use client';

import { useState, useEffect, useCallback } from 'react';
import { demoPipelineStages, type DemoPipelineStage } from '@/lib/data/demo-pipeline';
import { CheckCircle2, Loader2, Play, RotateCcw, Link2, Brain, FileCheck, AlertTriangle, Network, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const stageIcons: Record<string, React.ReactNode> = {
  connect: <Link2 className="h-4 w-4" />,
  classify: <Brain className="h-4 w-4" />,
  attest: <FileCheck className="h-4 w-4" />,
  detect: <AlertTriangle className="h-4 w-4" />,
  entities: <Network className="h-4 w-4" />,
  compliance: <Shield className="h-4 w-4" />,
};

export function PipelineReplay() {
  const [activeStage, setActiveStage] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());

  const play = useCallback(() => {
    setIsPlaying(true);
    setActiveStage(0);
    setCompletedStages(new Set());
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setActiveStage(-1);
    setCompletedStages(new Set());
  }, []);

  useEffect(() => {
    if (!isPlaying || activeStage < 0 || activeStage >= demoPipelineStages.length) return;

    const stage = demoPipelineStages[activeStage];
    const timer = setTimeout(() => {
      setCompletedStages(prev => new Set([...prev, activeStage]));
      if (activeStage < demoPipelineStages.length - 1) {
        setActiveStage(prev => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, stage.durationMs);

    return () => clearTimeout(timer);
  }, [isPlaying, activeStage]);

  const allDone = completedStages.size === demoPipelineStages.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">How Tallyview Works</h3>
          <p className="text-xs text-slate-500 mt-0.5">Watch data flow from QuickBooks to the Accountability Chain</p>
        </div>
        {!isPlaying && !allDone && (
          <button
            onClick={play}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy-light transition"
          >
            <Play className="h-3 w-3" />
            Play
          </button>
        )}
        {allDone && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw className="h-3 w-3" />
            Replay
          </button>
        )}
      </div>

      <div className="px-5 py-4 space-y-3">
        {demoPipelineStages.map((stage, idx) => {
          const isActive = activeStage === idx && isPlaying;
          const isDone = completedStages.has(idx);
          const isPending = !isActive && !isDone;

          return (
            <div key={stage.key} className={cn(
              'flex items-start gap-3 rounded-lg p-3 transition-all duration-300',
              isActive && 'bg-blue-50 ring-1 ring-blue-200',
              isDone && 'bg-emerald-50/50',
              isPending && 'opacity-50',
            )}>
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full mt-0.5',
                isDone && 'bg-emerald-100 text-emerald-600',
                isActive && 'bg-blue-100 text-blue-600',
                isPending && 'bg-slate-100 text-slate-400',
              )}>
                {isDone ? <CheckCircle2 className="h-4 w-4" /> :
                 isActive ? <Loader2 className="h-4 w-4 animate-spin" /> :
                 stageIcons[stage.key]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  isDone && 'text-emerald-800',
                  isActive && 'text-blue-800',
                  isPending && 'text-slate-500',
                )}>
                  {stage.label}
                </p>
                {(isActive || isDone) && (
                  <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                )}
                {isDone && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Object.entries(stage.data).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600 ring-1 ring-slate-200">
                        {key}: {typeof val === 'object' ? JSON.stringify(val).slice(0, 30) : String(val)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
