/**
 * Pure, DOM-free geometry for mumble sprites and canvas overlays (DESIGN §3.4 "Sprite spec" /
 * "Overlay placement", §5.3 "Playfield cursor", §6.3.1 "Hover highlight"). No canvas drawing
 * happens here — `sprites.ts`, `overlays.ts` and `cursor.ts` turn these numbers into
 * `drawImage`/`fillRect` calls. Kept import-free of anything DOM so it can be exercised directly
 * under Node (no `tsconfig` DOM lib needed).
 */
import type { Direction, LemmingState } from '../core/types.ts';
import { animFrameIndex, MUMBLE_ANIMS, OVERLAYS, type PixelFrame } from '../art/index.ts';

/** Pixel width of a frame: the length of its longest row. */
export function frameWidth(rows: PixelFrame): number {
  let width = 0;
  for (const row of rows) if (row.length > width) width = row.length;
  return width;
}

/** Which animation frame to show after `stateTicks` ticks in `state` (DESIGN §3.4). */
export function mumbleFrameIndex(state: LemmingState, stateTicks: number): number {
  return animFrameIndex(MUMBLE_ANIMS[state], stateTicks);
}

/** The frame's rows, falling back to frame 0 (then an empty frame) if `frameIndex` is out of range. */
function frameRows(state: LemmingState, frameIndex: number): PixelFrame {
  const { frames } = MUMBLE_ANIMS[state];
  return frames[frameIndex] ?? frames[0] ?? [];
}

/**
 * Left edge of the sprite's draw origin, in the same px unit as `x` (world or view):
 * facing right, `x − footX`; mirrored (facing left), `x − (w − 1 − footX)` where `w` is the
 * drawn frame's pixel width.
 */
export function spriteOriginX(state: LemmingState, frameIndex: number, x: number, dir: Direction): number {
  const { footX } = MUMBLE_ANIMS[state];
  if (dir === 1) return x - footX;
  const w = frameWidth(frameRows(state, frameIndex));
  return x - (w - 1 - footX);
}

/** Top edge of the sprite's draw origin: `y − footY`. */
export function spriteOriginY(state: LemmingState, y: number): number {
  return y - MUMBLE_ANIMS[state].footY;
}

/** Bomber countdown digit shown above the tuft: `ceil(fuseTicks / 16)`, 0 once the fuse is out. */
export function bomberDigit(fuseTicks: number): number {
  return fuseTicks <= 0 ? 0 : Math.ceil(fuseTicks / 16);
}

/** The brick-pip plate is shown only while building or shrugging (out of bricks). */
export function showsPips(state: LemmingState): boolean {
  return state === 'building' || state === 'shrugging';
}

/**
 * Palette key for pip `k` (0..11 on the 13×5 plate; row = ⌊k/6⌋, col = k % 6) given how many
 * bricks are left: unused pips are `full` (or `warn` amber once `bricksLeft` drops to
 * `OVERLAYS.pips.warnAt` or below), spent/unavailable pips are `empty`.
 */
export function pipKey(k: number, bricksLeft: number): string {
  const { warnAt, warn, full, empty } = OVERLAYS.pips;
  return k < bricksLeft ? (bricksLeft <= warnAt ? warn : full) : empty;
}

// Overlay top-left offsets (DESIGN §3.4 "Overlay placement"), relative to (x, y − footY):
// add DIGIT_DX/DIGIT_DY to (x, y − footY) for the bomber digit's top-left, and so on.
export const DIGIT_DX = -2;
export const DIGIT_DY = -9;
/** The digit moves this many px further up when the pip plate is also shown (same lemming). */
export const DIGIT_PIPS_SHIFT = 7;
export const FUSE_DX = -1;
export const FUSE_DY = -2;
export const PIPS_DX = -6;
export const PIPS_DY = -7;

/** The crosshair art is drawn with a 1 px dark halo on every side (DESIGN §5.3). */
const CROSSHAIR_HALO = 1;

/**
 * Scale / canvas size / hotspot for the CSS crosshair cursor at `size` px (DESIGN §5.3
 * "Playfield cursor"). The 9×9 crosshair art plus its 1 px halo on every side (an 11×11 source)
 * is scaled by `⌊size / 9⌋` and centred in a `size×size` square image; the hotspot is the
 * scaled pixel centre of the art's own anchor (4,4), as integers.
 */
export function crosshairLayout(size: 32 | 48 | 64): { scale: number; image: number; hotX: number; hotY: number } {
  const art = OVERLAYS.crosshair;
  const artSize = frameWidth(art.rows);
  const scale = Math.floor(size / artSize);
  const sourceSize = artSize + CROSSHAIR_HALO * 2;
  const anchor = art.anchorX + CROSSHAIR_HALO; // the art is square: anchorX === anchorY
  const offset = Math.floor((size - sourceSize * scale) / 2);
  const hot = offset + anchor * scale + Math.floor(scale / 2);
  return { scale, image: size, hotX: hot, hotY: hot };
}
