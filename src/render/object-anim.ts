/**
 * Pure, DOM-free timing/positioning helpers for animated level objects: hatches, exits, traps,
 * hazard pools and background decor dots. No canvas — `render/scene.ts` uses these to pick which
 * pre-rendered frame/variant to blit. DESIGN §3.5, §4.5–§4.8, §7.4.
 */
import { ENTRANCE_OPEN_TICK, LETS_GO_TICK, TICKS_PER_SECOND } from '../core/constants.ts';

const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/** Wall-clock ms → an ever-increasing ambient tick count; frozen at 0 when motion is reduced. */
export function ambientTick(timeMs: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : Math.floor(timeMs / MS_PER_TICK);
}

/**
 * Ambient (non-gameplay) animation frame: cycles through `frameCount` frames, `ticksPerFrame`
 * ambient ticks each; frozen on frame 0 when motion is reduced (DESIGN §2.2, §7.4).
 */
export function ambientFrame(timeMs: number, ticksPerFrame: number, frameCount: number, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return Math.floor(ambientTick(timeMs, false) / ticksPerFrame) % frameCount;
}

/**
 * Entrance hatch frame: 0 closed (also while `nuking`, and before `ENTRANCE_OPEN_TICK`);
 * 1–3 opening, 3 ticks per frame from `ENTRANCE_OPEN_TICK`; then stays on 3. Reduced motion keeps
 * the closed → open timing (gameplay information, DESIGN §7.4) but skips the multi-frame reveal,
 * jumping straight from closed to fully open.
 */
export function hatchFrame(tick: number, reducedMotion: boolean, nuking: boolean): number {
  if (nuking) return 0;
  if (tick < ENTRANCE_OPEN_TICK) return 0;
  if (reducedMotion) return 3;
  return Math.min(3, 1 + Math.floor((tick - ENTRANCE_OPEN_TICK) / 3));
}

/** Whether the hatch roof's '+' crest pixels show the exit-glow colour ("ready" light). */
export function hatchCrestLit(tick: number): boolean {
  return tick >= LETS_GO_TICK;
}

/**
 * Trap trigger-burst frame index (0 or 1, into `TrapArt.trigger`) for `ticksSinceTrigger` ticks
 * since a `trap-triggered` event fired; -1 once the 12-tick burst (`trigger[0,1,1,0]`, 3 ticks
 * each) has finished (or before it started).
 */
export function trapTriggerFrame(ticksSinceTrigger: number): number {
  if (ticksSinceTrigger < 0 || ticksSinceTrigger > 11) return -1;
  const pattern = [0, 1, 1, 0] as const;
  return pattern[Math.floor(ticksSinceTrigger / 3)] ?? -1;
}

/** Whether the exit's glow pixels show the all-lit variant (4 ticks after `lemming-exited`). */
export function exitGlowLit(tick: number, lastExitTick: number): boolean {
  const age = tick - lastExitTick;
  return age >= 0 && age < 4;
}

/** One mulberry32-style hash step on the mixed seed `(k, salt, seed)`, in [0, 1). */
function decorHash(x: number, y: number, s: number): number {
  let t = (s ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  t = (t + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Deterministic, static background decor-dot positions (DESIGN §2.2: at most 30 per 400 px of
 * level width). Returns interleaved world pixels `[x0, y0, x1, y1, …]`.
 */
export function decorDots(seed: number, width: number, height: number): Int16Array {
  const count = Math.max(0, Math.floor((26 * width) / 400));
  const out = new Int16Array(count * 2);
  const maxY = Math.floor(height * 0.6);
  for (let k = 0; k < count; k++) {
    out[k * 2] = Math.floor(decorHash(k, 1, seed) * width);
    out[k * 2 + 1] = Math.floor(decorHash(k, 2, seed) * maxY);
  }
  return out;
}

/** Twinkle visibility for decor dot `k` at ambient tick `ambient` (pass `ambientTick(...)`, which
 * is 0 when motion is reduced — a fixed, frozen visibility per dot rather than no twinkle). */
export function decorDotVisible(k: number, ambient: number): boolean {
  return (Math.floor(ambient / 6) + k) % 5 !== 0;
}
