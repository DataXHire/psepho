import React from 'react';

// Three seeded organic pebble SVG paths
const PEBBLE_PATHS = [
  // Variant 0: Smooth river pebble
  'M 6,1 C 9.5,1 12,3.2 12,6.5 C 12,9.8 9.2,12 5.8,12 C 2.4,12 0.5,9.5 0.5,6 C 0.5,2.8 2.8,1 6,1 Z',
  // Variant 1: Asymmetrical natural stone
  'M 5.5,0.8 C 9,0.5 11.8,2.8 11.5,6.2 C 11.2,9.5 8.5,12.2 5,11.8 C 1.8,11.5 0.2,8.8 0.8,5.2 C 1.2,2.2 2.8,1 5.5,0.8 Z',
  // Variant 2: Slightly tapered pebble
  'M 6.2,1.2 C 10,1.8 12.2,4.5 11.8,7.5 C 11.4,10.2 8.8,12 5.5,11.5 C 2.2,11 0.8,8.5 1,5.5 C 1.2,2.5 3.2,0.8 6.2,1.2 Z',
];

interface PebbleGlyphProps {
  seed?: number;
  color?: string;
  size?: number;
  className?: string;
  isAnimated?: boolean;
}

export function PebbleGlyph({
  seed = 0,
  color = 'currentColor',
  size = 11,
  className = '',
  isAnimated = false,
}: PebbleGlyphProps) {
  const path = PEBBLE_PATHS[Math.abs(seed) % PEBBLE_PATHS.length];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      fill={color}
      className={`inline-block flex-shrink-0 align-middle ${isAnimated ? 'animate-pebble-drop' : ''} ${className}`}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}
