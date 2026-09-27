/**
 * Simulation constants — every "magic number" of the physics lives here.
 *
 * Values follow docs/research/RESEARCH.md §2 (original DOS mechanics, via ccexplore's notes
 * and Lemmix). Tune them here only; behaviours must import, never hard-code.
 * Units: pixels (world space) and ticks (1 tick = one fixed simulation step).
 */

// ─── Time & world ──────────────────────────────────────────────────────────────────────────
/** The original ran its logic at 17 ticks per game-second; the clock drops 1 s per 17 ticks. */
export const TICKS_PER_SECOND = 17;
export const TICK_MS = 1000 / TICKS_PER_SECOND;
/** Level size rules (DESIGN D2): height always 160; width 400–1600 in steps of 8. */
export const LEVEL_HEIGHT = 160;
export const LEVEL_MIN_WIDTH = 400;
export const LEVEL_MAX_WIDTH = 1600;
export const LEVEL_WIDTH_STEP = 8;
export const MAX_LEMMINGS = 80;
export const MAX_ENTRANCES = 4;
export const MAX_SKILL_COUNT = 99;
/** A lemming's head is clamped at this y (it cannot rise above the level top). */
export const HEAD_CLAMP_Y = -5;
/** A lemming whose foot goes this far below the level bottom is removed (counted as lost). */
export const OUT_OF_BOUNDS_MARGIN = 3;

// ─── Walking ───────────────────────────────────────────────────────────────────────────────
// Both level edges act as walls (we do not copy the DOS right-edge inconsistency).
export const WALK_SPEED = 1;
/** Solid pixels above the foot at the next x: 1–2 = step up, 3–6 = "jump", ≥ WALL_HEIGHT = wall. */
export const MAX_STEP_UP = 2;
export const MAX_JUMP_UP = 6;
export const WALL_HEIGHT = 7;
/** Rise per tick while jumping up a 3–6 px ledge. */
export const JUMP_SPEED = 2;
/** With no floor ahead, a walker looks down this far and steps down; otherwise it falls. */
export const MAX_STEP_DOWN = 3;
/** Pixels a walker drops when it becomes a faller. */
export const WALK_OFF_DROP = 4;

// ─── Falling & floating ────────────────────────────────────────────────────────────────────
export const FALL_SPEED = 3;
/** The fall counter starts at FALL_COUNTER_STEP and grows by it every tick. */
export const FALL_COUNTER_STEP = 3;
/** Landing with a fall counter above this splats (≤ 63 px walk-off drop is safe). */
export const MAX_SAFE_FALL = 60;
/** A floater's umbrella opens once the fall counter exceeds this (~19 px fallen). */
export const FLOATER_OPEN_FALL = 16;
/** Per-tick dy while the umbrella opens, then FLOAT_SPEED. */
export const FLOATER_OPENING_DY: readonly number[] = [3, 3, 3, 3, -1, 0, 1, 1];
export const FLOAT_SPEED = 2;

// ─── Climbing ──────────────────────────────────────────────────────────────────────────────
/** Climbers rise CLIMB_STEP px every CLIMB_CYCLE_TICKS (0.5 px/tick). */
export const CLIMB_STEP = 4;
export const CLIMB_CYCLE_TICKS = 8;
/** Blocked by an overhang: turn around, drop away this far, fall. */
export const CLIMB_FALLBACK = 2;
export const HOIST_TICKS = 8;

// ─── Bomber ────────────────────────────────────────────────────────────────────────────────
/** Countdown shown as 5 → 1 above the head (~16 ticks per digit). Also used by the nuke. */
export const BOMB_FUSE_TICKS = 79;
export const OHNO_TICKS = 16;
/** Elliptical crater mask relative to the foot (x−8..x+7, y−14..y+7). Never removes steel. */
export const EXPLOSION_MASK = { dx: -8, dy: -14, w: 16, h: 22 } as const;

// ─── Blocker ───────────────────────────────────────────────────────────────────────────────
/** Others turn once their foot is 1..BLOCKER_REACH px from the blocker's x (12×12 px field). */
export const BLOCKER_REACH = 8;
export const BLOCKER_FIELD = { w: 12, h: 12 } as const;

// ─── Builder ───────────────────────────────────────────────────────────────────────────────
export const BUILDER_BRICKS = 12;
export const BRICK_WIDTH = 6;
export const BRICK_HEIGHT = 1;
/** One brick every BUILDER_BRICK_TICKS; net +2 px across and 1 px up per brick. */
export const BUILDER_BRICK_TICKS = 16;
export const BUILDER_STEP_X = 2;
export const BUILDER_STEP_Y = 1;
/** `builder-low-bricks` is emitted for each of the last N bricks. */
export const BUILDER_WARN_BRICKS = 3;
export const SHRUG_TICKS = 8;

// ─── Basher / miner / digger ───────────────────────────────────────────────────────────────
export const BASH_STROKE_TICKS = 16;
export const BASH_ADVANCE = 5;
export const BASH_MASK = { w: 16, h: 10 } as const;
/** While bashing, the lemming follows the floor down at most this far. */
export const BASH_FOLLOW_DOWN = 2;
/** Basher stops when it finds this much empty space BASH_LOOKAHEAD px ahead. */
export const BASH_LOOKAHEAD = { from: 8, to: 11, emptyPx: 4 } as const;
export const MINE_CYCLE_TICKS = 24;
export const MINE_ADVANCE_X = 4;
export const MINE_ADVANCE_Y = 2;
export const MINE_MASK = { w: 16, h: 13 } as const;
/** Digger removes x−4..x+4, one row every DIG_TICKS_PER_ROW ticks. */
export const DIG_HALF_WIDTH = 4;
export const DIG_TICKS_PER_ROW = 8;

// ─── Level flow ────────────────────────────────────────────────────────────────────────────
export const MIN_RELEASE_RATE = 1;
export const MAX_RELEASE_RATE = 99;
/** Start timeline (ticks): "Let's go!", hatch opens, first lemming. */
export const LETS_GO_TICK = 15;
export const ENTRANCE_OPEN_TICK = 35;
export const FIRST_SPAWN_TICK = 54;
/** Spawn order over 1–4 entrances (indices into level.entrances), repeated. */
export const ENTRANCE_ORDER: readonly (readonly number[])[] = [[0], [0, 1, 1, 0], [0, 1, 2, 1], [0, 1, 2, 3]];

/** Ticks between two releases at release rate `rate` (RR 99 → 4, RR 50 → 28, RR 1 → 53). */
export function releaseIntervalTicks(rate: number): number {
  const rr = Math.min(MAX_RELEASE_RATE, Math.max(MIN_RELEASE_RATE, Math.round(rate)));
  return Math.floor((99 - rr) / 2) + 4;
}

/** During a nuke, one more lemming gets a fuse every NUKE_INTERVAL_TICKS (release order). */
export const NUKE_INTERVAL_TICKS = 1;
// ─── Terminal animations (ticks) ───────────────────────────────────────────────────────────
export const SPLAT_TICKS = 16;
export const DROWN_TICKS = 16;
export const BURN_TICKS = 14;
export const EXIT_TICKS = 8;

/** `time-low` events fire when the clock crosses these values (seconds). */
export const TIME_WARNINGS_SECONDS: readonly number[] = [60, 30, 10];
/**
 * Exit trigger box relative to the exit anchor. The anchor is the floor pixel under the doorway
 * centre (same convention as a lemming's foot), so the box includes the anchor row (dy + h = 1).
 * Tested at the foot pixel only, and never while falling.
 */
export const EXIT_TRIGGER = { dx: -4, dy: -7, w: 8, h: 8 } as const;

// ─── Selection ─────────────────────────────────────────────────────────────────────────────
/**
 * Pick box around the foot. The original's 13×13 box is x−8..x+4 (its sprite is off-centre);
 * ours is centred because our sprites are. The UI may enlarge it for accessibility.
 */
export const LEMMING_HITBOX = { dx: -6, dy: -11, w: 13, h: 13 } as const;
/** Mouse picking snaps to the nearest lemming within this many CSS px when no hitbox hits (DESIGN §6.2.3). */
export const SNAP_RADIUS_CSS = 24;
/** Keyboard "next group" cycling jumps when lemmings are more than this many px apart (DESIGN §6.3.2). */
export const GROUP_GAP = 8;

// ─── Phase hooks (DESIGN §3.4): `phase = stateTicks % cycle`, used to sync sprite/terrain FX ──
/** Builder: the tick within BUILDER_BRICK_TICKS a brick is actually laid. */
export const BUILDER_BRICK_PHASE = 9;
/** Builder: the tick within BUILDER_BRICK_TICKS the "low bricks" warning flashes. */
export const BUILDER_WARN_PHASE = 10;
/** Builder: the tick within BUILDER_BRICK_TICKS the lemming steps onto the new brick (only once stateTicks > 0). */
export const BUILDER_STEP_PHASE = 0;
/** Basher: the tick range within BASH_STROKE_TICKS the stroke actually carves terrain. */
export const BASH_CARVE_PHASES = { from: 2, to: 5 } as const;
/** Basher: the tick range within BASH_STROKE_TICKS the lemming's sprite steps forward. */
export const BASH_MOVE_PHASES = { from: 11, to: 15 } as const;
/** Miner: the tick range within MINE_CYCLE_TICKS the stroke actually carves terrain. */
export const MINE_CARVE_PHASES = { from: 1, to: 2 } as const;
/** Miner: ticks within MINE_CYCLE_TICKS the lemming steps +2 px across (DESIGN §3.4). */
export const MINE_STEP_X_PHASES: readonly number[] = [3, 15];
/** Miner: ticks within MINE_CYCLE_TICKS the lemming steps +1 px down (DESIGN §3.4). */
export const MINE_STEP_Y_PHASES: readonly number[] = [0, 3];
/** Digger: the tick within DIG_TICKS_PER_ROW a row is actually removed. */
export const DIG_ROW_PHASE = 0;

// ─── Traps ─────────────────────────────────────────────────────────────────────────────────
/** Default trap cooldown (DESIGN §6.3.3) when a HazardDef omits cooldownSeconds. */
export const DEFAULT_TRAP_COOLDOWN_SECONDS = 2;
