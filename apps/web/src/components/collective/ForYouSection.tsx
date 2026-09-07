'use client';

import React from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { Button, Chip } from '@/components/ui';

export const ForYouSection: React.FC = () => {
  const { currentProfile, openPersonaModal, polls, setInspectPollId } = usePsepho();

  // If user has not selected a demographic profile
  if (!currentProfile) {
    return (
      <div className="bg-surface-container-low rounded-lg p-6 shadow-xs border border-outline-variant/20 flex items-center justify-center text-center col-span-1 md:col-span-2 lg:col-span-3 py-12">
        <div>
          <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">
            account_circle
          </span>
          <h4 className="font-headline-md text-headline-md text-on-surface mb-2">
            Sign in for personalized insights
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant mb-4 max-w-md mx-auto">
            See how your opinions compare to people with similar interests, age groups, and regional
            locations.
          </p>
          <Button onClick={openPersonaModal} icon="login">
            Sign in to see
          </Button>
        </div>
      </div>
    );
  }

  // When profile is selected: Render personalized cohort comparison
  const userRegion = currentProfile.region;
  const userCohort = currentProfile.ageCohort;

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
      {/* Profile Bar */}
      <div className="bg-surface-container-lowest rounded-xl p-4 md:p-6 border border-outline-variant/20 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-headline-md flex items-center justify-center font-bold text-lg">
            {currentProfile.avatar || currentProfile.name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-headline-md text-headline-md text-on-surface">
                {currentProfile.name}
              </h4>
              <Chip tone="primary">Cohort {userCohort}</Chip>
            </div>
            <p className="font-body-md text-sm text-on-surface-variant">
              {currentProfile.role} • {currentProfile.district}, {currentProfile.city} (
              {userRegion} India)
            </p>
          </div>
        </div>

        <Button variant="outline" size="sm" icon="swap_horiz" onClick={openPersonaModal}>
          Switch profile / location
        </Button>
      </div>

      {/* Cohort Alignment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {polls.slice(0, 3).map((poll) => {
          const demoStat = poll.demographicBreakdown.find((d) => d.cohort === userCohort);
          const regStat = poll.regionalBreakdown[userRegion];
          const topOption = poll.options[0];

          return (
            <div
              key={poll.id}
              className="bg-surface-container-lowest rounded-lg p-5 border border-outline-variant/20 shadow-xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                  {poll.category}
                </span>
                <h5 className="font-headline-md text-base text-on-surface mt-1 mb-3 line-clamp-1">
                  {poll.question}
                </h5>

                <div className="space-y-2 text-xs text-on-surface-variant">
                  <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-md">
                    <span>Your Cohort ({userCohort}):</span>
                    <strong className="text-primary font-bold">
                      {demoStat?.supportPct || topOption.percentage}% for {topOption.label}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-md">
                    <span>{userRegion} India:</span>
                    <strong className="text-secondary font-bold">
                      {regStat?.percentage || 50}%
                    </strong>
                  </div>

                  <div className="flex justify-between items-center p-1 text-[11px]">
                    <span>National Baseline:</span>
                    <span>{topOption.percentage}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectPollId(poll.id)}
                className="mt-4 text-xs text-primary hover:underline font-semibold text-right"
              >
                Inspect Cohort Breakdown →
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
