/**
 * Pure minimap math (DESIGN §5.1/§5.3): 1:5 scaling, block sampling and pointer → world x. Kept
 * DOM-free so it type-checks and runs with no canvas at all (the DOM part is `minimap.ts`).
 */
import { Material } from '../core/terrain.ts';

export const MINIMAP_SCALE = 5;
export const MINIMAP_HEIGHT = 32;

/** Minimap canvas width for a level of this world width. */
export function minimapWidth(levelWidth: number): number {
  return Math.ceil(levelWidth / MINIMAP_SCALE);
}

/** World coordinate → minimap coordinate (floor). */
export function toMinimap(v: number): number {
  return Math.floor(v / MINIMAP_SCALE);
}

/** 0 empty, 1 terrain, 2 steel: steel if any Steel pixel in the 5×5 block, else terrain if any solid. */
export function sampleBlock(
  material: Readonly<Uint8Array>,
  width: number,
  height: number,
  mx: number,
  my: number,
): 0 | 1 | 2 {
  const x0 = mx * MINIMAP_SCALE;
  const y0 = my * MINIMAP_SCALE;
  const x1 = Math.min(width, x0 + MINIMAP_SCALE);
  const y1 = Math.min(height, y0 + MINIMAP_SCALE);
  let hasTerrain = false;
  for (let y = y0; y < y1; y++) {
    const row = y * width;
    for (let x = x0; x < x1; x++) {
      const m = material[row + x] ?? Material.Empty;
      if (m === Material.Steel) return 2;
      if (m !== Material.Empty) hasTerrain = true;
    }
  }
  return hasTerrain ? 1 : 0;
}

/** Minimap-local CSS x → world x, clamped to [0, levelWidth]; clientWidth 0 → treat as canvasWidth. */
export function minimapToWorldX(offsetCssX: number, clientWidth: number, canvasWidth: number, levelWidth: number): number {
  const width = clientWidth > 0 ? clientWidth : canvasWidth;
  const ratio = width > 0 ? offsetCssX / width : 0;
  const worldX = Math.round(ratio * levelWidth);
  return Math.max(0, Math.min(worldX, levelWidth));
}

export function viewportRectX(cameraX: number): number {
  return Math.round(cameraX / MINIMAP_SCALE);
}

export function ghostRectX(hoverWorldX: number, levelWidth: number, viewW: number): number {
  const maxX = Math.max(0, levelWidth - viewW);
  const clamped = Math.max(0, Math.min(hoverWorldX - viewW / 2, maxX));
  return Math.round(clamped / MINIMAP_SCALE);
}
