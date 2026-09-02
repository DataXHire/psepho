import { lightTheme, darkTheme, optionPalette } from './colors';
import { typeScale, lineHeights } from './typography';
import { spacing, radii } from './spacing';

export const psephoTailwindPreset = {
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        slate: 'var(--slate)',
        rule: 'var(--rule)',
        patina: 'var(--patina)',
        'patina-deep': 'var(--patina-deep)',
        alarm: 'var(--alarm)',
        'option-indigo': '#38479B',
        'option-patina': '#2E7B65',
        'option-ochre': '#B5842B',
        'option-plum': '#79365E',
        'option-clay': '#A64B33',
        'option-teal': '#217C8C',
        'option-moss': '#5F7A2E',
        'option-graphite': '#4B535B',
      },
      fontSize: {
        xs: [`${typeScale.xs}px`, { lineHeight: `${lineHeights.body}` }] as [string, { lineHeight: string }],
        sm: [`${typeScale.sm}px`, { lineHeight: `${lineHeights.body}` }] as [string, { lineHeight: string }],
        base: [`${typeScale.base}px`, { lineHeight: `${lineHeights.body}` }] as [string, { lineHeight: string }],
        md: [`${typeScale.md}px`, { lineHeight: `${lineHeights.body}` }] as [string, { lineHeight: string }],
        lg: [`${typeScale.lg}px`, { lineHeight: `${lineHeights.display}` }] as [string, { lineHeight: string }],
        xl: [`${typeScale.xl}px`, { lineHeight: `${lineHeights.display}` }] as [string, { lineHeight: string }],
        display: [`${typeScale.display}px`, { lineHeight: `${lineHeights.display}` }] as [string, { lineHeight: string }],
      },
      spacing: {
        1: `${spacing[1]}px`,
        2: `${spacing[2]}px`,
        3: `${spacing[3]}px`,
        4: `${spacing[4]}px`,
        5: `${spacing[5]}px`,
        6: `${spacing[6]}px`,
        7: `${spacing[7]}px`,
        8: `${spacing[8]}px`,
      },
      borderRadius: {
        row: `${radii.row}px`,
        interactive: `${radii.interactive}px`,
        sheet: `${radii.sheet}px`,
      },
      maxWidth: {
        ballot: '34rem',
        reading: '68ch',
      },
      minHeight: {
        row: '56px',
      },
      fontFamily: {
        sans: ['var(--font-archivo)', 'Archivo', 'sans-serif'],
      },
    },
  },
};

export const cssCustomProperties = `
:root {
  --paper: ${lightTheme.paper};
  --surface: ${lightTheme.surface};
  --ink: ${lightTheme.ink};
  --slate: ${lightTheme.slate};
  --rule: ${lightTheme.rule};
  --patina: ${lightTheme.patina};
  --patina-deep: ${lightTheme.patinaDeep};
  --alarm: ${lightTheme.alarm};
}

.dark, [data-theme="dark"] {
  --paper: ${darkTheme.paper};
  --surface: ${darkTheme.surface};
  --ink: ${darkTheme.ink};
  --slate: ${darkTheme.slate};
  --rule: ${darkTheme.rule};
  --patina: ${darkTheme.patina};
  --patina-deep: ${darkTheme.patinaDeep};
  --alarm: ${darkTheme.alarm};
}
`;
