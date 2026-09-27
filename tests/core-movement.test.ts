/**
 * Independent validation of MOVEMENT (workstream A, task A2-V) against the SPEC — never against
 * walk.ts / fall.ts / climb.ts / terminal.ts. Every expected number below is derived from:
 *   - docs/development/core-rules.md §M (resolved movement rules), the climber/floater rows of §R
 *   - docs/research/RESEARCH.md §2.3, docs/research/notes-mechanics.md §B4–§B7
 *   - docs/design/DESIGN.md §3.4 ("Mechanics hook" column) and §1.1 (both edges are walls)
 *   - docs/design/LEVELS.md "Notes for architecture/dev" #8 (climber overhang check)
 *   - src/core/constants.ts (FROZEN) and the documented semantics in src/core/behaviours/movement.ts
 *
 * Also replaces (with real, spec-derived tests) these test.todo entries from
 * tests/behaviours.todo.test.ts: "walker steps up ≤ MAX_STEP_UP…", "walk-off drop of 63 px is
 * safe, 64 px splats…", "climber climbs walls and hoists over the top; turns and falls at
 * ceilings", "floater survives any fall".
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { HEAD_DY } from '../src/core/behaviours/movement.ts';
import {
  BURN_TICKS,
  CLIMB_CYCLE_TICKS,
  CLIMB_FALLBACK,
  CLIMB_STEP,
  DROWN_TICKS,
  EXIT_TICKS,
  FALL_COUNTER_STEP,
  FALL_SPEED,
  FIRST_SPAWN_TICK,
  FLOATER_OPENING_DY,
  FLOATER_OPEN_FALL,
  FLOAT_SPEED,
  HEAD_CLAMP_Y,
  HOIST_TICKS,
  JUMP_SPEED,
  MAX_SAFE_FALL,
  MAX_STEP_DOWN,
  SPLAT_TICKS,
  WALK_OFF_DROP,
  WALL_HEIGHT,
} from '../src/core/constants.ts';
import { GameSession } from '../src/core/session.ts';
import { Material } from '../src/core/terrain.ts';
import type { Lemming } from '../src/core/types.ts';
import { FLOOR, live, makeLevel, sessionWithWalker, stepN, stepUntil, type Box } from './core-fixtures.ts';

/** Reposition mumble 0 and set its state directly (fixtures: "live() ... reposition or set flags"). */
function place(
  session: GameSession,
  opts: {
    x: number;
    y: number;
    dir?: 1 | -1;
    state?: Lemming['state'];
    stateTicks?: number;
    isClimber?: boolean;
    isFloater?: boolean;
    fallDistance?: number;
  },
): Lemming {
  const lem = live(session, 0);
  lem.x = opts.x;
  lem.y = opts.y;
  lem.dir = opts.dir ?? 1;
  lem.state = opts.state ?? 'walking';
  lem.stateTicks = opts.stateTicks ?? 0;
  lem.isClimber = opts.isClimber ?? false;
  lem.isFloater = opts.isFloater ?? false;
  lem.fallDistance = opts.fallDistance ?? 0;
  return lem;
}

/** A `WALL_HEIGHT`-column-wide obstacle: `height` solid rows sitting directly on the floor at `x`. */
function wallBox(x: number, height: number, width = 1): Box {
  return { x, y: FLOOR - height, w: width, h: height };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Walker (§M "Walking")
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('walker moves 1 px/tick on flat ground, dir +1', () => {
  const session = sessionWithWalker();
  place(session, { x: 100, y: FLOOR, dir: 1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 101);
  assert.equal(lem.y, FLOOR);
  assert.equal(lem.state, 'walking');
});

test('symmetry: walker moves 1 px/tick on flat ground, dir -1 (mirrors dir +1)', () => {
  const session = sessionWithWalker();
  place(session, { x: 100, y: FLOOR, dir: -1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 99);
  assert.equal(lem.y, FLOOR);
  assert.equal(lem.state, 'walking');
});

test('walker steps up 1 px in the same tick (solidRunAbove = 1)', () => {
  const session = sessionWithWalker({ boxes: [{ x: 200, y: FLOOR - 1, w: 5, h: 1 }] });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR - 1);
  assert.equal(lem.state, 'walking');
});

test('walker steps up 2 px (MAX_STEP_UP) in the same tick', () => {
  const session = sessionWithWalker({ boxes: [{ x: 200, y: FLOOR - 2, w: 5, h: 2 }] });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR - 2);
  assert.equal(lem.state, 'walking');
});

test('symmetry: walker steps up 1 and 2 px the same way with dir -1', () => {
  for (const r of [1, 2]) {
    const session = sessionWithWalker({ boxes: [{ x: 200, y: FLOOR - r, w: 5, h: r }] });
    place(session, { x: 201, y: FLOOR, dir: -1 });
    stepN(session, 1);
    const lem = live(session, 0);
    assert.equal(lem.x, 200, `r=${r}`);
    assert.equal(lem.y, FLOOR - r, `r=${r}`);
    assert.equal(lem.state, 'walking', `r=${r}`);
    assert.equal(lem.dir, -1, `r=${r}`);
  }
});

// §M Jumping: "each tick rise while isSolid(x, y-1), at most JUMP_SPEED px; then if (x, y-1) is
// empty -> walking." Combined with the walking rule's immediate `y -= JUMP_SPEED` on the ledge
// tick, this yields exactly the notes-mechanics table: 3-4 px -> 1 jumping tick; 5-6 px -> 2 ticks.
const JUMP_CASES: { r: number; ticks: { y: number; state: 'jumping' | 'walking' }[] }[] = [
  { r: 3, ticks: [{ y: FLOOR - JUMP_SPEED, state: 'jumping' }, { y: FLOOR - 3, state: 'walking' }] },
  { r: 4, ticks: [{ y: FLOOR - JUMP_SPEED, state: 'jumping' }, { y: FLOOR - 4, state: 'walking' }] },
  {
    r: 5,
    ticks: [
      { y: FLOOR - JUMP_SPEED, state: 'jumping' },
      { y: FLOOR - 4, state: 'jumping' },
      { y: FLOOR - 5, state: 'walking' },
    ],
  },
  {
    r: 6,
    ticks: [
      { y: FLOOR - JUMP_SPEED, state: 'jumping' },
      { y: FLOOR - 4, state: 'jumping' },
      { y: FLOOR - 6, state: 'walking' },
    ],
  },
];

for (const { r, ticks } of JUMP_CASES) {
  test(`walker jumps a ${r} px ledge: rises ${JUMP_SPEED} px/tick, ${ticks.length - 1} jumping tick(s), then walking`, () => {
    const session = sessionWithWalker({ boxes: [wallBox(200, r, 5)] });
    place(session, { x: 199, y: FLOOR, dir: 1 });
    for (const [i, expected] of ticks.entries()) {
      stepN(session, 1);
      const lem = live(session, 0);
      assert.equal(lem.x, 200, `tick ${i + 1}, r=${r}`);
      assert.equal(lem.y, expected.y, `tick ${i + 1}, r=${r}`);
      assert.equal(lem.state, expected.state, `tick ${i + 1}, r=${r}`);
    }
  });
}

for (const h of [WALL_HEIGHT, 10, 50]) {
  test(`walker turns at a ${h} px wall (>= WALL_HEIGHT): x unchanged, dir flips`, () => {
    const session = sessionWithWalker({ boxes: [wallBox(200, h, 5)] });
    place(session, { x: 199, y: FLOOR, dir: 1 });
    stepN(session, 1);
    const lem = live(session, 0);
    assert.equal(lem.x, 199, `h=${h}`); // "no 1-px step into the wall"
    assert.equal(lem.y, FLOOR, `h=${h}`);
    assert.equal(lem.dir, -1, `h=${h}`);
    assert.equal(lem.state, 'walking', `h=${h}`);
  });
}

test('symmetry: walker turns at a 7 px wall the same way with dir -1', () => {
  const session = sessionWithWalker({ boxes: [wallBox(200, WALL_HEIGHT, 5)] });
  place(session, { x: 201, y: FLOOR, dir: -1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 201);
  assert.equal(lem.dir, 1);
  assert.equal(lem.state, 'walking');
});

test('both level edges are walls: left edge (x=0) turns the mumble without leaving the level', () => {
  const session = sessionWithWalker();
  place(session, { x: 0, y: FLOOR, dir: -1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 0);
  assert.equal(lem.dir, 1);
  assert.equal(lem.state, 'walking');
});

test('both level edges are walls: right edge (x=width-1) turns the mumble without leaving the level', () => {
  const session = sessionWithWalker();
  const width = session.level.width;
  place(session, { x: width - 1, y: FLOOR, dir: 1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, width - 1);
  assert.equal(lem.dir, -1);
  assert.equal(lem.state, 'walking');
});

for (const d of [1, 2, MAX_STEP_DOWN]) {
  test(`walker steps down ${d} px (gapBelow = ${d})`, () => {
    const session = sessionWithWalker({
      boxes: [{ x: 200, y: FLOOR, w: 20, h: d, material: Material.Empty }],
    });
    place(session, { x: 199, y: FLOOR, dir: 1 });
    stepN(session, 1);
    const lem = live(session, 0);
    assert.equal(lem.x, 200, `d=${d}`);
    assert.equal(lem.y, FLOOR + d, `d=${d}`);
    assert.equal(lem.state, 'walking', `d=${d}`);
  });
}

test('symmetry: walker steps down 2 px the same way with dir -1', () => {
  const session = sessionWithWalker({ boxes: [{ x: 200, y: FLOOR, w: 20, h: 2, material: Material.Empty }] });
  place(session, { x: 201, y: FLOOR, dir: -1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR + 2);
  assert.equal(lem.dir, -1);
  assert.equal(lem.state, 'walking');
});

test('walker steps off a 4+ px drop: y += WALK_OFF_DROP and becomes falling', () => {
  const session = sessionWithWalker({
    boxes: [{ x: 200, y: FLOOR, w: 20, h: 10, material: Material.Empty }], // no floor within MAX_STEP_DOWN
  });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR + WALK_OFF_DROP);
  assert.equal(lem.state, 'falling');
  assert.equal(lem.fallDistance, FALL_COUNTER_STEP);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Falling (§M "Falling", RESEARCH §2.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('faller moves at most FALL_SPEED (3) px/tick and grows the fall counter by FALL_COUNTER_STEP', () => {
  const session = sessionWithWalker();
  place(session, { x: 100, y: 10, state: 'falling', fallDistance: FALL_COUNTER_STEP });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.y, 10 + FALL_SPEED);
  assert.equal(lem.state, 'falling');
  assert.equal(lem.fallDistance, FALL_COUNTER_STEP + FALL_COUNTER_STEP);
});

test('walk-off drop of 63 px is safe: lands walking exactly on the lower floor', () => {
  const session = sessionWithWalker(
    {
      floor: false,
      height: 200,
      entrances: [{ x: 10, y: 50 }],
      boxes: [{ x: 0, y: 50, w: 60, h: 10 }, { x: 60, y: 50 + 63, w: 300, h: 10 }],
    },
    {},
  );
  place(session, { x: 59, y: 50, dir: 1 });
  stepN(session, 1); // the walk-off tick
  let lem = live(session, 0);
  assert.equal(lem.x, 60);
  assert.equal(lem.y, 50 + WALK_OFF_DROP);
  assert.equal(lem.state, 'falling');
  const events = stepUntil(session, () => live(session, 0).state !== 'falling', 100);
  lem = live(session, 0);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.y, 50 + 63);
  assert.equal(lem.x, 60);
  assert.ok(lem.fallDistance <= MAX_SAFE_FALL, `fallDistance ${lem.fallDistance} should be <= MAX_SAFE_FALL`);
  assert.equal(
    events.some((e) => e.event.type === 'lemming-died'),
    false,
  );
});

test('walk-off drop of 64 px splats: lemming-died fires on the impact tick, removed SPLAT_TICKS later, counted once', () => {
  const session = sessionWithWalker(
    {
      floor: false,
      height: 200,
      entrances: [{ x: 10, y: 50 }],
      boxes: [{ x: 0, y: 50, w: 60, h: 10 }, { x: 60, y: 50 + 64, w: 300, h: 10 }],
    },
    {},
  );
  place(session, { x: 59, y: 50, dir: 1 });
  stepN(session, 1); // the walk-off tick
  const landingEvents = stepUntil(session, () => live(session, 0).state !== 'falling', 100);
  const lem = live(session, 0);
  assert.equal(lem.state, 'splatting');
  assert.equal(lem.y, 50 + 64);
  assert.ok(lem.fallDistance > MAX_SAFE_FALL, `fallDistance ${lem.fallDistance} should be > MAX_SAFE_FALL`);
  const deaths = landingEvents.filter((e) => e.event.type === 'lemming-died');
  assert.equal(deaths.length, 1);
  assert.deepEqual(deaths[0]!.event, { type: 'lemming-died', lemmingId: 0, cause: 'splat' });
  assert.equal(session.counts.dead, 1);

  const removalEvents = stepN(session, SPLAT_TICKS);
  assert.equal(session.lemmingById(0), undefined);
  assert.equal(
    removalEvents.some((e) => e.event.type === 'lemming-died'),
    false,
  );
  assert.equal(session.counts.dead, 1);
});

test('from the spawn point, a 59 px fall is safe (fall counter starts at 3, no WALK_OFF_DROP head start)', () => {
  const session = new GameSession(
    makeLevel({ height: 250, floor: false, boxes: [{ x: 0, y: 200, w: 400, h: 10 }], entrances: [{ x: 40, y: 200 - 59 }] }),
  );
  stepUntil(session, () => {
    const l = session.lemmingById(0);
    return !!l && (l.state === 'walking' || l.state === 'splatting');
  }, FIRST_SPAWN_TICK + 150);
  const lem = live(session, 0);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.y, 200);
  assert.equal(lem.x, 40);
});

test('from the spawn point, a 60 px fall splats', () => {
  const session = new GameSession(
    makeLevel({ height: 250, floor: false, boxes: [{ x: 0, y: 200, w: 400, h: 10 }], entrances: [{ x: 40, y: 200 - 60 }] }),
  );
  const events = stepUntil(session, () => {
    const l = session.lemmingById(0);
    return !!l && (l.state === 'walking' || l.state === 'splatting');
  }, FIRST_SPAWN_TICK + 150);
  const lem = live(session, 0);
  assert.equal(lem.state, 'splatting');
  assert.equal(lem.y, 200);
  assert.equal(
    events.some((e) => e.event.type === 'lemming-died' && e.event.cause === 'splat'),
    true,
  );
  assert.equal(session.counts.dead, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Floater (§M "Falling" / "Floating", RESEARCH §2.3)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('floater: umbrella opens the tick fallDistance first exceeds FLOATER_OPEN_FALL (19 px into a walk-off fall)', () => {
  const session = sessionWithWalker(
    { floor: false, height: 300, entrances: [{ x: 10, y: 50 }], boxes: [{ x: 0, y: 50, w: 60, h: 10 }] },
    {},
  );
  place(session, { x: 59, y: 50, dir: 1, isFloater: true });
  // 1 walk-off tick (+4, fallDistance=3) + 5 full falling ticks (+3 each, fallDistance 6,9,12,15,18)
  // + the 6th falling tick, where fallDistance(18) > FLOATER_OPEN_FALL(16) opens the umbrella with
  // no movement that tick. Total physical drop at that point: 4 + 5*FALL_SPEED = 19 px.
  assert.ok(FALL_COUNTER_STEP + 4 * FALL_COUNTER_STEP <= FLOATER_OPEN_FALL, 'must not open after only 4 full ticks');
  assert.ok(FALL_COUNTER_STEP + 5 * FALL_COUNTER_STEP > FLOATER_OPEN_FALL, 'must open after 5 full ticks');
  stepN(session, 1 + 6);
  const lem = live(session, 0);
  assert.equal(lem.state, 'floating');
  assert.equal(lem.y, 50 + WALK_OFF_DROP + 5 * FALL_SPEED);
  assert.equal(lem.y, 50 + 19);
  assert.equal(lem.x, 60);
  assert.equal(lem.stateTicks, 0);
});

test('floater: per-tick dy is 3,3,3,3,-1,0,1,1 then a constant FLOAT_SPEED (2) px/tick', () => {
  assert.deepEqual(FLOATER_OPENING_DY, [3, 3, 3, 3, -1, 0, 1, 1]); // constants.ts, cited by §M
  const session = sessionWithWalker();
  place(session, { x: 100, y: 10, state: 'floating', isFloater: true });
  const deltas = [...FLOATER_OPENING_DY, FLOAT_SPEED, FLOAT_SPEED, FLOAT_SPEED];
  let expectedY = 10;
  for (const [i, dy] of deltas.entries()) {
    stepN(session, 1);
    expectedY += dy;
    const lem = live(session, 0);
    assert.equal(lem.y, expectedY, `tick ${i + 1}`);
    assert.equal(lem.state, 'floating', `tick ${i + 1}`);
  }
});

test('floater (and athlete: climber+floater) survives a 140 px fall and lands walking, never splatting', () => {
  const session = sessionWithWalker(
    {
      floor: false,
      height: 250,
      entrances: [{ x: 10, y: 50 }],
      boxes: [{ x: 0, y: 50, w: 60, h: 10 }, { x: 60, y: 50 + 140, w: 300, h: 10 }],
    },
    {},
  );
  place(session, { x: 59, y: 50, dir: 1, isFloater: true, isClimber: true }); // athlete
  stepN(session, 1); // walk-off
  stepUntil(session, () => {
    const s = live(session, 0).state;
    return s !== 'falling' && s !== 'floating';
  }, 300);
  const lem = live(session, 0);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.y, 50 + 140);
  assert.equal(lem.x, 60);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Climber (§M "Climbing" / "Hoisting", LEVELS.md note 8)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('climber starts climbing at the wall\'s face column (dir +1), y and dir unchanged that tick', () => {
  const session = sessionWithWalker({ boxes: [wallBox(200, 20)] });
  place(session, { x: 199, y: FLOOR, dir: 1, isClimber: true });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200); // the wall's face column, not reverted
  assert.equal(lem.y, FLOOR);
  assert.equal(lem.dir, 1);
  assert.equal(lem.state, 'climbing');
  assert.equal(lem.stateTicks, 0);
});

test('symmetry: climber starts climbing at the wall\'s face column, dir -1', () => {
  const session = sessionWithWalker({ boxes: [wallBox(200, 20)] });
  place(session, { x: 201, y: FLOOR, dir: -1, isClimber: true });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR);
  assert.equal(lem.dir, -1);
  assert.equal(lem.state, 'climbing');
});

test(`climber rises CLIMB_STEP (${CLIMB_STEP}) px every CLIMB_CYCLE_TICKS (${CLIMB_CYCLE_TICKS}) ticks on a tall wall`, () => {
  const session = sessionWithWalker({ boxes: [wallBox(200, 100)] }); // far from any real top
  place(session, { x: 200, y: FLOOR, dir: 1, state: 'climbing', isClimber: true });
  stepN(session, CLIMB_CYCLE_TICKS);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR - CLIMB_STEP);
  assert.equal(lem.state, 'climbing');
  stepN(session, CLIMB_CYCLE_TICKS);
  assert.equal(live(session, 0).y, FLOOR - 2 * CLIMB_STEP); // a 2nd cycle rises another 4 px
});

test(`hoisting: y -= 2 on ticks 1-4, unchanged on ticks 5-7, then walking at HOIST_TICKS (${HOIST_TICKS}) with no further move`, () => {
  const session = sessionWithWalker();
  place(session, { x: 100, y: 100, dir: 1, state: 'hoisting', isClimber: true });
  const startY = 100;
  for (let tick = 1; tick <= 4; tick++) {
    stepN(session, 1);
    const lem = live(session, 0);
    assert.equal(lem.y, startY - 2 * tick, `hoist tick ${tick}`);
    assert.equal(lem.state, 'hoisting', `hoist tick ${tick}`);
  }
  for (let tick = 5; tick <= 7; tick++) {
    stepN(session, 1);
    const lem = live(session, 0);
    assert.equal(lem.y, startY - 8, `hoist tick ${tick}`);
    assert.equal(lem.state, 'hoisting', `hoist tick ${tick}`);
  }
  stepN(session, 1); // tick 8 = HOIST_TICKS
  const lem = live(session, 0);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.y, startY - 8);
  assert.equal(lem.x, 100);
  assert.equal(lem.dir, 1);
});

for (const H of [WALL_HEIGHT, 12, 25]) {
  for (const dir of [1, -1] as const) {
    test(`climber climbs and hoists to stand exactly on top of a ${H} px wall (dir ${dir})`, () => {
      const session = sessionWithWalker({ boxes: [wallBox(200, H)] });
      place(session, { x: dir === 1 ? 199 : 201, y: FLOOR, dir, isClimber: true });
      stepN(session, 1); // enters climbing
      assert.equal(live(session, 0).state, 'climbing');
      stepUntil(session, () => live(session, 0).state === 'walking', 400);
      const lem = live(session, 0);
      assert.equal(lem.x, 200, `H=${H} dir=${dir}`);
      assert.equal(lem.y, FLOOR - H, `H=${H} dir=${dir}`); // standing on the wall's top pixel
      assert.equal(lem.dir, dir, `H=${H} dir=${dir}`);
    });
  }
}

test('athlete (climber+floater): climbing still works with isFloater also true', () => {
  const session = sessionWithWalker({ boxes: [wallBox(200, WALL_HEIGHT)] });
  place(session, { x: 199, y: FLOOR, dir: 1, isClimber: true, isFloater: true });
  stepN(session, 1);
  stepUntil(session, () => live(session, 0).state === 'walking', 200);
  const lem = live(session, 0);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR - WALL_HEIGHT);
  assert.equal(lem.dir, 1);
});

test('climbing overhang exactly at (x-dir, y-8): turns around, ends CLIMB_FALLBACK px away, falls and survives a short drop', () => {
  const session = sessionWithWalker({
    boxes: [
      wallBox(200, 100), // tall wall being climbed (column 200)
      { x: 199, y: FLOOR - 8, w: 1, h: 1 }, // overhang at exactly (x-dir, y-8) for x=200,dir=1,y=FLOOR
      { x: 197, y: FLOOR, w: 3, h: 5, material: Material.Empty }, // a small 5 px pit to land the bounce in
    ],
  });
  place(session, { x: 199, y: FLOOR, dir: 1, isClimber: true });
  stepN(session, 1); // walking -> climbing at (200, FLOOR)
  assert.equal(live(session, 0).state, 'climbing');
  stepN(session, 1); // first climbing tick: ceiling check fires immediately
  let lem = live(session, 0);
  assert.equal(lem.state, 'falling');
  assert.equal(lem.dir, -1);
  assert.equal(lem.x, 200 - CLIMB_FALLBACK);
  assert.equal(lem.y, FLOOR);
  assert.equal(lem.fallDistance, FALL_COUNTER_STEP);
  stepUntil(session, () => live(session, 0).state !== 'falling', 50);
  lem = live(session, 0);
  assert.equal(lem.state, 'walking'); // survives the short 5 px drop
  assert.equal(lem.y, FLOOR + 5);
  assert.equal(lem.x, 200 - CLIMB_FALLBACK);
});

test('an overhang that is NOT at (x-dir, y-8) does not trigger early: climbing continues normally', () => {
  const session = sessionWithWalker({
    boxes: [
      wallBox(200, 100),
      { x: 201, y: FLOOR - 8, w: 1, h: 1 }, // wrong side: (x+dir, y-8), not (x-dir, y-8)
    ],
  });
  place(session, { x: 199, y: FLOOR, dir: 1, isClimber: true });
  stepN(session, 1); // -> climbing
  stepN(session, 2 * CLIMB_CYCLE_TICKS); // 16 ticks: 2 full climb cycles, no legitimate top either
  const lem = live(session, 0);
  assert.equal(lem.state, 'climbing'); // never bounced
  assert.equal(lem.dir, 1);
  assert.equal(lem.x, 200);
  assert.equal(lem.y, FLOOR - 2 * CLIMB_STEP);
});

test('climbing is clamped at the level top (headAboveTop): turns and falls even without a physical overhang', () => {
  // §M: "every tick first the overhang/ceiling check: (x-dir, y-8) solid, OR headAboveTop(y) ->
  // turn...". Place the climber directly at y=4 (headAboveTop(4) = 4-10 = -6 < HEAD_CLAMP_Y(-5),
  // true) with nothing solid at (x-dir, y-8) or (x-dir, y-8) out of the array either way, so the
  // ceiling check's headAboveTop half is the only possible trigger, isolated from the phase 0-3
  // "top check" (which reads a different pixel and only runs once the ceiling check has passed).
  assert.ok(4 - HEAD_DY < HEAD_CLAMP_Y, 'sanity: headAboveTop(4) must be true per constants.ts');
  assert.ok(!(5 - HEAD_DY < HEAD_CLAMP_Y), 'sanity: headAboveTop(5) must be false per constants.ts');
  const session = sessionWithWalker();
  place(session, { x: 100, y: 4, dir: 1, state: 'climbing', isClimber: true });
  stepN(session, 1);
  const lem = live(session, 0);
  assert.equal(lem.state, 'falling');
  assert.equal(lem.dir, -1);
  assert.equal(lem.x, 100 - CLIMB_FALLBACK);
  assert.equal(lem.y, 4);
  assert.equal(lem.fallDistance, FALL_COUNTER_STEP);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Terminal timing (§M "Terminal", §F "Deaths and saves")
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('drowning drifts 1 px/tick and is removed at DROWN_TICKS, counted dead exactly once', () => {
  const session = sessionWithWalker({
    hazards: [{ kind: 'water', area: { x: 198, y: 148, w: 5, h: 5 }, cooldownTicks: 0 }],
  });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  const enter = stepN(session, 1); // walks onto (200, FLOOR) -> triggers water
  let lem = live(session, 0);
  assert.equal(lem.state, 'drowning');
  assert.deepEqual(
    enter.map((e) => e.event).filter((e) => e.type === 'lemming-died'),
    [{ type: 'lemming-died', lemmingId: 0, cause: 'drown' }],
  );
  assert.equal(session.counts.dead, 1);

  stepN(session, 3); // 3 drowning-handler ticks: drifts +1 px/tick (open water, dir +1)
  lem = live(session, 0);
  assert.equal(lem.x, 203);
  assert.equal(lem.state, 'drowning');

  const rest = stepN(session, DROWN_TICKS - 3);
  assert.equal(session.lemmingById(0), undefined);
  assert.equal(
    rest.some((e) => e.event.type === 'lemming-died'),
    false,
  );
  assert.equal(session.counts.dead, 1);
});

test('burning is removed at BURN_TICKS, counted dead exactly once', () => {
  const session = sessionWithWalker({
    hazards: [{ kind: 'fire', area: { x: 198, y: 148, w: 5, h: 5 }, cooldownTicks: 0 }],
  });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  const enter = stepN(session, 1);
  assert.equal(live(session, 0).state, 'burning');
  assert.deepEqual(
    enter.map((e) => e.event).filter((e) => e.type === 'lemming-died'),
    [{ type: 'lemming-died', lemmingId: 0, cause: 'burn' }],
  );
  assert.equal(session.counts.dead, 1);

  const rest = stepN(session, BURN_TICKS);
  assert.equal(session.lemmingById(0), undefined);
  assert.equal(
    rest.some((e) => e.event.type === 'lemming-died'),
    false,
  );
  assert.equal(session.counts.dead, 1);
});

test('exiting is saved at EXIT_TICKS', () => {
  const session = sessionWithWalker({ exits: [{ x: 200, y: FLOOR }] });
  place(session, { x: 199, y: FLOOR, dir: 1 });
  stepN(session, 1); // walks onto the exit anchor -> triggers exit
  const lem = live(session, 0);
  assert.equal(lem.state, 'exiting');
  assert.equal(lem.stateTicks, 0);

  const rest = stepN(session, EXIT_TICKS);
  assert.deepEqual(
    rest.map((e) => e.event).filter((e) => e.type === 'lemming-exited'),
    [{ type: 'lemming-exited', lemmingId: 0 }],
  );
  assert.equal(session.lemmingById(0), undefined);
  assert.equal(session.counts.saved, 1);
  assert.equal(session.counts.dead, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Rejections (§R): climber / floater
// ═══════════════════════════════════════════════════════════════════════════════════════════

function rejectionSession(): GameSession {
  return sessionWithWalker({ skills: { climber: 5, floater: 5 } });
}

test('climber is rejected: already-climber, is-blocker, busy-dying; accepted while falling/floating/climbing', () => {
  const session = rejectionSession();
  const lem = live(session, 0);

  lem.isClimber = true;
  assert.deepEqual(session.checkAssign(0, 'climber'), { reason: 'not-applicable', detail: 'already-climber' });

  lem.isClimber = false;
  lem.state = 'blocking';
  assert.deepEqual(session.checkAssign(0, 'climber'), { reason: 'not-applicable', detail: 'is-blocker' });

  lem.state = 'splatting'; // UNASSIGNABLE_STATES
  assert.deepEqual(session.checkAssign(0, 'climber'), { reason: 'not-applicable', detail: 'busy-dying' });

  for (const state of ['falling', 'floating', 'climbing'] as const) {
    lem.state = state;
    assert.equal(session.checkAssign(0, 'climber'), null, `state=${state}`);
  }
});

test('floater is rejected: already-floater, is-blocker, busy-dying; accepted while falling/floating/climbing', () => {
  const session = rejectionSession();
  const lem = live(session, 0);

  lem.isFloater = true;
  assert.deepEqual(session.checkAssign(0, 'floater'), { reason: 'not-applicable', detail: 'already-floater' });

  lem.isFloater = false;
  lem.state = 'blocking';
  assert.deepEqual(session.checkAssign(0, 'floater'), { reason: 'not-applicable', detail: 'is-blocker' });

  lem.state = 'drowning'; // UNASSIGNABLE_STATES
  assert.deepEqual(session.checkAssign(0, 'floater'), { reason: 'not-applicable', detail: 'busy-dying' });

  for (const state of ['falling', 'floating', 'climbing'] as const) {
    lem.state = state;
    assert.equal(session.checkAssign(0, 'floater'), null, `state=${state}`);
  }
});
