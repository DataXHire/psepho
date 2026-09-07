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
import { initialPolls, samplePersonas } from '../src/lib/collective/seedData';
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
      expect(samplePersonas.length).toBe(4);
      const regions = samplePersonas.map((p) => p.region);
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
      expect(palettes[0].color).toBe('#5D3FD3'); // Signal Purple
      expect(palettes[1].color).toBe('#00838F'); // Ocean Teal
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
});
