'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Database,
  Shield,
  Network,
  FileCheck,
  Link2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStep {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface PipelineSummary {
  merkleRoot?: string;
  attestTxHash?: string | null;
  anomalies?: number;
  vendors?: number;
  explorerUrl?: string | null;
}

function createInitialSteps(): PipelineStep[] {
  return [
    { key: 'building', label: 'Build financial package', icon: <Database className="h-4 w-4" />, status: 'pending' },
    { key: 'registering', label: 'Register on-chain identity', icon: <Link2 className="h-4 w-4" />, status: 'pending' },
    { key: 'attesting', label: 'Submit audit attestation', icon: <FileCheck className="h-4 w-4" />, status: 'pending' },
    { key: 'detecting', label: 'Run anomaly detection', icon: <AlertTriangle className="h-4 w-4" />, status: 'pending' },
    { key: 'mapping_entities', label: 'Map vendor entities', icon: <Network className="h-4 w-4" />, status: 'pending' },
    { key: 'compliance', label: 'Report compliance metrics', icon: <Shield className="h-4 w-4" />, status: 'pending' },
  ];
}

export function PipelineProgress() {
  const [steps, setSteps] = useState<PipelineStep[]>(createInitialSteps);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<PipelineSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const updateStep = useCallback((key: string, status: PipelineStep['status'], detail?: string) => {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, status, detail } : s));
  }, []);

  const runPipeline = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRunning(true);
    setError(null);
    setSummary(null);
    setSteps(createInitialSteps());

    try {
      const res = await fetch('/api/chain/pipeline', {
        method: 'POST',
        signal: controller.signal,
      });
      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/m);
          if (!match) continue;

          try {
            const event = JSON.parse(match[1]);
            const { step, status, message, summary: eventSummary, ...rest } = event;

            if (step === 'error') {
              setError(message || 'Pipeline failed');
              break;
            }

            if (step === 'complete') {
              setSummary(eventSummary || null);
              continue;
            }

            if (status === 'started') {
              updateStep(step, 'running');
            } else if (status === 'done') {
              const detail = buildDetail(step, rest);
              updateStep(step, 'done', detail);
            }
          } catch (e) {
            console.warn('SSE parse error:', e);
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Pipeline failed');
    } finally {
      setRunning(false);
    }
  }, [updateStep]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">On-Chain Verification Pipeline</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Attest financials, detect anomalies, map entities, and report compliance on-chain
          </p>
        </div>
        <button
          onClick={runPipeline}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-navy-light disabled:opacity-50"
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
          {running ? 'Running...' : 'Verify On-Chain'}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map(step => (
          <div key={step.key} className="flex items-center gap-3">
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
              step.status === 'done' && 'bg-emerald-50 text-emerald-600',
              step.status === 'running' && 'bg-blue-50 text-blue-600',
              step.status === 'error' && 'bg-red-50 text-red-600',
              step.status === 'pending' && 'bg-slate-50 text-slate-400',
            )}>
              {step.status === 'done' ? <CheckCircle2 className="h-4 w-4" /> :
               step.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> :
               step.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm',
                step.status === 'done' && 'text-slate-900',
                step.status === 'running' && 'font-medium text-blue-700',
                step.status === 'pending' && 'text-slate-400',
              )}>
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-slate-500">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium text-emerald-800">Pipeline complete</p>
          <p className="mt-1 text-xs text-emerald-700">
            {summary.anomalies} anomalies recorded, {summary.vendors} vendor entities mapped
          </p>
          {summary.explorerUrl && (
            <a
              href={summary.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            >
              View attestation on Snowtrace
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function buildDetail(step: string, data: Record<string, unknown>): string | undefined {
  switch (step) {
    case 'attesting':
      return data.alreadyAttested ? 'Already attested this period' : 'Merkle root submitted';
    case 'detecting':
      return `${data.findingsCount ?? 0} findings recorded`;
    case 'mapping_entities':
      return `${data.vendorCount ?? 0} vendors mapped`;
    case 'compliance':
      return 'Overhead ratio reported';
    default:
      return undefined;
  }
}
