'use client';

import React, { useState, useEffect } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import type { BirthDate, BirthPrecision } from '@/lib/collective/types';
import { isUsableBirthDate } from '@/lib/collective/demographics';
import { Modal, Button, Clamp } from '@/components/ui';
import { BirthDateField } from './BirthDateField';
import { LocationField, type LocationValue } from './LocationField';

const FIELD =
  'w-full rounded-lg border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-sm text-on-surface outline-none transition-all placeholder:text-outline focus:border-primary focus:bg-surface-bright';

export const FirstSignInModal: React.FC = () => {
  const {
    isFirstSignInModalOpen,
    closeFirstSignInModal,
    pendingGoogleUser,
    completeFirstSignIn,
  } = usePsepho();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [city, setCity] = useState('');
  const [birthDate, setBirthDate] = useState<BirthDate | null>(null);
  const [precision, setPrecision] = useState<BirthPrecision>('year');
  const [location, setLocation] = useState<LocationValue>({ stateId: 'in-ka' });
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill name from Google profile when opened
  useEffect(() => {
    if (pendingGoogleUser?.name) {
      setName(pendingGoogleUser.name);
    }
  }, [pendingGoogleUser]);

  const canSubmit = name.trim().length > 0 && isUsableBirthDate(birthDate);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !birthDate) return;

    setSubmitting(true);
    try {
      await completeFirstSignIn({
        name: name.trim(),
        birthDate,
        precision,
        location,
        city: city.trim(),
        role: role.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={isFirstSignInModalOpen}
      onClose={closeFirstSignInModal}
      eyebrow="First sign-in"
      eyebrowIcon="person_add"
      title="Complete your profile"
      labelledBy="first-signin-modal-title"
    >
      <div className="mb-5 rounded-lg border border-primary/20 bg-surface-container-low p-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
          {pendingGoogleUser?.avatar ? (
            typeof pendingGoogleUser.avatar === 'string' && pendingGoogleUser.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pendingGoogleUser.avatar}
                alt={pendingGoogleUser.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              pendingGoogleUser.avatar
            )
          ) : (
            name.slice(0, 2).toUpperCase() || 'G'
          )}
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <p className="font-label-bold text-on-surface">Signed in with Google</p>
          <p className="truncate text-on-surface-variant text-[11px]">{pendingGoogleUser?.email}</p>
        </div>
      </div>

      <p className="mb-5 text-xs leading-relaxed text-on-surface-variant">
        psepho groups collective opinions by age band and district. Before you cast your first ballot,
        verify how your name appears and select what date of birth precision you wish to share.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Correct name */}
        <label className="block">
          <div className="flex items-baseline justify-between mb-1">
            <span className="font-label-bold text-xs text-on-surface-variant">
              Your name
            </span>
            <span className="text-[10px] text-outline">Pre-filled from Google · edit if needed</span>
          </div>
          <input
            type="text"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Vikram Sen"
            className={FIELD}
          />
        </label>

        {/* Date of birth with user-selected precision */}
        <BirthDateField
          value={birthDate}
          precision={precision}
          onChange={setBirthDate}
          onPrecisionChange={setPrecision}
        />

        {/* Voting Location (State & District) */}
        <LocationField value={location} onChange={setLocation} />

        <div className="grid gap-3 sm:grid-cols-2">
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

          <label className="block">
            <span className="mb-1 block font-label-bold text-xs text-on-surface-variant">
              What you do <span className="font-normal text-outline">(optional)</span>
            </span>
            <input
              type="text"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="e.g. Architect"
              className={FIELD}
            />
          </label>
        </div>

        <Button
          type="submit"
          full
          disabled={!canSubmit || submitting}
          icon="check_circle"
          className="mt-2"
        >
          {submitting
            ? 'Saving...'
            : canSubmit
            ? 'Complete sign-in'
            : 'Enter a name and year of birth'}
        </Button>

        <Clamp lines={2} className="text-center text-[11px] text-on-surface-variant">
          Your personal identity is never attached to your secret ballots.
        </Clamp>
      </form>
    </Modal>
  );
};
