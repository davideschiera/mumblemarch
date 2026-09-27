/**
 * Transient, event-driven visual effects (DESIGN §3.5): explosion pop stars, steel sparks,
 * refusal ✕, assign rings, the builder "low bricks" ring, the trap leaf, plus two stateless
 * effects (splat dust, drown ripple) read straight off `view.lemmings` every draw. Confetti
 * itself lives in `ParticleSystem` (drawn separately by the renderer right after `Effects.draw`,
 * V7 order) — this module only decides WHEN to spawn it.
 *
 * Tick convention (render-lead correction): the `tick` argument of `handleEvents` is the tick
 * that was just executed; by the time `handleEvents` runs, `view.tick` already reflects it
 * (`view.tick === tick` while paused/applyNow, `view.tick === tick + 1` after a stepped tick).
 * Every effect's start time (`T`) is stamped from `view.tick`, read inside `handleEvents` — NOT
 * from the `tick` argument — so the first frame drawn after the event shows age 0.
 */
import type { CompiledLevel, Direction, GameEvent, GameView, Lemming, LemmingState } from '../core/types.ts';
import { MAX_LEMMINGS } from '../core/constants.ts';
import { MUMBLE_ANIMS } from '../art/mumble.ts';
import type { BurstLimiter, ParticleSystem } from './particles.ts';

export interface EffectPainter {
  /** The 'exploding' sprite, foot anchor (x, y). */
  popStar(x: number, y: number): void;
  dustPuff(cx: number, cy: number): void;
  steelSpark(cx: number, cy: number, frame: number): void;
  refusal(cx: number, cy: number): void;
  assignRing(cx: number, cy: number, frame: number): void;
  /** MUMBLE_PALETTE key. */
  pixel(x: number, y: number, w: number, h: number, paletteKey: string): void;
}

export interface EffectOptions {
  readonly reducedMotion: boolean;
  readonly nowMs: number;
  readonly inView: (x: number, y: number) => boolean;
}

type EffectKind = 'pop-star' | 'dust-static' | 'steel-spark' | 'refusal' | 'assign-ring' | 'builder-low' | 'trap-leaf';

const RING_SIZE = 128;
const NONE = 0,
  BASHER = 1,
  MINER = 2,
  DIGGER = 3;

function jobFromState(state: LemmingState): number {
  if (state === 'bashing') return BASHER;
  if (state === 'mining') return MINER;
  if (state === 'digging') return DIGGER;
  return NONE;
}

function jobFromSkill(skill: string): number {
  if (skill === 'basher') return BASHER;
  if (skill === 'miner') return MINER;
  if (skill === 'digger') return DIGGER;
  return NONE;
}

function findLemming(view: GameView, id: number): Readonly<Lemming> | undefined {
  for (const lem of view.lemmings) if (lem.id === id) return lem;
  return undefined;
}

/** One reusable ring slot; fields not used by `kind` are ignored. */
interface EffectSlot {
  used: boolean;
  kind: EffectKind;
  id: number; // lemmingId for "following" kinds, -1 otherwise
  x: number; // fixed-position kinds: the anchor. Following kinds: unused (looked up live).
  y: number;
  startTick: number;
  startWallMs: number; // only meaningful for 'refusal'
}

export class Effects {
  private readonly particlesRef: ParticleSystem;
  private readonly limiter: BurstLimiter;
  private readonly slots: EffectSlot[];
  private writeIndex = 0;

  // Per-id "as of the end of the previous tick" tracking (DESIGN: hit-steel job lookup).
  private readonly lastJob = new Uint8Array(MAX_LEMMINGS);
  private readonly lastX = new Int16Array(MAX_LEMMINGS);
  private readonly lastY = new Int16Array(MAX_LEMMINGS);
  private readonly lastDir = new Int8Array(MAX_LEMMINGS);
  private readonly lastFootY = new Uint8Array(MAX_LEMMINGS);
  private readonly lastKnown = new Uint8Array(MAX_LEMMINGS); // 1 once an id has been seen

  constructor(particles: ParticleSystem, limiter: BurstLimiter) {
    this.particlesRef = particles;
    this.limiter = limiter;
    this.slots = new Array(RING_SIZE);
    for (let i = 0; i < RING_SIZE; i++) {
      this.slots[i] = { used: false, kind: 'pop-star', id: -1, x: 0, y: 0, startTick: 0, startWallMs: 0 };
    }
  }

  get particles(): ParticleSystem {
    return this.particlesRef;
  }

  /** Resets everything (also called on restart). */
  setLevel(_level: CompiledLevel): void {
    for (const slot of this.slots) slot.used = false;
    this.writeIndex = 0;
    this.lastJob.fill(0);
    this.lastX.fill(0);
    this.lastY.fill(0);
    this.lastDir.fill(0);
    this.lastFootY.fill(0);
    this.lastKnown.fill(0);
    this.particlesRef.clear();
    this.limiter.reset();
  }

  private alloc(): EffectSlot {
    // Invariant: the constructor fills every one of the RING_SIZE slots, so this is always defined.
    const slot = this.slots[this.writeIndex]!;
    this.writeIndex = (this.writeIndex + 1) % RING_SIZE;
    return slot;
  }

  private spawn(kind: EffectKind, id: number, x: number, y: number, startTick: number, startWallMs = 0): void {
    const slot = this.alloc();
    slot.used = true;
    slot.kind = kind;
    slot.id = id;
    slot.x = x;
    slot.y = y;
    slot.startTick = startTick;
    slot.startWallMs = startWallMs;
  }

  /** Call from Renderer.handleEvents. `view` = the live GameView after that tick. */
  handleEvents(events: readonly GameEvent[], _tick: number, view: GameView, options: EffectOptions): void {
    const T = view.tick;

    for (const event of events) {
      switch (event.type) {
        case 'explosion': {
          if (options.inView(event.x, event.y) && this.limiter.tryStart(options.nowMs)) {
            this.spawn('pop-star', event.lemmingId, event.x, event.y, T);
          }
          if (!options.reducedMotion) {
            this.particlesRef.spawnExplosion(event.lemmingId, event.x, event.y - 4, T + 3);
          } else {
            this.spawn('dust-static', event.lemmingId, event.x, event.y - 3, T);
          }
          break;
        }
        case 'hit-steel': {
          const id = event.lemmingId;
          const job = id >= 0 && id < MAX_LEMMINGS ? (this.lastJob[id] ?? NONE) : NONE;
          const lem = findLemming(view, id);
          const px = lem ? lem.x : event.x;
          const py = lem ? lem.y : event.y;
          const dir: Direction = lem ? lem.dir : id >= 0 && id < MAX_LEMMINGS && this.lastDir[id] === -1 ? -1 : 1;
          const [cx, cy] = steelSparkPos(job, px, py, dir, event.x, event.y);
          this.spawn('steel-spark', id, cx, cy, T);
          break;
        }
        case 'skill-rejected': {
          if (event.reason === 'steel') {
            const id = event.lemmingId;
            const job = jobFromSkill(event.skill);
            const lem = id === null ? undefined : findLemming(view, id);
            let px: number | null = null;
            let py: number | null = null;
            let dir: Direction = 1;
            if (lem) {
              px = lem.x;
              py = lem.y;
              dir = lem.dir;
            } else if (id !== null && id >= 0 && id < MAX_LEMMINGS && this.lastKnown[id] === 1) {
              px = this.lastX[id] ?? 0;
              py = this.lastY[id] ?? 0;
              dir = this.lastDir[id] === -1 ? -1 : 1;
            }
            if (px !== null && py !== null) {
              const [cx, cy] = steelSparkPos(job, px, py, dir, px, py);
              this.spawn('steel-spark', id ?? -1, cx, cy, T);
            }
          }
          if (event.lemmingId !== null && event.reason !== 'level-ended') {
            const id = event.lemmingId;
            const lem = findLemming(view, id);
            let ax: number;
            let ay: number;
            if (lem) {
              ax = lem.x;
              ay = lem.y - MUMBLE_ANIMS[lem.state].footY - 4;
            } else if (id >= 0 && id < MAX_LEMMINGS && this.lastKnown[id] === 1) {
              ax = this.lastX[id] ?? 0;
              ay = (this.lastY[id] ?? 0) - (this.lastFootY[id] ?? 0) - 4;
            } else {
              ax = 0;
              ay = 0;
            }
            this.spawn('refusal', id, ax, ay, T, options.nowMs);
          }
          break;
        }
        case 'skill-assigned': {
          if (!options.reducedMotion) {
            this.spawn('assign-ring', event.lemmingId, 0, 0, T);
          }
          break;
        }
        case 'builder-low-bricks': {
          if (!options.reducedMotion) {
            this.spawn('builder-low', event.lemmingId, 0, 0, T);
          }
          break;
        }
        case 'trap-triggered': {
          if (!options.reducedMotion) {
            const hazard = view.level.hazards[event.hazardIndex];
            if (hazard) {
              const ax = Math.floor(hazard.area.x + hazard.area.w / 2);
              const ay = hazard.area.y + hazard.area.h;
              this.spawn('trap-leaf', -1, ax - 1, ay - 12, T);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    // Refresh "as of the end of this tick" per-id state for the NEXT call's hit-steel lookup.
    for (const lem of view.lemmings) {
      if (lem.id < 0 || lem.id >= MAX_LEMMINGS) continue;
      this.lastJob[lem.id] = jobFromState(lem.state);
      this.lastX[lem.id] = lem.x;
      this.lastY[lem.id] = lem.y;
      this.lastDir[lem.id] = lem.dir;
      this.lastFootY[lem.id] = MUMBLE_ANIMS[lem.state].footY;
      this.lastKnown[lem.id] = 1;
    }
  }

  /** Draws every live transient effect (world coords). Particles are drawn separately (V7 order). */
  draw(painter: EffectPainter, view: GameView, options: EffectOptions): void {
    const tick = view.tick;

    for (const slot of this.slots) {
      if (!slot.used) continue;
      const age = tick - slot.startTick;

      switch (slot.kind) {
        case 'pop-star':
          if (age >= 0 && age <= 2) painter.popStar(slot.x, slot.y);
          else if (age > 2) slot.used = false;
          break;
        case 'dust-static':
          if (age >= 3 && age <= 8) painter.dustPuff(slot.x, slot.y);
          else if (age > 8) slot.used = false;
          break;
        case 'steel-spark':
          if (age >= 0 && age <= 3) {
            const frame = options.reducedMotion ? 0 : Math.floor(age / 2);
            painter.steelSpark(slot.x, slot.y, frame);
          } else if (age > 3) slot.used = false;
          break;
        case 'refusal': {
          const wallAge = options.nowMs - slot.startWallMs;
          if (age >= 12 || wallAge >= 600) {
            slot.used = false;
            break;
          }
          const lem = findLemming(view, slot.id);
          let cx: number;
          let cy: number;
          if (lem) {
            cx = lem.x;
            cy = lem.y - MUMBLE_ANIMS[lem.state].footY - 4;
          } else if (slot.id >= 0 && slot.id < MAX_LEMMINGS && this.lastKnown[slot.id] === 1) {
            cx = this.lastX[slot.id] ?? 0;
            cy = (this.lastY[slot.id] ?? 0) - (this.lastFootY[slot.id] ?? 0) - 4;
          } else {
            cx = slot.x;
            cy = slot.y;
          }
          painter.refusal(cx, cy);
          break;
        }
        case 'assign-ring': {
          if (age > 3) {
            slot.used = false;
            break;
          }
          if (age >= 0) {
            const pos = this.follow(view, slot.id, 0, -5);
            if (pos) painter.assignRing(pos[0], pos[1], Math.floor(age / 2));
          }
          break;
        }
        case 'builder-low': {
          if (age > 1) {
            slot.used = false;
            break;
          }
          if (age >= 0) {
            const lem = findLemming(view, slot.id);
            const footY =
              lem !== undefined
                ? MUMBLE_ANIMS[lem.state].footY
                : slot.id >= 0 && slot.id < MAX_LEMMINGS
                  ? (this.lastFootY[slot.id] ?? 0)
                  : 0;
            const pos = this.follow(view, slot.id, 0, -footY - 11);
            if (pos) painter.assignRing(pos[0], pos[1], 0);
          }
          break;
        }
        case 'trap-leaf': {
          if (age > 11) {
            slot.used = false;
            break;
          }
          if (age >= 0) {
            const dy = -Math.floor((age * 8) / 12);
            painter.pixel(slot.x, slot.y + dy, 2, 1, 't');
          }
          break;
        }
        default:
          break;
      }
    }

    // Stateless effects, read straight off the live view every frame.
    if (!options.reducedMotion) {
      for (const lem of view.lemmings) {
        if (lem.state === 'splatting' && lem.stateTicks <= 6) {
          const dy = Math.min(2, Math.floor(lem.stateTicks / 3));
          painter.pixel(lem.x - 4, lem.y - 1 - dy, 1, 1, 'k');
          painter.pixel(lem.x - 2, lem.y - 2 - dy, 1, 1, 'k');
          painter.pixel(lem.x + 2, lem.y - 2 - dy, 1, 1, 'k');
          painter.pixel(lem.x + 4, lem.y - 1 - dy, 1, 1, 'k');
        } else if (lem.state === 'drowning' && lem.stateTicks < 6) {
          const hazard = view.level.hazards.find(
            (h) =>
              (h.kind === 'water' || h.kind === 'fire') &&
              lem.x >= h.area.x &&
              lem.x < h.area.x + h.area.w &&
              lem.y >= h.area.y - 2 &&
              lem.y <= h.area.y + h.area.h,
          );
          if (hazard) {
            const width = lem.stateTicks <= 2 ? 3 : 5;
            const left = lem.x - Math.floor(width / 2);
            painter.pixel(left, hazard.area.y, width, 1, 'c');
          }
        }
      }
    }
  }

  /** Live position of a followed lemming (by id), offset by (dx, dy); last-known position if gone. */
  private follow(view: GameView, id: number, dx: number, dy: number): [number, number] | null {
    const lem = findLemming(view, id);
    if (lem) return [lem.x + dx, lem.y + dy];
    if (id >= 0 && id < MAX_LEMMINGS && this.lastKnown[id] === 1) {
      return [(this.lastX[id] ?? 0) + dx, (this.lastY[id] ?? 0) + dy];
    }
    return null;
  }
}

/** basher (x+8·dir, y−5), miner (x+6·dir, y−2), digger (x, y); unknown → (rawX, rawY−5). */
function steelSparkPos(job: number, x: number, y: number, dir: Direction, rawX: number, rawY: number): [number, number] {
  if (job === BASHER) return [x + 8 * dir, y - 5];
  if (job === MINER) return [x + 6 * dir, y - 2];
  if (job === DIGGER) return [x, y];
  return [rawX, rawY - 5];
}
