/**
 * Unit tests for release-rate math (DESIGN §6.1.1, §6.4.4): the pure clamp/limit helpers in
 * `src/app/game/rr-limits.ts`, and the hold-to-repeat schedule (`hold-repeat.ts`) at the RR
 * timing constants (400 ms delay / 60 ms repeat, Shift 150 ms; ±10 with Shift). Pure and
 * DOM-free, so this runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HoldRepeater } from '../src/app/game/hold-repeat.ts';
import { clampReleaseRate, releaseRateStepAmount, releaseRateWouldChange } from '../src/app/game/rr-limits.ts';
import { RR_MAX, RR_REPEAT_DELAY_MS, RR_REPEAT_MS, RR_REPEAT_SHIFT_MS, RR_SHIFT_STEP } from '../src/app/config.ts';

// ─── Per-press delta (§6.1.1: ±1, Shift ±10) ───────────────────────────────────────────────────

test('releaseRateStepAmount is ±1, or ±10 with Shift', () => {
  assert.equal(RR_SHIFT_STEP, 10);
  assert.equal(releaseRateStepAmount(1, false), 1);
  assert.equal(releaseRateStepAmount(-1, false), -1);
  assert.equal(releaseRateStepAmount(1, true), 10);
  assert.equal(releaseRateStepAmount(-1, true), -10);
});

// ─── Clamp + limit detection (§6.4.4: clamped to [level minimum, 99]) ──────────────────────────

test('clampReleaseRate bounds to [min, max] and rounds', () => {
  assert.equal(clampReleaseRate(30, 50, 99), 50); // below min
  assert.equal(clampReleaseRate(150, 50, 99), 99); // above max
  assert.equal(clampReleaseRate(62.6, 50, 99), 63);
});

test('releaseRateWouldChange is false exactly at a limit', () => {
  assert.equal(releaseRateWouldChange(50, -1, 50, 99), false); // at the level minimum, pressing −
  assert.equal(releaseRateWouldChange(99, 1, 50, RR_MAX), false); // at 99, pressing +
});

test('releaseRateWouldChange is true away from both limits', () => {
  assert.equal(releaseRateWouldChange(60, -1, 50, 99), true);
  assert.equal(releaseRateWouldChange(60, 1, 50, 99), true);
  assert.equal(releaseRateWouldChange(51, -10, 50, 99), true); // Shift step still clamps, but changes
});

test('a Shift step that would overshoot the limit still clamps to it (so it counts as a change)', () => {
  assert.equal(releaseRateWouldChange(55, -10, 50, 99), true); // clamps to 50, which differs from 55
  assert.equal(clampReleaseRate(55 - 10, 50, 99), 50);
});

// ─── Hold-to-repeat schedule (§6.1.1: first step on press, then 400 ms / 60 ms, Shift 150 ms) ──

test('RR timing constants match DESIGN §6.1.1', () => {
  assert.equal(RR_REPEAT_DELAY_MS, 400);
  assert.equal(RR_REPEAT_MS, 60);
  assert.equal(RR_REPEAT_SHIFT_MS, 150);
});

test('holding repeats after the 400 ms delay, then every 60 ms', () => {
  const hold = new HoldRepeater(RR_REPEAT_DELAY_MS, RR_REPEAT_MS);
  hold.press(); // the caller performs the immediate first step itself
  assert.equal(hold.advance(399), 0, 'no repeat before the 400 ms delay');
  assert.equal(hold.advance(1), 1, 'first repeat exactly at 400 ms');
  assert.equal(hold.advance(59), 0, 'no repeat before the next 60 ms boundary');
  assert.equal(hold.advance(1), 1, 'second repeat at 460 ms');
  assert.equal(hold.advance(180), 3, 'three more repeats over the next 180 ms (60 ms each)');
});

test('Shift switches the repeat period to 150 ms (set on the control before pressing)', () => {
  const hold = new HoldRepeater(RR_REPEAT_DELAY_MS, RR_REPEAT_SHIFT_MS);
  hold.press();
  assert.equal(hold.advance(400), 1);
  assert.equal(hold.advance(149), 0);
  assert.equal(hold.advance(1), 1);
});

test('releasing stops the repeat', () => {
  const hold = new HoldRepeater(RR_REPEAT_DELAY_MS, RR_REPEAT_MS);
  hold.press();
  hold.release();
  assert.equal(hold.advance(10_000), 0);
});
