/**
 * Explosion confetti: a fixed-capacity pool of particles, allocated once (no per-frame or
 * per-explosion allocation). Positions are ANALYTIC in the particle's age (in game ticks), so
 * the pool never needs a per-tick "advance" pass — `draw` just evaluates the physics formula for
 * whatever tick it's asked about. DESIGN §3.5 (explosion confetti) + §7.8 (pop-all cap).
 */
import { LEVEL_HEIGHT, LEVEL_MAX_WIDTH } from '../core/constants.ts';
import { MUMBLE_PALETTE } from '../art/palette.ts';
import type { PixelTarget } from './pixel-target.ts';

/** Deterministic [0, 1) generator (mulberry32). Same seed → same sequence, forever. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PARTICLE_CAP = 256;
export const PARTICLES_PER_BURST = 24;
export const PARTICLES_OVER_CAP = 6;
/** MUMBLE_PALETTE keys used for confetti (DESIGN §3.5). */
export const PARTICLE_COLORS = ['t', 'b', 'c', 'w', 'T'] as const;

const GRAVITY = 0.35;
const LIFE_MIN = 22;
const LIFE_SPAN = 13; // life ∈ [22, 34] inclusive → 13 integers
const WIDE_CHANCE = 0.25;

/**
 * Fixed typed-array pool of confetti particles. `spawnExplosion` is seeded ONLY by the
 * lemming id, so the same id always produces the exact same burst (position/tick aside).
 */
export class ParticleSystem {
  private readonly capacity: number;
  private readonly occupied: Uint8Array;
  private readonly spawnTick: Int32Array;
  private readonly life: Uint8Array;
  private readonly x0: Float32Array;
  private readonly y0: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly colorIndex: Uint8Array;
  private readonly wide: Uint8Array;

  constructor(capacity: number = PARTICLE_CAP) {
    this.capacity = capacity;
    this.occupied = new Uint8Array(capacity);
    this.spawnTick = new Int32Array(capacity);
    this.life = new Uint8Array(capacity);
    this.x0 = new Float32Array(capacity);
    this.y0 = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.colorIndex = new Uint8Array(capacity);
    this.wide = new Uint8Array(capacity);
  }

  /** Frees any slot whose age has reached its life, as of `tick`. Never frees a not-yet-started slot (age < 0). */
  private sweep(tick: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.occupied[i] === 1 && tick - (this.spawnTick[i] ?? 0) >= (this.life[i] ?? 0)) {
        this.occupied[i] = 0;
      }
    }
  }

  liveCount(tick: number): number {
    this.sweep(tick);
    let n = 0;
    for (let i = 0; i < this.capacity; i++) if (this.occupied[i] === 1) n++;
    return n;
  }

  /**
   * Spawn one explosion's confetti at (x, y) starting at game tick `tick`, seeded ONLY by
   * `lemmingId`. Returns the number actually spawned (fewer than requested when the pool is
   * nearly full; extra beyond free slots are simply dropped, not queued).
   */
  spawnExplosion(lemmingId: number, x: number, y: number, tick: number): number {
    const live = this.liveCount(tick); // also sweeps expired slots
    const want = live + PARTICLES_PER_BURST > this.capacity ? PARTICLES_OVER_CAP : PARTICLES_PER_BURST;
    const rng = mulberry32(lemmingId);
    let spawned = 0;
    let cursor = 0;
    for (let k = 0; k < want; k++) {
      let slot = -1;
      while (cursor < this.capacity) {
        if (this.occupied[cursor] === 0) {
          slot = cursor;
          cursor++;
          break;
        }
        cursor++;
      }
      if (slot === -1) break; // pool full: extra particles are dropped
      const vx = -2 + rng() * 4;
      const vy = -5 + rng() * 4;
      const life = LIFE_MIN + Math.floor(rng() * LIFE_SPAN);
      const color = Math.floor(rng() * PARTICLE_COLORS.length);
      const isWide = rng() < WIDE_CHANCE ? 1 : 0;
      this.occupied[slot] = 1;
      this.spawnTick[slot] = tick;
      this.x0[slot] = x;
      this.y0[slot] = y;
      this.vx[slot] = vx;
      this.vy[slot] = vy;
      this.life[slot] = life;
      this.colorIndex[slot] = color;
      this.wide[slot] = isWide;
      spawned++;
    }
    return spawned;
  }

  /**
   * Draw every live particle through `target` (a `PixelTarget` — a real 2D context works).
   * Positions are analytic in the age `a = tick − spawnTick` (0 ≤ a < life): `px = x0 + vx·a`,
   * `py = y0 + vy·a + 0.35·a·(a+1)/2`, drawn at `Math.round`. A slot not yet started (age < 0,
   * e.g. an explosion's particles queued to begin a few ticks after the pop star) is skipped but
   * kept; a dead or out-of-level slot is skipped AND freed.
   */
  draw(target: PixelTarget, tick: number, camX: number, camY: number, viewW: number, viewH: number): void {
    for (let i = 0; i < this.capacity; i++) {
      if (this.occupied[i] !== 1) continue;
      const age = tick - (this.spawnTick[i] ?? 0);
      if (age >= (this.life[i] ?? 0)) {
        this.occupied[i] = 0;
        continue;
      }
      if (age < 0) continue; // reserved for a future tick, not visible yet

      const px = (this.x0[i] ?? 0) + (this.vx[i] ?? 0) * age;
      const py = (this.y0[i] ?? 0) + (this.vy[i] ?? 0) * age + (GRAVITY * age * (age + 1)) / 2;
      if (px < 0 || px >= LEVEL_MAX_WIDTH || py < -16 || py >= LEVEL_HEIGHT) {
        this.occupied[i] = 0;
        continue;
      }

      const w = this.wide[i] === 1 ? 2 : 1;
      const rx = Math.round(px) - camX;
      const ry = Math.round(py) - camY;
      if (rx + w <= 0 || rx >= viewW || ry < 0 || ry >= viewH) continue; // outside the view: skip, don't free

      const colorKey = PARTICLE_COLORS[this.colorIndex[i] ?? 0] ?? 't';
      target.fillStyle = MUMBLE_PALETTE[colorKey] ?? '#ffffff';
      target.fillRect(rx, ry, w, 1);
    }
  }

  clear(): void {
    this.occupied.fill(0);
  }
}

/** DESIGN §7.8: at most 3 bursts may START per rolling second in view. Injected clock (wall time). */
export class BurstLimiter {
  private readonly max: number;
  private readonly windowMs: number;
  private readonly times: Float64Array;
  private count = 0;
  private head = 0;

  constructor(max = 3, windowMs = 1000) {
    this.max = max;
    this.windowMs = windowMs;
    this.times = new Float64Array(max);
  }

  /** true → the burst may start (and is recorded); false → over the limit for this window. */
  tryStart(nowMs: number): boolean {
    let inWindow = 0;
    for (let i = 0; i < this.count; i++) {
      if (nowMs - (this.times[i] ?? 0) < this.windowMs) inWindow++;
    }
    if (inWindow >= this.max) return false;
    this.times[this.head] = nowMs;
    this.head = (this.head + 1) % this.max;
    if (this.count < this.max) this.count++;
    return true;
  }

  reset(): void {
    this.count = 0;
    this.head = 0;
  }
}
