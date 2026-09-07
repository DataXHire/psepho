import { describe, it, expect } from 'vitest';
import {
  computeTensionLevel,
  computeRegionalVariance,
  detectDemographicAnomaly,
  castVoteInPoll,
  getChoicePalettes,
  getScopeTerritories,
  getDrillableStates,
  MIN_REPORTABLE_SAMPLE,
} from '../src/lib/collective/analytics';
import { INDIA_MAP, WORLD_MAP, DISTRICT_MAP_LOADERS } from '../src/lib/collective/geo';
import { choiceColours } from '../src/lib/theme';
import {
  ageFromBirthDate,
  cohortForBirthDate,
  describeBirthDate,
  isUsableBirthDate,
  precisionOf,
  regionForState,
} from '../src/lib/collective/demographics';
import {
  closingLabel,
  filterPolls,
  ownProposals,
  proposalCounts,
} from '../src/lib/collective/pollFilters';
import { initialPolls } from '../src/lib/collective/seedData';
import { devPersonas } from '../src/lib/collective/devPersonas';
import { PollOption, RegionalStat, DemographicStat } from '../src/lib/collective/types';

describe('psepho Collective Analytics & Deduction Engine', () => {
  describe('computeTensionLevel', () => {
    it('correctly classifies a 50/50 vote as Deadlock', () => {
      const options: PollOption[] = [
        { id: '1', label: 'Support', votes: 50, percentage: 50 },
        { id: '2', label: 'Oppose', votes: 50, percentage: 50 },
      ];
      const result = computeTensionLevel(options);
      expect(result.label).toBe('Deadlock');
      expect(result.score).toBe(1);
    });

    it('correctly classifies a 51/49 vote as Deadlock or High tension', () => {
      const options: PollOption[] = [
        { id: '1', label: 'Tool', votes: 51, percentage: 51 },
        { id: '2', label: 'Threat', votes: 49, percentage: 49 },
      ];
      const result = computeTensionLevel(options);
      expect(['Deadlock', 'High tension']).toContain(result.label);
      expect(result.score).toBeCloseTo(0.98);
    });

    it('classifies a 48/52 vote as High tension', () => {
      const options: PollOption[] = [
        { id: '1', label: 'For', votes: 48, percentage: 48 },
        { id: '2', label: 'Against', votes: 52, percentage: 52 },
      ];
      const result = computeTensionLevel(options);
      expect(result.label).toBe('High tension');
    });

    it('classifies an 82/18 vote as Consensus', () => {
      const options: PollOption[] = [
        { id: '1', label: 'Yes', votes: 82, percentage: 82 },
        { id: '2', label: 'No', votes: 18, percentage: 18 },
      ];
      const result = computeTensionLevel(options);
      expect(result.label).toBe('Consensus');
    });
  });

  describe('computeRegionalVariance', () => {
    it('computes highest, lowest regions and natural language takeaway', () => {
      const breakdown: Record<string, RegionalStat> = {
        South: { region: 'South', percentage: 76, votes: 72000, density: 'high' },
        West: { region: 'West', percentage: 71, votes: 48000, density: 'medium' },
        North: { region: 'North', percentage: 68, votes: 44000, density: 'medium' },
        East: { region: 'East', percentage: 63, votes: 20219, density: 'low' },
      };

      const result = computeRegionalVariance(breakdown as any, 'remote work');
      expect(result.maxRegion).toBe('South');
      expect(result.minRegion).toBe('East');
      expect(result.variancePct).toBe(13);
      expect(result.takeaway).toBe(
        'Insight: South India leans most toward remote work, showing a 13% variance from the East.'
      );
    });
  });

  describe('detectDemographicAnomaly', () => {
    it('detects a statistically significant divergence in youth cohort', () => {
      const demographics: DemographicStat[] = [
        { cohort: '18-24', supportPct: 91, nationalPct: 82, divergence: 9 },
        { cohort: '25-34', supportPct: 88, nationalPct: 82, divergence: 6 },
        { cohort: '35-49', supportPct: 76, nationalPct: 82, divergence: -6 },
        { cohort: '50+', supportPct: 64, nationalPct: 82, divergence: -18 },
      ];

      const anomaly = detectDemographicAnomaly(demographics, 82);
      expect(anomaly).not.toBeNull();
      expect(anomaly?.cohort).toBe('50+'); // max abs diff = |-18| = 18
      expect(anomaly?.delta).toBe(-18);
    });
  });

  describe('castVoteInPoll', () => {
    it('immutably increments vote count and recalculates percentages to sum to 100', () => {
      const poll = initialPolls[0];
      const prevVotes = poll.totalVotes;
      const updated = castVoteInPoll(poll, 'opt-remote', 'South', '25-34');

      expect(updated.totalVotes).toBe(prevVotes + 1);
      expect(updated.userVotedOptionId).toBe('opt-remote');
      const sumPct = updated.options.reduce((acc, o) => acc + o.percentage, 0);
      expect(sumPct).toBe(100);
    });

    it('allows changing vote without duplicating vote count', () => {
      const poll = initialPolls[0];
      const voted1 = castVoteInPoll(poll, 'opt-remote', 'South', '25-34');
      const voted2 = castVoteInPoll(voted1, 'opt-office', 'South', '25-34');

      expect(voted2.totalVotes).toBe(voted1.totalVotes); // Revision maintains count
      expect(voted2.userVotedOptionId).toBe('opt-office');
    });
  });

  describe('sample personas & seed data', () => {
    it('has 4 sample personas spanning regions and age brackets', () => {
      expect(devPersonas.length).toBe(4);
      const regions = devPersonas.map((p) => p.region);
      expect(regions).toContain('South');
      expect(regions).toContain('West');
      expect(regions).toContain('North');
      expect(regions).toContain('East');
    });

    it('seed data includes featured, divided, and surprising polls', () => {
      const kinds = initialPolls.map((p) => p.kind);
      expect(kinds).toContain('featured');
      expect(kinds).toContain('divided');
      expect(kinds).toContain('surprising');
    });
  });

  describe('multi-scope geographic heatmap & palettes', () => {
    it('generates distinct color palettes for options', () => {
      const palettes = getChoicePalettes(initialPolls[0].options);
      expect(palettes.length).toBe(2);
      expect(palettes[0].color).toBe(choiceColours[0].color);
      expect(palettes[1].color).toBe(choiceColours[1].color);
      expect(palettes[0].color).not.toBe(palettes[1].color);
    });

    it('generates distinct color palettes for multi-option polls (up to 6 choices)', () => {
      const fourOptions = [
        { id: '1', label: 'Option A', subtitle: '', icon: '', votes: 10, percentage: 25 },
        { id: '2', label: 'Option B', subtitle: '', icon: '', votes: 10, percentage: 25 },
        { id: '3', label: 'Option C', subtitle: '', icon: '', votes: 10, percentage: 25 },
        { id: '4', label: 'Option D', subtitle: '', icon: '', votes: 10, percentage: 25 },
      ];
      const palettes = getChoicePalettes(fourOptions);
      expect(palettes.length).toBe(4);
      const uniqueColors = new Set(palettes.map((p) => p.color));
      expect(uniqueColors.size).toBe(4);
    });

    it('reports only territories with a large enough sample, keyed to real map shapes', () => {
      const poll = initialPolls[0];

      const world = getScopeTerritories('world', poll);
      const india = getScopeTerritories('india', poll);

      // Every territory must correspond to a shape the map can actually draw.
      const worldIds = new Set(WORLD_MAP.shapes.map((s) => s.id));
      const indiaIds = new Set(INDIA_MAP.shapes.map((s) => s.id));
      expect(world.every((t) => worldIds.has(t.id))).toBe(true);
      expect(india.every((t) => indiaIds.has(t.id))).toBe(true);

      expect(world.map((t) => t.id)).toContain('w-356');
      expect(india.map((t) => t.code)).toEqual(
        expect.arrayContaining(['KA', 'MH', 'DL', 'GJ', 'TN', 'TG', 'WB'])
      );

      // Coverage is partial by design: thinly sampled UTs are left out entirely.
      expect(india.length).toBeGreaterThan(12);
      expect(india.length).toBeLessThan(INDIA_MAP.shapes.length);
      expect(india.map((t) => t.code)).not.toContain('LD');

      expect(india.every((t) => t.votes >= MIN_REPORTABLE_SAMPLE.india)).toBe(true);
      expect(world.every((t) => t.votes >= MIN_REPORTABLE_SAMPLE.world)).toBe(true);
    });

    it('shrinks reported coverage as a poll collects fewer responses', () => {
      const big = getScopeTerritories('india', initialPolls[0]);
      const small = getScopeTerritories('india', initialPolls[1]);

      expect(initialPolls[1].totalVotes).toBeLessThan(initialPolls[0].totalVotes);
      expect(small.length).toBeLessThan(big.length);
    });

    it('splits every territory across all of a poll options, summing to 100', () => {
      for (const poll of initialPolls) {
        for (const territory of getScopeTerritories('india', poll)) {
          const values = poll.options.map((o) => territory.percentages[o.id]);
          expect(values.every((v) => typeof v === 'number')).toBe(true);
          expect(values.reduce((a, b) => a + b, 0)).toBe(100);

          const leader = poll.options.find((o) => o.id === territory.leadingOptionId);
          expect(leader).toBeDefined();
          expect(territory.percentages[leader!.id]).toBe(Math.max(...values));
          expect(territory.intensity).toBeGreaterThanOrEqual(0);
          expect(territory.intensity).toBeLessThanOrEqual(1);
        }
      }
    });

    it('resolves districts for a drillable State and leaves thin ones unreported', async () => {
      const poll = initialPolls[0];
      const drillable = getDrillableStates(poll);
      expect(drillable.map((s) => s.id)).toContain('in-ka');

      const map = await DISTRICT_MAP_LOADERS['in-ka']();
      const districts = getScopeTerritories('state', poll, 'in-ka', map.shapes);

      const shapeIds = new Set(map.shapes.map((s) => s.id));
      expect(districts.length).toBeGreaterThan(0);
      expect(districts.every((d) => shapeIds.has(d.id))).toBe(true);
      expect(districts.map((d) => d.name)).toContain('Bengaluru Urban');
      expect(districts.every((d) => d.votes >= MIN_REPORTABLE_SAMPLE.state)).toBe(true);

      // A State nobody can drill into returns nothing rather than fabricating.
      expect(getScopeTerritories('state', poll, 'in-ld', [])).toEqual([]);
    });

    it('draws every map shape from real boundary data', () => {
      expect(INDIA_MAP.shapes).toHaveLength(36);
      expect(INDIA_MAP.shapes.map((s) => s.code)).toEqual(
        expect.arrayContaining(['JK', 'LA', 'AR', 'AN', 'LD'])
      );
      for (const shape of [...INDIA_MAP.shapes, ...WORLD_MAP.shapes]) {
        expect(shape.d.startsWith('M')).toBe(true);
        expect(shape.d.length).toBeGreaterThan(20);
      }
    });
  });

  describe('poll lifecycle & filtering', () => {
    const closed = { ...initialPolls[1], id: 'p-closed', kind: 'user' as const, status: 'closed' as const, closesIn: null };
    const openEnded = { ...initialPolls[2], id: 'p-open', kind: 'user' as const, status: 'open' as const, closesIn: null };
    const pool = [...initialPolls, closed, openEnded];

    it('describes where a poll is in its life', () => {
      expect(closingLabel(closed)).toBe('Voting closed');
      expect(closingLabel(openEnded)).toBe('Open-ended');
      expect(closingLabel(initialPolls[0])).toBe(`Closes in ${initialPolls[0].closesIn}`);
    });

    it('filters by status, category and free text together', () => {
      expect(filterPolls(pool, { status: 'closed' })).toHaveLength(1);
      expect(filterPolls(pool, { status: 'open' })).toHaveLength(pool.length - 1);

      const work = filterPolls(pool, { category: 'Work & Tech' });
      expect(work.length).toBeGreaterThan(0);
      expect(work.every((p) => p.category === 'Work & Tech')).toBe(true);

      const searched = filterPolls(pool, { search: 'remote' });
      expect(searched.length).toBeGreaterThan(0);
      expect(searched.every((p) => /remote/i.test(JSON.stringify(p)))).toBe(true);

      expect(filterPolls(pool, { search: 'zzzz-no-such-debate' })).toHaveLength(0);
    });

    it('separates the viewer own proposals into open and finished', () => {
      const counts = proposalCounts(pool);
      expect(counts.total).toBe(2);
      expect(counts.open).toBe(1);
      expect(counts.closed).toBe(1);

      expect(ownProposals(pool, { status: 'closed' }).map((p) => p.id)).toEqual(['p-closed']);
      expect(ownProposals(pool, { status: 'open' }).map((p) => p.id)).toEqual(['p-open']);
    });

    it('splits every choice across a multi-option poll without losing any', () => {
      const fourWay = {
        ...initialPolls[0],
        options: [
          { id: 'a', label: 'A', votes: 40, percentage: 40 },
          { id: 'b', label: 'B', votes: 30, percentage: 30 },
          { id: 'c', label: 'C', votes: 20, percentage: 20 },
          { id: 'd', label: 'D', votes: 10, percentage: 10 },
        ] as (typeof initialPolls)[0]['options'],
      };

      expect(getChoicePalettes(fourWay.options)).toHaveLength(4);
      for (const territory of getScopeTerritories('india', fourWay)) {
        const values = fourWay.options.map((o) => territory.percentages[o.id]);
        expect(values.every((v) => typeof v === 'number')).toBe(true);
        expect(values.reduce((a, b) => a + b, 0)).toBe(100);
      }
    });
  });

  describe('demographics from a partial birth date', () => {
    const on = new Date(2026, 8, 8); // 8 September 2026

    it('reads a partial date as the middle of what it names', () => {
      // Year only: taken as mid-year, so the age never leans a whole year off.
      expect(ageFromBirthDate({ year: 1994 }, on)).toBe(32);
      expect(ageFromBirthDate({ year: 1994, month: 3 }, on)).toBe(32);
      expect(ageFromBirthDate({ year: 1994, month: 3, day: 18 }, on)).toBe(32);
      // A birthday still to come this year counts as one year younger.
      expect(ageFromBirthDate({ year: 1994, month: 12, day: 31 }, on)).toBe(31);
    });

    it('bands an age the same way whatever precision was given', () => {
      expect(cohortForBirthDate({ year: 2004 })).toBe('18-24');
      expect(cohortForBirthDate({ year: 1994 })).toBe('25-34');
      expect(cohortForBirthDate({ year: 1983, month: 11 })).toBe('35-49');
      expect(cohortForBirthDate({ year: 1970, month: 6, day: 2 })).toBe('50+');
    });

    it('reports back only what was actually shared', () => {
      expect(describeBirthDate({ year: 1994 })).toBe('1994');
      expect(describeBirthDate({ year: 1994, month: 3 })).toMatch(/^March 1994$/);
      expect(describeBirthDate({ year: 1994, month: 3, day: 18 })).toMatch(/^18 March 1994$/);

      expect(precisionOf({ year: 1994 })).toBe('year');
      expect(precisionOf({ year: 1994, month: 3 })).toBe('month');
      expect(precisionOf({ year: 1994, month: 3, day: 18 })).toBe('day');
      expect(precisionOf(undefined)).toBe('year');
    });

    it('rejects a birth date it cannot use', () => {
      expect(isUsableBirthDate(null)).toBe(false);
      expect(isUsableBirthDate({ year: 1800 })).toBe(false);
      expect(isUsableBirthDate({ year: new Date().getFullYear() })).toBe(false);
      expect(isUsableBirthDate({ year: 1994 })).toBe(true);
    });

    it('derives the zone from the State rather than asking twice', () => {
      expect(regionForState('in-ka')).toBe('South');
      expect(regionForState('in-mh')).toBe('West');
      expect(regionForState('in-dl')).toBe('North');
      expect(regionForState('in-wb')).toBe('East');
      expect(regionForState('in-mp')).toBe('Central');
      // Every State the map can draw has a zone.
      for (const shape of INDIA_MAP.shapes) {
        expect(['North', 'South', 'East', 'West', 'Central']).toContain(regionForState(shape.id));
      }
    });

    it('gives every sample persona a real map location', () => {
      const stateIds = new Set(INDIA_MAP.shapes.map((s) => s.id));
      for (const persona of devPersonas) {
        expect(stateIds.has(persona.stateId)).toBe(true);
        expect(persona.region).toBe(regionForState(persona.stateId));
        if (persona.birthDate) {
          expect(persona.ageCohort).toBe(cohortForBirthDate(persona.birthDate));
        }
      }
    });
  });
});
