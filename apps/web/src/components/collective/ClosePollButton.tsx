'use client';

import React, { useState } from 'react';
import type { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { responseCount } from '@/lib/collective/pollFilters';
import { Button, Modal } from '@/components/ui';

/**
 * Ends voting on a proposal.
 *
 * Closing is final — the result stands and the proposal leaves the active list
 * — so it asks first rather than acting on a single click.
 */
export const ClosePollButton: React.FC<{ poll: Poll; size?: 'sm' | 'md' }> = ({
  poll,
  size = 'sm',
}) => {
  const { closePoll } = usePsepho();
  const [confirming, setConfirming] = useState(false);

  if (poll.status === 'closed') return null;

  return (
    <>
      <Button
        variant="outline"
        size={size}
        icon="lock"
        onClick={() => setConfirming(true)}
        aria-label={`End voting on ${poll.question}`}
      >
        End voting
      </Button>

      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        size="sm"
        eyebrow="End this debate"
        eyebrowIcon="lock"
        title={poll.question}
        labelledBy={`close-poll-${poll.id}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Keep it open
            </Button>
            <Button
              variant="primary"
              icon="lock"
              onClick={() => {
                closePoll(poll.id);
                setConfirming(false);
              }}
            >
              End voting
            </Button>
          </div>
        }
      >
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Ending this debate stops new votes for good. The standings at{' '}
          <strong className="text-on-surface tabular-nums">
            {responseCount(poll.totalVotes, false)}
          </strong>{' '}
          become the final result, and the proposal moves out of your active list into the
          finished ones. This cannot be undone.
        </p>
      </Modal>
    </>
  );
};
