/**
 * Sprite animation primitives: pixel-row frames and the frame-index rule (DESIGN §3.4).
 * Hand-written (not generated) — the shapes the generated art data is checked against.
 */

/** One frame: rows of one-char-per-pixel strings ('.' = transparent). */
export type PixelFrame = readonly string[];

export interface Anim {
  readonly frames: readonly PixelFrame[];
  readonly ticksPerFrame: number;
  /** Foot anchor inside the frame: right-facing draw origin = (x − footX, y − footY). */
  readonly footX: number;
  readonly footY: number;
  readonly loop: boolean;
  /** Once every frame has played, the loop tail starts here (default 0 → wraps the whole clip). */
  readonly loopFrom?: number;
}

/**
 * Which frame to show after `ticks` ticks in the current state (DESIGN §3.4):
 * `i = floor(ticks / ticksPerFrame)`; a loop wraps the tail from `loopFrom` (default 0); a
 * one-shot clamps to the last frame.
 */
export function animFrameIndex(anim: Anim, ticks: number): number {
  const n = anim.frames.length;
  const i = Math.floor(ticks / anim.ticksPerFrame);
  if (!anim.loop) return Math.min(i, n - 1);
  if (i < n) return i;
  const loopFrom = anim.loopFrom ?? 0;
  const tailLength = n - loopFrom;
  return loopFrom + ((i - loopFrom) % tailLength);
}
