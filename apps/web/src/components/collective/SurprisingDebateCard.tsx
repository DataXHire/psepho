'use client';

import React from 'react';
import { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';

interface SurprisingDebateCardProps {
  poll: Poll;
  variant?: 'tertiary' | 'secondary';
}

export const SurprisingDebateCard: React.FC<SurprisingDebateCardProps> = ({
  poll,
  variant = 'tertiary',
}) => {
  const { castVote, setInspectPollId } = usePsepho();
  const opt1 = poll.options[0];
  const opt2 = poll.options[1];
  const userVote = poll.userVotedOptionId;

  const isTertiary = variant === 'tertiary';
  const glowClass = isTertiary ? 'bg-tertiary-container/15' : 'bg-secondary-container/20';
  const textColor = isTertiary ? 'text-primary' : 'text-secondary';

  return (
    <div className="bg-surface-container-lowest rounded-lg p-6 shadow-xs border border-outline-variant/20 hover:shadow-md transition-all duration-200 relative overflow-hidden flex flex-col justify-between group">
      {/* Ambient Blurred Orb */}
      <div
        className={`absolute -right-4 -top-4 w-28 h-28 ${glowClass} rounded-full blur-2xl pointer-events-none transition-transform duration-500 group-hover:scale-125`}
      />

      <div>
        {/* Top bar with title and inspect button */}
        <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
          <h4 className="font-headline-md text-headline-md text-on-surface">{poll.question}</h4>
          <button
            onClick={() => setInspectPollId(poll.id)}
            title="Inspect demographic breakdown"
            className="text-outline-variant hover:text-primary transition-colors p-1 rounded-full hover:bg-surface-container"
          >
            <span className="material-symbols-outlined text-lg">insights</span>
          </button>
        </div>

        {/* Large Stat Display */}
        <div
          className={`font-display text-display-lg-mobile md:text-display-lg ${textColor} mb-3 flex items-baseline gap-2`}
        >
          <span>{opt1.percentage}%</span>
          <span className="font-body-md text-body-md text-on-surface-variant font-medium">
            {opt1.label}
          </span>
        </div>

        {/* Quick Vote Action Bar */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => castVote(poll.id, opt1.id)}
            className={`py-1.5 px-4 rounded-full text-xs font-label-bold transition-all ${
              userVote === opt1.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-surface-container-low text-primary hover:bg-primary/10 border border-outline-variant/30 active:scale-95'
            }`}
          >
            {opt1.label} {userVote === opt1.id && '✓'}
          </button>

          <button
            onClick={() => castVote(poll.id, opt2.id)}
            className={`py-1.5 px-4 rounded-full text-xs font-label-bold transition-all ${
              userVote === opt2.id
                ? 'bg-secondary text-on-secondary shadow-xs'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30 active:scale-95'
            }`}
          >
            {opt2.label} {opt2.percentage}% {userVote === opt2.id && '✓'}
          </button>
        </div>

        {/* Discovery Callout Box */}
        <div className="bg-surface-container p-3 rounded-md mt-2 relative z-10 border border-outline-variant/10">
          <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
            <strong className={textColor}>Discovery: </strong>
            {poll.discoveryNote ||
              'Divergence observed across age demographics in national dataset.'}
          </p>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="flex items-center justify-between text-on-surface-variant font-caption text-caption pt-3 mt-4 border-t border-outline-variant/10">
        <span>{(poll.totalVotes / 1000).toFixed(0)}K responses</span>
        <button
          onClick={() => setInspectPollId(poll.id)}
          className="text-primary hover:underline font-semibold"
        >
          View Demographic Split →
        </button>
      </div>
    </div>
  );
};
