'use client';

import { useState, useEffect } from 'react';

export function useBallotToken(slug: string): string {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    if (!slug) return;
    const storageKey = `psepho_ballot_${slug}`;
    let existingToken = localStorage.getItem(storageKey);
    if (!existingToken) {
      // Generate 32 hex random characters
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      existingToken = Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(storageKey, existingToken);
    }
    setToken(existingToken);
  }, [slug]);

  return token;
}
