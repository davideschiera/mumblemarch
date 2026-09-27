/** Miner: tunnels diagonally downwards. */
import { MINE_CARVE_PHASES, MINE_CYCLE_TICKS, MINE_STEP_X_PHASES, MINE_STEP_Y_PHASES } from '../constants.ts';
import type { Lemming } from '../types.ts';
import {
  AIRBORNE_STATES,
  setState,
  UNASSIGNABLE_STATES,
  type SkillRule,
  type StateHandler,
  type TickContext,
} from './context.ts';
import {
  minerCarve,
  minerFirstSteel,
  minerOneWayAgainst,
  minerSteelAboveRow,
  minerSteelAtOrBelowRow,
} from './masks.ts';
import { isOutsideX, isSteel, startFalling, turnAround } from './movement.ts';

/** After a move: outside the level → undo the x change, turn, walking; else unsupported → falling. */
function afterMove(lem: Lemming, ctx: TickContext, oldX: number): void {
  if (isOutsideX(ctx.terrain, lem.x)) {
    lem.x = oldX;
    turnAround(lem);
    setState(lem, 'walking');
    return;
  }
  if (!ctx.terrain.isSolid(lem.x, lem.y)) startFalling(lem);
}

export const mining: StateHandler = (lem, ctx) => {
  // Workers lose ground (§S): unsupported at the start of the handler → falling.
  if (!ctx.terrain.isSolid(lem.x, lem.y)) {
    startFalling(lem);
    return;
  }

  const phase = lem.stateTicks % MINE_CYCLE_TICKS;

  if (phase >= MINE_CARVE_PHASES.from && phase <= MINE_CARVE_PHASES.to) {
    // Phase 1 (MINE_CARVE_PHASES.from) carves anchored at the foot; phase 2 at (x+dir, y+1) —
    // neither has moved the lemming yet (moves happen on phases 3/15/0), so both anchors are
    // relative to the same pre-move (x, y).
    const ax = phase === MINE_CARVE_PHASES.from ? lem.x : lem.x + lem.dir;
    const ay = phase === MINE_CARVE_PHASES.from ? lem.y : lem.y + 1;
    const hit = minerFirstSteel(ctx.terrain, ax, ay, lem.dir);
    if (hit) {
      ctx.emit({ type: 'hit-steel', lemmingId: lem.id, x: hit.x, y: hit.y });
      turnAround(lem);
      setState(lem, 'walking');
      return;
    }
    if (minerOneWayAgainst(ctx.terrain, ax, ay, lem.dir)) {
      turnAround(lem);
      setState(lem, 'walking');
      return;
    }
    minerCarve(ctx.terrain, ax, ay, lem.dir);
    return; // carve ticks never also move (MINE_CARVE_PHASES and the step phases are disjoint)
  }

  const stepX = MINE_STEP_X_PHASES.includes(phase);
  const stepY = MINE_STEP_Y_PHASES.includes(phase) && lem.stateTicks > 0;
  if (!stepX && !stepY) return;

  const oldX = lem.x;
  if (stepX) lem.x += 2 * lem.dir;
  if (stepY) lem.y += 1;
  afterMove(lem, ctx, oldX);
};

export const minerRule: SkillRule = {
  rejectReason: (lem, ctx) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (AIRBORNE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'airborne' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.state === 'mining') return { reason: 'not-applicable', detail: 'same-job' };

    const { x, y, dir } = lem;
    const ax2 = x + dir;
    const ay2 = y + 1;
    // The first cycle's test region = both carves (phase 1 anchored at (x,y), phase 2 at
    // (x+dir, y+1)) that would fire before the miner could ever be turned away.
    if (minerSteelAboveRow(ctx.terrain, x, y, dir, y) || minerSteelAboveRow(ctx.terrain, ax2, ay2, dir, y)) {
      return { reason: 'steel', detail: 'ahead' };
    }
    if (
      isSteel(ctx.terrain, x, y) ||
      isSteel(ctx.terrain, x, y + 1) ||
      minerSteelAtOrBelowRow(ctx.terrain, x, y, dir, y) ||
      minerSteelAtOrBelowRow(ctx.terrain, ax2, ay2, dir, y)
    ) {
      return { reason: 'steel', detail: 'below' };
    }
    if (minerOneWayAgainst(ctx.terrain, x, y, dir) || minerOneWayAgainst(ctx.terrain, ax2, ay2, dir)) {
      return { reason: 'one-way', detail: 'ahead' };
    }
    return null;
  },
  assign: (lem, _ctx) => setState(lem, 'mining'),
};
