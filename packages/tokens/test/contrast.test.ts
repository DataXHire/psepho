import { describe, it } from 'vitest';
import { lightTheme, darkTheme, optionPalette } from '../src/colors';

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function getLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('WCAG 2.1 Contrast Ratio Audit (4.5:1 Target)', () => {
  it('calculates and reports contrast ratios for --slate and option colors against light & dark backgrounds', () => {
    console.log('\n--- CONTRAST RATIO AUDIT ---');

    // 1. --slate on --paper
    const slateLightRatio = getContrastRatio(lightTheme.slate, lightTheme.paper);
    console.log(`Light Theme: --slate (${lightTheme.slate}) on --paper (${lightTheme.paper}): ${slateLightRatio.toFixed(2)}:1 ${slateLightRatio >= 4.5 ? 'PASS' : 'FAIL (< 4.5:1)'}`);

    const slateDarkRatio = getContrastRatio(darkTheme.slate, darkTheme.paper);
    console.log(`Dark Theme: --slate (${darkTheme.slate}) on --paper (${darkTheme.paper}): ${slateDarkRatio.toFixed(2)}:1 ${slateDarkRatio >= 4.5 ? 'PASS' : 'FAIL (< 4.5:1)'}`);

    console.log('\nOption Palette on Light Theme (--paper):');
    for (const opt of optionPalette) {
      const ratio = getContrastRatio(opt.hex, lightTheme.paper);
      console.log(`  ${opt.name.padEnd(9)} (${opt.hex}) on Light paper: ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'PASS' : 'FAIL (< 4.5:1)'}`);
    }

    console.log('\nOption Palette on Dark Theme (--paper):');
    for (const opt of optionPalette) {
      const ratio = getContrastRatio(opt.hex, darkTheme.paper);
      console.log(`  ${opt.name.padEnd(9)} (${opt.hex}) on Dark paper: ${ratio.toFixed(2)}:1 ${ratio >= 4.5 ? 'PASS' : 'FAIL (< 4.5:1)'}`);
    }
  });
});
