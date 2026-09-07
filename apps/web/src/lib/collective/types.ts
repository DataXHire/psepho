export type GeoRegion = 'South' | 'West' | 'North' | 'East' | 'Central';

export type AgeCohort = '18-24' | '25-34' | '35-49' | '50+';

export type TensionLevel = 'Deadlock' | 'High tension' | 'Active Debate' | 'Consensus';

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
  closesIn: string;
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
  role: string;
  city: string;
  district: string;
  region: GeoRegion;
  stateCode: string;
  ageCohort: AgeCohort;
  sector: string;
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

