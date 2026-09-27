/** Climbing up walls (climber skill) and hoisting over the top. */
import { CLIMB_FALLBACK, HOIST_TICKS } from '../constants.ts';
import { setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler } from './context.ts';
import { headAboveTop, startFalling, turnAround } from './movement.ts';

export const climbing: StateHandler = (lem, ctx) => {
  const { terrain } = ctx;
  // Overhang/ceiling check first, every tick: a solid pixel on the open side 8px above the
  // foot, or the head already at the level top clamp.
  if (terrain.isSolid(lem.x - lem.dir, lem.y - 8) || headAboveTop(lem.y)) {
    turnAround(lem);
    lem.x += CLIMB_FALLBACK * lem.dir; // new dir: 2px away from the wall
    startFalling(lem);
    return;
  }
  const phase = lem.stateTicks % 8;
  if (phase <= 3) {
    // Top check: has the wall's own column gone empty this far above the foot?
    if (!terrain.isSolid(lem.x, lem.y - 7 - phase)) {
      lem.y -= phase - 2;
      setState(lem, 'hoisting');
    }
  } else {
    lem.y -= 1;
  }
};

export const hoisting: StateHandler = (lem, _ctx) => {
  if (lem.stateTicks >= 1 && lem.stateTicks <= 4) lem.y -= 2;
  if (lem.stateTicks === HOIST_TICKS) setState(lem, 'walking'); // standing on the wall's top pixel
};

export const climberRule: SkillRule = {
  rejectReason: (lem) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.isClimber) return { reason: 'not-applicable', detail: 'already-climber' };
    return null;
  },
  assign: (lem) => {
    lem.isClimber = true;
  },
};
