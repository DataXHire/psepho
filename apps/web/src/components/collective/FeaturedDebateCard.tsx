'use client';

import React from 'react';
import { Poll } from '@/lib/collective/types';
import { usePsepho } from '@/lib/collective/PsephoContext';

interface FeaturedDebateCardProps {
  poll: Poll;
}

export const FeaturedDebateCard: React.FC<FeaturedDebateCardProps> = ({ poll }) => {
  const { castVote, setInspectPollId } = usePsepho();
  const userVote = poll.userVotedOptionId;

  return (
    <div className="w-full lg:w-[70%] bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 relative overflow-hidden group flex flex-col justify-between">
      {/* Background Icon Watermark */}
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none select-none">
        <span
          className="material-symbols-outlined text-7xl text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {poll.options[0]?.icon || 'work'}
        </span>
      </div>

      <div>
        {/* Top Badges & Integrity Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-tertiary-container/10 text-tertiary px-3.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="font-label-bold text-label-bold">Trending Debate</span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-on-surface-variant font-caption text-caption bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/20">
            <span className="material-symbols-outlined text-sm text-primary">verified_user</span>
            <span>One vote per browser</span>
          </div>
        </div>

        {/* Question Title */}
        <h1 className="font-display text-headline-lg-mobile md:text-headline-lg mb-8 text-on-surface max-w-2xl tracking-tight leading-tight">
          {poll.question}
        </h1>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {poll.options.map((opt) => {
            const isSelected = userVote === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => castVote(poll.id, opt.id)}
                className={`flex flex-col p-6 rounded-lg border-2 transition-all duration-200 text-left group/btn relative ${
                  isSelected
                    ? 'border-primary bg-surface-container/50 shadow-md ring-2 ring-primary/20 scale-[1.01]'
                    : 'border-outline-variant/30 hover:border-primary hover:bg-surface-container/30 bg-surface-bright shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-95'
                }`}
              >
                {/* Header of Option */}
                <div className="flex items-center justify-between mb-4 w-full">
                  <span
                    className={`material-symbols-outlined text-3xl transition-colors duration-200 ${
                      isSelected
                        ? 'text-primary'
                        : 'text-on-surface-variant group-hover/btn:text-primary'
                    }`}
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {opt.icon || 'how_to_vote'}
                  </span>

                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-label-bold bg-primary text-on-primary px-2 py-0.5 rounded-full">
                        <span className="material-symbols-outlined text-xs">check</span>
                        Voted
                      </span>
                    )}
                    <span
                      className={`font-headline-md text-headline-md ${
                        isSelected ? 'text-primary font-extrabold' : 'text-primary'
                      }`}
                    >
                      {opt.percentage}%
                    </span>
                  </div>
                </div>

                {/* Option Title */}
                <span className="font-headline-md text-headline-md mb-1.5 text-on-surface">
                  {opt.label}
                </span>

                {/* Subtitle */}
                {opt.subtitle && (
                  <span className="font-body-md text-body-md text-on-surface-variant leading-snug">
                    {opt.subtitle}
                  </span>
                )}

                {/* Visual Progress Bar within Option */}
                <div className="mt-4 w-full bg-outline-variant/20 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isSelected ? 'bg-primary' : 'bg-primary/70'
                    }`}
                    style={{ width: `${opt.percentage}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Meta Bar & CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-outline-variant/15 text-on-surface-variant font-caption text-caption">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="material-symbols-outlined text-base text-primary">group</span>
            <span>{poll.totalVotes.toLocaleString()} responses</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">schedule</span>
            <span>Closes in {poll.closesIn}</span>
          </div>
        </div>

        <button
          onClick={() => setInspectPollId(poll.id)}
          className="inline-flex items-center gap-1.5 text-primary hover:text-primary-container font-label-bold text-label-bold hover:underline transition-colors"
        >
          <span className="material-symbols-outlined text-sm">analytics</span>
          <span>Inspect Demographics</span>
        </button>
      </div>
    </div>
  );
};
