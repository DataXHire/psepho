'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { ownProposals, proposalCounts } from '@/lib/collective/pollFilters';
import { Button, IconButton } from '@/components/ui';
import { DividedDebateCard } from './DividedDebateCard';

/**
 * The home page's summary of the viewer's own proposals: only the ones still
 * taking votes, capped to a preview. Finished ones live on the proposals page.
 * Dismissing it is remembered, and the header keeps a way back in.
 */
const PREVIEW_LIMIT = 2;

export const ProposalsPanel: React.FC = () => {
  const { polls, search, activeCategory, openAskModal, showProposalsPanel, setShowProposalsPanel } =
    usePsepho();

  const counts = useMemo(() => proposalCounts(polls), [polls]);
  const active = useMemo(
    () => ownProposals(polls, { search, category: activeCategory, status: 'open' }),
    [polls, search, activeCategory]
  );

  if (!showProposalsPanel || counts.total === 0) return null;

  return (
    <section
      aria-labelledby="proposals-panel-heading"
      className="mb-8 rounded-xl border border-primary/20 bg-primary/5 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="proposals-panel-heading"
          className="flex items-center gap-2 font-label-bold text-xs uppercase text-primary"
        >
          <span className="material-symbols-outlined text-sm">campaign</span>
          Your community proposals
          <span className="tabular-nums text-on-surface-variant">
            ({counts.open} open
            {counts.closed > 0 ? `, ${counts.closed} finished` : ''})
          </span>
        </h2>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" icon="add" onClick={openAskModal}>
            New proposal
          </Button>
          <Link
            href="/proposals"
            className="rounded-full px-3 py-1.5 font-label-bold text-[11px] text-primary transition-colors hover:bg-primary/10"
          >
            Manage all →
          </Link>
          <IconButton
            icon="close"
            label="Hide your proposals from this page"
            onClick={() => setShowProposalsPanel(false)}
          />
        </div>
      </div>

      {active.length > 0 ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {active.slice(0, PREVIEW_LIMIT).map((poll) => (
            <DividedDebateCard key={poll.id} poll={poll} owned />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-on-surface-variant">
          {counts.open === 0
            ? 'All of your proposals have finished. Their results are on the proposals page.'
            : 'None of your open proposals match the current filters.'}
        </p>
      )}

      {active.length > PREVIEW_LIMIT && (
        <Link
          href="/proposals"
          className="mt-3 inline-block font-label-bold text-[11px] text-primary hover:underline"
        >
          {active.length - PREVIEW_LIMIT} more open · see all
        </Link>
      )}
    </section>
  );
};
