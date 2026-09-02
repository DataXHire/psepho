export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;

export const radii = {
  none: 0,
  row: 2,       // 2px on option rows
  interactive: 4, // 4px on inputs and buttons
  sheet: 8,     // max 8px for modals / sheets
} as const;

export const layout = {
  maxColumnWidth: '34rem', // 544px
  minOptionRowHeight: 56,  // 56px minimum height
} as const;
