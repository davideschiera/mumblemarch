/**
 * Pure cycling helpers for DESIGN §6.1.1 Home/End ("centre on the first hatch / nearest exit;
 * pressing again cycles hatches/exits"). `camera-control.ts` keeps the per-kind index and calls
 * these; kept pure (plain numbers, no LevelDef) so the cycling order is Node-testable.
 * Owner: E4a.
 */

/** Home always starts at the first hatch; each further press advances one, wrapping. `length`
 * 0 → null (nothing to jump to). */
export function nextCycleIndex(length: number, current: number | null): number | null {
  if (length <= 0) return null;
  return current === null ? 0 : (current + 1) % length;
}

/** End's first press: the index of the exit nearest `x` (the view centre); ties keep the earlier
 * (lowest) index. Empty `xs` → null. */
export function nearestIndex(xs: readonly number[], x: number): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let i = 0; i < xs.length; i++) {
    const distance = Math.abs((xs[i] as number) - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}
