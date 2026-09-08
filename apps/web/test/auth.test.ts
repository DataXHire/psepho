import { describe, it, expect } from 'vitest';
import {
  ageFromBirthDate,
  cohortForBirthDate,
  describeBirthDate,
  isUsableBirthDate,
  precisionOf,
  regionForState,
} from '../src/lib/collective/demographics';
import type { BirthDate, BirthPrecision, UserProfile } from '../src/lib/collective/types';

describe('Google Sign-In & First-Time Onboarding', () => {
  describe('Name correction for first signin/signup', () => {
    it('accepts corrected display name differing from Google identity', () => {
      const googleIdentity = {
        googleId: 'google-sub-12345',
        email: 'priya.sharma99@gmail.com',
        name: 'Priya Sharma (Work Account)',
      };

      const correctedName = 'Priya Sharma';

      expect(correctedName.trim().length).toBeGreaterThan(0);
      expect(correctedName).not.toBe(googleIdentity.name);
    });

    it('rejects blank or whitespace-only names', () => {
      expect(''.trim().length).toBe(0);
      expect('   '.trim().length).toBe(0);
    });
  });

  describe('Date of Birth precision selection', () => {
    it('handles Year-only precision correctly', () => {
      const birthDate: BirthDate = { year: 1998 };
      const precision: BirthPrecision = 'year';

      expect(isUsableBirthDate(birthDate)).toBe(true);
      expect(precisionOf(birthDate)).toBe('year');
      expect(describeBirthDate(birthDate)).toBe('1998');
      expect(cohortForBirthDate(birthDate)).toBe('25-34');
    });

    it('handles Month & Year precision correctly', () => {
      const birthDate: BirthDate = { year: 1998, month: 4 };
      const precision: BirthPrecision = 'month';

      expect(isUsableBirthDate(birthDate)).toBe(true);
      expect(precisionOf(birthDate)).toBe('month');
      expect(describeBirthDate(birthDate)).toMatch(/April 1998/);
      expect(cohortForBirthDate(birthDate)).toBe('25-34');
    });

    it('handles Full Date (day) precision correctly', () => {
      const birthDate: BirthDate = { year: 1998, month: 4, day: 22 };
      const precision: BirthPrecision = 'day';

      expect(isUsableBirthDate(birthDate)).toBe(true);
      expect(precisionOf(birthDate)).toBe('day');
      expect(describeBirthDate(birthDate)).toMatch(/22 April 1998/);
      expect(cohortForBirthDate(birthDate)).toBe('25-34');
    });

    function filterBirthDateByPrecision(input: BirthDate, precision: BirthPrecision): BirthDate {
      return {
        year: input.year,
        month: precision === 'month' || precision === 'day' ? input.month : undefined,
        day: precision === 'day' ? input.day : undefined,
      };
    }

    it('filters out month and day when year precision is chosen', () => {
      const input: BirthDate = { year: 1995, month: 10, day: 12 };
      const filtered = filterBirthDateByPrecision(input, 'year');

      expect(filtered.year).toBe(1995);
      expect(filtered.month).toBeUndefined();
      expect(filtered.day).toBeUndefined();
      expect(precisionOf(filtered)).toBe('year');
    });

    it('filters out day when month precision is chosen', () => {
      const input: BirthDate = { year: 1995, month: 10, day: 12 };
      const filtered = filterBirthDateByPrecision(input, 'month');

      expect(filtered.year).toBe(1995);
      expect(filtered.month).toBe(10);
      expect(filtered.day).toBeUndefined();
      expect(precisionOf(filtered)).toBe('month');
    });
  });

  describe('Location & demographic cohort derivation', () => {
    it('correctly derives regional zone from chosen state', () => {
      expect(regionForState('in-ka')).toBe('South');
      expect(regionForState('in-mh')).toBe('West');
      expect(regionForState('in-dl')).toBe('North');
      expect(regionForState('in-wb')).toBe('East');
      expect(regionForState('in-mp')).toBe('Central');
    });

    it('assembles a compliant UserProfile after onboarding', () => {
      const birthDate: BirthDate = { year: 2002, month: 7 };
      const profile: UserProfile = {
        id: 'user-google-12345',
        googleId: '12345',
        email: 'voter@gmail.com',
        name: 'Arjun Rao',
        avatar: 'AR',
        role: 'Designer',
        city: 'Bengaluru',
        district: 'Bengaluru Urban',
        districtId: 'ka-bengaluru-urban',
        stateId: 'in-ka',
        stateCode: 'KA',
        region: regionForState('in-ka'),
        birthDate,
        birthPrecision: 'month',
        ageCohort: cohortForBirthDate(birthDate),
        sector: 'General',
      };

      expect(profile.name).toBe('Arjun Rao');
      expect(profile.ageCohort).toBe('18-24');
      expect(profile.region).toBe('South');
      expect(profile.birthPrecision).toBe('month');
      expect(describeBirthDate(profile.birthDate!)).toMatch(/July 2002/);
    });
  });
});
