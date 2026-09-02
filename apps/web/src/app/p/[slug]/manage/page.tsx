'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { PsephoClient } from '@psepho/api-client';

export default function ManagePollPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = use(props.params);
  const searchParams = use(props.searchParams);

  const [creatorToken, setCreatorToken] = useState<string>(searchParams.token || '');
  const [tokenInput, setTokenInput] = useState<string>('');
  const [manageData, setManageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const client = new PsephoClient();

  useEffect(() => {
    // If token wasn't in query params, check localStorage
    if (!creatorToken) {
      try {
        const stored = JSON.parse(localStorage.getItem('psepho_creator_tokens') || '{}');
        if (stored[slug]) {
          setCreatorToken(stored[slug]);
        }
      } catch {
        // ignore
      }
    }
  }, [slug, creatorToken]);

  useEffect(() => {
    if (creatorToken) {
      loadManageData(creatorToken);
    }
  }, [slug, creatorToken]);

  async function loadManageData(token: string) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/polls/${slug}/manage?token=${encodeURIComponent(token)}`);
      if (!res.ok) {
        throw new Error(res.status === 403 ? 'Invalid creator token' : 'Failed to load poll management');
      }
      const data = await res.json();
      setManageData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  const handleClosePoll = async () => {
    if (!confirm('Are you sure you want to close this poll now? No further votes will be counted.')) {
      return;
    }
    setError(null);
    try {
      await client.closePoll(slug, creatorToken);
      setSuccessMsg('Poll closed successfully.');
      loadManageData(creatorToken);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeletePoll = async () => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) {
      return;
    }
    setError(null);
    try {
      await client.deletePoll(slug, creatorToken);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await client.exportCsv(slug, creatorToken);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `psepho-${slug}-ballots.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <>
      <Header />
      <main className="w-full max-w-ballot mx-auto px-4 pb-20 pt-6 font-body">
        {!creatorToken ? (
          <div className="space-y-4">
            <h1 className="font-display text-2xl text-ink">Manage Poll</h1>
            <p className="text-sm text-slate">
              Enter your secret creator token to access management controls.
            </p>
            {error && <div className="text-xs text-alarm">{error}</div>}
            <div className="flex gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Creator secret token"
                className="w-full bg-surface border border-rule px-3 py-2 text-xs font-mono rounded-row"
              />
              <button
                type="button"
                onClick={() => {
                  setCreatorToken(tokenInput);
                  loadManageData(tokenInput);
                }}
                className="px-4 py-2 bg-ink text-surface rounded-interactive text-xs font-semibold"
              >
                Authenticate
              </button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-sm text-slate py-8">Loading poll management...</div>
        ) : error ? (
          <div className="space-y-4">
            <div className="text-sm text-alarm p-3 border border-alarm/30 rounded-row bg-surface">
              {error}
            </div>
            <button
              type="button"
              onClick={() => setCreatorToken('')}
              className="text-xs text-patina underline font-medium"
            >
              Try a different creator token
            </button>
          </div>
        ) : manageData ? (
          <div className="space-y-6">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate font-medium block mb-1">
                Creator Management
              </span>
              <h1 className="font-display text-2xl text-ink">
                {manageData.poll.question}
              </h1>
            </div>

            {successMsg && (
              <div className="p-3 border border-patina/40 bg-surface text-xs text-patina rounded-row font-medium">
                {successMsg}
              </div>
            )}

            {/* Integrity Signal: Network Fingerprint collisions (§2.4) */}
            <div className="p-4 bg-surface border border-rule rounded-row space-y-1">
              <span className="text-xs text-slate font-medium block">Integrity Signals</span>
              <p className="text-sm text-ink">
                {manageData.duplicateSignalCount === 0
                  ? 'No duplicate network fingerprints detected.'
                  : `${manageData.duplicateSignalCount} ballots share a network fingerprint`}
              </p>
              <p className="text-xs text-slate">
                This is an honest signal derived from hashed network signatures, not an accusation.
              </p>
            </div>

            {/* Poll Status */}
            <div className="p-4 bg-surface border border-rule rounded-row space-y-2 text-xs text-slate">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-ink">
                  {manageData.poll.closedAt ? 'Closed' : 'Open'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total ballots recorded:</span>
                <span className="tabular-nums font-semibold text-ink">
                  {manageData.totalBallots}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Integrity mode:</span>
                <span className="text-ink">{manageData.poll.integrity}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="w-full py-2.5 px-4 bg-surface border border-rule text-ink rounded-interactive font-ui-semibold text-xs hover:border-slate text-left flex items-center justify-between"
              >
                <span>Export ballots (CSV)</span>
                <span className="text-slate">Anonymized records</span>
              </button>

              {!manageData.poll.closedAt && (
                <button
                  type="button"
                  onClick={handleClosePoll}
                  className="w-full py-2.5 px-4 bg-surface border border-rule text-alarm rounded-interactive font-ui-semibold text-xs hover:border-alarm/60 text-left flex items-center justify-between"
                >
                  <span>Close poll now</span>
                  <span className="text-slate text-[11px]">Finalizes results</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDeletePoll}
                className="w-full py-2.5 px-4 bg-surface border border-alarm/30 text-alarm rounded-interactive font-ui-semibold text-xs hover:bg-alarm/5 text-left"
              >
                Delete poll permanently
              </button>
            </div>

            <div className="pt-4 border-t border-rule flex justify-between text-xs text-slate">
              <Link href={`/p/${slug}`} className="hover:text-ink underline">
                View vote screen
              </Link>
              <Link href={`/p/${slug}/results`} className="hover:text-ink underline">
                View tally results
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
