import type { GeoMap, GeoShape } from './types';
import { INDIA_MAP } from './india';
import { WORLD_MAP } from './world';
import { DISTRICT_MAP_LOADERS } from './districts';

export type { GeoMap, GeoShape };
export { INDIA_MAP, WORLD_MAP, DISTRICT_MAP_LOADERS };

/** Loads a State's district map on demand; district maps are code-split. */
export async function loadDistrictMap(stateId: string): Promise<GeoMap | null> {
  const loader = DISTRICT_MAP_LOADERS[stateId];
  if (!loader) return null;
  return loader();
}

export function hasDistrictMap(stateId: string): boolean {
  return Boolean(DISTRICT_MAP_LOADERS[stateId]);
}
