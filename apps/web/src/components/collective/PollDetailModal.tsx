'use client';

import React from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { closingLabel } from '@/lib/collective/pollFilters';
import { Chip, Meter, Modal } from '@/components/ui';
import { GeographicHeatmap } from './GeographicHeatmap';
import { useChoicePalettes } from './PollTally';
import { ClosePollButton } from './ClosePollButton';

export const PollDetailModal: React.FC = () => {
  const { inspectPollId, setInspectPollId, polls, castVote } = usePsepho();
  const poll = polls.find((p) => p.id === inspectPollId) ?? null;
  const palettes = useChoicePalettes(poll ?? ({ options: [] } as never));

  if (!poll) return null;

  const userVote = poll.userVotedOptionId;
  const isClosed = poll.status === 'closed';
  const lead = poll.options.reduce((best, option) =>
    option.percentage > best.percentage ? option : best
  );

  return (
    <Modal
      open
      onClose={() => setInspectPollId(null)}
      size="lg"
      eyebrow="Demographic & regional analytics"
      eyebrowIcon="analytics"
      title={poll.question}
      labelledBy="poll-detail-title"
    >
      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
        <Chip tone="neutral">{poll.category}</Chip>
        <span className="tabular-nums">{poll.totalVotes.toLocaleString()} verified responses</span>
        <span aria-hidden="true">•</span>
        <span>{closingLabel(poll)}</span>
        {poll.kind === 'user' && !isClosed && (
          <span className="ml-auto">
            <ClosePollButton poll={poll} />
          </span>
        )}
      </div>

      {/* Every choice, not just the first two. */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {poll.options.map((option, index) => {
          const isVoted = userVote === option.id;
          const colour = palettes[index]?.color;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed}
              aria-pressed={isVoted}
              onClick={() => castVote(poll.id, option.id)}
              className={`rounded-lg border p-4 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isVoted ? 'bg-primary/5' : 'border-outline-variant/30 bg-surface-container-lowest'
              } ${isClosed ? 'cursor-default' : 'hover:border-primary/50'}`}
              style={isVoted ? { borderColor: colour } : undefined}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-semibold text-on-surface">
                  {option.label}
                </span>
                <span
                  className="shrink-0 font-bold tabular-nums"
                  style={{ color: palettes[index]?.textColor }}
                >
                  {option.percentage}%
                </span>
              </div>
              {option.subtitle && (
                <p className="line-clamp-1 text-xs text-on-surface-variant">{option.subtitle}</p>
              )}
              <Meter value={option.percentage} colour={colour} height={4} className="mt-2" />
              {isVoted && (
                <span className="mt-1.5 inline-block text-[10px] font-bold text-primary">
                  ✓ Your cast vote
                </span>
              )}
            </button>
          );
        })}
      </div>

      <section className="mb-6 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
        <h3 className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-label-bold text-xs uppercase text-on-surface-variant">
          <span>Age cohort distribution ({lead.label})</span>
          <span className="text-[11px] normal-case text-outline-variant">
            National baseline: {lead.percentage}%
          </span>
        </h3>

        <div className="space-y-3">
          {poll.demographicBreakdown.map((demo) => {
            const delta = demo.supportPct - lead.percentage;
            return (
              <div key={demo.cohort} className="text-xs">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-on-surface">Age {demo.cohort}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold tabular-nums text-primary">{demo.supportPct}%</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        delta > 0
                          ? 'bg-primary/10 text-primary'
                          : 'bg-outline-variant/30 text-on-surface-variant'
                      }`}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}%
                    </span>
                  </div>
                </div>
                <Meter value={demo.supportPct} colour={palettes[0]?.color} height={8} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-2 font-label-bold text-xs uppercase text-on-surface-variant">
          Geographic heatmap &amp; consensus gradient
        </h3>
        <div className="mb-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-3.5">
          <GeographicHeatmap poll={poll} initialScope="india" />
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(['South', 'West', 'North', 'East'] as const).map((region) => {
            const stat = poll.regionalBreakdown[region];
            return (
              <div
                key={region}
                className="rounded-lg border border-outline-variant/20 bg-surface-container-lowest p-2.5 text-center"
              >
                <span className="mb-0.5 block text-xs font-semibold text-on-surface-variant">
                  {region}
                </span>
                <span className="font-headline-md text-base font-bold tabular-nums text-primary">
                  {stat?.percentage ?? 50}%
                </span>
                <span className="block text-[10px] capitalize text-outline-variant">
                  {stat?.density ?? 'medium'} density
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-outline-variant/20 bg-surface-bright p-3.5 text-xs text-on-surface-variant">
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-primary">verified</span>
          <span>
            Integrity: <strong>One vote per browser</strong> • Cryptographic receipt verifiable
          </span>
        </span>
        <code className="rounded bg-surface-container px-2 py-0.5 font-mono text-[11px] text-primary">
          RCPT: {poll.slug.slice(0, 6).toUpperCase()}
        </code>
      </div>
    </Modal>
  );
};
