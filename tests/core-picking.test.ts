/**
 * Independent SPEC validation of `src/core/picking.ts` (workstream A, task A4).
 *
 * Every expected value below is derived from:
 *   - docs/development/core-rules.md §P (resolved rules for picking.ts)
 *   - docs/design/DESIGN.md §6.2.2–§6.2.5 (selection model, cycling, keyboard cursor, selection
 *     loss) and §6.3.1–§6.3.4 (hover/status, picking priority, hit area & snap, filters)
 *   - docs/research/RESEARCH.md §2.2 (overlap priority: busy-first, then last-released; fallback
 *     to a non-busy candidate when the busy one would refuse)
 *   - docs/development/CONTRACTS.md §2.5 (public API shapes)
 *   - src/core/constants.ts (LEMMING_HITBOX, GROUP_GAP) and src/core/behaviours/context.ts
 *     (UNASSIGNABLE_STATES)
 *
 * NOT derived from picking.ts's own source — only its exported signatures/doc comments were
 * read to know how to call it.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { UNASSIGNABLE_STATES } from '../src/core/behaviours/index.ts';
import { GROUP_GAP, LEMMING_HITBOX } from '../src/core/constants.ts';
import {
  cycleLemming,
  isSelectable,
  lemmingsAt,
  passesFilter,
  pickLemmingAt,
  SELECTION_FILTERS,
} from '../src/core/picking.ts';
import { LEMMING_STATES, type Lemming, type LemmingState } from '../src/core/types.ts';

// ─── helpers ───────────────────────────────────────────────────────────────────────────────

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

const BUSY_STATES: readonly LemmingState[] = ['blocking', 'building', 'shrugging', 'bashing', 'mining', 'digging'];
// Every state that IS selectable per UNASSIGNABLE_STATES (removed handled separately).
const SELECTABLE_STATES = LEMMING_STATES.filter((s) => !UNASSIGNABLE_STATES.has(s));

// ═══ isSelectable ════════════════════════════════════════════════════════════════════════════

test('isSelectable: removed is never selectable, regardless of state', () => {
  for (const state of LEMMING_STATES) {
    assert.equal(isSelectable(lem({ state, removed: true })), false, `removed '${state}' should not be selectable`);
  }
});

test('isSelectable: every UNASSIGNABLE_STATES member is excluded', () => {
  assert.ok(UNASSIGNABLE_STATES.size > 0);
  for (const state of UNASSIGNABLE_STATES) {
    assert.equal(isSelectable(lem({ state, removed: false })), false, `'${state}' should be unselectable`);
  }
});

test('isSelectable: every non-removed, non-UNASSIGNABLE state is selectable', () => {
  assert.ok(SELECTABLE_STATES.length > 0);
  for (const state of SELECTABLE_STATES) {
    assert.equal(isSelectable(lem({ state, removed: false })), true, `'${state}' should be selectable`);
  }
});

// ═══ passesFilter ════════════════════════════════════════════════════════════════════════════

test('passesFilter: SELECTION_FILTERS is exactly the 4 chip values', () => {
  assert.deepEqual(SELECTION_FILTERS, ['all', 'walkers', 'facing-left', 'facing-right']);
});

test("passesFilter: 'all' passes every state/direction", () => {
  assert.equal(passesFilter(lem({ state: 'walking' }), 'all'), true);
  assert.equal(passesFilter(lem({ state: 'falling', dir: -1 }), 'all'), true);
  assert.equal(passesFilter(lem({ state: 'blocking' }), 'all'), true);
});

test("passesFilter: 'walkers' passes walking or jumping only, flags allowed", () => {
  assert.equal(passesFilter(lem({ state: 'walking' }), 'walkers'), true);
  assert.equal(passesFilter(lem({ state: 'jumping' }), 'walkers'), true);
  assert.equal(passesFilter(lem({ state: 'falling' }), 'walkers'), false);
  assert.equal(passesFilter(lem({ state: 'climbing' }), 'walkers'), false);
  // Flags (climber/floater) never affect the walkers test.
  assert.equal(passesFilter(lem({ state: 'walking', isClimber: true, isFloater: true }), 'walkers'), true);
  assert.equal(passesFilter(lem({ state: 'jumping', isClimber: true }), 'walkers'), true);
});

test("passesFilter: 'facing-left'/'facing-right' test dir only", () => {
  assert.equal(passesFilter(lem({ dir: -1 }), 'facing-left'), true);
  assert.equal(passesFilter(lem({ dir: 1 }), 'facing-left'), false);
  assert.equal(passesFilter(lem({ dir: 1 }), 'facing-right'), true);
  assert.equal(passesFilter(lem({ dir: -1 }), 'facing-right'), false);
  // Any state passes facing-* (no walker restriction unless walkersOnly is also set).
  assert.equal(passesFilter(lem({ dir: -1, state: 'bashing' }), 'facing-left'), true);
});

test('passesFilter: walkersOnly ANDs with every chip, including "all"', () => {
  assert.equal(passesFilter(lem({ state: 'walking' }), 'all', true), true);
  assert.equal(passesFilter(lem({ state: 'falling' }), 'all', true), false);
  assert.equal(passesFilter(lem({ state: 'jumping' }), 'all', true), true);
  // facing-left AND walkersOnly: direction matches but state doesn't → excluded.
  assert.equal(passesFilter(lem({ dir: -1, state: 'falling' }), 'facing-left', true), false);
  // Both match → included.
  assert.equal(passesFilter(lem({ dir: -1, state: 'walking' }), 'facing-left', true), true);
  // walkersOnly defaults to false when omitted.
  assert.equal(passesFilter(lem({ state: 'falling' }), 'all'), true);
});

// ═══ lemmingsAt ══════════════════════════════════════════════════════════════════════════════

test('lemmingsAt: hit box is inclusive x-6..x+6, y-11..y+1 around (x, y)', () => {
  const a = lem({ id: 1, x: 100, y: 100 });
  const corners: [number, number][] = [
    [100 - 6, 100 - 11],
    [100 + 6, 100 - 11],
    [100 - 6, 100 + 1],
    [100 + 6, 100 + 1],
    [100, 100], // centre-ish, well inside
  ];
  for (const [px, py] of corners) {
    assert.equal(lemmingsAt([a], { x: px, y: py }).length, 1, `(${px},${py}) should hit`);
  }
});

test('lemmingsAt: just-outside points on every edge miss', () => {
  const a = lem({ id: 1, x: 100, y: 100 });
  const outside: [number, number][] = [
    [100 - 7, 100], // left of x-6
    [100 + 7, 100], // right of x+6
    [100, 100 - 12], // above y-11
    [100, 100 + 2], // below y+1
  ];
  for (const [px, py] of outside) {
    assert.equal(lemmingsAt([a], { x: px, y: py }).length, 0, `(${px},${py}) should miss`);
  }
});

test('lemmingsAt matches LEMMING_HITBOX constant exactly (dx/dy/w/h)', () => {
  assert.deepEqual(LEMMING_HITBOX, { dx: -6, dy: -11, w: 13, h: 13 });
});

test('lemmingsAt: multiple overlapping lemmings returned in release (array) order', () => {
  // Deliberately NOT in id order, to prove lemmingsAt does not sort — it preserves release order.
  const b = lem({ id: 20, x: 100, y: 100 });
  const a = lem({ id: 5, x: 100, y: 100 });
  const c = lem({ id: 12, x: 100, y: 100 });
  const hits = lemmingsAt([b, a, c], { x: 100, y: 100 });
  assert.deepEqual(
    hits.map((l) => l.id),
    [20, 5, 12],
  );
});

test('lemmingsAt: excludes non-selectable lemmings (removed or UNASSIGNABLE) even when hit', () => {
  const walker = lem({ id: 1, x: 100, y: 100, state: 'walking' });
  const removed = lem({ id: 2, x: 100, y: 100, state: 'walking', removed: true });
  const exiting = lem({ id: 3, x: 100, y: 100, state: 'exiting' });
  const hits = lemmingsAt([walker, removed, exiting], { x: 100, y: 100 });
  assert.deepEqual(
    hits.map((l) => l.id),
    [1],
  );
});

test('lemmingsAt: honours filter chip and walkersOnly', () => {
  const left = lem({ id: 1, x: 100, y: 100, dir: -1, state: 'walking' });
  const right = lem({ id: 2, x: 100, y: 100, dir: 1, state: 'walking' });
  const faller = lem({ id: 3, x: 100, y: 100, dir: 1, state: 'falling' });
  const p = { x: 100, y: 100 };
  assert.deepEqual(
    lemmingsAt([left, right, faller], p, { filter: 'facing-left' }).map((l) => l.id),
    [1],
  );
  assert.deepEqual(
    lemmingsAt([left, right, faller], p, { filter: 'all', walkersOnly: true }).map((l) => l.id),
    [1, 2],
  );
  assert.deepEqual(lemmingsAt([left, right, faller], p, { filter: 'walkers' }).map((l) => l.id), [1, 2]);
});

// ═══ pickLemmingAt ═══════════════════════════════════════════════════════════════════════════

test('pickLemmingAt step 1: a hit-box candidate is picked directly (single candidate)', () => {
  const a = lem({ id: 1, x: 100, y: 100 });
  assert.equal(pickLemmingAt([a], { x: 100, y: 100 }, null)?.id, 1);
});

test('pickLemmingAt step 1: hit-box candidates win even over a closer-body-centre non-hit lemming', () => {
  // The hit box is exactly the 13x13 square centred on the body centre (x, y-5), so ANY point
  // within Euclidean distance 6 of a lemming's centre is necessarily inside its own hit box too.
  // To build a genuine "closer centre, but not hit" competitor we place it so p sits at a corner
  // of `inBox`'s hit box (distance ~8.49 from inBox's centre) while `closerCentre`'s own foot is
  // offset so p falls just outside ITS hit box (x-distance 7) yet is only distance 7 from its
  // centre — strictly closer than inBox's 8.49, so if snapping were (incorrectly) consulted here
  // it would prefer closerCentre. Since a hit-box candidate exists, snapping must never run.
  const inBox = lem({ id: 1, x: 100, y: 100 }); // hit box x:[94,106] y:[89,101], centre (100,95)
  const closerCentre = lem({ id: 2, x: 87, y: 94 }); // centre (87,89); hit box x:[81,93] y:[83,95]
  const p = { x: 94, y: 89 }; // corner of inBox's hit box; outside closerCentre's (x=94 ∉ [81,93])
  assert.deepEqual(
    lemmingsAt([inBox, closerCentre], p).map((l) => l.id),
    [1],
  );
  const picked = pickLemmingAt([inBox, closerCentre], p, null, { snapRadius: 100 });
  assert.equal(picked?.id, 1);
});

test('pickLemmingAt step 2: snaps to nearest body centre (x, y-5) when no hit box contains p', () => {
  const a = lem({ id: 1, x: 0, y: 5 }); // body centre (0,0); hit box x:[-6,6] y:[-6,6]
  const p = { x: 0, y: 10 }; // d = 10 from centre; y=10 is outside the hit box's y:[-6,6]
  assert.equal(lemmingsAt([a], p).length, 0, 'sanity: p must not be inside the hit box for this test');
  assert.equal(pickLemmingAt([a], p, null, { snapRadius: 10 })?.id, 1);
});

test('pickLemmingAt step 2: snap boundary — d=R included, d=R+1 excluded', () => {
  const a = lem({ id: 1, x: 0, y: 5 }); // body centre (0,0)
  const p = { x: 0, y: 7 }; // d = 7; outside the hit box (y:[-6,6] excludes 7)
  assert.equal(lemmingsAt([a], p).length, 0, 'sanity: outside hit box');
  assert.equal(pickLemmingAt([a], p, null, { snapRadius: 7 })?.id, 1, 'R=7 (d=R) should include');
  assert.equal(pickLemmingAt([a], p, null, { snapRadius: 6 }), null, 'R=6 (d=R+1) should exclude');
});

test('pickLemmingAt step 2: ties on distance go to the higher id (later released)', () => {
  // Two lemmings equidistant from p, both outside their own hit boxes at p.
  const a = lem({ id: 5, x: 0, y: 20 }); // centre (0,15); hit box x:[-6,6]
  const b = lem({ id: 9, x: 20, y: 20 }); // centre (20,15); hit box x:[14,26]
  const p = { x: 10, y: 15 }; // x=10 is outside both hit boxes; d=10 from both centres
  assert.equal(lemmingsAt([a, b], p).length, 0, 'sanity: p outside both hit boxes');
  const picked = pickLemmingAt([a, b], p, null, { snapRadius: 10 });
  assert.equal(picked?.id, 9);
});

test('pickLemmingAt step 2: nothing hit, snapRadius absent or 0 → null', () => {
  const a = lem({ id: 1, x: 0, y: 5 }); // centre (0,0)
  const p = { x: 0, y: 10 }; // outside hit box, d=10 from centre (not exactly 0)
  assert.equal(lemmingsAt([a], p).length, 0);
  assert.equal(pickLemmingAt([a], p, null), null, 'no snapRadius option at all');
  assert.equal(pickLemmingAt([a], p, null, { snapRadius: 0 }), null, 'snapRadius explicitly 0');
});

test('pickLemmingAt step 2: filter and walkersOnly apply to the snap path too', () => {
  const faller = lem({ id: 1, x: 0, y: 5, state: 'falling' }); // centre (0,0)
  const p = { x: 0, y: 10 }; // outside hit box, d=10 from centre
  assert.equal(lemmingsAt([faller], p).length, 0);
  // Without a walkers-restricting filter, it would snap.
  assert.equal(pickLemmingAt([faller], p, null, { snapRadius: 10 })?.id, 1);
  // With walkers-only filter, a faller must not be snapped to.
  assert.equal(pickLemmingAt([faller], p, null, { snapRadius: 10, filter: 'walkers' }), null);
  assert.equal(pickLemmingAt([faller], p, null, { snapRadius: 10, walkersOnly: true }), null);
});

test('pickLemmingAt step 3: drops refusers only when >=1 candidate accepts', () => {
  const a = lem({ id: 1, x: 100, y: 100 }); // refuses
  const b = lem({ id: 2, x: 100, y: 100 }); // accepts
  const accepts = (l: Readonly<Lemming>) => l.id === 2;
  const picked = pickLemmingAt([a, b], { x: 100, y: 100 }, 'digger', { accepts });
  assert.equal(picked?.id, 2);
});

test('pickLemmingAt step 3: a single refuser is still returned (never drops everyone)', () => {
  const a = lem({ id: 1, x: 100, y: 100 });
  const picked = pickLemmingAt([a], { x: 100, y: 100 }, 'digger', { accepts: () => false });
  assert.equal(picked?.id, 1);
});

test('pickLemmingAt step 3: no accept-drop when skill is null, even if accepts is given', () => {
  const refuser = lem({ id: 1, x: 100, y: 100 });
  const accepter = lem({ id: 2, x: 100, y: 100 });
  const accepts = (l: Readonly<Lemming>) => l.id === 2;
  // skill === null → step 3 must not apply; step 5 (highest id) then picks id 2 anyway here, so
  // use ids the other way round to distinguish "no filtering happened" from "filtering happened".
  const refuserHighId = lem({ id: 9, x: 100, y: 100 });
  const accepterLowId = lem({ id: 2, x: 100, y: 100 });
  const acceptsLow = (l: Readonly<Lemming>) => l.id === 2;
  const picked = pickLemmingAt([refuserHighId, accepterLowId], { x: 100, y: 100 }, null, { accepts: acceptsLow });
  // With skill null, step 3 is skipped entirely, so step 5 (highest id) wins: id 9, the refuser.
  assert.equal(picked?.id, 9);
  void refuser;
  void accepter;
  void accepts;
});

test('pickLemmingAt step 3: no accept-drop when accepts option is not given', () => {
  const refuserHighId = lem({ id: 9, x: 100, y: 100 });
  const accepterLowId = lem({ id: 2, x: 100, y: 100 });
  const picked = pickLemmingAt([refuserHighId, accepterLowId], { x: 100, y: 100 }, 'digger');
  assert.equal(picked?.id, 9, 'without an accepts callback, highest id wins (no filtering possible)');
});

for (const busyState of BUSY_STATES) {
  test(`pickLemmingAt step 4: prefers busy state '${busyState}' over a non-busy candidate with a higher id`, () => {
    const busy = lem({ id: 1, x: 100, y: 100, state: busyState });
    const nonBusy = lem({ id: 99, x: 100, y: 100, state: 'walking' });
    const picked = pickLemmingAt([nonBusy, busy], { x: 100, y: 100 }, null);
    assert.equal(picked?.id, 1);
  });
}

test('pickLemmingAt step 5: among equally-busy (or equally non-busy) candidates, highest id wins', () => {
  const a = lem({ id: 3, x: 100, y: 100, state: 'blocking' });
  const b = lem({ id: 7, x: 100, y: 100, state: 'blocking' });
  const c = lem({ id: 5, x: 100, y: 100, state: 'blocking' });
  assert.equal(pickLemmingAt([a, b, c], { x: 100, y: 100 }, null)?.id, 7);

  const d = lem({ id: 4, x: 100, y: 100, state: 'walking' });
  const e = lem({ id: 11, x: 100, y: 100, state: 'walking' });
  assert.equal(pickLemmingAt([d, e], { x: 100, y: 100 }, null)?.id, 11);
});

test('pickLemmingAt: filter and walkersOnly are honoured on the hit-box path', () => {
  const left = lem({ id: 1, x: 100, y: 100, dir: -1 });
  const right = lem({ id: 2, x: 100, y: 100, dir: 1 });
  const picked = pickLemmingAt([left, right], { x: 100, y: 100 }, null, { filter: 'facing-left' });
  assert.equal(picked?.id, 1);
  const faller = lem({ id: 3, x: 100, y: 100, state: 'falling' });
  assert.equal(pickLemmingAt([faller], { x: 100, y: 100 }, null, { walkersOnly: true }), null);
});

// ═══ cycleLemming ════════════════════════════════════════════════════════════════════════════

test('cycleLemming: order is by x then id; step +1/-1 wraps', () => {
  const a = lem({ id: 3, x: 30 });
  const b = lem({ id: 1, x: 10 });
  const c = lem({ id: 2, x: 10 }); // ties with b on x → id breaks the tie (b before c)
  const arr = [a, b, c];
  assert.equal(cycleLemming(arr, null, 1)?.id, 1); // leftmost of the x=10 tie is b (lower id)
  assert.equal(cycleLemming(arr, 1, 1)?.id, 2); // b → c
  assert.equal(cycleLemming(arr, 2, 1)?.id, 3); // c → a
  assert.equal(cycleLemming(arr, 3, 1)?.id, 1); // wraps a → b
  assert.equal(cycleLemming(arr, 1, -1)?.id, 3); // wraps b → a (backwards)
  assert.equal(cycleLemming(arr, 3, -1)?.id, 2); // a → c
});

test('cycleLemming: filter narrows the order', () => {
  const a = lem({ id: 1, x: 10, dir: -1 });
  const b = lem({ id: 2, x: 20, dir: 1 });
  const c = lem({ id: 3, x: 30, dir: -1 });
  const picked = cycleLemming([a, b, c], 1, 1, { filter: 'facing-left' });
  assert.equal(picked?.id, 3); // b (facing-right) is skipped
});

test('cycleLemming: empty selectable set → null', () => {
  assert.equal(cycleLemming([], null, 1), null);
  const onlyExiting = lem({ id: 1, state: 'exiting' });
  assert.equal(cycleLemming([onlyExiting], null, 1), null);
  const onlyRightFacing = lem({ id: 1, dir: 1 });
  assert.equal(cycleLemming([onlyRightFacing], null, 1, { filter: 'facing-left' }), null);
});

test('cycleLemming: group jump skips a tight, same-state cluster to the first mumble > GROUP_GAP away', () => {
  const a = lem({ id: 1, x: 0, state: 'walking' });
  const b = lem({ id: 2, x: 4, state: 'walking' }); // within GROUP_GAP (8) of a, same state
  const c = lem({ id: 3, x: GROUP_GAP + 1, state: 'walking' }); // > GROUP_GAP away from a
  const picked = cycleLemming([a, b, c], 1, 1, { group: true });
  assert.equal(picked?.id, 3, 'should skip b (too close, same state) and land on c');
});

test('cycleLemming: group jump triggers on a state change even at the same x (distance 0)', () => {
  const a = lem({ id: 1, x: 10, state: 'walking' });
  const b = lem({ id: 2, x: 10, state: 'blocking' }); // same x, different state
  const picked = cycleLemming([a, b], 1, 1, { group: true });
  assert.equal(picked?.id, 2);
});

test('cycleLemming: group jump falls back to plain +-1 when the whole set is one cluster/state', () => {
  const a = lem({ id: 1, x: 0, state: 'walking' });
  const b = lem({ id: 2, x: 2, state: 'walking' });
  const c = lem({ id: 3, x: 4, state: 'walking' });
  const groupPick = cycleLemming([a, b, c], 1, 1, { group: true });
  const plainPick = cycleLemming([a, b, c], 1, 1);
  assert.equal(groupPick?.id, plainPick?.id);
  assert.equal(groupPick?.id, 2); // plain +1 from a (index 0) is b
});

test('cycleLemming: group jump wraps around the order when searching', () => {
  // a(0) b(2) c(4): from c with step +1, searching wraps past c back to a/b; a is same state and
  // within GROUP_GAP of... wait, distance is measured from the CURRENT lemming (c, x=4).
  const a = lem({ id: 1, x: 0, state: 'walking' }); // |0-4| = 4, within GROUP_GAP(8), same state
  const b = lem({ id: 2, x: 2, state: 'walking' }); // |2-4| = 2, within GROUP_GAP, same state
  const c = lem({ id: 3, x: 4 + GROUP_GAP + 1, state: 'walking' }); // the current one (far right)
  // Reorder so c is "current" but appears wherever in the array; order is computed by x anyway.
  const picked = cycleLemming([a, b, c], 3, 1, { group: true });
  // From c (rightmost), stepping +1 wraps to a first (i=1): |0 - c.x| > GROUP_GAP → qualifies at i=1.
  assert.equal(picked?.id, 1);
});

test('cycleLemming: no selection + view → X (step 1) starts leftmost in view, Z (step -1) rightmost', () => {
  const a = lem({ id: 1, x: 5 });
  const b = lem({ id: 2, x: 15 });
  const c = lem({ id: 3, x: 25 });
  const view = { x0: 10, x1: 30 }; // contains b, c but not a
  assert.equal(cycleLemming([a, b, c], null, 1, { view })?.id, 2);
  assert.equal(cycleLemming([a, b, c], null, -1, { view })?.id, 3);
});

test('cycleLemming: no selection + view, none in view → nearest to view centre, ties → higher id', () => {
  const a = lem({ id: 1, x: 0 });
  const b = lem({ id: 2, x: 100 });
  const view = { x0: 40, x1: 60 }; // centre = 50; both a and b are 50 away, none in view
  const picked = cycleLemming([a, b], null, 1, { view });
  assert.equal(picked?.id, 2, 'tie on distance to centre → higher id');
  // Non-tie case: c is closer to the centre than a or b.
  const c = lem({ id: 3, x: 55 });
  const picked2 = cycleLemming([a, b, c], null, 1, { view });
  assert.equal(picked2?.id, 3);
});

test('cycleLemming: no selection, no view/fromX → first (step 1) / last (step -1) overall', () => {
  const a = lem({ id: 1, x: 10 });
  const b = lem({ id: 2, x: 20 });
  assert.equal(cycleLemming([a, b], null, 1)?.id, 1);
  assert.equal(cycleLemming([a, b], null, -1)?.id, 2);
});

test('cycleLemming: fromX continuation after the selection vanished — step 1 finds first x >= fromX', () => {
  const a = lem({ id: 1, x: 10 });
  const b = lem({ id: 2, x: 20 });
  const c = lem({ id: 3, x: 30 });
  assert.equal(cycleLemming([a, b, c], null, 1, { fromX: 15 })?.id, 2);
  assert.equal(cycleLemming([a, b, c], null, 1, { fromX: 20 })?.id, 2, 'boundary: x === fromX is included');
  // Nothing at or past fromX → wraps to the first.
  assert.equal(cycleLemming([a, b, c], null, 1, { fromX: 31 })?.id, 1);
});

test('cycleLemming: fromX continuation — step -1 finds last x <= fromX', () => {
  const a = lem({ id: 1, x: 10 });
  const b = lem({ id: 2, x: 20 });
  const c = lem({ id: 3, x: 30 });
  assert.equal(cycleLemming([a, b, c], null, -1, { fromX: 25 })?.id, 2);
  assert.equal(cycleLemming([a, b, c], null, -1, { fromX: 20 })?.id, 2, 'boundary: x === fromX is included');
  // Nothing at or before fromX → wraps to the last.
  assert.equal(cycleLemming([a, b, c], null, -1, { fromX: 9 })?.id, 3);
});

test('cycleLemming: fromX takes priority over view when both are given (per current-selection-missing branch order)', () => {
  const a = lem({ id: 1, x: 10 });
  const b = lem({ id: 2, x: 20 });
  const c = lem({ id: 3, x: 30 });
  const view = { x0: 0, x1: 5 }; // would pick "nearest to centre" if used
  const picked = cycleLemming([a, b, c], null, 1, { fromX: 25, view });
  assert.equal(picked?.id, 3, 'fromX (x >= 25) should be consulted, not the view rule');
});

test('cycleLemming: a currentId no longer resolvable in the (filtered) order is treated as missing', () => {
  const a = lem({ id: 1, x: 10, dir: 1 }); // excluded by facing-left filter
  const b = lem({ id: 2, x: 20, dir: -1 });
  const c = lem({ id: 3, x: 30, dir: -1 });
  // currentId=1 does not appear in the filtered order (facing-left) → falls back to fromX rule.
  const picked = cycleLemming([a, b, c], 1, 1, { filter: 'facing-left', fromX: 25 });
  assert.equal(picked?.id, 3);
});

test('cycleLemming does not mutate its inputs', () => {
  const a = lem({ id: 2, x: 20 });
  const b = lem({ id: 1, x: 10 });
  const arr = [a, b];
  const snapshotArr = [...arr];
  const snapshotA = { ...a };
  const snapshotB = { ...b };
  cycleLemming(arr, null, 1, { fromX: 5, view: { x0: 0, x1: 100 }, group: true });
  cycleLemming(arr, 1, -1, { group: true });
  assert.deepEqual(arr, snapshotArr, 'array order/identity unchanged');
  assert.deepEqual(a, snapshotA, 'lemming a unchanged');
  assert.deepEqual(b, snapshotB, 'lemming b unchanged');
});
