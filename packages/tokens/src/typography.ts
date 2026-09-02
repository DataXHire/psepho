export const typeScale = {
  xs: 13,
  sm: 15,
  base: 17,
  md: 21,
  lg: 27,
  xl: 36,
  display: 48,
} as const;

export const lineHeights = {
  display: 1.2,
  body: 1.5,
} as const;

export const typography = {
  fontFamily: 'var(--font-archivo), Archivo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: {
    fontFamily: 'var(--font-archivo), Archivo, sans-serif',
    fontVariationSettings: '"wdth" 115, "wght" 600',
    fontWeight: 600,
    lineHeight: lineHeights.display,
  },
  body: {
    fontFamily: 'var(--font-archivo), Archivo, sans-serif',
    fontVariationSettings: '"wdth" 100, "wght" 400',
    fontWeight: 400,
    lineHeight: lineHeights.body,
    maxLineLength: '68ch',
  },
  uiSemibold: {
    fontFamily: 'var(--font-archivo), Archivo, sans-serif',
    fontVariationSettings: '"wdth" 100, "wght" 600',
    fontWeight: 600,
  },
  numbers: {
    fontVariantNumeric: 'tabular-nums',
  },
} as const;
