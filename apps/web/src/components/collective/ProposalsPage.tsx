'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { appConfig, type CategoryFilter } from '@/lib/config/appConfig';
import { ownProposals, proposalCounts, type StatusFilter } from '@/lib/collective/pollFilters';
import {
  Button,
  Dropdown,
  EmptyState,
  SearchField,
  type DropdownOption,
} from '@/components/ui';
import { PsephoHeader } from './PsephoHeader';
import { PsephoFooter } from './PsephoFooter';
import { AppBackground } from './AppBackground';
import { DividedDebateCard } from './DividedDebateCard';
import { AskQuestionModal } from './AskQuestionModal';
import { PersonaModal } from './PersonaModal';
import { PollDetailModal } from './PollDetailModal';

/**
 * Every proposal the viewer has raised, filtered by lifecycle and topic.
 *
 * This is the full surface; the home page only carries a short preview of the
 * ones still open.
 */
export const ProposalsPage: React.FC = () => {
  const { polls, openAskModal, showProposalsPanel, setShowProposalsPanel } = usePsepho();

  // Filters are local to this page: narrowing here should not change the feed.
  const [status, setStatus] = useState<StatusFilter>('open');
  const [category, setCategory] = useState<CategoryFilter>('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => proposalCounts(polls), [polls]);
  const results = useMemo(
    () => ownProposals(polls, { search, category, status }),
    [polls, search, category, status]
  );

  const statusOptions: DropdownOption<StatusFilter>[] = [
    { value: 'open', label: 'Open', hint: 'Still taking votes', count: counts.open },
    { value: 'closed', label: 'Finished', hint: 'Result is final', count: counts.closed },
    { value: 'all', label: 'All proposals', count: counts.total },
  ];

  const categoryOptions: DropdownOption<CategoryFilter>[] = appConfig.categories.map((value) => ({
    value,
    label: value === 'All' ? 'All topics' : value,
    count: ownProposals(polls, { category: value, status }).length,
  }));

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-on-background">
      <AppBackground />
      <PsephoHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-grow px-container-padding-mobile pb-16 pt-24 md:px-container-padding-desktop">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-on-surface-variant">
          <Link href="/" className="hover:text-primary hover:underline">
            Home
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-on-surface">Your proposals</span>
        </nav>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-on-surface md:text-3xl">
              Your community proposals
            </h1>
            <p className="mt-1 text-xs text-on-surface-variant">
              {counts.total === 0
                ? 'You have not raised a debate yet.'
                : `${counts.open} still taking votes · ${counts.closed} finished`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Dismissing the home summary must not be a one-way door. */}
            <Button
              variant="outline"
              icon={showProposalsPanel ? 'visibility_off' : 'visibility'}
              onClick={() => setShowProposalsPanel(!showProposalsPanel)}
            >
              {showProposalsPanel ? 'Hide from home' : 'Show on home'}
            </Button>
            <Button icon="add" onClick={openAskModal}>
              New proposal
            </Button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-low/70 p-3">
          <Dropdown
            value={status}
            options={statusOptions}
            onChange={setStatus}
            label="Status"
            ariaLabel="Filter by status"
            icon="filter_list"
            className="w-52"
          />
          <Dropdown
            value={category}
            options={categoryOptions}
            onChange={setCategory}
            label="Topic"
            ariaLabel="Filter by topic"
            icon="category"
            className="w-56"
          />
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search your proposals"
            className="ml-auto w-full sm:w-64"
          />
        </div>

        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-card-gap md:grid-cols-2 lg:grid-cols-3">
            {results.map((poll) => (
              <DividedDebateCard key={poll.id} poll={poll} owned />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={counts.total === 0 ? 'campaign' : 'filter_alt_off'}
            title={counts.total === 0 ? 'No proposals yet' : 'Nothing matches these filters'}
            body={
              counts.total === 0
                ? 'Raise a question and the collective will weigh in. You decide how long voting stays open.'
                : 'Try a different status or topic, or clear the search.'
            }
            action={
              counts.total === 0 ? (
                <Button icon="add" onClick={openAskModal}>
                  Ask the collective
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatus('all');
                    setCategory('All');
                    setSearch('');
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}
      </main>

      <PsephoFooter />
      <AskQuestionModal />
      <PersonaModal />
      <PollDetailModal />
    </div>
  );
};
