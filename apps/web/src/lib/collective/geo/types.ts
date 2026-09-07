/** A single drawable territory: a country, a State/UT, or a district. */
export interface GeoShape {
  /** Stable identifier, e.g. `in-ka`, `ka-bengaluru-urban`, `w-356`. */
  id: string;
  name: string;
  /** State/UT code for Indian shapes, numeric ISO 3166-1 for countries. */
  code: string;
  /** Pole of inaccessibility — a point guaranteed to sit inside the shape. */
  label: [number, number] | null;
  /** `[x0, y0, x1, y1]` in the map's own coordinate space. */
  bbox: [number, number, number, number];
  /** SVG path data in the map's own coordinate space. */
  d: string;
}

/** A complete, self-contained map: shapes plus the box they are drawn in. */
export interface GeoMap {
  id: string;
  name: string;
  width: number;
  height: number;
  shapes: GeoShape[];
}
