/**
 * Unit tests for `src/app/game/audio-captions.ts` — the pure caption-text selection behind
 * `AudioWiring.onCue` (DESIGN §7.7 bark strip, §9.4 caption table). DOM-free, so it runs
 * directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { captionFor } from '../src/app/game/audio-captions.ts';
import { CAPTIONS, SOUND_CAPTIONS } from '../src/ui/strings.ts';

// A bark id (has a CAPTIONS entry) and a sound-only id (no bark, only SOUND_CAPTIONS).
const BARK_ID = 'lets-go';
const SOUND_ONLY_ID = 'splat';
// An id with neither (e.g. a UI click sound) — no caption at any level.
const UNCAPTIONED_ID = 'ui-move';

test('"off" shows nothing, even for a bark line', () => {
  assert.equal(captionFor(BARK_ID, 'off'), null);
  assert.equal(captionFor(SOUND_ONLY_ID, 'off'), null);
});

test('"barks": a voice-chirp cue shows its CAPTIONS line', () => {
  assert.equal(captionFor(BARK_ID, 'barks'), CAPTIONS[BARK_ID]);
  assert.equal(CAPTIONS[BARK_ID], 'Off we go!');
});

test('"barks": a sound-only cue (no bark line) shows nothing', () => {
  assert.equal(captionFor(SOUND_ONLY_ID, 'barks'), null);
});

test('"all": a voice-chirp cue still shows its bark line, not the bracketed one', () => {
  assert.equal(captionFor(BARK_ID, 'all'), CAPTIONS[BARK_ID]);
});

test('"all": a sound-only cue shows its bracketed SOUND_CAPTIONS line', () => {
  assert.equal(captionFor(SOUND_ONLY_ID, 'all'), SOUND_CAPTIONS[SOUND_ONLY_ID]);
  assert.equal(SOUND_CAPTIONS[SOUND_ONLY_ID], '[splat]');
});

test('a cue with neither a bark nor a sound caption shows nothing at any level', () => {
  assert.equal(captionFor(UNCAPTIONED_ID, 'barks'), null);
  assert.equal(captionFor(UNCAPTIONED_ID, 'all'), null);
});

test('every CAPTIONS id wins over SOUND_CAPTIONS at level "all" (bark takes priority)', () => {
  for (const id of Object.keys(CAPTIONS) as (keyof typeof CAPTIONS)[]) {
    assert.equal(captionFor(id, 'all'), CAPTIONS[id]);
  }
});
