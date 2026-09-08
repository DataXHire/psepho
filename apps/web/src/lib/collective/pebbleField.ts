import { PEBBLE_SHAPES, PEBBLE_SHAPE_RADII, choiceColours } from '@/lib/theme';

/**
 * The little world the background pebbles live in.
 *
 * Kept apart from the component because it is plain arithmetic with no React in
 * it: a scatter that does not overlap, a scroll that moves near stones further
 * than far ones, and stones that push each other out of the way when their
 * different speeds bring them together.
 *
 * Positions are state, not a function of the scroll offset. A stone knocked
 * aside stays where the knock left it, and scrolling back up does not undo it.
 */

/** Field height as a multiple of the viewport, so stones exist off-screen too. */
export const FIELD_VIEWPORTS = 1.6;

const RULES = {
  /** Share of the field the stones cover. Enough to read, sparse enough to see through. */
  coverage: 0.13,
  /** No two stones start closer than this fraction of their combined radii. */
  spawnGap: 1.12,
  minRadius: 26,
  maxRadius: 96,
  /** Pixels a stone drifts per pixel scrolled, at full depth. */
  parallax: 0.16,
  /** How much of the approach speed is returned as separation. */
  restitution: 0.55,
  /** A glancing touch should still show; this is the least it can impart. */
  minKick: 0.35,
  /**
   * Stones are irregular, so contact almost never falls exactly on the line
   * between their centres. This is how far off that line a hit can land — it
   * is what makes a meeting scatter rather than simply rebound, and it stops
   * two stones in the same column bouncing up and down forever.
   */
  contactScatter: 0.45,
  linearDamping: 0.9,
  spinDamping: 0.94,
  /** Below this, motion is finished and the loop can stop. */
  restSpeed: 0.02,
} as const;

export interface Stone {
  shape: number;
  colour: string;
  x: number;
  y: number;
  radius: number;
  /** Rendered box, larger than the collision radius by the shape's proportions. */
  size: number;
  angle: number;
  spin: number;
  vx: number;
  vy: number;
  /** 0 far, 1 near: drives size, drift and weight together. */
  depth: number;
  fillOpacity: number;
  strokeOpacity: number;
}

export interface FieldBounds {
  width: number;
  height: number;
}

export function fieldBounds(viewportWidth: number, viewportHeight: number): FieldBounds {
  return { width: viewportWidth, height: viewportHeight * FIELD_VIEWPORTS };
}

/** Shortest gap between two rows in a field that wraps top to bottom. */
function wrappedDelta(from: number, to: number, height: number): number {
  let delta = to - from;
  if (delta > height / 2) delta -= height;
  else if (delta < -height / 2) delta += height;
  return delta;
}

/**
 * A fresh scatter: stones are dropped at random and rejected where they would
 * land on one already placed, until they cover the target share of the field.
 */
export function scatter(bounds: FieldBounds): Stone[] {
  const target = bounds.width * bounds.height * RULES.coverage;
  const stones: Stone[] = [];
  let covered = 0;
  let attempts = 0;

  while (covered < target && attempts < 900) {
    attempts += 1;

    const depth = Math.random();
    const shape = Math.floor(Math.random() * PEBBLE_SHAPES.length);
    const size =
      (RULES.minRadius + depth * (RULES.maxRadius - RULES.minRadius)) * 2;
    const radius = (size * PEBBLE_SHAPE_RADII[shape]) / 100;

    const x = radius + Math.random() * Math.max(1, bounds.width - radius * 2);
    const y = Math.random() * bounds.height;

    const clashes = stones.some((other) => {
      const dx = other.x - x;
      const dy = wrappedDelta(y, other.y, bounds.height);
      return Math.hypot(dx, dy) < (radius + other.radius) * RULES.spawnGap;
    });
    if (clashes) continue;

    stones.push({
      shape,
      colour: choiceColours[Math.floor(Math.random() * choiceColours.length)].color,
      x,
      y,
      radius,
      size,
      angle: Math.random() * 360,
      spin: 0,
      vx: 0,
      vy: 0,
      depth,
      // Near stones read heavier; far ones recede.
      fillOpacity: 0.12 + depth * 0.14,
      strokeOpacity: 0.24 + depth * 0.22,
    });
    covered += Math.PI * radius * radius;
  }

  return stones;
}

/**
 * Advances the world by one frame.
 *
 * `scrolled` is how far the page moved since the last frame. It enters as a
 * driving velocity rather than as a position, so a collision can be resolved
 * against it: two stones closing at different speeds exchange an impulse and
 * separate, instead of sliding through one another.
 *
 * Returns whether anything is still moving, so the caller can stop animating.
 */
export function step(stones: Stone[], bounds: FieldBounds, scrolled: number): boolean {
  const { height, width } = bounds;

  for (const stone of stones) {
    const drive = -scrolled * (0.25 + stone.depth) * RULES.parallax;

    stone.x += stone.vx;
    stone.y += stone.vy + drive;
    stone.angle += stone.spin;

    stone.vx *= RULES.linearDamping;
    stone.vy *= RULES.linearDamping;
    stone.spin *= RULES.spinDamping;

    // The sides are walls; the top and bottom wrap.
    if (stone.x < stone.radius) {
      stone.x = stone.radius;
      stone.vx = Math.abs(stone.vx) * 0.5;
    } else if (stone.x > width - stone.radius) {
      stone.x = width - stone.radius;
      stone.vx = -Math.abs(stone.vx) * 0.5;
    }
    stone.y = ((stone.y % height) + height) % height;

    // Kept for the impulse below: the speed the scroll is imposing this frame.
    (stone as Stone & { drive: number }).drive = drive;
  }

  for (let i = 0; i < stones.length; i += 1) {
    for (let j = i + 1; j < stones.length; j += 1) {
      const a = stones[i] as Stone & { drive: number };
      const b = stones[j] as Stone & { drive: number };

      const dx = b.x - a.x;
      const dy = wrappedDelta(a.y, b.y, height);
      const distance = Math.hypot(dx, dy);
      const touching = a.radius + b.radius;
      if (distance >= touching || distance === 0) continue;

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = touching - distance;

      // Separate first, so they are never left inside one another.
      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const relativeX = b.vx - a.vx;
      const relativeY = b.vy + b.drive - (a.vy + a.drive);
      const closing = relativeX * nx + relativeY * ny;
      if (closing > 0) continue; // already parting

      const impulse = Math.max(
        RULES.minKick,
        (-(1 + RULES.restitution) * closing) / 2
      );
      // Along the contact normal, plus a nudge across it for the irregularity.
      const skew = (Math.random() - 0.5) * RULES.contactScatter * impulse;
      const tx = -ny;
      const ty = nx;

      a.vx -= impulse * nx + skew * tx;
      a.vy -= impulse * ny + skew * ty;
      b.vx += impulse * nx + skew * tx;
      b.vy += impulse * ny + skew * ty;

      // Contact off-centre sets them rolling.
      const tangential = relativeX * tx + relativeY * ty + skew * 4;
      a.spin -= tangential * 0.05;
      b.spin += tangential * 0.05;
    }
  }

  return stones.some(
    (stone) =>
      Math.abs(stone.vx) > RULES.restSpeed ||
      Math.abs(stone.vy) > RULES.restSpeed ||
      Math.abs(stone.spin) > RULES.restSpeed
  );
}

/** Keeps a scatter inside a resized window without rebuilding it. */
export function reflow(stones: Stone[], bounds: FieldBounds): void {
  for (const stone of stones) {
    stone.x = Math.max(stone.radius, Math.min(bounds.width - stone.radius, stone.x));
    stone.y = ((stone.y % bounds.height) + bounds.height) % bounds.height;
  }
}
