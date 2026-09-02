'use client';

import React, { useState } from 'react';
import { OptionRow } from '@/components/OptionRow';
import { Header } from '@/components/Header';
import { getPebbleConfig, calculatePollDenomination } from '@psepho/core';

export default function VerifyPebblesPage() {
  const counts = [119, 121, 4999, 5001];

  // Rollback on failure test state
  const [testVoted, setTestVoted] = useState(false);
  const [isSimulatingVote, setIsSimulatingVote] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const simulateFailedVote = async () => {
    setErrorMessage(null);
    setIsSimulatingVote(true);
    setTestVoted(true); // Optimistic fill

    // Simulate network delay then route failure
    setTimeout(() => {
      // Visible rollback: revert optimistic fill
      setTestVoted(false);
      setIsSimulatingVote(false);
      setErrorMessage("Your vote didn't reach the server. Retry.");
    }, 450);
  };

  return (
    <>
      <Header />
      <main className="w-full max-w-ballot mx-auto px-4 pb-20 pt-6">
        <h1 className="font-display text-3xl mb-2 text-ink">
          Pebble Boundary & Rollback Verification
        </h1>
        <p className="text-sm text-slate mb-8 font-body">
          Testing pebble rendering modes at boundaries: 119, 121, 4999, and 5001 votes, and optimistic rollback.
        </p>

        {/* Boundary 1: 119 votes (Exact mode, <= 120, no denomination line) */}
        <section id="boundary-119" className="mb-8 p-4 bg-surface border border-rule rounded-sheet">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-ink">Mode 1: 119 Votes (Exact)</h2>
            <span className="text-xs text-slate font-mono">
              Nodes: {getPebbleConfig(119).pebbleCount} (≤ 120) | Denom line: {getPebbleConfig(119).showDenominationLine ? 'YES' : 'NO'}
            </span>
          </div>
          <OptionRow
            id="opt-119"
            position={0}
            label="Option at 119 votes"
            count={119}
            percentage={25.4}
            totalVotes={468}
            denomination={1}
            isVotingMode={false}
          />
        </section>

        {/* Boundary 2: 121 votes (Quantized mode, denomination line appears) */}
        <section id="boundary-121" className="mb-8 p-4 bg-surface border border-rule rounded-sheet">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-ink">Mode 2: 121 Votes (Quantized)</h2>
            <span className="text-xs text-slate font-mono">
              Nodes: {getPebbleConfig(121, 2).pebbleCount} (≤ 120) | Denom: Each pebble = 2 votes
            </span>
          </div>
          <OptionRow
            id="opt-121"
            position={1}
            label="Option at 121 votes"
            count={121}
            percentage={32.0}
            totalVotes={378}
            denomination={2}
            isVotingMode={false}
          />
          <p className="text-xs text-slate mt-2">
            Each pebble = 2 votes
          </p>
        </section>

        {/* Boundary 3: 4,999 votes (Quantized mode near cap) */}
        <section id="boundary-4999" className="mb-8 p-4 bg-surface border border-rule rounded-sheet">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-ink">Mode 2: 4,999 Votes (Quantized Max)</h2>
            <span className="text-xs text-slate font-mono">
              Nodes: {getPebbleConfig(4999, 45).pebbleCount} (≤ 120) | Denom: Each pebble = 45 votes
            </span>
          </div>
          <OptionRow
            id="opt-4999"
            position={2}
            label="Option at 4,999 votes"
            count={4999}
            percentage={58.2}
            totalVotes={8589}
            denomination={calculatePollDenomination(4999)}
            isVotingMode={false}
          />
          <p className="text-xs text-slate mt-2">
            Each pebble = {calculatePollDenomination(4999)} votes
          </p>
        </section>

        {/* Boundary 4: 5,001 votes (Measure bar mode, cluster of 5-8 pebbles, no denom line) */}
        <section id="boundary-5001" className="mb-8 p-4 bg-surface border border-rule rounded-sheet">
          <div className="flex justify-between items-baseline mb-2">
            <h2 className="text-sm font-semibold text-ink">Mode 3: 5,001 Votes (Measure Bar)</h2>
            <span className="text-xs text-slate font-mono">
              Nodes: {getPebbleConfig(5001).pebbleCount} leading cluster pebbles | Denom line: NO
            </span>
          </div>
          <OptionRow
            id="opt-5001"
            position={3}
            label="Option at 5,001 votes"
            count={5001}
            percentage={71.4}
            totalVotes={7004}
            isVotingMode={false}
          />
        </section>

        {/* Failure Rollback Simulation */}
        <section id="rollback-test" className="mt-12 p-6 bg-surface border border-rule rounded-sheet space-y-4">
          <h2 className="font-display text-lg text-ink">Simulate Vote Network Failure (Rollback)</h2>
          <p className="text-xs text-slate font-body">
            Clicking below triggers an optimistic sweep fill, simulates route failure, visibly reverts the fill, and presents the exact error copy:
          </p>

          {errorMessage && (
            <div id="rollback-error-banner" className="p-3.5 border border-alarm/30 bg-paper rounded-row text-sm text-alarm flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={simulateFailedVote}
                className="px-3 py-1 bg-alarm text-surface rounded-interactive font-medium text-xs hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}

          <OptionRow
            id="opt-rollback"
            position={4}
            label="Tap to simulate failed vote"
            count={42}
            percentage={testVoted ? 50 : 25}
            totalVotes={testVoted ? 101 : 100}
            isSelected={testVoted}
            isVotingMode={!isSimulatingVote}
            onSelect={simulateFailedVote}
          />
        </section>
      </main>
    </>
  );
}
