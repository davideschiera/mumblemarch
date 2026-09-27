/** End-of-life states: exiting (saved), drowning, burning. */
import { BURN_TICKS, DROWN_TICKS, EXIT_TICKS } from '../constants.ts';
import type { StateHandler } from './context.ts';
import { isSolidOrEdge } from './movement.ts';

export const exiting: StateHandler = (lem, ctx) => {
  if (lem.stateTicks === EXIT_TICKS) ctx.save(lem);
};

/** The death was already counted (a water trigger calls ctx.kill before this state starts). */
export const drowning: StateHandler = (lem, ctx) => {
  if (!isSolidOrEdge(ctx.terrain, lem.x + lem.dir, lem.y - 1)) lem.x += lem.dir;
  if (lem.stateTicks === DROWN_TICKS) lem.removed = true;
};

/** The death was already counted (a fire trigger calls ctx.kill before this state starts). */
export const burning: StateHandler = (lem, _ctx) => {
  if (lem.stateTicks === BURN_TICKS) lem.removed = true;
};
