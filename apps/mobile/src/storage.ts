// Storage abstraction for Expo mobile app: tokens, created polls, and offline ballot queue

export interface QueuedBallot {
  slug: string;
  choice: string[];
  ballotToken: string;
  queuedAt: string;
}

export interface StoredPollMeta {
  slug: string;
  question: string;
  creatorToken?: string;
  totalVotes?: number;
  closesAt?: string | null;
  closedAt?: string | null;
  isCreator: boolean;
  votedChoice?: string[];
  receiptCode?: string;
}

// In-memory fallback and local storage cache
const localCache = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  return localCache.get(key) || null;
}

export async function setItem(key: string, value: string): Promise<void> {
  localCache.set(key, value);
}

export async function getQueuedBallots(): Promise<QueuedBallot[]> {
  const data = await getItem('psepho_offline_queue');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function enqueueBallot(ballot: QueuedBallot): Promise<void> {
  const current = await getQueuedBallots();
  current.push(ballot);
  await setItem('psepho_offline_queue', JSON.stringify(current));
}

export async function clearQueuedBallots(): Promise<void> {
  await setItem('psepho_offline_queue', JSON.stringify([]));
}

export async function getSavedPolls(): Promise<StoredPollMeta[]> {
  const data = await getItem('psepho_saved_polls');
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function savePollMeta(poll: StoredPollMeta): Promise<void> {
  const current = await getSavedPolls();
  const existingIdx = current.findIndex((p) => p.slug === poll.slug);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...poll };
  } else {
    current.unshift(poll);
  }
  await setItem('psepho_saved_polls', JSON.stringify(current));
}
