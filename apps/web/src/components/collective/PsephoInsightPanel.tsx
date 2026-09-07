'use client';

import React from 'react';
import type { Poll } from '@/lib/collective/types';
import { computeRegionalVariance } from '@/lib/collective/analytics';
import { Chip } from '@/components/ui';
import { GeographicHeatmap } from './GeographicHeatmap';

interface PsephoInsightPanelProps {
  poll: Poll;
}

export const PsephoInsightPanel: React.FC<PsephoInsightPanelProps> = ({ poll }) => {
  const { takeaway } = computeRegionalVariance(
    poll.regionalBreakdown,
    poll.options[0]?.label.toLowerCase() ?? 'this option'
  );

  return (
    <aside className="flex w-full min-w-0 flex-col justify-between rounded-xl border border-outline-variant/20 bg-surface-container p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] md:p-6 lg:w-[30%]">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="material-symbols-outlined text-xl text-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            insights
          </span>
          <h2 className="font-label-bold text-label-bold text-primary">psepho Insight</h2>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-headline-md text-headline-md text-on-surface">Consensus Heatmap</h3>
          <Chip tone="primary">Dynamic gradient</Chip>
        </div>

        <div className="mb-4 min-w-0">
          <GeographicHeatmap poll={poll} initialScope="india" />
        </div>
      </div>

      <div className="mt-3 rounded-lg border-l-4 border-primary bg-surface-bright p-3.5 shadow-xs">
        <p className="font-caption text-caption leading-relaxed text-on-surface-variant">
          <strong className="text-on-surface">Insight: </strong>
          {takeaway.replace(/^Insight:\s*/, '')}
        </p>
      </div>
    </aside>
  );
};
