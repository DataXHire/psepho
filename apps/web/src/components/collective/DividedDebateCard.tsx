'use client';

import React from 'react';
import { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';

interface DividedDebateCardProps {
  poll: Poll;
}

export const DividedDebateCard: React.FC<DividedDebateCardProps> = ({ poll }) => {
  const { castVote, setInspectPollId } = usePsepho();
  const opt1 = poll.options[0];
  const opt2 = poll.options[1];
  const userVote = poll.userVotedOptionId;

  const tensionLabel = poll.badge?.label || 'Active Debate';

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-xs border border-outline-variant/20 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Title */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <h4 className="font-headline-md text-headline-md text-on-surface line-clamp-2 leading-snug">
            {poll.question}
          </h4>
          <button
            onClick={() => setInspectPollId(poll.id)}
            title="Inspect demographics"
            className="text-outline-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-lg">insights</span>
          </button>
        </div>

        {/* Dual-color split progress bar */}
        <div className="relative h-2.5 bg-surface-container-high rounded-full overflow-hidden mb-2.5">
          <div
            className="absolute top-0 left-0 h-full bg-primary transition-all duration-500 rounded-l-full"
            style={{ width: `${opt1.percentage}%` }}
          />
          <div
            className="absolute top-0 right-0 h-full bg-secondary transition-all duration-500 rounded-r-full"
            style={{ width: `${opt2.percentage}%` }}
          />
        </div>

        {/* Percentage Stats Labels */}
        <div className="flex justify-between font-caption text-caption mb-5">
          <span className="text-primary font-bold flex items-center gap-1">
            {opt1.label} {opt1.percentage}%
            {userVote === opt1.id && <span className="text-xs">✓</span>}
          </span>
          <span className="text-secondary font-bold flex items-center gap-1">
            {userVote === opt2.id && <span className="text-xs">✓</span>}
            {opt2.label} {opt2.percentage}%
          </span>
        </div>

        {/* Quick Vote Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => castVote(poll.id, opt1.id)}
            className={`py-2 px-3 rounded-full text-xs font-label-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              userVote === opt1.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-primary hover:bg-primary/10 border border-outline-variant/30 active:scale-95'
            }`}
          >
            <span>{opt1.label}</span>
          </button>

          <button
            onClick={() => castVote(poll.id, opt2.id)}
            className={`py-2 px-3 rounded-full text-xs font-label-bold transition-all duration-150 flex items-center justify-center gap-1.5 ${
              userVote === opt2.id
                ? 'bg-secondary text-on-secondary shadow-xs'
                : 'bg-surface-container-low text-secondary hover:bg-secondary/10 border border-outline-variant/30 active:scale-95'
            }`}
          >
            <span>{opt2.label}</span>
          </button>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="flex items-center justify-between text-on-surface-variant font-caption text-caption pt-3 border-t border-outline-variant/10">
        <span>{(poll.totalVotes / 1000).toFixed(0)}K responses</span>
        <span className="inline-flex items-center gap-1 font-semibold text-tertiary">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
          {tensionLabel}
        </span>
      </div>
    </div>
  );
};
