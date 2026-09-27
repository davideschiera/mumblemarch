/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.1.1 RR row + §6.4.4: release-rate step amounts,
 * clamping, hold-repeat timing, and the interval text formula.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampReleaseRate,
  releaseRateStepAmount,
  releaseRateWouldChange,
} from '../src/app/game/rr-limits.ts';
import { HoldRepeater } from '../src/app/game/hold-repeat.ts';
import { rrIntervalText } from '../src/ui/strings.ts';

test('±1 per press, Shift ±10', () => {
  assert.equal(releaseRateStepAmount(1, false), 1);
  assert.equal(releaseRateStepAmount(-1, false), -1);
  assert.equal(releaseRateStepAmount(1, true), 10);
  assert.equal(releaseRateStepAmount(-1, true), -10);
});

test('clamped to [level minimum, 99]', () => {
  assert.equal(clampReleaseRate(999, 50, 99), 99);
  assert.equal(clampReleaseRate(1, 50, 99), 50);
  assert.equal(clampReleaseRate(75, 50, 99), 75);
});

test('at a limit: no-op refused (would not change)', () => {
  assert.equal(releaseRateWouldChange(99, 1, 50, 99), false); // already at max
  assert.equal(releaseRateWouldChange(50, -1, 50, 99), false); // already at min
});

test('a Shift −10 from 55 with min 50 CLAMPS to 50 (not refused)', () => {
  assert.equal(releaseRateWouldChange(55, -10, 50, 99), true); // must NOT be refused
  assert.equal(clampReleaseRate(55 - 10, 50, 99), 50); // clamps, does not go to 45 or get denied
});

test('a Shift +10 that would overshoot 99 clamps instead of refusing', () => {
  assert.equal(releaseRateWouldChange(95, 10, 50, 99), true);
  assert.equal(clampReleaseRate(95 + 10, 50, 99), 99);
});

test('hold-repeat: first step is on press (immediate), caller-driven — HoldRepeater itself reports 0 due steps at t=0', () => {
  const hr = new HoldRepeater(400, 60);
  hr.press();
  assert.equal(hr.advance(0), 0); // caller already did the immediate first step itself
});

test('hold-repeat: repeat after 400 ms, then every 60 ms', () => {
  const hr = new HoldRepeater(400, 60);
  hr.press();
  assert.equal(hr.advance(399), 0); // not yet
  assert.equal(hr.advance(1), 1); // exactly at 400ms: first repeat
  assert.equal(hr.advance(59), 0); // not yet at +60
  assert.equal(hr.advance(1), 1); // exactly at 460ms: second repeat
  assert.equal(hr.advance(120), 2); // two more 60ms periods
});

test('hold-repeat: Shift interval of 150 ms (release rate)', () => {
  const hr = new HoldRepeater(400, 150);
  hr.press();
  assert.equal(hr.advance(400), 1); // first repeat at 400ms delay
  assert.equal(hr.advance(149), 0);
  assert.equal(hr.advance(1), 1); // 150ms later
});

test('hold-repeat: release() stops repeats', () => {
  const hr = new HoldRepeater(400, 60);
  hr.press();
  hr.release();
  assert.equal(hr.advance(10_000), 0);
  assert.equal(hr.held, false);
});

test('rrIntervalText: ((99−RR)>>1)+4 ticks ÷ 17, one decimal', () => {
  // RR=50: ((99-50)>>1)+4 = (49>>1)+4 = 24+4 = 28 ticks / 17 = 1.647... -> "1.6 s"
  assert.equal(rrIntervalText(50), '1.6 s');
  // RR=99: ((99-99)>>1)+4 = 4 ticks / 17 = 0.235... -> "0.2 s"
  assert.equal(rrIntervalText(99), '0.2 s');
  // RR=0: ((99-0)>>1)+4 = 49+4 = 53 / 17 = 3.117... -> "3.1 s"
  assert.equal(rrIntervalText(0), '3.1 s');
});
