import { tabulateIRV } from '@psepho/core';

console.log('=== IRV ROUND-BY-ROUND ELIMINATION TEST ===');
console.log('Scenario: First-round leader ultimately loses after preferences transfer');

const candidates = ['A', 'B', 'C'];
const labels = {
  A: 'Candidate A (Initial Leader)',
  B: 'Candidate B (Comeback Winner)',
  C: 'Candidate C (Eliminated First)',
};

// 4 votes for A (44.4%)
// 3 votes for B (33.3%)
// 2 votes for C (22.2%) - both prefer B as 2nd choice
const ballots = [
  { choice: ['A', 'B', 'C'] },
  { choice: ['A', 'C', 'B'] },
  { choice: ['A'] },
  { choice: ['A'] },
  { choice: ['B', 'A', 'C'] },
  { choice: ['B', 'C', 'A'] },
  { choice: ['B'] },
  { choice: ['C', 'B', 'A'] },
  { choice: ['C', 'B'] },
];

const result = tabulateIRV(candidates, ballots, labels);

console.log(`\nFinal Winner: ${labels[result.winnerId as keyof typeof labels]}`);
console.log(`Total Rounds: ${result.rounds.length}\n`);

result.rounds.forEach((r) => {
  console.log(`--- ROUND ${r.roundNumber} ---`);
  console.log(`Vote Counts:`, r.counts);
  console.log(`Exhausted Ballots:`, r.exhaustedCount);
  if (r.eliminatedOptionId) {
    console.log(`Eliminated:`, labels[r.eliminatedOptionId as keyof typeof labels]);
  }
  if (r.transfers) {
    console.log(`Transfers:`, r.transfers);
  }
  console.log(`Plain Summary Sentence: "${r.summarySentence}"\n`);
});
