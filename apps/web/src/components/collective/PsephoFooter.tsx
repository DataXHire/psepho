'use client';

import React, { useState } from 'react';

export const PsephoFooter: React.FC = () => {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <footer className="w-full py-12 bg-surface-container-low border-t border-outline-variant/15 mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-[900px] mx-auto px-container-padding-mobile">
          <div className="flex items-center gap-2 font-display text-xl font-bold text-on-surface">
            <span>psepho</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans">
              Kinetic Pulse
            </span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm text-on-surface-variant">
            <button
              onClick={() => setShowAbout(true)}
              className="hover:text-primary transition-colors underline decoration-1 underline-offset-4"
            >
              About
            </button>
            <a
              href="#privacy"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  'psepho Privacy Invariant:\nZero raw IP addresses stored. Geo-tagging is resolved at network edge and immediately hashed with server pepper.'
                );
              }}
              className="hover:text-primary transition-colors underline decoration-1 underline-offset-4"
            >
              Privacy
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                alert(
                  'psepho Terms:\nPublic civic consensus instrument. One vote per browser device token.'
                );
              }}
              className="hover:text-primary transition-colors underline decoration-1 underline-offset-4"
            >
              Terms
            </a>
            <a
              href="mailto:civic@psepho.org"
              className="hover:text-primary transition-colors underline decoration-1 underline-offset-4"
            >
              Contact
            </a>
          </nav>

          <div className="font-caption text-xs text-on-surface-variant/80 text-center md:text-right">
            © 2026 psepho • One vote per browser
          </div>
        </div>
      </footer>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/30 relative">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <h3 className="font-display text-2xl text-on-surface mb-2">About psepho</h3>
            <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-4">
              From Athenian ψῆφος (The Voting Pebble)
            </p>

            <div className="space-y-3 text-xs text-on-surface-variant leading-relaxed">
              <p>
                <strong>psepho</strong> is an honest, link-shared consensus instrument designed to
                gauge real societal and workplace sentiment across regions and demographic cohorts.
              </p>
              <p>
                Unlike noisy forums or black-box algorithms, psepho is powered by mathematical
                polarization scoring, automated subgroup anomaly discovery, and strict privacy
                preservation (zero raw IP addresses stored).
              </p>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="w-full mt-6 py-2 bg-primary text-on-primary font-label-bold text-xs rounded-full"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
