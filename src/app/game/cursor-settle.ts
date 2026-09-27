/**
 * Pure "cursor settled on a pick" state machine (DESIGN §6.2.4 / §7.3 #5): once the shared cursor
 * (mouse or keyboard) and the pick under it are both unchanged for `CURSOR_SETTLE_MS`, the pick is
 * announced once — any change to either resets the timer and clears the "already announced" flag,
 * so a fresh 150 ms of stillness is needed before the next announcement. DOM-free / unit-testable;
 * `Selection.frame()` is the only caller.
 * Owner: E4b.
 */
import type { Point } from '../../core/types.ts';

export interface SettleState {
  readonly cursor: Point | null;
  readonly pickId: number | null;
  readonly ms: number;
  readonly announced: boolean;
}

export const INITIAL_SETTLE: SettleState = { cursor: null, pickId: null, ms: 0, announced: false };

function pointsEqual(a: Point | null, b: Point | null): boolean {
  return a === b || (a !== null && b !== null && a.x === b.x && a.y === b.y);
}

/** Advance the settle timer by `elapsedMs` for this frame's `cursor`/`pickId`. */
export function advanceSettle(prev: SettleState, elapsedMs: number, cursor: Point | null, pickId: number | null): SettleState {
  if (!pointsEqual(cursor, prev.cursor) || pickId !== prev.pickId) {
    return { cursor, pickId, ms: 0, announced: false };
  }
  return { ...prev, ms: prev.ms + elapsedMs };
}

/** True exactly once per settle streak, the frame `ms` first reaches `settleMs` with a real pick. */
export function shouldAnnounceSettle(state: SettleState, settleMs: number): boolean {
  return state.pickId !== null && !state.announced && state.ms >= settleMs;
}

/** Mark the current streak as already announced (call right after acting on `shouldAnnounceSettle`). */
export function markAnnounced(state: SettleState): SettleState {
  return { ...state, announced: true };
}
