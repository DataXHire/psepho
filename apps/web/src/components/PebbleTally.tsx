import React from 'react';
import { getPebbleConfig, MAX_PEBBLES } from '@psepho/core';
import { PebbleGlyph } from './PebbleGlyph';

interface PebbleTallyProps {
  votes: number;
  color: string;
  denomination?: number;
  percentage?: number;
  newPebbleDropped?: boolean;
}

export function PebbleTally({
  votes,
  color,
  denomination = 1,
  percentage = 0,
  newPebbleDropped = false,
}: PebbleTallyProps) {
  const config = getPebbleConfig(votes, denomination);

  if (votes === 0) {
    return (
      <div className="h-4 flex items-center text-slate text-xs" aria-hidden="true">
        <span className="w-1.5 h-1.5 rounded-full bg-rule inline-block" />
      </div>
    );
  }

  // Mode 3: > 5,000 votes -> solid measure bar with cluster of 5-8 pebbles at leading edge
  if (config.mode === 'measure') {
    const clusterCount = config.leadingPebbles || 6;
    return (
      <div className="relative w-full h-4 flex items-center overflow-hidden">
        {/* Solid measure bar proportional to percentage */}
        <div
          className="h-2 rounded-row transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, Math.max(2, percentage))}%`,
            backgroundColor: color,
          }}
        />
        {/* Cluster of 5-8 pebbles at leading edge */}
        <div className="flex items-center -ml-1 gap-0.5 flex-shrink-0">
          {Array.from({ length: clusterCount }).map((_, i) => (
            <PebbleGlyph
              key={i}
              seed={i + 17}
              color={color}
              size={10}
            />
          ))}
        </div>
      </div>
    );
  }

  // Mode 1 and 2: packed individual or quantized pebbles (capped strictly at MAX_PEBBLES = 120)
  const renderCount = Math.min(config.pebbleCount, MAX_PEBBLES);

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 max-w-full overflow-hidden py-1"
      aria-hidden="true"
    >
      {Array.from({ length: renderCount }).map((_, i) => {
        const isLastPebble = i === renderCount - 1;
        const shouldAnimate = newPebbleDropped && isLastPebble;
        return (
          <PebbleGlyph
            key={i}
            seed={i}
            color={color}
            size={10}
            isAnimated={shouldAnimate}
          />
        );
      })}
    </div>
  );
}
