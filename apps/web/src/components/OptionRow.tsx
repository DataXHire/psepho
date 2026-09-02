import React from 'react';
import { getOptionColor, getOptionLetter } from '@psepho/tokens';
import { PebbleTally } from './PebbleTally';

interface OptionRowProps {
  id: string;
  position: number;
  label: string;
  count: number;
  percentage: number;
  totalVotes: number;
  isSelected?: boolean;
  isUserVote?: boolean;
  rankedPosition?: number | null; // 1-indexed (1, 2, 3...)
  isVotingMode?: boolean;
  isRankedPoll?: boolean;
  isClosed?: boolean;
  isOptimisticSubmitting?: boolean;
  wasJustVoted?: boolean;
  denomination?: number;
  onSelect?: () => void;
  disabled?: boolean;
}

export function OptionRow({
  id,
  position,
  label,
  count,
  percentage,
  totalVotes,
  isSelected = false,
  isUserVote = false,
  rankedPosition = null,
  isVotingMode = false,
  isRankedPoll = false,
  isClosed = false,
  isOptimisticSubmitting = false,
  wasJustVoted = false,
  denomination = 1,
  onSelect,
  disabled = false,
}: OptionRowProps) {
  const colorObj = getOptionColor(position);
  const letter = getOptionLetter(position);

  // Screen reader label
  const ariaLabel = `${letter}: ${label}. ${count} votes, ${percentage} percent.${isUserVote ? ' Your vote.' : ''}`;

  return (
    <div
      role={isVotingMode && !disabled ? 'button' : 'listitem'}
      tabIndex={isVotingMode && !disabled ? 0 : undefined}
      onClick={isVotingMode && !disabled ? onSelect : undefined}
      onKeyDown={
        isVotingMode && !disabled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      aria-label={ariaLabel}
      aria-pressed={isVotingMode ? isSelected : undefined}
      className={`
        relative w-full min-h-[56px] border rounded-row overflow-hidden select-none transition-colors duration-150
        ${isVotingMode && !disabled ? 'cursor-pointer hover:border-slate' : ''}
        ${isUserVote ? 'border-ink dark:border-ink ring-1 ring-ink' : 'border-rule'}
        ${isSelected ? 'bg-surface' : 'bg-surface'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
        p-3 flex flex-col justify-between
      `}
    >
      {/* Background share fill sweep (The One Bold Moment) */}
      <div
        className="absolute inset-y-0 left-0 transition-all duration-[420ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
        style={{
          width: `${Math.min(100, percentage)}%`,
          backgroundColor: colorObj.hex,
          opacity: isSelected || isUserVote ? 0.18 : 0.08,
        }}
      />

      {/* Top line: letter marker / ordinal, label, 'Your vote' tag, and numeric stats */}
      <div className="relative z-10 flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2.5 min-w-0">
          {/* Marker: Ordinal badge if ranked choice; otherwise Letter marker */}
          {isRankedPoll && rankedPosition !== null && rankedPosition !== undefined ? (
            <span
              className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-row bg-ink text-surface flex-shrink-0 tabular-nums"
              aria-hidden="true"
            >
              {rankedPosition}
            </span>
          ) : (
            <span
              className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-row flex-shrink-0"
              style={{
                backgroundColor: `${colorObj.hex}22`,
                color: colorObj.hex,
              }}
              aria-hidden="true"
            >
              {letter}
            </span>
          )}

          <span className="font-body text-base text-ink break-words font-medium">
            {label}
          </span>

          {isUserVote && (
            <span className="text-xs uppercase tracking-wide px-1.5 py-0.5 rounded-row bg-ink text-surface font-semibold flex-shrink-0">
              Your vote
            </span>
          )}
        </div>

        {/* Right side stats: absolute count + percentage in tabular-nums */}
        <div className="flex items-baseline gap-2 flex-shrink-0 text-slate text-sm tabular-nums">
          <span className="font-semibold text-ink">{count}</span>
          <span className="text-xs">({percentage}%)</span>
        </div>
      </div>

      {/* Bottom line: inline SVG pebbles representing physical stones */}
      <div className="relative z-10 mt-2">
        <PebbleTally
          votes={count}
          color={colorObj.hex}
          denomination={denomination}
          percentage={percentage}
          newPebbleDropped={wasJustVoted}
        />
      </div>
    </div>
  );
}
