'use client';

import React from 'react';
import type { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { closingLabel, responseCount } from '@/lib/collective/pollFilters';
import { Card, Chip, Clamp, IconButton } from '@/components/ui';
import { TallyBar, TallyLegend, TallyVoteButtons } from './PollTally';
import { ClosePollButton } from './ClosePollButton';

interface DividedDebateCardProps {
  poll: Poll;
  /** Show the owner's controls, e.g. on the proposals surfaces. */
  owned?: boolean;
}

export const DividedDebateCard: React.FC<DividedDebateCardProps> = ({ poll, owned = false }) => {
  const { setInspectPollId } = usePsepho();
  const isClosed = poll.status === 'closed';

  return (
    <Card className="group flex flex-col justify-between transition-all duration-200 hover:shadow-md">
      <div>
        <div className="mb-4 flex items-start justify-between gap-2">
          <Clamp as="h4" lines={2} className="font-headline-md text-headline-md leading-snug text-on-surface">
            {poll.question}
          </Clamp>
          <IconButton
            icon="insights"
            label="Inspect demographics"
            onClick={() => setInspectPollId(poll.id)}
            className="shrink-0 text-outline-variant"
          />
        </div>

        <TallyBar poll={poll} className="mb-2.5" />
        <TallyLegend poll={poll} className="mb-5" />
        <TallyVoteButtons poll={poll} className="mb-5" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/10 pt-3 font-caption text-caption text-on-surface-variant">
        <span className="tabular-nums">{responseCount(poll.totalVotes)}</span>
        <div className="flex items-center gap-2">
          {owned && !isClosed && <ClosePollButton poll={poll} />}
          <Chip tone={isClosed ? 'neutral' : 'tertiary'} dot>
            {isClosed ? closingLabel(poll) : poll.badge?.label || 'Active Debate'}
          </Chip>
        </div>
      </div>
    </Card>
  );
};
