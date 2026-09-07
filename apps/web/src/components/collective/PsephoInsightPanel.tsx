'use client';

import React from 'react';
import { Poll } from '@/lib/collective/types';
import { GeographicHeatmap } from './GeographicHeatmap';
import { computeRegionalVariance } from '@/lib/collective/analytics';

interface PsephoInsightPanelProps {
  poll: Poll;
}

export const PsephoInsightPanel: React.FC<PsephoInsightPanelProps> = ({ poll }) => {
  const { maxRegion, minRegion, variancePct, takeaway } = computeRegionalVariance(
    poll.regionalBreakdown,
    poll.options[0]?.label.toLowerCase() || 'this option'
  );

  return (
    <div className="w-full lg:w-[30%] bg-surface-container rounded-xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-outline-variant/20 flex flex-col justify-between">
      <div>
        {/* Panel Header */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="material-symbols-outlined text-primary text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            insights
          </span>
          <h2 className="font-label-bold text-label-bold text-primary">psepho Insight</h2>
        </div>

        {/* Title */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-headline-md text-headline-md text-on-surface">Consensus Heatmap</h3>
          <span className="text-[10px] font-caption text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
            Dynamic Gradient
          </span>
        </div>

        {/* Geographic Multi-Scope Gradient Heatmap */}
        <div className="mb-4">
          <GeographicHeatmap poll={poll} initialScope="india" />
        </div>
      </div>

      {/* Dynamic Key Takeaway Callout */}
      <div className="bg-surface-bright p-3.5 rounded-lg border-l-4 border-primary shadow-xs mt-3">
        <p className="font-caption text-caption text-on-surface-variant leading-relaxed">
          <strong className="text-on-surface">Insight: </strong>
          {takeaway}
        </p>
      </div>
    </div>
  );
};

