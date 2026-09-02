import { describe, it, expect } from 'vitest';
import { tabulateIRV } from '../src/irv';

describe('Instant Runoff Voting (IRV) Tabulation', () => {
  const labels = {
    A: 'Cycling',
    B: 'Walking',
    C: 'Bus',
    D: 'Train',
  };

  it('handles a single candidate', () => {
    const result = tabulateIRV(['A'], [{ choice: ['A'] }, { choice: ['A'] }], labels);
    expect(result.winnerId).toBe('A');
    expect(result.isTie).toBe(false);
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].counts['A']).toBe(2);
  });

  it('handles a unanimous vote', () => {
    const ballots = [
      { choice: ['B', 'A'] },
      { choice: ['B', 'C'] },
      { choice: ['B'] },
    ];
    const result = tabulateIRV(['A', 'B', 'C'], ballots, labels);
    expect(result.winnerId).toBe('B');
    expect(result.rounds.length).toBe(1);
    expect(result.rounds[0].counts['B']).toBe(3);
    expect(result.rounds[0].summarySentence).toContain('reached majority with 3 votes');
  });

  it('handles an unbreakable tie between remaining candidates', () => {
    const ballots = [
      { choice: ['A'] },
      { choice: ['B'] },
    ];
    const result = tabulateIRV(['A', 'B'], ballots, labels);
    expect(result.isTie).toBe(true);
    expect(result.winnerId).toBeNull();
  });

  it('handles exhausted ballots properly', () => {
    const ballots = [
      { choice: ['A'] },       // exhausts after A eliminated
      { choice: ['B', 'C'] },
      { choice: ['C', 'B'] },
      { choice: ['C'] },
    ];
    // A has 1, B has 1, C has 2. Total 4. C has 2 (not > 50%).
    // A eliminated, its 1 ballot has no 2nd choice -> exhausted.
    const result = tabulateIRV(['A', 'B', 'C'], ballots, labels);
    expect(result.winnerId).toBe('C');
    const r1 = result.rounds[0];
    expect(r1.eliminatedOptionId).toBe('A');
    expect(r1.transfers).toEqual([{ toOptionId: 'exhausted', count: 1 }]);
    expect(r1.summarySentence).toContain('1 exhausted');
  });

  it('correctly handles case where first-round leader loses', () => {
    // Round 1:
    // Candidate A: 4 votes (Leader!)
    // Candidate B: 3 votes
    // Candidate C: 2 votes
    // Total votes = 9. Majority threshold = 4.5. Leader A has 4 (< 4.5).
    // Candidate C is eliminated.
    // Both of C's voters prefer Candidate B as second choice.
    // Round 2:
    // Candidate A: 4 votes
    // Candidate B: 3 + 2 = 5 votes (> 4.5) -> B wins!
    const ballots = [
      // 4 for A
      { choice: ['A', 'B', 'C'] },
      { choice: ['A', 'C', 'B'] },
      { choice: ['A'] },
      { choice: ['A'] },
      // 3 for B
      { choice: ['B', 'A', 'C'] },
      { choice: ['B', 'C', 'A'] },
      { choice: ['B'] },
      // 2 for C (who both rank B second)
      { choice: ['C', 'B', 'A'] },
      { choice: ['C', 'B'] },
    ];

    const result = tabulateIRV(['A', 'B', 'C'], ballots, labels);
    expect(result.winnerId).toBe('B');
    expect(result.rounds.length).toBe(2);

    // Round 1 check: C eliminated, votes transferred to B
    const round1 = result.rounds[0];
    expect(round1.counts['A']).toBe(4);
    expect(round1.counts['B']).toBe(3);
    expect(round1.counts['C']).toBe(2);
    expect(round1.eliminatedOptionId).toBe('C');
    expect(round1.transfers).toEqual([{ toOptionId: 'B', count: 2 }]);
    expect(round1.summarySentence).toBe('Round 1 — Bus eliminated (2 votes). 2 moved to Walking.');

    // Round 2 check: B reaches majority with 5 votes
    const round2 = result.rounds[1];
    expect(round2.counts['B']).toBe(5);
    expect(round2.summarySentence).toContain('Walking reached majority with 5 votes');
  });
});
