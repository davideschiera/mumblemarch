/**
 * Unit tests for `src/app/game/audio-music.ts` — the pure music-variant helpers behind
 * `AudioWiring` (DESIGN §8.6). `LevelDef` carries no DOM types, so this runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { musicVariantFor, readyToStartMusic, themeSiblingIds } from '../src/app/game/audio-music.ts';
import { musicVariant } from '../src/app/game/rules.ts';
import { levelDef } from './helpers.ts';

const levels = [
  levelDef({ id: 'moss-1', theme: 'mossgrove' }),
  levelDef({ id: 'sugar-1', theme: 'sugarworks' }),
  levelDef({ id: 'moss-2', theme: 'mossgrove' }),
  levelDef({ id: 'moss-3', theme: 'mossgrove' }),
  levelDef({ id: 'moss-4', theme: 'mossgrove' }), // 4th mossgrove level: variant wraps back to 0
  levelDef({ id: 'reef-1', theme: 'reef' }),
];

// ─── themeSiblingIds ────────────────────────────────────────────────────────────────────────────

test('themeSiblingIds returns only the ids sharing the given theme, in campaign order', () => {
  assert.deepEqual(themeSiblingIds(levels, 'mossgrove'), ['moss-1', 'moss-2', 'moss-3', 'moss-4']);
  assert.deepEqual(themeSiblingIds(levels, 'reef'), ['reef-1']);
});

test('themeSiblingIds is empty for a theme with no levels', () => {
  assert.deepEqual(themeSiblingIds(levels, 'observatory'), []);
});

// ─── musicVariantFor (DESIGN §8.6: index within the theme, mod 3) ──────────────────────────────

test('musicVariantFor matches musicVariant(themeSiblingIds(...), id) exactly', () => {
  for (const level of levels) {
    assert.equal(musicVariantFor(levels, level), musicVariant(themeSiblingIds(levels, level.theme), level.id));
  }
});

test('musicVariantFor cycles 0,1,2,0 across levels sharing a theme', () => {
  assert.equal(musicVariantFor(levels, levels[0]!), 0); // moss-1
  assert.equal(musicVariantFor(levels, levels[2]!), 1); // moss-2
  assert.equal(musicVariantFor(levels, levels[3]!), 2); // moss-3
  assert.equal(musicVariantFor(levels, levels[4]!), 0); // moss-4 wraps
});

test('musicVariantFor is 0 for a theme`s only level', () => {
  assert.equal(musicVariantFor(levels, levels[1]!), 0); // sugar-1
  assert.equal(musicVariantFor(levels, levels[5]!), 0); // reef-1
});

// ─── readyToStartMusic ──────────────────────────────────────────────────────────────────────────

test('readyToStartMusic is false before the start tick and once already started', () => {
  assert.equal(readyToStartMusic(0, 55, false), false);
  assert.equal(readyToStartMusic(54, 55, false), false);
  assert.equal(readyToStartMusic(55, 55, true), false); // already started this level
});

test('readyToStartMusic is true exactly once the tick reaches the start tick', () => {
  assert.equal(readyToStartMusic(55, 55, false), true);
  assert.equal(readyToStartMusic(200, 55, false), true); // e.g. after fast-forward past it
});
