'use client';

import React, { useState } from 'react';
import { IntegrityLevel } from '@psepho/core';

interface IntegrityLineProps {
  level: IntegrityLevel;
}

export function IntegrityLine({ level }: IntegrityLineProps) {
  const [isOpen, setIsOpen] = useState(false);

  let label = 'One vote per browser';
  if (level === 'open') {
    label = 'Open poll — anyone can vote, more than once';
  } else if (level === 'verified') {
    label = 'Verified identity';
  }

  return (
    <>
      <div className="flex items-center gap-1.5 text-xs text-slate mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="text-slate hover:text-ink underline decoration-rule hover:decoration-slate text-left transition-colors"
          aria-haspopup="dialog"
        >
          {label}
        </button>
      </div>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-surface text-ink border border-rule rounded-sheet max-w-sm w-full p-6 shadow-none text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg mb-3">Integrity level: {label}</h3>

            {level === 'device' ? (
              <div className="text-sm text-slate space-y-2.5 font-body">
                <p>
                  This poll enforces one submission per browser or app install using a stored ballot token.
                </p>
                <p>
                  A cookie is not a person. Clearing site storage or opening a private window creates a new ballot token.
                </p>
                <p className="text-ink font-medium pt-2 border-t border-rule">
                  For anything that really matters, treat this as a poll, not an election.
                </p>
              </div>
            ) : (
              <div className="text-sm text-slate space-y-2.5 font-body">
                <p>
                  Anyone can vote multiple times in this poll. No ballot token restrictions are enforced by the server.
                </p>
                <p className="text-ink font-medium pt-2 border-t border-rule">
                  For anything that really matters, treat this as a poll, not an election.
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-ink text-surface rounded-interactive text-sm font-semibold hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
