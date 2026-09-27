/**
 * Core domain types shared by every layer.
 *
 * Pure data only: no DOM, no Node, no classes with behaviour. Everything the simulation
 * exchanges with the outside world (commands in, events + snapshots out) is defined here.
 */
import type { ReadonlyTerrain, Terrain } from './terrain.ts';

// ─── Geometry ──────────────────────────────────────────────────────────────────────────────

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Facing direction: -1 = left, +1 = right. Multiply horizontal steps by it. */
export type Direction = -1 | 1;

// ─── Skills & states ───────────────────────────────────────────────────────────────────────

/** The 8 classic skills, in skill-bar order. */
export const SKILL_IDS = [
  'climber',
  'floater',
  'bomber',
  'blocker',
  'builder',
  'basher',
  'miner',
  'digger',
] as const;
export type SkillId = (typeof SKILL_IDS)[number];
export type SkillCounts = Readonly<Record<SkillId, number>>;

/**
 * What a lemming is doing right now. Exactly one state at a time; permanent abilities
 * (climber, floater) and the bomber fuse are separate flags on {@link Lemming}.
 */
export const LEMMING_STATES = [
  'falling',
  'walking',
  'jumping', // rising 2 px/tick up a 3–6 px ledge; only climber/floater/bomber can be assigned
  'climbing',
  'hoisting', // pulling itself over the top of a wall after climbing
  'floating',
  'splatting', // fell too far
  'blocking',
  'building',
  'shrugging', // builder ran out of bricks
  'bashing',
  'mining',
  'digging',
  'ohno', // fuse expired, short "oh no" pause before exploding
  'exploding',
  'drowning',
  'burning',
  'exiting',
] as const;
export type LemmingState = (typeof LEMMING_STATES)[number];

export type DeathCause = 'splat' | 'drown' | 'burn' | 'trap' | 'explode' | 'out-of-bounds';
export type HazardKind = 'water' | 'fire' | 'trap';

/**
 * A lemming inside the simulation (mutable; owned by the core).
 *
 * Coordinate convention (original-engine style): `(x, y)` is the foot anchor. A lemming is
 * supported when `terrain.isSolid(x, y)`; the sprite is drawn upwards from that point.
 */
export interface Lemming {
  readonly id: number;
  x: number;
  y: number;
  dir: Direction;
  state: LemmingState;
  /**
   * Ticks spent in the current state — drives timed transitions and the animation frame.
   * The session increments it BEFORE each handler call, so the first tick in a state always
   * sees 1, whatever way the state was entered (handler, skill assignment or fuse).
   */
  stateTicks: number;
  /** The original's fall counter: starts at FALL_COUNTER_STEP, +FALL_COUNTER_STEP per tick. */
  fallDistance: number;
  isClimber: boolean;
  isFloater: boolean;
  /** Bomber countdown in ticks; 0 = no fuse lit. */
  fuseTicks: number;
  /** Builder bricks remaining in the current staircase. */
  bricksLeft: number;
  /** Set when the lemming exits or dies; the session drops it at the end of the tick. */
  removed: boolean;
}

// ─── Level (compiled, simulation-ready) ────────────────────────────────────────────────────

export interface HazardZone {
  readonly kind: HazardKind;
  /** Trigger area in world pixels (a lemming's foot anchor inside it is affected). */
  readonly area: Rect;
  /** Traps only: ticks before the trap can fire again. */
  readonly cooldownTicks: number;
}

/**
 * Everything the simulation needs to run a level. Produced by `levels/compiler.ts` from an
 * authored `LevelDef`. The core never sees authoring primitives or colours (besides indices).
 */
export interface CompiledLevel {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  /** Pristine terrain; a session clones it before mutating. */
  readonly terrain: Terrain;
  /** Spawn points (lemmings appear here and start falling). */
  readonly entrances: readonly Point[];
  /** Exit anchor points (a lemming whose foot anchor enters the exit trigger is saved). */
  readonly exits: readonly Point[];
  readonly hazards: readonly HazardZone[];
  readonly lemmingCount: number;
  readonly saveRequired: number;
  /** Initial release rate; also the minimum the player may lower it to. 1–99. */
  readonly releaseRate: number;
  readonly timeLimitTicks: number;
  readonly skills: SkillCounts;
  readonly seed: number;
  /** Palette index used for builder bricks (theme-specific; opaque to the core). */
  readonly brickColor: number;
  /** Opaque theme key for the renderer; the core ignores it. */
  readonly themeId: string;
}

// ─── Commands (input to the core) ──────────────────────────────────────────────────────────

/**
 * Every player action that affects the simulation is a command. Commands are queued with the
 * tick they apply at, which makes runs replayable and tests deterministic.
 * (Pause, fast-forward, restart and camera moves are NOT commands — they live in the app.)
 */
export type GameCommand =
  | { readonly type: 'assign-skill'; readonly lemmingId: number; readonly skill: SkillId }
  | { readonly type: 'set-release-rate'; readonly rate: number }
  /** Relative change (HUD −/+, held keys); clamped to [level minimum, 99] by the core. */
  | { readonly type: 'adjust-release-rate'; readonly delta: number }
  | { readonly type: 'nuke' };

export interface TimedCommand {
  /** Applied at the start of this tick, before lemmings update. */
  readonly tick: number;
  readonly command: GameCommand;
}

/** A full, reproducible record of a play-through. */
export interface Replay {
  readonly levelId: string;
  readonly seed: number;
  readonly relaxedTimer: boolean;
  readonly commands: readonly TimedCommand[];
}

// ─── Events (output of the core) ───────────────────────────────────────────────────────────

export type SkillRejectReason =
  | 'none-left'
  | 'not-applicable' // wrong state (e.g. falling lemming offered a digger, already a climber)
  | 'steel' // steel ahead/below (basher, miner, digger) — plays the "ting"
  | 'one-way' // one-way wall against the direction (basher, miner)
  | 'blocker-overlap' // blocker field would overlap another blocker
  | 'too-high' // builder too close to the top of the level
  | 'no-lemming'
  | 'level-ended';

/** Why exactly a skill was refused (drives DESIGN §6.5 texts); a finer-grained SkillRejectReason. */
export type RejectDetail =
  | 'already-climber'
  | 'already-floater'
  | 'fuse-lit'
  | 'airborne'
  | 'is-blocker'
  | 'same-job'
  | 'busy-dying' // with reason 'not-applicable'
  | 'ahead'
  | 'below'; // with reason 'steel' (and 'one-way' uses 'ahead')

export interface Rejection {
  readonly reason: SkillRejectReason;
  readonly detail?: RejectDetail;
}

export interface LevelOutcome {
  readonly won: boolean;
  readonly saved: number;
  readonly required: number;
  readonly total: number;
  readonly reason: 'all-resolved' | 'time-up';
  readonly ticks: number;
  /** Ticks the relaxed clock ran past 0:00 before the level ended (0 unless relaxedTimer). */
  readonly overtimeTicks: number;
}

/**
 * Facts emitted by the core during a tick. Consumers (audio, announcer, renderer effects,
 * HUD, test hook) react to them; the core never calls outward. Keep them small and JSON-safe.
 */
export type GameEvent =
  | { readonly type: 'lets-go' }
  | { readonly type: 'entrance-opened' }
  | { readonly type: 'lemming-spawned'; readonly lemmingId: number; readonly x: number; readonly y: number }
  | { readonly type: 'skill-assigned'; readonly lemmingId: number; readonly skill: SkillId }
  | {
      readonly type: 'skill-rejected';
      readonly lemmingId: number | null;
      readonly skill: SkillId;
      readonly reason: SkillRejectReason;
      readonly detail?: RejectDetail;
    }
  /** `nuking`: part of a nuke — the audio plays one nuke sound instead of every "oh no". */
  | { readonly type: 'lemming-ohno'; readonly lemmingId: number; readonly nuking: boolean }
  | { readonly type: 'explosion'; readonly lemmingId: number; readonly x: number; readonly y: number }
  | { readonly type: 'builder-low-bricks'; readonly lemmingId: number; readonly bricksLeft: number }
  | { readonly type: 'builder-finished'; readonly lemmingId: number }
  | { readonly type: 'hit-steel'; readonly lemmingId: number; readonly x: number; readonly y: number }
  | { readonly type: 'trap-triggered'; readonly hazardIndex: number; readonly lemmingId: number }
  | { readonly type: 'lemming-exited'; readonly lemmingId: number }
  | { readonly type: 'lemming-died'; readonly lemmingId: number; readonly cause: DeathCause }
  | { readonly type: 'release-rate-changed'; readonly rate: number }
  | { readonly type: 'all-released' }
  | { readonly type: 'nuke-started' }
  | { readonly type: 'time-low'; readonly secondsLeft: number }
  | { readonly type: 'level-ended'; readonly outcome: LevelOutcome }
  /** The relaxed clock reached 0:00 and kept running (fires once). */
  | { readonly type: 'overtime-started' }
  /** `saved` first reaches `saveRequired` (fires once). */
  | { readonly type: 'goal-reached'; readonly saved: number }
  /** saved + still-alive + not-yet-released < required: the goal can no longer be met (once). */
  | { readonly type: 'goal-impossible' };

export type GameEventType = GameEvent['type'];

/** Anything that consumes the events of a tick (audio, announcer, renderer, HUD, recorder). */
export interface EventSink {
  handleEvents(events: readonly GameEvent[], tick: number): void;
}

// ─── Read-only views (output of the core) ──────────────────────────────────────────────────

export type SessionStatus = 'running' | 'ended';

export interface GameCounts {
  /** Lemmings in the level. */
  readonly total: number;
  /** Not yet released from the entrance. */
  readonly toRelease: number;
  /** Currently alive in the level (the classic "OUT" counter). */
  readonly out: number;
  /** Reached an exit (the classic "IN" counter). */
  readonly saved: number;
  readonly dead: number;
  readonly required: number;
}

/**
 * Live, allocation-free read access to a running session, for per-frame consumers
 * (renderer, HUD). Never mutate through it.
 */
export interface GameView {
  readonly level: CompiledLevel;
  readonly terrain: ReadonlyTerrain;
  readonly tick: number;
  readonly status: SessionStatus;
  readonly lemmings: readonly Readonly<Lemming>[];
  readonly releaseRate: number;
  readonly timeLeftTicks: number;
  readonly nuking: boolean;
  readonly skills: SkillCounts;
  readonly counts: GameCounts;
  readonly outcome: LevelOutcome | null;
  /** Per level.hazards index: ticks until a trap can fire again (0 = armed / not a trap). */
  readonly hazardCooldowns: readonly number[];
  /** Ticks the relaxed clock has run past 0:00 so far (0 unless relaxedTimer and time is up). */
  readonly overtimeTicks: number;
}

export type LemmingSnapshot = Readonly<Omit<Lemming, 'removed'>>;

/** A plain, JSON-serialisable copy of the game state (tests, test hook, save-states). */
export interface GameSnapshot {
  readonly levelId: string;
  readonly tick: number;
  readonly status: SessionStatus;
  readonly outcome: LevelOutcome | null;
  readonly releaseRate: number;
  readonly minReleaseRate: number;
  readonly timeLeftTicks: number;
  readonly timeLeftSeconds: number;
  readonly nuking: boolean;
  readonly counts: GameCounts;
  readonly skills: SkillCounts;
  readonly lemmings: readonly LemmingSnapshot[];
  readonly hazardCooldowns: readonly number[];
  readonly overtimeTicks: number;
}
