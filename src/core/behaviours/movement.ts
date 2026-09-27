/**
 * Shared movement helpers used by several behaviours (walking, building, bashing…).
 * Keep physics rules here so every state agrees on what "ground" and "wall" mean.
 * Rules: docs/development/core-rules.md (§M, §S).
 */
import { FALL_COUNTER_STEP, HEAD_CLAMP_Y } from '../constants.ts';
import { Material, type ReadonlyTerrain } from '../terrain.ts';
import type { Direction, Lemming } from '../types.ts';
import { setState } from './context.ts';

/** How far above the foot a mumble's head is (px). Used for every head-clamp test. */
export const HEAD_DY = 10;

/** Solid for movement purposes: terrain, or beyond the left/right level edge (edges are walls). */
export function isSolidOrEdge(terrain: ReadonlyTerrain, x: number, y: number): boolean {
  return x < 0 || x >= terrain.width || terrain.isSolid(x, y);
}

/** True when `x` is outside the level columns [0, width). */
export function isOutsideX(terrain: ReadonlyTerrain, x: number): boolean {
  return x < 0 || x >= terrain.width;
}

/**
 * Number of consecutive solid pixels directly above (x, y) — at y−1, y−2, … — counting at most
 * `max`. With the foot on the top solid pixel of a step, this is the step height.
 */
export function solidRunAbove(terrain: ReadonlyTerrain, x: number, y: number, max: number): number {
  let n = 0;
  while (n < max && terrain.isSolid(x, y - 1 - n)) n++;
  return n;
}

/** Height of solid terrain directly in front of the feet (at x + dir), capped at `max`. */
export function wallHeightAhead(terrain: ReadonlyTerrain, lem: Readonly<Lemming>, max: number): number {
  const x = lem.x + lem.dir;
  if (!terrain.isSolid(x, lem.y)) return 0;
  return 1 + solidRunAbove(terrain, x, lem.y, max - 1);
}

/** Smallest d in 1..max with a solid pixel at (x, y + d), or 0 when there is none within `max`. */
export function gapBelow(terrain: ReadonlyTerrain, x: number, y: number, max: number): number {
  for (let d = 1; d <= max; d++) if (terrain.isSolid(x, y + d)) return d;
  return 0;
}

/** True when the lemming has ground under its foot anchor. */
export function isSupported(terrain: ReadonlyTerrain, lem: Readonly<Lemming>): boolean {
  return terrain.isSolid(lem.x, lem.y);
}

/** Would the head (HEAD_DY above a foot at `y`) be above the level top clamp? */
export function headAboveTop(y: number): boolean {
  return y - HEAD_DY < HEAD_CLAMP_Y;
}

/** Enter the falling state with a fresh fall counter (FALL_COUNTER_STEP), at the current (x, y). */
export function startFalling(lem: Lemming): void {
  setState(lem, 'falling');
  lem.fallDistance = FALL_COUNTER_STEP;
}

/** Face the other way. Does not move the lemming. */
export function turnAround(lem: Lemming): void {
  lem.dir = lem.dir === 1 ? -1 : 1;
}

/** One-way earth whose arrow points against `dir` (bashers/miners may not remove it). */
export function isOneWayAgainst(terrain: ReadonlyTerrain, x: number, y: number, dir: Direction): boolean {
  const m = terrain.get(x, y);
  return (m === Material.OneWayLeft && dir === 1) || (m === Material.OneWayRight && dir === -1);
}

/** Steel pixel (never removed by anything). */
export function isSteel(terrain: ReadonlyTerrain, x: number, y: number): boolean {
  return terrain.get(x, y) === Material.Steel;
}
