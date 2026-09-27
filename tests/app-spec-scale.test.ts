/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §5.1: the canvas scale rule
 * `s = clamp(2, 4, min(floor((vw-32)/400), floor((vh-196)/160)))`, its worked table, and the
 * Settings scale override.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoScale, resolveScale } from '../src/app/scale.ts';

test('§5.1 table row: 1280×720 -> 3', () => {
  assert.equal(autoScale(1280, 720), 3);
});

test('§5.1 table row: 1440×800 -> 3', () => {
  assert.equal(autoScale(1440, 800), 3);
});

test('§5.1 table row: 1920×960 -> 4', () => {
  assert.equal(autoScale(1920, 960), 4);
});

test('§5.1 table row: 1024×640 -> 2', () => {
  assert.equal(autoScale(1024, 640), 2);
});

test('clamped to a minimum of ×2 even for a tiny viewport', () => {
  assert.equal(autoScale(100, 100), 2);
});

test('clamped to a maximum of ×4 even for a huge viewport', () => {
  assert.equal(autoScale(4000, 4000), 4);
});

test('Settings scale override wins over the auto rule whenever non-zero', () => {
  assert.equal(resolveScale(1280, 720, 2), 2); // auto would be 3, override forces 2
  assert.equal(resolveScale(1280, 720, 4), 4);
});

test('override of 0 means "auto": falls back to the computed rule', () => {
  assert.equal(resolveScale(1280, 720, 0), autoScale(1280, 720));
});

test('a corrupted/out-of-range override is still clamped to ×2…×4', () => {
  assert.equal(resolveScale(1280, 720, 99), 4);
  assert.equal(resolveScale(1280, 720, 1), 2);
});
