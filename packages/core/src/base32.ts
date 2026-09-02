// Crockford's Base32 Alphabet: 32 characters, excludes I, L, O, U to avoid ambiguous glyphs
export const CROCKFORD_BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateRandomBase32(length: number): string {
  let result = '';
  // Use crypto.getRandomValues if available in runtime, else Math.random fallback
  const isNodeOrBrowserCrypto = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function';
  
  if (isNodeOrBrowserCrypto) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      result += CROCKFORD_BASE32_ALPHABET[bytes[i] % CROCKFORD_BASE32_ALPHABET.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * CROCKFORD_BASE32_ALPHABET.length);
      result += CROCKFORD_BASE32_ALPHABET[idx];
    }
  }
  return result;
}

export function generateSlug(): string {
  // 8 chars, base32, no ambiguous glyphs
  return generateRandomBase32(8);
}

export function generateReceiptCode(): string {
  // 6 chars, base32, unique per poll
  return generateRandomBase32(6);
}

export function isValidSlug(slug: string): boolean {
  if (slug.length !== 8) return false;
  const regex = /^[0-9A-HJKMNP-TV-Z]{8}$/i;
  return regex.test(slug);
}

export function isValidReceiptCode(code: string): boolean {
  if (code.length !== 6) return false;
  const regex = /^[0-9A-HJKMNP-TV-Z]{6}$/i;
  return regex.test(code);
}
