'use client';

import React from 'react';
import type { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { closingLabel, responseCount } from '@/lib/collective/pollFilters';
import { Card, Chip, Clamp } from '@/components/ui';
import { TallyLegend, TallyVoteButtons, useChoicePalettes } from './PollTally';

interface SurprisingDebateCardProps {
  poll: Poll;
  variant?: 'tertiary' | 'secondary';
}

export const SurprisingDebateCard: React.FC<SurprisingDebateCardProps> = ({
  poll,
  variant = 'tertiary',
}) => {
  const { setInspectPollId } = usePsepho();
  const palettes = useChoicePalettes(poll);
  const isClosed = poll.status === 'closed';

  // The headline number is whichever choice is ahead, not simply the first one.
  const leadIndex = poll.options.reduce(
    (best, option, index) => (option.percentage > poll.options[best].percentage ? index : best),
    0
  );
  const lead = poll.options[leadIndex];
  const glow = variant === 'tertiary' ? 'bg-tertiary-container/15' : 'bg-secondary-container/20';

  return (
    <Card className="group relative flex flex-col justify-between overflow-hidden transition-all duration-200 hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full blur-2xl transition-transform duration-500 group-hover:scale-125 ${glow}`}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="mb-2 flex items-start justify-between gap-2">
          <Clamp as="h4" lines={3} className="font-headline-md text-headline-md text-on-surface">
            {poll.question}
          </Clamp>
        </div>

        <div className="mb-3 flex flex-wrap items-baseline gap-x-2 font-display text-display-lg-mobile md:text-display-lg">
          <span className="shrink-0 tabular-nums" style={{ color: palettes[leadIndex]?.textColor }}>
            {lead.percentage}%
          </span>
          <Clamp
            as="span"
            lines={1}
            className="font-body-md text-body-md font-medium text-on-surface-variant"
          >
            {lead.label}
          </Clamp>
        </div>

        <TallyLegend poll={poll} className="mb-3" />
        <TallyVoteButtons poll={poll} className="mb-4" />

        <div className="rounded-md border border-outline-variant/10 bg-surface-container p-3">
          <p className="font-caption text-caption leading-relaxed text-on-surface-variant">
            <strong style={{ color: palettes[leadIndex]?.textColor }}>Discovery: </strong>
            {poll.discoveryNote ||
              'Divergence observed across age demographics in national dataset.'}
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/10 pt-3 font-caption text-caption text-on-surface-variant">
        <span className="tabular-nums">{responseCount(poll.totalVotes)}</span>
        <div className="flex items-center gap-2">
          {isClosed && <Chip tone="neutral">{closingLabel(poll)}</Chip>}
          <button
            type="button"
            onClick={() => setInspectPollId(poll.id)}
            className="font-semibold text-primary hover:underline"
          >
            View Demographic Split →
          </button>
        </div>
      </div>
    </Card>
  );
};
