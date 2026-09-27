/**
 * Spec-derived tests for `render/high-contrast.ts` (DESIGN §4.4, §4.9; RENDER-PLAN §4).
 *
 * Expected values below are re-derived from the spec text/formulas independently of the
 * implementation (a local re-transcription of the DESIGN §4.4 chevron tile, the DESIGN §4.9
 * pattern formulas, and the WCAG 2.2 relative-luminance/contrast formulas), not by calling the
 * functions under test with different inputs and trusting their own logic.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  HC,
  HC_EXIT_H,
  HC_EXIT_W,
  CHEVRON_TILE,
  hcExitPixel,
  hcTerrainColor,
  hcPoolLine,
  hcTrapStripe,
  packRgba,
} from '../src/render/high-contrast.ts';
import { Material } from '../src/core/terrain.ts';

/** True mathematical modulo (always in [0, n)), used to build expectations from the spec text. */
function mod(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** DESIGN §4.4's 8x8 one-way chevron tile, independently transcribed from the spec's ASCII art
 * (not imported from the source's CHEVRON_TILE, so a corrupted export would still be caught). */
const SPEC_CHEVRON_TILE = [
  '........',
  'AAE.....',
  '.AAE....',
  '..AAE...',
  '.AAE....',
  'AAE.....',
  '........',
  '........',
];

/** Expected HC colour of a one-way pixel per DESIGN §4.4 + RENDER-PLAN §4: the tile row is
 * staggered by 4px on odd 8px rows, and one-way-left is the mirror of one-way-right. */
function expectedChevronColor(material: number, x: number, y: number): string {
  const row = Math.floor(y / 8);
  const offset = mod(row, 2) * 4;
  let cx = mod(x + offset, 8);
  if (material === Material.OneWayLeft) cx = 7 - cx;
  const cy = mod(y, 8);
  const ch = SPEC_CHEVRON_TILE[cy]?.[cx];
  return ch === 'A' ? HC.chevron : HC.oneWay;
}

test('HC palette matches the DESIGN §4.9 table exactly', () => {
  assert.equal(HC.background, '#000000');
  assert.equal(HC.earth, '#a0a0a0');
  assert.equal(HC.edge, '#ffffff');
  assert.equal(HC.steel, '#5f8fff');
  assert.equal(HC.steelHatch, '#0a1a4a');
  assert.equal(HC.oneWay, '#c77dff');
  assert.equal(HC.water, '#00c8ff');
  assert.equal(HC.fire, '#ff7a00');
  assert.equal(HC.trap, '#ffd400');
  assert.equal(HC.trapStripe, '#000000');
  assert.equal(HC.exit, '#3cff6a');
  assert.equal(HC.chevron, '#000000');
  assert.equal(HC.line, '#000000');
});

test('CHEVRON_TILE matches the DESIGN §4.4 tile exactly', () => {
  assert.deepEqual(Array.from(CHEVRON_TILE), SPEC_CHEVRON_TILE);
});

test('hcTerrainColor: edge wins and paints white for any material', () => {
  for (const material of [Material.Earth, Material.Steel, Material.OneWayLeft, Material.OneWayRight]) {
    assert.equal(hcTerrainColor(material, 5, 5, true), '#ffffff');
    assert.equal(hcTerrainColor(material, -3, 100, true), '#ffffff');
    assert.equal(hcTerrainColor(material, 0, 0, true), '#ffffff');
  }
});

test('hcTerrainColor: earth is flat #a0a0a0 when not on an edge', () => {
  const cases: readonly (readonly [number, number])[] = [
    [0, 0],
    [1, 2],
    [50, 50],
    [-4, 7],
    [4, -7],
  ];
  for (const [x, y] of cases) {
    assert.equal(hcTerrainColor(Material.Earth, x, y, false), '#a0a0a0', `x=${x},y=${y}`);
  }
});

test('hcTerrainColor: steel cross-hatch exactly where (x+y) mod 4 = 0 or (x-y) mod 4 = 0', () => {
  // Includes negative coordinates (and x - y < 0) per the task's explicit call-out.
  for (let y = -8; y <= 8; y++) {
    for (let x = -8; x <= 8; x++) {
      const hatched = (x + y) % 4 === 0 || (x - y) % 4 === 0;
      const expected = hatched ? HC.steelHatch : HC.steel;
      assert.equal(hcTerrainColor(Material.Steel, x, y, false), expected, `x=${x},y=${y}`);
    }
  }
});

test('hcTerrainColor: one-way chevrons (right and left), staggered and mirrored, per pixel', () => {
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      assert.equal(
        hcTerrainColor(Material.OneWayRight, x, y, false),
        expectedChevronColor(Material.OneWayRight, x, y),
        `right x=${x},y=${y}`,
      );
      assert.equal(
        hcTerrainColor(Material.OneWayLeft, x, y, false),
        expectedChevronColor(Material.OneWayLeft, x, y),
        `left x=${x},y=${y}`,
      );
    }
  }
});

test('hcTerrainColor: one-way chevron colours are only black or HC.oneWay', () => {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 8; x++) {
      for (const material of [Material.OneWayRight, Material.OneWayLeft]) {
        const c = hcTerrainColor(material, x, y, false);
        assert.ok(c === HC.chevron || c === HC.oneWay, `x=${x},y=${y},material=${material} -> ${c}`);
      }
    }
  }
});

test('hcTerrainColor: the chevron tile is staggered by 4px between consecutive 8px rows', () => {
  // DESIGN §4.4: "tile rows alternate with a 4 px x offset (staggered)". Row 0 (y 0..7) has
  // offset 0; row 1 (y 8..15) has offset 4, so shifting x back by 4 (mod 8) and moving down one
  // row must reproduce the same pattern, for both one-way directions.
  for (const material of [Material.OneWayRight, Material.OneWayLeft]) {
    for (let x = 0; x < 8; x++) {
      for (let localY = 0; localY < 8; localY++) {
        const row0 = hcTerrainColor(material, x, localY, false);
        const row1 = hcTerrainColor(material, mod(x - 4, 8), localY + 8, false);
        assert.equal(row1, row0, `material=${material},x=${x},y=${localY}`);
      }
    }
  }
});

test('hcPoolLine: water wave matches (y - round(sin(x/2))) mod 4 = 0, including negative coords', () => {
  for (let x = -20; x <= 20; x++) {
    for (let y = -10; y <= 10; y++) {
      const expected = mod(y - Math.round(Math.sin(x / 2)), 4) === 0;
      assert.equal(hcPoolLine('water', x, y), expected, `x=${x},y=${y}`);
    }
  }
});

test('hcPoolLine: fire zigzag matches (y + |x mod 6 - 3|) mod 4 = 0, including negative coords', () => {
  for (let x = -20; x <= 20; x++) {
    for (let y = -10; y <= 10; y++) {
      const expected = mod(y + Math.abs(mod(x, 6) - 3), 4) === 0;
      assert.equal(hcPoolLine('fire', x, y), expected, `x=${x},y=${y}`);
    }
  }
});

test('hcTrapStripe: (i+j) mod 6 < 3, including negative local coords', () => {
  for (let i = -10; i <= 20; i++) {
    for (let j = -10; j <= 20; j++) {
      const expected = mod(i + j, 6) < 3;
      assert.equal(hcTrapStripe(i, j), expected, `i=${i},j=${j}`);
    }
  }
});

test("packRgba('#a0b0c0') -> little-endian 0xffc0b0a0 (unsigned compare)", () => {
  assert.equal(packRgba('#a0b0c0') >>> 0, 0xffc0b0a0);
});

test('packRgba: alpha is always 255 and channel bytes are little-endian R,G,B,A', () => {
  assert.equal(packRgba('#000000') >>> 0, 0xff000000);
  assert.equal(packRgba('#ffffff') >>> 0, 0xffffffff);
  assert.equal(packRgba('#ff0000') >>> 0, 0xff0000ff);
  assert.equal(packRgba('#00ff00') >>> 0, 0xff00ff00);
  assert.equal(packRgba('#0000ff') >>> 0, 0xffff0000);
});

// --- DESIGN §4.9 contrast table: recompute WCAG 2.2 contrast from the HC constants themselves ---

function srgbToLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

test('DESIGN §4.9: every HC fill is >= 3:1 against black and matches the table ratio (+-0.05)', () => {
  const expected: [string, number][] = [
    [HC.earth, 8.03],
    [HC.edge, 21.0],
    [HC.steel, 6.86],
    [HC.oneWay, 7.81],
    [HC.water, 10.71],
    [HC.fire, 8.04],
    [HC.trap, 14.67],
    [HC.exit, 15.7],
  ];
  for (const [hex, ratio] of expected) {
    const actual = contrastRatio(hex, HC.background);
    assert.ok(actual >= 3, `${hex} ratio ${actual} < 3:1`);
    assert.ok(Math.abs(actual - ratio) <= 0.05, `${hex} expected ~${ratio}, got ${actual}`);
  }
});

test('DESIGN §4.9: steel hatch vs steel fill is >= 3:1 and ~5.45', () => {
  const ratio = contrastRatio(HC.steelHatch, HC.steel);
  assert.ok(ratio >= 3, `hatch/steel ratio ${ratio} < 3:1`);
  assert.ok(Math.abs(ratio - 5.45) <= 0.05, `expected ~5.45, got ${ratio}`);
});

// --- VIS-4: the HC exit's doorway shape (DESIGN §4.9 "1 px outline of the doorway + a 3×5 door
// glyph") is a pure function of local position only — never the theme's own art or its '4'
// glow-mote colour (e.g. foundry #7dff9a), which `render/scene.ts` never even looks up for the
// HC exit canvas (it fills flat `HC.exit` wherever `hcExitPixel` is true, nothing else). ---

test('hcExitPixel: out of the 16x14 doorway box is always false', () => {
  assert.equal(hcExitPixel(-1, 5), false);
  assert.equal(hcExitPixel(5, -1), false);
  assert.equal(hcExitPixel(HC_EXIT_W, 5), false);
  assert.equal(hcExitPixel(5, HC_EXIT_H), false);
  assert.equal(hcExitPixel(-1, -1), false);
  assert.equal(hcExitPixel(100, 100), false);
});

test('hcExitPixel: the 1 px outline is exactly the box border', () => {
  for (let x = 0; x < HC_EXIT_W; x++) {
    assert.equal(hcExitPixel(x, 0), true, `top x=${x}`);
    assert.equal(hcExitPixel(x, HC_EXIT_H - 1), true, `bottom x=${x}`);
  }
  for (let y = 0; y < HC_EXIT_H; y++) {
    assert.equal(hcExitPixel(0, y), true, `left y=${y}`);
    assert.equal(hcExitPixel(HC_EXIT_W - 1, y), true, `right y=${y}`);
  }
});

test('hcExitPixel: the door glyph is exactly a 3x5 box centred at x=7..9, y=4..8', () => {
  for (let y = 0; y < HC_EXIT_H; y++) {
    for (let x = 0; x < HC_EXIT_W; x++) {
      const onBorder = x === 0 || x === HC_EXIT_W - 1 || y === 0 || y === HC_EXIT_H - 1;
      if (onBorder) continue; // covered by the outline test above.
      const inGlyph = x >= 7 && x <= 9 && y >= 4 && y <= 8;
      assert.equal(hcExitPixel(x, y), inGlyph, `x=${x},y=${y}`);
    }
  }
});

test('hcExitPixel: exactly 71 pixels are lit (56 outline + 15 glyph), matching the rendered frame', () => {
  let count = 0;
  for (let y = 0; y < HC_EXIT_H; y++) {
    for (let x = 0; x < HC_EXIT_W; x++) {
      if (hcExitPixel(x, y)) count++;
    }
  }
  const perimeter = 2 * HC_EXIT_W + 2 * HC_EXIT_H - 4; // 56: box border, corners counted once.
  const glyph = 3 * 5; // 15.
  assert.equal(perimeter, 56);
  assert.equal(count, perimeter + glyph);
});
