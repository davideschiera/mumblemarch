/**
 * Level thumbnails (level select cards, briefing hero) drawn straight from level data.
 * DESIGN §5.4/§7.2: cards use a small fixed world→CSS scale (like the minimap); the briefing
 * uses ~1:1 (0.75 for 1600-wide levels) with entrance/exit markers. Owner: e3a2-levels-briefing.
 *
 * Compiles each level once (cached by id — `compileLevel` rasterises the whole terrain, which
 * is not free) and paints its FINAL material/colour bytes into an ImageData buffer by simple
 * point sampling, which is exact at scale 1/0.75 (briefing) and a cheap, good-enough decimation
 * at the small card scale. No allocation beyond one ImageData per draw.
 */
import { Material } from '../core/terrain.ts';
import type { CompiledLevel } from '../core/types.ts';
import { compileLevel } from '../levels/compiler.ts';
import type { LevelDef } from '../levels/format.ts';
import { getTheme } from '../levels/themes.ts';

export interface ThumbnailOptions {
  /** CSS px per world px. The canvas is resized to `round(level.width*scale) × round(level.height*scale)`. */
  readonly scale: number;
  /** Draw small entrance/exit markers on top (briefing only — DESIGN §5.4). */
  readonly markers?: boolean;
}

const compiledCache = new Map<string, CompiledLevel>();
/** Theme id → flat [r,g,b, r,g,b, …] for every palette index, built once. */
const paletteRgbCache = new Map<string, Uint8ClampedArray>();

/** `null` when the level fails to compile (e.g. still being authored) — callers fall back to a
 * flat background instead of throwing, so one broken level never takes down the whole screen. */
function getCompiled(level: LevelDef): CompiledLevel | null {
  if (compiledCache.has(level.id)) return compiledCache.get(level.id)!;
  try {
    const compiled = compileLevel(level);
    compiledCache.set(level.id, compiled);
    return compiled;
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): readonly [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  if (hex.length === 4) {
    // '#rgb' shorthand, defensive (theme data is always '#rrggbb', but stay robust).
    const r = (n >> 8) & 0xf;
    const g = (n >> 4) & 0xf;
    const b = n & 0xf;
    return [r * 17, g * 17, b * 17];
  }
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function getPaletteRgb(themeId: string, palette: readonly string[]): Uint8ClampedArray {
  let rgb = paletteRgbCache.get(themeId);
  if (!rgb) {
    rgb = new Uint8ClampedArray(palette.length * 3);
    palette.forEach((hex, i) => {
      const [r, g, b] = hexToRgb(hex);
      rgb![i * 3] = r;
      rgb![i * 3 + 1] = g;
      rgb![i * 3 + 2] = b;
    });
    paletteRgbCache.set(themeId, rgb);
  }
  return rgb;
}

/** Paints `level` into `canvas` at `options.scale` (DESIGN §5.4/§7.2, briefing). Pure 2D canvas work. */
export function drawLevelThumbnail(canvas: HTMLCanvasElement, level: LevelDef, options: ThumbnailOptions): void {
  const { scale } = options;
  const compiled = getCompiled(level);
  const theme = getTheme(compiled?.themeId ?? level.theme);
  const destW = Math.max(1, Math.round(level.width * scale));
  const destH = Math.max(1, Math.round(level.height * scale));
  canvas.width = destW;
  canvas.height = destH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (!compiled) {
    // Still being authored / fails validation: a flat background beats a crashed screen.
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, destW, destH);
    return;
  }

  const [bgR, bgG, bgB] = hexToRgb(theme.background);
  const paletteRgb = getPaletteRgb(compiled.themeId, theme.palette);
  const { material, color } = compiled.terrain;
  const srcW = level.width;
  const srcH = level.height;

  const image = ctx.createImageData(destW, destH);
  const data = image.data;
  for (let dy = 0; dy < destH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy / scale));
    const srcRow = sy * srcW;
    const destRow = dy * destW;
    for (let dx = 0; dx < destW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx / scale));
      const si = srcRow + sx;
      const di = (destRow + dx) * 4;
      if (material[si] === Material.Empty) {
        data[di] = bgR;
        data[di + 1] = bgG;
        data[di + 2] = bgB;
      } else {
        const pi = (color[si] ?? 0) * 3;
        data[di] = paletteRgb[pi] ?? bgR;
        data[di + 1] = paletteRgb[pi + 1] ?? bgG;
        data[di + 2] = paletteRgb[pi + 2] ?? bgB;
      }
      data[di + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);

  if (options.markers) drawMarkers(ctx, level, theme, scale);
}

/**
 * Level-select card thumbnail (DESIGN §5.4, VIS-6): contain-fits the WHOLE level into a
 * `cssWidth`×`cssHeight` CSS-px box, centred, over the theme background — the card's own "mini
 * minimap", replacing the old fixed-scale left-aligned strip (VIS-5). `cssWidth`/`cssHeight` are
 * the caller's best measurement of the canvas's OWN rendered CSS box (`levels.css`'s `.level-card
 * __thumb` owns the actual layout size: `width:100%; height:72px`) — only the backing store
 * (`canvas.width`/`height`) is set here, scaled by `dpr`, so every art pixel lands on whole real
 * screen pixels (crisp at any DPR) with ONE scale for both axes (no stretch distortion). Setting
 * the canvas's CSS size here too (an earlier version of this function did) would be circular: the
 * level-select grid isn't stretched to the viewport (`.screen`'s `align-items: center`), so an
 * explicit pixel CSS width on a descendant feeds back into the card's own shrink-to-fit size,
 * locking every card at its widest card's content width regardless of viewport (VIS-6 follow-up).
 */
export function drawCardThumbnail(
  canvas: HTMLCanvasElement,
  level: LevelDef,
  cssWidth: number,
  cssHeight: number,
  dpr: number = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
): void {
  const compiled = getCompiled(level);
  const theme = getTheme(compiled?.themeId ?? level.theme);
  const w = Math.max(1, cssWidth);
  const h = Math.max(1, cssHeight);
  const backingW = Math.max(1, Math.round(w * dpr));
  const backingH = Math.max(1, Math.round(h * dpr));
  canvas.width = backingW;
  canvas.height = backingH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, backingW, backingH);
  if (!compiled) return;

  // Contain-fit: one scale (device px per world px) for both axes, so the level is never
  // stretched — whichever axis is the tighter constraint decides it, and the other axis gets the
  // leftover as centred letterboxing.
  const scale = Math.min(backingW / level.width, backingH / level.height);
  const rasterW = Math.max(1, Math.min(backingW, Math.round(level.width * scale)));
  const rasterH = Math.max(1, Math.min(backingH, Math.round(level.height * scale)));
  const offsetX = Math.round((backingW - rasterW) / 2);
  const offsetY = Math.round((backingH - rasterH) / 2);

  const [bgR, bgG, bgB] = hexToRgb(theme.background);
  const paletteRgb = getPaletteRgb(compiled.themeId, theme.palette);
  const { material, color } = compiled.terrain;
  const srcW = level.width;
  const srcH = level.height;

  const image = ctx.createImageData(rasterW, rasterH);
  const data = image.data;
  for (let dy = 0; dy < rasterH; dy++) {
    const sy = Math.min(srcH - 1, Math.floor(dy / scale));
    const srcRow = sy * srcW;
    const destRow = dy * rasterW;
    for (let dx = 0; dx < rasterW; dx++) {
      const sx = Math.min(srcW - 1, Math.floor(dx / scale));
      const si = srcRow + sx;
      const di = (destRow + dx) * 4;
      if (material[si] === Material.Empty) {
        data[di] = bgR;
        data[di + 1] = bgG;
        data[di + 2] = bgB;
      } else {
        const pi = (color[si] ?? 0) * 3;
        data[di] = paletteRgb[pi] ?? bgR;
        data[di + 1] = paletteRgb[pi + 1] ?? bgG;
        data[di + 2] = paletteRgb[pi + 2] ?? bgB;
      }
      data[di + 3] = 255;
    }
  }
  ctx.putImageData(image, offsetX, offsetY);
}

/** Small, colour-blind-safe markers: a downward chevron at each hatch, an upward one at each exit. */
function drawMarkers(ctx: CanvasRenderingContext2D, level: LevelDef, theme: ReturnType<typeof getTheme>, scale: number): void {
  const outline = theme.palette[theme.accent] ?? '#000000';
  for (const entrance of level.entrances) {
    drawChevron(ctx, entrance.x * scale, entrance.y * scale, theme.palette[theme.hatch[0]] ?? outline, outline, 'down');
  }
  for (const exit of level.exits) {
    drawChevron(ctx, exit.x * scale, exit.y * scale - 8, theme.palette[theme.exit[1]] ?? outline, outline, 'up');
  }
}

/** A small filled triangle (5 wide, 4 tall) with a 1px dark outline, pointing up or down. */
function drawChevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, fill: string, outline: string, dir: 'up' | 'down'): void {
  const y0 = dir === 'down' ? cy : cy + 4;
  const y1 = dir === 'down' ? cy + 4 : cy;
  ctx.beginPath();
  ctx.moveTo(cx - 3, y0);
  ctx.lineTo(cx + 3, y0);
  ctx.lineTo(cx, y1);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = outline;
  ctx.stroke();
}
