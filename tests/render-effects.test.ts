/**
 * Spec-derived tests for `render/effects.ts` against DESIGN.md §3.5 (Effects) and RENDER-PLAN.md
 * §3.3 (exact effect rules, including the render-lead's tick-convention correction). Independent
 * validation (render-v1a): uses a hand-built fake `EffectPainter` and a minimal `GameView`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Terrain } from '../src/core/terrain.ts';
import type { CompiledLevel, GameEvent, GameView, Lemming, SkillCounts } from '../src/core/types.ts';
import { BurstLimiter, ParticleSystem } from '../src/render/particles.ts';
import { Effects, type EffectOptions, type EffectPainter } from '../src/render/effects.ts';
import type { PixelTarget } from '../src/render/pixel-target.ts';

// ─── Fakes ──────────────────────────────────────────────────────────────────────────────────
type Call =
  | { m: 'popStar'; x: number; y: number }
  | { m: 'dustPuff'; x: number; y: number }
  | { m: 'steelSpark'; x: number; y: number; frame: number }
  | { m: 'refusal'; x: number; y: number }
  | { m: 'assignRing'; x: number; y: number; frame: number }
  | { m: 'pixel'; x: number; y: number; w: number; h: number; key: string };

class FakePainter implements EffectPainter {
  readonly calls: Call[] = [];
  popStar(x: number, y: number): void {
    this.calls.push({ m: 'popStar', x, y });
  }
  dustPuff(cx: number, cy: number): void {
    this.calls.push({ m: 'dustPuff', x: cx, y: cy });
  }
  steelSpark(cx: number, cy: number, frame: number): void {
    this.calls.push({ m: 'steelSpark', x: cx, y: cy, frame });
  }
  refusal(cx: number, cy: number): void {
    this.calls.push({ m: 'refusal', x: cx, y: cy });
  }
  assignRing(cx: number, cy: number, frame: number): void {
    this.calls.push({ m: 'assignRing', x: cx, y: cy, frame });
  }
  pixel(x: number, y: number, w: number, h: number, paletteKey: string): void {
    this.calls.push({ m: 'pixel', x, y, w, h, key: paletteKey });
  }
}

function emptySkills(): SkillCounts {
  return { climber: 0, floater: 0, bomber: 0, blocker: 0, builder: 0, basher: 0, miner: 0, digger: 0 };
}

function makeLemming(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 0,
    x: 0,
    y: 0,
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

function makeLevel(overrides: Partial<CompiledLevel> = {}): CompiledLevel {
  return {
    id: 'test',
    width: 400,
    height: 160,
    terrain: new Terrain(400, 160),
    entrances: [],
    exits: [],
    hazards: [],
    lemmingCount: 0,
    saveRequired: 0,
    releaseRate: 50,
    timeLimitTicks: 1000,
    skills: emptySkills(),
    seed: 1,
    brickColor: 0,
    themeId: 'mossgrove',
    ...overrides,
  };
}

function makeView(tick: number, lemmings: readonly Lemming[] = [], level: CompiledLevel = makeLevel()): GameView {
  return {
    level,
    terrain: level.terrain,
    tick,
    status: 'running',
    lemmings,
    releaseRate: 50,
    timeLeftTicks: 1000,
    nuking: false,
    skills: emptySkills(),
    counts: { total: lemmings.length, toRelease: 0, out: lemmings.length, saved: 0, dead: 0, required: 0 },
    outcome: null,
    hazardCooldowns: level.hazards.map(() => 0),
    overtimeTicks: 0,
  };
}

const alwaysInView = () => true;
function options(overrides: Partial<EffectOptions> = {}): EffectOptions {
  return { reducedMotion: false, nowMs: 0, inView: alwaysInView, ...overrides };
}

function newEffects(): { effects: Effects; particles: ParticleSystem; limiter: BurstLimiter } {
  const particles = new ParticleSystem();
  const limiter = new BurstLimiter();
  const effects = new Effects(particles, limiter);
  effects.setLevel(makeLevel());
  return { effects, particles, limiter };
}

// ─── Explosion (DESIGN §3.5 + RENDER-PLAN §3.3) ────────────────────────────────────────────────
test('explosion: pop star draws for ages 0–2 only, then stops', () => {
  const { effects } = newEffects();
  const painter = new FakePainter();
  const event: GameEvent = { type: 'explosion', lemmingId: 1, x: 50, y: 60 };
  const view0 = makeView(10);
  effects.handleEvents([event], 9, view0, options());

  for (const tick of [10, 11, 12]) {
    painter.calls.length = 0;
    effects.draw(painter, makeView(tick), options());
    const stars = painter.calls.filter((c) => c.m === 'popStar');
    assert.equal(stars.length, 1, `age ${tick - 10}`);
    assert.deepEqual(stars[0], { m: 'popStar', x: 50, y: 60 });
  }
  painter.calls.length = 0;
  effects.draw(painter, makeView(13), options());
  assert.equal(painter.calls.filter((c) => c.m === 'popStar').length, 0, 'age 3: no more pop star');
});

test('explosion (normal): confetti begins at T + 3, not before, seeded at (x, y − 4)', () => {
  const { effects, particles } = newEffects();
  const view0 = makeView(10); // T = view.tick = 10
  effects.handleEvents([{ type: 'explosion', lemmingId: 1, x: 50, y: 60 }], 9, view0, options());

  class Recorder implements PixelTarget {
    fillStyle: unknown = undefined;
    calls: { x: number; y: number }[] = [];
    fillRect(x: number, y: number, _w: number, _h: number): void {
      this.calls.push({ x, y });
    }
  }
  const before = new Recorder();
  particles.draw(before, 12, 0, 0, 2000, 2000); // age (12-13) = -1: not yet spawned
  assert.equal(before.calls.length, 0);

  const at = new Recorder();
  particles.draw(at, 13, 0, 0, 2000, 2000); // T+3 = 13: spawn tick, age 0
  assert.equal(at.calls.length, 24);
  for (const c of at.calls) assert.equal(c.y, 60 - 4, 'spawned at y − 4');
});

test('explosion (reduced motion): no particles are spawned; a static dust puff shows for ages 3–8', () => {
  const { effects, particles } = newEffects();
  const view0 = makeView(10);
  effects.handleEvents([{ type: 'explosion', lemmingId: 1, x: 50, y: 60 }], 9, view0, options({ reducedMotion: true }));

  assert.equal(particles.liveCount(1000), 0, 'reduced motion never spawns confetti');

  const painter = new FakePainter();
  for (let age = 0; age <= 10; age++) {
    painter.calls.length = 0;
    effects.draw(painter, makeView(10 + age), options({ reducedMotion: true }));
    const puffs = painter.calls.filter((c) => c.m === 'dustPuff');
    if (age >= 3 && age <= 8) {
      assert.deepEqual(puffs, [{ m: 'dustPuff', x: 50, y: 60 - 3 }], `age ${age}`);
    } else {
      assert.equal(puffs.length, 0, `age ${age}`);
    }
  }
});

test('explosion: the 4th within the same rolling second (in view) gets no pop star but still gets confetti', () => {
  const { effects, particles } = newEffects();
  const opts = options({ nowMs: 0 });
  for (let i = 0; i < 3; i++) {
    effects.handleEvents(
      [{ type: 'explosion', lemmingId: i, x: 10 + i, y: 10 }],
      0,
      makeView(0),
      { ...opts, nowMs: i * 10 },
    );
  }
  // First three should each get a pop star.
  const painterAll = new FakePainter();
  effects.draw(painterAll, makeView(0), opts);
  assert.equal(painterAll.calls.filter((c) => c.m === 'popStar').length, 3, 'first three explosions get a star');

  // 4th explosion, still within 1000ms of the first three, same view.
  effects.handleEvents([{ type: 'explosion', lemmingId: 3, x: 99, y: 10 }], 0, makeView(0), { ...opts, nowMs: 30 });
  const painterAfter = new FakePainter();
  effects.draw(painterAfter, makeView(0), opts);
  assert.equal(painterAfter.calls.filter((c) => c.m === 'popStar').length, 3, 'still only 3 stars, not 4');

  // But confetti still spawns for the 4th (crater + confetti only, per DESIGN §3.5).
  assert.equal(particles.liveCount(3), 4 * 24, 'all four explosions spawned confetti (24 each)');
});

test('explosion outside the view: no pop star, but confetti still spawns (crater + confetti only)', () => {
  const { effects, particles } = newEffects();
  effects.handleEvents([{ type: 'explosion', lemmingId: 1, x: 500, y: 60 }], 9, makeView(10), options({ inView: () => false }));
  const painter = new FakePainter();
  for (let age = 0; age <= 2; age++) {
    effects.draw(painter, makeView(10 + age), options({ inView: () => false }));
  }
  assert.equal(painter.calls.filter((c) => c.m === 'popStar').length, 0);
  assert.equal(particles.liveCount(13), 24, 'confetti spawns regardless of inView');
});

// ─── Steel spark (DESIGN §3.5: basher/miner/digger contact points) ─────────────────────────────
test('hit-steel: basher contact point (x+8·dir, y−5), 4 ticks, frames 0,0,1,1', () => {
  const { effects } = newEffects();
  // Seed "job as of end of previous tick" = basher, by running an empty handleEvents first.
  const lemBashing = makeLemming({ id: 7, x: 30, y: 40, dir: 1, state: 'bashing' });
  effects.handleEvents([], 4, makeView(5, [lemBashing]), options());

  // Now the event arrives; the lemming may already have moved on to walking.
  const lemNow = makeLemming({ id: 7, x: 30, y: 40, dir: 1, state: 'walking' });
  const view = makeView(6, [lemNow]);
  effects.handleEvents([{ type: 'hit-steel', lemmingId: 7, x: 30, y: 40 }], 5, view, options());

  const expectedX = 30 + 8 * 1;
  const expectedY = 40 - 5;
  const expectedFrames = [0, 0, 1, 1];
  for (let age = 0; age <= 3; age++) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(6 + age, [lemNow]), options());
    const sparks = painter.calls.filter((c) => c.m === 'steelSpark');
    assert.equal(sparks.length, 1, `age ${age}`);
    assert.deepEqual(sparks[0], { m: 'steelSpark', x: expectedX, y: expectedY, frame: expectedFrames[age] ?? 0 });
  }
  const painterEnd = new FakePainter();
  effects.draw(painterEnd, makeView(10, [lemNow]), options());
  assert.equal(painterEnd.calls.filter((c) => c.m === 'steelSpark').length, 0, 'age 4: spark is gone');
});

test('hit-steel: miner contact point (x+6·dir, y−2)', () => {
  const { effects } = newEffects();
  const mining = makeLemming({ id: 2, x: 20, y: 50, dir: -1, state: 'mining' });
  effects.handleEvents([], 0, makeView(1, [mining]), options());
  const view = makeView(2, [mining]);
  effects.handleEvents([{ type: 'hit-steel', lemmingId: 2, x: 20, y: 50 }], 1, view, options());
  const painter = new FakePainter();
  effects.draw(painter, makeView(2, [mining]), options());
  assert.deepEqual(painter.calls[0], { m: 'steelSpark', x: 20 + 6 * -1, y: 50 - 2, frame: 0 });
});

test('hit-steel: digger contact point (x, y)', () => {
  const { effects } = newEffects();
  const digging = makeLemming({ id: 3, x: 70, y: 90, dir: 1, state: 'digging' });
  effects.handleEvents([], 0, makeView(1, [digging]), options());
  const view = makeView(2, [digging]);
  effects.handleEvents([{ type: 'hit-steel', lemmingId: 3, x: 70, y: 90 }], 1, view, options());
  const painter = new FakePainter();
  effects.draw(painter, makeView(2, [digging]), options());
  assert.deepEqual(painter.calls[0], { m: 'steelSpark', x: 70, y: 90, frame: 0 });
});

test('skill-rejected reason "steel" also sparks at the job\'s contact point (from event.skill)', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 5, x: 40, y: 40, dir: 1, state: 'walking' });
  const view = makeView(20, [lem]);
  const event: GameEvent = { type: 'skill-rejected', lemmingId: 5, skill: 'basher', reason: 'steel' };
  effects.handleEvents([event], 19, view, options());
  const painter = new FakePainter();
  effects.draw(painter, makeView(20, [lem]), options());
  const sparks = painter.calls.filter((c) => c.m === 'steelSpark');
  assert.equal(sparks.length, 1);
  assert.deepEqual(sparks[0], { m: 'steelSpark', x: 40 + 8 * 1, y: 40 - 5, frame: 0 });
});

test('steel spark in reduced motion: frame 0 for all 4 ticks', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 9, x: 0, y: 0, dir: 1, state: 'digging' });
  effects.handleEvents([], 0, makeView(1, [lem]), options({ reducedMotion: true }));
  effects.handleEvents(
    [{ type: 'hit-steel', lemmingId: 9, x: 0, y: 0 }],
    1,
    makeView(2, [lem]),
    options({ reducedMotion: true }),
  );
  for (let age = 0; age <= 3; age++) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(2 + age, [lem]), options({ reducedMotion: true }));
    const spark = painter.calls.find((c) => c.m === 'steelSpark');
    assert.ok(spark && spark.m === 'steelSpark' && spark.frame === 0, `age ${age}`);
  }
});

// ─── Refusal ✕ (DESIGN §3.5) ────────────────────────────────────────────────────────────────────
test('refusal ✕: centred 4px above the frame top, for 12 ticks, following the lemming', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 3, x: 20, y: 30, state: 'walking' }); // walking footY = 10
  const view = makeView(50, [lem]);
  const event: GameEvent = { type: 'skill-rejected', lemmingId: 3, skill: 'digger', reason: 'not-applicable' };
  effects.handleEvents([event], 49, view, options({ nowMs: 0 }));

  const expected = { x: 20, y: 30 - 10 - 4 };
  for (let age = 0; age <= 11; age++) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(50 + age, [lem]), options({ nowMs: age * 10 }));
    const marks = painter.calls.filter((c) => c.m === 'refusal');
    assert.equal(marks.length, 1, `age ${age}`);
    assert.deepEqual(marks[0], { m: 'refusal', ...expected });
  }
  const painterEnd = new FakePainter();
  effects.draw(painterEnd, makeView(62, [lem]), options({ nowMs: 120 }));
  assert.equal(painterEnd.calls.filter((c) => c.m === 'refusal').length, 0, 'age 12: gone');
});

test('refusal ✕ also expires after 600ms of wall time even if the tick has not advanced (paused)', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 4, x: 0, y: 20, state: 'walking' });
  const view = makeView(5, [lem]);
  effects.handleEvents(
    [{ type: 'skill-rejected', lemmingId: 4, skill: 'digger', reason: 'not-applicable' }],
    4,
    view,
    options({ nowMs: 0 }),
  );
  // Same tick (paused), but 650ms of wall time have passed.
  const painter = new FakePainter();
  effects.draw(painter, makeView(5, [lem]), options({ nowMs: 650 }));
  assert.equal(painter.calls.filter((c) => c.m === 'refusal').length, 0, 'expired by wall time while paused');
});

test('refusal ✕: none for reason "level-ended"', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 6, x: 0, y: 0, state: 'walking' });
  effects.handleEvents(
    [{ type: 'skill-rejected', lemmingId: 6, skill: 'digger', reason: 'level-ended' }],
    0,
    makeView(1, [lem]),
    options(),
  );
  const painter = new FakePainter();
  effects.draw(painter, makeView(1, [lem]), options());
  assert.equal(painter.calls.filter((c) => c.m === 'refusal').length, 0);
});

test('refusal ✕: none when lemmingId is null', () => {
  const { effects } = newEffects();
  effects.handleEvents(
    [{ type: 'skill-rejected', lemmingId: null, skill: 'digger', reason: 'none-left' }],
    0,
    makeView(1, []),
    options(),
  );
  const painter = new FakePainter();
  effects.draw(painter, makeView(1, []), options());
  assert.equal(painter.calls.filter((c) => c.m === 'refusal').length, 0);
});

// ─── Assign ring (DESIGN §3.5) ──────────────────────────────────────────────────────────────────
test('skill-assigned: assignRing centred (x, y−5), 4 ticks (frames 0,0,1,1)', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 8, x: 12, y: 34, state: 'walking' });
  effects.handleEvents([{ type: 'skill-assigned', lemmingId: 8, skill: 'blocker' }], 0, makeView(1, [lem]), options());
  const expectedFrames = [0, 0, 1, 1];
  for (let age = 0; age <= 3; age++) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(1 + age, [lem]), options());
    const rings = painter.calls.filter((c) => c.m === 'assignRing');
    assert.equal(rings.length, 1, `age ${age}`);
    assert.deepEqual(rings[0], { m: 'assignRing', x: 12, y: 34 - 5, frame: expectedFrames[age] ?? 0 });
  }
  const painterEnd = new FakePainter();
  effects.draw(painterEnd, makeView(5, [lem]), options());
  assert.equal(painterEnd.calls.filter((c) => c.m === 'assignRing').length, 0, 'age 4: gone');
});

test('assign ring is omitted entirely in reduced motion', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 8, x: 12, y: 34, state: 'walking' });
  effects.handleEvents(
    [{ type: 'skill-assigned', lemmingId: 8, skill: 'blocker' }],
    0,
    makeView(1, [lem]),
    options({ reducedMotion: true }),
  );
  for (let age = 0; age <= 3; age++) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(1 + age, [lem]), options({ reducedMotion: true }));
    assert.equal(painter.calls.filter((c) => c.m === 'assignRing').length, 0, `age ${age}`);
  }
});

// ─── Tick convention (RENDER-PLAN §3.3): records stamp T = view.tick read INSIDE handleEvents,
// never the `tick` argument — so the first drawn frame after the event is age 0. ────────────────
test('effects are stamped from view.tick, not the handleEvents `tick` argument', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 1, x: 0, y: 0, state: 'walking' });
  const view = makeView(50, [lem]); // view.tick = 50, deliberately far from the tick argument below
  effects.handleEvents([{ type: 'skill-assigned', lemmingId: 1, skill: 'blocker' }], 999, view, options());

  const painterAtViewTick = new FakePainter();
  effects.draw(painterAtViewTick, makeView(50, [lem]), options()); // age 0 relative to view.tick
  assert.equal(painterAtViewTick.calls.filter((c) => c.m === 'assignRing').length, 1);

  const painterAtArgTick = new FakePainter();
  effects.draw(painterAtArgTick, makeView(999, [lem]), options()); // if T were 999, this would be age 0 instead
  assert.equal(painterAtArgTick.calls.filter((c) => c.m === 'assignRing').length, 0, 'long past age 3 relative to view.tick 50');
});

// ─── Trap leaf (DESIGN §3.5: "one yellow tuft pixel pair t floats 8px up over 12 ticks") ────────
test('trap-triggered: a 2×1 "t" pixel pair rises 8px over 12 ticks from the trap anchor', () => {
  const { effects } = newEffects();
  const level = makeLevel({ hazards: [{ kind: 'trap', area: { x: 100, y: 50, w: 16, h: 16 }, cooldownTicks: 0 }] });
  const view = makeView(10, [], level);
  effects.handleEvents([{ type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 }], 9, view, options());
  const ax = Math.floor(100 + 16 / 2); // 108
  const ay = 50 + 16; // 66
  for (const age of [0, 6, 11]) {
    const painter = new FakePainter();
    effects.draw(painter, makeView(10 + age, [], level), options());
    const leaves = painter.calls.filter((c) => c.m === 'pixel' && c.key === 't');
    assert.equal(leaves.length, 1, `age ${age}`);
    const p = leaves[0] as Extract<Call, { m: 'pixel' }>;
    assert.equal(p.w, 2);
    assert.equal(p.h, 1);
    assert.equal(p.x, ax - 1);
    assert.equal(p.y, ay - 12 - Math.floor((age * 8) / 12));
  }
  const painterEnd = new FakePainter();
  effects.draw(painterEnd, makeView(22, [], level), options());
  assert.equal(painterEnd.calls.filter((c) => c.m === 'pixel' && c.key === 't').length, 0, 'age 12: gone');
});

test('trap leaf is omitted in reduced motion', () => {
  const { effects } = newEffects();
  const level = makeLevel({ hazards: [{ kind: 'trap', area: { x: 0, y: 0, w: 16, h: 16 }, cooldownTicks: 0 }] });
  effects.handleEvents(
    [{ type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 }],
    0,
    makeView(1, [], level),
    options({ reducedMotion: true }),
  );
  const painter = new FakePainter();
  effects.draw(painter, makeView(1, [], level), options({ reducedMotion: true }));
  assert.equal(painter.calls.filter((c) => c.m === 'pixel' && c.key === 't').length, 0);
});

// ─── Splat dust (DESIGN §3.5, stateless: read off view.lemmings) ────────────────────────────────
test('splat dust: 4 "k" pixels drift up while state === splatting and stateTicks ≤ 6', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 1, x: 50, y: 60, state: 'splatting', stateTicks: 3 });
  const painter = new FakePainter();
  effects.draw(painter, makeView(0, [lem]), options());
  const dust = painter.calls.filter((c) => c.m === 'pixel' && c.key === 'k');
  assert.equal(dust.length, 4);
  const dy = Math.min(2, Math.floor(3 / 3)); // stateTicks 3 → dy 1
  const xs = dust.map((c) => (c as Extract<Call, { m: 'pixel' }>).x).sort((a, b) => a - b);
  assert.deepEqual(xs, [46, 48, 52, 54]);
  for (const c of dust) {
    const p = c as Extract<Call, { m: 'pixel' }>;
    if (p.x === 46 || p.x === 54) assert.equal(p.y, 60 - 1 - dy);
    else assert.equal(p.y, 60 - 2 - dy);
  }
});

test('splat dust stops once stateTicks > 6', () => {
  const { effects } = newEffects();
  const lem = makeLemming({ id: 1, x: 0, y: 0, state: 'splatting', stateTicks: 7 });
  const painter = new FakePainter();
  effects.draw(painter, makeView(0, [lem]), options());
  assert.equal(painter.calls.filter((c) => c.m === 'pixel' && c.key === 'k').length, 0);
});

// ─── Drown ripple (DESIGN §3.5, stateless) ──────────────────────────────────────────────────────
test('drown ripple: a "c" line on the pool surface, 3px wide (ticks 0–2) then 5px (ticks 3–5)', () => {
  const { effects } = newEffects();
  const level = makeLevel({ hazards: [{ kind: 'water', area: { x: 0, y: 100, w: 200, h: 40 }, cooldownTicks: 0 }] });
  const lemEarly = makeLemming({ id: 1, x: 50, y: 100, state: 'drowning', stateTicks: 1 });
  const painterEarly = new FakePainter();
  effects.draw(painterEarly, makeView(0, [lemEarly], level), options());
  const early = painterEarly.calls.find((c) => c.m === 'pixel' && c.key === 'c') as Extract<Call, { m: 'pixel' }>;
  assert.ok(early);
  assert.equal(early.w, 3);
  assert.equal(early.y, 100);
  assert.equal(early.x, 50 - 1);

  const lemLate = makeLemming({ id: 1, x: 50, y: 100, state: 'drowning', stateTicks: 4 });
  const painterLate = new FakePainter();
  effects.draw(painterLate, makeView(0, [lemLate], level), options());
  const late = painterLate.calls.find((c) => c.m === 'pixel' && c.key === 'c') as Extract<Call, { m: 'pixel' }>;
  assert.ok(late);
  assert.equal(late.w, 5);
  assert.equal(late.x, 50 - 2);
});

test('drown ripple stops once stateTicks >= 6', () => {
  const { effects } = newEffects();
  const level = makeLevel({ hazards: [{ kind: 'water', area: { x: 0, y: 100, w: 200, h: 40 }, cooldownTicks: 0 }] });
  const lem = makeLemming({ id: 1, x: 50, y: 100, state: 'drowning', stateTicks: 6 });
  const painter = new FakePainter();
  effects.draw(painter, makeView(0, [lem], level), options());
  assert.equal(painter.calls.filter((c) => c.m === 'pixel' && c.key === 'c').length, 0);
});
