'use client';

import React, { useMemo } from 'react';
import type { BirthDate, BirthPrecision } from '@/lib/collective/types';
import {
  MIN_BIRTH_YEAR,
  MAX_BIRTH_YEAR,
  cohortForBirthDate,
  daysInMonth,
  describeBirthDate,
  isUsableBirthDate,
} from '@/lib/collective/demographics';
import { Dropdown, type DropdownOption } from '@/components/ui';

/**
 * Date of birth, given to whatever precision the viewer is comfortable with.
 *
 * Analysis only needs an age band, so the year alone is enough and is what the
 * field opens on. Month and day are offered as visible extra steps rather than
 * required fields, and the panel says plainly what is stored and what it is
 * used for — so the choice of precision reads as the viewer's to make.
 */

const PRECISIONS: Array<{ value: BirthPrecision; label: string; hint: string }> = [
  { value: 'year', label: 'Year', hint: 'Enough for your age band' },
  { value: 'month', label: 'Month & year', hint: 'A little more precise' },
  { value: 'day', label: 'Full date', hint: 'Exact date of birth' },
];

interface BirthDateFieldProps {
  value: BirthDate | null;
  precision: BirthPrecision;
  onChange: (value: BirthDate | null) => void;
  onPrecisionChange: (precision: BirthPrecision) => void;
}

export const BirthDateField: React.FC<BirthDateFieldProps> = ({
  value,
  precision,
  onChange,
  onPrecisionChange,
}) => {
  const maxYear = MAX_BIRTH_YEAR();

  const yearOptions: DropdownOption<string>[] = useMemo(() => {
    const years: DropdownOption<string>[] = [];
    for (let year = maxYear; year >= MIN_BIRTH_YEAR; year -= 1) {
      years.push({ value: String(year), label: String(year) });
    }
    return years;
  }, [maxYear]);

  const monthOptions: DropdownOption<string>[] = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        value: String(index + 1),
        label: new Date(2000, index, 1).toLocaleString(undefined, { month: 'long' }),
      })),
    []
  );

  const dayOptions: DropdownOption<string>[] = useMemo(() => {
    const count = value?.year && value?.month ? daysInMonth(value.year, value.month) : 31;
    return Array.from({ length: count }, (_, index) => ({
      value: String(index + 1),
      label: String(index + 1),
    }));
  }, [value?.year, value?.month]);

  /** Re-shapes the stored date so it never carries more than the precision. */
  const setPrecision = (next: BirthPrecision) => {
    onPrecisionChange(next);
    if (!value) return;
    if (next === 'year') onChange({ year: value.year });
    else if (next === 'month') onChange({ year: value.year, month: value.month ?? 1 });
    else
      onChange({
        year: value.year,
        month: value.month ?? 1,
        day: value.day ?? 1,
      });
  };

  const patch = (part: Partial<BirthDate>) => {
    const next: BirthDate = { year: value?.year ?? maxYear - 25, ...value, ...part };
    // A shorter month must not leave an impossible day behind.
    if (next.day && next.month && next.day > daysInMonth(next.year, next.month)) {
      next.day = daysInMonth(next.year, next.month);
    }
    onChange(next);
  };

  const complete = isUsableBirthDate(value);

  return (
    <fieldset className="rounded-lg border border-outline-variant/30 bg-surface-container-low/60 p-3">
      <legend className="px-1 font-label-bold text-xs text-on-surface-variant">
        Date of birth
      </legend>

      <p className="mb-2.5 text-[11px] leading-relaxed text-on-surface-variant">
        Only your age band is used, so the year on its own is plenty. Share more if you want to —
        it is entirely up to you.
      </p>

      {/* Precision first: the viewer decides how much to give before giving it. */}
      <div
        role="radiogroup"
        aria-label="How precise do you want to be?"
        className="mb-3 inline-flex rounded-full border border-outline-variant/30 bg-surface-container-lowest p-0.5"
      >
        {PRECISIONS.map((option) => {
          const active = precision === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={option.hint}
              onClick={() => setPrecision(option.value)}
              className={`rounded-full px-2.5 py-1 font-label-bold text-[11px] transition-colors ${
                active
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[7rem] flex-1">
          <span className="mb-1 block text-[11px] text-on-surface-variant">Year</span>
          <Dropdown
            value={value ? String(value.year) : ''}
            options={yearOptions}
            onChange={(year) => patch({ year: Number(year) })}
            ariaLabel="Year of birth"
            placeholder="Select year"
            size="sm"
          />
        </div>

        {precision !== 'year' && (
          <div className="min-w-[8rem] flex-1">
            <span className="mb-1 block text-[11px] text-on-surface-variant">Month</span>
            <Dropdown
              value={value?.month ? String(value.month) : ''}
              options={monthOptions}
              onChange={(month) => patch({ month: Number(month) })}
              ariaLabel="Month of birth"
              placeholder="Select month"
              size="sm"
            />
          </div>
        )}

        {precision === 'day' && (
          <div className="min-w-[5rem] flex-1">
            <span className="mb-1 block text-[11px] text-on-surface-variant">Day</span>
            <Dropdown
              value={value?.day ? String(value.day) : ''}
              options={dayOptions}
              onChange={(day) => patch({ day: Number(day) })}
              ariaLabel="Day of birth"
              placeholder="Day"
              size="sm"
            />
          </div>
        )}
      </div>

      {/* What this actually becomes, said out loud. */}
      <p
        aria-live="polite"
        className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-outline-variant/20 pt-2 text-[11px] text-on-surface-variant"
      >
        {complete ? (
          <>
            <span className="material-symbols-outlined text-sm text-primary">shield_person</span>
            <span>
              You share <strong className="text-on-surface">{describeBirthDate(value)}</strong>;
              analysis uses{' '}
              <strong className="text-on-surface">{cohortForBirthDate(value)}</strong> only.
            </span>
          </>
        ) : (
          <span>Pick a year to see which age band you would be counted in.</span>
        )}
      </p>
    </fieldset>
  );
};
