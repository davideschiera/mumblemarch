/**
 * Pure playfield-pointer rules (DESIGN §6.1.3): the "walkers only for this press" modifier.
 * DOM-free so this runs in Node — `pointer.ts` is the (untested-here) PlayContext glue.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pressWalkersOnly } from '../src/app/game/pointer-modifiers.ts';

test('pressWalkersOnly: Shift alone → walkers only', () => {
  assert.equal(pressWalkersOnly(true, 1), true); // buttons=1: left held
});

test('pressWalkersOnly: right button held (bit 2) → walkers only, with or without the left bit', () => {
  assert.equal(pressWalkersOnly(false, 2), true); // right alone (before the left press lands in `buttons`)
  assert.equal(pressWalkersOnly(false, 3), true); // left + right both held
});

test('pressWalkersOnly: plain left press → not walkers only', () => {
  assert.equal(pressWalkersOnly(false, 1), false);
  assert.equal(pressWalkersOnly(false, 0), false);
});

test('pressWalkersOnly: middle button held does not imply walkers only', () => {
  assert.equal(pressWalkersOnly(false, 4), false);
  assert.equal(pressWalkersOnly(false, 5), false); // left + middle
});
