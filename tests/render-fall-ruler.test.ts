/**
 * Spec-derived tests for `render/fall-ruler.ts` against DESIGN.md §7.1 (A14) / §7.11 (safe ≤ 63px
 * vs deadly ≥ 64px, "an icon + line style") and RENDER-PLAN.md §3.4 (exact geometry + colours).
 * Independent validation (render-v1a).
 *
 * Note on the ✓/✕ landing-marker glyphs: neither DESIGN.md nor RENDER-PLAN.md gives an exact
 * pixel bitmap for them (unlike the digit font, which is spec'd in `art/overlays.ts`). We treat
 * "a 5×5 ✓/✕ glyph" as: a multi-pixel mark bounded within a 5×5 box at the documented position,
 * in the documented colour, with a contrasting outline — and, since "not colour alone" is a MUST,
 * that the safe and deadly glyphs are actually different shapes, not just different colours. The
 * exact pixel layout of each glyph is an implementation choice, not tested pixel-for-pixel.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Material, Terrain } from '../src/core/terrain.ts';
import type { Direction } from '../src/core/types.ts';
import { dropBelow, drawFallRuler, DEADLY_DROP_PX, RULER_LENGTH_PX, SAFE_DROP_PX } from '../src/render/fall-ruler.ts';
import type { PixelTarget } from '../src/render/pixel-target.ts';

// Exact hex values from RENDER-PLAN §3.4 / DESIGN §7.11.
const CREAM = '#fff1d6';
const PLUM = '#2a1433';
const DANGER = '#ef3e55';

class FakeTarget implements PixelTarget {
  fillStyle: unknown = '#000000';
  readonly calls: { x: number; y: number; w: number; h: number; style: unknown }[] = [];
  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ x, y, w, h, style: this.fillStyle });
  }
}

function findCall(calls: FakeTarget['calls'], x: number, y: number, style: unknown): boolean {
  return calls.some((c) => c.x === x && c.y === y && c.style === style);
}

test('constants: SAFE 63 / DEADLY 64 (DESIGN §7.1 A14), RULER_LENGTH_PX 80', () => {
  assert.equal(SAFE_DROP_PX, 63);
  assert.equal(DEADLY_DROP_PX, 64);
  assert.equal(RULER_LENGTH_PX, 80);
});

// ─── dropBelow ──────────────────────────────────────────────────────────────────────────────
test('dropBelow: 1 means ground right under the next row', () => {
  const terrain = new Terrain(50, 200);
  terrain.set(20, 31, Material.Earth, 1); // foot row 30, solid at 31
  assert.equal(dropBelow(terrain, 20, 30, 200), 1);
});

test('dropBelow: returns the exact distance to the first solid pixel below', () => {
  const terrain = new Terrain(50, 200);
  terrain.set(20, 80, Material.Earth, 1); // foot row 30 → distance 50
  assert.equal(dropBelow(terrain, 20, 30, 200), 50);
});

test('dropBelow: Infinity when nothing solid within `max` px', () => {
  const terrain = new Terrain(50, 300);
  terrain.set(20, 250, Material.Earth, 1); // far beyond max
  assert.equal(dropBelow(terrain, 20, 30, 100), Infinity);
});

test('dropBelow: Infinity once the scan runs past the level bottom', () => {
  const terrain = new Terrain(50, 40); // short level, all empty
  assert.equal(dropBelow(terrain, 20, 0, 200), Infinity);
});

test('dropBelow: exactly at `max` is still found; one past it is not', () => {
  const terrain = new Terrain(50, 300);
  terrain.set(20, 30 + 100, Material.Earth, 1);
  assert.equal(dropBelow(terrain, 20, 30, 100), 100);
  const terrain2 = new Terrain(50, 300);
  terrain2.set(20, 30 + 101, Material.Earth, 1);
  assert.equal(dropBelow(terrain2, 20, 30, 100), Infinity);
});

// ─── drawFallRuler: line geometry ───────────────────────────────────────────────────────────
test('rows y+1..y+63 are a SOLID line (cream, with a plum contrast line on the far side), no gaps', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  const x = 50;
  const y = 0;
  const dir: Direction = 1;
  drawFallRuler(target, terrain, x, y, dir, 0, 0);

  const cx = x + 7 * dir; // 57: just ahead of the mumble
  const farX = cx + dir; // 58

  for (let row = y + 1; row <= y + SAFE_DROP_PX; row++) {
    if (row % 16 === 0) {
      assert.ok(findCall(target.calls, cx - 1, row, CREAM), `tick mark missing at row ${row}`);
    } else {
      assert.ok(findCall(target.calls, cx, row, CREAM), `solid cream pixel missing at row ${row}`);
    }
    assert.ok(findCall(target.calls, farX, row, PLUM), `plum contrast pixel missing at row ${row}`);
  }
});

test('row y+64 is a distinct 5px red bar + ✕ glyph — not part of the safe line', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);
  const cx = 57;

  assert.ok(findCall(target.calls, cx - 2, 64, DANGER), 'red bar left edge');
  // The bar is 5px wide: cx-2 .. cx+2, all in one fillRect call of width 5.
  const bar = target.calls.find((c) => c.y === 64 && c.style === DANGER && c.w === 5);
  assert.ok(bar, 'expected a single 5px-wide red bar at row 64');
  assert.equal(bar!.x, cx - 2);

  // Row 64 is NOT part of the continuous safe cream line (the loop stops at y+63).
  assert.ok(!findCall(target.calls, cx, 64, CREAM), 'row 64 must not carry the safe cream pixel');
});

test('rows beyond y+64 are DASHED (2 on, 2 off) — real gaps, not just a colour change', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);
  const cx = 57;
  const dashStart = 65;

  for (let row = dashStart; row <= RULER_LENGTH_PX; row++) {
    const offset = row - dashStart;
    const shouldBeDrawn = offset % 4 < 2;
    const drawn = findCall(target.calls, cx, row, DANGER);
    assert.equal(drawn, shouldBeDrawn, `row ${row} (offset ${offset}) dash state`);
  }
  // And to be doubly sure it's really dashed and not solid: at least one gap row has NO red pixel
  // at cx at all (not merely a different colour there).
  const gapRow = dashStart + 2; // offset 2 → gap
  assert.ok(!target.calls.some((c) => c.x === cx && c.y === gapRow), `expected a true gap at row ${gapRow}`);
});

test('the safe zone (≤ 63) has no dashes: every row in range has a fillRect at the ruler column', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);
  const cx = 57;
  for (let row = 1; row <= SAFE_DROP_PX; row++) {
    const hasSomething = target.calls.some((c) => c.y === row && (c.x === cx || c.x === cx - 1));
    assert.ok(hasSomething, `expected no gap at safe row ${row}`);
  }
});

test('mirrored (dir = −1): the ruler column is ahead in the mirrored direction', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  const x = 100;
  drawFallRuler(target, terrain, x, 0, -1, 0, 0);
  const cx = x + 7 * -1; // 93
  assert.ok(findCall(target.calls, cx, 1, CREAM));
  assert.ok(findCall(target.calls, cx - 1, 1, PLUM)); // far side is cx + dir = cx - 1
});

test('camera offset shifts every draw by (camX, camY)', () => {
  const terrain = new Terrain(200, 300);
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 20, 5);
  const cx = 57 - 20;
  assert.ok(findCall(target.calls, cx, 1 - 5, CREAM));
});

// ─── Landing marker: ✓ for a safe landing, ✕ for a deadly one — different shape, not just colour ──
function glyphOffsets(
  calls: FakeTarget['calls'],
  style: unknown,
  boxLeft: number,
  boxTop: number,
): Set<string> {
  const offsets = new Set<string>();
  for (const c of calls) {
    if (c.style !== style) continue;
    const dx = c.x - boxLeft;
    const dy = c.y - boxTop;
    if (dx >= 0 && dx < 5 && dy >= 0 && dy < 5) offsets.add(`${dx},${dy}`);
  }
  return offsets;
}

test('a safe landing (d ≤ 63) draws a multi-pixel cream glyph (✓) with a plum outline at the landing row', () => {
  const terrain = new Terrain(200, 300);
  terrain.set(57, 40, Material.Earth, 1); // dropBelow(cx=57, y=0) = 40 (safe)
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);

  const glyphLeft = 57 + 3; // dir 1: cx + 3
  const top = 40 - 2; // landingRow - 2
  const fillOffsets = glyphOffsets(target.calls, CREAM, glyphLeft, top);
  assert.ok(fillOffsets.size >= 4, `expected a multi-pixel ✓ glyph, got ${fillOffsets.size} cream pixels`);

  const haloOffsets = glyphOffsets(target.calls, PLUM, glyphLeft - 1, top - 1); // 7×7 box incl. halo margin
  assert.ok(haloOffsets.size > 0, 'expected a plum outline around the ✓ glyph');

  // No danger-red glyph should appear at this row (it's a safe landing, not deadly).
  assert.equal(glyphOffsets(target.calls, DANGER, glyphLeft, top).size, 0);
});

test('a deadly landing (d ≥ 64) draws a multi-pixel red glyph (✕) — a DIFFERENT shape from the ✓', () => {
  const safeTerrain = new Terrain(200, 300);
  safeTerrain.set(57, 40, Material.Earth, 1);
  const safeTarget = new FakeTarget();
  drawFallRuler(safeTarget, safeTerrain, 50, 0, 1, 0, 0);
  const safeOffsets = glyphOffsets(safeTarget.calls, CREAM, 60, 38);

  const deadlyTerrain = new Terrain(200, 300);
  deadlyTerrain.set(57, 70, Material.Earth, 1); // dropBelow = 70 (deadly)
  const deadlyTarget = new FakeTarget();
  drawFallRuler(deadlyTarget, deadlyTerrain, 50, 0, 1, 0, 0);
  const glyphLeft = 60;
  const top = 70 - 2;
  const deadlyOffsets = glyphOffsets(deadlyTarget.calls, DANGER, glyphLeft, top);

  assert.ok(deadlyOffsets.size >= 4, `expected a multi-pixel ✕ glyph, got ${deadlyOffsets.size} red pixels`);
  const haloOffsets = glyphOffsets(deadlyTarget.calls, PLUM, glyphLeft - 1, top - 1);
  assert.ok(haloOffsets.size > 0, 'expected a plum outline around the ✕ glyph');

  // "Not colour alone": the two landing glyphs must differ in shape, not just in fill colour.
  const sortedSafe = [...safeOffsets].sort();
  const sortedDeadly = [...deadlyOffsets].sort();
  assert.notDeepEqual(sortedDeadly, sortedSafe, 'the ✓ and ✕ glyphs must be different shapes');

  // And no cream ✓ pixel should appear at the deadly landing row.
  assert.equal(glyphOffsets(deadlyTarget.calls, CREAM, glyphLeft, top).size, 0);
});

test('no landing marker is drawn when there is no floor within range', () => {
  const terrain = new Terrain(200, 300); // entirely empty
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);
  // No cream/danger pixels far out at column 60+ near the bottom of the ruler (no glyph at all).
  const anyGlyph = target.calls.some((c) => c.x >= 60 && c.x <= 64 && (c.style === CREAM || c.style === DANGER) && c.y > 66);
  assert.ok(!anyGlyph, 'no landing glyph should appear when dropBelow is Infinity');
});

// ─── Bounds: never draw outside the level ───────────────────────────────────────────────────
test('never draws outside the level: a short level clips the ruler cleanly', () => {
  const terrain = new Terrain(200, 50); // shorter than RULER_LENGTH_PX
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 50, 0, 1, 0, 0);
  assert.ok(target.calls.length > 0);
  for (const c of target.calls) {
    assert.ok(c.y >= 0 && c.y < terrain.height, `y=${c.y} out of [0,${terrain.height})`);
    assert.ok(c.x >= 0 && c.x + c.w <= terrain.width, `x=${c.x} w=${c.w} out of [0,${terrain.width}]`);
  }
});

test('never draws outside the level: near the left edge (mirrored) draws nothing off-grid', () => {
  const terrain = new Terrain(10, 100);
  const target = new FakeTarget();
  drawFallRuler(target, terrain, 3, 0, -1, 0, 0); // cx = 3 - 7 = -4: fully off the left edge
  assert.equal(target.calls.length, 0);
});
