import { lightTheme, darkTheme, optionPalette } from './colors';
import { typeScale, lineHeights } from './typography';
import { spacing, radii, layout } from './spacing';

export const rnLightTheme = {
  colors: {
    ...lightTheme,
    options: optionPalette,
  },
  typography: {
    sizes: typeScale,
    lineHeights,
  },
  spacing,
  radii,
  layout,
};

export const rnDarkTheme = {
  colors: {
    ...darkTheme,
    options: optionPalette,
  },
  typography: {
    sizes: typeScale,
    lineHeights,
  },
  spacing,
  radii,
  layout,
};

export type RNTheme = typeof rnLightTheme;
