import type { AgeCohort, BirthDate, BirthPrecision, GeoRegion } from './types';

/**
 * Turning what someone chose to share about themselves into the few facts
 * analysis actually needs.
 */

export const AGE_COHORTS: AgeCohort[] = ['18-24', '25-34', '35-49', '50+'];

/** Youngest year of birth that could still be an adult today. */
export const MIN_BIRTH_YEAR = 1920;

export function currentYear(): number {
  return new Date().getFullYear();
}

export const MAX_BIRTH_YEAR = () => currentYear() - 13;

export function precisionOf(birthDate: BirthDate | undefined): BirthPrecision {
  if (!birthDate) return 'year';
  if (birthDate.day != null) return 'day';
  if (birthDate.month != null) return 'month';
  return 'year';
}

/**
 * Age in whole years. A partial date is read as the middle of what it names —
 * mid-year for a bare year, mid-month for a month — so a missing day never
 * biases the age up or down by more than a few months.
 */
export function ageFromBirthDate(birthDate: BirthDate, on: Date = new Date()): number {
  const month = birthDate.month ?? 7;
  const day = birthDate.day ?? (birthDate.month == null ? 1 : 15);
  const born = new Date(birthDate.year, month - 1, day);

  let age = on.getFullYear() - born.getFullYear();
  const beforeBirthday =
    on.getMonth() < born.getMonth() ||
    (on.getMonth() === born.getMonth() && on.getDate() < born.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export function cohortForAge(age: number): AgeCohort {
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 50) return '35-49';
  return '50+';
}

export function cohortForBirthDate(birthDate: BirthDate): AgeCohort {
  return cohortForAge(ageFromBirthDate(birthDate));
}

/** What the viewer actually disclosed, in words. */
export function describeBirthDate(birthDate: BirthDate): string {
  const monthName = birthDate.month
    ? new Date(2000, birthDate.month - 1, 1).toLocaleString(undefined, { month: 'long' })
    : null;
  if (birthDate.day && monthName) return `${birthDate.day} ${monthName} ${birthDate.year}`;
  if (monthName) return `${monthName} ${birthDate.year}`;
  return `${birthDate.year}`;
}

/** Days in a month, so a 31st cannot be picked for a 30-day month. */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** A birth date is only usable once it names a year in a plausible range. */
export function isUsableBirthDate(birthDate: BirthDate | null): birthDate is BirthDate {
  if (!birthDate) return false;
  return birthDate.year >= MIN_BIRTH_YEAR && birthDate.year <= MAX_BIRTH_YEAR();
}

/** Zones a State reports into, keyed by map id. */
export const STATE_REGION: Record<string, GeoRegion> = {
  'in-jk': 'North', 'in-la': 'North', 'in-hp': 'North', 'in-pb': 'North',
  'in-hr': 'North', 'in-ch': 'North', 'in-dl': 'North', 'in-uk': 'North',
  'in-rj': 'North', 'in-up': 'North',
  'in-gj': 'West', 'in-mh': 'West', 'in-ga': 'West', 'in-dh': 'West',
  'in-mp': 'Central', 'in-cg': 'Central',
  'in-br': 'East', 'in-jh': 'East', 'in-od': 'East', 'in-wb': 'East',
  'in-sk': 'East', 'in-as': 'East', 'in-ar': 'East', 'in-mn': 'East',
  'in-ml': 'East', 'in-mz': 'East', 'in-nl': 'East', 'in-tr': 'East',
  'in-ka': 'South', 'in-kl': 'South', 'in-tn': 'South', 'in-ap': 'South',
  'in-tg': 'South', 'in-py': 'South', 'in-ld': 'South', 'in-an': 'South',
};

/**
 * The zone a State belongs to. Asking someone for their State and their zone
 * would be asking the same question twice, so the zone is derived.
 */
export function regionForState(stateId: string): GeoRegion {
  return STATE_REGION[stateId] ?? 'South';
}
