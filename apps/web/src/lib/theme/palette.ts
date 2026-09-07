/**
 * The single source of colour truth for the web app.
 *
 * `tailwind.config.ts` builds its palette from this file, and runtime code that
 * has to compute a colour (the heatmap, choice palettes, the background) reads
 * the same values — so a colour is defined exactly once. Swapping the look of
 * the app means editing this file, nothing else.
 */

/** A Material-3 style tonal role set. */
export interface Palette extends Record<string, string> {
  surface: string;
  'surface-dim': string;
  'surface-bright': string;
  'surface-container-lowest': string;
  'surface-container-low': string;
  'surface-container': string;
  'surface-container-high': string;
  'surface-container-highest': string;
  'surface-variant': string;
  'on-surface': string;
  'on-surface-variant': string;
  'inverse-surface': string;
  'inverse-on-surface': string;
  outline: string;
  'outline-variant': string;
  'surface-tint': string;
  primary: string;
  'on-primary': string;
  'primary-container': string;
  'on-primary-container': string;
  'inverse-primary': string;
  secondary: string;
  'on-secondary': string;
  'secondary-container': string;
  'on-secondary-container': string;
  tertiary: string;
  'on-tertiary': string;
  'tertiary-container': string;
  'on-tertiary-container': string;
  error: string;
  'on-error': string;
  'error-container': string;
  'on-error-container': string;
  'primary-fixed': string;
  'primary-fixed-dim': string;
  'on-primary-fixed': string;
  'on-primary-fixed-variant': string;
  'secondary-fixed': string;
  'secondary-fixed-dim': string;
  'on-secondary-fixed': string;
  'on-secondary-fixed-variant': string;
  'tertiary-fixed': string;
  'tertiary-fixed-dim': string;
  'on-tertiary-fixed': string;
  'on-tertiary-fixed-variant': string;
  background: string;
  'on-background': string;
}

export const palette: Palette = {
  surface: '#faf8ff',
  'surface-dim': '#d2d9f4',
  'surface-bright': '#faf8ff',
  'surface-container-lowest': '#ffffff',
  'surface-container-low': '#f2f3ff',
  'surface-container': '#eaedff',
  'surface-container-high': '#e2e7ff',
  'surface-container-highest': '#dae2fd',
  'surface-variant': '#dae2fd',
  'on-surface': '#131b2e',
  'on-surface-variant': '#484554',
  'inverse-surface': '#283044',
  'inverse-on-surface': '#eef0ff',
  outline: '#797586',
  'outline-variant': '#c9c4d7',
  'surface-tint': '#6042d6',
  primary: '#451ebb',
  'on-primary': '#ffffff',
  'primary-container': '#5d3fd3',
  'on-primary-container': '#d8ceff',
  'inverse-primary': '#cabeff',
  secondary: '#00696e',
  'on-secondary': '#ffffff',
  'secondary-container': '#00f4fe',
  'on-secondary-container': '#006c71',
  tertiary: '#8c002e',
  'on-tertiary': '#ffffff',
  'tertiary-container': '#b80040',
  'on-tertiary-container': '#ffc6cb',
  error: '#ba1a1a',
  'on-error': '#ffffff',
  'error-container': '#ffdad6',
  'on-error-container': '#93000a',
  'primary-fixed': '#e6deff',
  'primary-fixed-dim': '#cabeff',
  'on-primary-fixed': '#1c0062',
  'on-primary-fixed-variant': '#4723be',
  'secondary-fixed': '#63f7ff',
  'secondary-fixed-dim': '#00dce5',
  'on-secondary-fixed': '#002021',
  'on-secondary-fixed-variant': '#004f53',
  'tertiary-fixed': '#ffd9dc',
  'tertiary-fixed-dim': '#ffb2ba',
  'on-tertiary-fixed': '#400011',
  'on-tertiary-fixed-variant': '#910030',
  background: '#faf8ff',
  'on-background': '#131b2e',
};

/**
 * Colours a poll's choices are drawn in, in order. Every surface that has to
 * distinguish one choice from another — cards, the map, the create form —
 * takes its colours from here, so choice N is the same colour everywhere.
 */
export interface ChoiceColour {
  /** Solid fill, safe as a background behind `on` text. */
  color: string;
  /** Tinted fill for chips and rails. */
  lightColor: string;
  /** Darker variant, legible as text on a light surface. */
  textColor: string;
}

export const choiceColours: ChoiceColour[] = [
  { color: '#5d3fd3', lightColor: '#e6deff', textColor: '#451ebb' }, // Signal Purple
  { color: '#00838f', lightColor: '#e0f7fa', textColor: '#006064' }, // Ocean Teal
  { color: '#c2185b', lightColor: '#fce4ec', textColor: '#880e4f' }, // Rose Crimson
  { color: '#d97706', lightColor: '#fef3c7', textColor: '#92400e' }, // Warm Amber
  { color: '#2563eb', lightColor: '#dbeafe', textColor: '#1e40af' }, // Royal Blue
  { color: '#059669', lightColor: '#d1fae5', textColor: '#065f46' }, // Emerald
];

/** Colours the map needs that are not roles in the palette above. */
export const mapColours = {
  /** Ground a choice colour is mixed into; matches `surface-container-low`. */
  base: palette['surface-container-low'],
  /** Fill of a territory with no reportable data. */
  noDataFill: '#e7e9f3',
  /** Hatch stroke drawn over that fill. */
  noDataInk: '#c3c9da',
  /** Border of a no-data territory — white would vanish against the hatch. */
  noDataBorder: '#98a0ba',
  /** Shadowed edge of the plate the map sits on. */
  slabInk: '#8b91b2',
} as const;
