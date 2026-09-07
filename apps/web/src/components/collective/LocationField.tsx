'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { INDIA_MAP, loadDistrictMap } from '@/lib/collective/geo';
import { regionForState } from '@/lib/collective/demographics';
import { Dropdown, type DropdownOption } from '@/components/ui';

/**
 * Where someone votes from: a State or UT, and optionally a district within it.
 *
 * Both come from the same boundary data the heatmap draws, so a profile can
 * only name a place the map can actually shade. Nothing is inferred from the
 * network — the platform stores no raw IP, so location is asked for or absent.
 *
 * The zone (North / South / …) is derived from the State rather than asked
 * separately; the two questions have one answer between them.
 */

export interface LocationValue {
  stateId: string;
  districtId?: string;
  districtName?: string;
}

const STATE_OPTIONS: DropdownOption<string>[] = INDIA_MAP.shapes.map((shape) => ({
  value: shape.id,
  label: shape.name,
}));

export const LocationField: React.FC<{
  value: LocationValue;
  onChange: (value: LocationValue) => void;
}> = ({ value, onChange }) => {
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  // District geometry is code-split; a State's list arrives when it is picked.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDistrictMap(value.stateId)
      .then((map) => {
        if (cancelled) return;
        setDistricts(map ? map.shapes.map((s) => ({ id: s.id, name: s.name })) : []);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [value.stateId]);

  const districtOptions: DropdownOption<string>[] = useMemo(
    () => [
      { value: '', label: 'Prefer not to say', hint: 'State-level only' },
      ...districts.map((district) => ({ value: district.id, label: district.name })),
    ],
    [districts]
  );

  const stateName = INDIA_MAP.shapes.find((s) => s.id === value.stateId)?.name ?? '';
  const region = regionForState(value.stateId);

  return (
    <fieldset className="rounded-lg border border-outline-variant/30 bg-surface-container-low/60 p-3">
      <legend className="px-1 font-label-bold text-xs text-on-surface-variant">Where you vote from</legend>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-[11px] text-on-surface-variant">State or UT</span>
          <Dropdown
            value={value.stateId}
            options={STATE_OPTIONS}
            onChange={(stateId) => onChange({ stateId })}
            ariaLabel="State or Union Territory"
            icon="map"
            size="sm"
          />
        </div>

        <div className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-[11px] text-on-surface-variant">
            District {loading && <span className="text-outline">· loading</span>}
          </span>
          <Dropdown
            value={value.districtId ?? ''}
            options={districtOptions}
            onChange={(districtId) =>
              onChange({
                stateId: value.stateId,
                districtId: districtId || undefined,
                districtName: districts.find((d) => d.id === districtId)?.name,
              })
            }
            ariaLabel="District"
            icon="location_on"
            size="sm"
          />
        </div>
      </div>

      <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t border-outline-variant/20 pt-2 text-[11px] text-on-surface-variant">
        <span className="material-symbols-outlined text-sm text-primary">public</span>
        <span>
          {stateName} reports into <strong className="text-on-surface">{region} India</strong>
          {value.districtName ? `, district ${value.districtName}` : ', no district given'}.
        </span>
      </p>
    </fieldset>
  );
};
