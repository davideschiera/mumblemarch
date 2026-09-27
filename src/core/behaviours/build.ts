/** Builder: lays BUILDER_BRICKS diagonal bricks, then shrugs. */
import {
  BRICK_WIDTH,
  BUILDER_BRICK_PHASE,
  BUILDER_BRICK_TICKS,
  BUILDER_BRICKS,
  BUILDER_STEP_PHASE,
  BUILDER_STEP_Y,
  BUILDER_WARN_BRICKS,
  BUILDER_WARN_PHASE,
  SHRUG_TICKS,
} from '../constants.ts';
import { Material, type Terrain } from '../terrain.ts';
import type { Lemming } from '../types.ts';
import { AIRBORNE_STATES, setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler, type TickContext } from './context.ts';
import { headAboveTop, isOutsideX, isSupported, startFalling, turnAround } from './movement.ts';

/** Lay one brick in the row above the foot, columns t = 0..BRICK_WIDTH-1 (dir-relative), into empty pixels only. */
function layBrick(lem: Lemming, ctx: TickContext): void {
  const { terrain, level } = ctx;
  const by = lem.y - 1;
  for (let t = 0; t < BRICK_WIDTH; t++) {
    const bx = lem.x + t * lem.dir;
    if (terrain.get(bx, by) === Material.Empty) terrain.set(bx, by, Material.Earth, level.brickColor);
  }
}

function clampX(lem: Lemming, terrain: Terrain): void {
  if (lem.x < 0) lem.x = 0;
  else if (lem.x >= terrain.width) lem.x = terrain.width - 1;
}

/** Step onto the new brick: net BUILDER_STEP_Y up, 2 px across (checked one pixel at a time). */
function stepBuilder(lem: Lemming, ctx: TickContext): void {
  const { terrain } = ctx;
  lem.y -= BUILDER_STEP_Y;
  lem.x += lem.dir;
  if (isOutsideX(terrain, lem.x) || terrain.isSolid(lem.x, lem.y - 1)) {
    clampX(lem, terrain);
    turnAround(lem);
    setState(lem, 'walking');
    return;
  }
  lem.x += lem.dir;
  if (isOutsideX(terrain, lem.x) || terrain.isSolid(lem.x, lem.y - 1)) {
    clampX(lem, terrain);
    turnAround(lem);
    setState(lem, 'walking');
    return;
  }
  if (terrain.isSolid(lem.x, lem.y - 9)) {
    turnAround(lem);
    setState(lem, 'walking');
    return;
  }
  if (headAboveTop(lem.y)) {
    setState(lem, 'walking');
    return;
  }
  if (lem.bricksLeft === 0) {
    setState(lem, 'shrugging');
    ctx.emit({ type: 'builder-finished', lemmingId: lem.id });
  }
}

export const building: StateHandler = (lem, ctx) => {
  if (!isSupported(ctx.terrain, lem)) {
    startFalling(lem);
    return;
  }
  const phase = lem.stateTicks % BUILDER_BRICK_TICKS;
  if (phase === BUILDER_BRICK_PHASE && lem.bricksLeft > 0) {
    layBrick(lem, ctx);
    lem.bricksLeft--;
  }
  if (phase === BUILDER_WARN_PHASE && lem.bricksLeft < BUILDER_WARN_BRICKS) {
    ctx.emit({ type: 'builder-low-bricks', lemmingId: lem.id, bricksLeft: lem.bricksLeft });
  }
  if (phase === BUILDER_STEP_PHASE) stepBuilder(lem, ctx);
};

export const shrugging: StateHandler = (lem, ctx) => {
  if (!isSupported(ctx.terrain, lem)) {
    startFalling(lem);
    return;
  }
  if (lem.stateTicks === SHRUG_TICKS) setState(lem, 'walking');
};

export const builderRule: SkillRule = {
  rejectReason: (lem) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (AIRBORNE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'airborne' };
    if (lem.state === 'blocking') return { reason: 'not-applicable', detail: 'is-blocker' };
    if (lem.state === 'building') return { reason: 'not-applicable', detail: 'same-job' }; // a shrugger is accepted: extends the stair
    if (headAboveTop(lem.y - BUILDER_STEP_Y)) return { reason: 'too-high' };
    return null;
  },
  assign: (lem) => {
    lem.bricksLeft = BUILDER_BRICKS;
    setState(lem, 'building');
  },
};
