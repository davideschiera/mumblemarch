/**
 * Unit tests for the pure "is the cursor/selection inside the caption strip's box" decision
 * behind AUD-1 (DESIGN §7.7: "The strip moves to the top-left while the cursor or the selected
 * mumble is inside its box."). `pointInRect`/`shouldMoveToTopLeft` (`src/ui/hud/captions.ts`) are
 * plain arithmetic — no DOM — so this runs directly in Node, importing the same module the
 * `Captions` class itself uses (never re-deriving the logic under test).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { pointInRect, shouldMoveToTopLeft, type CssPoint, type CssRect } from '../src/ui/hud/captions.ts';

const RECT: CssRect = { left: 10, top: 20, right: 110, bottom: 60 };

test('pointInRect: a point well inside the rect is inside', () => {
  assert.equal(pointInRect({ x: 50, y: 40 }, RECT), true);
});

test('pointInRect: every edge is inclusive', () => {
  assert.equal(pointInRect({ x: RECT.left, y: 40 }, RECT), true);
  assert.equal(pointInRect({ x: RECT.right, y: 40 }, RECT), true);
  assert.equal(pointInRect({ x: 50, y: RECT.top }, RECT), true);
  assert.equal(pointInRect({ x: 50, y: RECT.bottom }, RECT), true);
});

test('pointInRect: just outside any edge is outside', () => {
  assert.equal(pointInRect({ x: RECT.left - 1, y: 40 }, RECT), false);
  assert.equal(pointInRect({ x: RECT.right + 1, y: 40 }, RECT), false);
  assert.equal(pointInRect({ x: 50, y: RECT.top - 1 }, RECT), false);
  assert.equal(pointInRect({ x: 50, y: RECT.bottom + 1 }, RECT), false);
});

test('pointInRect: null point or null rect is always "not inside"', () => {
  assert.equal(pointInRect(null, RECT), false);
  assert.equal(pointInRect({ x: 50, y: 40 }, null), false);
  assert.equal(pointInRect(null, null), false);
});

test('shouldMoveToTopLeft: false when neither point is on screen', () => {
  assert.equal(shouldMoveToTopLeft(null, null, RECT), false);
});

test('shouldMoveToTopLeft: false when the rect has not been measured yet (null)', () => {
  assert.equal(shouldMoveToTopLeft({ x: 50, y: 40 }, { x: 50, y: 40 }, null), false);
});

test('shouldMoveToTopLeft: true when only the cursor is inside the box', () => {
  const cursor: CssPoint = { x: 50, y: 40 };
  const selected: CssPoint = { x: 300, y: 5 }; // far outside RECT
  assert.equal(shouldMoveToTopLeft(cursor, selected, RECT), true);
});

test('shouldMoveToTopLeft: true when only the selected mumble is inside the box (DESIGN "OR")', () => {
  const cursor: CssPoint = { x: 300, y: 5 };
  const selected: CssPoint = { x: 50, y: 40 };
  assert.equal(shouldMoveToTopLeft(cursor, selected, RECT), true);
});

test('shouldMoveToTopLeft: true when both are inside the box', () => {
  assert.equal(shouldMoveToTopLeft({ x: 20, y: 30 }, { x: 90, y: 55 }, RECT), true);
});

test('shouldMoveToTopLeft: false when both are outside the box', () => {
  assert.equal(shouldMoveToTopLeft({ x: 0, y: 0 }, { x: 399, y: 0 }, RECT), false);
});
