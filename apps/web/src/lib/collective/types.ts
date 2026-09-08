export type GeoRegion = 'South' | 'West' | 'North' | 'East' | 'Central';

export type AgeCohort = '18-24' | '25-34' | '35-49' | '50+';

/**
 * How precisely someone chose to state when they were born.
 *
 * Analysis only needs the age band, so the year alone is enough. Anyone willing
 * to give more may, but nothing asks them to.
 */
export type BirthPrecision = 'year' | 'month' | 'day';

export interface BirthDate {
  year: number;
  /** 1-12, present at 'month' precision or finer. */
  month?: number;
  /** 1-31, present only at 'day' precision. */
  day?: number;
}

export type TensionLevel = 'Deadlock' | 'High tension' | 'Active Debate' | 'Consensus';

/**
 * Where a poll is in its life.
 *
 * `open` accepts votes. `closed` is final: the result stands and no further
 * vote is counted. A poll with no closing date stays open until its owner
 * closes it by hand.
 */
export type PollStatus = 'open' | 'closed';

export interface PollOption {
  id: string;
  label: string;
  subtitle?: string;
  icon?: string;
  votes: number;
  percentage: number;
}

export interface RegionalStat {
  region: GeoRegion;
  percentage: number;
  votes: number;
  density: 'high' | 'medium' | 'low';
}

export interface DemographicStat {
  cohort: AgeCohort;
  supportPct: number;
  nationalPct: number;
  divergence: number; // supportPct - nationalPct
}

export interface PollBadge {
  label: string;
  type: 'trending' | 'tension' | 'surprising' | 'civic';
  color?: string;
}

export interface Poll {
  id: string;
  slug: string;
  question: string;
  category: 'Work & Tech' | 'Economy & Future' | 'Society & Governance' | 'Culture & Life';
  kind: 'featured' | 'divided' | 'surprising' | 'user';
  options: [PollOption, PollOption, ...PollOption[]];
  totalVotes: number;
  status: PollStatus;
  /** Human-readable time left, or `null` when the poll never closes on its own. */
  closesIn: string | null;
  /** When it was closed, if it has been. */
  closedAt?: string | null;
  badge?: PollBadge;
  regionalBreakdown: Record<GeoRegion, RegionalStat>;
  demographicBreakdown: DemographicStat[];
  discoveryNote?: string | null;
  userVotedOptionId?: string | null;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  googleId?: string;
  role: string;
  city: string;
  /** Display name of the district, e.g. "Bengaluru Urban". */
  district: string;
  /** Map id of that district, e.g. `ka-bengaluru-urban`, when one was chosen. */
  districtId?: string;
  /** Map id of the State or UT, e.g. `in-ka`. */
  stateId: string;
  stateCode: string;
  /** Zone the State reports into. Derived from `stateId`, never asked for. */
  region: GeoRegion;
  /** Exactly as much of the birth date as the viewer chose to give. */
  birthDate?: BirthDate;
  birthPrecision?: BirthPrecision;
  /** Age band used for analysis. Derived from `birthDate` when there is one. */
  ageCohort: AgeCohort;
  sector: string;
}

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
}


export interface AnomalyDiscovery {
  cohort: AgeCohort;
  supportPct: number;
  nationalPct: number;
  delta: number;
  text: string;
}

export type GeoScope = 'world' | 'india' | 'state';

export interface TerritoryMetric {
  id: string;
  name: string;
  code: string;
  votes: number;
  leadingOptionId: string;
  percentages: Record<string, number>;
  intensity: number; // 0..1 scale based on margin
}

export interface ChoicePalette {
  optionId: string;
  color: string;
  lightColor: string;
  textColor: string;
  label: string;
}

