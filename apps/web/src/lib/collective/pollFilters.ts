import type { Poll } from './types';
import type { CategoryFilter } from '@/lib/config/appConfig';

/** Lifecycle filter used by the proposals page and the home summary. */
export type StatusFilter = 'all' | 'open' | 'closed';

export interface PollQuery {
  search?: string;
  category?: CategoryFilter;
  status?: StatusFilter;
}

/** True when a poll never closes on its own. */
export const isAlwaysOpen = (poll: Poll) => poll.status === 'open' && poll.closesIn === null;

/** What to show where a poll's remaining time goes. */
export function closingLabel(poll: Poll): string {
  if (poll.status === 'closed') return 'Voting closed';
  if (poll.closesIn === null) return 'Open-ended';
  return `Closes in ${poll.closesIn}`;
}

function matchesSearch(poll: Poll, search: string): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    poll.question.toLowerCase().includes(needle) ||
    poll.category.toLowerCase().includes(needle) ||
    poll.options.some((option) => option.label.toLowerCase().includes(needle))
  );
}

/**
 * The one place a poll list is narrowed down. Home, the proposals page and the
 * header counts all run through this so they can never disagree.
 */
export function filterPolls(polls: Poll[], query: PollQuery = {}): Poll[] {
  const { search = '', category = 'All', status = 'all' } = query;
  return polls.filter(
    (poll) =>
      (category === 'All' || poll.category === category) &&
      (status === 'all' || poll.status === status) &&
      matchesSearch(poll, search)
  );
}

/** Proposals raised by this viewer, newest first. */
export function ownProposals(polls: Poll[], query: PollQuery = {}): Poll[] {
  return filterPolls(polls, query)
    .filter((poll) => poll.kind === 'user')
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/** How many of the viewer's proposals sit in each bucket. */
export function proposalCounts(polls: Poll[]): { open: number; closed: number; total: number } {
  const own = polls.filter((poll) => poll.kind === 'user');
  const open = own.filter((poll) => poll.status === 'open').length;
  return { open, closed: own.length - open, total: own.length };
}

/** Poll totals read better rounded once they run into the thousands. */
export function formatResponses(count: number): string {
  if (count < 1000) return count.toLocaleString();
  if (count < 100_000) return `${(count / 1000).toFixed(count < 10_000 ? 1 : 0)}K`;
  return `${(count / 1000).toFixed(0)}K`;
}

/** "1 response" / "12 responses" — the count with the right noun. */
export function responseCount(count: number, abbreviate = true): string {
  const value = abbreviate ? formatResponses(count) : count.toLocaleString();
  return `${value} ${count === 1 ? 'response' : 'responses'}`;
}
