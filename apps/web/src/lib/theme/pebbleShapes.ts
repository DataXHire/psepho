/**
 * Silhouettes for the pebble background.
 *
 * A circle does not read as a pebble, but neither does a lumpy polygon —
 * random per-vertex jitter is what makes a shape look hand-drawn. A water-worn
 * stone is smooth: its outline is an ellipse with a couple of very low
 * frequencies laid over it, nothing sharper. So each shape here is built from
 * an analytic radius function
 *
 *     r(θ) = 1 + Σ aₖ·cos(kθ + φₖ)   for k = 2, 3, 4
 *
 * with small amplitudes, sampled densely enough that the curve through the
 * samples reproduces the function rather than approximating it. The result has
 * no vertices to see.
 *
 * The library is built once from a fixed seed, so the shapes are identical
 * everywhere and reviewable; which shape a given pebble uses is chosen per page
 * load, in the browser.
 */

export const PEBBLE_SHAPE_COUNT = 16;

/** Samples per outline. Well above the highest harmonic, so nothing is lost. */
const SAMPLES = 24;

interface Point {
  x: number;
  y: number;
}

/** Small deterministic PRNG so the library never shifts between builds. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Closed cubic path through `points`, with control points taken from each
 * vertex's neighbours — the standard Catmull-Rom to Bezier conversion. Every
 * segment meets the next with a matching tangent, so the outline is smooth.
 */
function smoothClosedPath(points: Point[]): string {
  const at = (i: number) => points[(i + points.length) % points.length];
  const round = (n: number) => Number(n.toFixed(1));

  let d = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < points.length; i += 1) {
    const previous = at(i - 1);
    const current = at(i);
    const next = at(i + 1);
    const after = at(i + 2);

    const c1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const c2 = {
      x: next.x - (after.x - current.x) / 6,
      y: next.y - (after.y - current.y) / 6,
    };

    d += `C${round(c1.x)},${round(c1.y)} ${round(c2.x)},${round(c2.y)} ${round(next.x)},${round(next.y)}`;
  }
  return `${d}Z`;
}

interface Shape {
  d: string;
  /** Mean radius in the 0..100 box — what collision treats as the stone's size. */
  radius: number;
}

function buildShape(seed: number): Shape {
  const random = seededRandom(seed);

  // Stones are wider than tall, by varying amounts.
  const squash = 0.74 + random() * 0.18;
  // Two or three gentle swells around the outline. Amplitudes stay small: past
  // roughly 0.08 the silhouette starts to look drawn rather than worn.
  const harmonics = [2, 3, 4].map((k) => ({
    k,
    amplitude: (0.045 + random() * 0.045) / (k - 1),
    phase: random() * Math.PI * 2,
  }));
  const tilt = random() * Math.PI * 2;

  const points: Point[] = [];
  let radiusSum = 0;

  for (let i = 0; i < SAMPLES; i += 1) {
    const angle = (i / SAMPLES) * Math.PI * 2;
    const radius = harmonics.reduce(
      (sum, h) => sum + h.amplitude * Math.cos(h.k * angle + h.phase),
      1
    );
    radiusSum += radius;
    const a = angle + tilt;
    points.push({
      x: 50 + Math.cos(a) * radius * 47,
      y: 50 + Math.sin(a) * radius * 47 * squash,
    });
  }

  // Collision treats a stone as a disc; this is the radius that fits it best.
  const meanRadius = (radiusSum / SAMPLES) * 47 * ((1 + squash) / 2);

  return { d: smoothClosedPath(points), radius: meanRadius };
}

const SHAPES: Shape[] = Array.from({ length: PEBBLE_SHAPE_COUNT }, (_, index) =>
  buildShape(0x9e3779b9 + index * 0x85ebca6b)
);

export const PEBBLE_SHAPES: string[] = SHAPES.map((shape) => shape.d);

/** Mean radius of each shape, in the same 0..100 box the paths are drawn in. */
export const PEBBLE_SHAPE_RADII: number[] = SHAPES.map((shape) => shape.radius);
