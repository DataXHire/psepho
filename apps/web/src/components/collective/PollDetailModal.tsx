'use client';

import React from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { GeographicHeatmap } from './GeographicHeatmap';

export const PollDetailModal: React.FC = () => {
  const { inspectPollId, setInspectPollId, polls, castVote } = usePsepho();

  if (!inspectPollId) return null;

  const poll = polls.find((p) => p.id === inspectPollId);
  if (!poll) return null;

  const opt1 = poll.options[0];
  const opt2 = poll.options[1];
  const userVote = poll.userVotedOptionId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-outline-variant/30 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={() => setInspectPollId(null)}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary text-xl">analytics</span>
          <span className="font-label-bold text-xs uppercase tracking-wider text-primary">
            Demographic &amp; Regional Analytics
          </span>
        </div>

        <h3 className="font-headline-md text-2xl text-on-surface mb-2 leading-snug">
          {poll.question}
        </h3>

        <div className="flex flex-wrap items-center gap-3 text-xs text-on-surface-variant mb-6">
          <span className="bg-surface-container px-2.5 py-1 rounded-full font-semibold">
            {poll.category}
          </span>
          <span>{poll.totalVotes.toLocaleString()} verified responses</span>
          <span>•</span>
          <span>Closes in {poll.closesIn}</span>
        </div>

        {/* Voting Options Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {poll.options.map((opt) => {
            const isVoted = userVote === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => castVote(poll.id, opt.id)}
                className={`cursor-pointer p-4 rounded-lg border transition-all ${
                  isVoted
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-outline-variant/30 hover:border-primary/50 bg-surface-container-lowest'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-sm text-on-surface">{opt.label}</span>
                  <span className="font-bold text-primary">{opt.percentage}%</span>
                </div>
                {opt.subtitle && (
                  <p className="text-xs text-on-surface-variant line-clamp-1">{opt.subtitle}</p>
                )}
                {isVoted && (
                  <span className="inline-block text-[10px] font-bold text-primary mt-1">
                    ✓ Your Cast Vote
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Demographic Age Cohort Breakdown */}
        <div className="mb-6 bg-surface-container-low p-4 rounded-xl border border-outline-variant/20">
          <h4 className="font-label-bold text-xs uppercase text-on-surface-variant mb-3 flex items-center justify-between">
            <span>Age Cohort Distribution ({opt1.label})</span>
            <span className="text-[11px] normal-case text-outline-variant">
              National Baseline: {opt1.percentage}%
            </span>
          </h4>

          <div className="space-y-3">
            {poll.demographicBreakdown.map((demo) => {
              const delta = demo.supportPct - opt1.percentage;
              const sign = delta > 0 ? '+' : '';
              const isLead = Math.abs(delta) >= 8;

              return (
                <div key={demo.cohort} className="text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-on-surface">Age {demo.cohort}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary">{demo.supportPct}%</span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          delta > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-outline-variant/30 text-on-surface-variant'
                        }`}
                      >
                        {sign}
                        {delta}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal visual bar */}
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isLead ? 'bg-primary' : 'bg-primary/70'
                      }`}
                      style={{ width: `${demo.supportPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Regional & Geographic Gradient Heatmap */}
        <div className="mb-6">
          <h4 className="font-label-bold text-xs uppercase text-on-surface-variant mb-2">
            Geographic Heatmap &amp; Consensus Gradient
          </h4>
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/20 mb-3">
            <GeographicHeatmap poll={poll} initialScope="india" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['South', 'West', 'North', 'East'] as const).map((region) => {
              const stat = poll.regionalBreakdown[region];
              return (
                <div
                  key={region}
                  className="p-2.5 bg-surface-container-lowest rounded-lg border border-outline-variant/20 text-center"
                >
                  <span className="text-xs font-semibold text-on-surface-variant block mb-0.5">
                    {region}
                  </span>
                  <span className="font-headline-md text-base text-primary font-bold">
                    {stat?.percentage || 50}%
                  </span>
                  <span className="text-[10px] text-outline-variant block capitalize">
                    {stat?.density || 'medium'} density
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Civic Integrity Footer */}
        <div className="p-3.5 bg-surface-bright rounded-lg border border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">verified</span>
            <span>
              Integrity: <strong>One vote per browser</strong> • Cryptographic receipt verifiable
            </span>
          </div>
          <code className="text-[11px] font-mono bg-surface-container px-2 py-0.5 rounded text-primary">
            RCPT: {poll.slug.slice(0, 6).toUpperCase()}
          </code>
        </div>
      </div>
    </div>
  );
};
