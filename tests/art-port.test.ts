/**
 * Proves scripts/port-art.mjs's output (src/art/*, src/levels/theme-data.ts) is a faithful,
 * lossless port of docs/design/mockups/sprites.js, and that animFrameIndex follows the
 * DESIGN §3.4 frame-index rule.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { animFrameIndex } from '../src/art/anim.ts';
import { ICON_LABELS, ICON_ORDER, ICONS } from '../src/art/icons.ts';
import { MUMBLE_ANIMS } from '../src/art/mumble.ts';
import { THEME_OBJECTS } from '../src/art/objects.ts';
import { OVERLAYS } from '../src/art/overlays.ts';
import { MUMBLE_PALETTE } from '../src/art/palette.ts';
import { THEMES } from '../src/levels/theme-data.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'docs/design/mockups/sprites.js');
const source = readFileSync(sourcePath, 'utf8');
const sandbox: { window: Record<string, unknown> } = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });
const ART = sandbox.window['MUMBLE_ART'] as Record<string, unknown>;

/**
 * Values parsed inside the vm sandbox live in a different realm (their own Object prototype),
 * so a strict deep-equal would fail on prototype identity alone even when every enumerable
 * property matches. The art data is plain JSON-shaped data, so a JSON round-trip normalises
 * both sides to ordinary same-realm objects before comparing their actual content.
 */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test('sprites.js loads and sets window.MUMBLE_ART', () => {
  assert.ok(ART && typeof ART === 'object');
});

test('generated art data deep-equals docs/design/mockups/sprites.js', () => {
  assert.deepEqual(plain(MUMBLE_PALETTE), plain(ART['palette']));
  assert.deepEqual(plain(MUMBLE_ANIMS), plain(ART['sprites']));
  assert.deepEqual(plain(THEME_OBJECTS), plain(ART['objects']));
  const icons = ART['icons'] as Record<string, unknown>;
  const { meta, ...iconFrames } = icons;
  assert.deepEqual(plain(ICONS), plain(iconFrames));
  assert.deepEqual(plain(ICON_ORDER), plain((meta as { order: unknown }).order));
  assert.deepEqual(plain(ICON_LABELS), plain((meta as { labels: unknown }).labels));
  assert.deepEqual(plain(OVERLAYS), plain(ART['overlays']));
  assert.deepEqual(plain(THEMES), plain(ART['themes']));
});

test('animFrameIndex follows the DESIGN §3.4 rule (floating loops from frame 4)', () => {
  const floating = MUMBLE_ANIMS.floating;
  assert.equal(floating.loop, true);
  assert.equal(floating.loopFrom, 4);
  assert.equal(floating.ticksPerFrame, 1);
  const n = floating.frames.length;
  // Before the clip has played once: i = floor(ticks / ticksPerFrame) = ticks (ticksPerFrame 1).
  for (let ticks = 0; ticks < n; ticks++) assert.equal(animFrameIndex(floating, ticks), ticks);
  // Once past the end, it wraps within [loopFrom, n).
  const loopFrom = floating.loopFrom ?? 0;
  const tail = n - loopFrom;
  assert.equal(animFrameIndex(floating, n), loopFrom);
  assert.equal(animFrameIndex(floating, n + tail - 1), n - 1);
  assert.equal(animFrameIndex(floating, n + tail), loopFrom);
  assert.equal(animFrameIndex(floating, n + 2 * tail + 1), loopFrom + 1);

  // A one-shot animation clamps to its last frame.
  const splatting = MUMBLE_ANIMS.splatting;
  assert.equal(splatting.loop, false);
  const last = splatting.frames.length - 1;
  assert.equal(animFrameIndex(splatting, splatting.ticksPerFrame * last), last);
  assert.equal(animFrameIndex(splatting, 1_000_000), last);
});
