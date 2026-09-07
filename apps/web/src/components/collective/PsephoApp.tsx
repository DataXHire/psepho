'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { PsephoHeader } from './PsephoHeader';
import { FeaturedDebateCard } from './FeaturedDebateCard';
import { PsephoInsightPanel } from './PsephoInsightPanel';
import { DividedDebateCard } from './DividedDebateCard';
import { SurprisingDebateCard } from './SurprisingDebateCard';
import { ForYouSection } from './ForYouSection';
import { AskQuestionModal } from './AskQuestionModal';
import { PersonaModal } from './PersonaModal';
import { PollDetailModal } from './PollDetailModal';
import { PsephoFooter } from './PsephoFooter';

export const PsephoApp: React.FC = () => {
  const { polls, activeTab, activeCategory, setActiveCategory, openAskModal } = usePsepho();
  const [isProposalsMinimized, setIsProposalsMinimized] = useState(false);

  // Categories
  const categories = [
    'All',
    'Work & Tech',
    'Economy & Future',
    'Society & Governance',
    'Culture & Life',
  ];

  // Filter polls by category if not 'All'
  const filteredPolls = activeCategory === 'All'
    ? polls
    : polls.filter((p) => p.category === activeCategory);

  // Group polls into featured, divided, surprising, user-created
  const featuredPoll = filteredPolls.find((p) => p.kind === 'featured') || filteredPolls[0] || polls[0];
  const dividedPolls = filteredPolls.filter((p) => p.kind === 'divided');
  const surprisingPolls = filteredPolls.filter((p) => p.kind === 'surprising');
  const userPolls = filteredPolls.filter((p) => p.kind === 'user');

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* Fixed Header */}
      <PsephoHeader />

      {/* Main Content Area */}
      <main className="flex-grow pt-24 pb-16 max-w-[1200px] w-full mx-auto px-container-padding-mobile md:px-container-padding-desktop">
        {/* Category Filter Bar (Visible when on Topics or as quick filter) */}
        {(activeTab === 'Topics' || activeCategory !== 'All') && (
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-label-bold text-on-surface-variant flex items-center gap-1 mr-2">
              <span className="material-symbols-outlined text-sm">tune</span>
              Topics:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-label-bold whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* User-Created Polls Banner (if any) */}
        {userPolls.length > 0 && (
          <div className="mb-8 p-4 bg-primary/5 rounded-xl border border-primary/20 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">campaign</span>
                <span className="font-label-bold text-xs uppercase text-primary">
                  Your Community Proposals ({userPolls.length})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsProposalsMinimized(!isProposalsMinimized)}
                  className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors px-2 py-1 rounded hover:bg-primary/10"
                  title={isProposalsMinimized ? 'Expand section' : 'Minimize section'}
                >
                  <span className="material-symbols-outlined text-base">
                    {isProposalsMinimized ? 'expand_more' : 'expand_less'}
                  </span>
                  <span>{isProposalsMinimized ? 'Expand' : 'Minimize'}</span>
                </button>
                <button
                  onClick={openAskModal}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + New Proposal
                </button>
              </div>
            </div>

            {!isProposalsMinimized && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-fade-in">
                {userPolls.map((poll) => (
                  <DividedDebateCard key={poll.id} poll={poll} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Featured Section: Hero Debate (70%) + Insight Panel (30%) */}
        {featuredPoll && (
          <section className="flex flex-col lg:flex-row gap-card-gap mb-14">
            <FeaturedDebateCard poll={featuredPoll} />
            <PsephoInsightPanel poll={featuredPoll} />
          </section>
        )}

        {/* WHAT PEOPLE ARE THINKING GRID */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <h2 className="font-display text-2xl md:text-3xl text-on-surface font-extrabold uppercase tracking-tight">
              WHAT PEOPLE ARE THINKING
            </h2>

            {/* Subtle civic integrity assurance */}
            <span className="text-xs text-on-surface-variant font-caption flex items-center gap-1 bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-sm text-primary">shield</span>
              <span>Civic consensus • Zero raw IP storage</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-card-gap">
            {/* SUBSECTION 1: MOST DIVIDED */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2 flex items-center justify-between">
                <span>Most Divided</span>
                <span className="text-[11px] normal-case text-outline-variant">
                  High polarization &amp; deadlock debates
                </span>
              </h3>
            </div>

            {dividedPolls.map((poll) => (
              <DividedDebateCard key={poll.id} poll={poll} />
            ))}

            {/* SUBSECTION 2: MOST SURPRISING */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8">
              <h3 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2 flex items-center justify-between">
                <span>Most Surprising</span>
                <span className="text-[11px] normal-case text-outline-variant">
                  Significant demographic anomaly discoveries
                </span>
              </h3>
            </div>

            {surprisingPolls.map((poll, idx) => (
              <SurprisingDebateCard
                key={poll.id}
                poll={poll}
                variant={idx % 2 === 0 ? 'tertiary' : 'secondary'}
              />
            ))}

            {/* SUBSECTION 3: FOR YOU */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 mt-8">
              <h3 className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2 flex items-center justify-between">
                <span>For You</span>
                <span className="text-[11px] normal-case text-outline-variant">
                  Demographic cohort &amp; district alignment
                </span>
              </h3>
            </div>

            <ForYouSection />
          </div>
        </section>
      </main>

      {/* Footer */}
      <PsephoFooter />

      {/* Interactive Modals */}
      <AskQuestionModal />
      <PersonaModal />
      <PollDetailModal />
    </div>
  );
};
