import React from 'react';
import Svg, { Path } from 'react-native-svg';

const PEBBLE_PATHS = [
  'M 6,1 C 9.5,1 12,3.2 12,6.5 C 12,9.8 9.2,12 5.8,12 C 2.4,12 0.5,9.5 0.5,6 C 0.5,2.8 2.8,1 6,1 Z',
  'M 5.5,0.8 C 9,0.5 11.8,2.8 11.5,6.2 C 11.2,9.5 8.5,12.2 5,11.8 C 1.8,11.5 0.2,8.8 0.8,5.2 C 1.2,2.2 2.8,1 5.5,0.8 Z',
  'M 6.2,1.2 C 10,1.8 12.2,4.5 11.8,7.5 C 11.4,10.2 8.8,12 5.5,11.5 C 2.2,11 0.8,8.5 1,5.5 C 1.2,2.5 3.2,0.8 6.2,1.2 Z',
];

interface MobilePebbleProps {
  seed?: number;
  color?: string;
  size?: number;
}

export function MobilePebble({
  seed = 0,
  color = '#2E6B5A',
  size = 11,
}: MobilePebbleProps) {
  const path = PEBBLE_PATHS[Math.abs(seed) % PEBBLE_PATHS.length];

  return (
    <Svg width={size} height={size} viewBox="0 0 13 13">
      <Path d={path} fill={color} />
    </Svg>
  );
}
