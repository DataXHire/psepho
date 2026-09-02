'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Poll, PollOption, PollTallyResult } from '@psepho/core';
import { useBallotToken } from '@/lib/use-ballot-token';
import { formatRelativeCloseTime } from '@/lib/format-time';
import { OptionRow } from '@/components/OptionRow';
import { IntegrityLine } from '@/components/IntegrityLine';
import { PsephoClient } from '@psepho/api-client';

interface PollVoteClientProps {
  initialPoll: Poll;
  initialOptions: PollOption[];
  initialBallot?: {
    choice: string[];
    receiptCode: string;
    castAt: string;
    revisedAt: string | null;
  } | null;
}

export function PollVoteClient({
  initialPoll,
  initialOptions,
  initialBallot = null,
}: PollVoteClientProps) {
  const [poll, setPoll] = useState<Poll>(initialPoll);
  const [options, setOptions] = useState<PollOption[]>(initialOptions);
  const [userBallot, setUserBallot] = useState(initialBallot);
  const [isChangingVote, setIsChangingVote] = useState(false);

  // Voting state
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [lastAttemptedChoices, setLastAttemptedChoices] = useState<string[]>([]);

  // Optimistic UI & Bold moment
  const [optimisticChoices, setOptimisticChoices] = useState<string[] | null>(null);
  const [boldMomentOptionId, setBoldMomentOptionId] = useState<string | null>(null);

  // Tallies state
  const [tallyData, setTallyData] = useState<PollTallyResult | null>(null);
  const etagRef = useRef<string | null>(null);

  const ballotToken = useBallotToken(poll.slug);
  const client = new PsephoClient();

  const isClosed =
    poll.closedAt !== null || (poll.closesAt !== null && new Date() > new Date(poll.closesAt));

  // Determine if user has already voted
  const hasVoted = Boolean(userBallot) && !isChangingVote;

  // Poll for tally updates with jittered interval (§2.5)
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
          setTallyData(res.tally);
        }
      } catch (err) {
        console.error('Tally fetch error:', err);
      }

      if (!isActive) return;

      // Calculate poll age
      const pollAgeMinutes = (Date.now() - new Date(poll.createdAt).getTime()) / (60 * 1000);
      const baseInterval = pollAgeMinutes < 60 ? 2000 : 10000;
      // ±20% jitter
      const jitter = (Math.random() * 0.4 - 0.2) * baseInterval;
      const nextDelay = Math.max(1000, baseInterval + jitter);

      timeoutId = setTimeout(fetchTally, nextDelay);
    }

    fetchTally();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTally();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [poll.slug, ballotToken, poll.createdAt]);

  // Handle single-choice click
  const handleSingleSelect = (optionId: string) => {
    if (isSubmitting || isClosed) return;
    submitVote([optionId]);
  };

  // Handle multi-choice toggle
  const handleMultiToggle = (optionId: string) => {
    if (isSubmitting || isClosed) return;
    setVoteError(null);
    setSelectedChoices((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      if (poll.maxChoices && prev.length >= poll.maxChoices) {
        return prev;
      }
      return [...prev, optionId];
    });
  };

  // Handle ranked-choice selection
  const handleRankedToggle = (optionId: string) => {
    if (isSubmitting || isClosed) return;
    setVoteError(null);
    setSelectedChoices((prev) => {
      if (prev.includes(optionId)) {
        // Tapping a ranked row again removes it and renumbers the rest (§1.7)
        return prev.filter((id) => id !== optionId);
      }
      return [...prev, optionId];
    });
  };

  // Vote submission with optimistic fill sweep and visible rollback on failure
  async function submitVote(choices: string[]) {
    if (choices.length === 0 || !ballotToken) return;

    setVoteError(null);
    setIsSubmitting(true);
    setLastAttemptedChoices(choices);

    // 1. Optimistic Bold Moment: trigger sweep and single pebble drop
    setOptimisticChoices(choices);
    setBoldMomentOptionId(choices[0]);

    try {
      const result = await client.castBallot(poll.slug, choices, ballotToken);

      // Success
      setUserBallot({
        choice: choices,
        receiptCode: result.receiptCode,
        castAt: result.castAt,
        revisedAt: result.revised ? new Date().toISOString() : null,
      });
      setIsChangingVote(false);
      setIsSubmitting(false);

      // Refresh tally
      const res = await client.getTally(poll.slug, { ballotToken });
      if (res.tally) {
        setTallyData(res.tally);
      }
    } catch (err: any) {
      // 2. Visible rollback on failure:
      // "The optimistic fill must roll back visibly when this happens. Do not leave a fill on screen for a vote that wasn't counted."
      setOptimisticChoices(null);
      setBoldMomentOptionId(null);
      setIsSubmitting(false);
      setVoteError("Your vote didn't reach the server. Retry.");
    }
  }

  // Tally counts map
  const countMap = new Map<string, { count: number; percentage: number }>();
  if (tallyData?.tallies) {
    for (const t of tallyData.tallies) {
      countMap.set(t.optionId, { count: t.count, percentage: t.percentage });
    }
  }

  // Active choices to highlight
  const activeChoices = optimisticChoices || (hasVoted ? userBallot?.choice || [] : selectedChoices);

  return (
    <main className="w-full max-w-ballot mx-auto px-4 pb-20 pt-6">
      {/* 1. The Question is the largest thing on the page */}
      <h1 className="font-display text-3xl md:text-4xl text-ink mb-6 tracking-tight">
        {poll.question}
      </h1>

      {/* Ranked choice instruction copy if applicable (§1.7) */}
      {poll.kind === 'ranked' && !hasVoted && (
        <p className="text-sm text-slate mb-4 font-body">
          Tap options in the order you prefer them. You can rank as many as you want.
        </p>
      )}

      {/* Multi-choice instruction copy if applicable */}
      {poll.kind === 'multi' && !hasVoted && (
        <p className="text-sm text-slate mb-4 font-body">
          {poll.maxChoices
            ? `Select up to ${poll.maxChoices} options.`
            : 'Select all that apply.'}
        </p>
      )}

      {/* Error state with rollback & retry */}
      {voteError && (
        <div className="mb-6 p-3.5 border border-alarm/30 bg-surface rounded-row text-sm text-alarm flex items-center justify-between">
          <span>{voteError}</span>
          <button
            type="button"
            onClick={() => submitVote(lastAttemptedChoices)}
            className="px-3 py-1 bg-alarm text-surface rounded-interactive font-medium hover:opacity-90 transition-opacity text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* 2. Options as full-width rows */}
      <div className="space-y-2.5">
        {options.map((opt) => {
          const stats = countMap.get(opt.id) || { count: 0, percentage: 0 };
          const isSelected = activeChoices.includes(opt.id);
          const isUserVoteRow = hasVoted && userBallot?.choice.includes(opt.id);
          const rankedPos =
            poll.kind === 'ranked' && activeChoices.includes(opt.id)
              ? activeChoices.indexOf(opt.id) + 1
              : null;

          const isVotingMode = !hasVoted && !isClosed;

          return (
            <OptionRow
              key={opt.id}
              id={opt.id}
              position={opt.position}
              label={opt.label}
              count={stats.count}
              percentage={stats.percentage}
              totalVotes={tallyData?.totalBallots || 0}
              isSelected={isSelected}
              isUserVote={isUserVoteRow}
              rankedPosition={rankedPos}
              isVotingMode={isVotingMode}
              isRankedPoll={poll.kind === 'ranked'}
              isClosed={isClosed}
              wasJustVoted={boldMomentOptionId === opt.id}
              onSelect={() => {
                if (poll.kind === 'single') {
                  handleSingleSelect(opt.id);
                } else if (poll.kind === 'multi') {
                  handleMultiToggle(opt.id);
                } else if (poll.kind === 'ranked') {
                  handleRankedToggle(opt.id);
                }
              }}
            />
          );
        })}
      </div>

      {/* Multi-choice or Ranked-choice Submit action */}
      {(!hasVoted && !isClosed) && (poll.kind === 'multi' || poll.kind === 'ranked') && (
        <div className="mt-6">
          <button
            type="button"
            disabled={selectedChoices.length === 0 || isSubmitting}
            onClick={() => submitVote(selectedChoices)}
            className="w-full py-3 px-4 bg-patina text-surface rounded-interactive font-ui-semibold text-sm hover:bg-patina-deep disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Casting vote...' : poll.kind === 'ranked' ? 'Submit ranking' : 'Submit ballot'}
          </button>
        </div>
      )}

      {/* Change vote affordance if already voted and poll allows revision */}
      {hasVoted && poll.allowRevision && !isClosed && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setIsChangingVote(true);
              setSelectedChoices(userBallot?.choice || []);
            }}
            className="text-patina hover:text-patina-deep underline decoration-patina/40 font-medium"
          >
            Change vote
          </button>

          {userBallot?.receiptCode && (
            <Link
              href={`/r/${userBallot.receiptCode}?poll=${poll.slug}`}
              className="text-xs text-slate hover:text-ink transition-colors"
            >
              Receipt: <span className="font-mono">{userBallot.receiptCode}</span>
            </Link>
          )}
        </div>
      )}

      {/* Bottom metadata */}
      <div className="mt-8 pt-4 border-t border-rule space-y-2">
        {/* Integrity Line */}
        <IntegrityLine level={poll.integrity} />

        {/* Relative Close Time */}
        <p className="text-xs text-slate">
          {formatRelativeCloseTime(poll.closesAt, poll.closedAt)}
        </p>

        {/* View full results link */}
        <div className="pt-3">
          <Link
            href={`/p/${poll.slug}/results`}
            className="text-xs text-slate hover:text-ink underline decoration-rule transition-colors"
          >
            View live results & tally
          </Link>
        </div>
      </div>
    </main>
  );
}
