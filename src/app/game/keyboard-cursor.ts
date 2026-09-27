/**
 * KeyboardCursor — the W A S D crosshair (DESIGN §6.2.4): starts at the target mumble (else the
 * view centre); tap = 2 world px; hold (after 150 ms) 60 → 180 px/s over 600 ms; Shift ×2;
 * diagonals normalised; clamped to the view; pushing a side edge scrolls the camera at the
 * cursor's speed. Moving it clears the lock-on selection (§6.2.2). The pick under it, the snap
 * and the settle announcement are Selection's (it re-picks at `state.cursor` every frame).
 * Writes PlayState: cursor, cursorMode ('keyboard'). Ramp math: `rampSpeed()` (hold-repeat.ts);
 * normalisation/clamp/edge-push math: `cursor-motion.ts` (both pure, unit-tested).
 * Owner: E4b.
 */
import type { Point } from '../../core/types.ts';
import type { ActionPhase } from '../../input/handler.ts';
import { CURSOR_HOLD_DELAY_MS, CURSOR_RAMP_MS, CURSOR_SHIFT_FACTOR, CURSOR_SPEED_MAX, CURSOR_SPEED_MIN, CURSOR_TAP_STEP } from '../config.ts';
import type { PlayContext } from './context.ts';
import { clampToView, edgePushX, normalizeDirection } from './cursor-motion.ts';
import { rampSpeed } from './hold-repeat.ts';

export type CursorAction = 'cursor-left' | 'cursor-right' | 'cursor-up' | 'cursor-down';

const DIRECTIONS: Readonly<Record<CursorAction, Point>> = {
  'cursor-left': { x: -1, y: 0 },
  'cursor-right': { x: 1, y: 0 },
  'cursor-up': { x: 0, y: -1 },
  'cursor-down': { x: 0, y: 1 },
};

export class KeyboardCursor {
  private readonly ctx: PlayContext;
  /** Held cursor keys → ms held. */
  private readonly held = new Map<CursorAction, number>();
  private shift = false;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.2.4 W A S D down/up. A press moves one tap step at once and starts the hold ramp. */
  key(action: CursorAction, phase: ActionPhase, shift: boolean): void {
    if (phase === 'up') {
      this.held.delete(action);
      return;
    }
    this.shift = shift;
    this.held.set(action, 0);
    this.enterKeyboardMode();
    const d = DIRECTIONS[action];
    this.moveBy(d.x * CURSOR_TAP_STEP, d.y * CURSOR_TAP_STEP);
  }

  /** In-canvas crosshair position (keyboard mode only; RenderState.keyboardCursor). */
  get position(): Point | null {
    return this.ctx.state.cursorMode === 'keyboard' ? this.ctx.state.cursor : null;
  }

  /** Per frame (also while paused): held-key ramp movement, diagonals normalised. */
  frame(elapsedMs: number): void {
    if (this.held.size === 0) return;
    let dirX = 0;
    let dirY = 0;
    let speed = 0;
    for (const [action, ms] of this.held) {
      const heldMs = ms + elapsedMs;
      this.held.set(action, heldMs);
      const d = DIRECTIONS[action];
      dirX += d.x;
      dirY += d.y;
      speed = Math.max(speed, rampSpeed(heldMs, CURSOR_HOLD_DELAY_MS, CURSOR_SPEED_MIN, CURSOR_SPEED_MAX, CURSOR_RAMP_MS));
    }
    const dir = normalizeDirection(dirX, dirY);
    const distance = (speed * (this.shift ? CURSOR_SHIFT_FACTOR : 1) * elapsedMs) / 1000;
    if (distance > 0 && (dir.x !== 0 || dir.y !== 0)) this.moveBy(dir.x * distance, dir.y * distance);
  }

  /** §6.2.4: the cursor starts at the target mumble, else the view centre; W A S D clears selectedId. */
  private enterKeyboardMode(): void {
    const { state, services, modules } = this.ctx;
    if (state.cursorMode !== 'keyboard' || !state.cursor) {
      const target = modules.selection.target();
      const { camera } = services;
      state.cursor = target ? { x: target.x, y: target.y - 5 } : { x: camera.x + camera.viewW / 2, y: camera.y + camera.viewH / 2 };
      state.cursorMode = 'keyboard';
    }
    modules.selection.clear();
  }

  /**
   * Move by `(dx, dy)`, clamped to the view; pushing against a side edge scrolls the camera by
   * the overflow instead of just stopping the cursor there (DESIGN §6.2.4).
   */
  private moveBy(dx: number, dy: number): void {
    const { state, services, modules } = this.ctx;
    const camera = services.camera;
    const base = state.cursor ?? { x: camera.x + camera.viewW / 2, y: camera.y + camera.viewH / 2 };
    const x = base.x + dx;
    const y = base.y + dy;
    const push = edgePushX(x, camera);
    if (push !== 0) modules.camera.manualScroll(push);
    state.cursor = clampToView({ x, y }, camera);
  }
}
