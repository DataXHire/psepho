import type { Poll } from '@/lib/collective/types';

/**
 * Everything about the product that is a choice rather than a mechanism.
 * Copy, categories, limits and the look of the page background all live here so
 * they are stated once and can be changed without touching components.
 */

/** Decorative treatment drawn behind the whole page. */
export type BackgroundStyle = 'none' | 'pebble';

export const BACKGROUND_STYLES: Array<{ value: BackgroundStyle; label: string; hint: string }> = [
  { value: 'none', label: 'Plain', hint: 'A flat surface, no decoration' },
  { value: 'pebble', label: 'Pebbles', hint: 'Voting pebbles that drift as you scroll' },
];

export const appConfig = {
  brand: {
    name: 'psepho',
    /**
     * Internal codename for this visual language, shown as a small badge in the
     * footer. Set to null to hide it — it means nothing to a visitor.
     */
    edition: null as string | null,
    origin: 'From Athenian ψῆφος (The Voting Pebble)',
  },

  /** Default page background; a viewer can change it and the choice is kept. */
  background: 'pebble' as BackgroundStyle,

  /** Topic taxonomy. The first entry is the "no filter" pseudo-category. */
  categories: [
    'All',
    'Work & Tech',
    'Economy & Future',
    'Society & Governance',
    'Culture & Life',
  ] as const,

  poll: {
    /** Fewest and most choices a proposal may offer. */
    minOptions: 2,
    maxOptions: 6,
    /** Durations a proposer can pick from; `null` days means it never closes. */
    durations: [
      { label: '24 hours', days: 1 },
      { label: '3 days', days: 3 },
      { label: '7 days', days: 7 },
      { label: '30 days', days: 30 },
      { label: 'Always open', days: null },
    ] as Array<{ label: string; days: number | null }>,
  },

  privacy: {
    assurance: 'Civic consensus • Zero raw IP storage',
    invariant:
      'Zero raw IP addresses stored. Geo-tagging is resolved at the network edge and immediately hashed with a server pepper.',
    terms: 'Public civic consensus instrument. One vote per browser device token.',
    contact: 'civic@psepho.org',
  },
} as const;

/** The categories a poll may actually be filed under (excludes "All"). */
export const POLL_CATEGORIES = appConfig.categories.slice(1) as ReadonlyArray<Poll['category']>;

export type CategoryFilter = (typeof appConfig.categories)[number];
