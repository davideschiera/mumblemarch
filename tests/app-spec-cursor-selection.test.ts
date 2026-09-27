/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.2.4 (keyboard cursor motion + settle),
 * §6.2.3 (cycling order), §6.1.3 (Shift/right-held press modifier), and §6.3.3 (snap radius
 * formula, checked via its constant + ceil arithmetic since selection.ts needs a PlayContext).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampToView, edgePushX, normalizeDirection, type CursorView } from '../src/app/game/cursor-motion.ts';
import { advanceSettle, INITIAL_SETTLE, markAnnounced, shouldAnnounceSettle } from '../src/app/game/cursor-settle.ts';
import { pressWalkersOnly } from '../src/app/game/pointer-modifiers.ts';
import { CURSOR_HOLD_DELAY_MS, CURSOR_RAMP_MS, CURSOR_SETTLE_MS, CURSOR_SHIFT_FACTOR, CURSOR_SPEED_MAX, CURSOR_SPEED_MIN, CURSOR_TAP_STEP } from '../src/app/config.ts';
import { rampSpeed } from '../src/app/game/hold-repeat.ts';
import { SNAP_RADIUS_CSS } from '../src/core/constants.ts';

// ─── §6.2.4 keyboard cursor movement ────────────────────────────────────────────────────────

test('config sanity: tap 2px, hold after 150ms 60->180 px/s over 600ms, Shift x2', () => {
  assert.equal(CURSOR_TAP_STEP, 2);
  assert.equal(CURSOR_HOLD_DELAY_MS, 150);
  assert.equal(CURSOR_SPEED_MIN, 60);
  assert.equal(CURSOR_SPEED_MAX, 180);
  assert.equal(CURSOR_RAMP_MS, 600);
  assert.equal(CURSOR_SHIFT_FACTOR, 2);
});

test('cursor speed ramp: 60 px/s right after the 150ms delay, ramping to 180 over 600ms, Shift doubles', () => {
  const at0 = rampSpeed(CURSOR_HOLD_DELAY_MS, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS);
  assert.equal(at0, 60);
  const atFull = rampSpeed(CURSOR_HOLD_DELAY_MS + CURSOR_RAMP_MS, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS);
  assert.equal(atFull, 180);
  assert.equal(atFull * CURSOR_SHIFT_FACTOR, 360);
});

test('diagonals are normalised: two orthogonal keys held together move at unit speed, not sqrt(2)', () => {
  const diag = normalizeDirection(1, 1);
  const len = Math.sqrt(diag.x * diag.x + diag.y * diag.y);
  assert.ok(Math.abs(len - 1) < 1e-9, `diagonal unit length should be 1, got ${len}`);
});

test('single-axis direction has unit magnitude too (same speed as diagonal)', () => {
  const horiz = normalizeDirection(1, 0);
  assert.equal(Math.sqrt(horiz.x ** 2 + horiz.y ** 2), 1);
});

test('opposite keys cancel to (0,0)', () => {
  const cancelled = normalizeDirection(0, 0);
  assert.deepEqual(cancelled, { x: 0, y: 0 });
});

test('clampToView keeps the cursor inside the view rectangle', () => {
  const view: CursorView = { x: 0, y: 0, viewW: 400, viewH: 160 };
  assert.deepEqual(clampToView({ x: -5, y: 50 }, view), { x: 0, y: 50 });
  assert.deepEqual(clampToView({ x: 405, y: 50 }, view), { x: 399, y: 50 });
  assert.deepEqual(clampToView({ x: 50, y: -5 }, view), { x: 50, y: 0 });
  assert.deepEqual(clampToView({ x: 50, y: 165 }, view), { x: 50, y: 159 });
});

test('edgePushX: 0 inside the view, negative past the left, positive past the right', () => {
  const view: CursorView = { x: 100, y: 0, viewW: 400, viewH: 160 };
  assert.equal(edgePushX(200, view), 0);
  assert.equal(edgePushX(90, view), -10); // 10px past the left edge (100)
  assert.equal(edgePushX(510, view), 11); // right edge is x+viewW-1 = 499; 510-499=11
});

// ─── §6.2.4 / §7.3 #5 cursor settle ─────────────────────────────────────────────────────────

test('settle: announces once after CURSOR_SETTLE_MS (150ms) of no change to cursor or pick', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  assert.equal(shouldAnnounceSettle(s, CURSOR_SETTLE_MS), false);
  s = advanceSettle(s, 149, { x: 10, y: 10 }, 5);
  assert.equal(shouldAnnounceSettle(s, CURSOR_SETTLE_MS), false);
  s = advanceSettle(s, 1, { x: 10, y: 10 }, 5);
  assert.equal(shouldAnnounceSettle(s, CURSOR_SETTLE_MS), true);
  s = markAnnounced(s);
  assert.equal(shouldAnnounceSettle(s, CURSOR_SETTLE_MS), false, 'does not re-announce the same streak');
});

test('settle: any change to the cursor position resets the timer and the announced flag', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 150, { x: 10, y: 10 }, 5);
  s = markAnnounced(s);
  s = advanceSettle(s, 0, { x: 11, y: 10 }, 5); // cursor moved 1px
  assert.equal(s.ms, 0);
  assert.equal(s.announced, false);
});

test('settle: a change of pick (same cursor point) also resets', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 150, { x: 10, y: 10 }, 5);
  s = markAnnounced(s);
  s = advanceSettle(s, 0, { x: 10, y: 10 }, 6); // different pick id, same point
  assert.equal(s.ms, 0);
  assert.equal(s.announced, false);
});

test('settle: no pick under the cursor never announces', () => {
  const s = advanceSettle(INITIAL_SETTLE, 500, null, null);
  assert.equal(shouldAnnounceSettle(s, CURSOR_SETTLE_MS), false);
});

// ─── §6.1.3 Shift / right-button-held press modifier ───────────────────────────────────────

test('Shift-click forces walkers-only for a single press', () => {
  assert.equal(pressWalkersOnly(true, 1), true); // left button (1), shift held
});

test('right button already held + left press forces walkers-only', () => {
  assert.equal(pressWalkersOnly(false, 0b11), true); // buttons=3: left(1)+right(2)
});

test('plain left press (no shift, no right held) does not force walkers-only', () => {
  assert.equal(pressWalkersOnly(false, 1), false);
});

// ─── §6.3.3 snap radius R = ceil(24 CSS px / scale) ────────────────────────────────────────

test('snap radius: ceil(24/scale) -> x2:12, x3:8, x4:6', () => {
  assert.equal(SNAP_RADIUS_CSS, 24);
  assert.equal(Math.ceil(SNAP_RADIUS_CSS / 2), 12);
  assert.equal(Math.ceil(SNAP_RADIUS_CSS / 3), 8);
  assert.equal(Math.ceil(SNAP_RADIUS_CSS / 4), 6);
});
