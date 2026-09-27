/**
 * Procedural terrain texture primitives (DESIGN §4.2), ported 1:1 from the reference
 * implementation in `docs/design/mockups/sprites-themes.html` → `buildTerrain` (the "5 ·
 * Terrain themes" section). Every function here is a PURE function of its numeric inputs
 * (chiefly the level's seed), so colouring is independent of primitive paint order and of any
 * sequential RNG — the same pixel always gets the same colour, in the browser and in tests.
 *
 * Keep these bit-identical to the reference: `tests/level-compiler.test.ts` loads the reference
 * source in a `vm` sandbox and compares full terrain buffers against this module's output.
 */

/**
 * `h2(x, y, s)`: one mulberry32 step on the mixed seed `(s, x, y)`. Returns a float in [0, 1).
 * This is the ONLY source of "randomness" for terrain colouring — no relation to `core/rng.ts`'s
 * sequential `Rng` (which still seeds physics/session concerns, not terrain pixels).
 */
export function h2(x: number, y: number, s: number): number {
  let t = (s ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Bilinear (smoothstep) value noise over an `h2` lattice at cell size `cx`×`cy`. */
export function vnoise(x: number, y: number, cx: number, cy: number, s: number): number {
  const gx = x / cx;
  const gy = y / cy;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy, s);
  const b = h2(ix + 1, iy, s);
  const c = h2(ix, iy + 1, s);
  const d = h2(ix + 1, iy + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Positive modulo (`-1 mod 8 === 7`, unlike `%`). */
export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * 8×8 world-aligned steel plate tile (DESIGN §4.3). `L`/`r` = bevel (`steel[2]`), `M` = plate
 * (`steel[1]`), `D`/`d` = seam (`steel[0]`); region edges override per-pixel (see `buildTerrain`).
 */
export const PLATE = [
  'LLLLLLLD',
  'LrMMMMrD',
  'LdMMMMdD',
  'LMMMMMMD',
  'LMMMMMMD',
  'LrMMMMrD',
  'LdMMMMdD',
  'DDDDDDDD',
] as const;

/**
 * 8×8 one-way chevron tile (DESIGN §4.4), drawn pointing RIGHT. Rows of tiles alternate a 4px x
 * stagger (`ox = (row % 2) * 4`); one-way-LEFT mirrors it (`cx = 7 - cx`). `A` = `oneWay`,
 * `E` = `oneWayEdge`.
 */
export const CHEV = [
  '........',
  'AAE.....',
  '.AAE....',
  '..AAE...',
  '.AAE....',
  'AAE.....',
  '........',
  '........',
] as const;
