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
  LevelValidationError,
  validateLevel,
} from '../src/levels/compiler.ts';
import { LEVELS } from '../src/levels/registry.ts';
import { STAMPS } from '../src/levels/stamps.ts';
import { THEME_IDS, THEMES } from '../src/levels/themes.ts';
import type { TerrainPrimitive } from '../src/levels/format.ts';
import { FLOOR_Y, levelDef } from './helpers.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── Reference implementation (docs/design/mockups) loaded in a vm sandbox ─────────────────
// `sprites-themes.html` §5 is the design source of truth for terrain colouring; our compiler is
// a 1:1 port of it. See CONTRACTS.md read list: h2/vnoise/mod/PLATE/CHEV/buildTerrain/SCENE.
const themesHtmlPath = path.join(root, 'docs/design/mockups/sprites-themes.html');
const themesHtml = readFileSync(themesHtmlPath, 'utf8');
const REF_START = 'function h2(';
const REF_END = 'const POOL';
const refStartIdx = themesHtml.indexOf(REF_START);
const refEndIdx = themesHtml.indexOf(REF_END, refStartIdx);
if (refStartIdx < 0 || refEndIdx < 0) throw new Error('reference source markers not found in sprites-themes.html');
const refSource = themesHtml.slice(refStartIdx, refEndIdx);

const refSandbox: Record<string, unknown> = {};
vm.createContext(refSandbox);
vm.runInContext(refSource, refSandbox, { filename: themesHtmlPath });
// Top-level `const`/`function` from a vm script attach to the context's global lexical
// environment, not to the sandbox object — read them back with another run in the same context.
const refBuildTerrain = vm.runInContext('buildTerrain', refSandbox) as (
  w: number,
  h: number,
  prims: readonly unknown[],
  theme: unknown,
  seed: number,
) => { mat: Uint8Array; col: Uint8Array };
const REF_SCENE = vm.runInContext('SCENE', refSandbox) as readonly unknown[];

// `sprites.js` sets window.MUMBLE_ART (palette/theme source data), loaded the same way as
// tests/art-port.test.ts.
const spritesPath = path.join(root, 'docs/design/mockups/sprites.js');
const spritesSource = readFileSync(spritesPath, 'utf8');
const artSandbox: { window: Record<string, unknown> } = { window: {} };
vm.createContext(artSandbox);
vm.runInContext(spritesSource, artSandbox, { filename: spritesPath });
const ART = artSandbox.window['MUMBLE_ART'] as { themes: Record<string, unknown> };

/** Our TS transcription of sprites-themes.html's SCENE (lines 179-187), kind-for-kind. */
const SCENE: TerrainPrimitive[] = [
  { kind: 'rect', x: 0, y: 74, w: 200, h: 26 },
  { kind: 'ellipse', cx: 38, cy: 77, rx: 30, ry: 6 },
  { kind: 'rect', x: 92, y: 74, w: 28, h: 14, op: 'erase' },
  { kind: 'rect', x: 4, y: 40, w: 54, h: 10, fill: 'strata' },
  { kind: 'rect', x: 62, y: 62, w: 24, h: 12, fill: 'bricks' },
  { kind: 'rect', x: 128, y: 56, w: 24, h: 18, material: 'steel' },
  { kind: 'rect', x: 158, y: 40, w: 12, h: 34, material: 'one-way-right' },
];

/**
 * A second scene of our own, restricted to rect/ellipse (the only kinds the reference's
 * `shapeOf` supports), exercising one-way-LEFT (mirrored chevrons), strata/solid/bricks side by
 * side, `behind`, and overlapping shapes — combinations SCENE above doesn't cover.
 */
const SCENE2: TerrainPrimitive[] = [
  { kind: 'rect', x: 0, y: 80, w: 200, h: 20 }, // floor (natural)
  { kind: 'rect', x: 4, y: 40, w: 30, h: 20, fill: 'strata' },
  { kind: 'rect', x: 40, y: 40, w: 30, h: 20, fill: 'solid' },
  { kind: 'rect', x: 76, y: 40, w: 30, h: 20, fill: 'bricks' },
  { kind: 'rect', x: 120, y: 32, w: 16, h: 40, material: 'one-way-left' },
  // `behind`: must not overwrite the floor or the one-way wall it overlaps.
  { kind: 'rect', x: 110, y: 20, w: 60, h: 70, op: 'behind', fill: 'solid' },
  // overlapping shapes, then a small steel patch stacked on top of both.
  { kind: 'rect', x: 150, y: 50, w: 40, h: 30 },
  { kind: 'ellipse', cx: 170, cy: 65, rx: 18, ry: 12 },
  { kind: 'rect', x: 160, y: 55, w: 10, h: 10, material: 'steel' },
];

function assertMatchesReference(
  label: string,
  themeId: (typeof THEME_IDS)[number],
  scene: readonly TerrainPrimitive[],
  refScene: readonly unknown[],
): void {
  const seed = 0x1234 + themeId.length * 7919;
  const theme = THEMES[themeId];
  const refTheme = ART.themes[themeId];
  const ref = refBuildTerrain(200, 100, refScene, refTheme, seed);
  const mine = buildTerrain(200, 100, scene, theme, seed);
  const mappedMat = Array.from(ref.mat, (v) => (v === 3 ? Material.OneWayRight : v === 4 ? Material.OneWayLeft : v));
  assert.deepEqual(Array.from(mine.material), mappedMat, `${themeId}/${label}: material mismatch`);
  assert.deepEqual(Array.from(mine.color), Array.from(ref.col), `${themeId}/${label}: colour mismatch`);
}

test('buildTerrain matches the reference implementation pixel-for-pixel (5 themes × 2 scenes)', () => {
  for (const id of THEME_IDS) {
    assertMatchesReference('SCENE', id, SCENE, REF_SCENE);
    assertMatchesReference('SCENE2', id, SCENE2, SCENE2);
  }
});

test('every registered level compiles deterministically (byte-identical on repeat)', () => {
  for (const def of LEVELS) {
    const a = compileLevel(def);
    const b = compileLevel(def);
    assert.deepEqual(a.terrain.material, b.terrain.material, def.id);
    assert.deepEqual(a.terrain.color, b.terrain.color, def.id);
  }
});

test('every registered level validates, has no geometry problems, and stays within the palette roles', () => {
  for (const def of LEVELS) {
    assert.deepEqual(validateLevel(def), [], def.id);
    assert.deepEqual(levelGeometryProblems(def), [], def.id);
    const { terrain } = compileLevel(def);
    for (let i = 0; i < terrain.material.length; i++) {
      if (terrain.material[i] === Material.Empty) {
        assert.equal(terrain.color[i], 0, `${def.id}: empty pixel ${i} has non-zero colour`);
      } else {
        const c = terrain.color[i] ?? 0;
        assert.ok(c >= 1 && c <= 16, `${def.id}: solid pixel ${i} colour ${c} out of role range 1..16`);
      }
    }
  }
});

test('level ids are unique', () => {
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('invalid levels are rejected with readable problems', () => {
  const bad = levelDef({ id: 'Bad Id', saveRequired: 99, exits: [] });
  assert.ok(validateLevel(bad).length >= 3);
  assert.throws(() => compileLevel(bad), LevelValidationError);
});

test('level size, lemming, entrance, skill and hazard limits are enforced', () => {
  const problems = (overrides: Parameters<typeof levelDef>[0]): number => validateLevel(levelDef(overrides)).length;
  assert.equal(problems({}), 0);
  assert.ok(problems({ height: 200 }) > 0);
  assert.ok(problems({ width: 404 }) > 0); // not a multiple of 8
  assert.ok(problems({ width: 1608 }) > 0);
  assert.ok(problems({ lemmings: 81, saveRequired: 1 }) > 0);
  assert.ok(problems({ skills: { digger: 100 } }) > 0);
  assert.ok(problems({ entrances: [1, 2, 3, 4, 5].map((i) => ({ x: i * 20, y: 10 })) }) > 0);
  assert.ok(problems({ hazards: [{ kind: 'water', x: 390, y: 150, w: 20, h: 10 }] }) > 0);
});

test('levelGeometryProblems flags floating exits and blocked entrances (kept out of validateLevel)', () => {
  const floatingExit = levelDef({ exits: [{ x: 360, y: 10 }] }); // open air, not floor
  assert.deepEqual(validateLevel(floatingExit), []); // geometry is NOT a validateLevel rule
  assert.equal(levelGeometryProblems(floatingExit).length, 1);

  const blockedEntrance = levelDef({ entrances: [{ x: 10, y: FLOOR_Y + 5 }] }); // inside the floor
  assert.deepEqual(validateLevel(blockedEntrance), []);
  assert.equal(levelGeometryProblems(blockedEntrance).length, 1);

  assert.deepEqual(levelGeometryProblems(levelDef()), []);
});

test('rect/steel/erase primitives paint the expected materials', () => {
  const level = compileLevel(
    levelDef({
      terrain: [
        { kind: 'rect', x: 0, y: FLOOR_Y, w: 400, h: 10 },
        { kind: 'rect', x: 50, y: FLOOR_Y, w: 10, h: 10, material: 'steel' },
        { kind: 'rect', x: 100, y: FLOOR_Y, w: 5, h: 10, op: 'erase' },
      ],
      exits: [{ x: 360, y: FLOOR_Y }],
    }),
  );
  const t = level.terrain;
  assert.equal(t.get(10, FLOOR_Y + 5), Material.Earth);
  assert.equal(t.get(55, FLOOR_Y + 5), Material.Steel);
  assert.equal(t.get(102, FLOOR_Y + 5), Material.Empty);
  assert.equal(t.get(10, 50), Material.Empty);
});

test('natural fill gives the top row of a shape the surface or surfaceHi colour', () => {
  const theme = THEMES.mossgrove;
  const t = compileLevel(levelDef()).terrain;
  const top = t.color[FLOOR_Y * t.width + 10];
  assert.ok(top === theme.surface || top === theme.surfaceHi, `top row colour ${top} is neither surface nor surfaceHi`);
  assert.notEqual(t.color[(FLOOR_Y + 5) * t.width + 10], theme.surface);
});

test('skills default to 0 and time converts to ticks', () => {
  const level = compileLevel(levelDef({ skills: { digger: 2 }, timeLimitSeconds: 10 }));
  assert.equal(level.skills.digger, 2);
  assert.equal(level.skills.climber, 0);
  assert.equal(level.timeLimitTicks, 170);
});

// ─── Metal / fill validation rules ─────────────────────────────────────────────────────────

test('fill/material rules: metal only on steel, steel only with metal (or no) fill', () => {
  const metalOnEarth = levelDef({ terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, fill: 'metal' }] });
  assert.ok(validateLevel(metalOnEarth).some((p) => p.includes('metal')));

  const steelWithNatural = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel', fill: 'natural' }],
  });
  assert.ok(validateLevel(steelWithNatural).length > 0);

  const steelNoFill = levelDef({ terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 10, h: 10, material: 'steel' }] });
  assert.deepEqual(validateLevel(steelNoFill), []);

  const unknownStamp = levelDef({
    terrain: [{ kind: 'stamp', stamp: 'not-a-real-stamp', x: 0, y: FLOOR_Y } as unknown as TerrainPrimitive],
  });
  assert.ok(validateLevel(unknownStamp).some((p) => p.includes('stamp')));
});

test('polygon with fewer than 3 points and a non-integer/zero stamp scale are rejected', () => {
  const tinyPolygon = levelDef({ terrain: [{ kind: 'polygon', points: [[0, FLOOR_Y], [10, FLOOR_Y]] }] });
  assert.ok(validateLevel(tinyPolygon).some((p) => p.includes('polygon')));

  const badScale = levelDef({ terrain: [{ kind: 'stamp', stamp: 'boulder', x: 0, y: FLOOR_Y, scale: 1.5 }] });
  assert.ok(validateLevel(badScale).some((p) => p.includes('scale')));

  const zeroScale = levelDef({ terrain: [{ kind: 'stamp', stamp: 'boulder', x: 0, y: FLOOR_Y, scale: 0 }] });
  assert.ok(validateLevel(zeroScale).some((p) => p.includes('scale')));
});

test('decor primitives are validated but never painted into the terrain', () => {
  const def = levelDef({
    decor: [{ kind: 'rect', x: 0, y: 0, w: 10, h: 10, fill: 'metal' }], // invalid: metal on earth
  });
  assert.ok(validateLevel(def).some((p) => p.startsWith('decor[')));

  const okDecor = levelDef({
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 400, h: 10 }],
    decor: [{ kind: 'rect', x: 0, y: 0, w: 400, h: 20 }], // valid shape, would collide if painted
  });
  assert.deepEqual(validateLevel(okDecor), []);
  const t = compileLevel(okDecor).terrain;
  assert.equal(t.get(10, 10), Material.Empty, 'decor must not be painted into the terrain');
});

// ─── One-way chevrons ───────────────────────────────────────────────────────────────────────

test('one-way chevrons are baked at the exact A/E tile positions, with the 4px odd-row stagger, and mirror for one-way-left', () => {
  const theme = THEMES.mossgrove;
  const seed = 42;
  const w = 32;
  const h = 32;
  const right = buildTerrain(w, h, [{ kind: 'rect', x: 0, y: 0, w, h, material: 'one-way-right' }], theme, seed);
  const left = buildTerrain(w, h, [{ kind: 'rect', x: 0, y: 0, w, h, material: 'one-way-left' }], theme, seed);
  const CHEV = [
    '........',
    'AAE.....',
    '.AAE....',
    '..AAE...',
    '.AAE....',
    'AAE.....',
    '........',
    '........',
  ];
  for (let y = 0; y < h; y++) {
    const r = Math.floor(y / 8);
    const ox = (r % 2) * 4;
    const cy = y % 8;
    for (let x = 0; x < w; x++) {
      const cxRight = ((x + ox) % 8 + 8) % 8;
      const kRight = CHEV[cy]![cxRight];
      const expectedRight = kRight === 'A' ? theme.oneWay : kRight === 'E' ? theme.oneWayEdge : null;
      if (expectedRight !== null) {
        assert.equal(right.color[y * w + x], expectedRight, `right (${x},${y})`);
      }
      const cxLeft = 7 - cxRight;
      const kLeft = CHEV[cy]![cxLeft];
      const expectedLeft = kLeft === 'A' ? theme.oneWay : kLeft === 'E' ? theme.oneWayEdge : null;
      if (expectedLeft !== null) {
        assert.equal(left.color[y * w + x], expectedLeft, `left (${x},${y})`);
      }
    }
  }
  // The two are genuinely mirrored, not identical.
  assert.notDeepEqual(Array.from(right.color), Array.from(left.color));
});

// ─── Metal plate ────────────────────────────────────────────────────────────────────────────

test('an 8-aligned steel rect in open air shows the PLATE pattern with bevel/seam edges', () => {
  const theme = THEMES.mossgrove;
  const t = buildTerrain(64, 64, [{ kind: 'rect', x: 16, y: 16, w: 32, h: 32, material: 'steel' }], theme, 7);
  const PLATE = ['LLLLLLLD', 'LrMMMMrD', 'LdMMMMdD', 'LMMMMMMD', 'LMMMMMMD', 'LrMMMMrD', 'LdMMMMdD', 'DDDDDDDD'];
  let sawInteriorPlate = false;
  let sawSeam = false;
  let sawBevel = false;
  for (let y = 16; y < 48; y++) {
    for (let x = 16; x < 48; x++) {
      const c = t.color[y * 64 + x];
      const k = PLATE[(y - 16) % 8]![(x - 16) % 8];
      // Base world-aligned plate pattern, then region-edge overrides in the SAME precedence as
      // the recipe (top → bevel, then bottom-or-right → seam, then left → bevel — so a
      // bottom-left corner ends up bevel: left is applied last and wins).
      let expected = k === 'L' || k === 'r' ? theme.steel[2] : k === 'M' ? theme.steel[1] : theme.steel[0];
      if (y === 16) expected = theme.steel[2]; // top edge: bevel
      if (y === 47 || x === 47) expected = theme.steel[0]; // bottom/right edge: seam
      if (x === 16) expected = theme.steel[2]; // left edge: bevel (applied last, wins at corners)
      assert.equal(c, expected, `(${x},${y}) plate mismatch`);
      if (x > 16 && x < 47 && y > 16 && y < 47) sawInteriorPlate = true;
      if (expected === theme.steel[0]) sawSeam = true;
      if (expected === theme.steel[2]) sawBevel = true;
    }
  }
  assert.ok(sawInteriorPlate && sawSeam && sawBevel, 'expected both the interior plate pattern and edge overrides to appear');
});

// ─── Stamps ─────────────────────────────────────────────────────────────────────────────────

test('all 7 stamps exist, use only "#"/"." and have equal-length rows', () => {
  const ids = ['boulder', 'mushroom', 'fern', 'cog', 'gumdrop', 'crystal', 'coral'] as const;
  assert.equal(Object.keys(STAMPS).length, 7);
  for (const id of ids) {
    const rows = STAMPS[id];
    assert.ok(rows, id);
    const width = rows[0]?.length;
    for (const row of rows) {
      assert.equal(row.length, width, `${id}: uneven row length`);
      assert.ok(/^[#.]+$/.test(row), `${id}: unexpected characters`);
    }
  }
});

test('the 5 new stamps have their specified sizes', () => {
  const sizes: Record<string, [w: number, h: number]> = {
    fern: [9, 8],
    cog: [10, 10],
    gumdrop: [8, 6],
    crystal: [7, 10],
    coral: [10, 8],
  };
  for (const [id, [w, h]] of Object.entries(sizes)) {
    const rows = STAMPS[id as keyof typeof STAMPS];
    assert.equal(rows.length, h, `${id}: height`);
    assert.equal(rows[0]?.length, w, `${id}: width`);
  }
});

test('stamp flipX mirrors columns and scale:2 doubles coverage', () => {
  const theme = THEMES.mossgrove;
  const plain = buildTerrain(20, 10, [{ kind: 'stamp', stamp: 'mushroom', x: 0, y: 0 }], theme, 1);
  const flipped = buildTerrain(20, 10, [{ kind: 'stamp', stamp: 'mushroom', x: 0, y: 0, flipX: true }], theme, 1);
  const rows = STAMPS.mushroom;
  const cols = Math.max(...rows.map((r) => r.length));
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < cols; x++) {
      const solidHere = rows[y]?.[x] === '#';
      assert.equal(plain.isSolid(x, y), solidHere, `plain (${x},${y})`);
      assert.equal(flipped.isSolid(x, y), rows[y]?.[cols - 1 - x] === '#', `flipped (${x},${y})`);
    }
  }

  const scaled = buildTerrain(40, 20, [{ kind: 'stamp', stamp: 'boulder', x: 0, y: 0, scale: 2 }], theme, 1);
  const boulder = STAMPS.boulder;
  let plainCount = 0;
  for (const row of boulder) for (const ch of row) if (ch === '#') plainCount++;
  let scaledCount = 0;
  for (let y = 0; y < 20; y++) for (let x = 0; x < 40; x++) if (scaled.isSolid(x, y)) scaledCount++;
  assert.equal(scaledCount, plainCount * 4); // 2x2 px per source pixel
});

// ─── Even-odd polygon fill ──────────────────────────────────────────────────────────────────

test('a self-overlapping polygon (pentagram) leaves its centre empty under the even-odd rule', () => {
  const theme = THEMES.mossgrove;
  // The classic pentagram: 5 vertices of a regular pentagon, connected every-other (0→2→4→1→3→0)
  // so the path self-intersects. Under even-odd fill, the central pentagon gets crossed twice
  // (empty) while the 5 points get crossed once (solid).
  const cx = 30;
  const cy = 30;
  const r = 28;
  const pentagon: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pentagon.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  const points = [0, 2, 4, 1, 3].map((i) => pentagon[i]!);
  const t = buildTerrain(60, 60, [{ kind: 'polygon', points }], theme, 1);
  assert.ok(!t.isSolid(cx, cy), 'pentagram centre should be empty (even-odd rule)');
  // Sanity: the shape did paint something (it's not just an empty no-op).
  let any = false;
  for (let y = 0; y < 60 && !any; y++) for (let x = 0; x < 60; x++) if (t.isSolid(x, y)) { any = true; break; }
  assert.ok(any, 'polygon should paint at least one pixel');
});
