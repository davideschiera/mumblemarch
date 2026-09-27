/**
 * Spec-derived tests for `render/sprite-geometry.ts` against DESIGN.md §3.4 ("Sprite spec" /
 * "Overlay placement") and RENDER-PLAN.md §2 (C1 — exact exported names/signatures + resolved
 * offsets). Independent validation (render-v1a): expected numbers are worked out here from the
 * spec text and the ground-truth art data (`art/mumble.ts`, `art/overlays.ts`), not by re-reading
 * `sprite-geometry.ts`'s own formulas.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LEMMING_STATES } from '../src/core/types.ts';
import { MUMBLE_ANIMS } from '../src/art/mumble.ts';
import { OVERLAYS } from '../src/art/overlays.ts';
import {
  bomberDigit,
  crosshairLayout,
  DIGIT_DX,
  DIGIT_DY,
  DIGIT_PIPS_SHIFT,
  FUSE_DX,
  FUSE_DY,
  mumbleFrameIndex,
  pipKey,
  PIPS_DX,
  PIPS_DY,
  showsPips,
  spriteOriginX,
  spriteOriginY,
} from '../src/render/sprite-geometry.ts';

// ─── Frame-index rule (DESIGN §3.4): i = floor(ticks/tpf); loop wraps the tail from loopFrom;
// one-shot clamps to the last frame. Reimplemented here independently of sprite-geometry.ts. ────
function expectedFrameIndex(n: number, tpf: number, loop: boolean, loopFrom: number, ticks: number): number {
  const i = Math.floor(ticks / tpf);
  if (!loop) return Math.min(i, n - 1);
  if (i < n) return i;
  const tail = n - loopFrom;
  return loopFrom + ((i - loopFrom) % tail);
}

test('mumbleFrameIndex matches the DESIGN §3.4 rule for all 18 states, several ticks each', () => {
  for (const state of LEMMING_STATES) {
    const anim = MUMBLE_ANIMS[state];
    const n = anim.frames.length;
    const tpf = anim.ticksPerFrame;
    const loop = anim.loop;
    const loopFrom = anim.loopFrom ?? 0;
    const sampleTicks = [
      0,
      Math.max(0, tpf - 1),
      tpf,
      tpf * (n - 1),
      tpf * n - 1,
      tpf * n,
      tpf * n + tpf * 3 + 1,
      tpf * (n + 5),
    ];
    for (const ticks of sampleTicks) {
      const expected = expectedFrameIndex(n, tpf, loop, loopFrom, ticks);
      assert.equal(
        mumbleFrameIndex(state, ticks),
        expected,
        `${state} @ ticks=${ticks} (n=${n} tpf=${tpf} loop=${loop} loopFrom=${loopFrom})`,
      );
      // Frame index is always a valid array index.
      assert.ok(expected >= 0 && expected < n, `${state} expected index in range`);
    }
  }
});

test('floating (loopFrom: 4) wraps exactly as worked in RENDER-PLAN §2: 12→4, 19→11, 20→4', () => {
  assert.equal(mumbleFrameIndex('floating', 12), 4);
  assert.equal(mumbleFrameIndex('floating', 19), 11);
  assert.equal(mumbleFrameIndex('floating', 20), 4);
  // And the un-wrapped opening frames play straight through first (ticksPerFrame 1).
  assert.equal(mumbleFrameIndex('floating', 0), 0);
  assert.equal(mumbleFrameIndex('floating', 11), 11);
});

test('one-shot states clamp to the last frame well past their length (ohno, splatting, exiting)', () => {
  const ohno = MUMBLE_ANIMS.ohno; // 4 frames × 4 tpf, one-shot
  assert.equal(ohno.loop, false);
  assert.equal(mumbleFrameIndex('ohno', ohno.ticksPerFrame * (ohno.frames.length - 1)), ohno.frames.length - 1);
  assert.equal(mumbleFrameIndex('ohno', 1_000_000), ohno.frames.length - 1);

  const splatting = MUMBLE_ANIMS.splatting;
  assert.equal(mumbleFrameIndex('splatting', 1_000_000), splatting.frames.length - 1);

  const exiting = MUMBLE_ANIMS.exiting;
  assert.equal(mumbleFrameIndex('exiting', 1_000_000), exiting.frames.length - 1);
});

// ─── Draw origins (DESIGN §3.4): right x−footX; mirrored x−(w−1−footX); y−footY. ───────────────
// Widths below are read directly off the ground-truth frame-0 rows (art/mumble.ts), matching the
// DESIGN §3.4 size column (walking 8×10, bashing 12×10, climbing 8×12).
function rowWidth(rows: readonly string[]): number {
  let w = 0;
  for (const r of rows) if (r.length > w) w = r.length;
  return w;
}

test('spriteOriginX: right-facing = x − footX', () => {
  assert.equal(spriteOriginX('walking', 0, 100, 1), 100 - 4);
  assert.equal(spriteOriginX('bashing', 0, 100, 1), 100 - 4);
  assert.equal(spriteOriginX('climbing', 0, 50, 1), 50 - 7);
});

test('spriteOriginX: mirrored (facing left) = x − (w − 1 − footX)', () => {
  const walkingW = rowWidth(MUMBLE_ANIMS.walking.frames[0]!);
  const bashingW = rowWidth(MUMBLE_ANIMS.bashing.frames[0]!);
  const climbingW = rowWidth(MUMBLE_ANIMS.climbing.frames[0]!);
  assert.equal(walkingW, 8); // DESIGN §3.4: walking 8×10
  assert.equal(bashingW, 12); // DESIGN §3.4: bashing 12×10
  assert.equal(climbingW, 8); // DESIGN §3.4: climbing 8×12

  // walking, footX 4, w 8: x=100 → 100 − (8 − 1 − 4) = 97 (worked example from the task).
  assert.equal(spriteOriginX('walking', 0, 100, -1), 97);
  // bashing, footX 4, w 12: x=100 → 100 − (12 − 1 − 4) = 93.
  assert.equal(spriteOriginX('bashing', 0, 100, -1), 93);
  // climbing, footX 7, w 8: x=50 → 50 − (8 − 1 − 7) = 50.
  assert.equal(spriteOriginX('climbing', 0, 50, -1), 50);
});

test('spriteOriginY: y − footY for several states', () => {
  assert.equal(spriteOriginY('walking', 100), 100 - 10); // footY 10
  assert.equal(spriteOriginY('climbing', 100), 100 - 12); // footY 12
  assert.equal(spriteOriginY('floating', 100), 100 - 16); // footY 16
  assert.equal(spriteOriginY('blocking', 100), 100 - 14); // footY 14
});

// ─── Bomber digit: ceil(fuseTicks / 16), 0 when fuseTicks <= 0 (DESIGN §3.4 overlay table). ────
test('bomberDigit: ceil(fuseTicks/16), 0 at/under 0', () => {
  assert.equal(bomberDigit(79), 5);
  assert.equal(bomberDigit(64), 4);
  assert.equal(bomberDigit(65), 5);
  assert.equal(bomberDigit(16), 1);
  assert.equal(bomberDigit(1), 1);
  assert.equal(bomberDigit(0), 0);
  assert.equal(bomberDigit(-5), 0);
});

// ─── showsPips: only building/shrugging (DESIGN §3.4: "Shown while building or shrugging"). ────
test('showsPips is true only for building and shrugging, false for the other 16 states', () => {
  for (const state of LEMMING_STATES) {
    const expected = state === 'building' || state === 'shrugging';
    assert.equal(showsPips(state), expected, state);
  }
});

// ─── pipKey (DESIGN §3.4: "Pips c = left, K = used... ≤3 left → amber F"). ─────────────────────
test('pipKey: 12 left → all 12 full (c)', () => {
  for (let k = 0; k < 12; k++) assert.equal(pipKey(k, 12), 'c');
});

test('pipKey: 4 left → 4 full (c) + 8 used (K)', () => {
  for (let k = 0; k < 4; k++) assert.equal(pipKey(k, 4), 'c');
  for (let k = 4; k < 12; k++) assert.equal(pipKey(k, 4), 'K');
});

test('pipKey: 3 left (≤ warnAt) → 3 amber (F) + 9 used (K)', () => {
  for (let k = 0; k < 3; k++) assert.equal(pipKey(k, 3), 'F');
  for (let k = 3; k < 12; k++) assert.equal(pipKey(k, 3), 'K');
});

test('pipKey: 0 left → all 12 used (K)', () => {
  for (let k = 0; k < 12; k++) assert.equal(pipKey(k, 0), 'K');
});

test('OVERLAYS.pips ground-truth chars match the DESIGN §3.4 table (full c, warn F, empty K, warnAt 3)', () => {
  assert.equal(OVERLAYS.pips.full, 'c');
  assert.equal(OVERLAYS.pips.warn, 'F');
  assert.equal(OVERLAYS.pips.empty, 'K');
  assert.equal(OVERLAYS.pips.warnAt, 3);
});

// ─── Overlay offset constants (DESIGN §3.4 "Overlay placement" table). ─────────────────────────
test('overlay offset constants match the DESIGN §3.4 table exactly', () => {
  assert.equal(DIGIT_DX, -2);
  assert.equal(DIGIT_DY, -9);
  assert.equal(FUSE_DX, -1);
  assert.equal(FUSE_DY, -2);
  assert.equal(PIPS_DX, -6);
  assert.equal(PIPS_DY, -7);
  // "the digit moves up 7 px" when pips are also shown → −9 − 7 = −16 total, above the plate.
  assert.equal(DIGIT_PIPS_SHIFT, 7);
  assert.equal(DIGIT_DY - DIGIT_PIPS_SHIFT, -16);
});

// ─── crosshairLayout (RENDER-PLAN §2): scale = floor(size/9); image = size; hotspot = the pixel
// centre of the art's own anchor (4,4) once scaled and centred in the size×size image. ──────────
function expectedCrosshairLayout(size: 32 | 48 | 64): { scale: number; image: number; hotX: number; hotY: number } {
  const art = OVERLAYS.crosshair;
  const artSize = rowWidth(art.rows); // 9×9 source art
  const halo = 1; // a 1 px dark halo on every side (RENDER-PLAN §2)
  const sourceSize = artSize + halo * 2; // 11×11
  const anchor = art.anchorX + halo; // anchor (4,4) shifts by the halo → (5,5) in the source
  const scale = Math.floor(size / artSize);
  const offset = Math.floor((size - sourceSize * scale) / 2); // centre the scaled source in the image
  const hot = offset + anchor * scale + Math.floor(scale / 2); // pixel centre of the anchor cell
  return { scale, image: size, hotX: hot, hotY: hot };
}

test('crosshairLayout: 9×9 art → integer scale, image = size, hotspot centred and inside the image', () => {
  assert.equal(rowWidth(OVERLAYS.crosshair.rows), 9);
  assert.equal(OVERLAYS.crosshair.anchorX, 4);
  assert.equal(OVERLAYS.crosshair.anchorY, 4);

  for (const size of [32, 48, 64] as const) {
    const got = crosshairLayout(size);
    const expected = expectedCrosshairLayout(size);
    assert.deepEqual(got, expected, `size ${size}`);
    assert.ok(Number.isInteger(got.scale) && got.scale > 0, `scale must be a positive integer at ${size}`);
    assert.equal(got.image, size);
    assert.equal(got.hotX, got.hotY, 'square art → symmetric hotspot');
    assert.ok(got.hotX >= 0 && got.hotX < size, `hotspot must sit inside the ${size}×${size} image`);
  }

  // Larger cursor sizes scale up (9 fits more times into a bigger square).
  assert.ok(crosshairLayout(32).scale < crosshairLayout(48).scale);
  assert.ok(crosshairLayout(48).scale < crosshairLayout(64).scale);
});
