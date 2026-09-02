import type { Config } from 'tailwindcss';
import { psephoTailwindPreset } from '@psepho/tokens/tailwind';

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
    extend: {},
  },
  plugins: [],
};

export default config;
