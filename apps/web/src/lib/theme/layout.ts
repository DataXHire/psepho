/** Shape and rhythm tokens, mirrored into Tailwind. */

export const radii = {
  sm: '0.5rem',
  DEFAULT: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  full: '9999px',
} as const;

export const layout = {
  spacing: {
    unit: '8px',
    'container-padding-mobile': '20px',
    'container-padding-desktop': '40px',
    'card-gap': '24px',
    'section-margin': '64px',
  },
  /** Widest the page content grows to. */
  contentMaxWidth: '1200px',
  /** Widest the header bar grows to. */
  headerMaxWidth: '1440px',
} as const;
