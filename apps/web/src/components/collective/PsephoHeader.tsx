'use client';

import React from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';

export const PsephoHeader: React.FC = () => {
  const { activeTab, setActiveTab, openAskModal, openPersonaModal, currentProfile } = usePsepho();

  return (
    <header className="fixed top-0 w-full z-40 bg-surface/85 backdrop-blur-xl border-b border-outline-variant/15 shadow-xs">
      <div className="flex justify-between items-center w-full px-container-padding-mobile md:px-container-padding-desktop max-w-[1440px] mx-auto h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2 font-display text-2xl md:text-3xl font-extrabold text-primary hover:opacity-90 transition-opacity"
          >
            {/* Athenian Pebble Glyph */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-primary"
            >
              <path
                d="M12 3C6.48 3 2.5 7.5 2.5 12.5C2.5 17.5 7 21 12 21C17.5 21 21.5 17 21.5 12C21.5 7 17.5 3 12 3Z"
                fill="currentColor"
                opacity="0.9"
              />
              <circle cx="9" cy="10" r="1.5" fill="#00f4fe" />
            </svg>
            <span>psepho</span>
          </a>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex gap-6 items-center">
          <button
            onClick={() => setActiveTab('Trending')}
            className={`font-label-bold text-sm transition-all pb-1 ${
              activeTab === 'Trending'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Trending
          </button>

          <button
            onClick={() => setActiveTab('For You')}
            className={`font-label-bold text-sm transition-all pb-1 ${
              activeTab === 'For You'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            For You
          </button>

          <button
            onClick={() => setActiveTab('Topics')}
            className={`font-label-bold text-sm transition-all pb-1 ${
              activeTab === 'Topics'
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Topics
          </button>
        </nav>

        {/* Actions: + Ask & Sign In / Persona Status */}
        <div className="flex items-center gap-3">
          <button
            onClick={openAskModal}
            className="hidden sm:inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 hover:border-primary/40 px-4 py-2 rounded-full font-label-bold text-xs hover:scale-[1.02] transition-all duration-200 ease-out active:scale-95 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm font-semibold">add</span>
            <span>Ask</span>
          </button>

          {currentProfile ? (
            <button
              onClick={openPersonaModal}
              className="flex items-center gap-2 text-primary font-label-bold text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-full transition-colors border border-primary/20"
            >
              <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[10px] font-bold">
                {currentProfile.avatar || currentProfile.name[0]}
              </div>
              <span className="hidden md:inline">{currentProfile.name.split(' ')[0]}</span>
              <span className="text-[10px] text-on-surface-variant hidden lg:inline">
                ({currentProfile.region})
              </span>
            </button>
          ) : (
            <button
              onClick={openPersonaModal}
              className="text-primary font-label-bold text-xs px-4 py-2 hover:bg-primary/10 rounded-full transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
