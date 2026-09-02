import { describe, it, expect } from 'vitest';
import { getPebbleConfig, calculatePollDenomination, MAX_PEBBLES } from '../src/pebble';

describe('Pebble Logic and Denominations', () => {
  it('never specifies more than 120 pebble nodes across all modes', () => {
    const testCounts = [0, 1, 50, 119, 120, 121, 500, 1000, 4999, 5000, 5001, 100000];
    for (const count of testCounts) {
      const config = getPebbleConfig(count);
      expect(config.pebbleCount).toBeLessThanOrEqual(MAX_PEBBLES);
    }
  });

  it('renders exact mode up to 120 votes with no denomination line', () => {
    const c119 = getPebbleConfig(119);
    expect(c119.mode).toBe('exact');
    expect(c119.pebbleCount).toBe(119);
    expect(c119.showDenominationLine).toBe(false);

    const c120 = getPebbleConfig(120);
    expect(c120.mode).toBe('exact');
    expect(c120.pebbleCount).toBe(120);
    expect(c120.showDenominationLine).toBe(false);
  });

  it('renders quantized mode between 121 and 5,000 with denomination line', () => {
    const c121 = getPebbleConfig(121, 2);
    expect(c121.mode).toBe('quantized');
    expect(c121.showDenominationLine).toBe(true);
    expect(c121.pebbleCount).toBeLessThanOrEqual(MAX_PEBBLES);
    expect(c121.denominationLineText).toBe('Each pebble = 2 votes');

    const denomFor4800 = calculatePollDenomination(4800);
    expect(denomFor4800).toBe(40);
    const c4800 = getPebbleConfig(4800, denomFor4800);
    expect(c4800.denominationLineText).toBe('Each pebble = 40 votes');

    const c4999 = getPebbleConfig(4999, 50);
    expect(c4999.mode).toBe('quantized');
    expect(c4999.showDenominationLine).toBe(true);
  });

  it('renders measure bar mode with leading pebbles over 5,000 votes without denomination line', () => {
    const c5001 = getPebbleConfig(5001);
    expect(c5001.mode).toBe('measure');
    expect(c5001.showDenominationLine).toBe(false);
    expect(c5001.leadingPebbles).toBeGreaterThanOrEqual(5);
    expect(c5001.leadingPebbles).toBeLessThanOrEqual(8);
  });
});
