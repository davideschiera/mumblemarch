/**
 * Mumble sprites: pixel-art frames from `MUMBLE_ANIMS` (`art/mumble.ts`, all 18 `LemmingState`s),
 * coloured with `MUMBLE_PALETTE` (`art/palette.ts` — the mumble palette ported 1:1 from
 * `docs/design/mockups/sprites.js`). Every `state:frame:dir` combination is rendered once into a
 * small cached canvas (a mirrored copy for `dir === -1`), so the hot draw path is a single
 * `drawImage` call at integer view-px coordinates.
 */
import type { Direction, LemmingState } from '../core/types.ts';
import { MUMBLE_ANIMS, MUMBLE_PALETTE } from '../art/index.ts';
import { frameWidth, mumbleFrameIndex, spriteOriginX, spriteOriginY } from './sprite-geometry.ts';

/** 0 = facing right (dir 1), 1 = mirrored (dir -1). */
function dirIndex(dir: Direction): 0 | 1 {
  return dir === 1 ? 0 : 1;
}

export class SpriteAtlas {
  /** cache[state][frameIndex][dirIndex]; nested arrays so the hot path never builds a string key. */
  private readonly cache = new Map<LemmingState, (HTMLCanvasElement | undefined)[][]>();

  /** Draw the lemming for `state` at foot anchor (x, y) in VIEW px. */
  drawLemming(
    ctx: CanvasRenderingContext2D,
    state: LemmingState,
    stateTicks: number,
    x: number,
    y: number,
    dir: Direction,
  ): void {
    this.drawFrame(ctx, state, mumbleFrameIndex(state, stateTicks), x, y, dir);
  }

  /** Draw one specific frame (used directly for one-shot effects, e.g. the `exploding` pop star). */
  drawFrame(ctx: CanvasRenderingContext2D, state: LemmingState, frameIndex: number, x: number, y: number, dir: Direction): void {
    const image = this.image(state, frameIndex, dir);
    if (!image) return;
    ctx.drawImage(image, spriteOriginX(state, frameIndex, x, dir), spriteOriginY(state, y));
  }

  private image(state: LemmingState, frameIndex: number, dir: Direction): HTMLCanvasElement | undefined {
    let perFrame = this.cache.get(state);
    if (!perFrame) {
      perFrame = [];
      this.cache.set(state, perFrame);
    }
    let perDir = perFrame[frameIndex];
    if (!perDir) {
      perDir = [];
      perFrame[frameIndex] = perDir;
    }
    const di = dirIndex(dir);
    const cached = perDir[di];
    if (cached) return cached;
    const built = renderFrame(state, frameIndex, dir);
    perDir[di] = built;
    return built;
  }
}

/** Rasterize one frame's rows into a fresh canvas; pixel `i` mirrors to `w − 1 − i` for dir −1. */
function renderFrame(state: LemmingState, frameIndex: number, dir: Direction): HTMLCanvasElement | undefined {
  const rows = MUMBLE_ANIMS[state].frames[frameIndex];
  if (!rows) return undefined;
  const w = frameWidth(rows);
  const h = rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  ctx.imageSmoothingEnabled = false;
  const mirror = dir === -1;
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j] ?? '';
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (!ch || ch === '.') continue;
      const color = MUMBLE_PALETTE[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(mirror ? w - 1 - i : i, j, 1, 1);
    }
  }
  return canvas;
}
