/**
 * Pure release-rate math (DESIGN §6.1.1, §6.4.4): the per-press delta (±1, Shift ±10) and the
 * clamp-and-limit check the core applies (`[level minimum, 99]`), reproduced here so
 * `release-rate.ts` can predict an at-limit denial (and skip sending a no-op command) without
 * touching the session. DOM-free so it is unit-testable in Node.
 * Owner: E5a.
 */
import { RR_SHIFT_STEP } from '../config.ts';

/** DESIGN §6.1.1: ±1 per press, `Shift` ±10. */
export function releaseRateStepAmount(dir: -1 | 1, shift: boolean): number {
  return dir * (shift ? RR_SHIFT_STEP : 1);
}

/** The core's clamp (`core/session.ts` `setRate`): round, then bound to `[min, max]`. */
export function clampReleaseRate(rate: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(rate)));
}

/** Would applying `delta` to `current` actually change the clamped rate (i.e. not at the limit)? */
export function releaseRateWouldChange(current: number, delta: number, min: number, max: number): boolean {
  return clampReleaseRate(current + delta, min, max) !== current;
}
