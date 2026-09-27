/**
 * Pre-rendered canvas overlays drawn over mumbles and the playfield: the bomber countdown digit
 * + fuse spark, the brick-pip plate, the hover/keyboard-selection brackets (and their "would
 * refuse" / pending variants), the refusal ✕, the steel spark, the skill-assignment ring, the
 * static dust puff, and the in-canvas keyboard crosshair (DESIGN §3.4 "Overlay placement", §3.5
 * effects, §6.3.1 hover highlight, §5.3 playfield cursor). Every variant is rasterized once, at
 * construction, into a cached canvas; each draw call below is one or two `drawImage`s at integer
 * view-px coordinates — no per-frame allocation.
 */
import { MUMBLE_PALETTE, OVERLAYS, type PixelFrame } from '../art/index.ts';
import {
  bomberDigit,
  DIGIT_DX,
  DIGIT_DY,
  DIGIT_PIPS_SHIFT,
  frameWidth,
  FUSE_DX,
  FUSE_DY,
  pipKey,
  PIPS_DX,
  PIPS_DY,
} from './sprite-geometry.ts';

/** Dark outline used for the crosshair's 1 px halo (DESIGN §5.3). */
const HALO_COLOR = '#140a1a';

/** Static 5×3 dust puff (reduced-motion explosion twin / builder-low "ting"), not art-data. */
const DUST_PUFF_ROWS: PixelFrame = ['.kkk.', 'kKkKk', '.kkk.'];

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Paint `rows` at (dx, dy) using `MUMBLE_PALETTE`, skipping '.' and (when given) filtered pixels. */
function paintPixels(
  ctx: CanvasRenderingContext2D,
  rows: PixelFrame,
  dx: number,
  dy: number,
  filter?: (i: number, j: number) => boolean,
): void {
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j] ?? '';
    for (let i = 0; i < row.length; i++) {
      if (filter && !filter(i, j)) continue;
      const ch = row[i];
      if (!ch || ch === '.') continue;
      const color = MUMBLE_PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(dx + i, dy + j, 1, 1);
    }
  }
}

/** Rasterize one frame into a canvas sized exactly to it (top-left = the frame's own (0,0)). */
function rasterFrame(rows: PixelFrame, filter?: (i: number, j: number) => boolean): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(frameWidth(rows), rows.length);
  if (ctx) paintPixels(ctx, rows, 0, 0, filter);
  return canvas;
}

export class OverlayPainter {
  private readonly digits: readonly HTMLCanvasElement[];
  private readonly fuse: readonly HTMLCanvasElement[];
  private readonly pipsPlates: readonly HTMLCanvasElement[];
  private readonly hoverImg: HTMLCanvasElement;
  private readonly hoverDashedImg: HTMLCanvasElement;
  private readonly selectedImg: HTMLCanvasElement;
  private readonly pendingImg: HTMLCanvasElement;
  private readonly refusalImg: HTMLCanvasElement;
  private readonly steelSparkFrames: readonly HTMLCanvasElement[];
  private readonly steelSparkAnchorX: number;
  private readonly steelSparkAnchorY: number;
  private readonly assignRingFrames: readonly HTMLCanvasElement[];
  private readonly dustPuffImg: HTMLCanvasElement;
  private readonly crosshairImg: HTMLCanvasElement;
  private readonly crosshairAnchorX: number;
  private readonly crosshairAnchorY: number;

  constructor() {
    const digits: HTMLCanvasElement[] = [];
    for (let d = 0; d <= 9; d++) digits.push(rasterFrame(OVERLAYS.digits[String(d)] ?? []));
    this.digits = digits;

    this.fuse = OVERLAYS.fuse.frames.map((f) => rasterFrame(f));
    this.steelSparkFrames = OVERLAYS.steelSpark.frames.map((f) => rasterFrame(f));
    this.steelSparkAnchorX = OVERLAYS.steelSpark.anchorX ?? 0;
    this.steelSparkAnchorY = OVERLAYS.steelSpark.anchorY ?? 0;
    this.assignRingFrames = OVERLAYS.assignRing.frames.map((f) => rasterFrame(f));

    const pipsPlates: HTMLCanvasElement[] = [];
    for (let bricksLeft = 0; bricksLeft <= 12; bricksLeft++) pipsPlates.push(this.buildPipsPlate(bricksLeft));
    this.pipsPlates = pipsPlates;

    this.hoverImg = rasterFrame(OVERLAYS.hover.rows);
    this.hoverDashedImg = rasterFrame(OVERLAYS.hover.rows, (i, j) => (i + j) % 2 === 0);
    this.selectedImg = rasterFrame(OVERLAYS.selected.rows);
    this.pendingImg = rasterFrame(OVERLAYS.pending.rows);
    this.refusalImg = rasterFrame(OVERLAYS.refusal.rows);
    this.dustPuffImg = rasterFrame(DUST_PUFF_ROWS);

    const crosshair = this.buildCrosshair();
    this.crosshairImg = crosshair.canvas;
    this.crosshairAnchorX = crosshair.anchorX;
    this.crosshairAnchorY = crosshair.anchorY;
  }

  /** Bomber countdown digit + fuse spark on the tuft. Draw every state while `fuseTicks > 0`. */
  bomber(ctx: CanvasRenderingContext2D, x: number, y: number, footY: number, fuseTicks: number, withPips: boolean): void {
    const baseY = y - footY;
    const digit = bomberDigit(fuseTicks);
    if (digit > 0) {
      const img = this.digits[digit];
      if (img) ctx.drawImage(img, x + DIGIT_DX, baseY + DIGIT_DY - (withPips ? DIGIT_PIPS_SHIFT : 0));
    }
    const fuseImg = this.fuse[Math.floor(fuseTicks / 2) % 2];
    if (fuseImg) ctx.drawImage(fuseImg, x + FUSE_DX, baseY + FUSE_DY);
  }

  /** Brick-pip plate, shown while building or shrugging (DESIGN §3.4). */
  pips(ctx: CanvasRenderingContext2D, x: number, y: number, footY: number, bricksLeft: number): void {
    const clamped = Math.max(0, Math.min(12, bricksLeft));
    const img = this.pipsPlates[clamped];
    if (img) ctx.drawImage(img, x + PIPS_DX, y - footY + PIPS_DY);
  }

  /** Thin white pointer-hover corner bracket. */
  hover(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.drawImage(this.hoverImg, x - OVERLAYS.hover.anchorX, y - OVERLAYS.hover.anchorY);
  }

  /** "Would refuse": the hover bracket dashed, plus a refusal ✕ on its top-right corner. */
  hoverRefuse(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.drawImage(this.hoverDashedImg, x - OVERLAYS.hover.anchorX, y - OVERLAYS.hover.anchorY);
    const cx = x + OVERLAYS.hover.anchorX;
    const cy = y - OVERLAYS.hover.anchorY;
    ctx.drawImage(this.refusalImg, cx - OVERLAYS.refusal.anchorX, cy - OVERLAYS.refusal.anchorY);
  }

  /** Thick keyboard-selection bracket + plum inner line + ▼ (shape differs from hover, not colour). */
  selected(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.drawImage(this.selectedImg, x - OVERLAYS.selected.anchorX, y - OVERLAYS.selected.anchorY);
  }

  /** "Assigned while paused" hourglass badge. */
  pending(ctx: CanvasRenderingContext2D, x: number, y: number, footY: number): void {
    const py = y - footY - 2;
    ctx.drawImage(this.pendingImg, x - OVERLAYS.pending.anchorX, py - OVERLAYS.pending.anchorY);
  }

  /** Refusal ✕, centred on (cx, cy). */
  refusal(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.drawImage(this.refusalImg, cx - OVERLAYS.refusal.anchorX, cy - OVERLAYS.refusal.anchorY);
  }

  /** Steel-hit / refused-dig spark, centred on the contact point. */
  steelSpark(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number): void {
    const img = this.steelSparkFrames[frame];
    if (img) ctx.drawImage(img, cx - this.steelSparkAnchorX, cy - this.steelSparkAnchorY);
  }

  /** Skill-assignment ring, centred (its two frames differ in size, so no fixed anchor). */
  assignRing(ctx: CanvasRenderingContext2D, cx: number, cy: number, frame: number): void {
    const img = this.assignRingFrames[frame];
    if (img) ctx.drawImage(img, cx - Math.floor(img.width / 2), cy - Math.floor(img.height / 2));
  }

  /** Static 5×3 dust puff (reduced-motion explosion twin / builder-low "ting"), centred. */
  dustPuff(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.drawImage(this.dustPuffImg, cx - Math.floor(this.dustPuffImg.width / 2), cy - Math.floor(this.dustPuffImg.height / 2));
  }

  /** In-canvas keyboard crosshair, with a 1 px dark halo for contrast on any background. */
  crosshair(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.drawImage(this.crosshairImg, cx - this.crosshairAnchorX, cy - this.crosshairAnchorY);
  }

  private buildPipsPlate(bricksLeft: number): HTMLCanvasElement {
    const P = OVERLAYS.pips;
    const { canvas, ctx } = makeCanvas(P.w, P.h);
    if (ctx) {
      const plateColor = MUMBLE_PALETTE[P.plate];
      if (plateColor) {
        ctx.fillStyle = plateColor;
        ctx.fillRect(0, 0, P.w, P.h);
      }
      for (let k = 0; k < P.cols * P.rows; k++) {
        const row = Math.floor(k / P.cols);
        const col = k % P.cols;
        const color = MUMBLE_PALETTE[pipKey(k, bricksLeft)];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(1 + col * 2, 1 + row * 2, 1, 1);
        }
      }
    }
    return canvas;
  }

  /** The 9×9 crosshair art plus a 1 px halo (DESIGN §5.3): every transparent pixel 4-adjacent to
   *  an opaque one becomes `HALO_COLOR`. Returns the padded canvas and its shifted anchor. */
  private buildCrosshair(): { canvas: HTMLCanvasElement; anchorX: number; anchorY: number } {
    const art = OVERLAYS.crosshair;
    const w = frameWidth(art.rows);
    const h = art.rows.length;
    const pad = 1;
    const opaque = (px: number, py: number): boolean => {
      const x = px - pad;
      const y = py - pad;
      if (x < 0 || y < 0 || y >= h) return false;
      const row = art.rows[y] ?? '';
      const ch = row[x];
      return !!ch && ch !== '.';
    };
    const { canvas, ctx } = makeCanvas(w + pad * 2, h + pad * 2);
    if (ctx) {
      for (let py = 0; py < canvas.height; py++) {
        for (let px = 0; px < canvas.width; px++) {
          if (opaque(px, py)) {
            const row = art.rows[py - pad] ?? '';
            const ch = row[px - pad] ?? '.';
            const color = MUMBLE_PALETTE[ch];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(px, py, 1, 1);
            }
          } else if (opaque(px - 1, py) || opaque(px + 1, py) || opaque(px, py - 1) || opaque(px, py + 1)) {
            ctx.fillStyle = HALO_COLOR;
            ctx.fillRect(px, py, 1, 1);
          }
        }
      }
    }
    return { canvas, anchorX: art.anchorX + pad, anchorY: art.anchorY + pad };
  }
}
