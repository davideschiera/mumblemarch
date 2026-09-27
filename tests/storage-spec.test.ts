/**
 * INDEPENDENT validator test (ev1a-copy) for src/persistence/* against docs/development/
 * CONTRACTS.md §7/§8 and docs/design/DESIGN.md §7.11/§5.4/§6.1.2. Expected values are transcribed
 * by hand from those documents, not from the implementer's own tests.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESERVED_CODES, FIXED_ACTIONS, DEFAULT_BINDINGS } from '../src/input/bindings.ts';
import { DEFAULT_SAVE, DEFAULT_SETTINGS, SAVE_VERSION, STORAGE_KEY } from '../src/persistence/schema.ts';
import { firstUnfinishedLevelId, isLevelUnlocked, loadSave, SaveStore, type KeyValueStore } from '../src/persistence/storage.ts';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

// ─── CONTRACTS §7: shape, version, defaults ────────────────────────────────────────────────────

test('SAVE_VERSION is 2 and STORAGE_KEY is mumblemarch.save', () => {
  assert.equal(SAVE_VERSION, 2);
  assert.equal(STORAGE_KEY, 'mumblemarch.save');
});

test('DEFAULT_SETTINGS matches every default in CONTRACTS §7 / DESIGN §7.11', () => {
  // Pre-existing fields (unchanged defaults).
  assert.equal(DEFAULT_SETTINGS.masterVolume, 0.7);
  assert.equal(DEFAULT_SETTINGS.sfxVolume, 0.8);
  assert.equal(DEFAULT_SETTINGS.voiceVolume, 0.8);
  assert.equal(DEFAULT_SETTINGS.muted, false);
  assert.equal(DEFAULT_SETTINGS.musicEnabled, true);
  assert.equal(DEFAULT_SETTINGS.motion, 'system');
  assert.equal(DEFAULT_SETTINGS.highContrast, false);
  assert.equal(DEFAULT_SETTINGS.scale, 0);
  assert.equal(DEFAULT_SETTINGS.announcements, 'essential');
  assert.deepEqual(DEFAULT_SETTINGS.bindings, {});
  // §7.11 "musicVolume ... 0.35 (was 0.4)".
  assert.equal(DEFAULT_SETTINGS.musicVolume, 0.35);
  // NEW fields and their exact defaults (CONTRACTS §7 / DESIGN §7.11 table).
  assert.equal(DEFAULT_SETTINGS.captions, 'barks');
  assert.equal(DEFAULT_SETTINGS.cursorSize, 32);
  assert.equal(DEFAULT_SETTINGS.fallRuler, false);
  assert.equal(DEFAULT_SETTINGS.edgeScroll, true);
  assert.equal(DEFAULT_SETTINGS.cameraFollow, false);
  assert.equal(DEFAULT_SETTINGS.assignOn, 'press');
  assert.equal(DEFAULT_SETTINGS.pauseOnBlur, true);
  assert.equal(DEFAULT_SETTINGS.pauseWhileChoosing, false);
  assert.equal(DEFAULT_SETTINGS.gameSpeed, 1);
  assert.equal(DEFAULT_SETTINGS.showKeyHints, true);
  assert.equal(DEFAULT_SETTINGS.unlockAll, false);
});

test('DEFAULT_SAVE has version 2, empty progress, lastLevelId null', () => {
  assert.equal(DEFAULT_SAVE.version, 2);
  assert.deepEqual(DEFAULT_SAVE.progress, {});
  assert.equal(DEFAULT_SAVE.lastLevelId, null);
});

// ─── v1 -> v2 migration keeps progress, adds v2 defaults ───────────────────────────────────────

test('a v1 save (old settings shape, no inTime/attempts/lastLevelId) migrates to v2 and keeps progress', () => {
  const v1 = {
    version: 1,
    settings: {
      masterVolume: 0.5,
      sfxVolume: 0.9,
      voiceVolume: 0.6,
      muted: true,
      musicEnabled: false,
      motion: 'reduce',
      highContrast: true,
      scale: 3,
      announcements: 'all',
      bindings: { pause: ['KeyK'] },
    },
    progress: { 'spade-expectations': { completed: true, bestSaved: 7 } },
  };
  const save = loadSave(memoryStore({ [STORAGE_KEY]: JSON.stringify(v1) }));
  assert.equal(save.version, 2);
  // Old settings kept.
  assert.equal(save.settings.masterVolume, 0.5);
  assert.equal(save.settings.sfxVolume, 0.9);
  assert.equal(save.settings.voiceVolume, 0.6);
  assert.equal(save.settings.muted, true);
  assert.equal(save.settings.musicEnabled, false);
  assert.equal(save.settings.motion, 'reduce');
  assert.equal(save.settings.highContrast, true);
  assert.equal(save.settings.scale, 3);
  assert.equal(save.settings.announcements, 'all');
  assert.deepEqual(save.settings.bindings, { pause: ['KeyK'] });
  // Progress kept (completed/bestSaved survive migration).
  assert.equal(save.progress['spade-expectations']!.completed, true);
  assert.equal(save.progress['spade-expectations']!.bestSaved, 7);
  // New v2 fields on that progress entry default sanely (never crash, never fabricate true).
  assert.equal(save.progress['spade-expectations']!.inTime, false);
  assert.equal(save.progress['spade-expectations']!.attempts, 0);
  // New v2 settings fields fall back to CONTRACTS §7 defaults.
  assert.equal(save.settings.musicVolume, 0.35);
  assert.equal(save.settings.captions, 'barks');
  assert.equal(save.settings.cursorSize, 32);
  assert.equal(save.settings.fallRuler, false);
  assert.equal(save.settings.edgeScroll, true);
  assert.equal(save.settings.cameraFollow, false);
  assert.equal(save.settings.assignOn, 'press');
  assert.equal(save.settings.pauseOnBlur, true);
  assert.equal(save.settings.pauseWhileChoosing, false);
  assert.equal(save.settings.gameSpeed, 1);
  assert.equal(save.settings.showKeyHints, true);
  assert.equal(save.settings.unlockAll, false);
  // New top-level v2 field.
  assert.equal(save.lastLevelId, null);
});

// ─── Corrupt JSON / wrong types fall back per field ────────────────────────────────────────────

test('missing storage / missing key / corrupt JSON / unknown version fall back to DEFAULT_SAVE', () => {
  assert.deepEqual(loadSave(null), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore()), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: 'not json at all' })), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: '42' })), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: '[]' })), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: JSON.stringify({ version: 3 }) })), DEFAULT_SAVE);
});

test('wrong-typed fields fall back individually to their own default, siblings are kept', () => {
  const raw = JSON.stringify({
    version: 2,
    settings: {
      masterVolume: 'loud', // wrong type -> default
      sfxVolume: 1.5, // out of 0-1 range -> default
      voiceVolume: -0.2, // out of range -> default
      musicVolume: 0.9, // valid -> kept
      muted: 'yes', // wrong type -> default
      motion: 'sideways', // not a valid enum value -> default
      captions: 'loud', // not a valid enum value -> default
      cursorSize: 999, // not one of 32/48/64 -> default
      gameSpeed: 2, // not one of 1/0.75/0.5 -> default
      scale: -1, // negative -> default
    },
    progress: {
      lvl: { completed: 'yes', bestSaved: -5, inTime: 1, attempts: -2 },
      bad: 'not an object',
    },
    lastLevelId: 42,
  });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.equal(save.settings.masterVolume, DEFAULT_SETTINGS.masterVolume);
  assert.equal(save.settings.sfxVolume, DEFAULT_SETTINGS.sfxVolume);
  assert.equal(save.settings.voiceVolume, DEFAULT_SETTINGS.voiceVolume);
  assert.equal(save.settings.musicVolume, 0.9);
  assert.equal(save.settings.muted, DEFAULT_SETTINGS.muted);
  assert.equal(save.settings.motion, DEFAULT_SETTINGS.motion);
  assert.equal(save.settings.captions, DEFAULT_SETTINGS.captions);
  assert.equal(save.settings.cursorSize, DEFAULT_SETTINGS.cursorSize);
  assert.equal(save.settings.gameSpeed, DEFAULT_SETTINGS.gameSpeed);
  assert.equal(save.settings.scale, DEFAULT_SETTINGS.scale);
  assert.deepEqual(save.progress['lvl'], { completed: false, bestSaved: 0, inTime: false, attempts: 0 });
  assert.equal(save.progress['bad'], undefined);
  assert.equal(save.lastLevelId, null);
});

test('a throwing store never crashes loadSave/writeSave', () => {
  const broken: KeyValueStore = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  assert.deepEqual(loadSave(broken), DEFAULT_SAVE);
  const store = new SaveStore(broken);
  assert.doesNotThrow(() => store.updateSettings({ muted: true }));
});

// ─── recordResult: keeps best, ORs completed/inTime, counts attempts ───────────────────────────

test('recordResult keeps the best saved count across attempts', () => {
  const store = new SaveStore(memoryStore());
  store.recordResult('lvl', 5, false, false);
  store.recordResult('lvl', 2, false, false);
  store.recordResult('lvl', 9, false, false);
  assert.equal(store.current.progress['lvl']!.bestSaved, 9);
});

test('recordResult ORs completed across attempts (a later loss does not un-complete a level)', () => {
  const store = new SaveStore(memoryStore());
  store.recordResult('lvl', 10, true, true);
  store.recordResult('lvl', 0, false, false);
  assert.equal(store.current.progress['lvl']!.completed, true);
});

test('recordResult ORs inTime across attempts (a later out-of-time win keeps a prior in-time win)', () => {
  const store = new SaveStore(memoryStore());
  store.recordResult('lvl', 10, true, true);
  store.recordResult('lvl', 10, true, false);
  assert.equal(store.current.progress['lvl']!.inTime, true);
});

test('recordResult counts one attempt per call', () => {
  const store = new SaveStore(memoryStore());
  for (let i = 0; i < 5; i++) store.recordResult('lvl', i, false, false);
  assert.equal(store.current.progress['lvl']!.attempts, 5);
});

test('setLastLevel records SaveData.lastLevelId and it persists across reloads', () => {
  const backing = memoryStore();
  const store = new SaveStore(backing);
  store.setLastLevel('one-pop-wonder');
  assert.equal(store.current.lastLevelId, 'one-pop-wonder');
  assert.equal(loadSave(backing).lastLevelId, 'one-pop-wonder');
});

// ─── Unlock rule (DESIGN §5.4/§7.11): level n unlocked when level n-1 completed, or unlockAll ───

test('isLevelUnlocked: level 0 (the first level) is always unlocked regardless of progress', () => {
  assert.equal(isLevelUnlocked(['a', 'b', 'c'], 0, {}, false), true);
  assert.equal(isLevelUnlocked([], 0, {}, false), true);
});

test('isLevelUnlocked: level n needs levelIds[n-1] completed === true', () => {
  const levelIds = ['a', 'b', 'c', 'd'];
  assert.equal(isLevelUnlocked(levelIds, 1, {}, false), false);
  assert.equal(isLevelUnlocked(levelIds, 1, { a: { completed: false, bestSaved: 5, inTime: false, attempts: 3 } }, false), false);
  assert.equal(isLevelUnlocked(levelIds, 1, { a: { completed: true, bestSaved: 0, inTime: false, attempts: 1 } }, false), true);
  // Completing 'a' does not unlock 'c' (level 2) without 'b' also completed.
  assert.equal(isLevelUnlocked(levelIds, 2, { a: { completed: true, bestSaved: 5, inTime: false, attempts: 1 } }, false), false);
});

test('isLevelUnlocked: unlockAll setting overrides the lock on every level', () => {
  assert.equal(isLevelUnlocked(['a', 'b', 'c'], 2, {}, true), true);
});

test('firstUnfinishedLevelId: first not-completed level; last level when all done; null when campaign is empty', () => {
  const levelIds = ['a', 'b', 'c'];
  assert.equal(firstUnfinishedLevelId(levelIds, {}), 'a');
  assert.equal(firstUnfinishedLevelId(levelIds, { a: { completed: true, bestSaved: 1, inTime: false, attempts: 1 } }), 'b');
  const allDone = Object.fromEntries(levelIds.map((id) => [id, { completed: true, bestSaved: 1, inTime: false, attempts: 1 }]));
  assert.equal(firstUnfinishedLevelId(levelIds, allDone), 'c');
  assert.equal(firstUnfinishedLevelId([], {}), null);
});

// ─── Bindings sanitisation (DESIGN §6.1.2/§7.11; RESERVED_CODES from src/input/bindings.ts) ────

test('sanitizeBindings drops every RESERVED_CODES entry', () => {
  for (const code of RESERVED_CODES) {
    const raw = JSON.stringify({ version: 2, settings: { bindings: { 'skill-climber': [code] } } });
    const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
    assert.equal(save.settings.bindings['skill-climber'], undefined, `reserved code ${code} must be dropped`);
  }
});

test('sanitizeBindings caps at 2 codes per action, keeping the first two', () => {
  const raw = JSON.stringify({ version: 2, settings: { bindings: { 'lemming-next': ['KeyX', 'BracketRight', 'KeyG', 'KeyH'] } } });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.deepEqual(save.settings.bindings['lemming-next'], ['KeyX', 'BracketRight']);
});

test('sanitizeBindings never accepts an override for a FIXED_ACTIONS entry (menu stays on Escape)', () => {
  assert.ok(FIXED_ACTIONS.has('menu'));
  assert.deepEqual(DEFAULT_BINDINGS.menu, ['Escape']);
  const raw = JSON.stringify({ version: 2, settings: { bindings: { menu: ['KeyQ'] } } });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.equal(save.settings.bindings.menu, undefined);
});

test('sanitizeBindings drops non-array values and unknown action keys', () => {
  const raw = JSON.stringify({ version: 2, settings: { bindings: { pause: 'KeyP', 'totally-fake-action': ['KeyZ'] } } });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.deepEqual(save.settings.bindings, {});
});

test('RESERVED_CODES matches CONTRACTS §8 exactly: Tab, Escape, F5, F11, F12, Slash, Quote, Backspace', () => {
  const expected = ['Tab', 'Escape', 'F5', 'F11', 'F12', 'Slash', 'Quote', 'Backspace'];
  assert.equal(RESERVED_CODES.size, expected.length);
  for (const code of expected) assert.ok(RESERVED_CODES.has(code), `missing reserved code ${code}`);
});
