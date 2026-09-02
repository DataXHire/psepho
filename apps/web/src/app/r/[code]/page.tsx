'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { PsephoClient } from '@psepho/api-client';

export default function ReceiptPage(props: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ poll?: string }>;
}) {
  const { code } = use(props.params);
  const searchParams = use(props.searchParams);

  const [inputCode, setInputCode] = useState(code || '');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const client = new PsephoClient();

  useEffect(() => {
    if (code) {
      performLookup(code, searchParams.poll);
    }
  }, [code, searchParams.poll]);

  async function performLookup(lookupCode: string, pollSlug?: string) {
    setIsLoading(true);
    try {
      const res = await client.checkReceipt(lookupCode, pollSlug);
      setResult(res);
    } catch (err) {
      setResult({ found: false, code: lookupCode });
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      performLookup(inputCode.trim().toUpperCase());
    }
  };

  return (
    <>
      <Header />
      <main className="w-full max-w-ballot mx-auto px-4 pb-20 pt-6 font-body">
        <h1 className="font-display text-2xl md:text-3xl text-ink mb-2">
          Verify Ballot Receipt
        </h1>
        <p className="text-sm text-slate mb-6">
          Check any cryptographic 6-character receipt code directly against the published tally ledger.
        </p>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            maxLength={6}
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder="6-character receipt code (e.g. 7K2M9Q)"
            className="w-full bg-surface border border-rule px-3 py-2.5 rounded-row text-sm font-mono tracking-wider text-ink uppercase focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-ink text-surface rounded-interactive text-xs font-semibold hover:opacity-90"
          >
            Verify
          </button>
        </form>

        {/* Verification Result Output */}
        {isLoading ? (
          <div className="text-sm text-slate">Verifying receipt against tally ledger...</div>
        ) : result ? (
          <div className="p-6 bg-surface border border-rule rounded-sheet space-y-3">
            {result.found ? (
              <>
                <div className="flex items-center gap-2 text-patina text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-patina inline-block" />
                  Ballot Confirmed in Count
                </div>
                <p className="text-base text-ink font-body leading-relaxed">
                  Receipt <span className="font-mono font-semibold">{result.code}</span> is in the count for &ldquo;{result.question}&rdquo; — cast for <span className="font-medium text-ink">{result.optionLabel}</span>.
                </p>
                {result.pollSlug && (
                  <div className="pt-2">
                    <Link
                      href={`/p/${result.pollSlug}/results`}
                      className="text-xs text-patina underline font-medium hover:text-patina-deep"
                    >
                      View full results for &ldquo;{result.question}&rdquo;
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-alarm font-medium">
                No ballot found with that receipt.
              </p>
            )}
          </div>
        ) : null}
      </main>
    </>
  );
}
