'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { usePsepho } from '@/lib/collective/PsephoContext';
import { PEBBLE_SHAPES, choiceColours, darken, lighten, palette } from '@/lib/theme';
import {
  FIELD_VIEWPORTS,
  fieldBounds,
  reflow,
  scatter,
  step,
  type Stone,
} from '@/lib/collective/pebbleField';

/**
 * The decorative layer behind the page, chosen by `appConfig.background` and
 * changeable by the viewer.
 *
 * `none` renders nothing. `pebble` scatters voting pebbles that drift with the
 * scroll and knock each other aside when they meet. It is purely ornamental:
 * inert to pointers, hidden from assistive tech, and still for anyone who asked
 * for less motion.
 *
 * Simulation lives in `lib/collective/pebbleField`; this component owns only
 * the DOM and the animation loop.
 */

const PebbleField: React.FC = () => {
  const [stones, setStones] = useState<Stone[]>([]);
  const fieldRef = useRef<HTMLDivElement>(null);
  const gradientPrefix = `pebble-${useId().replace(/:/g, '')}`;

  // Randomised per visit, in the browser: doing it during render would make the
  // server and the first client paint disagree.
  useEffect(() => {
    setStones(scatter(fieldBounds(window.innerWidth, window.innerHeight)));
  }, []);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || stones.length === 0) return;

    const nodes = Array.from(field.querySelectorAll<SVGSVGElement>('svg[data-stone]'));
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let bounds = fieldBounds(window.innerWidth, window.innerHeight);
    let lastScroll = window.scrollY;
    let pendingScroll = 0;
    let frame = 0;
    let idle = 0;

    const paint = () => {
      const lift = (bounds.height - window.innerHeight) / 2;
      for (let i = 0; i < nodes.length; i += 1) {
        const stone = stones[i];
        nodes[i].style.transform = `translate3d(${stone.x - stone.size / 2}px, ${
          stone.y - lift - stone.size / 2
        }px, 0)`;
        const path = nodes[i].firstElementChild as SVGPathElement;
        path.setAttribute('transform', `rotate(${stone.angle.toFixed(1)} 50 50)`);
      }
    };

    const tick = () => {
      const scrolled = pendingScroll;
      pendingScroll = 0;
      const moving = step(stones, bounds, scrolled);
      paint();

      // Keep running a little past the last motion so a collision finishes,
      // then stop rather than burning frames on a settled field.
      idle = moving || scrolled !== 0 ? 0 : idle + 1;
      frame = idle > 20 ? 0 : requestAnimationFrame(tick);
    };

    /** Restarts the loop if it stopped. Never gates the scroll itself. */
    const wake = () => {
      idle = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      const now = window.scrollY;
      pendingScroll += now - lastScroll;
      lastScroll = now;
      if (still) {
        // No animation, but the field still has to follow the page.
        step(stones, bounds, pendingScroll);
        pendingScroll = 0;
        paint();
        return;
      }
      wake();
    };

    const onResize = () => {
      bounds = fieldBounds(window.innerWidth, window.innerHeight);
      reflow(stones, bounds);
      still ? paint() : wake();
    };

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stones]);

  return (
    <div
      ref={fieldRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: palette.background }}
    >
      {/* One gradient per choice colour, shared by every stone that uses it.
          `userSpaceOnUse` anchors the light to the drawing box rather than to
          the path, so a stone that rolls keeps its highlight facing the light
          instead of carrying it round. */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <defs>
          {choiceColours.map((choice, index) => (
            <radialGradient
              key={choice.color}
              id={`${gradientPrefix}-${index}`}
              gradientUnits="userSpaceOnUse"
              cx="34"
              cy="28"
              r="78"
            >
              <stop offset="0%" stopColor={lighten(choice.color, 0.55)} />
              <stop offset="45%" stopColor={choice.color} />
              <stop offset="100%" stopColor={darken(choice.color, 0.4)} />
            </radialGradient>
          ))}
        </defs>
      </svg>

      {stones.map((stone, index) => {
        const colourIndex = choiceColours.findIndex((c) => c.color === stone.colour);
        return (
          <svg
            key={index}
            data-stone
            viewBox="0 0 100 100"
            className="absolute left-0 top-0"
            style={{ width: stone.size, height: stone.size, willChange: 'transform' }}
          >
            <path
              d={PEBBLE_SHAPES[stone.shape]}
              fill={`url(#${gradientPrefix}-${Math.max(0, colourIndex)})`}
              fillOpacity={stone.fillOpacity}
              stroke={darken(stone.colour, 0.2)}
              strokeOpacity={stone.strokeOpacity}
              strokeWidth={1.4}
              // A hairline that keeps the same weight whatever size the stone
              // is drawn at, so the outline reads as an edge, not as scale.
              vectorEffect="non-scaling-stroke"
            />
          </svg>
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

export { FIELD_VIEWPORTS };
