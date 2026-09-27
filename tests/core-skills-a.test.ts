/**
 * Independent SPEC validation of block.ts / bomb.ts / build.ts (workstream A, task A3a).
 *
 * Every expected value is derived from:
 *   - docs/development/core-rules.md §S (Assign, Workers lose ground, Fuse, Oh-no, Exploding,
 *     Blocking, Builder), the blocker/bomber/builder rows of §R, and §F (tick order, kill
 *     timing, the session applying the blocker field).
 *   - docs/research/RESEARCH.md §2.4-2.5/§2.8, docs/research/notes-mechanics.md §C.
 *   - docs/design/DESIGN.md §3.4 (mechanics-hook rows for blocking/building/shrugging/ohno/
 *     exploding) and §6.5 (refusal reasons).
 *   - docs/design/LEVELS.md "Notes for architecture/dev" #7 (16 px floor / walkable bowl) and
 *     #9 (builder is symmetric: a left stair also starts at the foot and extends 27 px ahead).
 *   - src/core/constants.ts (frozen numbers only — never block.ts/bomb.ts/build.ts source).
 *
 * NOT derived from block.ts/bomb.ts/build.ts's own source — only exported signatures/doc
 * comments (session.ts, types.ts, terrain.ts, movement.ts, context.ts) were read to know how to
 * call things.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  FLOOR,
  live,
  makeLevel,
  sessionWithWalker,
  stepN,
  stepUntil,
} from './core-fixtures.ts';

import {
  BLOCKER_FIELD,
  BLOCKER_REACH,
  BOMB_FUSE_TICKS,
  BRICK_WIDTH,
  BUILDER_BRICK_PHASE,
  BUILDER_BRICK_TICKS,
  BUILDER_BRICKS,
  BUILDER_STEP_X,
  BUILDER_STEP_Y,
  BUILDER_WARN_BRICKS,
  BUILDER_WARN_PHASE,
  EXPLOSION_MASK,
  FALL_SPEED,
  OHNO_TICKS,
  SHRUG_TICKS,
} from '../src/core/constants.ts';
import { GameSession } from '../src/core/session.ts';
import { Material } from '../src/core/terrain.ts';
import type { GameEvent, Rejection, SkillId } from '../src/core/types.ts';

// ─── shared helpers ───────────────────────────────────────────────────────────────────────────

/** The exact elliptical crater formula from core-rules.md §S (independent of bomb.ts). */
function craterRemoved(dx: number, dy: number): boolean {
  const a = (2 * dx + 1) * 11;
  const b = (2 * (dy + 3) + 1) * 8;
  return a * a + b * b <= 176 * 176;
}

/** `(x, y)` is inside the EXPLOSION_MASK bounding box (core-rules §S / constants.ts). */
function inMaskBox(dx: number, dy: number): boolean {
  return dx >= EXPLOSION_MASK.dx && dx < EXPLOSION_MASK.dx + EXPLOSION_MASK.w && dy >= EXPLOSION_MASK.dy && dy < EXPLOSION_MASK.dy + EXPLOSION_MASK.h;
}

/** checkAssign + the skill-rejected event must agree, and the skill must never be consumed (§F). */
function assertRejected(session: GameSession, lemmingId: number, skill: SkillId, expected: Rejection): void {
  const before = session.skills[skill];
  const check = session.checkAssign(lemmingId, skill);
  assert.deepEqual(check, expected, `checkAssign(${lemmingId}, '${skill}')`);
  const events = session.applyNow({ type: 'assign-skill', lemmingId, skill });
  assert.equal(events.length, 1, 'exactly one skill-rejected event');
  const [event] = events as [GameEvent];
  assert.equal(event.type, 'skill-rejected');
  if (event.type === 'skill-rejected') {
    assert.equal(event.lemmingId, lemmingId);
    assert.equal(event.skill, skill);
    assert.equal(event.reason, expected.reason);
    assert.equal(event.detail, expected.detail);
  }
  assert.equal(session.skills[skill], before, 'a refusal must never consume the skill');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BUILDER (build.ts) — core-rules.md §S "Builder"
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('builder: brick appears exactly at stateTicks % 16 === 9, not before', () => {
  const session = sessionWithWalker({ skills: { builder: 1 } });
  const lem = live(session, 0);
  const x0 = lem.x;
  const y0 = lem.y;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  stepN(session, BUILDER_BRICK_PHASE - 1); // stateTicks = 8: nothing laid yet
  for (let t = 0; t < BRICK_WIDTH; t++) assert.equal(session.terrain.get(x0 + t, y0 - 1), Material.Empty);
  assert.equal(lem.bricksLeft, BUILDER_BRICKS);
  stepN(session, 1); // stateTicks = 9: laid now, row y0-1, columns x0..x0+BRICK_WIDTH-1
  for (let t = 0; t < BRICK_WIDTH; t++) {
    assert.equal(session.terrain.get(x0 + t, y0 - 1), Material.Earth);
    assert.equal(session.terrain.color[(y0 - 1) * session.terrain.width + (x0 + t)], 7); // level.brickColor (core-fixtures)
  }
  assert.equal(lem.bricksLeft, BUILDER_BRICKS - 1);
});

test('builder: phase 0 steps net +2 x / -1 y (two 1px moves)', () => {
  const session = sessionWithWalker({ skills: { builder: 1 } });
  const lem = live(session, 0);
  const x0 = lem.x;
  const y0 = lem.y;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  stepN(session, BUILDER_BRICK_TICKS); // one full cycle: brick at 9, step at 16
  assert.equal(lem.x, x0 + BUILDER_STEP_X);
  assert.equal(lem.y, y0 - BUILDER_STEP_Y);
  assert.equal(lem.state, 'building');
});

test('builder: bricks are only placed into empty pixels', () => {
  const session = sessionWithWalker({ boxes: [{ x: 43, y: FLOOR - 1, w: 1, h: 1 }], skills: { builder: 1 } });
  const x0 = live(session, 0).x; // 40
  const row = FLOOR - 1;
  assert.equal(session.terrain.get(43, row), Material.Earth); // pre-existing pixel, fixtures' default earth color 1
  assert.equal(session.terrain.color[row * session.terrain.width + 43], 1);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  stepN(session, BUILDER_BRICK_PHASE);
  // the pre-existing pixel is untouched (kept its original color)...
  assert.equal(session.terrain.get(43, row), Material.Earth);
  assert.equal(session.terrain.color[row * session.terrain.width + 43], 1);
  // ...while the rest of the same brick (previously empty) got the brick colour
  for (const x of [x0, x0 + 1, x0 + 2, x0 + 4, x0 + 5]) {
    assert.equal(session.terrain.get(x, row), Material.Earth);
    assert.equal(session.terrain.color[row * session.terrain.width + x], 7);
  }
});

test('builder: full stair — 12 bricks, low-bricks warnings, ends at (x0+24,y0-12) after 192 ticks, then shrugs', () => {
  const session = sessionWithWalker({ skills: { builder: 2 } });
  const lem = live(session, 0);
  const x0 = lem.x;
  const y0 = lem.y;
  assert.equal(x0, 40);
  assert.equal(y0, FLOOR);

  const [assignEvent] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  assert.deepEqual(assignEvent, { type: 'skill-assigned', lemmingId: 0, skill: 'builder' });
  assert.equal(lem.bricksLeft, BUILDER_BRICKS);
  assert.equal(lem.state, 'building');

  const t0 = session.tick;
  const totalTicks = BUILDER_BRICKS * BUILDER_BRICK_TICKS; // 192
  const events = stepN(session, totalTicks);

  // Brick k (1-indexed) is laid at stateTicks = 16*(k-1)+9, row y0-(k-1)-1, columns starting
  // at x0 + STEP_X*(k-1) (dir +1: right). Verify the exact pixel set for all 12 bricks.
  for (let k = 1; k <= BUILDER_BRICKS; k++) {
    const brickRow: number = y0 - (k - 1) - 1;
    const brickCol0: number = x0 + BUILDER_STEP_X * (k - 1);
    for (let t = 0; t < BRICK_WIDTH; t++) {
      assert.equal(session.terrain.get(brickCol0 + t, brickRow), Material.Earth, `brick ${k} col ${t}`);
      assert.equal(session.terrain.color[brickRow * session.terrain.width + (brickCol0 + t)], 7, `brick ${k} col ${t} colour`);
    }
  }

  // builder-low-bricks fires on phase 10 for the last BUILDER_WARN_BRICKS bricks, with the
  // bricksLeft values counting down to 0 (after bricks 10, 11, 12: 2, 1, 0).
  const lowBricks = events.filter((e) => e.event.type === 'builder-low-bricks');
  const expected = [];
  for (let k = BUILDER_BRICKS - BUILDER_WARN_BRICKS + 1; k <= BUILDER_BRICKS; k++) {
    const stateTicksAtWarn = BUILDER_BRICK_TICKS * (k - 1) + BUILDER_WARN_PHASE;
    expected.push({ tick: t0 + stateTicksAtWarn - 1, event: { type: 'builder-low-bricks', lemmingId: 0, bricksLeft: BUILDER_BRICKS - k } });
  }
  assert.deepEqual(lowBricks, expected);

  // builder-finished fires exactly once, on the last step (stateTicks 192).
  const finished = events.filter((e) => e.event.type === 'builder-finished');
  assert.deepEqual(finished, [{ tick: t0 + totalTicks - 1, event: { type: 'builder-finished', lemmingId: 0 } }]);

  assert.equal(session.tick, t0 + totalTicks);
  assert.equal(lem.state, 'shrugging');
  assert.equal(lem.stateTicks, 0); // setState resets the per-state timer (context.ts)
  assert.equal(lem.x, x0 + BUILDER_STEP_X * BUILDER_BRICKS); // x0 + 24
  assert.equal(lem.y, y0 - BUILDER_STEP_Y * BUILDER_BRICKS); // y0 - 12
  assert.equal(lem.bricksLeft, 0);

  // Shrugging lasts SHRUG_TICKS, then walking.
  stepN(session, SHRUG_TICKS - 1);
  assert.equal(lem.state, 'shrugging');
  stepN(session, 1);
  assert.equal(lem.state, 'walking');
});

test('builder: the left-facing stair is the exact mirror (x0-27..x0)', () => {
  const session = sessionWithWalker({ skills: { builder: 1 } });
  const lem = live(session, 0);
  lem.dir = -1; // face left before assigning (LEVELS.md note 9: symmetric, not a DOS asymmetry)
  const x0 = lem.x;
  const y0 = lem.y;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  stepN(session, BUILDER_BRICKS * BUILDER_BRICK_TICKS);

  assert.equal(lem.state, 'shrugging');
  assert.equal(lem.x, x0 - BUILDER_STEP_X * BUILDER_BRICKS); // x0 - 24
  assert.equal(lem.y, y0 - BUILDER_STEP_Y * BUILDER_BRICKS); // y0 - 12

  let minCol = Infinity;
  let maxCol = -Infinity;
  for (let k = 1; k <= BUILDER_BRICKS; k++) {
    const row = y0 - (k - 1) - 1;
    const colEnd = x0 - BUILDER_STEP_X * (k - 1); // dir -1: brick columns are colEnd-5..colEnd
    for (let t = 0; t < BRICK_WIDTH; t++) {
      const col = colEnd - t;
      assert.equal(session.terrain.get(col, row), Material.Earth, `brick ${k} col ${t}`);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }
  }
  assert.equal(minCol, x0 - 27);
  assert.equal(maxCol, x0);
});

test('builder: a body bump — solid at (x, y-1) after the step — turns it around and it walks', () => {
  const session = sessionWithWalker({ boxes: [{ x: 102, y: 148, w: 1, h: 1 }] }); // (X0+2*dir, Y0-2)
  const lem = live(session, 0);
  lem.x = 100;
  lem.y = FLOOR;
  lem.dir = 1;
  lem.state = 'building';
  lem.bricksLeft = 5;
  lem.stateTicks = BUILDER_BRICK_TICKS - 1; // next step lands on phase 0
  stepN(session, 1);
  assert.equal(lem.dir, -1);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.x, 102);
  assert.equal(lem.y, FLOOR - 1);
});

test('builder: a head bump at (x, y-9) turns it around and it walks (no body bump)', () => {
  const session = sessionWithWalker({ boxes: [{ x: 102, y: 140, w: 1, h: 1 }] }); // (X0+2*dir, (Y0-1)-9)
  const lem = live(session, 0);
  lem.x = 100;
  lem.y = FLOOR;
  lem.dir = 1;
  lem.state = 'building';
  lem.bricksLeft = 5;
  lem.stateTicks = BUILDER_BRICK_TICKS - 1;
  stepN(session, 1);
  assert.equal(lem.dir, -1);
  assert.equal(lem.state, 'walking');
  assert.equal(lem.x, 102);
  assert.equal(lem.y, FLOOR - 1);
});

test('builder: re-assigning a shrugger extends the stair (bricksLeft resets, position kept)', () => {
  const session = sessionWithWalker({ skills: { builder: 2 } });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  stepN(session, BUILDER_BRICKS * BUILDER_BRICK_TICKS); // full stair -> shrugging
  const lem = live(session, 0);
  assert.equal(lem.state, 'shrugging');
  const x1 = lem.x;
  const y1 = lem.y;

  const [assignEvent] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  assert.deepEqual(assignEvent, { type: 'skill-assigned', lemmingId: 0, skill: 'builder' });
  assert.equal(lem.state, 'building');
  assert.equal(lem.bricksLeft, BUILDER_BRICKS);
  assert.equal(lem.x, x1); // extends from where the shrugger stood, does not reset position
  assert.equal(lem.y, y1);

  stepN(session, BUILDER_BRICK_PHASE); // next brick, one row above the old stair's top
  for (let t = 0; t < BRICK_WIDTH; t++) assert.equal(session.terrain.get(x1 + t, y1 - 1), Material.Earth);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BLOCKER (block.ts) — core-rules.md §S "Blocking" + §F "Blocker field"
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('blocker: stands still while supported', () => {
  const session = sessionWithWalker({ skills: { blocker: 1 } });
  const lem = live(session, 0);
  const x0 = lem.x;
  const y0 = lem.y;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  assert.equal(lem.state, 'blocking');
  stepN(session, 40);
  assert.equal(lem.x, x0);
  assert.equal(lem.y, y0);
  assert.equal(lem.state, 'blocking');
});

test('blocker: reverts to walking when the ground beneath it is removed', () => {
  const session = sessionWithWalker({ skills: { blocker: 1 } });
  const lem = live(session, 0);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  session.terrain.remove(lem.x, lem.y, 0); // e.g. a digger/explosion carving the ground away
  stepN(session, 1);
  assert.equal(lem.state, 'walking');
});

test('blocker: turns walkers whose foot is 1..BLOCKER_REACH px away on both sides; the middle column is neutral', () => {
  const session = new GameSession(makeLevel({ lemmings: 2, skills: { blocker: 1 } }));
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const blocker = live(session, 0);
  blocker.x = 200;
  blocker.y = FLOOR;
  blocker.dir = 1;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  const other = live(session, 1);

  const trial = (preX: number, dir: 1 | -1): number => {
    other.x = preX;
    other.y = FLOOR;
    other.dir = dir;
    other.state = 'walking';
    other.stateTicks = 5;
    session.step();
    return other.dir;
  };

  // Approaching from the left (dir +1, moves +1 this tick): post-move distance 1..8 turns away
  // (-1); 9 is just out of BLOCKER_REACH and 0 is the neutral middle column — both unchanged.
  assert.equal(trial(200 - 1 - 1, 1), -1);
  assert.equal(trial(200 - BLOCKER_REACH - 1, 1), -1);
  assert.equal(trial(200 - (BLOCKER_REACH + 1) - 1, 1), 1);
  assert.equal(trial(200 - 0 - 1, 1), 1);

  // Approaching from the right (dir -1, moves -1 this tick): symmetric, turns to +1.
  assert.equal(trial(200 + 1 + 1, -1), 1);
  assert.equal(trial(200 + BLOCKER_REACH + 1, -1), 1);
  assert.equal(trial(200 + (BLOCKER_REACH + 1) + 1, -1), -1);
  assert.equal(trial(200 + 0 + 1, -1), -1);
});

test('blocker: vertical reach is exactly B.y-6..B.y+5 (a lemming far above, in range, does not turn)', () => {
  const session = new GameSession(
    makeLevel({
      floor: false,
      boxes: [
        { x: 0, y: 140, w: 400, h: 16 }, // main floor: By-6..By+5 all solid for By=146
        { x: 150, y: 120, w: 100, h: 10 }, // separate high ledge, far above the field's reach
      ],
      entrances: [{ x: 40, y: 140 }],
      lemmings: 2,
      skills: { blocker: 1 },
    }),
  );
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const blocker = live(session, 0);
  blocker.x = 200;
  blocker.y = 146; // By-6=140 (top of the main floor), By+5=151 — both within the 16px block
  blocker.dir = 1;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  const other = live(session, 1);

  const trial = (y: number): number => {
    other.x = 200 - 1 - 1;
    other.y = y;
    other.dir = 1;
    other.state = 'walking';
    other.stateTicks = 5;
    session.step();
    return other.dir;
  };

  assert.equal(trial(140), -1); // By-6: in range (top boundary), turns
  assert.equal(trial(151), -1); // By+5: in range (bottom boundary), turns

  // Far above (on the separate ledge), same horizontal distance: out of vertical range, no turn.
  other.x = 199;
  other.y = 120;
  other.dir = 1;
  other.state = 'walking';
  other.stateTicks = 5;
  session.step();
  assert.equal(other.dir, 1);
});

test('blocker: turns builders/bashers/miners too — they keep working the other way', () => {
  const session = new GameSession(makeLevel({ lemmings: 2, skills: { blocker: 1 } }));
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const blocker = live(session, 0);
  blocker.x = 200;
  blocker.y = FLOOR;
  blocker.dir = 1;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  const other = live(session, 1);

  // stateTicks chosen so each worker's handler neither moves nor carves/turns on its own this
  // tick — isolates the blocker-field effect from the worker's own phase logic.
  const idleStateTicks = { building: 3, bashing: 3, mining: 5 } as const;
  for (const state of ['building', 'bashing', 'mining'] as const) {
    other.x = 197; // foot 3 px from the blocker: within [1, BLOCKER_REACH]
    other.y = FLOOR;
    other.dir = 1;
    other.state = state;
    other.stateTicks = idleStateTicks[state];
    other.bricksLeft = 5;
    session.step();
    assert.equal(other.x, 197, `${state} should not move this tick`);
    assert.equal(other.dir, -1, `${state} should be turned away`);
    assert.equal(other.state, state, `${state} keeps working, just the other way`);
  }
});

test('blocker: blocker-overlap refusal (|dx| < BLOCKER_FIELD.w and |dy| < BLOCKER_FIELD.h); accepted just outside', () => {
  const session = new GameSession(makeLevel({ lemmings: 2, skills: { blocker: 5 } }));
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const existing = live(session, 0);
  existing.x = 200;
  existing.y = FLOOR;
  existing.dir = 1;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  const other = live(session, 1);

  const attempt = (dx: number, dy: number) => {
    other.x = 200 + dx;
    other.y = FLOOR + dy;
    other.dir = 1;
    other.state = 'walking';
    other.stateTicks = 5;
    const check = session.checkAssign(1, 'blocker');
    const before = session.skills.blocker;
    const events = session.applyNow({ type: 'assign-skill', lemmingId: 1, skill: 'blocker' });
    return { check, events, before, after: session.skills.blocker };
  };

  let r = attempt(BLOCKER_FIELD.w - 1, 0); // dx=11: overlap
  assert.deepEqual(r.check, { reason: 'blocker-overlap' });
  assert.deepEqual(r.events, [{ type: 'skill-rejected', lemmingId: 1, skill: 'blocker', reason: 'blocker-overlap' }]);
  assert.equal(r.after, r.before);

  other.state = 'walking'; // undo the (refused) attempt's non-effect; still walking anyway
  r = attempt(BLOCKER_FIELD.w, 0); // dx=12: just outside, accepted
  assert.equal(r.check, null);
  assert.deepEqual(r.events, [{ type: 'skill-assigned', lemmingId: 1, skill: 'blocker' }]);
  assert.equal(r.after, r.before - 1);

  other.state = 'walking'; // undo the successful assignment for the next probe
  r = attempt(0, BLOCKER_FIELD.h - 1); // dy=11: overlap
  assert.deepEqual(r.check, { reason: 'blocker-overlap' });

  other.state = 'walking';
  r = attempt(0, BLOCKER_FIELD.h); // dy=12: just outside, accepted
  assert.equal(r.check, null);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// BOMBER (bomb.ts) — core-rules.md §S "Fuse", "Oh-no", "Exploding"
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('bomber: fuseTicks = BOMB_FUSE_TICKS on assignment, counts down, ohno at 79, explosion 16 ticks later', () => {
  const session = sessionWithWalker({ skills: { bomber: 1 } });
  const [assignEvent] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'bomber' });
  assert.deepEqual(assignEvent, { type: 'skill-assigned', lemmingId: 0, skill: 'bomber' });
  const lem = live(session, 0);
  assert.equal(lem.fuseTicks, BOMB_FUSE_TICKS);
  assert.equal(lem.state, 'walking'); // assignment alone does not change state

  const before = stepN(session, BOMB_FUSE_TICKS - 1);
  assert.equal(before.some((e) => e.event.type === 'lemming-ohno'), false);
  assert.equal(lem.fuseTicks, 1);
  assert.equal(lem.state, 'walking');

  const ohnoStep = stepN(session, 1); // the 79th tick after assignment
  assert.deepEqual(
    ohnoStep.map((e) => e.event).filter((e) => e.type === 'lemming-ohno'),
    [{ type: 'lemming-ohno', lemmingId: 0, nuking: false }],
  );
  assert.equal(lem.state, 'ohno');
  assert.equal(lem.fuseTicks, 0);

  // At stateTicks === OHNO_TICKS the ohno handler itself calls setState(exploding) (core-rules
  // §S "Oh-no"); since a tick's handler is chosen before it runs, the *next* tick is the one
  // that actually carves the crater ("Exploding: first tick in the state"). So after OHNO_TICKS-1
  // more ticks the lemming has already flipped to 'exploding' but the explosion itself hasn't
  // fired yet.
  const beforeExplosion = stepN(session, OHNO_TICKS - 1);
  assert.equal(beforeExplosion.some((e) => e.event.type === 'explosion'), false);
  assert.equal(lem.state, 'exploding');

  const explosionStep = stepN(session, 1).map((e) => e.event); // OHNO_TICKS after ohno started
  assert.ok(explosionStep.some((e) => e.type === 'explosion'));
  assert.deepEqual(
    explosionStep.filter((e) => e.type === 'lemming-died'),
    [{ type: 'lemming-died', lemmingId: 0, cause: 'explode' }],
  );
  assert.equal(session.lemmingById(0), undefined); // exploding is not an animated death: removed same tick
});

test('bomber: an oh-no mumble still falls (no fall counter, no splat) and explodes at OHNO_TICKS regardless', () => {
  const session = sessionWithWalker();
  const lem = live(session, 0);
  lem.state = 'ohno';
  lem.stateTicks = 0;
  lem.x = 200;
  lem.y = 50; // far above the default floor (150): stays airborne for the whole countdown
  lem.fuseTicks = 0;
  for (let i = 1; i <= OHNO_TICKS; i++) {
    const events = stepN(session, 1);
    assert.equal(events.some((e) => e.event.type === 'lemming-died'), false, `no death mid-ohno at tick ${i}`);
    assert.equal(live(session, 0)?.y, 50 + FALL_SPEED * i, `fell FALL_SPEED px at tick ${i}`);
    assert.equal(live(session, 0)?.state, i < OHNO_TICKS ? 'ohno' : 'exploding', `state at tick ${i}`);
  }
  const finalEvents = stepN(session, 1).map((e) => e.event);
  assert.deepEqual(
    finalEvents.find((e) => e.type === 'explosion'),
    { type: 'explosion', lemmingId: 0, x: 200, y: 50 + FALL_SPEED * OHNO_TICKS },
  );
  assert.equal(session.lemmingById(0), undefined);
});

test('bomber: fuse expiry while falling explodes immediately, no oh-no', () => {
  const session = sessionWithWalker();
  const lem = live(session, 0);
  lem.state = 'falling';
  lem.stateTicks = 0;
  lem.fallDistance = 30;
  lem.x = 200;
  lem.y = 50;
  lem.fuseTicks = 1;
  const events = stepN(session, 1).map((e) => e.event);
  assert.equal(events.some((e) => e.type === 'lemming-ohno'), false);
  assert.deepEqual(
    events.find((e) => e.type === 'explosion'),
    { type: 'explosion', lemmingId: 0, x: 200, y: 50 },
  );
  assert.deepEqual(
    events.find((e) => e.type === 'lemming-died'),
    { type: 'lemming-died', lemmingId: 0, cause: 'explode' },
  );
  assert.equal(session.lemmingById(0), undefined);
});

test('bomber: fuse expiry while floating also explodes immediately, no oh-no', () => {
  const session = sessionWithWalker();
  const lem = live(session, 0);
  lem.state = 'floating';
  lem.stateTicks = 0;
  lem.x = 200;
  lem.y = 50;
  lem.fuseTicks = 1;
  const events = stepN(session, 1).map((e) => e.event);
  assert.equal(events.some((e) => e.type === 'lemming-ohno'), false);
  assert.ok(events.some((e) => e.type === 'explosion'));
  assert.deepEqual(
    events.find((e) => e.type === 'lemming-died'),
    { type: 'lemming-died', lemmingId: 0, cause: 'explode' },
  );
});

test('bomber: crater matches the exact elliptical mask; steel untouched; one-way ignored', () => {
  const session = sessionWithWalker({ boxes: [{ x: 170, y: 70, w: 60, h: 60 }] });
  const lem = live(session, 0);
  lem.x = 200;
  lem.y = 100;
  lem.dir = 1;
  session.terrain.set(200, 97, Material.Steel, 2); // dx=0, dy=-3: well inside the mask
  session.terrain.set(195, 100, Material.OneWayLeft, 3); // dx=-5, dy=0: inside the mask
  session.terrain.set(205, 100, Material.OneWayRight, 4); // dx=5, dy=0: inside the mask
  lem.state = 'exploding';
  lem.stateTicks = 1;

  const events = stepN(session, 1).map((e) => e.event);
  assert.deepEqual(
    events.find((e) => e.type === 'explosion'),
    { type: 'explosion', lemmingId: 0, x: 200, y: 100 },
  );
  assert.deepEqual(
    events.find((e) => e.type === 'lemming-died'),
    { type: 'lemming-died', lemmingId: 0, cause: 'explode' },
  );
  assert.equal(session.lemmingById(0), undefined);

  for (let dy = -16; dy <= 9; dy++) {
    for (let dx = -10; dx <= 9; dx++) {
      const px = 200 + dx;
      const py = 100 + dy;
      if (px === 200 && py === 97) continue; // steel spot, checked separately
      if ((px === 195 && py === 100) || (px === 205 && py === 100)) continue; // one-way spots
      const removed = inMaskBox(dx, dy) && craterRemoved(dx, dy);
      assert.equal(session.terrain.get(px, py), removed ? Material.Empty : Material.Earth, `(dx=${dx}, dy=${dy})`);
    }
  }
  assert.equal(session.terrain.get(200, 97), Material.Steel, 'steel inside the crater is untouched');
  assert.equal(session.terrain.get(195, 100), Material.Empty, 'one-way (left) is ignored by the bomb');
  assert.equal(session.terrain.get(205, 100), Material.Empty, 'one-way (right) is ignored by the bomb');
});

test('bomber: other mumbles next to an explosion are unharmed', () => {
  const session = new GameSession(makeLevel({ lemmings: 2 }));
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const bomber = live(session, 0);
  bomber.x = 200;
  bomber.y = FLOOR;
  bomber.dir = 1;
  bomber.state = 'exploding';
  bomber.stateTicks = 1;
  const neighbour = live(session, 1);
  neighbour.x = 216; // dx=16: outside the mask's max half-width (7/8), unaffected
  neighbour.y = FLOOR;
  neighbour.dir = 1;
  neighbour.state = 'walking';
  neighbour.stateTicks = 5;

  const events = stepN(session, 1).map((e) => e.event);
  assert.ok(events.some((e) => e.type === 'explosion'));
  assert.equal(
    events.some((e) => e.type === 'lemming-died' && e.lemmingId === 1),
    false,
  );
  assert.equal(session.lemmingById(1), neighbour);
  assert.equal(neighbour.state, 'walking');
});

test('bomber: on a 16 px floor the crater leaves a walkable bowl (a walker crosses it and survives)', () => {
  const session = new GameSession(
    makeLevel({
      floor: false,
      boxes: [{ x: 0, y: 140, w: 400, h: 16 }],
      entrances: [{ x: 40, y: 140 }],
      lemmings: 2,
      releaseRate: 99,
    }),
  );
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking');
  const bomber = live(session, 0);
  bomber.x = 200;
  bomber.y = 140;
  bomber.dir = 1;
  bomber.state = 'exploding';
  bomber.stateTicks = 1;
  stepN(session, 1);
  assert.equal(session.lemmingById(0), undefined); // crater carved, bomber gone

  stepUntil(session, () => session.lemmingById(1) !== undefined);
  const walker = live(session, 1);
  walker.x = 180;
  walker.y = 140;
  walker.dir = 1;
  walker.state = 'walking';
  walker.stateTicks = 5;
  for (let i = 0; i < 80 && walker.x < 220; i++) {
    stepN(session, 1);
    assert.notEqual(walker.state, 'splatting', `splatted at i=${i}, x=${walker.x}`);
    assert.ok(session.lemmingById(1), `removed (lost) at i=${i}, x=${walker.x}`);
  }
  assert.ok(walker.x >= 220, `never crossed the crater, stuck at x=${walker.x}`);
  assert.equal(walker.state, 'walking');
});

test('bomber: a blocker keeps its field while in oh-no', () => {
  const session = new GameSession(makeLevel({ lemmings: 2, skills: { blocker: 1, bomber: 1 } }));
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking' && session.lemmingById(1) !== undefined);
  const blocker = live(session, 0);
  blocker.x = 200;
  blocker.y = FLOOR;
  blocker.dir = 1;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'bomber' }); // blockers accept bombers
  blocker.fuseTicks = 1; // fast-forward the fuse for the test

  stepN(session, 1); // fuseTicks -> 0: ohno (the session remembers it as a field caster)
  assert.equal(blocker.state, 'ohno');

  const other = live(session, 1);
  other.x = 193; // will move to 194: distance 6 from the blocker (still 1..BLOCKER_REACH)
  other.y = FLOOR;
  other.dir = 1;
  other.state = 'walking';
  other.stateTicks = 5;
  stepN(session, 1);
  assert.equal(other.dir, -1, 'turned away even though the blocker is mid oh-no');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// REJECTIONS (§R) — checkAssign and skill-rejected must agree; a refusal never consumes the skill
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('rejections: bomber fuse-lit (fuseTicks > 0)', () => {
  const session = sessionWithWalker({ skills: { bomber: 2 } });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'bomber' });
  const fuseBefore = live(session, 0).fuseTicks;
  assertRejected(session, 0, 'bomber', { reason: 'not-applicable', detail: 'fuse-lit' });
  assert.equal(live(session, 0).fuseTicks, fuseBefore);
});

test('rejections: bomber busy-dying (drowning/splatting/exiting/ohno)', () => {
  for (const state of ['drowning', 'splatting', 'exiting', 'ohno'] as const) {
    const session = sessionWithWalker({ skills: { bomber: 1 } });
    const lem = live(session, 0);
    lem.state = state;
    lem.stateTicks = 1;
    lem.fuseTicks = 0;
    assertRejected(session, 0, 'bomber', { reason: 'not-applicable', detail: 'busy-dying' });
    assert.equal(live(session, 0).state, state);
  }
});

test('rejections: blocker/builder airborne (falling/jumping/climbing/hoisting/floating)', () => {
  for (const skill of ['blocker', 'builder'] as const) {
    for (const state of ['falling', 'jumping', 'climbing', 'hoisting', 'floating'] as const) {
      const session = sessionWithWalker({ skills: { blocker: 1, builder: 1 } });
      const lem = live(session, 0);
      lem.state = state;
      lem.stateTicks = 1;
      assertRejected(session, 0, skill, { reason: 'not-applicable', detail: 'airborne' });
    }
  }
});

test('rejections: blocker/builder is-blocker (already blocking)', () => {
  for (const skill of ['blocker', 'builder'] as const) {
    const session = sessionWithWalker({ skills: { blocker: 1, builder: 1 } });
    const lem = live(session, 0);
    lem.state = 'blocking';
    lem.stateTicks = 5;
    assertRejected(session, 0, skill, { reason: 'not-applicable', detail: 'is-blocker' });
  }
});

test('rejections: builder same-job (already building)', () => {
  const session = sessionWithWalker({ skills: { builder: 1 } });
  const lem = live(session, 0);
  lem.state = 'building';
  lem.bricksLeft = 5;
  lem.stateTicks = 3;
  assertRejected(session, 0, 'builder', { reason: 'not-applicable', detail: 'same-job' });
});

test('rejections: builder too-high near the top of the level', () => {
  const session = new GameSession(makeLevel({ boxes: [{ x: 100, y: 5, w: 20, h: 5 }], skills: { builder: 1 } }));
  stepUntil(session, () => session.lemmingById(0) !== undefined);
  const lem = live(session, 0);
  lem.x = 105;
  lem.y = 5; // headAboveTop(y - BUILDER_STEP_Y) = headAboveTop(4) = 4-10 < -5 -> true
  lem.dir = 1;
  lem.state = 'walking';
  lem.stateTicks = 5;
  assertRejected(session, 0, 'builder', { reason: 'too-high' });
});

test('builder: accepted just below the too-high threshold (y = 6)', () => {
  const session = new GameSession(makeLevel({ boxes: [{ x: 100, y: 6, w: 20, h: 5 }], skills: { builder: 1 } }));
  stepUntil(session, () => session.lemmingById(0) !== undefined);
  const lem = live(session, 0);
  lem.x = 105;
  lem.y = 6; // headAboveTop(5) = 5-10 < -5 -> false
  lem.dir = 1;
  lem.state = 'walking';
  lem.stateTicks = 5;
  assert.equal(session.checkAssign(0, 'builder'), null);
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  assert.deepEqual(event, { type: 'skill-assigned', lemmingId: 0, skill: 'builder' });
});

test('rejections: builder is accepted on a shrugger (not same-job) — extends the stair', () => {
  const session = sessionWithWalker({ skills: { builder: 1 } });
  const lem = live(session, 0);
  lem.state = 'shrugging';
  lem.stateTicks = 3;
  lem.bricksLeft = 0;
  assert.equal(session.checkAssign(0, 'builder'), null);
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'builder' });
  assert.deepEqual(event, { type: 'skill-assigned', lemmingId: 0, skill: 'builder' });
  assert.equal(lem.state, 'building');
  assert.equal(lem.bricksLeft, BUILDER_BRICKS);
});
