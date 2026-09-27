/** Digger: tunnels straight down. */
import { DIG_HALF_WIDTH, DIG_ROW_PHASE, DIG_TICKS_PER_ROW } from '../constants.ts';
import { AIRBORNE_STATES, setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler } from './context.ts';
import { isSteel, startFalling } from './movement.ts';

export const digging: StateHandler = (lem, ctx) => {
  // Workers lose ground (§S): unsupported at the start of the handler → falling.
  if (!ctx.terrain.isSolid(lem.x, lem.y)) {
    startFalling(lem);
    return;
  }
  if (lem.stateTicks % DIG_TICKS_PER_ROW !== DIG_ROW_PHASE) return;

  const xFrom = lem.x - DIG_HALF_WIDTH;
  const xTo = lem.x + DIG_HALF_WIDTH;

  for (let x = xFrom; x <= xTo; x++) {
    if (isSteel(ctx.terrain, x, lem.y)) {
      ctx.emit({ type: 'hit-steel', lemmingId: lem.id, x, y: lem.y });
      setState(lem, 'walking');
      return;
    }
  }

  let hasFloor = false;
  for (let x = xFrom; x <= xTo; x++) {
    if (ctx.terrain.isSolid(x, lem.y)) {
      hasFloor = true;
      break;
    }
  }
  if (!hasFloor) {
    startFalling(lem);
    return;
  }

  // Digging ignores one-way walls (dir 0 never matches OneWayLeft/Right) and never removes steel.
  for (let x = xFrom; x <= xTo; x++) ctx.terrain.remove(x, lem.y, 0);
  lem.y += 1;

  let hasNewFloor = false;
  for (let x = xFrom; x <= xTo; x++) {
    if (ctx.terrain.isSolid(x, lem.y)) {
      hasNewFloor = true;
      break;
    }
  }
  if (!hasNewFloor) startFalling(lem);
};

export const diggerRule: SkillRule = {
  rejectReason: (lem, ctx) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (AIRBORNE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'airborne' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.state === 'digging') return { reason: 'not-applicable', detail: 'same-job' };
    for (let x = lem.x - DIG_HALF_WIDTH; x <= lem.x + DIG_HALF_WIDTH; x++) {
      if (isSteel(ctx.terrain, x, lem.y)) return { reason: 'steel', detail: 'below' };
    }
    return null;
  },
  assign: (lem, _ctx) => setState(lem, 'digging'),
};
