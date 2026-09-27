/**
 * Unit tests for the pure keyboard-cursor math (DESIGN §6.2.4): diagonal normalisation, view
 * clamping, edge-push detection (`cursor-motion.ts`) and the held-key speed ramp at the cursor's
 * own timings (`rampSpeed()` from `hold-repeat.ts`, with the CURSOR_* constants from
 * `app/config.ts`). `KeyboardCursor` itself is a thin PlayContext-driven wrapper over these.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CURSOR_HOLD_DELAY_MS, CURSOR_RAMP_MS, CURSOR_SHIFT_FACTOR, CURSOR_SPEED_MAX, CURSOR_SPEED_MIN, CURSOR_TAP_STEP } from '../src/app/config.ts';
import { clampToView, edgePushX, normalizeDirection, type CursorView } from '../src/app/game/cursor-motion.ts';
import { rampSpeed } from '../src/app/game/hold-repeat.ts';

// ═══ normalizeDirection (diagonal normalisation) ═══════════════════════════════════════════

test('normalizeDirection: single axis stays a unit vector', () => {
  assert.deepEqual(normalizeDirection(1, 0), { x: 1, y: 0 });
  assert.deepEqual(normalizeDirection(-1, 0), { x: -1, y: 0 });
  assert.deepEqual(normalizeDirection(0, 1), { x: 0, y: 1 });
});

test('normalizeDirection: nothing held → zero vector', () => {
  assert.deepEqual(normalizeDirection(0, 0), { x: 0, y: 0 });
});

test('normalizeDirection: a diagonal has magnitude 1, not sqrt(2)', () => {
  const d = normalizeDirection(1, -1);
  const mag = Math.sqrt(d.x * d.x + d.y * d.y);
  assert.ok(Math.abs(mag - 1) < 1e-9, `expected magnitude 1, got ${mag}`);
  assert.ok(Math.abs(d.x - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(d.y + Math.SQRT1_2) < 1e-9);
});

test('normalizeDirection: opposite keys cancel to zero', () => {
  assert.deepEqual(normalizeDirection(1 + -1, 0), { x: 0, y: 0 });
});

// ═══ clampToView (§6.2.4 "the cursor stays inside the view") ═══════════════════════════════

const VIEW: CursorView = { x: 100, y: 20, viewW: 400, viewH: 160 };

test('clampToView: a point already inside the view is unchanged', () => {
  assert.deepEqual(clampToView({ x: 300, y: 100 }, VIEW), { x: 300, y: 100 });
});

test('clampToView: clamps past every edge', () => {
  assert.deepEqual(clampToView({ x: 0, y: 0 }, VIEW), { x: 100, y: 20 });
  assert.deepEqual(clampToView({ x: 10000, y: 10000 }, VIEW), { x: 499, y: 179 }); // viewW/H − 1
});

// ═══ edgePushX (§6.2.4 "pushing a side edge scrolls the camera") ═══════════════════════════

test('edgePushX: 0 while inside the view', () => {
  assert.equal(edgePushX(300, VIEW), 0);
  assert.equal(edgePushX(100, VIEW), 0); // exactly the left edge
  assert.equal(edgePushX(499, VIEW), 0); // exactly the right edge
});

test('edgePushX: negative overflow past the left edge, positive past the right', () => {
  assert.equal(edgePushX(95, VIEW), -5);
  assert.equal(edgePushX(510, VIEW), 11); // 510 − 499
});

// ═══ rampSpeed at the keyboard cursor's own timings (§6.2.4: 60 → 180 px/s over 600 ms after 150 ms) ═══

test('rampSpeed: 0 before the 150 ms hold delay', () => {
  assert.equal(rampSpeed(0, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 0);
  assert.equal(rampSpeed(149, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 0);
});

test('rampSpeed: exactly 60 px/s the instant the hold delay elapses (150 ms)', () => {
  assert.equal(rampSpeed(150, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 60);
});

test('rampSpeed: halfway through the 600 ms ramp (450 ms held) → 120 px/s', () => {
  assert.equal(rampSpeed(450, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 120);
});

test('rampSpeed: capped at 180 px/s once the ramp finishes (750 ms held = 150 + 600)', () => {
  assert.equal(rampSpeed(750, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 180);
  assert.equal(rampSpeed(5000, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS), 180);
});

test('Shift doubles the ramped speed (§6.2.4) and the tap step is 2 world px', () => {
  const speed = rampSpeed(450, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS);
  assert.equal(speed * CURSOR_SHIFT_FACTOR, 240);
  assert.equal(CURSOR_TAP_STEP, 2);
});
