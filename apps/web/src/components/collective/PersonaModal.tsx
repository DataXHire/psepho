'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import type { BirthDate, BirthPrecision, UserProfile } from '@/lib/collective/types';
import {
  cohortForBirthDate,
  describeBirthDate,
  isUsableBirthDate,
  precisionOf,
  regionForState,
} from '@/lib/collective/demographics';
import { INDIA_MAP } from '@/lib/collective/geo';
import type { UserProfile as Persona } from '@/lib/collective/types';

/**
 * Spelled out rather than imported from `@/lib/config/environment` on purpose:
 * the bundler folds this expression where it is written, which removes both the
 * panel below and the module it reaches for. Read through an import it stays a
 * runtime check, and the markup and sample data ship to every visitor.
 */
const IS_DEV_BUILD = process.env.NODE_ENV !== 'production';

/**
 * Sample identities, in development only.
 *
 * The condition is written out in full rather than read from a variable: the
 * bundler evaluates it while building its module graph and skips the dead
 * branch entirely, so the module is never pulled in. Behind a `require` inside
 * a function — even an unreachable one — the graph still records the edge and
 * the personas ship to every visitor.
 */
const DEV_PERSONAS: Persona[] =
  process.env.NODE_ENV !== 'production'
    ? // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      (require('@/lib/collective/devPersonas') as { devPersonas: Persona[] }).devPersonas
    : [];
import { Button, Chip, Clamp, Ellipsis, KeyValue, Modal } from '@/components/ui';
import { BirthDateField } from './BirthDateField';
import { LocationField, type LocationValue } from './LocationField';

const FIELD =
  'w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:bg-surface-bright';

export const PersonaModal: React.FC = () => {
  const {
    isPersonaModalOpen,
    closePersonaModal,
    currentProfile,
    setCurrentProfile,
    dataMode,
    setDataMode,
  } = usePsepho();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState<BirthDate | null>(null);
  const [precision, setPrecision] = useState<BirthPrecision>('year');
  const [location, setLocation] = useState<LocationValue>({ stateId: 'in-ka' });

  const usingSamples = IS_DEV_BUILD && dataMode === 'sample';
  const personas = usingSamples ? DEV_PERSONAS : [];
  const canApply = name.trim().length > 0 && isUsableBirthDate(birthDate);

  const applyCustom = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canApply) return;

    const state = INDIA_MAP.shapes.find((shape) => shape.id === location.stateId);
    const profile: UserProfile = {
      id: `user-custom-${Date.now()}`,
      name: name.trim(),
      avatar: name.trim().slice(0, 2).toUpperCase(),
      role: role.trim() || 'Civic participant',
      city: city.trim() || location.districtName || state?.name || '',
      district: location.districtName ?? '',
      districtId: location.districtId,
      stateId: location.stateId,
      stateCode: state?.code ?? '',
      region: regionForState(location.stateId),
      birthDate,
      ageCohort: cohortForBirthDate(birthDate),
      sector: 'General',
    };

    setCurrentProfile(profile);
    closePersonaModal();
  };

  return (
    <Modal
      open={isPersonaModalOpen}
      onClose={closePersonaModal}
      eyebrow="Your profile"
      eyebrowIcon="badge"
      title="Sign in & demographics"
      labelledBy="persona-modal-title"
    >
      <p className="mb-5 text-xs leading-relaxed text-on-surface-variant">
        psepho groups responses by age band and by district. Nothing here is inferred from your
        connection — the platform stores no raw IP address, so anything it knows about you is
        what you type below.
      </p>

      {currentProfile && (
        <div className="mb-5 rounded-lg border border-primary/20 bg-surface-container p-3">
          <KeyValue
            className="text-xs"
            label={
              <>
                <span className="text-on-surface-variant">Active profile: </span>
                <strong className="text-on-surface">{currentProfile.name}</strong>
              </>
            }
            value={
              <button
                type="button"
                onClick={() => {
                  setCurrentProfile(null);
                  closePersonaModal();
                }}
                className="font-semibold text-tertiary hover:underline"
              >
                Sign out
              </button>
            }
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Chip tone="primary">{currentProfile.ageCohort}</Chip>
            {currentProfile.birthDate && (
              <Chip tone="neutral">{describeBirthDate(currentProfile.birthDate)}</Chip>
            )}
            <Chip tone="neutral">
              {currentProfile.district || currentProfile.stateCode} · {currentProfile.region} India
            </Chip>
          </div>
        </div>
      )}

      {/* Sample identities are a development affordance. The whole block is
          compiled out of a production build, so it cannot be reached there. */}
      {IS_DEV_BUILD && (
        <section className="mb-5 rounded-lg border border-dashed border-outline-variant/50 bg-surface-container-low/50 p-3">
          <KeyValue
            className="mb-2"
            label={
              <span className="flex items-center gap-1.5 font-label-bold text-xs text-on-surface">
                <span className="material-symbols-outlined text-sm text-outline">science</span>
                Data mode
                <Chip tone="neutral">dev build only</Chip>
              </span>
            }
            value={
              <span
                role="radiogroup"
                aria-label="Data mode"
                className="inline-flex rounded-full border border-outline-variant/30 bg-surface-container-lowest p-0.5"
              >
                {(['live', 'sample'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={dataMode === mode}
                    onClick={() => setDataMode(mode)}
                    className={`rounded-full px-2.5 py-1 font-label-bold text-[11px] capitalize transition-colors ${
                      dataMode === mode
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </span>
            }
          />
          <p className="text-[11px] leading-relaxed text-on-surface-variant">
            {usingSamples
              ? 'Sample identities are available below. Switch to live to work as a real visitor would.'
              : 'Behaving as a real visitor: no sample identities offered.'}
          </p>

          {usingSamples && (
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {personas.map((persona) => {
                const selected = currentProfile?.id === persona.id;
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => {
                      setCurrentProfile(persona);
                      closePersonaModal();
                    }}
                    className={`rounded-lg border p-2.5 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-outline-variant/30 hover:border-primary hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                        {persona.avatar}
                      </span>
                      <span className="min-w-0">
                        <Ellipsis className="text-xs font-semibold text-on-surface">
                          {persona.name}
                        </Ellipsis>
                        <Ellipsis className="text-[10px] text-on-surface-variant">
                          {persona.role}
                        </Ellipsis>
                      </span>
                    </div>
                    <KeyValue
                      className="mt-2 border-t border-outline-variant/20 pt-1 text-[10px] font-medium text-primary"
                      label={<Ellipsis>{persona.district || persona.city}</Ellipsis>}
                      value={persona.ageCohort}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      <form onSubmit={applyCustom} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-label-bold text-xs text-on-surface-variant">
              Your name
            </span>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Vikram Sen"
              className={FIELD}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-label-bold text-xs text-on-surface-variant">
              What you do <span className="font-normal text-outline">(optional)</span>
            </span>
            <input
              type="text"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Engineer"
              className={FIELD}
            />
          </label>
        </div>

        <BirthDateField
          value={birthDate}
          precision={precision}
          onChange={setBirthDate}
          onPrecisionChange={setPrecision}
        />

        <LocationField value={location} onChange={setLocation} />

        <label className="block">
          <span className="mb-1 block font-label-bold text-xs text-on-surface-variant">
            City or town <span className="font-normal text-outline">(optional)</span>
          </span>
          <input
            type="text"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="e.g. Bengaluru"
            className={FIELD}
          />
        </label>

        <Button type="submit" full disabled={!canApply} icon="person_check" className="mt-1">
          {canApply ? 'Apply profile' : 'Add a name and a year of birth'}
        </Button>

        <Clamp lines={3} className="text-[11px] text-on-surface-variant">
          Stored in this browser only. Sign out at any time and it is removed.
        </Clamp>
      </form>
    </Modal>
  );
};
