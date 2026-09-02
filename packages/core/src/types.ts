export type PollKind = 'single' | 'multi' | 'ranked';
export type IntegrityLevel = 'open' | 'device' | 'verified';
export type VisibilityMode = 'always' | 'after_vote' | 'after_close';

export interface PollOption {
  id: string;
  pollId: string;
  position: number;
  label: string;
}

export interface Poll {
  id: string;
  slug: string;
  question: string;
  kind: PollKind;
  maxChoices: number | null;
  integrity: IntegrityLevel;
  visibility: VisibilityMode;
  allowRevision: boolean;
  opensAt: Date | string;
  closesAt: Date | string | null;
  closedAt: Date | string | null;
  creatorTokenHash: string;
  createdAt: Date | string;
}

export interface OptionTally {
  optionId: string;
  count: number;
  percentage: number;
}

export interface PollTallyResult {
  totalBallots: number;
  tallies: OptionTally[] | null; // null if hidden due to visibility mode
  visibility: VisibilityMode;
  isHidden: boolean;
  closedAt: string | null;
  updatedAt: string;
  irvResult?: IRVResult | null;
}

export interface BallotSubmission {
  choice: string[]; // optionIds (1 for single, 1..N for multi, ranked ordered list for ranked)
  ballotToken: string; // client secret
}

export interface CastBallotResult {
  receiptCode: string;
  castAt: string;
  revised: boolean;
}

export interface IRVTransfer {
  toOptionId: string | 'exhausted';
  count: number;
}

export interface IRVRound {
  roundNumber: number;
  counts: Record<string, number>;
  exhaustedCount: number;
  eliminatedOptionId?: string;
  transfers?: IRVTransfer[];
  summarySentence: string;
}

export interface IRVResult {
  winnerId: string | null;
  isTie: boolean;
  rounds: IRVRound[];
}

export interface PebbleConfig {
  mode: 'exact' | 'quantized' | 'measure';
  pebbleCount: number;
  denomination: number; // votes per pebble (1 for exact, N for quantized)
  leadingPebbles?: number; // 5-8 pebbles for measure bar
  showDenominationLine: boolean;
  denominationLineText?: string;
}
