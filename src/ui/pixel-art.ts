/**
 * Drawing `art/` pixel frames in the DOM UI: HUD icons ×3 (E2), level thumbnails and the title
 * march strip (E3a). A frame is rows of one-char-per-pixel strings; each char is a palette key
 * ('.' or an unknown key = transparent). HUD icons use MUMBLE_PALETTE keys; theme objects use
 * THEME_OBJECTS[theme].palette.
 * Owner: ui-lead (implemented in E0; shared by E2 and E3a — changes go through ui-lead).
 */
import type { PixelFrame } from '../art/anim.ts';

export type PixelPalette = Readonly<Record<string, string>>;

/** Width (longest row) and height of a frame, in pixels. */
export function frameSize(frame: PixelFrame): { readonly w: number; readonly h: number } {
  let w = 0;
  for (const row of frame) w = Math.max(w, row.length);
  return { w, h: frame.length };
}

/**
 * Draw `frame` with its top-left at (x, y), each pixel `scale` × `scale` (integer scales keep it
 * crisp). `flipX` mirrors it horizontally within its own width. Same-colour runs are merged.
 */
export function drawPixelFrame(
  ctx: CanvasRenderingContext2D,
  frame: PixelFrame,
  palette: PixelPalette,
  x: number,
  y: number,
  scale = 1,
  flipX = false,
): void {
  const { w } = frameSize(frame);
  frame.forEach((line, row) => {
    let col = 0;
    while (col < line.length) {
      const ch = line.charAt(col);
      let end = col + 1;
      while (end < line.length && line.charAt(end) === ch) end++;
      const color = ch === '.' ? undefined : palette[ch];
      if (color) {
        const left = flipX ? w - end : col;
        ctx.fillStyle = color;
        ctx.fillRect(x + left * scale, y + row * scale, (end - col) * scale, scale);
      }
      col = end;
    }
  });
}

/** A PNG data URL of `frame` at `scale` (for <img>, CSS backgrounds and cursors). '' if 2D is unavailable. */
export function pixelFrameToDataUrl(frame: PixelFrame, palette: PixelPalette, scale = 1, flipX = false): string {
  const { w, h } = frameSize(frame);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w * scale);
  canvas.height = Math.max(1, h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawPixelFrame(ctx, frame, palette, 0, 0, scale, flipX);
  return canvas.toDataURL('image/png');
}
