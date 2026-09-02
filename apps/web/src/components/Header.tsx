'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export function Header() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const isDarkStored = localStorage.getItem('psepho-theme') === 'dark' ||
      (!('psepho-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(isDarkStored);
    if (isDarkStored) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('psepho-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('psepho-theme', 'light');
    }
  };

  return (
    <header className="w-full max-w-ballot mx-auto pt-8 pb-4 px-4 flex items-center justify-between text-sm">
      <Link
        href="/"
        className="font-display text-base tracking-tight text-ink hover:opacity-80 transition-opacity flex items-center gap-1.5"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-patina inline-block" />
        psepho
      </Link>

      <div className="flex items-center gap-4 text-xs text-slate">
        <Link href="/new" className="hover:text-ink transition-colors">
          Create
        </Link>
        <Link href="/r/check" className="hover:text-ink transition-colors">
          Receipts
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className="hover:text-ink transition-colors px-1 py-0.5"
          aria-label="Toggle dark mode"
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
