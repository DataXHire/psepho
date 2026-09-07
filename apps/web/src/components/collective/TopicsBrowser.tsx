'use client';

import React, { useMemo } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { appConfig, POLL_CATEGORIES } from '@/lib/config/appConfig';
import { filterPolls, proposalCounts } from '@/lib/collective/pollFilters';
import { Card, Chip } from '@/components/ui';

const TOPIC_ICONS: Record<string, string> = {
  'Work & Tech': 'work',
  'Economy & Future': 'trending_up',
  'Society & Governance': 'account_balance',
  'Culture & Life': 'diversity_3',
};

/**
 * The Topics tab: every category with what it actually holds, so a viewer can
 * see where the debate is before committing to a filter.
 */
export const TopicsBrowser: React.FC = () => {
  const { polls, search, setActiveCategory, setActiveTab } = usePsepho();

  const topics = useMemo(
    () =>
      POLL_CATEGORIES.map((category) => {
        const matching = filterPolls(polls, { category, search });
        const open = matching.filter((poll) => poll.status === 'open');
        return {
          category,
          total: matching.length,
          open: open.length,
          responses: matching.reduce((sum, poll) => sum + poll.totalVotes, 0),
          sample: matching[0],
        };
      }),
    [polls, search]
  );

  const proposals = proposalCounts(polls);

  return (
    <section aria-labelledby="topics-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="topics-heading"
            className="font-display text-2xl font-extrabold uppercase tracking-tight text-on-surface md:text-3xl"
          >
            Topics
          </h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            {appConfig.categories.length - 1} areas of debate
            {proposals.total > 0 && ` · ${proposals.total} raised by you`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-card-gap sm:grid-cols-2 lg:grid-cols-4">
        {topics.map((topic) => (
          <Card
            key={topic.category}
            as="article"
            pad="sm"
            className="flex cursor-pointer flex-col justify-between transition-all hover:border-primary/40 hover:shadow-md"
            role="button"
            tabIndex={0}
            onClick={() => {
              setActiveCategory(topic.category);
              setActiveTab('Trending');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveCategory(topic.category);
                setActiveTab('Trending');
              }
            }}
          >
            <div>
              <span
                className="material-symbols-outlined mb-2 block text-3xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {TOPIC_ICONS[topic.category] ?? 'forum'}
              </span>
              <h3 className="font-headline-md text-base leading-snug text-on-surface">
                {topic.category}
              </h3>
              {topic.sample && (
                <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                  {topic.sample.question}
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-outline-variant/15 pt-2.5">
              <Chip tone={topic.open > 0 ? 'primary' : 'neutral'}>
                {topic.total} {topic.total === 1 ? 'debate' : 'debates'}
              </Chip>
              <span className="text-[10px] tabular-nums text-on-surface-variant">
                {topic.responses.toLocaleString()} responses
              </span>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
};
