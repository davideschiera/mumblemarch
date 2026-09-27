/**
 * The contract between the session and lemming behaviours.
 *
 * A behaviour is a plain function of (lemming, context). It may mutate the lemming and the
 * terrain, and report facts via `emit`; it must not keep state of its own.
 */
import type { Rng } from '../rng.ts';
import type { Terrain } from '../terrain.ts';
import type {
  CompiledLevel,
  DeathCause,
  Direction,
  GameEvent,
  Lemming,
  LemmingState,
  Rejection,
} from '../types.ts';

export interface TickContext {
  readonly tick: number;
  readonly level: CompiledLevel;
  readonly terrain: Terrain;
  readonly rng: Rng;
  /** All active lemmings in release order (for blocker-overlap checks and the like). */
  readonly lemmings: readonly Readonly<Lemming>[];
  readonly nuking: boolean;
  emit(event: GameEvent): void;
  /**
   * Blocker field at (x, y), ignoring blocker `selfId`: the direction a lemming there is
   * turned to (-1 left column, +1 right column), or 0 (no field / neutral middle column).
   */
  blockerTurn(x: number, y: number, selfId: number): Direction | 0;
  /** Mark `lem` dead (removed at end of tick) and emit `lemming-died`. */
  kill(lem: Lemming, cause: DeathCause): void;
  /** Mark `lem` saved (removed at end of tick) and emit `lemming-exited`. */
  save(lem: Lemming): void;
}

/** Advances a lemming in one state by one tick. */
export type StateHandler = (lem: Lemming, ctx: TickContext) => void;

/** How a skill is given to a lemming (rules: RESEARCH §2.5, DESIGN D7). */
export interface SkillRule {
  /**
   * Why this lemming cannot receive the skill right now, or null if it can. Pure — no side
   * effects. The session has already checked the skill count.
   */
  rejectReason(lem: Readonly<Lemming>, ctx: TickContext): Rejection | null;
  /** Apply the skill (only called after `rejectReason` returned null). */
  assign(lem: Lemming, ctx: TickContext): void;
}

/** States in which a lemming accepts no skill at all (dying or leaving — DESIGN D7). */
export const UNASSIGNABLE_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'splatting',
  'ohno',
  'exploding',
  'drowning',
  'burning',
  'exiting',
]);

/** Airborne/wall states that only accept climber, floater or bomber (RESEARCH §2.5). */
export const AIRBORNE_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'falling',
  'jumping',
  'climbing',
  'hoisting',
  'floating',
]);

/** Switch state and reset the per-state timer. Always use this instead of writing `state`. */
export function setState(lem: Lemming, state: LemmingState): void {
  lem.state = state;
  lem.stateTicks = 0;
}
