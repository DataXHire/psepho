'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { choiceColours, palette } from '@/lib/theme';

/**
 * The decorative layer behind the page, chosen by `appConfig.background` and
 * changeable by the viewer.
 *
 * `none` renders nothing at all. `pebble` scatters voting pebbles that drift as
 * the page scrolls — purely ornamental, so it is inert to pointers and hidden
 * from assistive tech, and it holds still for anyone who asked for less motion.
 */

/** Vertical span the field wraps over, as a multiple of the viewport height. */
const FIELD_HEIGHT = 140;

interface Pebble {
  /** Percent of the viewport width. */
  x: number;
  /** Percent down the wrapping field, 0..FIELD_HEIGHT. */
  y: number;
  r: number;
  colour: string;
  opacity: number;
  /** How strongly this pebble answers the scroll; far ones move least. */
  depth: number;
}

const PEBBLE_COUNT = 30;

/** Deterministic scatter: the same layout every render, no hydration mismatch. */
function buildPebbles(): Pebble[] {
  let seed = 0x9e3779b9;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  return Array.from({ length: PEBBLE_COUNT }, () => {
    const depth = 0.25 + random() * 0.9;
    return {
      x: random() * 100,
      y: random() * FIELD_HEIGHT,
      r: 18 + random() * 70,
      colour: choiceColours[Math.floor(random() * choiceColours.length)].color,
      opacity: 0.14 + random() * 0.16,
      depth,
    };
  });
}

const PebbleField: React.FC = () => {
  const pebbles = useMemo(buildPebbles, []);
  const [offset, setOffset] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        setOffset(window.scrollY);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={{ backgroundColor: palette.background }}
    >
      {pebbles.map((pebble, index) => {
        // Wrapping keeps the field populated at any scroll depth. Without it
        // every pebble drifts off the top within a screen or two and the page
        // is left bare, which is what made the effect look broken.
        const drift = (offset * pebble.depth) / 8;
        const y = (((pebble.y - drift) % FIELD_HEIGHT) + FIELD_HEIGHT) % FIELD_HEIGHT;
        return (
          <span
            key={index}
            className="absolute rounded-full blur-[2px]"
            style={{
              left: `${pebble.x}%`,
              top: `${y - 20}vh`,
              width: pebble.r * 2,
              height: pebble.r * 2,
              marginLeft: -pebble.r,
              marginTop: -pebble.r,
              backgroundColor: pebble.colour,
              opacity: pebble.opacity,
              willChange: 'top',
            }}
          />
        );
      })}
    </div>
  );
};

export const AppBackground: React.FC = () => {
  const { background } = usePsepho();
  if (background === 'none') return null;
  return <PebbleField />;
};
