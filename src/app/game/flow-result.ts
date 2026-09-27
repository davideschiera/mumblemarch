/**
 * Pure level-end arithmetic (DESIGN §7.9), split out of flow.ts so it is unit-testable without a
 * PlayContext: `inTime` and the `ResultRecord` the results screen needs, computed BEFORE
 * `save.recordResult` touches progress (the previous best/attempts must be read first).
 * Owner: E5a2.
 */
import type { LevelOutcome } from '../../core/types.ts';
import type { ResultRecord } from '../../ui/screens/screen.ts';

/** §7.9: a standard-timer win with no overtime at all (relaxed runs are never "in time"). */
export function computeInTime(outcome: Pick<LevelOutcome, 'won' | 'overtimeTicks'>, relaxedTimer: boolean): boolean {
  return outcome.won && !relaxedTimer && outcome.overtimeTicks === 0;
}

export interface PreviousProgress {
  readonly bestSaved?: number;
  readonly attempts?: number;
}

/** Everything the results screen needs but cannot recompute once progress is saved (§9.5). */
export function computeResultRecord(
  outcome: Pick<LevelOutcome, 'won' | 'saved' | 'overtimeTicks'>,
  relaxedTimer: boolean,
  prev: PreviousProgress | undefined,
): ResultRecord {
  return {
    newBest: outcome.saved > (prev?.bestSaved ?? 0),
    attempt: prev?.attempts ?? 0,
    relaxed: relaxedTimer,
    inTime: computeInTime(outcome, relaxedTimer),
  };
}
