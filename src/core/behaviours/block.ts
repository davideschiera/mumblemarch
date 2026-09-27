/** Blocker: stands still and turns other walkers around. */
import { BLOCKER_FIELD } from '../constants.ts';
import type { Lemming } from '../types.ts';
import { AIRBORNE_STATES, setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler, type TickContext } from './context.ts';
import { isSupported } from './movement.ts';

export const blocking: StateHandler = (lem, ctx) => {
  // Workers lose ground: unsupported → reverts to walking (which then falls on its own next tick).
  if (!isSupported(ctx.terrain, lem)) setState(lem, 'walking');
  // Otherwise stays put; its BLOCKER_FIELD is applied by the session (blockerTurn), not here.
};

/** Another `blocking` lemming whose field (BLOCKER_FIELD.w × BLOCKER_FIELD.h) overlaps `lem`. */
function overlapsBlocker(lem: Readonly<Lemming>, ctx: TickContext): boolean {
  for (const other of ctx.lemmings) {
    if (other.id === lem.id || other.state !== 'blocking') continue;
    if (Math.abs(lem.x - other.x) < BLOCKER_FIELD.w && Math.abs(lem.y - other.y) < BLOCKER_FIELD.h) return true;
  }
  return false;
}

export const blockerRule: SkillRule = {
  rejectReason: (lem, ctx) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (AIRBORNE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'airborne' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (overlapsBlocker(lem, ctx)) return { reason: 'blocker-overlap' };
    return null;
  },
  assign: (lem) => {
    setState(lem, 'blocking');
  },
};
