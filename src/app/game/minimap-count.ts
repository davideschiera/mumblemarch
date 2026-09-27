/**
 * Pure helper for the minimap slider's `aria-valuetext` (§7.2: "…{n} mumbles in view."): how many
 * non-removed mumbles sit inside a world-x window. Split out from MinimapControl so it is
 * Node-testable against a plain lemming list.
 * Owner: E4a.
 */
import type { Lemming } from '../../core/types.ts';

/** Count of `lemmings` with `x0 <= x < x1` (the camera's current world-x window) that are still in play. */
export function countMumblesInView(lemmings: readonly Readonly<Lemming>[], x0: number, x1: number): number {
  let n = 0;
  for (const lem of lemmings) {
    if (!lem.removed && lem.x >= x0 && lem.x < x1) n++;
  }
  return n;
}
