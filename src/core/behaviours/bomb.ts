/** Bomber: fuse countdown (runs in every state), "oh no", explosion. */
import { BOMB_FUSE_TICKS, EXPLOSION_MASK, FALL_SPEED, OHNO_TICKS } from '../constants.ts';
import type { Lemming, LemmingState } from '../types.ts';
import { setState, UNASSIGNABLE_STATES, type SkillRule, type StateHandler, type TickContext } from './context.ts';
import { isSupported } from './movement.ts';

/**
 * States `tickFuse` leaves entirely alone (their animation is already running its course and
 * must finish uninterrupted). Note this is NOT `UNASSIGNABLE_STATES`: a drowning lemming's fuse
 * keeps ticking (and can explode it before it drowns).
 */
const FUSE_FROZEN_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'exiting',
  'splatting',
  'burning',
  'ohno',
  'exploding',
]);

/** Called by the session for every lemming before its state handler. */
export function tickFuse(lem: Lemming, ctx: TickContext): void {
  if (lem.fuseTicks === 0 || FUSE_FROZEN_STATES.has(lem.state)) return;
  lem.fuseTicks--;
  if (lem.fuseTicks > 0) return;
  // A lemming already unsupported (or drowning) has no time left for the "oh no" pause.
  if (lem.state === 'falling' || lem.state === 'floating' || lem.state === 'drowning') {
    setState(lem, 'exploding');
    return;
  }
  setState(lem, 'ohno');
  ctx.emit({ type: 'lemming-ohno', lemmingId: lem.id, nuking: ctx.nuking });
}

export const ohno: StateHandler = (lem, ctx) => {
  for (let i = 0; i < FALL_SPEED && !isSupported(ctx.terrain, lem); i++) lem.y++;
  if (lem.stateTicks === OHNO_TICKS) setState(lem, 'exploding');
};

export const exploding: StateHandler = (lem, ctx) => {
  const { x, y } = lem;
  const x0 = x + EXPLOSION_MASK.dx;
  const y0 = y + EXPLOSION_MASK.dy;
  // Integer elliptical mask (the preview sim's ellipse, scaled to avoid floats): centre offset
  // 3 px below the foot, half-axes 8×11 in the doubled-and-offset coordinate the original uses.
  for (let py = y0; py < y0 + EXPLOSION_MASK.h; py++) {
    for (let px = x0; px < x0 + EXPLOSION_MASK.w; px++) {
      const a = (2 * (px - x) + 1) * 11;
      const b = (2 * (py - y + 3) + 1) * 8;
      if (a * a + b * b <= 176 * 176) ctx.terrain.remove(px, py, 0); // dir 0: never steel, one-way ignored
    }
  }
  ctx.emit({ type: 'explosion', lemmingId: lem.id, x, y });
  ctx.kill(lem, 'explode'); // neighbours are unharmed — only terrain changes
};

export const bomberRule: SkillRule = {
  rejectReason: (lem) => {
    if (UNASSIGNABLE_STATES.has(lem.state)) return { reason: 'not-applicable', detail: 'busy-dying' };
    if (lem.fuseTicks > 0) return { reason: 'not-applicable', detail: 'fuse-lit' }; // blockers accept bombers
    return null;
  },
  assign: (lem) => {
    lem.fuseTicks = BOMB_FUSE_TICKS;
  },
};
