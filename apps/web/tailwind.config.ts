import type { Config } from 'tailwindcss';
import { psephoTailwindPreset } from '@psepho/tokens/tailwind';
import { palette } from './src/lib/theme/palette';
import { typeScale, fontFamilies } from './src/lib/theme/typography';
import { radii, layout } from './src/lib/theme/layout';

/**
 * Tailwind mirrors the theme in `src/lib/theme` — colours, type and shape are
 * declared there once and consumed both here and by runtime code.
 */
const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [psephoTailwindPreset],
  theme: {
    extend: {
      colors: palette,
      borderRadius: radii,
      spacing: layout.spacing,
      fontFamily: fontFamilies,
      fontSize: typeScale,
    },
  },
  plugins: [],
};

export default config;
