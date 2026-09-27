/**
 * VALIDATOR (ev1b-announce) spec-derived tests for `src/app/game/audio-captions.ts` and
 * `src/app/game/audio-music.ts` against DESIGN.md §7.7 (captions), §9.4 (caption table) and §8.6
 * + DESIGN-APPENDIX §E.4 S4 (music), independent of `tests/app-audio-captions.test.ts` /
 * `tests/app-audio-music.test.ts`: expected caption text is transcribed by hand from the §9.4
 * table (not read back from `CAPTIONS`/`SOUND_CAPTIONS`), and the music-variant check runs
 * against the REAL shipped campaign (`src/levels/registry.ts`), not a synthetic fixture. DOM-free.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { captionFor } from '../src/app/game/audio-captions.ts';
import { musicVariantFor, readyToStartMusic, themeSiblingIds } from '../src/app/game/audio-music.ts';
import { MUSIC_START_TICK } from '../src/app/config.ts';
import { LEVELS, getLevel } from '../src/levels/registry.ts';

// ─── §7.7 / §9.4 Captions ──────────────────────────────────────────────────────────────────────
//
// "'barks' (default): voice-chirp lines only. 'all': + the bracketed sound captions. 'off': never."
// §9.4's table lists exactly 4 bark (voice) lines: lets-go, ohno, exit, builder-shrug.

const BARK_LINES: Record<string, string> = {
  'lets-go': 'Off we go!',
  ohno: 'Uh-oh…',
  exit: 'Wheee!', // ("×n when coalesced" is the caption strip's own coalescing, not captionFor's job)
  'builder-shrug': 'Out of planks!',
};

// A representative sample of the bracketed sound-only captions from the §9.4 table.
const SOUND_ONLY_LINES: Record<string, string> = {
  splat: '[splat]',
  drown: '[glug glug]',
  burn: '[tsss!]',
  explosion: '[pop!]',
  nuke: '[fizz… pop all!]',
  steel: '[tink]',
  'builder-low': '[plink]',
  fuse: '[fizz]',
  'time-low': '[tick-tock]',
  'entrance-open': '[creak… clunk]',
  'trap-flytrap': '[snap! chomp chomp]',
  'trap-press': '[ka-chunk!]',
  'trap-pendulum': '[swish… clang]',
  'trap-piston': '[hiss… bang!]',
  'trap-clam': '[clack-gloop]',
};

test('captions "off": nothing at all, for a bark line or a sound-only line', () => {
  for (const id of Object.keys(BARK_LINES)) assert.equal(captionFor(id as never, 'off'), null);
  for (const id of Object.keys(SOUND_ONLY_LINES)) assert.equal(captionFor(id as never, 'off'), null);
});

test('captions "barks": exactly the 4 §9.4 voice lines, verbatim, and nothing for sound-only ids', () => {
  for (const [id, text] of Object.entries(BARK_LINES)) {
    assert.equal(captionFor(id as never, 'barks'), text, `bark line for ${id}`);
  }
  for (const id of Object.keys(SOUND_ONLY_LINES)) {
    assert.equal(captionFor(id as never, 'barks'), null, `${id} must not caption at "barks"`);
  }
});

test('captions "all": bark lines stay as spoken text; sound-only cues get the bracketed §9.4 text', () => {
  for (const [id, text] of Object.entries(BARK_LINES)) {
    assert.equal(captionFor(id as never, 'all'), text, `bark line for ${id} unchanged at "all"`);
  }
  for (const [id, text] of Object.entries(SOUND_ONLY_LINES)) {
    assert.equal(captionFor(id as never, 'all'), text, `bracketed caption for ${id}`);
  }
});

// ─── §8.6 / E.4 S4 Music ───────────────────────────────────────────────────────────────────────

test('MUSIC_START_TICK is 55 ("after the first mumble drops", §8.6)', () => {
  assert.equal(MUSIC_START_TICK, 55);
});

test('readyToStartMusic gates strictly on MUSIC_START_TICK and "not already started"', () => {
  assert.equal(readyToStartMusic(54, MUSIC_START_TICK, false), false);
  assert.equal(readyToStartMusic(55, MUSIC_START_TICK, false), true);
  assert.equal(readyToStartMusic(55, MUSIC_START_TICK, true), false, 'already started this level');
  assert.equal(readyToStartMusic(9999, MUSIC_START_TICK, false), true, 'still true well past the tick (e.g. after FF)');
});

// "the variant is the level's index within its theme, mod 3" — checked against the real shipped
// campaign order (src/levels/registry.ts), grouped by theme, independent of any synthetic fixture.
const EXPECTED_VARIANT: Record<string, number> = {
  'spade-expectations': 0, // mossgrove #1
  'not-one-step-bogward': 1, // mossgrove #2
  'wrong-side-of-the-hedge': 2, // mossgrove #3
  'gently-down-the-dome': 0, // observatory #1
  'diagonally-yours': 1, // observatory #2
  'bridge-over-troubled-toffee': 0, // sugarworks #1
  'double-boiler': 1, // sugarworks #2
  'the-punch-line': 0, // reef #1
  'clam-before-the-storm': 1, // reef #2
  'suction-cup-final': 0, // foundry #1
  'one-pop-wonder': 1, // foundry #2
  'last-shift-at-the-foundry': 2, // foundry #3
};

test('musicVariantFor matches the expected per-theme index (mod 3) for every shipped level', () => {
  assert.equal(LEVELS.length, Object.keys(EXPECTED_VARIANT).length, 'this table must cover every shipped level');
  for (const level of LEVELS) {
    const expected = EXPECTED_VARIANT[level.id];
    assert.notEqual(expected, undefined, `no expected variant recorded for ${level.id}`);
    assert.equal(musicVariantFor(LEVELS, level), expected, `${level.id} (${level.theme})`);
  }
});

test('themeSiblingIds preserves campaign order within a theme (real registry data)', () => {
  assert.deepEqual(themeSiblingIds(LEVELS, 'mossgrove'), ['spade-expectations', 'not-one-step-bogward', 'wrong-side-of-the-hedge']);
  assert.deepEqual(themeSiblingIds(LEVELS, 'foundry'), ['suction-cup-final', 'one-pop-wonder', 'last-shift-at-the-foundry']);
});

test('sanity: getLevel resolves every id used above', () => {
  for (const id of Object.keys(EXPECTED_VARIANT)) assert.ok(getLevel(id), `${id} should exist in the registry`);
});
