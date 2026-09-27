/**
 * Independent validation of the SESSION FLOW (core-a1-val, task A1-V) against the SPEC:
 * docs/development/core-rules.md §F/§R, docs/development/CONTRACTS.md §2.1/§2.4,
 * docs/research/RESEARCH.md §2.1/§2.6-2.8, docs/design/DESIGN.md §6.4.1/§7.9,
 * docs/design/LEVELS.md "Notes for architecture/dev" 4/6/11, docs/architecture/ARCHITECTURE.md §5-6.
 *
 * Expected values are derived from those documents, NOT from reading session.ts's bodies.
 * Replaces these tests/behaviours.todo.test.ts todos with real tests (that file is left
 * untouched; the lead deletes it later):
 *   - "start timeline: lets-go, entrance-opened, first spawn at FIRST_SPAWN_TICK; then every
 *     releaseIntervalTicks(rate)"
 *   - "level ends (won/lost) when all lemmings are resolved or time runs out"
 *   - "nuke lights fuses one lemming per NUKE_INTERVAL_TICKS and stops releases"
 *   - "lemming reaching an exit is saved; water/fire/traps kill; leaving the map kills"
 *   - "the same replay (level, seed, commands) yields identical snapshots"
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BOMB_FUSE_TICKS,
  BURN_TICKS,
  DROWN_TICKS,
  ENTRANCE_OPEN_TICK,
  EXIT_TICKS,
  FIRST_SPAWN_TICK,
  LETS_GO_TICK,
  OHNO_TICKS,
  OUT_OF_BOUNDS_MARGIN,
  releaseIntervalTicks,
  TICKS_PER_SECOND,
} from '../src/core/constants.ts';
import { runHeadless } from '../src/core/headless.ts';
import { GameSession } from '../src/core/session.ts';
import type { GameCommand, GameEvent, GameSnapshot, Lemming, LevelOutcome, SkillId } from '../src/core/types.ts';
import { FLOOR, makeLevel, stepN, stepUntil, type TickEvent } from './core-fixtures.ts';

// ─── Test-only helper: expose GameSession's protected spawn() (same pattern as
// tests/contracts.test.ts) so we can inspect the raw values `spawn()` assigns, independent of
// whatever a same-tick state-handler call does to them afterwards, and so we can drop lemmings
// into arbitrary hand-picked states/positions to test session-level mechanics in isolation. ───
class TestSession extends GameSession {
  spawnAt(x: number, y: number): Lemming {
    return this.spawn(x, y);
  }
}

function eventsOfType(events: readonly TickEvent[], type: GameEvent['type']): TickEvent[] {
  return events.filter((e) => e.event.type === type);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Start timeline (core-rules §F)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('spawn(): a freshly spawned mumble is falling, dir +1, fallDistance = FALL_COUNTER_STEP, at the given point', () => {
  const session = new TestSession(makeLevel());
  const a = session.spawnAt(40, FLOOR);
  assert.equal(a.state, 'falling');
  assert.equal(a.dir, 1);
  assert.equal(a.fallDistance, 3);
  assert.equal(a.x, 40);
  assert.equal(a.y, FLOOR);
  assert.equal(a.id, 0);
  const b = session.spawnAt(41, FLOOR);
  assert.equal(b.id, 1, 'ids increment 0,1,2… in release order');
  const c = session.spawnAt(42, FLOOR);
  assert.equal(c.id, 2);
});

test('start timeline: lets-go at 15, entrance-opened at 35, first spawn at 54 (RESEARCH §2.6)', () => {
  const session = new GameSession(makeLevel());
  const events = stepN(session, 80);
  const letsGo = eventsOfType(events, 'lets-go');
  const opened = eventsOfType(events, 'entrance-opened');
  const spawned = eventsOfType(events, 'lemming-spawned');
  assert.equal(letsGo.length, 1);
  assert.equal(letsGo[0]!.tick, LETS_GO_TICK);
  assert.equal(letsGo[0]!.tick, 15);
  assert.equal(opened.length, 1);
  assert.equal(opened[0]!.tick, ENTRANCE_OPEN_TICK);
  assert.equal(opened[0]!.tick, 35);
  assert.ok(spawned.length >= 1);
  assert.equal(spawned[0]!.tick, FIRST_SPAWN_TICK);
  assert.equal(spawned[0]!.tick, 54);
  assert.deepEqual(spawned[0]!.event, { type: 'lemming-spawned', lemmingId: 0, x: 40, y: FLOOR });
});

test('release: spawns every releaseIntervalTicks(rate) after the first, ids in release order, then all-released', () => {
  for (const rate of [50, 99]) {
    const interval = releaseIntervalTicks(rate);
    const level = makeLevel({ lemmings: 4, saveRequired: 4, releaseRate: rate });
    const session = new GameSession(level);
    const events = stepN(session, FIRST_SPAWN_TICK + 3 * interval + 5);
    const spawned = eventsOfType(events, 'lemming-spawned');
    assert.equal(spawned.length, 4);
    assert.deepEqual(
      spawned.map((e) => e.tick),
      [FIRST_SPAWN_TICK, FIRST_SPAWN_TICK + interval, FIRST_SPAWN_TICK + 2 * interval, FIRST_SPAWN_TICK + 3 * interval],
      `rate ${rate}: interval should be releaseIntervalTicks(${rate}) = ${interval}`,
    );
    assert.deepEqual(
      spawned.map((e) => (e.event as { lemmingId: number }).lemmingId),
      [0, 1, 2, 3],
    );
    const allReleased = eventsOfType(events, 'all-released');
    assert.equal(allReleased.length, 1);
    // "right after the last one emit all-released": same tick, immediately following it.
    assert.equal(allReleased[0]!.tick, spawned[3]!.tick);
    const lastSpawnIdx = events.indexOf(spawned[3]!);
    assert.equal(events[lastSpawnIdx + 1], allReleased[0]);
  }
});

test('release: a release-rate change mid-wait applies to the NEXT spawn at once (faster rate)', () => {
  // Start at RR 50 (interval 28): first spawn 54, would naturally be followed by 82.
  // Speed up to RR 99 (interval 4) at tick 60: 60 - 54 = 6 >= 4, so the 2nd spawn should fire
  // immediately at tick 60, not wait for the originally-scheduled 82, and not restart a fresh
  // 4-tick wait from 60 either.
  const level = makeLevel({ lemmings: 2, saveRequired: 2, releaseRate: 50 });
  const session = new GameSession(level);
  session.enqueue({ type: 'set-release-rate', rate: 99 }, 60);
  const events = stepN(session, 70);
  const spawned = eventsOfType(events, 'lemming-spawned');
  assert.deepEqual(
    spawned.map((e) => e.tick),
    [54, 60],
  );
});

test('release: a release-rate change mid-wait applies to the NEXT spawn at once (slower rate)', () => {
  // The player may never lower the rate below the level's STARTING rate (RESEARCH §2.6), so to
  // observe a genuine slow-down we start at RR 50 (floor 50, interval 28: first spawn 54, next
  // naturally 82), briefly speed up to 99 (interval 4) right after the first spawn, then slow
  // back down to the floor (50, interval 28) before that faster interval can fire. The 2nd spawn
  // should land back at 54 + 28 = 82 (measured from the ORIGINAL last spawn, using whatever rate
  // is current at each check), not at 54 + 4 = 58.
  const level = makeLevel({ lemmings: 2, saveRequired: 2, releaseRate: 50 });
  const session = new GameSession(level);
  session.enqueue({ type: 'set-release-rate', rate: 99 }, 55);
  session.enqueue({ type: 'set-release-rate', rate: 50 }, 56);
  const events = stepN(session, 90);
  const spawned = eventsOfType(events, 'lemming-spawned');
  assert.deepEqual(
    spawned.map((e) => e.tick),
    [54, 82],
  );
});

test('nothing is released once nuking: no all-released, no more lemming-spawned', () => {
  const level = makeLevel({ lemmings: 5, saveRequired: 5, releaseRate: 99 });
  const session = new GameSession(level);
  // Release exactly 2, then nuke before the rest.
  stepUntil(session, () => session.counts.out + session.counts.saved + session.counts.dead >= 2);
  session.applyNow({ type: 'nuke' });
  assert.equal(session.counts.toRelease, 0);
  const after = stepN(session, 400);
  assert.equal(eventsOfType(after, 'lemming-spawned').length, 0, 'no more spawns after nuking');
  assert.equal(eventsOfType(after, 'all-released').length, 0, 'no all-released once nuking');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Two/three/four entrances: ABBA / ABCB->ABC1 / ABCD order (core-rules §F, RESEARCH §2.6)
// ═══════════════════════════════════════════════════════════════════════════════════════════

function spawnedEntranceIndices(events: readonly TickEvent[], entrances: readonly { x: number; y: number }[]): number[] {
  return eventsOfType(events, 'lemming-spawned').map((e) => {
    const ev = e.event as { x: number; y: number };
    const idx = entrances.findIndex((p) => p.x === ev.x && p.y === ev.y);
    assert.notEqual(idx, -1, `spawned point ${JSON.stringify(ev)} matches no entrance`);
    return idx;
  });
}

test('two entrances: ABBA order (0,1,1,0,0,1,1,0…)', () => {
  const entrances = [
    { x: 40, y: FLOOR },
    { x: 200, y: FLOOR },
  ];
  const level = makeLevel({ entrances, lemmings: 8, saveRequired: 8, releaseRate: 99 });
  const session = new GameSession(level);
  const events = stepN(session, FIRST_SPAWN_TICK + 8 * releaseIntervalTicks(99) + 5);
  assert.deepEqual(spawnedEntranceIndices(events, entrances), [0, 1, 1, 0, 0, 1, 1, 0]);
});

test('three entrances: 0,1,2,1', () => {
  const entrances = [
    { x: 40, y: FLOOR },
    { x: 160, y: FLOOR },
    { x: 280, y: FLOOR },
  ];
  const level = makeLevel({ entrances, lemmings: 4, saveRequired: 4, releaseRate: 99 });
  const session = new GameSession(level);
  const events = stepN(session, FIRST_SPAWN_TICK + 4 * releaseIntervalTicks(99) + 5);
  assert.deepEqual(spawnedEntranceIndices(events, entrances), [0, 1, 2, 1]);
});

test('four entrances: 0,1,2,3', () => {
  const entrances = [
    { x: 40, y: FLOOR },
    { x: 140, y: FLOOR },
    { x: 240, y: FLOOR },
    { x: 340, y: FLOOR },
  ];
  const level = makeLevel({ entrances, lemmings: 4, saveRequired: 4, releaseRate: 99 });
  const session = new GameSession(level);
  const events = stepN(session, FIRST_SPAWN_TICK + 4 * releaseIntervalTicks(99) + 5);
  assert.deepEqual(spawnedEntranceIndices(events, entrances), [0, 1, 2, 3]);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Nuke (core-rules §F, RESEARCH §2.7)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('nuke: nuke-started fires exactly once', () => {
  const level = makeLevel({ lemmings: 3, saveRequired: 3 });
  const session = new GameSession(level);
  const e1 = session.applyNow({ type: 'nuke' });
  assert.deepEqual(e1, [{ type: 'nuke-started' }]);
  const e2 = session.applyNow({ type: 'nuke' });
  assert.deepEqual(e2, [], 'a second nuke command is a no-op (already nuking)');
});

test('nuke: exactly one new fuse per tick, in release order, skipping lemmings that already have a fuse', () => {
  const session = new TestSession(makeLevel());
  const a = session.spawnAt(40, FLOOR);
  const b = session.spawnAt(60, FLOOR);
  const c = session.spawnAt(80, FLOOR);
  for (const lem of [a, b, c]) {
    lem.state = 'walking';
    lem.stateTicks = 0;
  }
  // b already has a lit fuse (ineligible: fuseTicks must be 0 to be picked by the nuke).
  b.fuseTicks = 50;

  session.enqueue({ type: 'nuke' });
  session.step(); // tick 0: nuke-started + the nuke phase lights the first eligible fuse (a).
  assert.equal(a.fuseTicks, BOMB_FUSE_TICKS);
  assert.equal(b.fuseTicks, 49, 'b ticks down independently (not re-lit)');
  assert.equal(c.fuseTicks, 0, 'not yet its turn');

  session.step(); // tick 1: a already fused (skip), b ineligible (skip), c gets the next fuse.
  assert.equal(a.fuseTicks, BOMB_FUSE_TICKS - 1);
  assert.equal(c.fuseTicks, BOMB_FUSE_TICKS);

  session.step(); // tick 2: everyone already has a fuse (a, c lit; b pre-lit) — none left to light.
  assert.equal(a.fuseTicks, BOMB_FUSE_TICKS - 2);
  assert.equal(c.fuseTicks, BOMB_FUSE_TICKS - 1);
});

test('nuke: fuse expiry emits lemming-ohno{nuking: true}', () => {
  const session = new TestSession(makeLevel());
  const a = session.spawnAt(40, FLOOR);
  a.state = 'walking';
  a.stateTicks = 0;
  session.enqueue({ type: 'nuke' });
  const events = stepN(session, BOMB_FUSE_TICKS + 1);
  const ohno = eventsOfType(events, 'lemming-ohno');
  assert.equal(ohno.length, 1);
  assert.deepEqual(ohno[0]!.event, { type: 'lemming-ohno', lemmingId: a.id, nuking: true });
});

test('nuke: counts.toRelease is 0 while nuking, and the level ends all-resolved once everyone is gone', () => {
  const level = makeLevel({ lemmings: 2, saveRequired: 2, releaseRate: 4 });
  const session = new GameSession(level);
  stepUntil(session, () => session.counts.out >= 1);
  assert.ok(session.counts.toRelease > 0 || session.counts.out === 2, 'sanity: not everyone released yet, or both are out');
  session.applyNow({ type: 'nuke' });
  assert.equal(session.counts.toRelease, 0);
  const events = stepUntil(session, () => session.status === 'ended', 500);
  const ended = eventsOfType(events, 'level-ended');
  assert.equal(ended.length, 1);
  const outcome = ended[0]!.event as { type: 'level-ended'; outcome: LevelOutcome };
  assert.equal(outcome.outcome.reason, 'all-resolved');
  assert.equal(session.status, 'ended');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Triggers at the foot pixel (core-rules §F.3, RESEARCH §2.8, LEVELS notes)
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** Freezes a lemming in `state` at (x, y) via a subject session, steps once, returns the events. */
function probeAt(levelOptions: Parameters<typeof makeLevel>[0], state: Lemming['state'], x: number, y: number): { events: readonly GameEvent[]; lem: () => ReturnType<GameSession['lemmingById']> } {
  const session = new TestSession(makeLevel(levelOptions));
  const lem = session.spawnAt(x, y);
  lem.state = state;
  lem.stateTicks = 0;
  const events = session.step();
  return { events, lem: () => session.lemmingById(lem.id) };
}

test('exit trigger: EXIT_TRIGGER box edges (dx:-4, dy:-7, w:8, h:8) around the exit anchor, foot pixel only', () => {
  const exit = { x: 200, y: FLOOR };
  const insideCorners: [number, number][] = [
    [exit.x - 4, exit.y - 7], // top-left corner, inclusive
    [exit.x + 3, exit.y], // bottom-right corner, inclusive (w=8,h=8 half-open)
    [exit.x, exit.y - 7],
    [exit.x - 4, exit.y],
  ];
  for (const [x, y] of insideCorners) {
    const { lem } = probeAt({ exits: [exit] }, 'blocking', x, y);
    assert.equal(lem()?.state, 'exiting', `(${x},${y}) should be inside the exit trigger`);
  }
  const justOutside: [number, number][] = [
    [exit.x + 4, exit.y], // x one past the right edge
    [exit.x - 5, exit.y], // x one before the left edge
    [exit.x, exit.y + 1], // y one past the bottom edge
    [exit.x, exit.y - 8], // y one before the top edge
  ];
  for (const [x, y] of justOutside) {
    // NB: y = exit.y - 8 sits above the real floor (unsupported), so a frozen 'blocking' probe
    // there loses ground and reverts to 'walking' (S: "workers lose ground") regardless of the
    // exit geometry — that reversion is an orthogonal, expected side effect of the probe itself,
    // so the meaningful assertion is simply "did not trigger the exit", not "stayed blocking".
    const { lem } = probeAt({ exits: [exit] }, 'blocking', x, y);
    assert.notEqual(lem()?.state, 'exiting', `(${x},${y}) should be outside the exit trigger`);
  }
});

test('exit trigger: never while falling — a faller whose foot lands inside the box is not saved that tick, but is the moment it becomes walking there', () => {
  const exit = { x: 200, y: FLOOR };
  const session = new TestSession(makeLevel({ exits: [exit] }));
  const lem = session.spawnAt(exit.x, exit.y - 6); // 3px above the point the fall will land on
  lem.state = 'falling';
  lem.stateTicks = 0;
  lem.fallDistance = 3;
  session.step(); // falls the full FALL_SPEED (3px) to (exit.x, exit.y - 3): still falling, still inside the box.
  let live = session.lemmingById(lem.id)!;
  assert.equal(live.y, exit.y - 3);
  assert.equal(live.state, 'falling', 'still falling this tick');
  // Keep stepping until it either lands (walking) or exits; it must NOT exit while falling.
  for (let i = 0; i < 20 && live.state === 'falling'; i++) {
    session.step();
    live = session.lemmingById(lem.id)!;
  }
  assert.notEqual(live.state, 'falling');
  // Whatever tick it lands (becomes walking) at a point inside the trigger box, exit fires then.
  if (live.state === 'walking' && live.x === exit.x) {
    session.step();
    live = session.lemmingById(lem.id)!;
    assert.equal(live.state, 'exiting', 'walking (not falling) inside the box triggers the exit');
  }
});

test('exit: saved exactly EXIT_TICKS after entering `exiting`; lemming-exited; counts update', () => {
  const exit = { x: 200, y: FLOOR };
  const session = new TestSession(makeLevel({ exits: [exit] }));
  const lem = session.spawnAt(exit.x, exit.y);
  lem.state = 'blocking'; // frozen, so the geometry below is exact
  lem.stateTicks = 0;
  const enterEvents = session.step();
  assert.equal(session.lemmingById(lem.id)?.state, 'exiting');
  assert.equal(enterEvents.length, 0, 'entering exiting itself emits no event (only the later save does)');
  const enterTick = session.tick - 1; // stepN-style: the tick that just ran
  const before = session.counts.saved;
  let exitedAtTick = -1;
  for (let i = 0; i < EXIT_TICKS + 2 && exitedAtTick < 0; i++) {
    const tick = session.tick;
    const evs = session.step();
    if (evs.some((e) => e.type === 'lemming-exited')) exitedAtTick = tick;
  }
  assert.equal(exitedAtTick, enterTick + EXIT_TICKS);
  assert.equal(session.counts.saved, before + 1);
  assert.equal(session.lemmingById(lem.id), undefined, 'removed once saved');
});

test('water: drowning + lemming-died{drown} on entry tick; removed silently DROWN_TICKS later; counted once', () => {
  const hazard = { kind: 'water' as const, area: { x: 196, y: 143, w: 8, h: 8 }, cooldownTicks: 0 };
  const session = new TestSession(makeLevel({ hazards: [hazard] }));
  const lem = session.spawnAt(200, 150);
  lem.state = 'blocking';
  lem.stateTicks = 0;
  const events = session.step();
  // (the default 1-lemming/saveRequired-1 level also fires goal-impossible this same tick,
  // per §F goal events — irrelevant to what THIS test checks, so only pin down the death.)
  assert.deepEqual(events[0], { type: 'lemming-died', lemmingId: lem.id, cause: 'drown' });
  assert.equal(session.lemmingById(lem.id)?.state, 'drowning');
  const deadAfterEntry = session.counts.dead; // already 1: kill() counts at the moment drowning starts
  assert.equal(deadAfterEntry, 1);
  let removedAtTick = -1;
  const enterTick = session.tick - 1;
  for (let i = 0; i < DROWN_TICKS + 2 && removedAtTick < 0; i++) {
    const tick = session.tick;
    const evs = session.step();
    assert.equal(
      evs.filter((e) => e.type === 'lemming-died' || e.type === 'lemming-exited').length,
      0,
      'no further death/exit event for the same lemming',
    );
    if (!session.lemmingById(lem.id)) removedAtTick = tick;
  }
  assert.equal(removedAtTick, enterTick + DROWN_TICKS, 'removed exactly DROWN_TICKS after entering drowning');
  assert.equal(session.counts.dead, deadAfterEntry, 'still exactly 1: silent removal does not count/announce it again');
});

test('fire: burning + lemming-died{burn}; removed silently BURN_TICKS later', () => {
  const hazard = { kind: 'fire' as const, area: { x: 196, y: 143, w: 8, h: 8 }, cooldownTicks: 0 };
  const session = new TestSession(makeLevel({ hazards: [hazard] }));
  const lem = session.spawnAt(200, 150);
  lem.state = 'blocking';
  lem.stateTicks = 0;
  const events = session.step();
  assert.deepEqual(events[0], { type: 'lemming-died', lemmingId: lem.id, cause: 'burn' });
  assert.equal(session.lemmingById(lem.id)?.state, 'burning');
  const enterTick = session.tick - 1;
  let removedAtTick = -1;
  for (let i = 0; i < BURN_TICKS + 2 && removedAtTick < 0; i++) {
    const tick = session.tick;
    session.step();
    if (!session.lemmingById(lem.id)) removedAtTick = tick;
  }
  assert.equal(removedAtTick, enterTick + BURN_TICKS);
});

test('out of bounds: y > level.height + OUT_OF_BOUNDS_MARGIN kills, for every state (including one otherwise skip-listed)', () => {
  const level = makeLevel();
  // A normal walker well below the map.
  {
    const session = new TestSession(level);
    const lem = session.spawnAt(200, level.height + OUT_OF_BOUNDS_MARGIN + 1);
    lem.state = 'blocking';
    lem.stateTicks = 0;
    const events = session.step();
    assert.deepEqual(events[0], { type: 'lemming-died', lemmingId: lem.id, cause: 'out-of-bounds' });
  }
  // Right at the margin should NOT be out of bounds yet.
  {
    const session = new TestSession(level);
    const lem = session.spawnAt(200, level.height + OUT_OF_BOUNDS_MARGIN);
    lem.state = 'blocking';
    lem.stateTicks = 0;
    const events = session.step();
    assert.equal(events.length, 0);
  }
  // core-rules §F point 5 says out-of-bounds "applies to every state" — including states the
  // general trigger skip-list would otherwise exempt (exiting is one of
  // splatting|drowning|burning|exploding|exiting).
  {
    const session = new TestSession(level);
    const lem = session.spawnAt(200, level.height + OUT_OF_BOUNDS_MARGIN + 1);
    lem.state = 'exiting';
    lem.stateTicks = 3;
    const events = session.step();
    assert.deepEqual(
      events[0],
      { type: 'lemming-died', lemmingId: lem.id, cause: 'out-of-bounds' },
      'out-of-bounds must fire even for an exiting lemming, per "(applies to every state)"',
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Traps (LEVELS.md note 4, core-rules §F.4)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('trap: kills one lemming, then ignores everyone (walkers AND fallers) until cooldownTicks elapse; re-arms at T + cooldownTicks', () => {
  const cooldownTicks = 5;
  const hazard = { kind: 'trap' as const, area: { x: 100, y: 143, w: 1, h: 8 }, cooldownTicks };
  // lemmings:10 (only 4 ever actually spawned below) so killing `a` neither ends the level
  // (not everyone released) nor fires goal-impossible (plenty still unreleased) — this test is
  // only about the trap/cooldown mechanics, not level-end side effects.
  const session = new TestSession(makeLevel({ hazards: [hazard], lemmings: 10 }));

  // Spawned 1px to the left: a fresh 'walking' tick moves it +1px (flat ground) BEFORE the
  // trigger check runs, so its foot lands exactly on the trap's single column (x=100) by the
  // time triggers are checked.
  const a = session.spawnAt(99, FLOOR);
  a.state = 'walking';
  a.stateTicks = 0;
  const events0 = session.step(); // tick 0: trap fires.
  assert.deepEqual(events0, [
    { type: 'trap-triggered', hazardIndex: 0, lemmingId: a.id },
    { type: 'lemming-died', lemmingId: a.id, cause: 'trap' },
  ]);
  assert.equal(session.lemmingById(a.id), undefined, 'trap deaths are removed the same tick (no animation state)');
  // Fired at tick 0 with cooldownTicks=5: cooldown is set to 5, then decremented once this same
  // tick (traps phase runs after triggers), so it should read 4 right after tick 0.
  assert.equal(session.hazardCooldowns[0], cooldownTicks - 1);

  // A second lemming (walking) arrives at the same spot while disarmed: must be ignored.
  const b = session.spawnAt(99, FLOOR);
  b.state = 'walking';
  b.stateTicks = 0;
  const events1 = session.step(); // tick 1: cooldown 4 -> 3, still disarmed.
  assert.equal(events1.filter((e) => e.type === 'trap-triggered' || e.type === 'lemming-died').length, 0);
  assert.equal(session.hazardCooldowns[0], cooldownTicks - 2);
  assert.ok(session.lemmingById(b.id), 'b survives while disarmed');

  // A falling lemming through the same spot while still disarmed: also ignored.
  const c = session.spawnAt(100, 144);
  c.state = 'falling';
  c.stateTicks = 0;
  c.fallDistance = 3; // will move the full FALL_SPEED (3px) down to y=147, inside the trap rows.
  const events2 = session.step(); // tick 2: cooldown 3 -> 2.
  assert.equal(session.lemmingById(c.id)?.y, 147);
  assert.equal(session.lemmingById(c.id)?.state, 'falling');
  assert.equal(events2.filter((e) => e.type === 'trap-triggered' || e.type === 'lemming-died').length, 0, 'a faller through a disarmed trap is also ignored');
  assert.equal(session.hazardCooldowns[0], cooldownTicks - 3);

  session.step(); // tick 3: cooldown 2 -> 1.
  assert.equal(session.hazardCooldowns[0], cooldownTicks - 4);
  session.step(); // tick 4: cooldown 1 -> 0. Re-armed going into tick 5 (= 0 + cooldownTicks).
  assert.equal(session.hazardCooldowns[0], 0);
  assert.equal(session.tick, 5);

  // A fresh faller through the trap exactly on the re-armed tick must be killed — traps apply
  // to fallers too, not just walkers.
  const d = session.spawnAt(100, 144);
  d.state = 'falling';
  d.stateTicks = 0;
  d.fallDistance = 3;
  const events5 = session.step(); // tick 5 == 0 + cooldownTicks: re-armed.
  assert.deepEqual(events5, [
    { type: 'trap-triggered', hazardIndex: 0, lemmingId: d.id },
    { type: 'lemming-died', lemmingId: d.id, cause: 'trap' },
  ]);
});

test('trap: a bunched group mostly walks past (only the ones within the cooldown window survive)', () => {
  const hazard = { kind: 'trap' as const, area: { x: 100, y: 143, w: 1, h: 8 }, cooldownTicks: 30 };
  const level = makeLevel({
    hazards: [hazard],
    lemmings: 6,
    saveRequired: 6,
    releaseRate: 99, // bunched: 4-tick spacing, well inside the 30-tick cooldown
    exits: [{ x: 380, y: FLOOR }],
  });
  const session = new GameSession(level);
  stepUntil(session, () => session.status === 'ended', 3000);
  assert.equal(session.status, 'ended');
  assert.ok(session.counts.dead <= 1, `expected at most one casualty from the bunched group, got ${session.counts.dead}`);
  assert.equal(session.counts.dead + session.counts.saved, 6, 'everyone is resolved one way or the other');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Clock (core-rules §F, RESEARCH §2.7, DESIGN §7.9)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('clock: time-low fires exactly once at 60s, 30s and 10s remaining', () => {
  for (const seconds of [60, 30, 10]) {
    const level = makeLevel({ timeLimitSeconds: seconds + 1 });
    const session = new GameSession(level);
    let fired: { tick: number; timeLeftTicks: number } | null = null;
    for (let i = 0; i < TICKS_PER_SECOND + 2 && !fired; i++) {
      const tick = session.tick;
      const evs = session.step();
      if (evs.some((e) => e.type === 'time-low')) fired = { tick, timeLeftTicks: session.timeLeftTicks };
    }
    assert.ok(fired, `seconds=${seconds}`);
    assert.equal(fired!.timeLeftTicks, seconds * TICKS_PER_SECOND, 'lands exactly on the threshold, at the moment the event fires');
  }
});

test('clock: time-up ends the level (reason time-up); won/saved/required/total; ticks = steps run; overtimeTicks 0', () => {
  const level = makeLevel({ timeLimitSeconds: 1, saveRequired: 1, lemmings: 1 });
  const session = new GameSession(level);
  const events = stepN(session, TICKS_PER_SECOND + 3);
  const ended = eventsOfType(events, 'level-ended');
  assert.equal(ended.length, 1);
  const outcome = (ended[0]!.event as { outcome: LevelOutcome }).outcome;
  assert.equal(outcome.reason, 'time-up');
  assert.equal(outcome.required, 1);
  assert.equal(outcome.total, 1);
  assert.equal(outcome.won, outcome.saved >= outcome.required);
  assert.equal(outcome.saved, 0, 'the mumble never reached an exit');
  assert.equal(outcome.won, false);
  assert.equal(outcome.ticks, session.tick);
  assert.equal(outcome.ticks, TICKS_PER_SECOND);
  assert.equal(outcome.overtimeTicks, 0);
});

test('relaxed timer: overtime-started once at 0:00, clock stays 0, overtimeTicks grows 1/tick, never ends by time', () => {
  // A closed corridor (walls both sides, no exit): the lemming just walks back and forth
  // forever, so the ONLY thing that could end the level is the clock.
  const level = makeLevel({ timeLimitSeconds: 1, saveRequired: 1, lemmings: 1, width: 400 });
  const session = new GameSession(level, { relaxedTimer: true });
  const events = stepN(session, TICKS_PER_SECOND + 30);
  const overtimeStarted = eventsOfType(events, 'overtime-started');
  assert.equal(overtimeStarted.length, 1);
  assert.equal(overtimeStarted[0]!.tick, TICKS_PER_SECOND - 1);
  assert.equal(session.timeLeftTicks, 0);
  assert.equal(session.overtimeTicks, 30);
  assert.equal(session.status, 'running', 'the relaxed clock never ends the level');
  assert.equal(eventsOfType(events, 'level-ended').length, 0);

  // End it another way (nuke) and check the final LevelOutcome carries the overtime.
  session.applyNow({ type: 'nuke' });
  const rest = stepUntil(session, () => session.status === 'ended', 500);
  const ended = eventsOfType(rest, 'level-ended');
  assert.equal(ended.length, 1);
  const outcome = (ended[0]!.event as { outcome: LevelOutcome }).outcome;
  assert.ok(outcome.overtimeTicks >= 30, 'overtime kept accumulating until the level actually ended');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Goal events (core-rules §F, once each)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('goal-reached fires once, the first time saved reaches saveRequired', () => {
  const exit = { x: 200, y: FLOOR };
  const session = new TestSession(makeLevel({ exits: [exit], saveRequired: 1, lemmings: 1 }));
  const lem = session.spawnAt(exit.x, exit.y);
  lem.state = 'blocking';
  lem.stateTicks = 0;
  session.step(); // enters exiting
  let reached: TickEvent | undefined;
  for (let i = 0; i < EXIT_TICKS + 2 && !reached; i++) {
    const tick = session.tick;
    for (const event of session.step()) if (event.type === 'goal-reached') reached = { tick, event };
  }
  assert.ok(reached);
  assert.deepEqual(reached!.event, { type: 'goal-reached', saved: 1 });
  // Never fires again (nothing left to trigger it again here, but assert it never re-appears).
  const more = stepN(session, 50);
  assert.equal(eventsOfType(more, 'goal-reached').length, 0);
  assert.equal(eventsOfType(more, 'goal-impossible').length, 0, 'goal-impossible must never fire once goal-reached has');
});

test('goal-impossible fires once when saved + alive + notYetReleased < required', () => {
  // Two entrances, both released quickly (RR 99): one mumble's path runs straight through a
  // trap, the other just wanders — so once both have released and the first is trapped,
  // saved(0) + alive(1) + notYetReleased(0) = 1 < required(2).
  const entrances = [
    { x: 40, y: FLOOR },
    { x: 300, y: FLOOR },
  ];
  const hazard = { kind: 'trap' as const, area: { x: 44, y: 143, w: 4, h: 8 }, cooldownTicks: 1000 };
  const level = makeLevel({ entrances, hazards: [hazard], saveRequired: 2, lemmings: 2, releaseRate: 99 });
  const session = new GameSession(level);
  const events = stepN(session, 200);
  assert.equal(eventsOfType(events, 'goal-impossible').length, 1);
  assert.equal(eventsOfType(events, 'goal-reached').length, 0);
});

test('goal-impossible: an exiting-but-not-yet-saved mumble counts as alive, not as neither', () => {
  // Exit box reaches back to the entrance's own x, so the sole mumble triggers it the instant it
  // lands (spawn tick), landing state='walking' at the same point where it spawned.
  const exit = { x: 44, y: FLOOR };
  const level = makeLevel({ exits: [exit], saveRequired: 1, lemmings: 1 });
  const session = new GameSession(level);
  stepUntil(session, () => session.lemmingById(0)?.state === 'exiting', FIRST_SPAWN_TICK + 5);
  assert.equal(session.lemmingById(0)?.state, 'exiting', 'sanity: entered exiting on/around the spawn tick');
  assert.equal(session.counts.toRelease, 0, 'sanity: already released (not masking the check)');
  for (let i = 0; i < EXIT_TICKS - 1; i++) {
    const events = session.step();
    assert.equal(
      events.filter((e) => e.type === 'goal-impossible').length,
      0,
      'must not fire while the sole mumble is mid-exit (it still counts as alive)',
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// End / auto-end (core-rules §F, CONTRACTS §2.4, LEVELS note 11)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('end: all released and nobody active -> all-resolved, both won and lost', () => {
  // Won: the only mumble is saved.
  {
    const exit = { x: 200, y: FLOOR };
    const session = new TestSession(makeLevel({ exits: [exit], saveRequired: 1, lemmings: 1 }));
    const lem = session.spawnAt(exit.x, exit.y);
    lem.state = 'blocking';
    lem.stateTicks = 0;
    const events = stepUntil(session, () => session.status === 'ended', 100);
    const outcome = (eventsOfType(events, 'level-ended')[0]!.event as { outcome: LevelOutcome }).outcome;
    assert.equal(outcome.reason, 'all-resolved');
    assert.equal(outcome.won, true);
  }
  // Lost: the only mumble dies.
  {
    const hazard = { kind: 'trap' as const, area: { x: 100, y: 143, w: 1, h: 8 }, cooldownTicks: 1000 };
    const session = new TestSession(makeLevel({ hazards: [hazard], saveRequired: 1, lemmings: 1 }));
    // Spawned 1px left so this tick's own walk (+1px, flat ground) lands it exactly on the trap.
    const lem = session.spawnAt(99, FLOOR);
    lem.state = 'walking';
    lem.stateTicks = 0;
    const events = stepUntil(session, () => session.status === 'ended', 100);
    const outcome = (eventsOfType(events, 'level-ended')[0]!.event as { outcome: LevelOutcome }).outcome;
    assert.equal(outcome.reason, 'all-resolved');
    assert.equal(outcome.won, false);
  }
});

test('end: a surviving blocker alone keeps the level running while something else can still change', () => {
  const level = makeLevel({ skills: { blocker: 1 }, lemmings: 2, saveRequired: 2, releaseRate: 53 /* slow: RR 1 */ });
  const session = new GameSession(level, {});
  // Release + assign the first lemming as a blocker while the second hasn't released yet.
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking');
  const assign = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  assert.deepEqual(assign, [{ type: 'skill-assigned', lemmingId: 0, skill: 'blocker' }]);
  assert.equal(session.lemmingById(0)?.state, 'blocking');
  // Not everyone has released yet (lemming 1 is still queued) -> must not auto-end.
  assert.ok(session.counts.toRelease > 0);
  const events = stepN(session, 20);
  assert.equal(eventsOfType(events, 'level-ended').length, 0, 'auto-end must wait for everyone to be released first');
  assert.equal(session.status, 'running');
});

test('auto-end: all released, not nuking, only blockers with no lit fuse remain -> all-resolved', () => {
  // Two entrances far apart, so the second mumble does not land inside the first blocker's field
  // (BLOCKER_FIELD is 12x12px) and get refused as a blocker-overlap.
  const entrances = [
    { x: 40, y: FLOOR },
    { x: 300, y: FLOOR },
  ];
  const level = makeLevel({ entrances, skills: { blocker: 2 }, lemmings: 2, saveRequired: 2, releaseRate: 99 });
  const session = new GameSession(level);
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking');
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  stepUntil(session, () => session.lemmingById(1)?.state === 'walking', 400);
  session.applyNow({ type: 'assign-skill', lemmingId: 1, skill: 'blocker' });
  assert.equal(session.counts.toRelease, 0, 'both released');
  assert.equal(session.lemmingById(0)?.state, 'blocking');
  assert.equal(session.lemmingById(1)?.state, 'blocking');
  const events = stepN(session, 5);
  const ended = eventsOfType(events, 'level-ended');
  assert.equal(ended.length, 1, 'auto-end should fire promptly once only blockers-with-no-fuse remain');
  const outcome = (ended[0]!.event as { outcome: LevelOutcome }).outcome;
  assert.equal(outcome.reason, 'all-resolved');
  assert.equal(session.status, 'ended');
});

test('auto-end: NOT while a blocker has a lit fuse', () => {
  const level = makeLevel({ skills: { blocker: 1, bomber: 1 }, lemmings: 1, saveRequired: 1, releaseRate: 99 });
  const session = new GameSession(level);
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking');
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'bomber' });
  assert.ok((session.lemmingById(0)?.fuseTicks ?? 0) > 0);
  assert.equal(session.counts.toRelease, 0);
  // Only one blocker remains, but its fuse is lit: must NOT auto-end while it counts down.
  const events = stepN(session, BOMB_FUSE_TICKS - 5);
  assert.equal(eventsOfType(events, 'level-ended').length, 0, 'auto-end must not fire while the sole blocker has a lit fuse');
  assert.equal(session.status, 'running');
  // It eventually resolves once the bomber actually explodes.
  const rest = stepUntil(session, () => session.status === 'ended', 200);
  assert.equal(eventsOfType(rest, 'level-ended').length, 1);
});

test('end: dying/exiting mumbles keep the level running until removed', () => {
  const hazard = { kind: 'water' as const, area: { x: 196, y: 143, w: 8, h: 8 }, cooldownTicks: 0 };
  const session = new TestSession(makeLevel({ hazards: [hazard], saveRequired: 1, lemmings: 1 }));
  const lem = session.spawnAt(200, 150);
  lem.state = 'blocking';
  lem.stateTicks = 0;
  session.step(); // now drowning
  for (let i = 0; i < DROWN_TICKS - 1; i++) {
    session.step();
    assert.equal(session.status, 'running', `still running while drowning animates (tick ${i})`);
  }
  session.step(); // removed on this tick
  assert.equal(session.status, 'ended');
});

test('end: after the level ends, step() does nothing, and applyNow(assign) is rejected level-ended', () => {
  // Long enough for the mumble to actually spawn (FIRST_SPAWN_TICK=54) and still be active when
  // time runs out, so the id we assign to afterwards genuinely exists (otherwise the rejection's
  // lemmingId would legitimately read back as null, per the no-lemming convention).
  const level = makeLevel({ timeLimitSeconds: 4, saveRequired: 1, lemmings: 1, skills: { climber: 1 } });
  const session = new GameSession(level);
  stepUntil(session, () => session.status === 'ended', 200);
  assert.ok(session.lemmingById(0), 'sanity: the mumble is still active (id 0) when time runs out');
  const tickAtEnd = session.tick;
  const countsAtEnd = session.counts;
  const events = session.step();
  assert.deepEqual(events, []);
  assert.equal(session.tick, tickAtEnd, 'step() after the end does not advance the tick');
  assert.deepEqual(session.counts, countsAtEnd);
  const rejected = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'climber' });
  assert.deepEqual(rejected, [{ type: 'skill-rejected', lemmingId: 0, skill: 'climber', reason: 'level-ended' }]);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Assignments: checkAssign purity/order, applyNow while paused, replay reproduction
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('checkAssign is pure: no events, no mutation, count unchanged, deterministic', () => {
  const session = new TestSession(makeLevel({ skills: { climber: 3 } }));
  const lem = session.spawnAt(40, FLOOR);
  lem.state = 'walking';
  lem.stateTicks = 0;
  const before = { ...session.skills };
  const r1 = session.checkAssign(lem.id, 'climber');
  const r2 = session.checkAssign(lem.id, 'climber');
  assert.deepEqual(r1, r2);
  assert.equal(r1, null, 'a plain walker accepts climber');
  assert.deepEqual(session.skills, before);
  assert.equal(session.lemmingById(lem.id)?.isClimber, false, 'checkAssign never mutates');
});

test('checkAssign order: level-ended beats everything, then no-lemming, then none-left, then the rule', () => {
  // level-ended beats no-lemming (a non-existent id, after the level has ended).
  {
    const level = makeLevel({ timeLimitSeconds: 1, saveRequired: 1, lemmings: 1 });
    const session = new GameSession(level);
    stepUntil(session, () => session.status === 'ended', 100);
    assert.deepEqual(session.checkAssign(999, 'climber'), { reason: 'level-ended' });
  }
  // no-lemming beats none-left (missing id, and the skill also has 0 left).
  {
    const session = new GameSession(makeLevel({ skills: { climber: 0 } }));
    assert.deepEqual(session.checkAssign(999, 'climber'), { reason: 'no-lemming' });
  }
  // none-left beats the rule (an otherwise-eligible walker, but 0 climbers left).
  {
    const session = new TestSession(makeLevel({ skills: { climber: 0 } }));
    const lem = session.spawnAt(40, FLOOR);
    lem.state = 'walking';
    lem.stateTicks = 0;
    assert.deepEqual(session.checkAssign(lem.id, 'climber'), { reason: 'none-left' });
  }
});

test('applyNow works between steps (paused): several apply in order, each against the state left by the earlier ones', () => {
  // Climber then Climber on the same mumble -> the 2nd is refused (already-climber).
  {
    const session = new TestSession(makeLevel({ skills: { climber: 5 } }));
    const lem = session.spawnAt(40, FLOOR);
    lem.state = 'walking';
    lem.stateTicks = 0;
    const e1 = session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'climber' });
    assert.deepEqual(e1, [{ type: 'skill-assigned', lemmingId: lem.id, skill: 'climber' }]);
    const e2 = session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'climber' });
    assert.deepEqual(e2, [{ type: 'skill-rejected', lemmingId: lem.id, skill: 'climber', reason: 'not-applicable', detail: 'already-climber' }]);
    assert.equal(session.skills.climber, 4, 'the refusal does not consume a second climber');
    assert.equal(session.tick, 0, 'no simulation time passed while paused');
    assert.deepEqual(
      session.replay().commands.map((c) => c.tick),
      [0, 0],
      'both applyNow commands are recorded at session.tick',
    );
  }
  // Climber then Floater on the same mumble -> both succeed (stacks into an "athlete").
  {
    const session = new TestSession(makeLevel({ skills: { climber: 1, floater: 1 } }));
    const lem = session.spawnAt(40, FLOOR);
    lem.state = 'walking';
    lem.stateTicks = 0;
    const e1 = session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'climber' });
    const e2 = session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'floater' });
    assert.deepEqual(e1, [{ type: 'skill-assigned', lemmingId: lem.id, skill: 'climber' }]);
    assert.deepEqual(e2, [{ type: 'skill-assigned', lemmingId: lem.id, skill: 'floater' }]);
    assert.equal(session.lemmingById(lem.id)?.isClimber, true);
    assert.equal(session.lemmingById(lem.id)?.isFloater, true);
  }
});

test('replay: replaying session.replay() commands with runHeadless reproduces the identical final snapshot', () => {
  const exit = { x: 200, y: FLOOR };
  const level = makeLevel({ exits: [exit], skills: { blocker: 1 }, lemmings: 2, saveRequired: 2, releaseRate: 40 });
  const session = new GameSession(level, { seed: 7 });
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking', 300);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'blocker' });
  session.enqueue({ type: 'adjust-release-rate', delta: 5 }, session.tick + 5);
  stepUntil(session, () => session.status === 'ended', 3000);

  const replay = session.replay();
  const replayed = runHeadless(level, { seed: replay.seed, relaxedTimer: replay.relaxedTimer, commands: replay.commands, maxTicks: session.tick + 1 });

  assert.deepEqual(replayed.session.snapshot(), session.snapshot());
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Blocker field (core-rules §F, RESEARCH §2.4)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('blocker field: turns a lemming whose foot is 1..8px from the blocker within B.y-6..B.y+5; dx=0 is neutral', () => {
  // Extra thin ledges so the subject is genuinely supported at every y row under test (144 and
  // 156 are otherwise empty air above/below the main floor, which would make a 'building' probe
  // there lose ground and revert to falling before the field is even applied).
  const level = makeLevel({
    boxes: [
      { x: 90, y: 143, w: 30, h: 2 }, // rows 143-144
      { x: 90, y: 155, w: 30, h: 2 }, // rows 155-156
    ],
  });
  function turnedDir(dx: number, dy: number, startDir: 1 | -1): 1 | -1 {
    const session = new TestSession(level);
    const blocker = session.spawnAt(100, FLOOR);
    blocker.state = 'blocking';
    blocker.stateTicks = 5;
    const subject = session.spawnAt(100 + dx, FLOOR + dy);
    subject.state = 'building'; // in BLOCKER_TURN_STATES; a fresh (stateTicks 1) builder does not move
    subject.stateTicks = 0;
    subject.dir = startDir;
    subject.bricksLeft = 12;
    session.step();
    return session.lemmingById(subject.id)!.dir;
  }
  // dx in range, same row as the blocker (dy=0): always turned to point away from the blocker.
  for (const dx of [1, 3, 8]) assert.equal(turnedDir(dx, 0, -1), 1, `dx=${dx}`);
  for (const dx of [-1, -3, -8]) assert.equal(turnedDir(dx, 0, 1), -1, `dx=${dx}`);
  // dx = 0: neutral middle column, dir is left unchanged.
  assert.equal(turnedDir(0, 0, 1), 1);
  assert.equal(turnedDir(0, 0, -1), -1);
  // out of reach (|dx| = 9): no turn.
  assert.equal(turnedDir(9, 0, -1), -1);
  assert.equal(turnedDir(-9, 0, 1), 1);
  // y row window B.y-6..B.y+5: -6 turns, -7 does not; +5 turns, +6 does not.
  assert.equal(turnedDir(5, -6, -1), 1, 'dy=-6 (top edge, inclusive)');
  assert.equal(turnedDir(5, -7, -1), -1, 'dy=-7 (just outside)');
  assert.equal(turnedDir(5, 5, -1), 1, 'dy=+5 (bottom edge, inclusive)');
  assert.equal(turnedDir(5, 6, -1), -1, 'dy=+6 (just outside)');
});

test('blocker field: a blocker that goes ohno keeps its field until it explodes', () => {
  const session = new TestSession(makeLevel({ skills: { blocker: 1, bomber: 1 } }));
  const blocker = session.spawnAt(100, FLOOR);
  blocker.state = 'walking';
  blocker.stateTicks = 0;
  const assignBlock = session.applyNow({ type: 'assign-skill', lemmingId: blocker.id, skill: 'blocker' });
  assert.deepEqual(assignBlock, [{ type: 'skill-assigned', lemmingId: blocker.id, skill: 'blocker' }]);
  const assignBomb = session.applyNow({ type: 'assign-skill', lemmingId: blocker.id, skill: 'bomber' });
  assert.deepEqual(assignBomb, [{ type: 'skill-assigned', lemmingId: blocker.id, skill: 'bomber' }]);

  const subject = session.spawnAt(500, FLOOR); // parked far away for now
  subject.state = 'building';
  subject.stateTicks = 0;
  subject.dir = -1;
  subject.bricksLeft = 12;

  // While still `blocking` (fuse lit but not yet expired): field applies normally.
  session.step();
  subject.x = 105;
  subject.y = FLOOR;
  subject.stateTicks = 0; // re-freeze: a fresh tick in `building` does not move on its own
  session.step();
  assert.equal(session.lemmingById(subject.id)!.dir, 1, 'field turns the subject while genuinely blocking');
  subject.x = 500; // move it back out of range before the fuse actually runs out
  subject.dir = -1;

  // Run the fuse down to 0 (BOMB_FUSE_TICKS total from assignment; 2 ticks already ran above).
  for (let i = 0; i < BOMB_FUSE_TICKS - 2; i++) session.step();
  assert.equal(session.lemmingById(blocker.id)?.state, 'ohno', 'fuse expired into ohno');

  subject.x = 105;
  subject.y = FLOOR;
  subject.stateTicks = 0;
  subject.dir = -1;
  session.step();
  assert.equal(session.lemmingById(subject.id)!.dir, 1, 'the field persists through ohno');
  subject.x = 500;
  subject.dir = -1;

  // Run out the remaining ohno ticks until it explodes and is removed.
  for (let i = 0; i < OHNO_TICKS && session.lemmingById(blocker.id); i++) session.step();
  assert.equal(session.lemmingById(blocker.id), undefined, 'exploded and removed');

  subject.x = 105;
  subject.y = FLOOR;
  subject.stateTicks = 0;
  subject.dir = -1;
  session.step();
  assert.equal(session.lemmingById(subject.id)!.dir, -1, 'no blocker left, so no field, so no turn');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Counts consistency (core-rules §F: out = released - saved - dead)
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('counts: total/toRelease/saved/dead/out stay consistent at every step of a mixed run', () => {
  const exit = { x: 380, y: FLOOR };
  const hazard = { kind: 'trap' as const, area: { x: 150, y: 143, w: 1, h: 8 }, cooldownTicks: 60 };
  const level = makeLevel({ exits: [exit], hazards: [hazard], lemmings: 6, saveRequired: 6, releaseRate: 60 });
  const session = new GameSession(level);
  for (let i = 0; i < 3000 && session.status === 'running'; i++) {
    session.step();
    const c = session.counts;
    assert.equal(c.total, 6);
    assert.equal(c.required, 6);
    // This run never nukes, so toRelease is plainly total - released throughout, and
    // out = released - saved - dead (core-rules §F) becomes directly checkable:
    assert.equal(session.nuking, false);
    const released = c.total - c.toRelease;
    assert.equal(c.out, released - c.saved - c.dead, `tick ${session.tick}`);
    assert.ok(c.saved + c.dead <= c.total);
    assert.ok(c.out >= 0);
  }
});

test('counts: out = released - saved - dead holds during nuking too (toRelease reads 0 regardless of the true released count)', () => {
  const level = makeLevel({ lemmings: 8, saveRequired: 8, releaseRate: 99 });
  const session = new GameSession(level);
  let released = 0;
  for (let i = 0; i < 3000 && session.status === 'running'; i++) {
    const events = session.step();
    released += events.filter((e) => e.type === 'lemming-spawned').length;
    if (!session.nuking && released >= 3) session.applyNow({ type: 'nuke' });
    const c = session.counts;
    if (session.nuking) assert.equal(c.toRelease, 0, 'counts.toRelease is 0 while nuking, regardless of released');
    assert.equal(c.out, released - c.saved - c.dead, `tick ${session.tick}`);
  }
  assert.ok(released < 8, 'sanity: nuking cut the release short (not everyone was ever spawned)');
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Determinism
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('determinism: the same level + seed + commands run twice produce identical snapshots at several ticks and identical event logs', () => {
  const exit = { x: 350, y: FLOOR };
  const hazard = { kind: 'trap' as const, area: { x: 150, y: 143, w: 1, h: 8 }, cooldownTicks: 40 };
  const level = makeLevel({ exits: [exit], hazards: [hazard], skills: { blocker: 1, builder: 2 }, lemmings: 5, saveRequired: 5, releaseRate: 50 });
  const commands: { tick: number; command: GameCommand }[] = [
    { tick: 60, command: { type: 'assign-skill', lemmingId: 0, skill: 'builder' } },
    { tick: 90, command: { type: 'set-release-rate', rate: 80 } },
    { tick: 150, command: { type: 'assign-skill', lemmingId: 1, skill: 'blocker' } },
  ];
  const checkpoints = [60, 100, 200, 400];
  function run(): { snaps: GameSnapshot[]; events: readonly { tick: number; event: GameEvent }[] } {
    const session = new GameSession(level, { seed: 7 });
    for (const c of commands) session.enqueue(c.command, c.tick);
    const snaps: GameSnapshot[] = [];
    const events: { tick: number; event: GameEvent }[] = [];
    for (let i = 0; i < 500 && session.status === 'running'; i++) {
      const tick = session.tick;
      for (const event of session.step()) events.push({ tick, event });
      if (checkpoints.includes(session.tick)) snaps.push(session.snapshot());
    }
    return { snaps, events };
  }
  const r1 = run();
  const r2 = run();
  assert.equal(r1.snaps.length >= 2, true, 'sanity: the run reaches at least two checkpoints');
  assert.deepEqual(r1.snaps, r2.snaps);
  assert.deepEqual(r1.events, r2.events);
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Performance smoke
// ═══════════════════════════════════════════════════════════════════════════════════════════

test('performance: 80 mumbles x 5000 ticks with skills assigned runs in well under 1s', () => {
  const skillIds: SkillId[] = ['climber', 'floater', 'blocker', 'builder', 'basher', 'miner', 'digger', 'bomber'];
  const level = makeLevel({
    width: 400,
    lemmings: 80,
    saveRequired: 80,
    releaseRate: 99,
    timeLimitSeconds: 400, // 6800 ticks > 5000, so the clock doesn't cut the run short
    skills: { climber: 10, floater: 10, blocker: 5, builder: 10, basher: 10, miner: 5, digger: 5, bomber: 5 },
  });
  const commands: { tick: number; command: GameCommand }[] = [];
  for (let i = 0; i < 20; i++) {
    commands.push({ tick: 60 + i * 5, command: { type: 'assign-skill', lemmingId: i, skill: skillIds[i % skillIds.length]! } });
  }
  const start = performance.now();
  const result = runHeadless(level, { commands, maxTicks: 5000 });
  const elapsedMs = performance.now() - start;
  console.log(`performance smoke: 80 mumbles x 5000 ticks in ${elapsedMs.toFixed(1)}ms`);
  assert.equal(result.session.tick, 5000);
  assert.ok(elapsedMs < 1000, `expected < 1000ms, got ${elapsedMs.toFixed(1)}ms`);
});
