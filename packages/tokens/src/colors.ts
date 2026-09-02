export const lightTheme = {
  paper: '#F1F3F1',
  surface: '#FAFBFA',
  ink: '#14171A',
  slate: '#59636B',
  rule: '#D3D9D6',
  patina: '#2E6B5A',
  patinaDeep: '#1F4C40',
  alarm: '#8C3B2E',
} as const;

export const darkTheme = {
  paper: '#101413',
  surface: '#171C1B',
  ink: '#ECEFEC',
  slate: '#99A39E',
  rule: '#262E2C',
  patina: '#4FA88C',
  patinaDeep: '#6FC0A5',
  alarm: '#D4705C',
} as const;

export interface OptionColor {
  name: string;
  hex: string;
}

export const optionPalette: readonly OptionColor[] = [
  { name: 'indigo', hex: '#38479B' },
  { name: 'patina', hex: '#2E7B65' },
  { name: 'ochre', hex: '#B5842B' },
  { name: 'plum', hex: '#79365E' },
  { name: 'clay', hex: '#A64B33' },
  { name: 'teal', hex: '#217C8C' },
  { name: 'moss', hex: '#5F7A2E' },
  { name: 'graphite', hex: '#4B535B' },
] as const;

export function getOptionColor(index: number): OptionColor {
  return optionPalette[index % optionPalette.length];
}

export function getOptionLetter(position: number): string {
  // 0 -> 'A', 1 -> 'B', etc.
  return String.fromCharCode(65 + (position % 26));
}
