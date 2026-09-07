'use client';

import React, { useCallback, useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Small line above the title, e.g. a section kicker. */
  eyebrow?: React.ReactNode;
  eyebrowIcon?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  /** Pinned below the scrolling body. */
  footer?: React.ReactNode;
  labelledBy?: string;
}

const WIDTHS = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

/**
 * The app's one dialog shell: scrim, focus trap, Escape to close, and a body
 * that scrolls inside the rounded card rather than past its corners.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  eyebrow,
  eyebrowIcon,
  size = 'md',
  children,
  footer,
  labelledBy,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const focusables = useCallback(
    () =>
      Array.from(
        cardRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null),
    []
  );

  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    // Give the dialog focus without yanking the page to a random control.
    requestAnimationFrame(() => (focusables()[0] ?? cardRef.current)?.focus());
    return () => {
      document.body.style.overflow = overflow;
      restoreFocusTo.current?.focus?.();
    };
  }, [open, focusables]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open, onClose, focusables]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative flex max-h-[90vh] w-full ${WIDTHS[size]} flex-col overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-2xl focus:outline-none`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {/* The scroll lives inside the rounded card, with a gutter so the bar
            never rides over a corner. */}
        <div className="scroll-inset min-h-0 flex-1 overflow-y-auto p-6 md:p-8">
          {(eyebrow || title) && (
            <header className="mb-4 pr-8">
              {eyebrow && (
                <div className="mb-1.5 flex items-center gap-2">
                  {eyebrowIcon && (
                    <span className="material-symbols-outlined text-primary">{eyebrowIcon}</span>
                  )}
                  <span className="font-label-bold text-xs uppercase tracking-wider text-primary">
                    {eyebrow}
                  </span>
                </div>
              )}
              {title && (
                <h2 id={labelledBy} className="font-headline-md text-2xl text-on-surface">
                  {title}
                </h2>
              )}
            </header>
          )}
          {children}
        </div>

        {footer && (
          <div className="border-t border-outline-variant/20 bg-surface-container-lowest p-4 md:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
