/** Falling, floating (floater skill) and splatting. */
import {
  FALL_COUNTER_STEP,
  FALL_SPEED,
  FLOATER_OPEN_FALL,
  FLOATER_OPENING_DY,
  FLOAT_SPEED,
  MAX_SAFE_FALL,
  SPLAT_TICKS,
} from '../constants.ts';
import { setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler } from './context.ts';

export const falling: StateHandler = (lem, ctx) => {
  const { terrain } = ctx;
  if (lem.isFloater && lem.fallDistance > FLOATER_OPEN_FALL) {
    setState(lem, 'floating');
    return; // umbrella opens this tick; no movement yet
  }
  let moved = 0;
  while (moved < FALL_SPEED && !terrain.isSolid(lem.x, lem.y)) {
    lem.y += 1;
    moved += 1;
  }
  if (moved < FALL_SPEED) {
    // Landed (fewer than FALL_SPEED px were free).
    if (lem.fallDistance > MAX_SAFE_FALL) {
      setState(lem, 'splatting');
      ctx.kill(lem, 'splat');
    } else {
      setState(lem, 'walking');
    }
  } else {
    lem.fallDistance += FALL_COUNTER_STEP;
  }
};

export const floating: StateHandler = (lem, ctx) => {
  const { terrain } = ctx;
  if (terrain.isSolid(lem.x, lem.y)) {
    setState(lem, 'walking');
    return;
  }
  const dy =
    lem.stateTicks <= FLOATER_OPENING_DY.length ? (FLOATER_OPENING_DY[lem.stateTicks - 1] ?? FLOAT_SPEED) : FLOAT_SPEED;
  if (dy < 0) {
    lem.y += dy; // the umbrella's little upward bounce; never blocked
  } else if (dy > 0) {
    let moved = 0;
    while (moved < dy && !terrain.isSolid(lem.x, lem.y)) {
      lem.y += 1;
      moved += 1;
    }
  }
  if (terrain.isSolid(lem.x, lem.y)) setState(lem, 'walking');
};

/** The death was already counted (`falling` called ctx.kill); just play out the animation. */
export const splatting: StateHandler = (lem, _ctx) => {
  if (lem.stateTicks === SPLAT_TICKS) lem.removed = true;
};

export const floaterRule: SkillRule = {
  rejectReason: (lem) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.isFloater) return { reason: 'not-applicable', detail: 'already-floater' };
    return null;
  },
  assign: (lem) => {
    lem.isFloater = true;
  },
};
