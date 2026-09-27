/**
 * Pure flow-control logic (DESIGN §6.4.1–§6.4.3, §7.9), DOM-free:
 * - `loopSpeed` (game-speed/FF multiplier), `isTimeLow`, `releaseIntervalSeconds` (rules.ts).
 * - `computeInTime` / `computeResultRecord` (flow-result.ts).
 * - the frame-step hold schedule (HoldRepeater with the real §6.1.1 constants: 300 ms then 100 ms).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FRAME_STEP_REPEAT_DELAY_MS, FRAME_STEP_REPEAT_MS } from '../src/app/config.ts';
import { computeInTime, computeResultRecord } from '../src/app/game/flow-result.ts';
import { HoldRepeater } from '../src/app/game/hold-repeat.ts';
import { isTimeLow, loopSpeed, releaseIntervalSeconds } from '../src/app/game/rules.ts';
import { TICKS_PER_SECOND } from '../src/core/constants.ts';

// ─── rules.ts ──────────────────────────────────────────────────────────────────────────────

test('loopSpeed: ×3 fast-forward × the Game speed setting, never both at once for the base rate', () => {
  assert.equal(loopSpeed(false, 1), 1);
  assert.equal(loopSpeed(true, 1), 3);
  assert.equal(loopSpeed(false, 0.5), 0.5);
  assert.equal(loopSpeed(false, 0.75), 0.75);
  assert.equal(loopSpeed(true, 0.5), 1.5); // FF stacks with Game speed (§6.4.3)
});

test('isTimeLow: under 30 s and no overtime; overtime is never "low"', () => {
  assert.equal(isTimeLow(29 * TICKS_PER_SECOND, 0), true);
  assert.equal(isTimeLow(30 * TICKS_PER_SECOND, 0), false);
  assert.equal(isTimeLow(0, 5), false);
});

test('releaseIntervalSeconds matches the §5.3/§6.4.4 formula', () => {
  assert.equal(releaseIntervalSeconds(99), 4 / TICKS_PER_SECOND);
  assert.equal(releaseIntervalSeconds(1), 53 / TICKS_PER_SECOND);
});

// ─── flow-result.ts (§7.9) ─────────────────────────────────────────────────────────────────

test('computeInTime: won, standard timer, no overtime — the only "in time" case', () => {
  assert.equal(computeInTime({ won: true, overtimeTicks: 0 }, false), true);
  assert.equal(computeInTime({ won: false, overtimeTicks: 0 }, false), false); // lost
  assert.equal(computeInTime({ won: true, overtimeTicks: 0 }, true), false); // relaxed timer
  assert.equal(computeInTime({ won: true, overtimeTicks: 12 }, false), false); // ran into overtime
});

test('computeResultRecord: newBest/attempt read from progress BEFORE this result is recorded', () => {
  const outcome = { won: true, saved: 14, overtimeTicks: 0 };
  const first = computeResultRecord(outcome, false, undefined);
  assert.deepEqual(first, { newBest: true, attempt: 0, relaxed: false, inTime: true });

  const improved = computeResultRecord(outcome, false, { bestSaved: 10, attempts: 3 });
  assert.deepEqual(improved, { newBest: true, attempt: 3, relaxed: false, inTime: true });

  const notBest = computeResultRecord({ ...outcome, saved: 10 }, false, { bestSaved: 14, attempts: 5 });
  assert.equal(notBest.newBest, false);
  assert.equal(notBest.attempt, 5);
});

// ─── Frame-step hold schedule (§6.1.1/§6.4.2): 300 ms first repeat, then every 100 ms ───────

test('frame-step hold: first repeat at 300 ms, then every 100 ms (10 steps/s)', () => {
  const hold = new HoldRepeater(FRAME_STEP_REPEAT_DELAY_MS, FRAME_STEP_REPEAT_MS);
  hold.press(); // the caller performs the immediate first step itself
  assert.equal(hold.advance(299), 0);
  assert.equal(hold.advance(1), 1); // 300 ms: first repeat
  assert.equal(hold.advance(99), 0);
  assert.equal(hold.advance(1), 1); // 400 ms: second repeat, 100 ms later
  assert.equal(hold.advance(250), 2); // two more 100 ms repeats land in one longer frame
  hold.release();
  assert.equal(hold.advance(1000), 0);
});
