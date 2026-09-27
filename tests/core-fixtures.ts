/**
 * Core test fixtures (workstream A). Builds CompiledLevels DIRECTLY from a Terrain — no level
 * compiler — so core tests never depend on src/levels/**. Not a test file itself.
 *
 * Conventions (docs/development/core-rules.md): a lemming's (x, y) is its foot pixel and it is
 * supported when terrain.isSolid(x, y). With the default floor, a mumble standing on it has
 * y === FLOOR.
 */
import { FIRST_SPAWN_TICK, TICKS_PER_SECOND } from '../src/core/constants.ts';
import { GameSession, type SessionOptions } from '../src/core/session.ts';
import { Material, Terrain } from '../src/core/terrain.ts';
import {
  SKILL_IDS,
  type CompiledLevel,
  type GameEvent,
  type HazardZone,
  type Lemming,
  type Point,
  type SkillId,
} from '../src/core/types.ts';

/** Top row of the default floor (rows FLOOR..FLOOR+9 are earth across the whole width). */
export const FLOOR = 150;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Default Material.Earth; Material.Empty erases. */
  readonly material?: Material;
}

export interface TestLevelOptions {
  readonly width?: number; // default 400
  readonly height?: number; // default 160
  /** Default true: a 10 px earth floor with its top row at FLOOR over the whole width. */
  readonly floor?: boolean;
  /** Painted in order after the floor. */
  readonly boxes?: readonly Box[];
  /** Default: one entrance ON the floor at x 40 (the mumble spawns there and lands at once). */
  readonly entrances?: readonly Point[];
  /** Default: none (so mumbles keep walking). */
  readonly exits?: readonly Point[];
  readonly hazards?: readonly HazardZone[];
  readonly lemmings?: number; // default 1
  readonly saveRequired?: number; // default 1
  readonly releaseRate?: number; // default 50
  readonly timeLimitSeconds?: number; // default 300
  /** Default 0 for every skill. */
  readonly skills?: Partial<Record<SkillId, number>>;
  readonly seed?: number; // default 1
}

/** Paint a rectangle of `material` (clipped to the terrain). */
export function fill(terrain: Terrain, box: Box): void {
  const material = box.material ?? Material.Earth;
  for (let y = box.y; y < box.y + box.h; y++)
    for (let x = box.x; x < box.x + box.w; x++) terrain.set(x, y, material, material === Material.Empty ? 0 : 1);
}

export function makeLevel(options: TestLevelOptions = {}): CompiledLevel {
  const width = options.width ?? 400;
  const height = options.height ?? 160;
  const terrain = new Terrain(width, height);
  if (options.floor ?? true) fill(terrain, { x: 0, y: FLOOR, w: width, h: 10 });
  for (const box of options.boxes ?? []) fill(terrain, box);
  terrain.takeDirty();
  const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, options.skills?.[id] ?? 0])) as Record<SkillId, number>;
  return {
    id: 'core-test',
    width,
    height,
    terrain,
    entrances: options.entrances ?? [{ x: 40, y: FLOOR }],
    exits: options.exits ?? [],
    hazards: options.hazards ?? [],
    lemmingCount: options.lemmings ?? 1,
    saveRequired: options.saveRequired ?? 1,
    releaseRate: options.releaseRate ?? 50,
    timeLimitTicks: (options.timeLimitSeconds ?? 300) * TICKS_PER_SECOND,
    skills,
    seed: options.seed ?? 1,
    brickColor: 7,
    themeId: 'mossgrove',
  };
}

export interface TickEvent {
  readonly tick: number;
  readonly event: GameEvent;
}

/** Run `n` steps; returns every event stamped with the tick it happened on. */
export function stepN(session: GameSession, n: number): TickEvent[] {
  const out: TickEvent[] = [];
  for (let i = 0; i < n && session.status === 'running'; i++) {
    const tick = session.tick;
    for (const event of session.step()) out.push({ tick, event });
  }
  return out;
}

/** Step until `done()` is true (checked before each step) or `maxTicks` steps ran. */
export function stepUntil(session: GameSession, done: () => boolean, maxTicks = 10_000): TickEvent[] {
  const out: TickEvent[] = [];
  for (let i = 0; i < maxTicks && !done() && session.status === 'running'; i++) {
    const tick = session.tick;
    for (const event of session.step()) out.push({ tick, event });
  }
  return out;
}

/** The live (mutable) lemming object — tests may reposition it or change flags directly. */
export function live(session: GameSession, id: number): Lemming {
  const lem = session.lemmingById(id);
  if (!lem) throw new Error(`lemming ${id} is not active`);
  return lem as Lemming;
}

/**
 * A session whose first mumble (id 0) has spawned and landed, i.e. is `walking` on the floor
 * at the first entrance. Returns the session positioned right after that landing.
 */
export function sessionWithWalker(options: TestLevelOptions = {}, sessionOptions: SessionOptions = {}): GameSession {
  const session = new GameSession(makeLevel(options), sessionOptions);
  stepUntil(session, () => session.lemmingById(0)?.state === 'walking', FIRST_SPAWN_TICK + 200);
  if (session.lemmingById(0)?.state !== 'walking') throw new Error('mumble 0 never started walking');
  return session;
}
