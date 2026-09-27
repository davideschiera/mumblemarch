/**
 * Shared mask geometry for the basher and miner (docs/development/core-rules.md §S).
 *
 * "t" is the dir-relative column offset from the notation section at the top of core-rules.md:
 * pixel column = anchorX + t·dir. Both the state handlers and the `rejectReason` functions call
 * these so a refusal tests exactly the pixels the handler would carve (§R: "same geometry
 * functions"). No arrays/closures are allocated here — every scan is a plain nested loop.
 */
import type { ReadonlyTerrain, Terrain } from '../terrain.ts';
import type { Direction } from '../types.ts';
import { isOneWayAgainst, isSteel } from './movement.ts';

export interface MaskHit {
  readonly x: number;
  readonly y: number;
}

// ─── Basher: mask t ∈ [−8, 7] × rows y−10..y−1 (16×10, BASH_MASK); test region t ∈ [0, 7] ──

const BASH_TEST_T = { from: 0, to: 7 } as const;
const BASH_MASK_T = { from: -8, to: 7 } as const;

/** First steel pixel in the basher's test region, scanning t ascending then rows top→bottom. */
export function basherFirstSteel(terrain: ReadonlyTerrain, x: number, y: number, dir: Direction): MaskHit | null {
  const yFrom = y - 10;
  const yTo = y - 1;
  for (let t = BASH_TEST_T.from; t <= BASH_TEST_T.to; t++) {
    const px = x + t * dir;
    for (let py = yFrom; py <= yTo; py++) if (isSteel(terrain, px, py)) return { x: px, y: py };
  }
  return null;
}

/** True when the basher's test region contains one-way earth pointing against `dir`. */
export function basherOneWayAgainst(terrain: ReadonlyTerrain, x: number, y: number, dir: Direction): boolean {
  const yFrom = y - 10;
  const yTo = y - 1;
  for (let t = BASH_TEST_T.from; t <= BASH_TEST_T.to; t++) {
    const px = x + t * dir;
    for (let py = yFrom; py <= yTo; py++) if (isOneWayAgainst(terrain, px, py, dir)) return true;
  }
  return false;
}

/** Remove every pixel of the full 16×10 basher mask (steel and against-dir one-way stay put). */
export function basherCarve(terrain: Terrain, x: number, y: number, dir: Direction): void {
  const yFrom = y - 10;
  const yTo = y - 1;
  for (let t = BASH_MASK_T.from; t <= BASH_MASK_T.to; t++) {
    const px = x + t * dir;
    for (let py = yFrom; py <= yTo; py++) terrain.remove(px, py, dir);
  }
}

// ─── Miner: slanted 16×13 mask (MINE_MASK), t ∈ [−7, 8]; test region t ∈ [0, 8] ────────────
//
// For column t the mask covers 13 rows ending at `bottom(t) = anchorY + b(t)`, with
// `b(t) = floor(t/2) − 1` for t ≤ 1, `floor(t/2) − 2` for t ≥ 2 — a diagonal staircase that
// never covers the anchor's own foot pixel (t = 0 → bottom = anchorY − 1) so the mask never
// carves the pixel the lemming is standing on.

const MINE_MASK_T = { from: -7, to: 8 } as const;
const MINE_TEST_T = { from: 0, to: 8 } as const;
const MINE_MASK_HEIGHT = 13;

function minerBottomOffset(t: number): number {
  return t <= 1 ? Math.floor(t / 2) - 1 : Math.floor(t / 2) - 2;
}

/** First steel pixel in the miner's test region anchored at (ax, ay), t ascending, rows top→bottom. */
export function minerFirstSteel(terrain: ReadonlyTerrain, ax: number, ay: number, dir: Direction): MaskHit | null {
  for (let t = MINE_TEST_T.from; t <= MINE_TEST_T.to; t++) {
    const px = ax + t * dir;
    const bottom = ay + minerBottomOffset(t);
    const yFrom = bottom - (MINE_MASK_HEIGHT - 1);
    for (let py = yFrom; py <= bottom; py++) if (isSteel(terrain, px, py)) return { x: px, y: py };
  }
  return null;
}

/** True when the miner's test region anchored at (ax, ay) contains one-way earth against `dir`. */
export function minerOneWayAgainst(terrain: ReadonlyTerrain, ax: number, ay: number, dir: Direction): boolean {
  for (let t = MINE_TEST_T.from; t <= MINE_TEST_T.to; t++) {
    const px = ax + t * dir;
    const bottom = ay + minerBottomOffset(t);
    const yFrom = bottom - (MINE_MASK_HEIGHT - 1);
    for (let py = yFrom; py <= bottom; py++) if (isOneWayAgainst(terrain, px, py, dir)) return true;
  }
  return false;
}

/** True when the miner's test region anchored at (ax, ay) has a steel pixel strictly above `footY`. */
export function minerSteelAboveRow(
  terrain: ReadonlyTerrain,
  ax: number,
  ay: number,
  dir: Direction,
  footY: number,
): boolean {
  for (let t = MINE_TEST_T.from; t <= MINE_TEST_T.to; t++) {
    const px = ax + t * dir;
    const bottom = ay + minerBottomOffset(t);
    const yFrom = bottom - (MINE_MASK_HEIGHT - 1);
    for (let py = yFrom; py <= bottom; py++) {
      if (py < footY && isSteel(terrain, px, py)) return true;
    }
  }
  return false;
}

/** True when the miner's test region anchored at (ax, ay) has a steel pixel at/below `footY`. */
export function minerSteelAtOrBelowRow(
  terrain: ReadonlyTerrain,
  ax: number,
  ay: number,
  dir: Direction,
  footY: number,
): boolean {
  for (let t = MINE_TEST_T.from; t <= MINE_TEST_T.to; t++) {
    const px = ax + t * dir;
    const bottom = ay + minerBottomOffset(t);
    const yFrom = bottom - (MINE_MASK_HEIGHT - 1);
    for (let py = yFrom; py <= bottom; py++) {
      if (py >= footY && isSteel(terrain, px, py)) return true;
    }
  }
  return false;
}

/** Remove every pixel of the full 16×13 miner mask anchored at (ax, ay). */
export function minerCarve(terrain: Terrain, ax: number, ay: number, dir: Direction): void {
  for (let t = MINE_MASK_T.from; t <= MINE_MASK_T.to; t++) {
    const px = ax + t * dir;
    const bottom = ay + minerBottomOffset(t);
    const yFrom = bottom - (MINE_MASK_HEIGHT - 1);
    for (let py = yFrom; py <= bottom; py++) terrain.remove(px, py, dir);
  }
}
