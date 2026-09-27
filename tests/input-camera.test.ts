/**
 * Pure camera helpers (DESIGN §6.1.1 Home/End cycling, §6.1.3 edge zones/ramp): DOM-free so these
 * run in Node — `camera-control.ts` wires them into the module.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { edgeSideAt } from '../src/app/game/camera-edge.ts';
import { nearestIndex, nextCycleIndex } from '../src/app/game/camera-jump.ts';
import { countMumblesInView } from '../src/app/game/minimap-count.ts';
import { EDGE_DWELL_MS, EDGE_RAMP_MS, EDGE_SPEED_MAX, EDGE_SPEED_MIN, EDGE_ZONE_CSS } from '../src/app/config.ts';
import { rampSpeed } from '../src/app/game/hold-repeat.ts';
import type { Lemming } from '../src/core/types.ts';

// ─── Home/End cycling order (§6.1.1) ───────────────────────────────────────────────────────────

test('nextCycleIndex: first press (current null) lands on index 0', () => {
  assert.equal(nextCycleIndex(3, null), 0);
});

test('nextCycleIndex: each further press advances by one, wrapping', () => {
  assert.equal(nextCycleIndex(3, 0), 1);
  assert.equal(nextCycleIndex(3, 1), 2);
  assert.equal(nextCycleIndex(3, 2), 0); // wraps back to the first
});

test('nextCycleIndex: a single hatch/exit always re-lands on itself', () => {
  assert.equal(nextCycleIndex(1, 0), 0);
});

test('nextCycleIndex: no hatch/exit in the level → null', () => {
  assert.equal(nextCycleIndex(0, null), null);
  assert.equal(nextCycleIndex(0, 0), null);
});

test('nearestIndex: picks the exit closest to the view centre', () => {
  assert.equal(nearestIndex([50, 200, 900], 210), 1);
  assert.equal(nearestIndex([50, 200, 900], 40), 0);
  assert.equal(nearestIndex([50, 200, 900], 5000), 2);
});

test('nearestIndex: ties keep the earlier (lower) index', () => {
  assert.equal(nearestIndex([100, 300], 200), 0);
});

test('nearestIndex: no exits → null', () => {
  assert.equal(nearestIndex([], 100), null);
});

// ─── Edge-zone geometry + ramp timing (§6.1.3: inner 32 CSS px, 120 ms dwell, 150→400 px/s) ────

test('edgeSideAt: inside the inner zone on either side', () => {
  assert.equal(edgeSideAt(0, 400, 32), 'left');
  assert.equal(edgeSideAt(31, 400, 32), 'left');
  assert.equal(edgeSideAt(400, 400, 32), 'right');
  assert.equal(edgeSideAt(369, 400, 32), 'right');
});

test('edgeSideAt: the middle of the canvas is not an edge zone', () => {
  assert.equal(edgeSideAt(200, 400, 32), null);
  assert.equal(edgeSideAt(32, 400, 32), null); // exactly at the boundary: not inside
  assert.equal(edgeSideAt(368, 400, 32), null);
});

test('edgeSideAt: outside the canvas entirely is not an edge zone (a captured drag off-canvas)', () => {
  assert.equal(edgeSideAt(-5, 400, 32), null);
  assert.equal(edgeSideAt(405, 400, 32), null);
});

test('edge ramp: no scroll before the 120 ms dwell', () => {
  assert.equal(rampSpeed(0, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 0);
  assert.equal(rampSpeed(EDGE_DWELL_MS - 1, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), 0);
});

test('edge ramp: starts at 150 px/s right after the dwell, ramps linearly to 400 px/s over 1 s', () => {
  assert.equal(rampSpeed(EDGE_DWELL_MS, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), EDGE_SPEED_MIN);
  assert.equal(rampSpeed(EDGE_DWELL_MS + EDGE_RAMP_MS / 2, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), (EDGE_SPEED_MIN + EDGE_SPEED_MAX) / 2);
  assert.equal(rampSpeed(EDGE_DWELL_MS + EDGE_RAMP_MS, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), EDGE_SPEED_MAX);
});

test('edge ramp: never exceeds 400 px/s once fully ramped', () => {
  assert.equal(rampSpeed(EDGE_DWELL_MS + EDGE_RAMP_MS * 10, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS), EDGE_SPEED_MAX);
});

test('EDGE_ZONE_CSS is the 32 CSS px the spec names', () => {
  assert.equal(EDGE_ZONE_CSS, 32);
});

// ─── Minimap "mumbles in view" count (§7.2 aria-valuetext) ─────────────────────────────────────

function lem(x: number, removed = false): Readonly<Lemming> {
  return { x, removed } as Readonly<Lemming>;
}

test('countMumblesInView: counts only in-range, non-removed mumbles', () => {
  const lemmings = [lem(0), lem(50), lem(99), lem(100), lem(50, true)];
  assert.equal(countMumblesInView(lemmings, 0, 100), 3); // 0, 50, 99 — 100 is exclusive, the removed one doesn't count
});

test('countMumblesInView: empty window/list → 0', () => {
  assert.equal(countMumblesInView([], 0, 400), 0);
  assert.equal(countMumblesInView([lem(500)], 0, 400), 0);
});
