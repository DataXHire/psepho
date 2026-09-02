import { IRVResult, IRVRound, IRVTransfer } from './types';

export interface IRVBallot {
  choice: string[]; // ordered list of option IDs
}

export function tabulateIRV(
  candidateIds: string[],
  ballots: IRVBallot[],
  candidateLabels: Record<string, string> = {}
): IRVResult {
  if (candidateIds.length === 0) {
    return {
      winnerId: null,
      isTie: false,
      rounds: [],
    };
  }

  // If single candidate, immediate win
  if (candidateIds.length === 1) {
    const singleId = candidateIds[0];
    const totalVotes = ballots.filter(b => b.choice.includes(singleId)).length;
    return {
      winnerId: singleId,
      isTie: false,
      rounds: [
        {
          roundNumber: 1,
          counts: { [singleId]: totalVotes },
          exhaustedCount: ballots.length - totalVotes,
          summarySentence: `${candidateLabels[singleId] || singleId} won unanimously with ${totalVotes} votes.`,
        },
      ],
    };
  }

  const rounds: IRVRound[] = [];
  const eliminatedSet = new Set<string>();
  let activeCandidates = [...candidateIds];
  let roundNumber = 1;

  while (activeCandidates.length > 1) {
    // 1. Tally votes for active candidates
    const counts: Record<string, number> = {};
    for (const cid of activeCandidates) {
      counts[cid] = 0;
    }
    let exhaustedCount = 0;

    for (const ballot of ballots) {
      // Find first preference that is not eliminated
      const firstActiveChoice = ballot.choice.find(id => activeCandidates.includes(id));
      if (firstActiveChoice) {
        counts[firstActiveChoice] = (counts[firstActiveChoice] || 0) + 1;
      } else {
        exhaustedCount++;
      }
    }

    const totalActiveVotes = ballots.length - exhaustedCount;

    // Check if any candidate has strict majority (> 50% of non-exhausted votes)
    const majorityThreshold = totalActiveVotes / 2;
    const sortedCandidates = [...activeCandidates].sort((a, b) => counts[b] - counts[a]);
    const leaderId = sortedCandidates[0];
    const leaderVotes = counts[leaderId];

    // Check tie where all remaining active candidates have identical votes
    const allTied = activeCandidates.length > 1 && activeCandidates.every(cid => counts[cid] === leaderVotes);

    if (leaderVotes > majorityThreshold) {
      // Winner reached
      rounds.push({
        roundNumber,
        counts,
        exhaustedCount,
        summarySentence: `Round ${roundNumber} — ${candidateLabels[leaderId] || leaderId} reached majority with ${leaderVotes} votes.`,
      });
      return {
        winnerId: leaderId,
        isTie: false,
        rounds,
      };
    }

    if (allTied) {
      // Unbreakable tie
      rounds.push({
        roundNumber,
        counts,
        exhaustedCount,
        summarySentence: `Round ${roundNumber} ended in a tie between all remaining options with ${leaderVotes} votes each.`,
      });
      return {
        winnerId: null,
        isTie: true,
        rounds,
      };
    }

    // 2. Identify candidate to eliminate (lowest votes)
    // Stable tie-break: lowest votes; if tied, first in candidateIds order
    const minVotes = Math.min(...activeCandidates.map(cid => counts[cid]));
    const lowestCandidates = activeCandidates.filter(cid => counts[cid] === minVotes);
    
    // Pick the candidate to eliminate (deterministic: first in candidateIds list)
    const toEliminate = candidateIds.find(cid => lowestCandidates.includes(cid)) || lowestCandidates[0];
    const eliminatedVotes = counts[toEliminate];

    // 3. Compute transfers for ballots whose current first choice is toEliminate
    const nextActiveCandidates = activeCandidates.filter(cid => cid !== toEliminate);
    const transferMap: Record<string, number> = {};
    let transferredToExhausted = 0;

    for (const ballot of ballots) {
      const currentChoice = ballot.choice.find(id => activeCandidates.includes(id));
      if (currentChoice === toEliminate) {
        // Find next choice
        const nextChoice = ballot.choice.find(id => nextActiveCandidates.includes(id));
        if (nextChoice) {
          transferMap[nextChoice] = (transferMap[nextChoice] || 0) + 1;
        } else {
          transferredToExhausted++;
        }
      }
    }

    const transfers: IRVTransfer[] = Object.entries(transferMap).map(([toOptionId, count]) => ({
      toOptionId,
      count,
    }));
    if (transferredToExhausted > 0) {
      transfers.push({
        toOptionId: 'exhausted',
        count: transferredToExhausted,
      });
    }

    // Format plain-language summary line:
    // "Round 2 — Cycling eliminated (12 votes). 8 moved to Walking, 3 to Bus, 1 exhausted."
    const transferParts: string[] = [];
    for (const t of transfers) {
      if (t.toOptionId === 'exhausted') {
        transferParts.push(`${t.count} exhausted`);
      } else {
        const destLabel = candidateLabels[t.toOptionId] || t.toOptionId;
        transferParts.push(`${t.count} moved to ${destLabel}`);
      }
    }

    const transferText = transferParts.length > 0 ? ` ${transferParts.join(', ')}.` : '';
    const eliminatedName = candidateLabels[toEliminate] || toEliminate;
    const summarySentence = `Round ${roundNumber} — ${eliminatedName} eliminated (${eliminatedVotes} votes).${transferText}`;

    rounds.push({
      roundNumber,
      counts,
      exhaustedCount,
      eliminatedOptionId: toEliminate,
      transfers,
      summarySentence,
    });

    eliminatedSet.add(toEliminate);
    activeCandidates = nextActiveCandidates;
    roundNumber++;

    // If only 1 candidate remains after elimination
    if (activeCandidates.length === 1) {
      const lastRemainingId = activeCandidates[0];
      // Compute final tally for this winner
      let finalCount = 0;
      let finalExhausted = 0;
      for (const ballot of ballots) {
        if (ballot.choice.includes(lastRemainingId)) {
          // It counts if lastRemainingId is reached
          const firstRemaining = ballot.choice.find(id => id === lastRemainingId);
          if (firstRemaining) finalCount++;
        } else {
          finalExhausted++;
        }
      }

      rounds.push({
        roundNumber,
        counts: { [lastRemainingId]: finalCount },
        exhaustedCount: ballots.length - finalCount,
        summarySentence: `Round ${roundNumber} — ${candidateLabels[lastRemainingId] || lastRemainingId} won with ${finalCount} votes.`,
      });

      return {
        winnerId: lastRemainingId,
        isTie: false,
        rounds,
      };
    }
  }

  return {
    winnerId: activeCandidates[0] || null,
    isTie: false,
    rounds,
  };
}
