/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §7.9 + §9.5: `inTime` (won within the clock on the
 * standard timer only — relaxed or overtime → false), `newBest`, and the attempt index used to
 * pick the verdict variant.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeInTime, computeResultRecord } from '../src/app/game/flow-result.ts';
import { verdictFor } from '../src/ui/strings.ts';

test('inTime: true only for a standard-timer win with zero overtime', () => {
  assert.equal(computeInTime({ won: true, overtimeTicks: 0 }, false), true);
});

test('inTime: false when relaxed timer was on, even with a win and no overtime', () => {
  assert.equal(computeInTime({ won: true, overtimeTicks: 0 }, true), false);
});

test('inTime: false when the win happened in overtime (relaxed timer, ran past 0:00)', () => {
  assert.equal(computeInTime({ won: true, overtimeTicks: 42 }, true), false);
});

test('inTime: false whenever overtimeTicks > 0 on the standard timer too (defensive)', () => {
  assert.equal(computeInTime({ won: true, overtimeTicks: 5 }, false), false);
});

test('inTime: false on a loss regardless of timer/overtime', () => {
  assert.equal(computeInTime({ won: false, overtimeTicks: 0 }, false), false);
});

test('newBest: true when this attempt saved more than the previous best', () => {
  const r = computeResultRecord({ won: true, saved: 8, overtimeTicks: 0 }, false, { bestSaved: 5, attempts: 2 });
  assert.equal(r.newBest, true);
});

test('newBest: false when saved equals or is below the previous best', () => {
  const r = computeResultRecord({ won: false, saved: 5, overtimeTicks: 0 }, false, { bestSaved: 5, attempts: 2 });
  assert.equal(r.newBest, false);
});

test('newBest: true on the very first attempt (no previous progress) whenever any are saved', () => {
  const r = computeResultRecord({ won: false, saved: 1, overtimeTicks: 0 }, false, undefined);
  assert.equal(r.newBest, true);
});

test('attempt index: 0 on a level never attempted before (no previous progress)', () => {
  const r = computeResultRecord({ won: true, saved: 5, overtimeTicks: 0 }, false, undefined);
  assert.equal(r.attempt, 0);
});

test('attempt index: equals the PREVIOUS attempts count (this is attempt #N, 0-based), not incremented yet', () => {
  const r = computeResultRecord({ won: true, saved: 5, overtimeTicks: 0 }, false, { bestSaved: 5, attempts: 3 });
  assert.equal(r.attempt, 3);
});

test('attempt mod 2 selects the verdict variant deterministically (A on even, B on odd)', () => {
  // S=T=5 exactly: row 1, "Every single..." (A) vs "A full house!..." (B).
  const variantA = verdictFor(5, 5, 5, 0);
  const variantB = verdictFor(5, 5, 5, 1);
  assert.equal(variantA, 'Every single mumble made it home. Take a bow!');
  assert.equal(variantB, 'A full house! Nobody left behind.');
  // Same attempt parity -> same variant, deterministic.
  assert.equal(verdictFor(5, 5, 5, 2), variantA);
  assert.equal(verdictFor(5, 5, 5, 3), variantB);
});

test('relaxed flag is carried through to the ResultRecord for the results-screen note', () => {
  const r = computeResultRecord({ won: true, saved: 5, overtimeTicks: 3 }, true, undefined);
  assert.equal(r.relaxed, true);
  assert.equal(r.inTime, false); // relaxed => never "in time"
});
