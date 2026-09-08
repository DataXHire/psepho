/** Colour arithmetic shared by anything that has to shade a token at runtime. */

type Rgb = [number, number, number];

function parse(colour: string): Rgb {
  if (colour.startsWith('#')) {
    const hex = colour.length === 4
      ? colour.slice(1).split('').map((c) => c + c).join('')
      : colour.slice(1);
    const value = parseInt(hex, 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const parts = colour.match(/\d+(\.\d+)?/g);
  if (!parts || parts.length < 3) return [0, 0, 0];
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Blends `to` into `from` by `amount` (0..1); returns an opaque colour. */
export function mix(from: string, to: string, amount: number): string {
  const a = parse(from);
  const b = parse(to);
  const channel = (i: number) => clamp(a[i] + (b[i] - a[i]) * amount);
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

export const lighten = (colour: string, amount: number) => mix(colour, '#ffffff', amount);
export const darken = (colour: string, amount: number) => mix(colour, '#0b1020', amount);
