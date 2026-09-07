'use client';

import React from 'react';
import type { Poll } from '@/lib/collective/types';
import { getChoicePalettes } from '@/lib/collective/analytics';
import { usePsepho } from '@/lib/collective/PsephoContext';

/**
 * A poll's standings, for any number of choices.
 *
 * Cards used to read `options[0]` and `options[1]` directly, so a proposal with
 * three or more choices silently lost the rest. Everything here walks the whole
 * list, and every choice keeps the colour it has elsewhere in the app.
 */

export const useChoicePalettes = (poll: Poll) => getChoicePalettes(poll.options);

/** Segmented bar: one slice per choice, widths in proportion to the vote. */
export const TallyBar: React.FC<{ poll: Poll; height?: number; className?: string }> = ({
  poll,
  height = 10,
  className = '',
}) => {
  const palettes = useChoicePalettes(poll);
  return (
    <div
      className={`flex w-full overflow-hidden rounded-full bg-surface-container-high ${className}`}
      style={{ height }}
      role="img"
      aria-label={poll.options.map((o) => `${o.label} ${o.percentage}%`).join(', ')}
    >
      {poll.options.map((option, index) => (
        <div
          key={option.id}
          className="h-full transition-[width] duration-500"
          style={{
            width: `${option.percentage}%`,
            backgroundColor: palettes[index]?.color,
          }}
        />
      ))}
    </div>
  );
};

/** Colour key beneath the bar, one row per choice. */
export const TallyLegend: React.FC<{ poll: Poll; className?: string }> = ({
  poll,
  className = '',
}) => {
  const palettes = useChoicePalettes(poll);
  const voted = poll.userVotedOptionId;

  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 font-caption text-caption ${className}`}>
      {poll.options.map((option, index) => (
        <li key={option.id} className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: palettes[index]?.color }}
          />
          <span className="truncate text-on-surface-variant">{option.label}</span>
          <strong className="tabular-nums" style={{ color: palettes[index]?.textColor }}>
            {option.percentage}%
          </strong>
          {voted === option.id && (
            <span className="material-symbols-outlined text-sm text-primary" title="Your vote">
              check
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

/**
 * One button per choice. Closed polls render the standings as static rows
 * instead, because there is nothing left to press.
 */
export const TallyVoteButtons: React.FC<{ poll: Poll; className?: string }> = ({
  poll,
  className = '',
}) => {
  const { castVote } = usePsepho();
  const palettes = useChoicePalettes(poll);
  const voted = poll.userVotedOptionId;
  const isClosed = poll.status === 'closed';

  if (isClosed) {
    const leader = poll.options.reduce((best, option) =>
      option.percentage > best.percentage ? option : best
    );
    return (
      <div className={`space-y-1.5 ${className}`}>
        {poll.options.map((option, index) => (
          <div
            key={option.id}
            className="flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 text-xs"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: palettes[index]?.color }}
            />
            <span className="min-w-0 flex-1 truncate text-on-surface">{option.label}</span>
            {option.id === leader.id && (
              <span className="shrink-0 font-label-bold text-[10px] uppercase text-primary">
                Result
              </span>
            )}
            {voted === option.id && (
              <span className="material-symbols-outlined shrink-0 text-sm text-primary" title="Your vote">
                check
              </span>
            )}
            <strong className="shrink-0 tabular-nums" style={{ color: palettes[index]?.textColor }}>
              {option.percentage}%
            </strong>
          </div>
        ))}
      </div>
    );
  }

  // Two choices sit side by side; more wrap into a responsive grid.
  const columns = poll.options.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3';

  return (
    <div className={`grid gap-2 ${columns} ${className}`}>
      {poll.options.map((option, index) => {
        const isMine = voted === option.id;
        const colour = palettes[index]?.color;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => castVote(poll.id, option.id)}
            aria-pressed={isMine}
            title={option.label}
            className="flex items-center justify-center gap-1.5 rounded-full border px-3 py-2 font-label-bold text-xs transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={
              isMine
                ? { backgroundColor: colour, borderColor: colour, color: '#ffffff' }
                : { borderColor: `${colour}55`, color: palettes[index]?.textColor }
            }
          >
            {isMine && <span className="material-symbols-outlined text-sm">check</span>}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
