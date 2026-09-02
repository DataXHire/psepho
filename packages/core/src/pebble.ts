import { PebbleConfig } from './types';

export const MAX_PEBBLES = 120;

/**
 * Calculates the appropriate denomination for a poll where the highest option count is between 121 and 5,000.
 * Clean denomination steps: 2, 5, 10, 20, 25, 40, 50, 100
 */
export function calculatePollDenomination(maxOptionVotes: number): number {
  if (maxOptionVotes <= MAX_PEBBLES) return 1;
  if (maxOptionVotes > 5000) return 1; // Measure bar mode doesn't show denomination

  const rawDenom = Math.ceil(maxOptionVotes / MAX_PEBBLES);
  // Pick standard readable step >= rawDenom
  const steps = [2, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100];
  const matched = steps.find(s => s >= rawDenom);
  return matched || rawDenom;
}

export function getPebbleConfig(votes: number, pollDenomination: number = 1): PebbleConfig {
  if (votes <= 0) {
    return {
      mode: 'exact',
      pebbleCount: 0,
      denomination: 1,
      showDenominationLine: false,
    };
  }

  if (votes <= MAX_PEBBLES) {
    return {
      mode: 'exact',
      pebbleCount: Math.min(votes, MAX_PEBBLES),
      denomination: 1,
      showDenominationLine: false,
    };
  }

  if (votes <= 5000) {
    const denom = pollDenomination > 1 ? pollDenomination : calculatePollDenomination(votes);
    const count = Math.min(MAX_PEBBLES, Math.ceil(votes / denom));
    return {
      mode: 'quantized',
      pebbleCount: count,
      denomination: denom,
      showDenominationLine: true,
      denominationLineText: `Each pebble = ${denom} votes`,
    };
  }

  // > 5000 votes: measure bar mode
  // cluster of 5-8 pebbles at its leading edge
  // deterministic cluster size between 5 and 8
  const clusterSize = 5 + (votes % 4);
  return {
    mode: 'measure',
    pebbleCount: clusterSize,
    denomination: 1,
    leadingPebbles: clusterSize,
    showDenominationLine: false,
  };
}
