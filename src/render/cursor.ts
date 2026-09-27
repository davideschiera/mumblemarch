/**
 * CSS `cursor` value for the in-canvas crosshair (DESIGN §5.3 "Playfield cursor" / §7.11 Cursor
 * size setting): a data-URL PNG built at runtime from `OVERLAYS.crosshair` (+ a 1 px dark halo),
 * nearest-neighbour scaled per size, with an integer hotspot and a plain `crosshair` fallback.
 *
 * `tests/contracts.test.ts` calls `crosshairCursorCss` directly under a DOM-free tsconfig, and
 * this project's lint bans explicit `any` — so every DOM access here goes through small
 * structural interfaces reached off `globalThis` and narrowed at runtime with `typeof` checks,
 * never a bare `document`/`HTMLCanvasElement` reference. Nothing needs the `dom` lib; wherever no
 * canvas is available (under Node, in particular) this safely returns the `'crosshair'` fallback.
 */
import { MUMBLE_PALETTE, OVERLAYS, type PixelFrame } from '../art/index.ts';
import { crosshairLayout, frameWidth } from './sprite-geometry.ts';

interface MinimalContext2D {
  imageSmoothingEnabled: boolean;
  fillStyle: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(
    image: MinimalCanvas,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void;
}

interface MinimalCanvas {
  width: number;
  height: number;
  getContext(kind: '2d'): MinimalContext2D | null;
  toDataURL(type: string): string;
}

interface MinimalDocument {
  createElement(tag: 'canvas'): MinimalCanvas;
}

/** `globalThis.document`, narrowed at runtime; `null` where there is none (e.g. under Node). */
function minimalDocument(): MinimalDocument | null {
  const doc = (globalThis as { document?: unknown }).document;
  if (typeof doc !== 'object' || doc === null) return null;
  const createElement = (doc as { createElement?: unknown }).createElement;
  if (typeof createElement !== 'function') return null;
  return doc as MinimalDocument;
}

const HALO_COLOR = '#140a1a';
const HALO_PAD = 1;

const cssCache = new Map<32 | 48 | 64, string>();
let crosshairSource: MinimalCanvas | null | undefined;

function opaquePixel(rows: PixelFrame, h: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || y >= h) return false;
  const row = rows[y] ?? '';
  const ch = row[x];
  return !!ch && ch !== '.';
}

/** The 9×9 crosshair art + a 1 px dark halo, rasterized once into an 11×11 source canvas. */
function buildCrosshairSource(doc: MinimalDocument): MinimalCanvas | null {
  const art = OVERLAYS.crosshair;
  const w = frameWidth(art.rows);
  const h = art.rows.length;
  const size = w + HALO_PAD * 2;
  const canvas = doc.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = px - HALO_PAD;
      const y = py - HALO_PAD;
      if (opaquePixel(art.rows, h, x, y)) {
        const row = art.rows[y] ?? '';
        const color = MUMBLE_PALETTE[row[x] ?? '.'];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, 1, 1);
        }
      } else if (
        opaquePixel(art.rows, h, x - 1, y) ||
        opaquePixel(art.rows, h, x + 1, y) ||
        opaquePixel(art.rows, h, x, y - 1) ||
        opaquePixel(art.rows, h, x, y + 1)
      ) {
        ctx.fillStyle = HALO_COLOR;
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
  return canvas;
}

function sourceCanvas(doc: MinimalDocument): MinimalCanvas | null {
  if (crosshairSource === undefined) crosshairSource = buildCrosshairSource(doc);
  return crosshairSource;
}

function build(doc: MinimalDocument, size: 32 | 48 | 64): string | null {
  const source = sourceCanvas(doc);
  if (!source) return null;
  const { scale, image, hotX, hotY } = crosshairLayout(size);
  const canvas = doc.createElement('canvas');
  canvas.width = image;
  canvas.height = image;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  const destSize = source.width * scale;
  const offset = Math.floor((image - destSize) / 2);
  ctx.drawImage(source, 0, 0, source.width, source.height, offset, offset, destSize, destSize);
  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/png');
  } catch {
    return null;
  }
  return dataUrl ? `url("${dataUrl}") ${hotX} ${hotY}, crosshair` : null;
}

/** CSS `cursor` value for the crosshair at `sizeCssPx` (cached); `'crosshair'` with no canvas. */
export function crosshairCursorCss(sizeCssPx: 32 | 48 | 64): string {
  const cached = cssCache.get(sizeCssPx);
  if (cached) return cached;
  const doc = minimalDocument();
  const built = doc ? build(doc, sizeCssPx) : null;
  if (built) cssCache.set(sizeCssPx, built);
  return built ?? 'crosshair';
}
