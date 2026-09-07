'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { samplePersonas } from '@/lib/collective/seedData';
import { AgeCohort, GeoRegion, UserProfile } from '@/lib/collective/types';

export const PersonaModal: React.FC = () => {
  const { isPersonaModalOpen, closePersonaModal, currentProfile, setCurrentProfile } = usePsepho();

  const [customName, setCustomName] = useState('');
  const [customAge, setCustomAge] = useState<AgeCohort>('25-34');
  const [customRegion, setCustomRegion] = useState<GeoRegion>('South');
  const [customCity, setCustomCity] = useState('Bengaluru');
  const [customRole, setCustomRole] = useState('Engineer / Analyst');

  if (!isPersonaModalOpen) return null;

  const handleSelectPersona = (persona: UserProfile) => {
    setCurrentProfile(persona);
    closePersonaModal();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const profile: UserProfile = {
      id: `user-custom-${Date.now()}`,
      name: customName.trim(),
      avatar: customName.slice(0, 2).toUpperCase(),
      role: customRole.trim() || 'Civic Participant',
      city: customCity.trim() || 'Bengaluru',
      district: `${customCity.trim()} District`,
      region: customRegion,
      stateCode: 'IN-LOCAL',
      ageCohort: customAge,
      sector: 'General',
    };

    setCurrentProfile(profile);
    closePersonaModal();
  };

  const handleSignOut = () => {
    setCurrentProfile(null);
    closePersonaModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-outline-variant/30 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={closePersonaModal}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">badge</span>
          <span className="font-label-bold text-xs uppercase tracking-wider text-primary">
            Demographic Persona Switcher
          </span>
        </div>
        <h3 className="font-headline-md text-2xl text-on-surface mb-2">
          Sign In &amp; Demographic Test
        </h3>
        <p className="font-body-md text-xs text-on-surface-variant mb-6">
          To test how psepho dynamically computes subgroup insights (&ldquo;People Like
          You&rdquo;), select a demographic persona or enter custom location details.
        </p>

        {/* Current status pill */}
        {currentProfile && (
          <div className="mb-6 p-3 bg-surface-container rounded-lg border border-primary/20 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-on-surface-variant">Active Profile: </span>
              <strong className="text-on-surface">{currentProfile.name}</strong> (
              {currentProfile.ageCohort} • {currentProfile.region} India)
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-tertiary hover:underline font-semibold"
            >
              Sign Out
            </button>
          </div>
        )}

        {/* Quick Select Personas */}
        <div className="space-y-2.5 mb-6">
          <label className="block font-label-bold text-xs text-on-surface-variant mb-1">
            Choose a Sample Persona
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {samplePersonas.map((persona) => {
              const isSelected = currentProfile?.id === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handleSelectPersona(persona)}
                  className={`p-3 rounded-lg text-left border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-outline-variant/30 hover:border-primary hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-full bg-primary text-on-primary text-xs font-bold flex items-center justify-center">
                      {persona.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-on-surface">{persona.name}</div>
                      <div className="text-[10px] text-on-surface-variant">{persona.role}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-primary font-medium flex justify-between mt-2 pt-1 border-t border-outline-variant/20">
                    <span>{persona.city}</span>
                    <span>Cohort {persona.ageCohort}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-outline-variant/30" />
          <span className="flex-shrink mx-4 text-xs font-medium text-outline-variant uppercase">
            or custom details
          </span>
          <div className="flex-grow border-t border-outline-variant/30" />
        </div>

        {/* Custom Profile Form */}
        <form onSubmit={handleCustomSubmit} className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Vikram Sen"
              className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Age Cohort
              </label>
              <select
                value={customAge}
                onChange={(e) => setCustomAge(e.target.value as any)}
                className="w-full px-2 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="18-24">18-24 (Gen Z / Youth)</option>
                <option value="25-34">25-34 (Early Career)</option>
                <option value="35-49">35-49 (Mid Career)</option>
                <option value="50+">50+ (Experienced / Senior)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Region (India)
              </label>
              <select
                value={customRegion}
                onChange={(e) => setCustomRegion(e.target.value as any)}
                className="w-full px-2 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-xs focus:ring-2 focus:ring-primary outline-none"
              >
                <option value="South">South India</option>
                <option value="West">West India</option>
                <option value="North">North India</option>
                <option value="East">East India</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-on-primary font-label-bold text-xs rounded-full shadow-sm hover:scale-[1.01] active:scale-95 transition-all mt-2"
          >
            Apply Custom Demographic Profile
          </button>
        </form>
      </div>
    </div>
  );
};
