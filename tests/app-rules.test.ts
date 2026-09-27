/**
 * Unit tests for `src/app/game/rules.ts` — small pure game-flow formulas (DESIGN §5.3, §6.4.3,
 * §6.4.4, §8.6). Pure and DOM-free, so it runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isTimeLow, loopSpeed, musicVariant, releaseIntervalSeconds } from '../src/app/game/rules.ts';
import { rrIntervalSeconds } from '../src/ui/strings.ts';
import { TICKS_PER_SECOND } from '../src/core/constants.ts';
import { FAST_FORWARD_SPEED, TIME_LOW_SECONDS } from '../src/app/config.ts';

// ─── releaseIntervalSeconds (DESIGN §5.3/§6.4.4: ((99−RR)>>1)+4 ticks ÷ 17) ────────────────────

test('releaseIntervalSeconds matches the DESIGN formula at known rates', () => {
  assert.equal(releaseIntervalSeconds(99), 4 / TICKS_PER_SECOND); // fastest: 4 ticks
  assert.equal(releaseIntervalSeconds(1), (((99 - 1) >> 1) + 4) / TICKS_PER_SECOND);
  assert.equal(releaseIntervalSeconds(50), (((99 - 50) >> 1) + 4) / TICKS_PER_SECOND);
});

test('releaseIntervalSeconds decreases as the rate rises', () => {
  assert.ok(releaseIntervalSeconds(90) < releaseIntervalSeconds(10));
});

test('releaseIntervalSeconds (app/game/rules.ts) never drifts from ui/strings.ts rrIntervalSeconds', () => {
  // Two independent files (E5a's rules.ts, E1's strings.ts) compute the same §6.4.4 formula for
  // different callers (view-state.ts vs. HUD copy) — they must always agree.
  for (let rr = 0; rr <= 99; rr++) assert.equal(releaseIntervalSeconds(rr), rrIntervalSeconds(rr), `rr=${rr}`);
});

// ─── loopSpeed (DESIGN §6.4.3) ─────────────────────────────────────────────────────────────────

test('loopSpeed is ×3 fast-forward times the Game speed setting', () => {
  assert.equal(FAST_FORWARD_SPEED, 3);
  assert.equal(loopSpeed(true, 1), 3);
  assert.equal(loopSpeed(true, 0.5), 1.5);
  assert.equal(loopSpeed(false, 1), 1);
  assert.equal(loopSpeed(false, 0.75), 0.75);
});

// ─── isTimeLow (DESIGN §5.3: warning under 30 s, never in overtime) ────────────────────────────

test('isTimeLow is true under the threshold and false at/above it', () => {
  const threshold = TIME_LOW_SECONDS * TICKS_PER_SECOND;
  assert.equal(isTimeLow(threshold - 1, 0), true);
  assert.equal(isTimeLow(threshold, 0), false);
  assert.equal(isTimeLow(0, 0), true);
});

test('isTimeLow is always false once the relaxed clock is in overtime', () => {
  assert.equal(isTimeLow(0, 1), false);
  assert.equal(isTimeLow(9999, 1), false);
});

// ─── musicVariant (DESIGN §8.6) ────────────────────────────────────────────────────────────────

test('musicVariant is the level`s index within its theme, mod 3', () => {
  const ids = ['a', 'b', 'c', 'd'];
  assert.equal(musicVariant(ids, 'a'), 0);
  assert.equal(musicVariant(ids, 'b'), 1);
  assert.equal(musicVariant(ids, 'd'), 0); // index 3 mod 3
});

test('musicVariant falls back to 0 for a level not found in the list', () => {
  assert.equal(musicVariant(['a', 'b'], 'nope'), 0);
});
