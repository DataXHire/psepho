import { describe, it, expect } from 'vitest';
import { generateSlug, generateReceiptCode, isValidSlug, isValidReceiptCode, CROCKFORD_BASE32_ALPHABET } from '../src/base32';

describe('Base32 Slug and Receipt Generation', () => {
  it('generates 8-character slug without ambiguous characters (I, L, O, U)', () => {
    for (let i = 0; i < 50; i++) {
      const slug = generateSlug();
      expect(slug).toHaveLength(8);
      expect(isValidSlug(slug)).toBe(true);
      expect(slug).not.toMatch(/[ILOUilou]/);
      for (const char of slug) {
        expect(CROCKFORD_BASE32_ALPHABET).toContain(char.toUpperCase());
      }
    }
  });

  it('generates 6-character receipt code without ambiguous characters', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateReceiptCode();
      expect(code).toHaveLength(6);
      expect(isValidReceiptCode(code)).toBe(true);
      expect(code).not.toMatch(/[ILOUilou]/);
      for (const char of code) {
        expect(CROCKFORD_BASE32_ALPHABET).toContain(char.toUpperCase());
      }
    }
  });
});
