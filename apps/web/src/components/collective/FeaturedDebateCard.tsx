'use client';

import React from 'react';
import type { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { closingLabel, responseCount } from '@/lib/collective/pollFilters';
import { Chip, Clamp, Meter } from '@/components/ui';
import { useChoicePalettes } from './PollTally';

interface FeaturedDebateCardProps {
  poll: Poll;
}

/** Choices lay out two-up, or three-up once there are enough of them. */
function columnsFor(count: number): string {
  if (count <= 2) return 'sm:grid-cols-2';
  if (count === 3 || count === 6) return 'sm:grid-cols-2 lg:grid-cols-3';
  return 'sm:grid-cols-2';
}

export const FeaturedDebateCard: React.FC<FeaturedDebateCardProps> = ({ poll }) => {
  const { castVote, setInspectPollId } = usePsepho();
  const palettes = useChoicePalettes(poll);
  const userVote = poll.userVotedOptionId;
  const isClosed = poll.status === 'closed';

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:p-8 lg:w-[70%]">
      <div
        className="pointer-events-none absolute right-0 top-0 select-none p-4 opacity-5 transition-opacity duration-300 group-hover:opacity-15"
        aria-hidden="true"
      >
        <span
          className="material-symbols-outlined text-7xl text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {poll.options[0]?.icon || 'work'}
        </span>
      </div>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Chip tone={isClosed ? 'neutral' : 'tertiary'} dot>
          {isClosed ? 'Final result' : poll.badge?.label || 'Trending Debate'}
        </Chip>
        <Chip tone="neutral" icon="verified_user">
          One vote per browser
        </Chip>
      </header>

      <h1 className="mb-6 max-w-2xl break-words font-display text-headline-lg-mobile leading-tight tracking-tight text-on-surface md:text-headline-lg">
        {poll.question}
      </h1>

      {/* The choices take the slack when this card is stretched by a taller
          neighbour, so the card fills its height instead of trailing off. */}
      <div className={`mb-6 grid gap-4 grid-cols-1 ${columnsFor(poll.options.length)}`}>
        {poll.options.map((option, index) => {
          const isSelected = userVote === option.id;
          const colour = palettes[index]?.color;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isClosed}
              aria-pressed={isSelected}
              onClick={() => castVote(poll.id, option.id)}
              className={`group/btn relative flex flex-col rounded-lg border-2 p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                isSelected
                  ? 'bg-surface-container/50 shadow-md'
                  : 'border-outline-variant/30 bg-surface-bright shadow-xs'
              } ${
                isClosed
                  ? 'cursor-default'
                  : 'hover:border-primary hover:bg-surface-container/30 hover:shadow-md active:scale-[0.99]'
              }`}
              style={isSelected ? { borderColor: colour } : undefined}
            >
              <div className="mb-3 flex w-full items-center justify-between gap-2">
                <span
                  className="material-symbols-outlined text-3xl transition-colors duration-200"
                  style={{
                    color: isSelected ? colour : undefined,
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  {option.icon || 'how_to_vote'}
                </span>

                <div className="flex min-w-0 shrink items-center justify-end gap-1.5">
                  {isSelected && (
                    <span
                      className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-label-bold text-[11px] text-on-primary"
                      style={{ backgroundColor: colour }}
                    >
                      <span className="material-symbols-outlined text-xs">check</span>
                      Voted
                    </span>
                  )}
                  <span
                    className="shrink-0 font-headline-md text-headline-md tabular-nums"
                    style={{ color: palettes[index]?.textColor }}
                  >
                    {option.percentage}%
                  </span>
                </div>
              </div>

              <Clamp as="span" lines={2} className="mb-1 font-headline-md text-headline-md text-on-surface">
                {option.label}
              </Clamp>
              {option.subtitle && (
                <Clamp as="span" lines={2} className="font-body-md text-body-md leading-snug text-on-surface-variant">
                  {option.subtitle}
                </Clamp>
              )}

              <Meter
                value={option.percentage}
                colour={colour}
                className="mt-4"
                label={`${option.label} share`}
              />
            </button>
          );
        })}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/15 pt-4 font-caption text-caption text-on-surface-variant">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-base text-primary">group</span>
            <span className="tabular-nums">{responseCount(poll.totalVotes, false)}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">
              {isClosed ? 'lock' : poll.closesIn === null ? 'all_inclusive' : 'schedule'}
            </span>
            <span>{closingLabel(poll)}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setInspectPollId(poll.id)}
          className="inline-flex items-center gap-1.5 font-label-bold text-label-bold text-primary transition-colors hover:underline"
        >
          <span className="material-symbols-outlined text-sm">analytics</span>
          <span>Inspect Demographics</span>
        </button>
      </footer>
    </article>
  );
};
