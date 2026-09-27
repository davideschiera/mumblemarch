/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.1.3 (edge zones) and §6.1.1 (Home/End jumps):
 * inner 32 CSS px edge detection, 120 ms dwell + 150→400 px/s ramp over 1 s (config values,
 * exercised through rampSpeed), and Home/End cycling (first hatch / nearest exit, cycling on
 * repeat presses).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { edgeSideAt } from '../src/app/game/camera-edge.ts';
import { nearestIndex, nextCycleIndex } from '../src/app/game/camera-jump.ts';
import { rampSpeed } from '../src/app/game/hold-repeat.ts';
import { EDGE_DWELL_MS, EDGE_RAMP_MS, EDGE_SPEED_MAX, EDGE_SPEED_MIN, EDGE_ZONE_CSS } from '../src/app/config.ts';

test('config sanity: inner edge zone is 32 CSS px, dwell 120 ms, ramp 150→400 px/s over 1 s', () => {
  assert.equal(EDGE_ZONE_CSS, 32);
  assert.equal(EDGE_DWELL_MS, 120);
  assert.equal(EDGE_SPEED_MIN, 150);
  assert.equal(EDGE_SPEED_MAX, 400);
  assert.equal(EDGE_RAMP_MS, 1000);
});

test('edgeSideAt: inside the left 32px zone -> "left"', () => {
  assert.equal(edgeSideAt(0, 1200, 32), 'left');
  assert.equal(edgeSideAt(31, 1200, 32), 'left');
});

test('edgeSideAt: inside the right 32px zone -> "right"', () => {
  assert.equal(edgeSideAt(1200, 1200, 32), 'right');
  assert.equal(edgeSideAt(1169, 1200, 32), 'right');
});

test('edgeSideAt: the middle -> null', () => {
  assert.equal(edgeSideAt(600, 1200, 32), null);
  assert.equal(edgeSideAt(32, 1200, 32), null); // exactly at the boundary, not < zonePx
  assert.equal(edgeSideAt(1168, 1200, 32), null); // exactly at the boundary (1200-32)
});

test('edgeSideAt: outside the canvas entirely (captured drag) -> null, same as the middle', () => {
  assert.equal(edgeSideAt(-5, 1200, 32), null);
  assert.equal(edgeSideAt(1205, 1200, 32), null);
});

test('edge speed ramp: 0 before the 120 ms dwell, 150 px/s right after, ramping linearly to 400 over 1 s', () => {
  assert.equal(rampSpeed(0, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 0);
  assert.equal(rampSpeed(119, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 0);
  assert.equal(rampSpeed(EDGE_DWELL_MS, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 150);
  // Halfway through the 1s ramp: 150 + (400-150)*0.5 = 275
  assert.equal(rampSpeed(EDGE_DWELL_MS + 500, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 275);
  // At/after the full 1s ramp: caps at 400
  assert.equal(rampSpeed(EDGE_DWELL_MS + 1000, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 400);
  assert.equal(rampSpeed(EDGE_DWELL_MS + 5000, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 400);
});

// ─── Home/End jump & cycling (§6.1.1) ──────────────────────────────────────────────────────

test('Home/End: first press centres on index 0 (first hatch / handled by nearestIndex for exits)', () => {
  assert.equal(nextCycleIndex(3, null), 0);
});

test('pressing again cycles forward, wrapping', () => {
  assert.equal(nextCycleIndex(3, 0), 1);
  assert.equal(nextCycleIndex(3, 1), 2);
  assert.equal(nextCycleIndex(3, 2), 0); // wraps
});

test('no hatches/exits at all -> null (nothing to jump to)', () => {
  assert.equal(nextCycleIndex(0, null), null);
  assert.equal(nextCycleIndex(0, 0), null);
});

test('End: nearest exit to the view centre (ties go to the earlier/lowest index)', () => {
  const exits = [100, 300, 305, 900];
  assert.equal(nearestIndex(exits, 302), 1); // 300 is 2 away, 305 is 3 away -> 300 wins
  assert.equal(nearestIndex(exits, 302.5), 1); // tie (both 2.5 away) -> earlier index wins
});

test('nearestIndex on an empty list -> null', () => {
  assert.equal(nearestIndex([], 100), null);
});
