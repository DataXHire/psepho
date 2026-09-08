'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { appConfig, type CategoryFilter } from '@/lib/config/appConfig';
import { filterPolls, proposalCounts } from '@/lib/collective/pollFilters';
import { Button, Dropdown, SearchField, type DropdownOption } from '@/components/ui';
import { BrandMark } from './BrandMark';

const TABS = ['Trending', 'For You', 'Topics'] as const;

/** Icons the tabs collapse to once the bar runs out of room for words. */
const TAB_ICONS: Record<(typeof TABS)[number], string> = {
  Trending: 'trending_up',
  'For You': 'person',
  Topics: 'category',
};

export const PsephoHeader: React.FC = () => {
  const {
    polls,
    activeTab,
    setActiveTab,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
    openAskModal,
    openPersonaModal,
    currentProfile,
  } = usePsepho();

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Each topic shows how much it actually holds, so an empty filter is visible
  // before it is chosen rather than after.
  const categoryOptions: DropdownOption<CategoryFilter>[] = useMemo(
    () =>
      appConfig.categories.map((category) => ({
        value: category,
        label: category === 'All' ? 'All topics' : category,
        count: filterPolls(polls, { category, search }).length,
      })),
    [polls, search]
  );

  const proposals = useMemo(() => proposalCounts(polls), [polls]);

  return (
    <header className="fixed top-0 z-40 w-full border-b border-outline-variant/15 bg-surface/85 shadow-xs backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-container-padding-mobile md:px-container-padding-desktop">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-2xl font-extrabold text-primary transition-opacity hover:opacity-90 md:text-3xl"
        >
          <BrandMark />
          <span>{appConfig.brand.name}</span>
        </Link>

        <nav aria-label="Sections" className="ml-2 hidden items-center gap-5 lg:flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap pb-1 font-label-bold text-sm transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-primary font-bold text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <nav
          aria-label="Sections"
          className="flex shrink-0 items-center gap-1 lg:hidden"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? 'page' : undefined}
              aria-label={tab}
              title={tab}
              className={`rounded-full p-1.5 transition-colors ${
                activeTab === tab
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{TAB_ICONS[tab]}</span>
            </button>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 items-center gap-2">
          <SearchField
            value={search}
            onChange={setSearch}
            className="hidden w-44 xl:block xl:w-52"
            ariaLabel="Search debates"
          />

          <Dropdown
            value={activeCategory as CategoryFilter}
            options={categoryOptions}
            onChange={setActiveCategory}
            ariaLabel="Filter by topic"
            icon="category"
            align="right"
            size="sm"
            className="hidden w-36 md:block xl:w-40"
          />

          <Link
            href="/proposals"
            title="Your community proposals"
            className="relative inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1.5 font-label-bold text-[11px] text-primary transition-colors hover:bg-primary/20"
          >
            <span className="material-symbols-outlined text-sm">campaign</span>
            <span className="hidden xl:inline">Proposals</span>
            {proposals.total > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold tabular-nums text-on-primary">
                {proposals.open}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label="Search"
            aria-expanded={mobileSearchOpen}
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="shrink-0 rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary xl:hidden"
          >
            <span className="material-symbols-outlined text-lg">search</span>
          </button>

          <Button
            variant="outline"
            icon="add"
            onClick={openAskModal}
            className="px-2.5 sm:px-4"
            aria-label="Ask the collective"
          >
            <span className="hidden sm:inline">Ask</span>
          </Button>

          {currentProfile ? (
            <button
              type="button"
              onClick={openPersonaModal}
              className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1.5 font-label-bold text-xs text-primary transition-colors hover:bg-primary/20"
            >
              <span className="flex h-5 w-5 overflow-hidden items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">
                {currentProfile.avatar && currentProfile.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentProfile.avatar}
                    alt={currentProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  currentProfile.avatar || currentProfile.name[0]
                )}
              </span>
              <span className="hidden md:inline">{currentProfile.name.split(' ')[0]}</span>
              <span className="hidden text-[10px] text-on-surface-variant lg:inline">
                ({currentProfile.region})
              </span>
            </button>
          ) : (
            <Button variant="ghost" onClick={openPersonaModal}>
              Sign In
            </Button>
          )}
        </div>
      </div>

      {/* Narrow screens: search and topics drop below the bar on demand. */}
      {mobileSearchOpen && (
        <div className="flex items-center gap-2 border-t border-outline-variant/15 px-container-padding-mobile py-2 xl:hidden">
          <SearchField value={search} onChange={setSearch} className="min-w-0 flex-1" />
          <Dropdown
            value={activeCategory as CategoryFilter}
            options={categoryOptions}
            onChange={setActiveCategory}
            ariaLabel="Filter by topic"
            icon="category"
            align="right"
            size="sm"
            className="w-36 shrink-0 md:hidden"
          />
        </div>
      )}
    </header>
  );
};
