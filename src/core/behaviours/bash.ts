/** Basher: tunnels horizontally. */
import { BASH_CARVE_PHASES, BASH_FOLLOW_DOWN, BASH_LOOKAHEAD, BASH_MOVE_PHASES, BASH_STROKE_TICKS } from '../constants.ts';
import { AIRBORNE_STATES, setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler } from './context.ts';
import { basherCarve, basherFirstSteel, basherOneWayAgainst } from './masks.ts';
import { gapBelow, isOutsideX, isSolidOrEdge, startFalling, turnAround } from './movement.ts';

export const bashing: StateHandler = (lem, ctx) => {
  // Workers lose ground (§S): unsupported at the start of the handler → falling.
  if (!ctx.terrain.isSolid(lem.x, lem.y)) {
    startFalling(lem);
    return;
  }

  const phase = lem.stateTicks % BASH_STROKE_TICKS;

  if (phase >= BASH_CARVE_PHASES.from && phase <= BASH_CARVE_PHASES.to) {
    const hit = basherFirstSteel(ctx.terrain, lem.x, lem.y, lem.dir);
    if (hit) {
      ctx.emit({ type: 'hit-steel', lemmingId: lem.id, x: hit.x, y: hit.y });
      turnAround(lem);
      setState(lem, 'walking');
      return;
    }
    if (basherOneWayAgainst(ctx.terrain, lem.x, lem.y, lem.dir)) {
      turnAround(lem);
      setState(lem, 'walking');
      return;
    }
    basherCarve(ctx.terrain, lem.x, lem.y, lem.dir);

    // Lookahead: only on the last carve tick of the FIRST stroke of every 32-tick (2-stroke)
    // cycle — bashers therefore always finish with an odd number of strokes (RESEARCH notes).
    if (lem.stateTicks % (2 * BASH_STROKE_TICKS) === BASH_CARVE_PHASES.to) {
      let empty = true;
      for (let k = BASH_LOOKAHEAD.from; k <= BASH_LOOKAHEAD.to; k++) {
        if (isSolidOrEdge(ctx.terrain, lem.x + k * lem.dir, lem.y - 6)) {
          empty = false;
          break;
        }
      }
      if (empty) {
        setState(lem, 'walking');
        return;
      }
    }
    return; // carve ticks never also move (BASH_CARVE_PHASES and BASH_MOVE_PHASES are disjoint)
  }

  if (phase >= BASH_MOVE_PHASES.from && phase <= BASH_MOVE_PHASES.to) {
    const nx = lem.x + lem.dir;
    if (isOutsideX(ctx.terrain, nx)) {
      turnAround(lem);
      setState(lem, 'walking');
      return;
    }
    lem.x = nx;
    if (!ctx.terrain.isSolid(lem.x, lem.y)) {
      const d = gapBelow(ctx.terrain, lem.x, lem.y, 3);
      if (d >= 1 && d <= BASH_FOLLOW_DOWN) {
        lem.y += d;
      } else {
        startFalling(lem);
      }
    }
  }
};

export const basherRule: SkillRule = {
  rejectReason: (lem, ctx) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (AIRBORNE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'airborne' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.state === 'bashing') return { reason: 'not-applicable', detail: 'same-job' };
    if (basherFirstSteel(ctx.terrain, lem.x, lem.y, lem.dir)) return { reason: 'steel', detail: 'ahead' };
    if (basherOneWayAgainst(ctx.terrain, lem.x, lem.y, lem.dir)) return { reason: 'one-way', detail: 'ahead' };
    return null;
  },
  assign: (lem, _ctx) => setState(lem, 'bashing'),
};
