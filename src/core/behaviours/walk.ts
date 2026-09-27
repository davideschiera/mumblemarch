/** Walking: the default state. Steps up/down slopes, turns at walls/blockers, falls off edges. */
import { JUMP_SPEED, MAX_STEP_DOWN, MAX_STEP_UP, WALK_OFF_DROP, WALK_SPEED, WALL_HEIGHT } from '../constants.ts';
import { setState, type StateHandler } from './context.ts';
import { gapBelow, headAboveTop, isOutsideX, solidRunAbove, startFalling, turnAround } from './movement.ts';

export const walking: StateHandler = (lem, ctx) => {
  const { terrain } = ctx;
  const nx = lem.x + lem.dir * WALK_SPEED;
  if (isOutsideX(terrain, nx)) {
    turnAround(lem);
    return;
  }
  lem.x = nx;

  if (terrain.isSolid(lem.x, lem.y)) {
    // Solid pixels directly above the new foot column, capped at WALL_HEIGHT.
    const r = solidRunAbove(terrain, lem.x, lem.y, WALL_HEIGHT);
    if (r >= WALL_HEIGHT) {
      // Wall: climbers climb it (at this x, the wall's face column); everyone else turns back.
      if (lem.isClimber) {
        setState(lem, 'climbing');
      } else {
        lem.x -= lem.dir;
        turnAround(lem);
      }
      return;
    }
    const newY = lem.y - r; // where the foot would end up once the step/jump completes
    if (headAboveTop(newY)) {
      // A rise that would clamp the head counts as a wall: turn, never step/jump/climb.
      lem.x -= lem.dir;
      turnAround(lem);
      return;
    }
    if (r <= MAX_STEP_UP) {
      lem.y = newY;
    } else {
      // 3..MAX_JUMP_UP: start a jump; `jumping` finishes the rise over the following ticks.
      lem.y -= JUMP_SPEED;
      setState(lem, 'jumping');
    }
  } else {
    const d = gapBelow(terrain, lem.x, lem.y, MAX_STEP_DOWN);
    if (d > 0) {
      lem.y += d;
    } else {
      lem.y += WALK_OFF_DROP;
      startFalling(lem);
    }
  }
};

export const jumping: StateHandler = (lem, ctx) => {
  const { terrain } = ctx;
  for (let i = 0; i < JUMP_SPEED; i++) {
    if (!terrain.isSolid(lem.x, lem.y - 1)) break;
    lem.y -= 1;
  }
  if (!terrain.isSolid(lem.x, lem.y - 1)) setState(lem, 'walking');
};
