/**
 * Spec-derived tests for `render/minimap-geometry.ts` against DESIGN.md §5.1 (minimap 1:5 scale)
 * and RENDER-PLAN.md §3.6 (exact formulas). Independent validation (render-v1a).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Material } from '../src/core/terrain.ts';
import {
  ghostRectX,
  minimapToWorldX,
  MINIMAP_HEIGHT,
  MINIMAP_SCALE,
  minimapWidth,
  sampleBlock,
  toMinimap,
  viewportRectX,
} from '../src/render/minimap-geometry.ts';

test('constants: 1 CSS px = 5 world px (DESIGN §5.1), height 32', () => {
  assert.equal(MINIMAP_SCALE, 5);
  assert.equal(MINIMAP_HEIGHT, 32);
});

test('minimapWidth: 1600→320, 640→128, 400→80, 404→81 (ceil)', () => {
  assert.equal(minimapWidth(1600), 320);
  assert.equal(minimapWidth(640), 128);
  assert.equal(minimapWidth(400), 80);
  assert.equal(minimapWidth(404), 81);
});

test('toMinimap: floor(v / 5)', () => {
  assert.equal(toMinimap(0), 0);
  assert.equal(toMinimap(4), 0);
  assert.equal(toMinimap(5), 1);
  assert.equal(toMinimap(24), 4);
  assert.equal(toMinimap(25), 5);
});

// ─── sampleBlock: 0 empty, 1 terrain, 2 steel (steel wins even with terrain also present). ──────
function grid(width: number, height: number, set: (x: number, y: number) => number): Uint8Array {
  const material = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) material[y * width + x] = set(x, y);
  }
  return material;
}

test('sampleBlock: all-empty 5×5 block → 0', () => {
  const width = 10;
  const height = 10;
  const material = grid(width, height, () => Material.Empty);
  assert.equal(sampleBlock(material, width, height, 1, 1), 0);
});

test('sampleBlock: any solid pixel anywhere in the 5×5 block → 1 (terrain)', () => {
  const width = 10;
  const height = 10;
  // Block (mx=1,my=1) covers x∈[5,10), y∈[5,10). Put a single Earth pixel in a corner of it.
  const material = grid(width, height, (x, y) => (x === 9 && y === 9 ? Material.Earth : Material.Empty));
  assert.equal(sampleBlock(material, width, height, 1, 1), 1);
  // The pixel is outside a different neighbouring block, which stays empty.
  assert.equal(sampleBlock(material, width, height, 0, 0), 0);
});

test('sampleBlock: steel anywhere in the block wins over terrain also present', () => {
  const width = 10;
  const height = 10;
  const material = grid(width, height, (x, y) => {
    if (x === 5 && y === 5) return Material.Steel;
    if (x === 6 && y === 6) return Material.Earth;
    return Material.Empty;
  });
  assert.equal(sampleBlock(material, width, height, 1, 1), 2);
});

test('sampleBlock: a block partly outside the grid still samples the pixels that exist', () => {
  const width = 8;
  const height = 8;
  // 8x8 grid → block (mx=1,my=1) covers x∈[5,8), y∈[5,8) (clipped to width/height).
  const material = grid(width, height, (x, y) => (x === 7 && y === 7 ? Material.Earth : Material.Empty));
  assert.equal(sampleBlock(material, width, height, 1, 1), 1);
});

// ─── minimapToWorldX: CSS x → world x, ×5 scaling, clamped, clientWidth authoritative. ──────────
test('minimapToWorldX scales by the level/minimap-width ratio (effectively ×5 when 1:1 CSS)', () => {
  // levelWidth 1600 → minimap canvas 320 wide; at 1:1 CSS scale, clientWidth === canvasWidth === 320.
  assert.equal(minimapToWorldX(160, 320, 320, 1600), 800); // halfway → halfway in world px
  assert.equal(minimapToWorldX(0, 320, 320, 1600), 0);
  assert.equal(minimapToWorldX(320, 320, 320, 1600), 1600);
});

test('minimapToWorldX: clientWidth ≠ canvasWidth (CSS-scaled minimap) uses clientWidth, not canvasWidth', () => {
  // The minimap well is stretched to 640 CSS px wide even though the canvas backing store is 320.
  assert.equal(minimapToWorldX(320, 640, 320, 1600), 800); // halfway of 640 → halfway of the level
  assert.equal(minimapToWorldX(640, 640, 320, 1600), 1600);
});

test('minimapToWorldX: clientWidth 0 (not yet laid out) falls back to canvasWidth', () => {
  assert.equal(minimapToWorldX(160, 0, 320, 1600), 800);
});

test('minimapToWorldX clamps to [0, levelWidth]', () => {
  assert.equal(minimapToWorldX(-50, 320, 320, 1600), 0);
  assert.equal(minimapToWorldX(10_000, 320, 320, 1600), 1600);
});

// ─── viewportRectX / ghostRectX ──────────────────────────────────────────────────────────────
test('viewportRectX: round(cameraX / 5)', () => {
  assert.equal(viewportRectX(0), 0);
  assert.equal(viewportRectX(12), 2); // round(2.4)
  assert.equal(viewportRectX(13), 3); // round(2.6)
  assert.equal(viewportRectX(100), 20);
});

test('ghostRectX clamps at the left edge (hover near world 0)', () => {
  assert.equal(ghostRectX(0, 1600, 400), 0); // 0 - 200 clamps to 0 → 0/5 = 0
  assert.equal(ghostRectX(50, 1600, 400), 0); // 50 - 200 = -150 still clamps to 0
});

test('ghostRectX clamps at the right edge (hover near the level end)', () => {
  const maxWorldX = 1600 - 400; // 1200 (levelWidth - viewW)
  assert.equal(ghostRectX(1600, 1600, 400), Math.round(maxWorldX / 5)); // 240
  assert.equal(ghostRectX(10_000, 1600, 400), Math.round(maxWorldX / 5));
});

test('ghostRectX tracks the hover point in the middle of the level', () => {
  // hoverWorldX 800, viewW 400 → centred camera x would be 600 → /5 = 120
  assert.equal(ghostRectX(800, 1600, 400), 120);
});

test('ghostRectX: a level narrower than the view clamps its max to 0', () => {
  assert.equal(ghostRectX(50, 100, 400), 0);
});
