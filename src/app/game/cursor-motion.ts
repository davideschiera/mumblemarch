/**
 * Pure keyboard-cursor movement math (DESIGN §6.2.4): normalising a diagonal direction so two
 * orthogonal keys held together move at the same speed as one, clamping the cursor to the
 * current view, and how far past a side edge a move would land (so the caller can scroll the
 * camera by exactly that much instead). The held-key ramp speed itself is `rampSpeed()`
 * (`hold-repeat.ts`). DOM-free so every piece is unit-testable in Node.
 * Owner: E4b.
 */
import type { Point } from '../../core/types.ts';

/** The view rectangle a cursor is confined to (`render/camera.ts`'s `Camera` shape). */
export interface CursorView {
  readonly x: number;
  readonly y: number;
  readonly viewW: number;
  readonly viewH: number;
}

/**
 * Unit vector for the summed direction `(x, y)` (each in [-1, 1] per held key, DESIGN §6.2.4
 * "diagonals are normalised"); `{0, 0}` when nothing is held or opposite keys cancel out.
 */
export function normalizeDirection(x: number, y: number): Point {
  if (x === 0 || y === 0) return { x: Math.sign(x), y: Math.sign(y) };
  const len = Math.sqrt(x * x + y * y);
  return { x: x / len, y: y / len };
}

/** Clamp a point to stay inside `view` (DESIGN §6.2.4 "the cursor stays inside the view"). */
export function clampToView(p: Point, view: CursorView): Point {
  return {
    x: Math.max(view.x, Math.min(view.x + view.viewW - 1, p.x)),
    y: Math.max(view.y, Math.min(view.y + view.viewH - 1, p.y)),
  };
}

/**
 * How far past `view`'s left/right edge `x` lands (negative = past the left edge, positive =
 * past the right edge, 0 = inside) — the camera scroll needed to keep pushing the cursor in that
 * direction instead of just clamping it (DESIGN §6.2.4 "pushing a side edge scrolls the camera at
 * the cursor's speed").
 */
export function edgePushX(x: number, view: CursorView): number {
  if (x < view.x) return x - view.x;
  if (x > view.x + view.viewW - 1) return x - (view.x + view.viewW - 1);
  return 0;
}
