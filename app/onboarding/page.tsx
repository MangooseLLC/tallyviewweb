'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import {
  Building2,
  Link2,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Database,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionStatus {
  connected: boolean;
  hasEnvTokens?: boolean;
  orgName?: string;
  realmId?: string;
  lastSyncedAt?: string | null;
  transactionCount?: number;
  accountCount?: number;
}

interface SyncResult {
  success: boolean;
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

type Step = 'org-name' | 'connect-qbo' | 'sync' | 'verify' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const { appUser, isLoading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>('org-name');
  const [orgName, setOrgName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [qboStatus, setQboStatus] = useState<ConnectionStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string>('');
  const verifyAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!authLoading && !appUser) {
      router.push('/login');
    }
  }, [authLoading, appUser, router]);

  useEffect(() => {
    return () => verifyAbortRef.current?.abort();
  }, []);

  const handleVerify = useCallback(async () => {
    verifyAbortRef.current?.abort();
    const controller = new AbortController();
    verifyAbortRef.current = controller;

    setVerifying(true);
    setError('');
    setVerifyStatus('Classifying transactions...');
    try {
      const classifyRes = await fetch('/api/qbo/classify', {
        method: 'POST',
        signal: controller.signal,
      });
      if (!classifyRes.ok) {
        const d = await classifyRes.json().catch(() => ({}));
        setError(d.error || 'Classification failed');
        setVerifying(false);
        return;
      }

      setVerifyStatus('Running on-chain pipeline...');
      const pipelineRes = await fetch('/api/chain/pipeline', {
        method: 'POST',
        signal: controller.signal,
      });
      if (!pipelineRes.body) throw new Error('No pipeline stream');

      const reader = pipelineRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() || '';
        for (const p of parts) {
          const m = p.match(/^data: (.+)$/m);
          if (!m) continue;
          try {
            const ev = JSON.parse(m[1]);
            if (ev.step === 'complete') {
              setVerifyStatus(`Pipeline complete: ${ev.summary?.anomalies ?? 0} anomalies, ${ev.summary?.vendors ?? 0} vendors mapped`);
            } else if (ev.step === 'error') {
              setError(ev.message);
            } else if (ev.status === 'started') {
              const labels: Record<string, string> = {
                building: 'Building financial package...',
                registering: 'Registering on-chain identity...',
                attesting: 'Submitting audit attestation...',
                detecting: 'Running anomaly detection...',
                mapping_entities: 'Mapping vendor entities...',
                compliance: 'Reporting compliance metrics...',
              };
              setVerifyStatus(labels[ev.step] || 'Processing...');
            }
          } catch { /* skip malformed SSE */ }
        }
      }
      setStep('done');
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (appUser?.memberships?.[0]?.org?.name) {
      setOrgName(appUser.memberships[0].org.name);
    }
  }, [appUser]);

  const fetchQboStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/qbo/status');
      const data = await res.json();
      setQboStatus(data);
      if (data.connected) {
        if (data.transactionCount && data.transactionCount > 0) {
          setStep('done');
        } else {
          setStep('sync');
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (step === 'connect-qbo' || step === 'sync') {
      fetchQboStatus();
    }
  }, [step, fetchQboStatus]);

  // QBO OAuth return: show errors (previously ignored) and advance on success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err) {
      const messages: Record<string, string> = {
        oauth_denied:
          'QuickBooks sign-in was cancelled. Use Connect QuickBooks to try again.',
        state_mismatch:
          'QuickBooks connection failed the security check (often www vs non-www or blocked cookies). Pick one URL—https://www.tallyview.com or https://tallyview.com—and use it for the whole flow; ensure your Intuit Redirect URI matches exactly.',
        missing_params:
          'QuickBooks did not return a complete response. Please try connecting again.',
        callback_failed:
          'Could not finish QuickBooks sign-in. Verify Intuit Redirect URI and Vercel QBO_* variables match your live site URL.',
        auth_required:
          'Your Tallyview session ended during QuickBooks sign-in. Sign in again, then connect QuickBooks.',
        no_organization:
          'No Tallyview organization was found for your account. Complete the organization step, then connect QuickBooks.',
      };
      setError(
        messages[err] ??
          `QuickBooks connection issue (${err}). Try again or contact support.`,
      );
      window.history.replaceState({}, '', '/onboarding');
    }
    if (params.get('connected') === 'true') {
      setStep('sync');
      window.history.replaceState({}, '', '/onboarding');
    }
  }, []);

  // After auth loads, sync step with server (e.g. QBO connected but URL had no ?connected=)
  useEffect(() => {
    if (authLoading || !appUser) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/qbo/status');
        const data = await res.json();
        if (cancelled) return;
        setQboStatus(data);
        if (data.connected) {
          if (data.transactionCount && data.transactionCount > 0) {
            setStep('done');
          } else {
            setStep('sync');
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, appUser]);

  const handleSaveOrgName = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/auth/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setStep('connect-qbo');
      }
    } catch {
      setError('Failed to save organization name');
    } finally {
      setSaving(false);
    }
  };

  const handleConnectQbo = async () => {
    try {
      const res = await fetch('/api/qbo/connect');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Failed to initiate QuickBooks connection');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setError('');
    try {
      const res = await fetch('/api/qbo/sync', { method: 'POST' });

      if (!res.ok) {
        const data = await res.json();
        setError(data.details || data.error || 'Sync failed');
        setSyncing(false);
        return;
      }

      const contentType = res.headers.get('content-type') || '';

      // Handle SSE stream from sync endpoint
      if (contentType.includes('text/event-stream')) {
        const reader = res.body?.getReader();
        if (!reader) { setError('Failed to read sync stream'); setSyncing(false); return; }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: SyncResult | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === 'complete') {
                finalResult = { success: true, synced: event.synced };
              } else if (event.type === 'error') {
                setError(event.message);
              }
            } catch { /* skip malformed */ }
          }
        }

        if (finalResult) {
          setSyncResult(finalResult);
          await fetchQboStatus();
          setStep('verify');
        }
      } else {
        // Fallback: plain JSON response
        const data: SyncResult = await res.json();
        if (data.error) {
          setError(data.details || data.error);
        } else {
          setSyncResult(data);
          await fetchQboStatus();
          setStep('verify');
        }
      }
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || !appUser) {
    return (
      <div className="min-h-screen bg-brand-navy flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  const steps = [
    { key: 'org-name', label: 'Organization', num: 1 },
    { key: 'connect-qbo', label: 'Connect QBO', num: 2 },
    { key: 'sync', label: 'Sync Data', num: 3 },
    { key: 'verify', label: 'Verify', num: 4 },
    { key: 'done', label: 'Ready', num: 5 },
  ];
  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <Image
        src="/tallyview-logo.svg"
        alt="Tallyview"
        width={200}
        height={56}
        className="h-10 w-auto brightness-0 invert mb-10"
        priority
      />

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={cn(
              'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
              i < currentStepIdx ? 'bg-green-500 text-white' :
              i === currentStepIdx ? 'bg-brand-gold text-brand-navy' :
              'bg-white/10 text-gray-500'
            )}>
              {i < currentStepIdx ? <CheckCircle2 className="h-4 w-4" /> : s.num}
            </div>
            <span className={cn(
              'text-xs font-medium hidden sm:block',
              i <= currentStepIdx ? 'text-white' : 'text-gray-500'
            )}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={cn(
                'w-8 h-px',
                i < currentStepIdx ? 'bg-green-500' : 'bg-white/10'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="w-full max-w-lg">
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8">

          {/* Step 1: Organization Name */}
          {step === 'org-name' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-brand-gold/20 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-brand-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Name your organization</h2>
                  <p className="text-sm text-gray-400">This is how your organization will appear in Tallyview.</p>
                </div>
              </div>
              <input
                type="text"
                value={orgName}
                onChange={(e) => { setOrgName(e.target.value); setError(''); }}
                placeholder="e.g. Bright Futures Youth Services"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/40 transition-all mb-4"
              />
              {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
              <button
                onClick={handleSaveOrgName}
                disabled={!orgName.trim() || saving}
                className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Continue
              </button>
            </>
          )}

          {/* Step 2: Connect QBO */}
          {step === 'connect-qbo' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Link2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Connect QuickBooks Online</h2>
                  <p className="text-sm text-gray-400">Link your accounting system to import financial data.</p>
                </div>
              </div>
              {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
              <button
                onClick={handleConnectQbo}
                className="w-full py-3 rounded-xl bg-[#2CA01C] text-white font-semibold text-sm transition-all hover:bg-[#248F16] flex items-center justify-center gap-2"
              >
                <Link2 className="h-4 w-4" />
                Connect QuickBooks
              </button>
              <button
                onClick={() => setStep('sync')}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}

          {/* Step 3: Sync */}
          {step === 'sync' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Sync your data</h2>
                  <p className="text-sm text-gray-400">
                    {qboStatus?.connected
                      ? `Connected to ${qboStatus.orgName || 'QuickBooks'}. Pull your financial records.`
                      : 'Import your accounts and transactions from QuickBooks.'}
                  </p>
                </div>
              </div>
              {syncResult?.success && syncResult.synced && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 mb-4">
                  <p className="text-sm font-medium text-green-400">Sync completed</p>
                  <p className="text-xs text-green-300/70 mt-1">
                    {syncResult.synced.accounts} accounts, {syncResult.synced.invoices} invoices, {syncResult.synced.bills} bills, {syncResult.synced.purchases} purchases, {syncResult.synced.journalEntries} journal entries
                  </p>
                </div>
              )}
              {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {syncing ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Syncing...</>
                ) : (
                  <><Database className="h-4 w-4" /> Sync Now</>
                )}
              </button>
              <button
                onClick={() => setStep('done')}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}

          {/* Step 4: Verify On-Chain */}
          {step === 'verify' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Verify on-chain</h2>
                  <p className="text-sm text-gray-400">
                    Classify transactions with AI and record results on the Accountability Chain.
                  </p>
                </div>
              </div>
              {verifyStatus && (
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 mb-4">
                  <p className="text-xs text-purple-300">{verifyStatus}</p>
                </div>
              )}
              {error && <p className="text-sm text-red-400 mb-4">{error}</p>}
              <button
                onClick={handleVerify}
                disabled={verifying}
                className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                ) : (
                  <><Shield className="h-4 w-4" /> Classify &amp; Verify</>
                )}
              </button>
              <button
                onClick={() => setStep('done')}
                className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Skip for now
              </button>
            </>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <>
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-400" />
                </div>
                <h2 className="text-xl font-semibold text-white">You&apos;re all set!</h2>
                <p className="text-sm text-gray-400 mt-2">
                  {qboStatus?.connected
                    ? `${orgName} is connected and ready to go.`
                    : `${orgName} has been created. You can connect QuickBooks later.`}
                </p>
                {qboStatus?.transactionCount != null && qboStatus.transactionCount > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {qboStatus.transactionCount} transactions · {qboStatus.accountCount ?? 0} accounts synced
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 rounded-xl bg-brand-gold text-brand-navy font-semibold text-sm transition-all hover:bg-brand-gold-light flex items-center justify-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
