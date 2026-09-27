/**
 * DESIGN §5.1 scale rule: tests/app-shell-scale.test.ts (E5c). Pure, DOM-free.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { autoScale, resolveScale } from '../src/app/scale.ts';

void test('autoScale: the DESIGN §5.1 table', () => {
  assert.equal(autoScale(1280, 720), 3);
  assert.equal(autoScale(1440, 800), 3);
  assert.equal(autoScale(1920, 960), 4);
  assert.equal(autoScale(1024, 640), 2);
  assert.equal(autoScale(200, 200), 2); // tiny viewport clamps up to the minimum
});

void test('autoScale: clamps at the top even when there is room to spare', () => {
  assert.equal(autoScale(4000, 3000), 4);
});

void test('resolveScale: a non-zero Settings override always wins over the auto rule', () => {
  // 1280×720 would auto-compute to 3; an explicit 2 or 4 still wins.
  assert.equal(resolveScale(1280, 720, 2), 2);
  assert.equal(resolveScale(1280, 720, 4), 4);
  // 0 means "auto".
  assert.equal(resolveScale(1280, 720, 0), 3);
});

void test('resolveScale: an out-of-range override is clamped to ×2…×4', () => {
  assert.equal(resolveScale(1280, 720, 1), 2);
  assert.equal(resolveScale(1280, 720, 99), 4);
});
