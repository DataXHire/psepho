'use client';

import React, { useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { appConfig, BACKGROUND_STYLES, type BackgroundStyle } from '@/lib/config/appConfig';
import { Button, Dropdown, Modal, type DropdownOption } from '@/components/ui';
import { BrandMark } from './BrandMark';

const BACKGROUND_OPTIONS: DropdownOption<BackgroundStyle>[] = BACKGROUND_STYLES.map((style) => ({
  value: style.value,
  label: style.label,
  hint: style.hint,
}));

type Sheet = 'about' | 'privacy' | 'terms' | null;

const SHEETS: Record<Exclude<Sheet, null>, { title: string; body: React.ReactNode }> = {
  about: {
    title: `About ${appConfig.brand.name}`,
    body: (
      <>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">
          {appConfig.brand.origin}
        </p>
        <div className="space-y-3 text-xs leading-relaxed text-on-surface-variant">
          <p>
            <strong>{appConfig.brand.name}</strong> is an honest, link-shared consensus instrument
            for gauging real societal and workplace sentiment across regions and demographic
            cohorts.
          </p>
          <p>
            Rather than a noisy forum or a black-box ranking, it runs on mathematical polarization
            scoring, automated subgroup anomaly discovery, and strict privacy preservation.
          </p>
        </div>
      </>
    ),
  },
  privacy: {
    title: 'Privacy invariant',
    body: <p className="text-xs leading-relaxed text-on-surface-variant">{appConfig.privacy.invariant}</p>,
  },
  terms: {
    title: 'Terms',
    body: <p className="text-xs leading-relaxed text-on-surface-variant">{appConfig.privacy.terms}</p>,
  },
};

export const PsephoFooter: React.FC = () => {
  const { background, setBackground } = usePsepho();
  const [sheet, setSheet] = useState<Sheet>(null);
  const open = sheet ? SHEETS[sheet] : null;

  return (
    <>
      <footer className="mt-auto w-full border-t border-outline-variant/15 bg-surface-container-low py-10">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center justify-between gap-6 px-container-padding-mobile md:flex-row">
          <div className="flex items-center gap-2 font-display text-xl font-bold text-on-surface">
            <BrandMark size={20} />
            <span>{appConfig.brand.name}</span>
            {appConfig.brand.edition && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs text-primary">
                {appConfig.brand.edition}
              </span>
            )}
          </div>

          <nav className="flex flex-wrap justify-center gap-5 text-sm text-on-surface-variant">
            {(['about', 'privacy', 'terms'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSheet(key)}
                className="capitalize underline decoration-1 underline-offset-4 transition-colors hover:text-primary"
              >
                {key}
              </button>
            ))}
            <a
              href={`mailto:${appConfig.privacy.contact}`}
              className="underline decoration-1 underline-offset-4 transition-colors hover:text-primary"
            >
              Contact
            </a>
          </nav>

          <div className="flex flex-col items-center gap-2 md:items-end">
            <Dropdown
              value={background}
              options={BACKGROUND_OPTIONS}
              onChange={setBackground}
              label="Background"
              ariaLabel="Page background style"
              icon="wallpaper"
              size="sm"
              align="right"
              className="w-52"
            />
            <span className="font-caption text-xs text-on-surface-variant/80">
              © 2026 {appConfig.brand.name} • One vote per browser
            </span>
          </div>
        </div>
      </footer>

      <Modal
        open={sheet !== null}
        onClose={() => setSheet(null)}
        size="sm"
        title={open?.title}
        labelledBy="footer-sheet-title"
        footer={
          <Button full onClick={() => setSheet(null)}>
            Got it
          </Button>
        }
      >
        {open?.body}
      </Modal>
    </>
  );
};
