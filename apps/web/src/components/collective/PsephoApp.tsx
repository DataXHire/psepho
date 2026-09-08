'use client';

import React, { useMemo } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { appConfig } from '@/lib/config/appConfig';
import { filterPolls } from '@/lib/collective/pollFilters';
import { Button, Chip, EmptyState, SectionHeading } from '@/components/ui';
import { PsephoHeader } from './PsephoHeader';
import { AppBackground } from './AppBackground';
import { FeaturedDebateCard } from './FeaturedDebateCard';
import { PsephoInsightPanel } from './PsephoInsightPanel';
import { DividedDebateCard } from './DividedDebateCard';
import { SurprisingDebateCard } from './SurprisingDebateCard';
import { ForYouSection } from './ForYouSection';
import { ProposalsPanel } from './ProposalsPanel';
import { TopicsBrowser } from './TopicsBrowser';
import { AskQuestionModal } from './AskQuestionModal';
import { PersonaModal } from './PersonaModal';
import { FirstSignInModal } from './FirstSignInModal';
import { PollDetailModal } from './PollDetailModal';
import { PsephoFooter } from './PsephoFooter';

export const PsephoApp: React.FC = () => {
  const { polls, activeTab, activeCategory, search, setActiveCategory, setSearch, openAskModal } =
    usePsepho();

  const visible = useMemo(
    () => filterPolls(polls, { category: activeCategory, search }),
    [polls, activeCategory, search]
  );

  const featuredPoll = visible.find((p) => p.kind === 'featured') ?? visible[0];
  const dividedPolls = visible.filter((p) => p.kind === 'divided');
  const surprisingPolls = visible.filter((p) => p.kind === 'surprising');
  const isFiltered = activeCategory !== 'All' || search.trim().length > 0;

  return (
    <div className="relative flex min-h-screen flex-col text-on-background">
      <AppBackground />
      <PsephoHeader />

      <main className="relative z-10 mx-auto w-full max-w-[1200px] flex-grow px-container-padding-mobile pb-16 pt-24 md:px-container-padding-desktop">
        <ProposalsPanel />

        {activeTab === 'Topics' && <TopicsBrowser />}

        {activeTab === 'For You' && (
          <section aria-labelledby="for-you-heading" className="mb-12">
            <h2
              id="for-you-heading"
              className="mb-4 font-display text-2xl font-extrabold uppercase tracking-tight text-on-surface md:text-3xl"
            >
              For you
            </h2>
            <ForYouSection />
          </section>
        )}

        {activeTab !== 'Topics' && isFiltered && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
            <span>
              Showing <strong className="tabular-nums text-on-surface">{visible.length}</strong>{' '}
              {visible.length === 1 ? 'debate' : 'debates'}
            </span>
            {activeCategory !== 'All' && <Chip tone="primary">{activeCategory}</Chip>}
            {search.trim() && <Chip tone="neutral">“{search.trim()}”</Chip>}
            <button
              type="button"
              onClick={() => {
                setActiveCategory('All');
                setSearch('');
              }}
              className="font-label-bold text-primary hover:underline"
            >
              Clear
            </button>
          </div>
        )}

        {activeTab !== 'Topics' && featuredPoll ? (
          <section className="mb-14 flex flex-col gap-card-gap lg:flex-row lg:items-start">
            <FeaturedDebateCard poll={featuredPoll} />
            <PsephoInsightPanel poll={featuredPoll} />
          </section>
        ) : activeTab !== 'Topics' ? (
          <EmptyState
            icon="search_off"
            title="No debates match"
            body="Try another topic, clear the search, or raise the question yourself."
            action={
              <Button icon="add" onClick={openAskModal}>
                Ask the collective
              </Button>
            }
          />
        ) : null}

        {activeTab !== 'Topics' && featuredPoll && (
          <section>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-on-surface md:text-3xl">
                What people are thinking
              </h2>
              <Chip tone="neutral" icon="shield">
                {appConfig.privacy.assurance}
              </Chip>
            </div>

            {dividedPolls.length > 0 && (
              <>
                <SectionHeading
                  title="Most Divided"
                  hint="High polarization & deadlock debates"
                />
                <div className="mb-10 grid grid-cols-1 gap-card-gap md:grid-cols-2 lg:grid-cols-3">
                  {dividedPolls.map((poll) => (
                    <DividedDebateCard key={poll.id} poll={poll} owned={poll.kind === 'user'} />
                  ))}
                </div>
              </>
            )}

            {surprisingPolls.length > 0 && (
              <>
                <SectionHeading
                  title="Most Surprising"
                  hint="Significant demographic anomaly discoveries"
                />
                <div className="mb-10 grid grid-cols-1 gap-card-gap md:grid-cols-2 lg:grid-cols-3">
                  {surprisingPolls.map((poll, index) => (
                    <SurprisingDebateCard
                      key={poll.id}
                      poll={poll}
                      variant={index % 2 === 0 ? 'tertiary' : 'secondary'}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab !== 'For You' && (
              <>
                <SectionHeading
                  title="For You"
                  hint="Demographic cohort & district alignment"
                />
                <ForYouSection />
              </>
            )}
          </section>
        )}
      </main>

      <PsephoFooter />

      <AskQuestionModal />
      <PersonaModal />
      <FirstSignInModal />
      <PollDetailModal />
    </div>
  );
};
