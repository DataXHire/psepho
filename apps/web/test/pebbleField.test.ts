import { describe, it, expect } from 'vitest';
import { fieldBounds, reflow, scatter, step, type Stone } from '../src/lib/collective/pebbleField';

const bounds = fieldBounds(1400, 900);

/** Distance between two stones in a field that wraps top to bottom. */
function gap(a: Stone, b: Stone): number {
  let dy = b.y - a.y;
  if (dy > bounds.height / 2) dy -= bounds.height;
  else if (dy < -bounds.height / 2) dy += bounds.height;
  return Math.hypot(b.x - a.x, dy);
}

function settle(stones: Stone[], frames = 240) {
  for (let i = 0; i < frames; i += 1) step(stones, bounds, 0);
}

describe('pebble field', () => {
  describe('scatter', () => {
    it('fills the field without letting any two stones overlap', () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const stones = scatter(bounds);
        expect(stones.length).toBeGreaterThan(8);
        for (let i = 0; i < stones.length; i += 1) {
          for (let j = i + 1; j < stones.length; j += 1) {
            expect(gap(stones[i], stones[j])).toBeGreaterThanOrEqual(
              stones[i].radius + stones[j].radius
            );
          }
        }
      }
    });

    it('covers a useful share of the field without smothering it', () => {
      const stones = scatter(bounds);
      const covered = stones.reduce((sum, s) => sum + Math.PI * s.radius ** 2, 0);
      const share = covered / (bounds.width * bounds.height);
      expect(share).toBeGreaterThan(0.08);
      expect(share).toBeLessThan(0.25);
    });

    it('yields nothing for a field with no area, rather than looping', () => {
      expect(scatter(fieldBounds(0, 0))).toEqual([]);
      expect(scatter(fieldBounds(1400, 0))).toEqual([]);
    });

    it('lays out differently each time', () => {
      const signature = (stones: Stone[]) =>
        stones.map((s) => `${s.x.toFixed(1)},${s.y.toFixed(1)}`).join('|');
      expect(signature(scatter(bounds))).not.toBe(signature(scatter(bounds)));
    });
  });

  describe('scrolling', () => {
    it('moves near stones further than far ones', () => {
      const near: Stone = { ...scatter(bounds)[0], x: 200, y: 400, depth: 1, vx: 0, vy: 0, spin: 0 };
      const far: Stone = { ...near, x: 900, depth: 0 };
      const stones = [near, far];
      const before = stones.map((s) => s.y);

      step(stones, bounds, 300);

      const nearMoved = Math.abs(stones[0].y - before[0]);
      const farMoved = Math.abs(stones[1].y - before[1]);
      expect(nearMoved).toBeGreaterThan(farMoved);
      expect(farMoved).toBeGreaterThan(0);
    });
  });

  describe('collisions', () => {
    /** Two stones in the same column, closing because their depths differ. */
    function collisionCourse(): Stone[] {
      const template = scatter(bounds)[0];
      const chaser: Stone = {
        ...template, x: 500, y: 500, radius: 60, size: 140,
        depth: 1, vx: 0, vy: 0, spin: 0, angle: 0,
      };
      const ahead: Stone = { ...chaser, y: 380, depth: 0 };
      return [chaser, ahead];
    }

    it('separates stones that meet instead of letting them pass through', () => {
      const stones = collisionCourse();
      const touching = stones[0].radius + stones[1].radius;

      // Scroll until they have had every chance to reach each other.
      let closest = Infinity;
      for (let i = 0; i < 200; i += 1) {
        step(stones, bounds, 40);
        closest = Math.min(closest, gap(stones[0], stones[1]));
        // They must never end a frame inside one another.
        expect(gap(stones[0], stones[1])).toBeGreaterThan(touching - 1);
      }
      // And they must actually have met, or the test proves nothing.
      expect(closest).toBeLessThan(touching + 12);
    });

    it('sets stones rolling and pushes them apart when they touch', () => {
      const stones = collisionCourse();
      for (let i = 0; i < 60; i += 1) step(stones, bounds, 40);

      const moving = stones.some((s) => Math.abs(s.vx) > 0.01 || Math.abs(s.vy) > 0.01);
      const rolling = stones.some((s) => Math.abs(s.spin) > 0.01 || s.angle !== 0);
      expect(moving || rolling).toBe(true);
    });

    it('does not undo a collision when the page scrolls back', () => {
      // A lone stone is moved only by parallax, which is reversible: scroll
      // down and back up and it lands exactly where it began.
      const alone = [collisionCourse()[0]];
      const aloneStart = { x: alone[0].x, y: alone[0].y };
      for (let i = 0; i < 120; i += 1) step(alone, bounds, 40);
      for (let i = 0; i < 120; i += 1) step(alone, bounds, -40);
      settle(alone);
      expect(Math.abs(alone[0].x - aloneStart.x)).toBeLessThan(0.5);
      expect(Math.abs(alone[0].y - aloneStart.y)).toBeLessThan(0.5);

      // A pair that meets does not: the knock is carried, not replayed.
      const stones = collisionCourse();
      const startGap = gap(stones[0], stones[1]);
      const startX = stones.map((s) => s.x);

      for (let i = 0; i < 120; i += 1) step(stones, bounds, 40);
      for (let i = 0; i < 120; i += 1) step(stones, bounds, -40);
      settle(stones);

      const changed =
        Math.abs(gap(stones[0], stones[1]) - startGap) > 1 ||
        stones.some((s, i) => Math.abs(s.x - startX[i]) > 1);
      expect(changed).toBe(true);
    });

    it('keeps colliding at the new positions, in either direction', () => {
      const stones = collisionCourse();
      const touching = stones[0].radius + stones[1].radius;
      for (let i = 0; i < 150; i += 1) {
        step(stones, bounds, i % 2 === 0 ? 45 : -45);
        expect(gap(stones[0], stones[1])).toBeGreaterThan(touching - 1);
      }
    });

    it('comes to rest, so the animation loop can stop', () => {
      const stones = collisionCourse();
      for (let i = 0; i < 40; i += 1) step(stones, bounds, 40);
      let moving = true;
      for (let i = 0; i < 400 && moving; i += 1) moving = step(stones, bounds, 0);
      expect(moving).toBe(false);
    });
  });

  describe('resize', () => {
    it('keeps every stone inside the new bounds', () => {
      const stones = scatter(bounds);
      const narrow = fieldBounds(600, 700);
      reflow(stones, narrow);
      for (const stone of stones) {
        expect(stone.x).toBeGreaterThanOrEqual(stone.radius - 0.001);
        expect(stone.x).toBeLessThanOrEqual(narrow.width - stone.radius + 0.001);
        expect(stone.y).toBeGreaterThanOrEqual(0);
        expect(stone.y).toBeLessThanOrEqual(narrow.height);
      }
    });
  });
});
