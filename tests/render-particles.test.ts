/**
 * Spec-derived tests for `render/particles.ts` (explosion confetti pool + the §7.8 burst
 * limiter) against DESIGN.md §3.5 (Explosion / Pop all) and §7.8, plus RENDER-PLAN.md §3.2's
 * exact analytic-position formula. Independent validation (render-v1a).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MUMBLE_PALETTE } from '../src/art/palette.ts';
import {
  BurstLimiter,
  mulberry32,
  PARTICLE_CAP,
  PARTICLE_COLORS,
  PARTICLES_OVER_CAP,
  PARTICLES_PER_BURST,
  ParticleSystem,
} from '../src/render/particles.ts';
import type { PixelTarget } from '../src/render/pixel-target.ts';

class FakeTarget implements PixelTarget {
  fillStyle: unknown = '#000000';
  readonly calls: { x: number; y: number; w: number; h: number; style: unknown }[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ x, y, w, h, style: this.fillStyle });
  }
}

test('constants match DESIGN §3.5 / §7.8', () => {
  assert.equal(PARTICLE_CAP, 256);
  assert.equal(PARTICLES_PER_BURST, 24);
  assert.equal(PARTICLES_OVER_CAP, 6);
  assert.deepEqual([...PARTICLE_COLORS], ['t', 'b', 'c', 'w', 'T']);
});

test('mulberry32 is deterministic: same seed → same sequence, forever', () => {
  const a = mulberry32(1234);
  const b = mulberry32(1234);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
  for (const v of seqA) assert.ok(v >= 0 && v < 1);
});

test('spawnExplosion returns exactly 24 particles when the pool has room', () => {
  const sys = new ParticleSystem();
  const n = sys.spawnExplosion(1, 100, 100, 0);
  assert.equal(n, 24);
  assert.equal(sys.liveCount(0), 24);
});

test('spawnExplosion returns only 6 once live + 24 would exceed the 256 cap', () => {
  const sys = new ParticleSystem(); // default capacity 256
  let total = 0;
  let lastReturned = 0;
  let id = 1;
  // 24 fits until live + 24 > 256: after 9 bursts of 24 we're at 216 (216+24=240 ≤ 256 → still 24).
  for (let i = 0; i < 9; i++) {
    lastReturned = sys.spawnExplosion(id++, 0, 0, 0);
    assert.equal(lastReturned, 24, `burst ${i}`);
    total += lastReturned;
  }
  assert.equal(total, 216);
  assert.equal(sys.liveCount(0), 216);
  // 216 + 24 = 240 ≤ 256 → still a full burst of 24.
  lastReturned = sys.spawnExplosion(id++, 0, 0, 0);
  assert.equal(lastReturned, 24);
  total += lastReturned; // 240
  // 240 + 24 = 264 > 256 → only 6 spawned from here on.
  lastReturned = sys.spawnExplosion(id++, 0, 0, 0);
  assert.equal(lastReturned, 6);
  total += lastReturned;
  assert.equal(sys.liveCount(0), total);
  assert.ok(total <= PARTICLE_CAP);
});

test('never more than 256 live, even after many overlapping bursts', () => {
  const sys = new ParticleSystem();
  for (let id = 1; id <= 30; id++) {
    sys.spawnExplosion(id, id, id, 0);
    assert.ok(sys.liveCount(0) <= PARTICLE_CAP);
  }
});

test('a nearly-full pool drops particles beyond its free slots (capacity 5, empty pool, burst of 6 wanted)', () => {
  const sys = new ParticleSystem(5);
  // live(0) + 24 > 5 → wants PARTICLES_OVER_CAP (6), but only 5 free slots exist.
  const n = sys.spawnExplosion(1, 0, 0, 0);
  assert.equal(n, 5);
  assert.equal(sys.liveCount(0), 5);
});

test('same lemmingId (and same x, y, tick) → identical draw-call sequences across several ticks', () => {
  const sysA = new ParticleSystem();
  const sysB = new ParticleSystem();
  sysA.spawnExplosion(42, 50, 60, 10);
  sysB.spawnExplosion(42, 50, 60, 10);

  for (const tick of [10, 15, 20, 25, 30, 40]) {
    const targetA = new FakeTarget();
    const targetB = new FakeTarget();
    sysA.draw(targetA, tick, 0, 0, 2000, 2000);
    sysB.draw(targetB, tick, 0, 0, 2000, 2000);
    assert.deepEqual(targetA.calls, targetB.calls, `tick ${tick}`);
  }
});

test('a different lemmingId produces a different draw sequence', () => {
  const sysA = new ParticleSystem();
  const sysB = new ParticleSystem();
  sysA.spawnExplosion(1, 50, 60, 10);
  sysB.spawnExplosion(2, 50, 60, 10);

  const targetA = new FakeTarget();
  const targetB = new FakeTarget();
  sysA.draw(targetA, 10, 0, 0, 2000, 2000); // age 0: positions equal x0,y0 for every particle either way
  sysB.draw(targetB, 10, 0, 0, 2000, 2000);
  // At age 0 every particle sits at (x0, y0) regardless of id, so compare a tick where velocity has
  // moved things (age > 0), where the two seeded RNG streams diverge.
  const targetA2 = new FakeTarget();
  const targetB2 = new FakeTarget();
  sysA.draw(targetA2, 15, 0, 0, 2000, 2000);
  sysB.draw(targetB2, 15, 0, 0, 2000, 2000);
  assert.notDeepEqual(targetA2.calls, targetB2.calls);
});

test('deterministic across clear(): the same id reproduces the same burst after clearing', () => {
  const sys = new ParticleSystem();
  sys.spawnExplosion(7, 30, 40, 0);
  const before = new FakeTarget();
  sys.draw(before, 5, 0, 0, 2000, 2000);

  sys.clear();
  assert.equal(sys.liveCount(0), 0);

  sys.spawnExplosion(7, 30, 40, 0);
  const after = new FakeTarget();
  sys.draw(after, 5, 0, 0, 2000, 2000);

  assert.deepEqual(after.calls, before.calls);
});

test('nothing is drawn before a particle\'s spawn tick', () => {
  const sys = new ParticleSystem();
  sys.spawnExplosion(9, 10, 10, 100);
  const target = new FakeTarget();
  sys.draw(target, 50, 0, 0, 2000, 2000); // 50 ≪ 100: age < 0 for every particle
  assert.equal(target.calls.length, 0);

  const targetAtSpawn = new FakeTarget();
  sys.draw(targetAtSpawn, 100, 0, 0, 2000, 2000); // age 0: now visible
  assert.equal(targetAtSpawn.calls.length, 24);
});

test('first-frame (age 1) displacement is within the spec velocity bounds: dx ∈ [−2,2], dy ∈ [−4.65,−0.65] before rounding', () => {
  const sys = new ParticleSystem();
  sys.spawnExplosion(3, 100, 100, 0);
  const target = new FakeTarget();
  sys.draw(target, 1, 0, 0, 2000, 2000); // age = 1 for every particle
  assert.equal(target.calls.length, 24);
  for (const call of target.calls) {
    const dx = call.x - 100; // rx = round(x0 + vx·1) - camX(0)
    const dy = call.y - 100; // ry = round(y0 + vy·1 + 0.35·1·2/2) - camY(0) = round(y0 + vy + 0.35)
    assert.ok(dx >= -2 && dx <= 2, `dx ${dx} out of [-2,2]`);
    assert.ok(dy >= -5 && dy <= -1, `dy ${dy} out of [-5,-1] (rounded from [-4.65,-0.65])`);
    assert.ok(Number.isInteger(call.x) && Number.isInteger(call.y), 'drawn at integer coords');
  }
});

test('lifetime is 22–34 ticks: all still alive at age 21, all gone by age 35', () => {
  const sys = new ParticleSystem();
  sys.spawnExplosion(11, 10, 10, 0);
  assert.equal(sys.liveCount(21), 24, 'minimum life is 22 ticks, so nothing has died by age 21');
  const someDeadByNow = sys.liveCount(34);
  assert.ok(someDeadByNow < 24, 'the shortest-lived particles (life 22) are dead well before age 34');
  assert.equal(sys.liveCount(35), 0, 'maximum life is 34 ticks, so everything is gone by age 35');
});

test('lifetime values across many particles span the full [22,34] range', () => {
  const sys = new ParticleSystem(2000);
  for (let id = 1; id <= 40; id++) sys.spawnExplosion(id, 0, 0, 0); // 40 × 24 = 960 particles
  const deathAges = new Set<number>();
  let prev = sys.liveCount(21);
  for (let age = 22; age <= 34; age++) {
    const live = sys.liveCount(age);
    if (live < prev) deathAges.add(age);
    prev = live;
  }
  assert.equal(sys.liveCount(35), 0);
  // With 960 samples we should see deaths spread across (well) more than a couple of ages.
  assert.ok(deathAges.size >= 6, `expected varied lifetimes, saw deaths only at ${[...deathAges]}`);
});

test('colours are drawn only from the DESIGN §3.5 confetti set (t b c w T)', () => {
  const sys = new ParticleSystem(2000);
  for (let id = 1; id <= 20; id++) sys.spawnExplosion(id, 0, 0, 0);
  const allowed = new Set(PARTICLE_COLORS.map((k) => MUMBLE_PALETTE[k]));
  assert.equal(allowed.size, 5);
  const target = new FakeTarget();
  sys.draw(target, 0, 0, 0, 2000, 2000);
  assert.ok(target.calls.length > 0);
  for (const call of target.calls) assert.ok(allowed.has(call.style as string), `unexpected colour ${String(call.style)}`);
});

test('about 25% of particles are 2×1 wide (15–35% over many bursts)', () => {
  const sys = new ParticleSystem(3000);
  for (let id = 1; id <= 80; id++) sys.spawnExplosion(id, 0, 0, 0); // 80 × 24 = 1920 particles
  const target = new FakeTarget();
  sys.draw(target, 0, 0, 0, 2000, 2000); // age 0: nothing has moved out of view yet
  const total = target.calls.length;
  const wide = target.calls.filter((c) => c.w === 2).length;
  const narrow = target.calls.filter((c) => c.w === 1).length;
  assert.equal(wide + narrow, total);
  const ratio = wide / total;
  assert.ok(ratio >= 0.15 && ratio <= 0.35, `2×1 ratio ${ratio} outside [0.15, 0.35]`);
});

test('particles outside the level or the view are culled, not drawn', () => {
  const sys = new ParticleSystem();
  sys.spawnExplosion(1, 5, 5, 0);
  const target = new FakeTarget();
  // A tiny 1×1 view far from the spawn point: nothing should be visible.
  sys.draw(target, 0, 10_000, 10_000, 1, 1);
  assert.equal(target.calls.length, 0);
});

// ─── BurstLimiter (DESIGN §7.8: at most 3 bursts may START per rolling second). ────────────────
test('BurstLimiter: 3 starts allowed within 1000ms, the 4th refused', () => {
  const lim = new BurstLimiter();
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(100), true);
  assert.equal(lim.tryStart(200), true);
  assert.equal(lim.tryStart(300), false);
  assert.equal(lim.tryStart(999), false);
});

test('BurstLimiter: rolling window — allowed again once the oldest recorded start ages out', () => {
  const lim = new BurstLimiter();
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(100), true);
  assert.equal(lim.tryStart(200), true);
  assert.equal(lim.tryStart(999), false, 'still 3 in the last 1000ms (0, 100, 200)');
  // At t=1000, the start at t=0 is exactly 1000ms old → no longer "< 1000ms", so only 2 remain
  // in-window (100, 200) and a new start is allowed (rolling, not a fixed per-second bucket).
  assert.equal(lim.tryStart(1000), true);
  // Now (100, 200, 1000) are the 3 recent ones → refused again immediately after.
  assert.equal(lim.tryStart(1001), false);
  // At t=1100, the start at t=100 is exactly 1000ms old and ages out; (200, 1000) remain → allowed.
  assert.equal(lim.tryStart(1100), true);
});

test('BurstLimiter.reset() clears history so 3 fresh starts are allowed immediately', () => {
  const lim = new BurstLimiter();
  lim.tryStart(0);
  lim.tryStart(0);
  lim.tryStart(0);
  assert.equal(lim.tryStart(0), false);
  lim.reset();
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(0), false);
});

test('BurstLimiter: custom max/windowMs are honoured', () => {
  const lim = new BurstLimiter(1, 500);
  assert.equal(lim.tryStart(0), true);
  assert.equal(lim.tryStart(100), false);
  assert.equal(lim.tryStart(500), true); // the t=0 start is now exactly 500ms old
});
