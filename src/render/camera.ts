/**
 * Camera: which part of the level is visible. World pixels; DOM-free. The canvas backing store
 * is exactly VIEW_WIDTH × VIEW_HEIGHT world pixels and CSS scales it by an integer factor.
 * View size: 400×160 world px (DESIGN D2; the original showed 320×160).
 */
import type { Point } from '../core/types.ts';

export const VIEW_WIDTH = 400;
export const VIEW_HEIGHT = 160;

/** DESIGN §7.4: camera jumps ease over 200 ms (ease-out cubic); instant when reduced motion. */
const EASE_MS = 200;

export class Camera {
  x = 0;
  y = 0;
  readonly viewW: number;
  readonly viewH: number;
  private levelW: number;
  private levelH: number;

  // In-flight `centerOn(..., { animate: true })` easing (200 ms ease-out cubic).
  private animActive = false;
  private animFromX = 0;
  private animFromY = 0;
  private animToX = 0;
  private animToY = 0;
  private animElapsedMs = 0;

  constructor(viewW = VIEW_WIDTH, viewH = VIEW_HEIGHT) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.levelW = viewW;
    this.levelH = viewH;
  }

  setLevelSize(width: number, height: number): void {
    this.animActive = false;
    this.levelW = width;
    this.levelH = height;
    this.clamp();
  }

  scrollBy(dx: number, dy = 0): void {
    this.animActive = false;
    this.x += dx;
    this.y += dy;
    this.clamp();
  }

  /**
   * Move the camera to centre on (x, y). `options.animate` eases from the CURRENT position over
   * 200 ms (ease-out cubic `1 − (1 − p)³`), `x`/`y` rounded to integers on every `update()`; a
   * new `centerOn` mid-flight retargets from wherever the camera currently is. Not animated (the
   * default): an instant cut, and any in-flight animation is cancelled.
   */
  centerOn(x: number, y: number = this.levelH / 2, options?: { readonly animate?: boolean }): void {
    const targetX = this.clampX(Math.round(x - this.viewW / 2));
    const targetY = this.clampY(Math.round(y - this.viewH / 2));
    if (options?.animate) {
      this.animFromX = this.x;
      this.animFromY = this.y;
      this.animToX = targetX;
      this.animToY = targetY;
      this.animElapsedMs = 0;
      this.animActive = true;
    } else {
      this.animActive = false;
      this.x = targetX;
      this.y = targetY;
    }
  }

  /** Advance any in-flight centre-on easing by `elapsedMs`. No-op once it has finished. */
  update(elapsedMs: number): void {
    if (!this.animActive) return;
    this.animElapsedMs += elapsedMs;
    const t = Math.min(1, this.animElapsedMs / EASE_MS);
    const eased = 1 - (1 - t) ** 3;
    this.x = Math.round(this.animFromX + (this.animToX - this.animFromX) * eased);
    this.y = Math.round(this.animFromY + (this.animToY - this.animFromY) * eased);
    if (t >= 1) this.animActive = false;
  }

  /** True while an animated `centerOn()` is still easing. */
  get animating(): boolean {
    return this.animActive;
  }

  get levelWidth(): number {
    return this.levelW;
  }

  /** View pixel → world pixel. */
  toWorld(viewX: number, viewY: number): Point {
    return { x: Math.floor(viewX + this.x), y: Math.floor(viewY + this.y) };
  }

  private clampX(v: number): number {
    return Math.max(0, Math.min(v, Math.max(0, this.levelW - this.viewW)));
  }

  private clampY(v: number): number {
    return Math.max(0, Math.min(v, Math.max(0, this.levelH - this.viewH)));
  }

  private clamp(): void {
    this.x = this.clampX(this.x);
    this.y = this.clampY(this.y);
  }
}

/** Largest integer scale in [min, max] at which the view fits in the available CSS pixels. */
export function integerScale(
  availableW: number,
  availableH: number,
  { min = 1, max = 8, viewW = VIEW_WIDTH, viewH = VIEW_HEIGHT } = {},
): number {
  const fit = Math.floor(Math.min(availableW / viewW, availableH / viewH));
  return Math.min(max, Math.max(min, fit));
}
