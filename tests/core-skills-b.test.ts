/**
 * Independent SPEC validation of BASHER, MINER, DIGGER and the generic refusal rules
 * (workstream A, task A3b-V). Every expected value below is derived from:
 *   - docs/development/core-rules.md §S (Workers lose ground; Basher; Miner incl. the exact
 *     slanted mask formula; Digger), §R (rejection order/details), §F (tick order, blocker field,
 *     checkAssign order)
 *   - docs/research/RESEARCH.md §2.4-2.5 (skill numbers, assignment rules), §2.8-2.9 (steel per
 *     pixel & never removed; one-way walls restrict only bashers/miners)
 *   - docs/research/notes-mechanics.md §C (Basher/Miner/Digger), §D13 (one-way walls & steel)
 *   - docs/design/DESIGN.md §3.4 (mechanics hooks: carve/move phases) and §6.5 (refusal reasons)
 *   - src/core/constants.ts, Material/Terrain.remove/canRemove semantics (src/core/terrain.ts)
 *
 * NOT derived from bash.ts / mine.ts / dig.ts / masks.ts source - only their behaviour as
 * documented in core-rules.md §S was used to compute expected pixels/ticks/events.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AIRBORNE_STATES, UNASSIGNABLE_STATES } from '../src/core/behaviours/index.ts';
import { FALL_COUNTER_STEP } from '../src/core/constants.ts';
import { Material } from '../src/core/terrain.ts';
import type { GameEvent, LemmingState, SkillId } from '../src/core/types.ts';
import { FLOOR, live, sessionWithWalker, stepN, stepUntil } from './core-fixtures.ts';

// ─── helpers ───────────────────────────────────────────────────────────────────────────────

/** b(t) for t = -7..8 (core-rules §S miner mask formula), indexed by t+7. */
const MINER_B: readonly number[] = [-5, -4, -4, -3, -3, -2, -2, -1, -1, -1, -1, 0, 0, 1, 1, 2];

/** The exact §S miner mask (16x13) anchored at (ax, ay), as a set of "x,y" pixel keys. */
function minerMask(ax: number, ay: number, dir: 1 | -1): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < 16; i++) {
    const t = i - 7;
    const col = ax + t * dir;
    const bottom = ay + (MINER_B[i] as number);
    for (let row = bottom - 12; row <= bottom; row++) out.add(`${col},${row}`);
  }
  return out;
}
function union(...sets: readonly Set<string>[]): Set<string> {
  const out = new Set<string>();
  for (const s of sets) for (const k of s) out.add(k);
  return out;
}
function diff(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const k of a) if (!b.has(k)) out.add(k);
  return out;
}

function findEvent(events: readonly { event: GameEvent }[], type: GameEvent['type']): GameEvent | undefined {
  return events.map((e) => e.event).find((e) => e.type === type);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BASHER (core-rules §S)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('basher: carves only on stroke phases 2-5 (16x10 mask, t -8..7, rows y-10..y-1, floor intact), moves 1 px/tick on phases 11-15', () => {
  const x0 = 40;
  const y0 = FLOOR;
  const session = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: x0 - 10, y: y0 - 20, w: 160, h: 20 }], // wide wall, both sides of the mask + a spare row above it
  });
  const solid = (x: number, y: number) => session.terrain.isSolid(x, y);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  assert.equal(live(session, 0).state, 'bashing');

  // stateTicks 1 (phase 1): no carve yet.
  stepN(session, 1);
  assert.equal(live(session, 0).stateTicks, 1);
  for (let c = x0 - 8; c <= x0 + 7; c++)
    for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(solid(c, r), true, `(${c},${r}) carved before phase 2`);

  // stateTicks 2-5 (phases 2-5): carve happens; mask = t in [-8,7] x rows y-10..y-1.
  stepN(session, 4);
  assert.equal(live(session, 0).stateTicks, 5);
  for (let c = x0 - 8; c <= x0 + 7; c++)
    for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(solid(c, r), false, `(${c},${r}) should be carved by stroke 1`);
  // exact bounds: one column either side of the mask, and one row above it, stay solid.
  for (let r = y0 - 10; r <= y0 - 1; r++) {
    assert.equal(solid(x0 - 9, r), true, 'column behind the mask (t=-9) stays solid');
    assert.equal(solid(x0 + 8, r), true, 'column ahead of the mask (t=8) stays solid');
  }
  for (let c = x0 - 8; c <= x0 + 7; c++) assert.equal(solid(c, y0 - 11), true, 'row above the mask (y-11) stays solid');
  for (let c = x0 - 8; c <= x0 + 8; c++) assert.equal(solid(c, y0), true, 'floor row (y) stays intact');
  assert.equal(live(session, 0).x, x0, 'no movement during carve phases');

  // stateTicks 6-10: no further carve, no movement.
  stepN(session, 5);
  assert.equal(live(session, 0).stateTicks, 10);
  assert.equal(live(session, 0).x, x0);
  assert.equal(live(session, 0).state, 'bashing');
  assert.equal(solid(x0 + 8, y0 - 5), true, 'still untouched past the mask');

  // stateTicks 11-15: 1 px/tick, 5 px total for the stroke.
  for (let i = 1; i <= 5; i++) {
    stepN(session, 1);
    assert.equal(live(session, 0).x, x0 + i, `x after move tick ${i}`);
  }
  assert.equal(live(session, 0).y, y0, 'flat floor: y unchanged while moving');
});

test('basher: hit-steel reports the FIRST steel pixel scanning t ascending then rows top->bottom, turns, steel stays intact', () => {
  const x0 = 40;
  const y0 = FLOOR;
  const session = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [
      { x: x0, y: y0 - 10, w: 150, h: 10 }, // plain wall, ample for 2 strokes
      { x: x0 + 8, y: y0 - 2, w: 1, h: 1, material: Material.Steel }, // t=3 in stroke 2, low row
      { x: x0 + 11, y: y0 - 9, w: 1, h: 1, material: Material.Steel }, // t=6 in stroke 2, high row - must NOT win
    ],
  });
  const check = session.checkAssign(0, 'basher');
  assert.equal(check, null, 'steel is beyond the first stroke test region: assignment must be accepted');
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });

  const events = stepN(session, 18); // stroke 1 (16) + first 2 ticks of stroke 2's carve
  const hit = findEvent(events, 'hit-steel');
  assert.deepEqual(hit, { type: 'hit-steel', lemmingId: 0, x: x0 + 8, y: y0 - 2 }, 'the t=3 pixel must win over the t=6 pixel found later in the scan');
  assert.equal(live(session, 0).state, 'walking');
  assert.equal(live(session, 0).dir, -1);
  assert.equal(session.terrain.isSolid(x0 + 8, y0 - 2), true, 'steel is never removed');
  assert.equal(session.terrain.isSolid(x0 + 11, y0 - 9), true, 'steel is never removed');
  assert.equal(session.terrain.isSolid(x0 + 9, y0 - 2), true, 'carve was aborted entirely this tick, not partially');
});

test('basher: stops via the lookahead (4 empty px at y-6, 8-11 ahead, checked at stateTicks % 32 === 5), always ending an odd stroke', () => {
  const x0 = 40;
  const y0 = FLOOR;
  const session = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: x0, y: y0 - 10, w: 16, h: 10 }], // thin wall: gone by the time stroke 3 looks ahead
  });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });

  stepN(session, 5); // stroke 1's own lookahead (tick 5): columns [48,51] still inside the wall -> continues
  assert.equal(live(session, 0).state, 'bashing');
  stepN(session, 31); // through stroke 2 (always completes) to stroke 3's carve tick, absolute stateTicks 36
  assert.equal(live(session, 0).state, 'bashing');
  assert.equal(live(session, 0).stateTicks, 36);
  assert.equal(live(session, 0).x, x0 + 10, 'strokes 1 and 2 each advanced 5 px');

  stepN(session, 1); // stateTicks 37 === 5 (mod 32): lookahead now sees columns [58,61] empty -> walking
  assert.equal(live(session, 0).state, 'walking');
  assert.equal(live(session, 0).dir, 1, 'lookahead stop does not turn the lemming');
  assert.equal(live(session, 0).x, x0 + 10, 'stroke 3 stopped before its own move phase');
  assert.equal(37 % 32, 5);
  assert.equal(Math.ceil(37 / 16), 3, 'an odd number of strokes (3) were entered');
});

test('basher: one-way wall against its direction turns it (no removal); with its direction it bashes straight through', () => {
  const x0 = 40;
  const y0 = FLOOR;

  // Against: OneWayLeft blocks dir=+1. Placed beyond stroke 1 so assignment is accepted.
  const against = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [
      { x: x0, y: y0 - 10, w: 8, h: 10 }, // stroke 1's own region: plain earth
      { x: x0 + 8, y: y0 - 10, w: 50, h: 10, material: Material.OneWayLeft },
    ],
  });
  assert.equal(against.checkAssign(0, 'basher'), null);
  against.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  const events = stepN(against, 18); // through stroke 2's first carve tick
  assert.equal(findEvent(events, 'hit-steel'), undefined, 'one-way is not steel: no hit-steel event');
  assert.equal(live(against, 0).state, 'walking');
  assert.equal(live(against, 0).dir, -1);
  for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(against.terrain.get(x0 + 8, r), Material.OneWayLeft, 'one-way wall stays intact');

  // With: OneWayRight allows dir=+1, so it bashes straight through like plain earth.
  const withDir = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: x0 - 10, y: y0 - 10, w: 160, h: 10, material: Material.OneWayRight }],
  });
  withDir.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  stepN(withDir, 5); // through the first carve batch
  for (let c = x0 - 8; c <= x0 + 7; c++)
    for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(withDir.terrain.isSolid(c, r), false, `(${c},${r}) should have been bashed through`);
  assert.equal(live(withDir, 0).state, 'bashing', 'moving with the arrow never turns it');
});

test('basher: follows a floor dropping <= 2 px while moving; a bigger drop makes it fall', () => {
  const x0 = 40;
  const y0 = FLOOR;
  const wall = { x: x0, y: y0 - 10, w: 150, h: 10 };
  const floorA = { x: 0, y: y0, w: 43, h: 10 };

  const small = sessionWithWalker({
    floor: false,
    entrances: [{ x: x0, y: y0 }],
    boxes: [floorA, { x: 43, y: y0 + 2, w: 357, h: 10 }, wall],
    skills: { basher: 1 },
  });
  small.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  stepN(small, 12); // through the end of the carve+idle ticks (stateTicks 10), plus move ticks 11-12 (x=41,42)
  assert.equal(live(small, 0).x, 42);
  assert.equal(live(small, 0).y, y0);
  stepN(small, 1); // tick 13 (x=43): floor drops 2 px -> follows it down
  assert.equal(live(small, 0).x, 43);
  assert.equal(live(small, 0).y, y0 + 2);
  assert.equal(live(small, 0).state, 'bashing');
  stepN(small, 2); // ticks 14-15
  assert.equal(live(small, 0).x, 45);
  assert.equal(live(small, 0).y, y0 + 2);
  assert.equal(live(small, 0).state, 'bashing', 'still bashing after following a 2 px drop');

  const big = sessionWithWalker({
    floor: false,
    entrances: [{ x: x0, y: y0 }],
    boxes: [floorA, { x: 43, y: y0 + 3, w: 357, h: 10 }, wall],
    skills: { basher: 1 },
  });
  big.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  stepN(big, 12);
  stepN(big, 1); // tick 13 (x=43): a 3 px drop exceeds BASH_FOLLOW_DOWN(2) -> falls
  assert.equal(live(big, 0).state, 'falling');
  assert.equal(live(big, 0).fallDistance, FALL_COUNTER_STEP);
  assert.equal(live(big, 0).x, 43);
});

test('basher: mirrored left/right (mask formula uses t*dir; both edges land in the right place)', () => {
  const x0 = 200;
  const y0 = FLOOR;
  const session = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: 50, y: y0 - 10, w: 160, h: 10 }], // columns 50..209
  });
  const lem = live(session, 0);
  lem.dir = -1;
  lem.x = x0;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  stepN(session, 5); // through the carve batch

  for (let t = 0; t <= 7; t++) {
    const c = x0 - t;
    for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(session.terrain.isSolid(c, r), false, `ahead t=${t} col ${c} row ${r} should be carved`);
  }
  for (let t = 1; t <= 8; t++) {
    const c = x0 + t;
    for (let r = y0 - 10; r <= y0 - 1; r++) assert.equal(session.terrain.isSolid(c, r), false, `behind t=-${t} col ${c} row ${r} should be carved`);
  }
  assert.equal(session.terrain.isSolid(x0 - 8, y0 - 5), true, 'one column past the ahead edge (t=8) stays solid');
  assert.equal(session.terrain.isSolid(x0 + 9, y0 - 5), true, 'one column past the behind edge (t=-9) stays solid');
  assert.equal(session.terrain.isSolid(x0, y0), true, 'floor row stays intact');
  assert.equal(live(session, 0).x, x0, 'no movement yet');
});

test('basher: an accepted assignment next to steel BEHIND it never reports steel (refusals are truthful)', () => {
  const x0 = 40;
  const y0 = FLOOR;
  const session = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: x0 - 1, y: y0 - 5, w: 1, h: 1, material: Material.Steel }], // t=-1: outside the ahead test region
  });
  assert.equal(session.checkAssign(0, 'basher'), null, 'steel behind the lemming does not block assignment');
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  const events = stepN(session, 5);
  assert.equal(findEvent(events, 'hit-steel'), undefined, 'behind-steel is never even checked by the runtime hit-steel scan');
  assert.equal(session.terrain.isSolid(x0 - 1, y0 - 5), true);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// MINER (core-rules §S)
// ═══════════════════════════════════════════════════════════════════════════════════════════

const MINER_BLOCK = { x: 0, y: 70, w: 400, h: 66 } as const; // rows 70..135, all Earth
const MX = 100;
const MY = 100;
const MINER_ENTRANCE = [{ x: MX, y: MY }] as const;

function testCycle1Mask(dir: 1 | -1): void {
  const session = sessionWithWalker({ skills: { miner: 1 }, entrances: MINER_ENTRANCE, boxes: [MINER_BLOCK] });
  const lem = live(session, 0);
  lem.dir = dir;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'miner' });

  const mask0 = minerMask(MX, MY, dir);
  const mask1 = minerMask(MX + dir, MY + 1, dir);
  const only0 = diff(mask0, mask1);
  const only1 = diff(mask1, mask0);
  const combined = union(mask0, mask1);

  stepN(session, 1); // phase 1: mask0 only
  for (const key of only0) {
    const [c, r] = key.split(',').map(Number);
    assert.equal(session.terrain.isSolid(c as number, r as number), false, `mask0-only ${key} should be carved after phase 1`);
  }
  for (const key of only1) {
    const [c, r] = key.split(',').map(Number);
    assert.equal(session.terrain.isSolid(c as number, r as number), true, `mask1-only ${key} must NOT be carved yet (phase 2 hasn't run)`);
  }

  stepN(session, 1); // phase 2: mask1 too
  const cMin = dir === 1 ? MX - 8 : MX - 9;
  const cMax = dir === 1 ? MX + 10 : MX + 9;
  for (let c = cMin; c <= cMax; c++) {
    for (let r = MY - 19; r <= MY + 4; r++) {
      const solid = session.terrain.isSolid(c, r);
      const inMask = combined.has(`${c},${r}`);
      assert.equal(solid, !inMask, `(${c},${r}) exactness after cycle 1 (dir ${dir})`);
    }
  }
  const before = Array.from(combined).map((k) => session.terrain.isSolid(...(k.split(',').map(Number) as [number, number])));

  stepN(session, 1); // phase 3: only moves (x += 2*dir, y += 1); no further carving
  const after = Array.from(combined).map((k) => session.terrain.isSolid(...(k.split(',').map(Number) as [number, number])));
  assert.deepEqual(after, before, 'no additional terrain change on the move-only tick');
  assert.equal(live(session, 0).x, MX + 2 * dir);
  assert.equal(live(session, 0).y, MY + 1);
}

test('miner: carves only on cycle phases 1-2; the carved pixels equal the §S mask at (x,y) and (x+dir,y+1) exactly', () => {
  testCycle1Mask(1);
});

test('miner: mirrored left/right - same exact mask with dir=-1', () => {
  testCycle1Mask(-1);
});

test('miner: moves exactly per DESIGN §3.4 (+4 px across, +2 px down per 24-tick cycle), stays mining, supported, alive', () => {
  const session = sessionWithWalker({ skills: { miner: 1 }, entrances: MINER_ENTRANCE, boxes: [MINER_BLOCK] });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'miner' });
  const N = 2;
  stepN(session, 24 * N);
  const lem = live(session, 0);
  assert.equal(lem.x, MX + 4 * N);
  assert.equal(lem.y, MY + 2 * N);
  assert.equal(lem.state, 'mining');
  assert.equal(session.terrain.isSolid(lem.x, lem.y), true, 'still supported');
});

test('miner: steel in the mask test region (t >= 0) -> hit-steel, turns, walks; steel stays intact', () => {
  const session = sessionWithWalker({
    skills: { miner: 1 },
    entrances: MINER_ENTRANCE,
    boxes: [MINER_BLOCK, { x: MX + 20, y: MY + 2, w: 1, h: 1, material: Material.Steel }],
  });
  assert.equal(session.checkAssign(0, 'miner'), null, 'steel far ahead is outside the first cycle test region');
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'miner' });
  const events = stepUntil(session, () => live(session, 0).state !== 'mining', 200);
  const hit = findEvent(events, 'hit-steel');
  assert.deepEqual(hit, { type: 'hit-steel', lemmingId: 0, x: MX + 20, y: MY + 2 });
  assert.equal(live(session, 0).state, 'walking');
  assert.equal(live(session, 0).dir, -1);
  assert.equal(session.terrain.isSolid(MX + 20, MY + 2), true, 'steel is never removed');
});

test('miner: a one-way wall against its direction turns it (no event, wall stays intact)', () => {
  const session = sessionWithWalker({
    skills: { miner: 1 },
    entrances: MINER_ENTRANCE,
    boxes: [MINER_BLOCK, { x: MX + 20, y: MY + 2, w: 1, h: 1, material: Material.OneWayLeft }],
  });
  assert.equal(session.checkAssign(0, 'miner'), null);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'miner' });
  const events = stepUntil(session, () => live(session, 0).state !== 'mining', 200);
  assert.equal(findEvent(events, 'hit-steel'), undefined);
  assert.equal(live(session, 0).state, 'walking');
  assert.equal(live(session, 0).dir, -1);
  assert.equal(session.terrain.get(MX + 20, MY + 2), Material.OneWayLeft);
});

test('miner: falls once the ground under a later step is gone', () => {
  const session = sessionWithWalker({
    skills: { miner: 1 },
    entrances: MINER_ENTRANCE,
    boxes: [{ x: 0, y: MY - 30, w: 400, h: 32 }], // solid only down to row MY+1
  });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'miner' });
  stepN(session, 24); // one full cycle: y ends at MY+2, which is empty
  assert.equal(live(session, 0).state, 'falling');
  assert.equal(live(session, 0).fallDistance, FALL_COUNTER_STEP);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// DIGGER (core-rules §S)
// ═══════════════════════════════════════════════════════════════════════════════════════════

function tallColumnLevel(material: Material = Material.Earth) {
  return { skills: { digger: 1 } as const, height: 300, floor: false, entrances: [{ x: 100, y: 100 }], boxes: [{ x: 0, y: 100, w: 400, h: 180, material }] };
}

test('digger: removes row x-4..x+4 every DIG_TICKS_PER_ROW (8) ticks, y += 1 per row; nothing before tick 8', () => {
  const session = sessionWithWalker(tallColumnLevel());
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });

  stepN(session, 7);
  for (let c = 96; c <= 104; c++) assert.equal(session.terrain.isSolid(c, 100), true, 'row 100 untouched before tick 8');
  assert.equal(live(session, 0).y, 100);

  const x0 = 100;
  for (let row = 100; row <= 102; row++) {
    stepN(session, 1); // the 8th tick of this row's window
    for (let c = x0 - 4; c <= x0 + 4; c++) assert.equal(session.terrain.isSolid(c, row), false, `row ${row} should be cleared`);
    assert.equal(live(session, 0).y, row + 1);
    assert.equal(live(session, 0).state, 'digging');
    stepN(session, 7); // idle ticks until the next row
  }
});

test('digger: digs through a 10 px floor and falls', () => {
  const session = sessionWithWalker({ skills: { digger: 1 } });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  stepN(session, 79);
  assert.equal(live(session, 0).state, 'digging');
  assert.equal(live(session, 0).y, FLOOR + 9);
  stepN(session, 1); // 80th tick: last floor row removed, new row (FLOOR+10) has no terrain
  assert.equal(live(session, 0).state, 'falling');
  assert.equal(live(session, 0).y, FLOOR + 10);
  assert.equal(live(session, 0).fallDistance, FALL_COUNTER_STEP);
});

test('digger: ignores one-way walls', () => {
  const session = sessionWithWalker(tallColumnLevel(Material.OneWayRight));
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  stepN(session, 8);
  for (let c = 96; c <= 104; c++) assert.equal(session.terrain.isSolid(c, 100), false, 'one-way material is dug through like earth');
  assert.equal(live(session, 0).state, 'digging');
});

test('digger: steel anywhere in the row -> hit-steel + walking, steel intact, direction unchanged', () => {
  const session = sessionWithWalker({
    ...tallColumnLevel(),
    boxes: [{ x: 0, y: 100, w: 400, h: 180 }, { x: 102, y: 103, w: 1, h: 1, material: Material.Steel }],
  });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  stepN(session, 31); // 3 rows removed (100,101,102); y=103
  assert.equal(live(session, 0).y, 103);
  assert.equal(live(session, 0).state, 'digging');
  const events = stepN(session, 1); // 32nd tick: row 103 contains steel
  const hit = findEvent(events, 'hit-steel');
  assert.deepEqual(hit, { type: 'hit-steel', lemmingId: 0, x: 102, y: 103 });
  assert.equal(live(session, 0).state, 'walking');
  assert.equal(live(session, 0).dir, 1, 'digger never turns');
  assert.equal(session.terrain.isSolid(102, 103), true, 'steel intact');
  assert.equal(session.terrain.isSolid(98, 103), true, 'the rest of the row is untouched too (aborted, not partial)');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Generic: workers lose ground (core-rules §S)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('basher/miner/digger: losing the ground under the foot makes them fall immediately', () => {
  for (const skill of ['basher', 'miner', 'digger'] as const) {
    const session = sessionWithWalker({ skills: { [skill]: 1 } });
    session.applyNow({ type: 'assign-skill', lemmingId: 0, skill });
    const { x, y } = live(session, 0);
    session.terrain.set(x, y, Material.Empty, 0);
    stepN(session, 1);
    assert.equal(live(session, 0).state, 'falling', `${skill} should fall once unsupported`);
    assert.equal(live(session, 0).fallDistance, FALL_COUNTER_STEP);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Rejections (core-rules §R) - order: level ended -> no-lemming -> none-left -> the skill rule
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('rejection: none-left', () => {
  const session = sessionWithWalker({ skills: { basher: 0 } });
  assert.deepEqual(session.checkAssign(0, 'basher'), { reason: 'none-left' });
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  assert.deepEqual(event, { type: 'skill-rejected', lemmingId: 0, skill: 'basher', reason: 'none-left' });
  assert.equal(session.skills.basher, 0);
});

test('rejection: busy-dying for every UNASSIGNABLE_STATES member', () => {
  for (const state of UNASSIGNABLE_STATES) {
    const session = sessionWithWalker({ skills: { basher: 1 } });
    live(session, 0).state = state as LemmingState;
    assert.deepEqual(session.checkAssign(0, 'basher'), { reason: 'not-applicable', detail: 'busy-dying' }, `state ${state}`);
    session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
    assert.equal(session.skills.basher, 1, `skill must not be consumed for state ${state}`);
  }
});

test('rejection: airborne for basher/miner/digger, for every AIRBORNE_STATES member', () => {
  for (const skill of ['basher', 'miner', 'digger'] as const) {
    for (const state of AIRBORNE_STATES) {
      const session = sessionWithWalker({ skills: { [skill]: 1 } });
      live(session, 0).state = state as LemmingState;
      assert.deepEqual(session.checkAssign(0, skill), { reason: 'not-applicable', detail: 'airborne' }, `${skill} while ${state}`);
    }
  }
});

test('rejection: is-blocker for basher/miner/digger', () => {
  for (const skill of ['basher', 'miner', 'digger'] as const) {
    const session = sessionWithWalker({ skills: { [skill]: 1 } });
    live(session, 0).state = 'blocking';
    assert.deepEqual(session.checkAssign(0, skill), { reason: 'not-applicable', detail: 'is-blocker' });
  }
});

test('rejection: same-job (basher on basher, miner on miner, digger on digger)', () => {
  const jobs: readonly [SkillId, LemmingState][] = [
    ['basher', 'bashing'],
    ['miner', 'mining'],
    ['digger', 'digging'],
  ];
  for (const [skill, state] of jobs) {
    const session = sessionWithWalker({ skills: { [skill]: 1 } });
    live(session, 0).state = state;
    assert.deepEqual(session.checkAssign(0, skill), { reason: 'not-applicable', detail: 'same-job' });
  }
});

test('rejection: basher steel/ahead and one-way/ahead (first stroke test region)', () => {
  const steelSession = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: 42, y: 145, w: 1, h: 1, material: Material.Steel }],
  });
  assert.deepEqual(steelSession.checkAssign(0, 'basher'), { reason: 'steel', detail: 'ahead' });
  const [ev1] = steelSession.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  assert.deepEqual(ev1, { type: 'skill-rejected', lemmingId: 0, skill: 'basher', reason: 'steel', detail: 'ahead' });
  assert.equal(steelSession.skills.basher, 1);

  const owSession = sessionWithWalker({
    skills: { basher: 1 },
    boxes: [{ x: 40, y: 140, w: 8, h: 10, material: Material.OneWayLeft }], // blocks dir=+1
  });
  assert.deepEqual(owSession.checkAssign(0, 'basher'), { reason: 'one-way', detail: 'ahead' });
});

test('rejection: miner steel/ahead, steel/below, one-way/ahead', () => {
  const ahead = sessionWithWalker({
    skills: { miner: 1 },
    boxes: [{ x: 40, y: FLOOR - 5, w: 1, h: 1, material: Material.Steel }], // t=0, well above the foot row
  });
  assert.deepEqual(ahead.checkAssign(0, 'miner'), { reason: 'steel', detail: 'ahead' });

  const below = sessionWithWalker({
    skills: { miner: 1 },
    boxes: [{ x: 40, y: FLOOR + 1, w: 1, h: 1, material: Material.Steel }], // (x, y+1)
  });
  assert.deepEqual(below.checkAssign(0, 'miner'), { reason: 'steel', detail: 'below' });

  const oneWay = sessionWithWalker({
    skills: { miner: 1 },
    boxes: [{ x: 40, y: FLOOR - 5, w: 1, h: 1, material: Material.OneWayLeft }],
  });
  assert.deepEqual(oneWay.checkAssign(0, 'miner'), { reason: 'one-way', detail: 'ahead' });
});

test('rejection: digger steel/below', () => {
  const session = sessionWithWalker({
    skills: { digger: 1 },
    boxes: [{ x: 42, y: FLOOR, w: 1, h: 1, material: Material.Steel }],
  });
  assert.deepEqual(session.checkAssign(0, 'digger'), { reason: 'steel', detail: 'below' });
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  assert.deepEqual(event, { type: 'skill-rejected', lemmingId: 0, skill: 'digger', reason: 'steel', detail: 'below' });
  assert.equal(session.skills.digger, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Job switching (RESEARCH §2.5): a different job is never "same-job"
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('workers switch jobs: basher -> miner -> digger -> basher', () => {
  const session = sessionWithWalker({ skills: { basher: 2, miner: 1, digger: 1 } });
  const chain: readonly [SkillId, LemmingState][] = [
    ['basher', 'bashing'],
    ['miner', 'mining'],
    ['digger', 'digging'],
    ['basher', 'bashing'],
  ];
  for (const [skill, state] of chain) {
    const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill });
    assert.deepEqual(event, { type: 'skill-assigned', lemmingId: 0, skill });
    assert.equal(live(session, 0).state, state);
  }
  assert.equal(session.skills.basher, 0);
  assert.equal(session.skills.miner, 0);
  assert.equal(session.skills.digger, 0);
});

test('workers switch jobs: builder -> basher', () => {
  const session = sessionWithWalker({ skills: { builder: 1, basher: 1 } });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  assert.equal(live(session, 0).state, 'building');
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'basher' });
  assert.deepEqual(event, { type: 'skill-assigned', lemmingId: 0, skill: 'basher' });
  assert.equal(live(session, 0).state, 'bashing');
});
