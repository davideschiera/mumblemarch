/**
 * Minimap (DESIGN §5.1/§5.3): the whole level scaled 1:5 into a small canvas, with hazards, the
 * exit, mumble dots and the camera viewport drawn on top. Clicking/dragging it moves the camera
 * (mouse convenience; keyboard users scroll with keys).
 */
import type { CompiledLevel, GameView } from '../core/types.ts';
import { getTheme } from '../levels/themes.ts';
import type { Camera } from './camera.ts';
import { MINIMAP_HEIGHT, MINIMAP_SCALE, ghostRectX, minimapToWorldX, minimapWidth, sampleBlock, toMinimap, viewportRectX } from './minimap-geometry.ts';

const BACKGROUND = '#0c0a1a';
/** 4×6 doorway glyph (DESIGN §4.8/§5.1). */
const EXIT_GLYPH_ROWS: readonly string[] = ['.##.', '#..#', '#..#', '#..#', '#..#', '#..#'];

function packColor(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff);
}

export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private level: CompiledLevel | null = null;
  private theme = getTheme('mossgrove').minimap;

  // Cached silhouette (terrain/steel only), re-sampled every 4 ticks — never `terrain.takeDirty()`.
  private silCanvas: HTMLCanvasElement | null = null;
  private silCtx: CanvasRenderingContext2D | null = null;
  private silImage: ImageData | null = null;
  private silPixels: Uint32Array | null = null;
  private silWidth = 0;
  private lastSampledTick = -1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  /** Prepare for a new level (call after creating its GameSession). */
  setLevel(level: CompiledLevel): void {
    this.level = level;
    this.theme = getTheme(level.themeId).minimap;

    const width = minimapWidth(level.width);
    this.canvas.width = width;
    this.canvas.height = MINIMAP_HEIGHT;

    const silCanvas = document.createElement('canvas');
    silCanvas.width = width;
    silCanvas.height = MINIMAP_HEIGHT;
    const sctx = silCanvas.getContext('2d');
    if (!sctx) throw new Error('2D canvas unavailable');
    sctx.imageSmoothingEnabled = false;
    this.silCanvas = silCanvas;
    this.silCtx = sctx;
    this.silImage = sctx.createImageData(width, MINIMAP_HEIGHT);
    this.silPixels = new Uint32Array(this.silImage.data.buffer);
    this.silWidth = width;
    this.lastSampledTick = -1;
  }

  render(game: GameView, camera: Camera, hoverWorldX: number | null): void {
    const { ctx, canvas } = this;
    if (!this.level) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const isFirst = this.lastSampledTick === -1;
    const changed = game.tick !== this.lastSampledTick;
    if (changed && (isFirst || game.tick % 4 === 0)) {
      this.resample(game);
      this.lastSampledTick = game.tick;
    }

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.silCanvas) ctx.drawImage(this.silCanvas, 0, 0);

    const theme = this.theme;

    // Hazards: a 2 px strip per zone (water, fire and trap all render the same way here).
    ctx.fillStyle = theme.hazard;
    for (const hazard of this.level.hazards) {
      const hx = toMinimap(hazard.area.x);
      const hy = toMinimap(hazard.area.y);
      const hw = Math.max(1, Math.ceil(hazard.area.w / MINIMAP_SCALE));
      ctx.fillRect(hx, hy, hw, 2);
    }

    // Exits: a 4×6 doorway glyph.
    ctx.fillStyle = theme.exit;
    for (const exit of this.level.exits) {
      const left = Math.round(exit.x / MINIMAP_SCALE) - 2;
      const top = Math.round(exit.y / MINIMAP_SCALE) - 6;
      for (let row = 0; row < EXIT_GLYPH_ROWS.length; row++) {
        const cols = EXIT_GLYPH_ROWS[row] ?? '';
        for (let col = 0; col < cols.length; col++) {
          if (cols[col] === '#') ctx.fillRect(left + col, top + row, 1, 1);
        }
      }
    }

    // Mumbles: a 2×2 dot each.
    ctx.fillStyle = theme.mumble;
    for (const lem of game.lemmings) {
      if (lem.removed) continue;
      const mx = Math.round(lem.x / MINIMAP_SCALE) - 1;
      const my = Math.round(lem.y / MINIMAP_SCALE) - 2;
      ctx.fillRect(mx, my, 2, 2);
    }

    // Viewport: a 2 px rectangle, full height.
    const vx = viewportRectX(camera.x);
    const vw = camera.viewW / MINIMAP_SCALE;
    ctx.fillStyle = theme.view;
    ctx.fillRect(vx, 0, vw, 2);
    ctx.fillRect(vx, MINIMAP_HEIGHT - 2, vw, 2);
    ctx.fillRect(vx, 0, 2, MINIMAP_HEIGHT);
    ctx.fillRect(vx + vw - 2, 0, 2, MINIMAP_HEIGHT);

    // Hover ghost: a 1 px dashed rectangle at the would-be viewport.
    if (hoverWorldX !== null) {
      const gx = ghostRectX(hoverWorldX, this.level.width, camera.viewW);
      this.drawDashedRect(gx, 0, vw, MINIMAP_HEIGHT, theme.view);
    }
  }

  /** Minimap-local CSS pixel → world x (to centre the camera on). */
  toWorldX(offsetCssX: number): number {
    if (!this.level) return 0;
    return minimapToWorldX(offsetCssX, this.canvas.clientWidth, this.canvas.width, this.level.width);
  }

  private resample(game: GameView): void {
    if (!this.silPixels || !this.silCtx || !this.silImage) return;
    const { material, width, height } = game.terrain;
    const w = this.silWidth;
    const terrainColor = packColor(this.theme.terrain);
    const steelColor = packColor(this.theme.steel);
    for (let my = 0; my < MINIMAP_HEIGHT; my++) {
      const rowBase = my * w;
      for (let mx = 0; mx < w; mx++) {
        const v = sampleBlock(material, width, height, mx, my);
        this.silPixels[rowBase + mx] = v === 2 ? steelColor : v === 1 ? terrainColor : 0;
      }
    }
    this.silCtx.putImageData(this.silImage, 0, 0);
  }

  private drawDashedRect(x: number, y: number, w: number, h: number, color: string): void {
    const { ctx } = this;
    ctx.fillStyle = color;
    for (let i = 0; i < w; i += 4) {
      const seg = Math.min(2, w - i);
      ctx.fillRect(x + i, y, seg, 1);
      ctx.fillRect(x + i, y + h - 1, seg, 1);
    }
    for (let i = 0; i < h; i += 4) {
      const seg = Math.min(2, h - i);
      ctx.fillRect(x, y + i, 1, seg);
      ctx.fillRect(x + w - 1, y + i, 1, seg);
    }
  }
}
