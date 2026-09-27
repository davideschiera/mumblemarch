/**
 * Fall ruler (DESIGN §7.11 + §7.1 A14): marks the safe (≤ 63 px) vs deadly (≥ 64 px) fall
 * distance ahead of a walker, using LINE STYLE + an icon — never colour alone. Pure fillRects
 * through `PixelTarget`; DOM-free.
 */
import type { ReadonlyTerrain } from '../core/terrain.ts';
import type { Direction } from '../core/types.ts';
import type { PixelTarget } from './pixel-target.ts';

export const SAFE_DROP_PX = 63;
export const DEADLY_DROP_PX = 64;
export const RULER_LENGTH_PX = 80;

const CREAM = '#fff1d6';
const PLUM = '#2a1433';
const DANGER = '#ef3e55';

/**
 * Distance from the foot row `y` down to the first solid pixel below at column `x`
 * (1 = ground right under the next row), or `Infinity` if none within `max` px / the level.
 */
export function dropBelow(terrain: ReadonlyTerrain, x: number, y: number, max: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  for (let d = 1; d <= max; d++) {
    const row = yi + d;
    if (row >= terrain.height) return Infinity;
    if (terrain.isSolid(xi, row)) return d;
  }
  return Infinity;
}

// ─── 5×5 glyphs (fill + a 1 px outline halo), precomputed once at module load ──────────────────
type Glyph = { readonly fill: Uint8Array; readonly halo: Uint8Array };

const CHECK_PIXELS: readonly (readonly [number, number])[] = [
  [4, 0],
  [3, 1],
  [2, 2],
  [0, 2],
  [1, 3],
  [1, 4],
];
const CROSS_PIXELS: readonly (readonly [number, number])[] = [
  [0, 0],
  [4, 0],
  [1, 1],
  [3, 1],
  [2, 2],
  [1, 3],
  [3, 3],
  [0, 4],
  [4, 4],
];

/** Builds a 7×7 grid (1 px margin around the 5×5 glyph) as flat fill/halo masks. Index = (y+1)*7+(x+1). */
function buildGlyph(pixels: readonly (readonly [number, number])[]): Glyph {
  const fill = new Uint8Array(49);
  for (const [px, py] of pixels) fill[(py + 1) * 7 + (px + 1)] = 1;
  const halo = new Uint8Array(49);
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const i = y * 7 + x;
      if (fill[i] === 1) continue;
      const up = y > 0 ? (fill[(y - 1) * 7 + x] ?? 0) : 0;
      const down = y < 6 ? (fill[(y + 1) * 7 + x] ?? 0) : 0;
      const left = x > 0 ? (fill[y * 7 + (x - 1)] ?? 0) : 0;
      const right = x < 6 ? (fill[y * 7 + (x + 1)] ?? 0) : 0;
      if (up || down || left || right) halo[i] = 1;
    }
  }
  return { fill, halo };
}

const CHECK_GLYPH = buildGlyph(CHECK_PIXELS);
const CROSS_GLYPH = buildGlyph(CROSS_PIXELS);

function fillWorld(
  target: PixelTarget,
  terrain: ReadonlyTerrain,
  wx: number,
  wy: number,
  w: number,
  h: number,
  color: string,
  camX: number,
  camY: number,
): void {
  const x0 = Math.max(0, wx);
  const y0 = Math.max(0, wy);
  const x1 = Math.min(terrain.width, wx + w);
  const y1 = Math.min(terrain.height, wy + h);
  if (x1 <= x0 || y1 <= y0) return;
  target.fillStyle = color;
  target.fillRect(x0 - camX, y0 - camY, x1 - x0, y1 - y0);
}

/** `left, top` = the glyph's 5×5 box top-left in world px (the halo may extend 1 px beyond it). */
function drawGlyph(
  target: PixelTarget,
  terrain: ReadonlyTerrain,
  glyph: Glyph,
  left: number,
  top: number,
  fillColor: string,
  outlineColor: string,
  camX: number,
  camY: number,
): void {
  for (let i = 0; i < 49; i++) {
    const gx = (i % 7) - 1;
    const gy = Math.floor(i / 7) - 1;
    const wx = left + gx;
    const wy = top + gy;
    if (wx < 0 || wy < 0 || wx >= terrain.width || wy >= terrain.height) continue;
    if (glyph.fill[i] === 1) {
      target.fillStyle = fillColor;
      target.fillRect(wx - camX, wy - camY, 1, 1);
    } else if (glyph.halo[i] === 1) {
      target.fillStyle = outlineColor;
      target.fillRect(wx - camX, wy - camY, 1, 1);
    }
  }
}

/**
 * Draws the ruler ahead of the mumble at foot (x, y) facing `dir`. Column `cx = x + 7·dir`
 * (just ahead, where a walker steps off): safe rows get a solid cream/plum pair line with tick
 * marks every 16 px; the deadly threshold (row y+64) gets a red bar + a ✕ glyph; the remainder
 * out to `RULER_LENGTH_PX` is dashed red. A landing marker (✓ safe / ✕ deadly) sits beside the
 * ruler at the actual landing row, wherever that is (found via `dropBelow`, up to 200 px down).
 */
export function drawFallRuler(
  target: PixelTarget,
  terrain: ReadonlyTerrain,
  x: number,
  y: number,
  dir: Direction,
  camX: number,
  camY: number,
): void {
  const cx = Math.floor(x) + 7 * dir;
  const farX = cx + dir;
  const glyphLeft = dir === 1 ? cx + 3 : cx - 7;
  const bottom = Math.min(y + RULER_LENGTH_PX, terrain.height - 1);

  const safeEnd = Math.min(y + SAFE_DROP_PX, bottom);
  for (let row = y + 1; row <= safeEnd; row++) {
    const offset = row - y;
    if (offset % 16 === 0) {
      fillWorld(target, terrain, cx - 1, row, 3, 1, CREAM, camX, camY);
    } else {
      fillWorld(target, terrain, cx, row, 1, 1, CREAM, camX, camY);
    }
    fillWorld(target, terrain, farX, row, 1, 1, PLUM, camX, camY);
  }

  const deadlyRow = y + DEADLY_DROP_PX;
  if (deadlyRow <= bottom) {
    fillWorld(target, terrain, cx - 2, deadlyRow, 5, 1, DANGER, camX, camY);
    drawGlyph(target, terrain, CROSS_GLYPH, glyphLeft, deadlyRow - 2, DANGER, PLUM, camX, camY);
  }

  const dashStart = y + DEADLY_DROP_PX + 1;
  for (let row = dashStart; row <= bottom; row++) {
    const offset = row - dashStart;
    if (offset % 4 < 2) {
      fillWorld(target, terrain, cx, row, 1, 1, DANGER, camX, camY);
    }
  }

  const d = dropBelow(terrain, cx, y, 200);
  if (Number.isFinite(d)) {
    const landingRow = y + d;
    if (landingRow >= 0 && landingRow < terrain.height) {
      if (d <= SAFE_DROP_PX) {
        drawGlyph(target, terrain, CHECK_GLYPH, glyphLeft, landingRow - 2, CREAM, PLUM, camX, camY);
      } else if (d >= DEADLY_DROP_PX) {
        drawGlyph(target, terrain, CROSS_GLYPH, glyphLeft, landingRow - 2, DANGER, PLUM, camX, camY);
      }
    }
  }
}
