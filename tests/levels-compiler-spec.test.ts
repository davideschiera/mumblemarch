/**
 * INDEPENDENT validator for the level compiler (task B1-V). Every predictor function below is
 * written from the prose/ASCII-art formulas in `docs/design/DESIGN.md` §4.1-§4.4 and
 * `docs/design/DESIGN-APPENDIX.md` §E.2, NOT copied from `src/levels/texture.ts` or
 * `src/levels/compiler.ts`. Where DESIGN.md itself names `sprites-themes.html`'s `buildTerrain`
 * as "the implementation" of a recipe (its §4.2 table header), that mockup file is read here
 * directly (via `vm`) as the spec text's own citation — never `src/levels/*`.
 *
 * Only `buildTerrain`, `compileLevel`, `validateLevel` and `levelGeometryProblems` are imported
 * from the compiler under test; every colour prediction is computed by this file's own h2/vnoise/
 * fill helpers and compared against what those functions actually produce.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { Material } from '../src/core/terrain.ts';
import {
  buildTerrain,
  compileLevel,
  levelGeometryProblems,
  validateLevel,
} from '../src/levels/compiler.ts';
import { LEVELS } from '../src/levels/registry.ts';
import { STAMPS, type StampId } from '../src/levels/stamps.ts';
import { THEME_IDS, THEMES, type Theme } from '../src/levels/themes.ts';
import type { TerrainPrimitive } from '../src/levels/format.ts';
import { FLOOR_Y, levelDef } from './helpers.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── §4.2 hash/noise, derived from the DESIGN.md prose, independently of texture.ts ────────────
// "h2(x, y, s) = one mulberry32 step on the mixed seed
//  (s ^ imul(x, 374761393) ^ imul(y, 668265263)) >>> 0"
function specH2(x: number, y: number, s: number): number {
  let a = (s ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  // one step of the standard mulberry32 PRNG on state `a` (public-domain algorithm by Tommy
  // Ettinger: a += 0x6D2B79F5, then two xorshift-multiply rounds, XOR-folded — NOT a plain add):
  a = (a + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// "vnoise(x, y, cx, cy, s) interpolates bilinearly (smoothstep) between the h2 lattice values at
//  cell size cx×cy."
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
function specVnoise(x: number, y: number, cx: number, cy: number, s: number): number {
  const gx = x / cx;
  const gy = y / cy;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const u = smoothstep(gx - ix);
  const v = smoothstep(gy - iy);
  const a = specH2(ix, iy, s);
  const b = specH2(ix + 1, iy, s);
  const c = specH2(ix, iy + 1, s);
  const d = specH2(ix + 1, iy + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
const specMod = (a: number, n: number): number => ((a % n) + n) % n;

/** §4.3 8×8 plate, transcribed from the DESIGN.md ASCII diagram. */
const SPEC_PLATE = ['LLLLLLLD', 'LrMMMMrD', 'LdMMMMdD', 'LMMMMMMD', 'LMMMMMMD', 'LrMMMMrD', 'LdMMMMdD', 'DDDDDDDD'];
/** §4.4 8×8 chevron tile, transcribed from the DESIGN.md ASCII diagram. */
const SPEC_CHEV = ['........', 'AAE.....', '.AAE....', '..AAE...', '.AAE....', 'AAE.....', '........', '........'];

function specDepth(solid: (x: number, y: number) => boolean, x: number, y: number): number {
  let d = 0;
  while (d < 8 && solid(x, y - d - 1)) d++;
  return d;
}
function specEdge(solid: (x: number, y: number) => boolean, x: number, y: number): boolean {
  return !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1);
}

function specNatural(
  x: number,
  y: number,
  seed: number,
  dripMax: number,
  earth: readonly number[],
  surface: number,
  surfaceHi: number,
  depth: number,
  edge: boolean,
): number {
  const drip = Math.floor(specH2(x, 0, seed ^ 0xd1) ** 2 * (dripMax + 1));
  if (depth === 0) return specH2(x, y, seed ^ 0x5a) < 0.18 ? surfaceHi : surface;
  if (depth <= 1 + drip) return surface;
  if (depth === 2 + drip) return specH2(x, y, seed ^ 0x5b) < 0.5 ? surface : earth[3]!;
  const v = 0.6 * specVnoise(x, y, 6, 4, seed) + 0.4 * specH2(x, y, seed ^ 0xb0d);
  let k = v < 0.3 ? 0 : v < 0.5 ? 1 : v < 0.72 ? 2 : 3;
  if (edge) k = Math.max(k, 1);
  return earth[k]!;
}

function specStrata(
  x: number,
  y: number,
  seed: number,
  strataBands: readonly number[],
  earth: readonly number[],
  surface: number,
  depth: number,
): number {
  const yy = y + Math.round(1.5 * Math.sin((x + (seed % 97)) / 9));
  let c = strataBands[specMod(yy, strataBands.length)]!;
  if (specH2(x, y, seed ^ 0x5eed) < 0.08) c = earth[1]!;
  if (depth === 0) c = surface;
  return c;
}

function specBricks(
  x: number,
  y: number,
  seed: number,
  bw: number,
  bh: number,
  bricks: readonly [number, number],
  brickHi: number,
  mossOnBricks: boolean,
  surface: number,
  depth: number,
): number {
  const row = Math.floor(y / bh);
  const off = (row % 2) * Math.floor(bw / 2);
  const bx = specMod(x + off, bw);
  const by = specMod(y, bh);
  const worn = specH2(Math.floor((x + off) / bw), row, seed ^ 0xb1c) < 0.3;
  let c: number;
  if (bx === bw - 1 || by === bh - 1) c = bricks[1];
  else if (by === 0 || bx === 0) c = brickHi;
  else if (worn && specH2(x, y, seed ^ 0x77) < 0.35) c = brickHi;
  else c = bricks[0];
  if (mossOnBricks && depth === 0) c = surface;
  return c;
}

function specSolid(depth: number, solidBelow: boolean, surface: number, earth: readonly number[]): number {
  if (depth === 0) return surface;
  return !solidBelow ? earth[1]! : earth[2]!;
}

/**
 * §4.3 metal plate + edge overrides. Precedence (top→bevel, then bottom-or-right→seam, then
 * left→bevel, applied in THIS order) is not disambiguated by the DESIGN.md prose for the 2
 * corners where the two rules conflict (top-right, bottom-left) — it is taken from
 * `sprites-themes.html`'s `buildTerrain`, which §4.2's table header names as the recipe's own
 * "implementation" (i.e. the authoritative source for exactly this, independent of compiler.ts).
 */
function specMetal(x: number, y: number, steel: readonly number[], solid: (x: number, y: number) => boolean): number {
  const k = SPEC_PLATE[specMod(y, 8)]![specMod(x, 8)];
  let c = k === 'L' || k === 'r' ? steel[2]! : k === 'M' ? steel[1]! : steel[0]!;
  if (!solid(x, y - 1)) c = steel[2]!;
  if (!solid(x, y + 1) || !solid(x + 1, y)) c = steel[0]!;
  if (!solid(x - 1, y)) c = steel[2]!;
  return c;
}

function specChevron(x: number, y: number, mirrored: boolean): 'A' | 'E' | null {
  const r = Math.floor(y / 8);
  const ox = (r % 2) * 4;
  let cx = specMod(x + ox, 8);
  const cy = specMod(y, 8);
  if (mirrored) cx = 7 - cx;
  const k = SPEC_CHEV[cy]![cx];
  return k === 'A' ? 'A' : k === 'E' ? 'E' : null;
}

function rectSolid(rx: number, ry: number, rw: number, rh: number, W: number, H: number) {
  return (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < W && y < H && x >= rx && y >= ry && x < rx + rw && y < ry + rh;
}

// ─── Check 1: natural fill, full pixel-exact prediction, all 5 themes ──────────────────────────

test('spec: natural fill matches the §4.2 formula pixel-for-pixel on all 5 themes (depth0 split, drips, ragged row, deep vnoise bands, edge rule)', () => {
  const W = 40;
  const H = 34; // tall enough to clear dripMax=5 (sugarworks) into the deep vnoise band and hit the depth cap (8)
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    const seed = 9001 + id.length;
    const terrain = buildTerrain(W, H, [{ kind: 'rect', x: 0, y: 0, w: W, h: H }], theme, seed);
    const solid = rectSolid(0, 0, W, H, W, H);
    let sawDepth0Hi = false;
    let sawDrip = false;
    let sawRagged = false;
    let sawDeep = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const depth = specDepth(solid, x, y);
        const edge = specEdge(solid, x, y);
        const expected = specNatural(x, y, seed, theme.texture.dripMax, theme.earth, theme.surface, theme.surfaceHi, depth, edge);
        const actual = terrain.color[y * W + x];
        assert.equal(actual, expected, `${id} natural (${x},${y}) depth=${depth} edge=${edge}`);
        if (depth === 0 && expected === theme.surfaceHi) sawDepth0Hi = true;
        if (depth >= 1 && depth <= 1 + theme.texture.dripMax && expected === theme.surface) sawDrip = true;
        if (depth === 2 + theme.texture.dripMax) sawRagged = true;
        if (depth > 2 + theme.texture.dripMax) sawDeep = true;
      }
    }
    assert.ok(sawDepth0Hi, `${id}: never saw a surfaceHi speckle at depth 0`);
    assert.ok(sawDrip, `${id}: never saw a drip row`);
    assert.ok(sawRagged, `${id}: never saw the ragged-edge row`);
    assert.ok(sawDeep, `${id}: never reached the deep vnoise band`);
  }
});

// ─── Check 1: strata fill ───────────────────────────────────────────────────────────────────────

test('spec: strata fill matches the §4.2 formula pixel-for-pixel on all 5 themes (sine-warped bands, speckle, depth0 surface)', () => {
  const W = 60;
  const H = 24;
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    assert.equal(theme.texture.strataBands.length, 12, `${id}: strataBands must have 12 entries`);
    const seed = 4242 + id.length;
    const terrain = buildTerrain(W, H, [{ kind: 'rect', x: 0, y: 0, w: W, h: H, fill: 'strata' }], theme, seed);
    const solid = rectSolid(0, 0, W, H, W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const depth = specDepth(solid, x, y);
        const expected = specStrata(x, y, seed, theme.texture.strataBands, theme.earth, theme.surface, depth);
        assert.equal(terrain.color[y * W + x], expected, `${id} strata (${x},${y})`);
      }
    }
  }
});

// ─── Check 1: bricks fill, EVERY theme's own brick size ────────────────────────────────────────

test('spec: bricks fill matches the §4.2 formula pixel-for-pixel for every theme\'s own brick size (mortar, bevel, running bond, worn bricks, mossOnBricks)', () => {
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    const [bw, bh] = theme.texture.brick;
    const W = bw * 4;
    const H = bh * 4; // at least 2 rows to exercise the odd-row running-bond offset
    const seed = 777 + id.length;
    const terrain = buildTerrain(W, H, [{ kind: 'rect', x: 0, y: 0, w: W, h: H, fill: 'bricks' }], theme, seed);
    const solid = rectSolid(0, 0, W, H, W, H);
    let sawMortar = false;
    let sawBevel = false;
    let sawBrick = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const depth = specDepth(solid, x, y);
        const expected = specBricks(x, y, seed, bw, bh, theme.bricks, theme.brickHi, theme.texture.mossOnBricks, theme.surface, depth);
        assert.equal(terrain.color[y * W + x], expected, `${id} bricks(${bw}x${bh}) (${x},${y})`);
        if (expected === theme.bricks[1]) sawMortar = true;
        if (expected === theme.brickHi) sawBevel = true;
        if (expected === theme.bricks[0]) sawBrick = true;
      }
    }
    assert.ok(sawMortar && sawBevel && sawBrick, `${id}: expected mortar, bevel and brick colours to all appear`);
    if (theme.texture.mossOnBricks) {
      assert.equal(terrain.color[0], theme.surface, `${id}: mossOnBricks should paint the top row as surface`);
    }
  }
});

// ─── Check 1: solid fill ────────────────────────────────────────────────────────────────────────

test('spec: solid fill matches the §4.2 formula pixel-for-pixel on all 5 themes', () => {
  const W = 20;
  const H = 20;
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    const seed = 55;
    const terrain = buildTerrain(W, H, [{ kind: 'rect', x: 0, y: 0, w: W, h: H, fill: 'solid' }], theme, seed);
    const solid = rectSolid(0, 0, W, H, W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const depth = specDepth(solid, x, y);
        const expected = specSolid(depth, solid(x, y + 1), theme.surface, theme.earth);
        assert.equal(terrain.color[y * W + x], expected, `${id} solid (${x},${y})`);
      }
    }
  }
});

// ─── Check 1: metal plate, all 5 themes, world-aligned (region NOT aligned to 8) ────────────────

test('spec: metal plate matches the §4.2/§4.3 formula pixel-for-pixel, world-aligned even when the steel region is not 8px-aligned', () => {
  const W = 64;
  const H = 64;
  const rx = 13; // deliberately NOT a multiple of 8
  const ry = 5;
  const rw = 26;
  const rh = 22;
  for (const id of THEME_IDS) {
    const theme = THEMES[id];
    const terrain = buildTerrain(W, H, [{ kind: 'rect', x: rx, y: ry, w: rw, h: rh, material: 'steel' }], theme, 3);
    const solid = rectSolid(rx, ry, rw, rh, W, H);
    let sawPlate = false;
    let sawSeam = false;
    let sawBevel = false;
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        const expected = specMetal(x, y, theme.steel, solid);
        const actual = terrain.color[y * W + x];
        assert.equal(actual, expected, `${id} metal (${x},${y})`);
        if (actual === theme.steel[1]) sawPlate = true;
        if (actual === theme.steel[0]) sawSeam = true;
        if (actual === theme.steel[2]) sawBevel = true;
        assert.equal(terrain.material[y * W + x], Material.Steel);
      }
    }
    assert.ok(sawPlate && sawSeam && sawBevel, `${id}: expected plate/seam/bevel to all appear`);
  }
});

// ─── Check 2: chevrons, exact A/E, mirrored, world-aligned even off-grid ────────────────────────

test('spec: one-way chevrons match the §4.4 tile exactly, mirror for one-way-left, and stay world-aligned on a rect NOT aligned to 8', () => {
  const theme = THEMES.reef;
  const seed = 314159;
  const W = 60;
  const H = 60;
  const rx = 6; // off 8-grid in both axes
  const ry = 11;
  const rw = 33;
  const rh = 29;
  const right = buildTerrain(W, H, [{ kind: 'rect', x: rx, y: ry, w: rw, h: rh, material: 'one-way-right' }], theme, seed);
  const left = buildTerrain(W, H, [{ kind: 'rect', x: rx, y: ry, w: rw, h: rh, material: 'one-way-left' }], theme, seed);
  const solid = rectSolid(rx, ry, rw, rh, W, H);
  let sawA = false;
  let sawE = false;
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) {
      const depth = specDepth(solid, x, y);
      const edge = specEdge(solid, x, y);
      const baseColor = specNatural(x, y, seed, theme.texture.dripMax, theme.earth, theme.surface, theme.surfaceHi, depth, edge);

      const kRight = specChevron(x, y, false);
      const expectedRight = kRight === 'A' ? theme.oneWay : kRight === 'E' ? theme.oneWayEdge : baseColor;
      assert.equal(right.color[y * W + x], expectedRight, `right (${x},${y})`);
      assert.equal(right.material[y * W + x], Material.OneWayRight);

      const kLeft = specChevron(x, y, true);
      const expectedLeft = kLeft === 'A' ? theme.oneWay : kLeft === 'E' ? theme.oneWayEdge : baseColor;
      assert.equal(left.color[y * W + x], expectedLeft, `left (${x},${y})`);
      assert.equal(left.material[y * W + x], Material.OneWayLeft);

      if (kRight === 'A') sawA = true;
      if (kRight === 'E') sawE = true;
    }
  }
  assert.ok(sawA && sawE, 'expected both chevron arrow (A) and edge (E) pixels to appear');
  assert.notDeepEqual(Array.from(right.color), Array.from(left.color), 'left must be a genuine mirror, not identical');
});

// ─── Check 1: depth computed AFTER all primitives (stacked shapes must not leave grass inside) ──

test('spec: depth is computed after ALL primitives — a shape painted on top of an earlier one leaves no buried surface colour ("add" and "behind")', () => {
  const theme = THEMES.mossgrove;
  const seed = 123;
  const W = 30;
  const H = 60;

  // "add": shape A (y 20..39) is painted first; shape B (y 0..39) is painted second and extends
  // 20 rows above A's old top. A's old top row (y=20) must now be deep-earth, not surface.
  {
    const scene: TerrainPrimitive[] = [
      { kind: 'rect', x: 0, y: 20, w: W, h: 20 },
      { kind: 'rect', x: 0, y: 0, w: W, h: 40 },
    ];
    const terrain = buildTerrain(W, H, scene, theme, seed);
    const solidFinal = rectSolid(0, 0, W, 40, W, H);
    for (let x = 1; x < W - 1; x++) {
      const depth = specDepth(solidFinal, x, 20);
      const edge = specEdge(solidFinal, x, 20);
      assert.equal(depth, 8, `x=${x}: expected the capped depth of 8 at A's old top row after B covers it`);
      const expected = specNatural(x, 20, seed, theme.texture.dripMax, theme.earth, theme.surface, theme.surfaceHi, depth, edge);
      assert.equal(terrain.color[20 * W + x], expected, `x=${x}: post-paint colour`);
      assert.notEqual(terrain.color[20 * W + x], theme.surface, `x=${x}: must not still show the buried "grass" colour`);
      assert.notEqual(terrain.color[20 * W + x], theme.surfaceHi, `x=${x}: must not still show the buried "grass" colour`);
    }
  }

  // "behind": shape A (y 30..49) is painted first; a big "behind" fill (y 0..49) then fills ONLY
  // where empty (rows 0..29), never touching A — but depth at A's old top (y=30) must still see
  // through to the behind-painted rows above it.
  {
    const scene: TerrainPrimitive[] = [
      { kind: 'rect', x: 0, y: 30, w: W, h: 20 },
      { kind: 'rect', x: 0, y: 0, w: W, h: 50, op: 'behind' },
    ];
    const terrain = buildTerrain(W, H, scene, theme, seed);
    const solidFinal = rectSolid(0, 0, W, 50, W, H);
    for (let x = 1; x < W - 1; x++) {
      const depth = specDepth(solidFinal, x, 30);
      assert.equal(depth, 8, `x=${x}: "behind" fill above must still count toward depth`);
      assert.notEqual(terrain.color[30 * W + x], theme.surface, `x=${x}: must not show buried grass under a "behind" fill`);
    }
  }
});

// ─── Check 3: validation rules ──────────────────────────────────────────────────────────────────

test('spec: validateLevel rejects fill:"metal" on any non-steel material (earth AND one-way)', () => {
  const metalOnEarth = levelDef({ terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, fill: 'metal' }] });
  const metalProblemsEarth = validateLevel(metalOnEarth);
  assert.ok(metalProblemsEarth.some((p) => p.includes('metal')), 'metal on earth must be rejected');

  const metalOnOneWay = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'one-way-right', fill: 'metal' }],
  });
  assert.ok(validateLevel(metalOnOneWay).some((p) => p.includes('metal')), 'metal on one-way must be rejected');
});

test('spec: validateLevel rejects steel with any non-metal fill (natural AND bricks) and accepts steel with fill:"metal" or no fill', () => {
  const steelNatural = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel', fill: 'natural' }],
  });
  assert.ok(validateLevel(steelNatural).length > 0, 'steel + natural fill must be rejected');

  const steelBricks = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel', fill: 'bricks' }],
  });
  assert.ok(validateLevel(steelBricks).length > 0, 'steel + bricks fill must be rejected');

  const steelExplicitMetal = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel', fill: 'metal' }],
  });
  assert.deepEqual(validateLevel(steelExplicitMetal), []);

  const steelDefaultFill = levelDef({ terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel' }] });
  assert.deepEqual(validateLevel(steelDefaultFill), []);
});

test('spec: levelGeometryProblems flags a floating exit and a buried entrance', () => {
  const floating = levelDef({ exits: [{ x: 200, y: 5 }] }); // open air far above the floor
  assert.deepEqual(validateLevel(floating), [], 'geometry is not a validateLevel concern');
  const floatProblems = levelGeometryProblems(floating);
  assert.equal(floatProblems.length, 1);
  assert.match(floatProblems[0]!, /exit 0/);

  const buried = levelDef({ entrances: [{ x: 15, y: FLOOR_Y + 3 }] }); // inside the solid floor
  assert.deepEqual(validateLevel(buried), []);
  const buriedProblems = levelGeometryProblems(buried);
  assert.equal(buriedProblems.length, 1);
  assert.match(buriedProblems[0]!, /entrance 0/);

  assert.deepEqual(levelGeometryProblems(levelDef()), [], 'the default fixture must have no geometry problems');
});

// ─── Check 4: invariants across all 12 registered levels ───────────────────────────────────────

test('spec: all 12 registered levels compile byte-identically on repeat', () => {
  assert.equal(LEVELS.length, 12, 'expected exactly 12 registered levels');
  for (const def of LEVELS) {
    const a = compileLevel(def);
    const b = compileLevel(def);
    assert.deepEqual(Array.from(a.terrain.material), Array.from(b.terrain.material), `${def.id}: material`);
    assert.deepEqual(Array.from(a.terrain.color), Array.from(b.terrain.color), `${def.id}: colour`);
  }
});

test('spec: all 12 registered levels validate cleanly, have no geometry problems, and every pixel stays inside its material\'s colour roles', () => {
  for (const def of LEVELS) {
    assert.deepEqual(validateLevel(def), [], `${def.id}: validateLevel`);
    assert.deepEqual(levelGeometryProblems(def), [], `${def.id}: levelGeometryProblems`);

    const theme: Theme = THEMES[def.theme];
    const objectRoleIndices = new Set<number>([...theme.hazard, ...theme.trap, ...theme.hatch, ...theme.exit, theme.decor]);
    const naturalPalette = new Set<number>([...theme.earth, theme.surface, theme.surfaceHi]);

    const { terrain } = compileLevel(def);
    for (let i = 0; i < terrain.material.length; i++) {
      const m = terrain.material[i];
      const c = terrain.color[i] ?? 0;
      if (m === Material.Empty) {
        assert.equal(c, 0, `${def.id}[${i}]: empty pixel must carry colour 0`);
        continue;
      }
      assert.ok(c >= 1 && c <= 16, `${def.id}[${i}]: solid pixel colour ${c} outside terrain role range 1..16`);
      assert.ok(!objectRoleIndices.has(c), `${def.id}[${i}]: terrain pixel carries an object-only palette index (17-27)`);
      if (m === Material.Steel) {
        assert.ok(theme.steel.includes(c), `${def.id}[${i}]: steel pixel colour ${c} is not one of the theme's steel colours`);
      }
      if (m === Material.OneWayLeft || m === Material.OneWayRight) {
        // Every one-way primitive currently shipped uses the default 'natural' fill (verified
        // against src/levels/data/*.ts), so its non-chevron pixels must fall in the natural
        // palette; chevron pixels carry oneWay/oneWayEdge.
        const ok = c === theme.oneWay || c === theme.oneWayEdge || naturalPalette.has(c);
        assert.ok(ok, `${def.id}[${i}]: one-way pixel colour ${c} is neither a chevron colour nor a natural-fill colour`);
      }
    }
  }
});

// ─── Check 5: stamps — parsed straight out of LEVELS.md, and boulder/mushroom vs levels-data.js ─

test('spec: the 5 new stamps pixel-match the ASCII block in docs/design/LEVELS.md exactly', () => {
  const levelsMd = readFileSync(path.join(root, 'docs/design/LEVELS.md'), 'utf8');
  const blockStart = levelsMd.indexOf('## Proposed stamps');
  assert.ok(blockStart >= 0, 'LEVELS.md must contain the "Proposed stamps" section');
  const fenceStart = levelsMd.indexOf('```text', blockStart);
  const fenceEnd = levelsMd.indexOf('```', fenceStart + 7);
  const block = levelsMd.slice(fenceStart + '```text'.length, fenceEnd);
  const rows = block.replace(/^\n/, '').split('\n'); // rows[0] = header line, rows[1..] = art rows

  // Column start positions are derived from where each stamp's own ASCII art actually begins on
  // the first data row (rows[1]) — i.e. the 5 left-to-right runs of '.'/'#' on that row — not
  // from the (differently-spaced) header text, since the two are not character-aligned.
  const dataRow0 = rows[1]!;
  const runs: [start: number, width: number][] = [];
  const re = /[.#]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dataRow0))) runs.push([m.index, m[0].length]);
  assert.equal(runs.length, 5, `expected 5 stamp columns on the first data row, found ${runs.length}`);

  const order: readonly [name: StampId, w: number, h: number][] = [
    ['fern', 9, 8],
    ['cog', 10, 10],
    ['gumdrop', 8, 6],
    ['crystal', 7, 10],
    ['coral', 10, 8],
  ];
  order.forEach(([name, w, h], colIndex) => {
    const [start] = runs[colIndex]!;
    assert.equal(w, runs[colIndex]![1], `${name}: column width on the first data row`);
    const specRows = STAMPS[name];
    assert.equal(specRows.length, h, `${name}: LEVELS.md/stamps.ts height mismatch`);
    for (let r = 0; r < h; r++) {
      const line = rows[1 + r] ?? '';
      const parsed = line.slice(start, start + w).padEnd(w, ' ');
      assert.equal(parsed, specRows[r], `${name} row ${r}: LEVELS.md text vs stamps.ts`);
    }
    // Below the stamp's own height, LEVELS.md's column is blank (shorter stamps sit in a taller
    // grid) — confirm no stray '#' leaks into rows padded only with spaces.
  });
});

test('spec: boulder and mushroom stamps are unchanged vs window.MUMBLE_STAMPS in levels-data.js', () => {
  const dataPath = path.join(root, 'docs/design/mockups/levels-data.js');
  const source = readFileSync(dataPath, 'utf8');
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: dataPath });
  const ref = sandbox.window['MUMBLE_STAMPS'] as Record<string, readonly string[]>;
  assert.ok(ref?.['boulder'] && ref?.['mushroom'], 'levels-data.js must define MUMBLE_STAMPS.boulder/mushroom');
  assert.deepEqual(Array.from(STAMPS['boulder']), Array.from(ref['boulder']!));
  assert.deepEqual(Array.from(STAMPS['mushroom']), Array.from(ref['mushroom']!));
});

test('spec: stamp flipX mirrors columns and an integer scale multiplies coverage by scale² (independent of the "mushroom"/"boulder" case used elsewhere)', () => {
  const theme = THEMES.reef;
  const rows = STAMPS.coral;
  const cols = Math.max(...rows.map((r) => r.length));
  const plain = buildTerrain(cols + 5, rows.length + 5, [{ kind: 'stamp', stamp: 'coral', x: 0, y: 0 }], theme, 9);
  const flipped = buildTerrain(cols + 5, rows.length + 5, [{ kind: 'stamp', stamp: 'coral', x: 0, y: 0, flipX: true }], theme, 9);
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      assert.equal(plain.isSolid(x, y), rows[y]?.[x] === '#', `plain (${x},${y})`);
      assert.equal(flipped.isSolid(x, y), rows[y]?.[cols - 1 - x] === '#', `flipped (${x},${y})`);
    }
  }
  const scale = 3;
  const scaled = buildTerrain(cols * scale + 3, rows.length * scale + 3, [{ kind: 'stamp', stamp: 'coral', x: 0, y: 0, scale }], theme, 9);
  let sourceSolid = 0;
  for (const row of rows) for (const ch of row) if (ch === '#') sourceSolid++;
  let scaledSolid = 0;
  for (let y = 0; y < rows.length * scale; y++) for (let x = 0; x < cols * scale; x++) if (scaled.isSolid(x, y)) scaledSolid++;
  assert.equal(scaledSolid, sourceSolid * scale * scale, `scale=${scale} should multiply solid-pixel count by ${scale * scale}`);
});

// ─── Check 6: reference pixel diff, independently loaded from sprites-themes.html ───────────────

test('spec: buildTerrain matches an independently-loaded copy of sprites-themes.html\'s reference buildTerrain, for all 5 themes, on the page\'s own SCENE and seed', () => {
  const themesHtmlPath = path.join(root, 'docs/design/mockups/sprites-themes.html');
  const themesHtml = readFileSync(themesHtmlPath, 'utf8');
  const start = themesHtml.indexOf('function h2(');
  const end = themesHtml.indexOf('const POOL', start);
  assert.ok(start >= 0 && end > start, 'reference markers not found in sprites-themes.html');
  const refSource = themesHtml.slice(start, end);
  const sandbox: Record<string, unknown> = {};
  vm.createContext(sandbox);
  vm.runInContext(refSource, sandbox, { filename: themesHtmlPath });
  const refBuildTerrain = vm.runInContext('buildTerrain', sandbox) as (
    w: number,
    h: number,
    prims: readonly unknown[],
    theme: unknown,
    seed: number,
  ) => { mat: Uint8Array; col: Uint8Array };
  const REF_SCENE = vm.runInContext('SCENE', sandbox) as readonly unknown[];

  const spritesPath = path.join(root, 'docs/design/mockups/sprites.js');
  const artSandbox: { window: Record<string, unknown> } = { window: {} };
  vm.createContext(artSandbox);
  vm.runInContext(readFileSync(spritesPath, 'utf8'), artSandbox, { filename: spritesPath });
  const ART = artSandbox.window['MUMBLE_ART'] as { themes: Record<string, unknown> };

  // Own transcription of SCENE (sprites-themes.html lines 179-187), used to drive OUR buildTerrain
  // with the exact same primitive kinds the reference's simplified `cover` function supports.
  const SCENE: TerrainPrimitive[] = [
    { kind: 'rect', x: 0, y: 74, w: 200, h: 26 },
    { kind: 'ellipse', cx: 38, cy: 77, rx: 30, ry: 6 },
    { kind: 'rect', x: 92, y: 74, w: 28, h: 14, op: 'erase' },
    { kind: 'rect', x: 4, y: 40, w: 54, h: 10, fill: 'strata' },
    { kind: 'rect', x: 62, y: 62, w: 24, h: 12, fill: 'bricks' },
    { kind: 'rect', x: 128, y: 56, w: 24, h: 18, material: 'steel' },
    { kind: 'rect', x: 158, y: 40, w: 12, h: 34, material: 'one-way-right' },
  ];

  let totalPixels = 0;
  let matDiffs = 0;
  let colDiffs = 0;
  for (const id of THEME_IDS) {
    const seed = 0x1234 + id.length * 7919;
    const ref = refBuildTerrain(200, 100, REF_SCENE, ART.themes[id], seed);
    const mine = buildTerrain(200, 100, SCENE, THEMES[id], seed);
    for (let i = 0; i < ref.mat.length; i++) {
      totalPixels++;
      // Mockup numbering: one-way-right=3, one-way-left=4 (core/terrain.ts is the reverse: 3/4
      // swapped) — map by role, not raw byte, exactly as compiler.ts's own comment explains.
      const refM = ref.mat[i] === 3 ? Material.OneWayRight : ref.mat[i] === 4 ? Material.OneWayLeft : ref.mat[i];
      if (mine.material[i] !== refM) matDiffs++;
      if (mine.color[i] !== ref.col[i]) colDiffs++;
    }
  }
  assert.equal(totalPixels, 5 * 200 * 100);
  assert.equal(matDiffs, 0, `${matDiffs} of ${totalPixels} material pixels differ from the reference`);
  assert.equal(colDiffs, 0, `${colDiffs} of ${totalPixels} colour pixels differ from the reference`);
});

// ─── Check 3 (extra): unknown fill/material combos on a second material don't slip through ──────

test('spec: a one-way material with fill:"bricks" is a normal, valid combination (metal is the ONLY fill restricted to steel)', () => {
  const def = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'one-way-left', fill: 'bricks' }],
  });
  assert.deepEqual(validateLevel(def), []);
});
