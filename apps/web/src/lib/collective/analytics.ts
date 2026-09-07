import {
  Poll,
  PollOption,
  GeoRegion,
  AgeCohort,
  RegionalStat,
  DemographicStat,
  AnomalyDiscovery,
  TensionLevel,
  GeoScope,
  TerritoryMetric,
  ChoicePalette,
} from './types';
import { INDIA_MAP, WORLD_MAP, hasDistrictMap } from './geo';
import { choiceColours } from '@/lib/theme';
import { STATE_REGION } from './demographics';

/**
 * Computes tension/polarization level based on option vote distribution
 */
export function computeTensionLevel(options: PollOption[]): { score: number; label: TensionLevel } {
  if (!options || options.length < 2) {
    return { score: 0, label: 'Consensus' };
  }

  const sorted = [...options].sort((a, b) => b.percentage - a.percentage);
  const diff = Math.abs(sorted[0].percentage - sorted[1].percentage);

  // If 50/50, diff = 0, tension score = 1.0
  const score = Math.max(0, Math.min(1, (100 - diff) / 100));

  if (diff <= 2) {
    return { score, label: 'Deadlock' };
  }
  if (diff <= 6) {
    return { score, label: 'High tension' };
  }
  if (diff <= 15) {
    return { score, label: 'Active Debate' };
  }
  return { score, label: 'Consensus' };
}

/**
 * Computes regional variance across regions
 */
export function computeRegionalVariance(
  regionalBreakdown: Record<GeoRegion, RegionalStat>,
  optionName = 'this option'
): { maxRegion: GeoRegion; minRegion: GeoRegion; variancePct: number; takeaway: string } {
  const regions = (['South', 'West', 'North', 'East'] as GeoRegion[]).filter(
    (r) => regionalBreakdown[r] !== undefined
  );

  if (regions.length === 0) {
    return {
      maxRegion: 'South',
      minRegion: 'East',
      variancePct: 0,
      takeaway: 'Insight: Data evenly distributed across regions.',
    };
  }

  let maxRegion = regions[0];
  let minRegion = regions[0];

  for (const r of regions) {
    if (regionalBreakdown[r].percentage > regionalBreakdown[maxRegion].percentage) {
      maxRegion = r;
    }
    if (regionalBreakdown[r].percentage < regionalBreakdown[minRegion].percentage) {
      minRegion = r;
    }
  }

  const variancePct = Math.round(
    regionalBreakdown[maxRegion].percentage - regionalBreakdown[minRegion].percentage
  );

  const takeaway = `Insight: ${maxRegion} India leans most toward ${optionName}, showing a ${variancePct}% variance from the ${minRegion}.`;

  return { maxRegion, minRegion, variancePct, takeaway };
}

/**
 * Scans demographic cohorts for statistically significant divergence
 */
export function detectDemographicAnomaly(
  demographics: DemographicStat[],
  baselinePct: number
): AnomalyDiscovery | null {
  if (!demographics || demographics.length === 0) return null;

  let maxDiffCohort: DemographicStat | null = null;
  let maxAbsDiff = 0;

  for (const demo of demographics) {
    const absDiff = Math.abs(demo.supportPct - baselinePct);
    if (absDiff > maxAbsDiff) {
      maxAbsDiff = absDiff;
      maxDiffCohort = demo;
    }
  }

  if (maxDiffCohort && maxAbsDiff >= 7) {
    const sign = maxDiffCohort.supportPct > baselinePct ? '+' : '';
    const delta = Math.round(maxDiffCohort.supportPct - baselinePct);
    return {
      cohort: maxDiffCohort.cohort,
      supportPct: maxDiffCohort.supportPct,
      nationalPct: baselinePct,
      delta,
      text: `${maxDiffCohort.supportPct}% support among ${maxDiffCohort.cohort} demographic (${sign}${delta}% vs national average).`,
    };
  }

  return null;
}

/**
 * Immutably recalculates poll votes, percentages, regional stats, and tension levels
 */
export function castVoteInPoll(
  poll: Poll,
  selectedOptionId: string,
  userRegion: GeoRegion = 'South',
  userCohort?: AgeCohort
): Poll {
  const previousOptionId = poll.userVotedOptionId;
  const isSame = previousOptionId === selectedOptionId;
  if (isSame) return poll;

  const isRevision = !!previousOptionId;
  const newTotalVotes = isRevision ? poll.totalVotes : poll.totalVotes + 1;

  const updatedOptions = poll.options.map((opt) => {
    let votes = opt.votes;
    if (opt.id === selectedOptionId) {
      votes += 1;
    } else if (isRevision && opt.id === previousOptionId) {
      votes = Math.max(0, votes - 1);
    }
    return { ...opt, votes };
  });

  // Recalculate percentages
  const sumVotes = updatedOptions.reduce((acc, o) => acc + o.votes, 0);
  const normalizedOptions = updatedOptions.map((opt) => ({
    ...opt,
    percentage: sumVotes > 0 ? Math.round((opt.votes / sumVotes) * 100) : 0,
  }));

  // Ensure percentages sum to exactly 100
  const pctSum = normalizedOptions.reduce((acc, o) => acc + o.percentage, 0);
  if (pctSum !== 100 && normalizedOptions.length > 0) {
    const diff = 100 - pctSum;
    normalizedOptions[0].percentage += diff;
  }

  // Update regional stats
  const regionalBreakdown = { ...poll.regionalBreakdown };
  if (regionalBreakdown[userRegion]) {
    const reg = regionalBreakdown[userRegion];
    const newRegVotes = isRevision ? reg.votes : reg.votes + 1;
    regionalBreakdown[userRegion] = {
      ...reg,
      votes: newRegVotes,
    };
  }

  // Update demographic stats
  let demographicBreakdown = [...poll.demographicBreakdown];
  if (userCohort) {
    demographicBreakdown = demographicBreakdown.map((d) => {
      if (d.cohort === userCohort) {
        return {
          ...d,
          supportPct: Math.min(100, d.supportPct + 1),
        };
      }
      return d;
    });
  }

  // Check if tension badge needs update
  let badge = poll.badge;
  if (poll.kind === 'divided') {
    const tension = computeTensionLevel(normalizedOptions);
    badge = {
      label: tension.label,
      type: 'tension',
    };
  }

  return {
    ...poll,
    totalVotes: newTotalVotes,
    options: normalizedOptions as [PollOption, PollOption, ...PollOption[]],
    regionalBreakdown,
    demographicBreakdown,
    badge,
    userVotedOptionId: selectedOptionId,
  };
}

/**
 * Choice colours come from the theme, so a choice looks the same on a card, on
 * the map and in the create form.
 */
export function getChoicePalettes(options: PollOption[]): ChoicePalette[] {
  return options.map((opt, idx) => {
    const pal = choiceColours[idx % choiceColours.length];
    return {
      optionId: opt.id,
      color: pal.color,
      lightColor: pal.lightColor,
      textColor: pal.textColor,
      label: opt.label,
    };
  });
}

// ---------------------------------------------------------------------------
// Geographic modelling
//
// Territories are only reported where the modelled sample is large enough to
// say anything. Everywhere else the map deliberately returns nothing, so the
// UI can render those areas as inert: no colour, no hover, no drill-down.
// ---------------------------------------------------------------------------

/** Smallest modelled sample a territory needs before it is reported at all. */
export const MIN_REPORTABLE_SAMPLE: Record<GeoScope, number> = {
  world: 250,
  india: 150,
  state: 40,
};

/** Rough share of the national population, used to split a zone's responses. */
const STATE_WEIGHT: Record<string, number> = {
  'in-up': 16.5, 'in-mh': 9.3, 'in-br': 8.6, 'in-wb': 7.5, 'in-mp': 6.0,
  'in-tn': 5.9, 'in-rj': 5.7, 'in-ka': 5.0, 'in-gj': 5.0, 'in-ap': 4.1,
  'in-od': 3.5, 'in-tg': 2.9, 'in-kl': 2.8, 'in-jh': 2.7, 'in-as': 2.6,
  'in-pb': 2.3, 'in-cg': 2.1, 'in-hr': 2.1, 'in-dl': 1.4, 'in-jk': 1.0,
  'in-uk': 0.8, 'in-hp': 0.6, 'in-tr': 0.3, 'in-ml': 0.25, 'in-mn': 0.24,
  'in-nl': 0.16, 'in-ga': 0.12, 'in-ar': 0.11, 'in-py': 0.1, 'in-mz': 0.09,
  'in-ch': 0.09, 'in-sk': 0.05, 'in-dh': 0.05, 'in-an': 0.03, 'in-la': 0.02,
  'in-ld': 0.005,
};

/**
 * Share of responses cast outside India, as a multiple of the Indian total.
 * Keyed by the numeric ISO 3166-1 code the world map uses.
 */
const DIASPORA_SHARE: Record<string, number> = {
  'w-840': 0.052, // United States
  'w-784': 0.031, // United Arab Emirates
  'w-826': 0.024, // United Kingdom
  'w-124': 0.016, // Canada
  'w-682': 0.014, // Saudi Arabia
  'w-36': 0.011, // Australia
  'w-702': 0.008, // Singapore
  'w-458': 0.006, // Malaysia
  'w-634': 0.005, // Qatar
  'w-512': 0.004, // Oman
  'w-414': 0.004, // Kuwait
  'w-276': 0.003, // Germany
  'w-554': 0.003, // New Zealand
  'w-710': 0.003, // South Africa
  'w-528': 0.002, // Netherlands
  'w-372': 0.002, // Ireland
};

/**
 * Districts that carry far more of a State's responses than population alone
 * suggests — the metros where the platform is actually used. Everything else
 * falls back to a stable pseudo-random weight.
 */
const METRO_DISTRICTS: Record<string, number> = {
  'ka-bengaluru-urban': 9, 'ka-mysuru': 2.2, 'ka-dakshina-kannada': 2,
  'mh-mumbai': 7, 'mh-thane': 4, 'mh-pune': 6, 'mh-nagpur': 2.4,
  'dl-delhi': 9,
  'tg-hyderabad': 7, 'tg-medchal-malkajgiri': 4, 'tg-ranga-reddy': 3.4,
  'tn-chennai': 6.5, 'tn-coimbatore': 3, 'tn-chengalpattu': 2.6, 'tn-madurai': 2,
  'gj-ahmedabad': 5.5, 'gj-surat': 4, 'gj-vadodara': 2.4, 'gj-gandhinagar': 2,
  'wb-kolkata': 6, 'wb-north-24-parganas': 3.4, 'wb-howrah': 2.4,
  'up-gautam-buddha-nagar': 5, 'up-ghaziabad': 3.6, 'up-lucknow': 3.4, 'up-kanpur-nagar': 2.4,
  'hr-gurugram': 6, 'hr-faridabad': 3,
  'pb-ludhiana': 3, 'pb-s-a-s-nagar': 2.6, 'pb-amritsar': 2,
  'kl-ernakulam': 4, 'kl-thiruvananthapuram': 3.4, 'kl-kozhikode': 2.2,
  'ap-visakhapatnam': 4, 'ap-ntr': 2.6, 'ap-guntur': 2,
  'rj-jaipur': 5, 'rj-jodhpur': 2.2,
  'mp-indore': 5, 'mp-bhopal': 3.6, 'mp-jabalpur': 2,
  'cg-raipur': 4,
  'br-patna': 4.5,
  'jh-ranchi': 3.4, 'jh-purbi-singhbhum': 2.4,
  'od-khordha': 4, 'od-cuttack': 2,
  'as-kamrup-metropolitan': 4,
  'uk-dehradun': 3.4,
  'ch-chandigarh': 6,
  'ga-north-goa': 2.4,
};

/** Stable 0..1 value for a set of strings — same inputs always give same output. */
function stableUnit(...parts: string[]): number {
  let h = 2166136261;
  for (const part of parts) {
    for (let i = 0; i < part.length; i += 1) {
      h ^= part.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0) / 4294967296;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Splits 100% across a poll's options, giving `leadPct` to the first option and
 * sharing the rest in proportion to the national result. Always sums to 100.
 */
function distributePercentages(options: PollOption[], leadPct: number): Record<string, number> {
  const [first, ...rest] = options;
  const percentages: Record<string, number> = { [first.id]: leadPct };
  if (rest.length === 0) {
    percentages[first.id] = 100;
    return percentages;
  }

  const restTotal = rest.reduce((sum, o) => sum + o.percentage, 0);
  const remaining = 100 - leadPct;
  let assigned = 0;

  rest.forEach((option, index) => {
    const isLast = index === rest.length - 1;
    const share = restTotal > 0 ? option.percentage / restTotal : 1 / rest.length;
    const value = isLast ? remaining - assigned : Math.round(remaining * share);
    percentages[option.id] = value;
    assigned += value;
  });

  return percentages;
}

/** Turns a lead percentage and a sample size into a full territory metric. */
function toMetric(
  poll: Poll,
  territory: { id: string; name: string; code: string },
  leadPct: number,
  votes: number
): TerritoryMetric {
  const percentages = distributePercentages(poll.options, leadPct);
  const sorted = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
  const evenSplit = 100 / poll.options.length;

  return {
    ...territory,
    votes,
    leadingOptionId: sorted[0][0],
    percentages,
    // 0 when the territory is split evenly, 1 when one choice takes everything.
    intensity: clamp((sorted[0][1] - evenSplit) / (100 - evenSplit), 0, 1),
  };
}

/** States & UTs with enough responses to report, keyed off the poll's zone data. */
export function getIndiaTerritories(poll: Poll): TerritoryMetric[] {
  const zoneWeights: Partial<Record<GeoRegion, number>> = {};
  for (const [stateId, region] of Object.entries(STATE_REGION)) {
    zoneWeights[region] = (zoneWeights[region] ?? 0) + (STATE_WEIGHT[stateId] ?? 0);
  }

  const territories: TerritoryMetric[] = [];

  for (const shape of INDIA_MAP.shapes) {
    const region = STATE_REGION[shape.id];
    const zone = region ? poll.regionalBreakdown[region] : undefined;
    if (!zone) continue;

    const zoneWeight = zoneWeights[region] ?? 0;
    const share = zoneWeight > 0 ? (STATE_WEIGHT[shape.id] ?? 0) / zoneWeight : 0;
    const votes = Math.round(zone.votes * share);
    if (votes < MIN_REPORTABLE_SAMPLE.india) continue;

    // States move a few points either side of their zone, consistently per poll.
    const swing = (stableUnit(poll.id, shape.id) - 0.5) * 9;
    const leadPct = Math.round(clamp(zone.percentage + swing, 6, 94));

    territories.push(
      toMetric(poll, { id: shape.id, name: shape.name, code: shape.code }, leadPct, votes)
    );
  }

  return territories;
}

/** Countries with enough responses to report. India carries the domestic total. */
export function getWorldTerritories(poll: Poll): TerritoryMetric[] {
  const national = poll.options[0].percentage;
  const territories: TerritoryMetric[] = [];

  for (const shape of WORLD_MAP.shapes) {
    const isIndia = shape.id === 'w-356';
    const votes = isIndia
      ? poll.totalVotes
      : Math.round(poll.totalVotes * (DIASPORA_SHARE[shape.id] ?? 0));
    if (votes < MIN_REPORTABLE_SAMPLE.world) continue;

    const swing = isIndia ? 0 : (stableUnit(poll.id, shape.id) - 0.45) * 26;
    const leadPct = Math.round(clamp(national + swing, 6, 94));

    territories.push(
      toMetric(poll, { id: shape.id, name: shape.name, code: shape.code }, leadPct, votes)
    );
  }

  return territories;
}

/**
 * Districts of one State with enough responses to report. The caller passes the
 * State's districts because district geometry is loaded on demand.
 */
export function getDistrictTerritories(
  poll: Poll,
  stateId: string,
  districts: Array<{ id: string; name: string }>
): TerritoryMetric[] {
  const state = getIndiaTerritories(poll).find((t) => t.id === stateId);
  if (!state || districts.length === 0) return [];

  const weightOf = (id: string) => METRO_DISTRICTS[id] ?? 0.55 + stableUnit(id) * 0.9;
  const totalWeight = districts.reduce((sum, d) => sum + weightOf(d.id), 0);
  const leadOptionPct = state.percentages[poll.options[0].id] ?? poll.options[0].percentage;

  const territories: TerritoryMetric[] = [];

  for (const district of districts) {
    const weight = weightOf(district.id);
    const votes = Math.round(state.votes * (weight / totalWeight));
    if (votes < MIN_REPORTABLE_SAMPLE.state) continue;

    // Metros swing further from the State average than the rest of the State.
    const isMetro = district.id in METRO_DISTRICTS;
    const spread = isMetro ? 16 : 11;
    const swing = (stableUnit(poll.id, district.id) - (isMetro ? 0.3 : 0.5)) * spread;
    const leadPct = Math.round(clamp(leadOptionPct + swing, 6, 94));

    territories.push(
      toMetric(poll, { id: district.id, name: district.name, code: state.code }, leadPct, votes)
    );
  }

  return territories;
}

/**
 * Territory metrics for a geographic scope. Territories with too small a sample
 * are simply absent — callers should treat a missing entry as "no data here".
 */
export function getScopeTerritories(
  scope: GeoScope,
  poll: Poll,
  stateId = 'in-ka',
  districts: Array<{ id: string; name: string }> = []
): TerritoryMetric[] {
  if (scope === 'world') return getWorldTerritories(poll);
  if (scope === 'state') return getDistrictTerritories(poll, stateId, districts);
  return getIndiaTerritories(poll);
}

/** States & UTs a viewer can drill into for this poll: reportable and mapped. */
export function getDrillableStates(poll: Poll): Array<{ id: string; name: string; code: string }> {
  return getIndiaTerritories(poll)
    .filter((t) => hasDistrictMap(t.id))
    .map((t) => ({ id: t.id, name: t.name, code: t.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
