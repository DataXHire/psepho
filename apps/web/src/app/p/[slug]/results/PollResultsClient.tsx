'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Poll, PollOption, PollTallyResult, calculatePollDenomination } from '@psepho/core';
import { useBallotToken } from '@/lib/use-ballot-token';
import { OptionRow } from '@/components/OptionRow';
import { PsephoClient } from '@psepho/api-client';

interface PollResultsClientProps {
  initialPoll: Poll;
  initialOptions: PollOption[];
  initialTally: PollTallyResult;
}

export function PollResultsClient({
  initialPoll,
  initialOptions,
  initialTally,
}: PollResultsClientProps) {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [options, setOptions] = useState<PollOption[]>(initialOptions);
  const [tally, setTally] = useState<PollTallyResult>(initialTally);
  const etagRef = useRef<string | null>(null);

  const ballotToken = useBallotToken(poll.slug);
  const client = new PsephoClient();

  // Polling with ETag revalidation (§2.5)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let isActive = true;

    async function fetchTally() {
      if (document.hidden) return;

      try {
        const res = await client.getTally(poll.slug, {
          etag: etagRef.current || undefined,
          ballotToken: ballotToken || undefined,
        });

        if (!res.notModified && res.tally) {
          etagRef.current = res.etag;
          setTally(res.tally);
        }
      } catch (err) {
        console.error('Tally fetch error:', err);
      }

      if (!isActive) return;

      const pollAgeMinutes = (Date.now() - new Date(poll.createdAt).getTime()) / (60 * 1000);
      const baseInterval = pollAgeMinutes < 60 ? 2000 : 10000;
      const jitter = (Math.random() * 0.4 - 0.2) * baseInterval;
      const nextDelay = Math.max(1000, baseInterval + jitter);

      timeoutId = setTimeout(fetchTally, nextDelay);
    }

    fetchTally();

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchTally();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [poll.slug, ballotToken, poll.createdAt]);

  // Max option votes for denomination line calculation
  const countsMap = new Map<string, { count: number; percentage: number }>();
  let maxVotes = 0;
  if (tally.tallies) {
    for (const t of tally.tallies) {
      countsMap.set(t.optionId, { count: t.count, percentage: t.percentage });
      if (t.count > maxVotes) {
        maxVotes = t.count;
      }
    }
  }

  const denomination = calculatePollDenomination(maxVotes);
  const showDenominationLine = maxVotes > 120 && maxVotes <= 5000;

  // Find winner label for ranked polls
  let winnerLabel: string | null = null;
  if (poll.kind === 'ranked' && tally.irvResult?.winnerId) {
    const winnerOpt = options.find((o) => o.id === tally.irvResult?.winnerId);
    winnerLabel = winnerOpt ? winnerOpt.label : null;
  }

  return (
    <main className="w-full max-w-ballot mx-auto px-4 pb-20 pt-6">
      {/* 1. The Question in display face */}
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-6 tracking-tight">
        {poll.question}
      </h1>

      {/* Case 1: Results are hidden until close */}
      {tally.isHidden ? (
        <div className="py-12 px-6 border border-rule rounded-sheet bg-surface text-center space-y-3">
          <p className="font-body text-base text-ink font-medium">
            Results are hidden until this poll closes.
          </p>
          <p className="text-sm text-slate">
            Total ballots recorded: <span className="tabular-nums font-semibold text-ink">{tally.totalBallots}</span>
          </p>
          <div className="pt-4">
            <Link
              href={`/p/${poll.slug}`}
              className="text-xs text-patina hover:underline font-medium"
            >
              Return to vote screen
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Winner Headline for Ranked Choice (§1.7) */}
          {poll.kind === 'ranked' && winnerLabel && (
            <div className="mb-8 p-4 bg-surface border border-rule rounded-row">
              <span className="text-xs uppercase tracking-wide text-slate font-medium block mb-1">
                Winner
              </span>
              <h2 className="font-display text-2xl text-ink">
                {winnerLabel}
              </h2>
            </div>
          )}

          {/* Option rows with tally & pebbles revealed */}
          <div className="space-y-2.5">
            {options.map((opt) => {
              const stats = countsMap.get(opt.id) || { count: 0, percentage: 0 };
              return (
                <OptionRow
                  key={opt.id}
                  id={opt.id}
                  position={opt.position}
                  label={opt.label}
                  count={stats.count}
                  percentage={stats.percentage}
                  totalVotes={tally.totalBallots}
                  denomination={denomination}
                  isVotingMode={false}
                  isRankedPoll={poll.kind === 'ranked'}
                />
              );
            })}
          </div>

          {/* Denomination line beneath tally (§1.3) */}
          {showDenominationLine && (
            <p className="text-xs text-slate mt-3 font-body">
              Each pebble = {denomination} votes
            </p>
          )}

          {/* Elimination rounds for Ranked Polls (§1.7) */}
          {poll.kind === 'ranked' && tally.irvResult && tally.irvResult.rounds.length > 0 && (
            <div className="mt-8 pt-6 border-t border-rule">
              <h3 className="font-display text-lg text-ink mb-4">Elimination rounds</h3>
              <div className="space-y-3 font-body text-sm text-slate">
                {tally.irvResult.rounds.map((round) => (
                  <div
                    key={round.roundNumber}
                    className="p-3 bg-surface border border-rule rounded-row text-ink leading-relaxed"
                  >
                    {round.summarySentence}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary stats & actions */}
          <div className="mt-8 pt-4 border-t border-rule flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate">
            <div>
              Total ballots cast: <span className="tabular-nums font-semibold text-ink">{tally.totalBallots}</span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href={`/p/${poll.slug}`}
                className="text-patina hover:underline font-medium"
              >
                Vote screen
              </Link>

              <Link
                href={`/p/${poll.slug}/room`}
                className="hover:text-ink transition-colors"
              >
                Room mode
              </Link>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
