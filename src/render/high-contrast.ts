/**
 * DESIGN §4.9 "clear physics" high-contrast terrain colours and patterns, ported from
 * `docs/design/mockups/sprites-themes.html` (`terrainCanvas`'s `hc` branch, `drawPool`,
 * `drawObj`'s trap/exit branches). Pure, DOM-free: colour is a function of Material + position,
 * never of the theme's own palette.
 */
import { Material } from '../core/terrain.ts';

/** Fixed high-contrast palette (DESIGN §4.9 table); independent of theme. */
export const HC = {
  background: '#000000',
  earth: '#a0a0a0',
  edge: '#ffffff',
  steel: '#5f8fff',
  steelHatch: '#0a1a4a',
  oneWay: '#c77dff',
  chevron: '#000000',
  water: '#00c8ff',
  fire: '#ff7a00',
  line: '#000000',
  trap: '#ffd400',
  trapStripe: '#000000',
  exit: '#3cff6a',
} as const;

/** DESIGN §4.4's 8×8 one-way chevron tile, world-aligned. 'A' = arrow, 'E' = its edge frame. */
export const CHEVRON_TILE: readonly string[] = [
  '........',
  'AAE.....',
  '.AAE....',
  '..AAE...',
  '.AAE....',
  'AAE.....',
  '........',
  '........',
];

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * HC colour (as '#rrggbb') of a SOLID terrain pixel. `edge` — any of the 4 orthogonal neighbours
 * empty or out of bounds — wins over every material and always paints white, exactly as in the
 * reference showcase.
 */
export function hcTerrainColor(material: number, x: number, y: number, edge: boolean): string {
  if (edge) return HC.edge;
  if (material === Material.Steel) {
    return (x + y) % 4 === 0 || (x - y) % 4 === 0 ? HC.steelHatch : HC.steel;
  }
  if (material === Material.OneWayLeft || material === Material.OneWayRight) {
    const row = Math.floor(y / 8);
    const offset = mod(row, 2) * 4;
    let cx = mod(x + offset, 8);
    if (material === Material.OneWayLeft) cx = 7 - cx;
    const cy = mod(y, 8);
    const ch = CHEVRON_TILE[cy]?.[cx];
    return ch === 'A' ? HC.chevron : HC.oneWay;
  }
  return HC.earth;
}

/** Static wave (water) / zigzag (fire) hazard-pool pattern, in WORLD pixels. */
export function hcPoolLine(kind: 'water' | 'fire', x: number, y: number): boolean {
  if (kind === 'water') return mod(y - Math.round(Math.sin(x / 2)), 4) === 0;
  return mod(y + Math.abs(mod(x, 6) - 3), 4) === 0;
}

/** 45° warning-stripe pattern, in the trap's own LOCAL 16×16 coordinates. */
export function hcTrapStripe(i: number, j: number): boolean {
  return mod(i + j, 6) < 3;
}

/** DESIGN §4.9: the exit's HC doorway box is 16×14, LOCAL coordinates (position-independent). */
export const HC_EXIT_W = 16;
export const HC_EXIT_H = 14;

/**
 * Whether LOCAL doorway pixel `(x, y)` is part of the exit's HC shape — DESIGN §4.9 "1 px
 * outline of the doorway + a 3×5 door glyph", both flat `HC.exit`, no theme glow mote colour
 * anywhere (that variant, `HC.exit` alone, is the entire HC exit — never blended with the
 * theme's own frame/glow art). Out-of-bounds is always false. Pure and independent of the
 * canvas-drawing code in `render/scene.ts`, which just loops this box and fills `HC.exit` where
 * this returns true (leaving every other pixel transparent, so the terrain shows through).
 */
export function hcExitPixel(x: number, y: number): boolean {
  if (x < 0 || x >= HC_EXIT_W || y < 0 || y >= HC_EXIT_H) return false;
  const outline = x === 0 || x === HC_EXIT_W - 1 || y === 0 || y === HC_EXIT_H - 1;
  const glyph = x >= 7 && x < 10 && y >= 4 && y < 9;
  return outline || glyph;
}

/**
 * '#rrggbb' → little-endian packed RGBA (0xAABBGGRR with A = 255): a Uint32 view of a canvas
 * ImageData buffer stores bytes [R, G, B, A] per pixel, so on a little-endian platform the 32-bit
 * value reads A<<24 | B<<16 | G<<8 | R.
 */
export function packRgba(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (0xff << 24) | (b << 16) | (g << 8) | r;
}
