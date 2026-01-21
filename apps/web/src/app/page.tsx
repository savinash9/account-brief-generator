'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BriefResponse } from '@/lib/types';

const appName = 'Customer Account Brief Generator';

const defaultOutput = 'Submit an account name to generate a customer account brief.';

export default function HomePage() {
  // Customer Account Brief Generator UI state
  const [accountName, setAccountName] = useState('');
  const [includePublic, setIncludePublic] = useState(true);
  const [includeActivity, setIncludeActivity] = useState(true);
  const [activityDays, setActivityDays] = useState(90);
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState(defaultOutput);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const canSubmit = accountName.trim().length > 1 && !isLoading;

  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/sfdc/status');
        const payload = (await response.json()) as { connected: boolean };
        if (isMounted) {
          setIsConnected(Boolean(payload.connected));
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };
    void checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!output || output === defaultOutput) {
      return;
    }
    await navigator.clipboard.writeText(output);
    setStatus('Copied to clipboard.');
    setTimeout(() => setStatus(''), 1500);
  }, [output]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }

    setIsLoading(true);
    setStatus('Fetching Salesforce data…');
    setOutput('');

    const enrichTimer = window.setTimeout(() => {
      if (includePublic) {
        setStatus('Enriching with public company context…');
      }
    }, 800);

    try {
      const response = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: accountName.trim(),
          includePublic,
          includeActivity,
          activityDays
        })
      });

      const payload = (await response.json()) as BriefResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to generate brief.');
      }

      if (payload.status === 'needsDisambiguation') {
        setOutput(
          `Multiple accounts matched. Please refine your search:\n${payload.matches?.join('\n') ?? ''}`
        );
      } else if (payload.status === 'notFound') {
        setOutput('No matching Salesforce account was found.');
      } else {
        setOutput(payload.briefText ?? 'No brief available.');
      }

      setStatus(payload.publicError ? `Public enrichment failed: ${payload.publicError}` : '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error.';
      setStatus(message);
      setOutput('Unable to generate a brief at this time.');
    } finally {
      window.clearTimeout(enrichTimer);
      setIsLoading(false);
    }
  }, [accountName, activityDays, canSubmit, includeActivity, includePublic]);

  const activityLabel = useMemo(() => {
    if (!includeActivity) {
      return 'Activity disabled.';
    }
    return `Including last ${activityDays} days of activity.`;
  }, [activityDays, includeActivity]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">{appName}</h1>
        <p className="text-slate-300">
          Generate a structured brief using Salesforce insights and optional public company context.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            Account Name
            <input
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              placeholder="Acme Corp"
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-4 text-sm text-slate-200">
            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <span>Include public company context (ChatGPT)</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includePublic}
                onChange={(event) => setIncludePublic(event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <span>Include last N days activity</span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeActivity}
                onChange={(event) => setIncludeActivity(event.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <span>Activity days (N)</span>
              <input
                type="number"
                min={1}
                max={365}
                className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-right"
                value={activityDays}
                onChange={(event) => setActivityDays(Number(event.target.value))}
                disabled={!includeActivity}
              />
            </label>
            <span className="text-xs text-slate-400">{activityLabel}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isLoading ? 'Generating…' : 'Generate Brief'}
          </button>
          {!isCheckingAuth && !isConnected && (
            <a
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500"
              href="/api/sfdc/login"
            >
              Connect Salesforce
            </a>
          )}
          {!isCheckingAuth && isConnected && (
            <a
              className="rounded-lg border border-emerald-500/60 px-4 py-2 text-sm font-semibold text-emerald-200 hover:border-emerald-400"
              href="/api/sfdc/logout"
            >
              Salesforce connected
            </a>
          )}
          {status && <span className="text-sm text-slate-300">{status}</span>}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Customer Account Brief</h2>
          <button
            className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:border-slate-500"
            onClick={handleCopy}
          >
            Copy
          </button>
        </div>
        <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
          {output || defaultOutput}
        </pre>
      </section>
    </div>
  );
}
