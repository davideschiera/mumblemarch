/**
 * Unit tests for the pure selection helpers (DESIGN §6.2.2–§6.2.5, §6.3.1, §6.3.4):
 * `selection-order.ts` (cycling order/position, the cycling start rule, direction labels) and
 * `cursor-settle.ts` (the "cursor settled on a pick" state machine, §7.3 #5). `Selection` itself
 * (`src/app/game/selection.ts`) is a thin, PlayContext-driven wrapper over these plus
 * `core/picking.ts`; its composition is exercised in the browser (see PROGRESS.md).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Lemming } from '../src/core/types.ts';
import { advanceSettle, INITIAL_SETTLE, markAnnounced, shouldAnnounceSettle } from '../src/app/game/cursor-settle.ts';
import { cycleStartOptions, dirLabel, orderedSelectables, orderPosition } from '../src/app/game/selection-order.ts';
import { describeLemming, focusLabelText, noMumblesHereText, SELECTION_FILTER_PLURAL } from '../src/ui/strings.ts';

let nextId = 1;
function lem(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: overrides.id ?? nextId++,
    x: 100,
    y: 100,
    dir: 1,
    state: 'walking',
    stateTicks: 0,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 0,
    removed: false,
    ...overrides,
  };
}

// ═══ orderedSelectables / orderPosition ════════════════════════════════════════════════════

test('orderedSelectables: sorted by x then id, excludes non-selectable and filtered-out', () => {
  const a = lem({ id: 5, x: 50 });
  const b = lem({ id: 2, x: 50 }); // same x as a, tie-break by id
  const c = lem({ id: 9, x: 10 });
  const dying = lem({ id: 1, x: 5, state: 'splatting' });
  const order = orderedSelectables([a, b, c, dying], 'all');
  assert.deepEqual(order.map((l) => l.id), [9, 2, 5]);
});

test('orderedSelectables: filter chip narrows the order (walkers only)', () => {
  const walker = lem({ id: 1, x: 10, state: 'walking' });
  const blocker = lem({ id: 2, x: 20, state: 'blocking' });
  const order = orderedSelectables([walker, blocker], 'walkers');
  assert.deepEqual(order.map((l) => l.id), [1]);
});

test('orderPosition: 1-based i of n, null when absent', () => {
  const order = [lem({ id: 3 }), lem({ id: 7 }), lem({ id: 9 })];
  assert.deepEqual(orderPosition(order, 7), { i: 2, n: 3 });
  assert.deepEqual(orderPosition(order, 3), { i: 1, n: 3 });
  assert.equal(orderPosition(order, 42), null);
});

test('dirLabel: -1 → left, 1 → right', () => {
  assert.equal(dirLabel(-1), 'left');
  assert.equal(dirLabel(1), 'right');
});

// ═══ cycleStartOptions (§6.2.3 cycling start rule) ═════════════════════════════════════════

test('cycleStartOptions: no prior selection at all → starts "in view" (view option, no fromX)', () => {
  const opts = cycleStartOptions('all', false, null, { x0: 0, x1: 400 });
  assert.deepEqual(opts, { filter: 'all', group: false, view: { x0: 0, x1: 400 } });
});

test('cycleStartOptions: after a selection vanished → continues from its last x (fromX, no view)', () => {
  const opts = cycleStartOptions('walkers', true, 123, { x0: 0, x1: 400 });
  assert.deepEqual(opts, { filter: 'walkers', group: true, fromX: 123 });
});

test('cycleStartOptions: fromX 0 is a real x, not treated as "no prior selection"', () => {
  const opts = cycleStartOptions('all', false, 0, { x0: 0, x1: 400 });
  assert.deepEqual(opts, { filter: 'all', group: false, fromX: 0 });
});

// ═══ cursor-settle (§6.2.4 / §7.3 #5) ══════════════════════════════════════════════════════

const SETTLE_MS = 150;

test('advanceSettle: accumulates while the cursor and pick are unchanged', () => {
  let s = INITIAL_SETTLE;
  s = advanceSettle(s, 60, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 0); // first sample after "nothing" always resets (no prior cursor to match)
  s = advanceSettle(s, 60, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 60);
  s = advanceSettle(s, 60, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 120);
});

test('advanceSettle: resets on cursor movement', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 100, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 100);
  s = advanceSettle(s, 100, { x: 11, y: 10 }, 5); // moved 1 px
  assert.equal(s.ms, 0);
  assert.equal(s.announced, false);
});

test('advanceSettle: resets when the pick under a still cursor changes', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 200, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 200);
  s = advanceSettle(s, 50, { x: 10, y: 10 }, 6); // a different mumble walked under it
  assert.equal(s.ms, 0);
});

test('shouldAnnounceSettle: only once ≥ CURSOR_SETTLE_MS, with a real pick, not already announced', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 100, { x: 10, y: 10 }, 5);
  assert.equal(shouldAnnounceSettle(s, SETTLE_MS), false); // 100 < 150
  s = advanceSettle(s, 50, { x: 10, y: 10 }, 5);
  assert.equal(s.ms, 150);
  assert.equal(shouldAnnounceSettle(s, SETTLE_MS), true);
  s = markAnnounced(s);
  assert.equal(shouldAnnounceSettle(s, SETTLE_MS), false); // already announced this streak
  s = advanceSettle(s, 1000, { x: 10, y: 10 }, 5); // still the same streak
  assert.equal(shouldAnnounceSettle(s, SETTLE_MS), false);
});

test('shouldAnnounceSettle: false with no pick even after settling', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, null);
  s = advanceSettle(s, 500, { x: 10, y: 10 }, null);
  assert.equal(shouldAnnounceSettle(s, SETTLE_MS), false);
});

test('advanceSettle: null cursor (left the canvas) resets like any other change', () => {
  let s = advanceSettle(INITIAL_SETTLE, 0, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 200, { x: 10, y: 10 }, 5);
  s = advanceSettle(s, 50, null, null);
  assert.equal(s.ms, 0);
  assert.deepEqual(s.cursor, null);
});

// ═══ Focus label composition examples (DESIGN §6.3.1) ══════════════════════════════════════

test('focusLabelText: plain label, no count suffix at N=1', () => {
  assert.equal(focusLabelText('Walker', 1), 'Walker');
});

test('focusLabelText: ×N appended at N ≥ 2 ("Walker ×3")', () => {
  assert.equal(focusLabelText('Walker', 3), 'Walker ×3');
});

test('focusLabelText: "Selected: {label}" prefix', () => {
  assert.equal(focusLabelText('Climber + Floater', 1, { selected: true }), 'Selected: Climber + Floater');
});

test('focusLabelText: predicted-refusal suffix, first letter lower-cased', () => {
  assert.equal(
    focusLabelText('Digger', 1, { refusal: "Can't dig: steel below" }),
    "Digger — can't dig: steel below",
  );
});

test('focusLabelText: selected + refusal + count compose together', () => {
  assert.equal(
    focusLabelText('Walker', 2, { selected: true, refusal: 'Refused' }),
    'Selected: Walker ×2 — refused',
  );
});

test('noMumblesHereText + SELECTION_FILTER_PLURAL: "No walkers here" for the Walkers filter', () => {
  assert.equal(noMumblesHereText(SELECTION_FILTER_PLURAL.walkers), 'No walkers here');
});

test('noMumblesHereText: facing-left/right plurals', () => {
  assert.equal(noMumblesHereText(SELECTION_FILTER_PLURAL['facing-left']), 'No mumbles facing left here');
  assert.equal(noMumblesHereText(SELECTION_FILTER_PLURAL['facing-right']), 'No mumbles facing right here');
});

test('describeLemming: builder bricks / shrugging / bomber uh-oh / fuse suffix (§6.3.1)', () => {
  assert.equal(describeLemming(lem({ state: 'building', bricksLeft: 4 })), 'Builder · 4 bricks');
  assert.equal(describeLemming(lem({ state: 'building', bricksLeft: 1 })), 'Builder · 1 brick');
  assert.equal(describeLemming(lem({ state: 'shrugging' })), 'Builder · out of bricks');
  assert.equal(describeLemming(lem({ state: 'ohno' })), 'Bomber · uh-oh');
  assert.equal(describeLemming(lem({ state: 'digging', fuseTicks: 17 })), 'Digger · pops in 1');
  assert.equal(describeLemming(lem({ state: 'walking', isClimber: true, isFloater: true })), 'Climber + Floater');
});
