import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_SAVE, STORAGE_KEY } from '../src/persistence/schema.ts';
import {
  firstUnfinishedLevelId,
  isLevelUnlocked,
  loadSave,
  migrate,
  SaveStore,
  type KeyValueStore,
} from '../src/persistence/storage.ts';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
}

test('missing storage, missing key and corrupt JSON all fall back to defaults', () => {
  assert.deepEqual(loadSave(null), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore()), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: '{not json' })), DEFAULT_SAVE);
  assert.deepEqual(loadSave(memoryStore({ [STORAGE_KEY]: '{"version":999}' })), DEFAULT_SAVE);
});

test('invalid fields are replaced individually', () => {
  const raw = JSON.stringify({ version: 1, settings: { masterVolume: 7, muted: true }, progress: { a: { completed: true, bestSaved: -3 } } });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.equal(save.settings.masterVolume, DEFAULT_SAVE.settings.masterVolume);
  assert.equal(save.settings.muted, true);
  assert.deepEqual(save.progress['a'], { completed: true, bestSaved: 0, inTime: false, attempts: 0 });
});

test('SaveStore persists and keeps the best result', () => {
  const store = memoryStore();
  const save = new SaveStore(store);
  save.recordResult('lvl', 5, true);
  save.recordResult('lvl', 3, false);
  assert.deepEqual(new SaveStore(store).current.progress['lvl'], { completed: true, bestSaved: 5, inTime: false, attempts: 2 });
});

test('a throwing storage never crashes the game', () => {
  const broken: KeyValueStore = {
    getItem: () => {
      throw new Error('denied');
    },
    setItem: () => {
      throw new Error('quota');
    },
  };
  const save = new SaveStore(broken);
  assert.deepEqual(save.current, DEFAULT_SAVE);
  assert.doesNotThrow(() => save.updateSettings({ muted: true }));
  assert.equal(save.current.settings.muted, true);
});

test('a v1 save migrates to v2: settings and progress are kept, new fields get v2 defaults', () => {
  const v1 = {
    version: 1,
    settings: { masterVolume: 0.5, muted: true, highContrast: true },
    progress: { 'lvl-1': { completed: true, bestSaved: 4 } },
  };
  const save = loadSave(memoryStore({ [STORAGE_KEY]: JSON.stringify(v1) }));
  assert.equal(save.version, 2);
  // Kept from v1.
  assert.equal(save.settings.masterVolume, 0.5);
  assert.equal(save.settings.muted, true);
  assert.equal(save.settings.highContrast, true);
  assert.deepEqual(save.progress['lvl-1'], { completed: true, bestSaved: 4, inTime: false, attempts: 0 });
  // New v2 fields fall back to their defaults.
  assert.equal(save.settings.musicVolume, DEFAULT_SAVE.settings.musicVolume);
  assert.equal(save.settings.captions, DEFAULT_SAVE.settings.captions);
  assert.equal(save.settings.cursorSize, DEFAULT_SAVE.settings.cursorSize);
  assert.equal(save.settings.fallRuler, DEFAULT_SAVE.settings.fallRuler);
  assert.equal(save.lastLevelId, null);
});

test('stored key bindings are sanitised (unknown actions and bad values dropped)', () => {
  const raw = JSON.stringify({ version: 1, settings: { bindings: { pause: ['KeyK'], assign: 'Space', bogus: ['KeyB'] } } });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.deepEqual(save.settings.bindings, { pause: ['KeyK'] });
});

test('bindings: reserved codes are dropped, at most 2 codes/action are kept, menu is never overridable', () => {
  const raw = JSON.stringify({
    version: 2,
    settings: {
      bindings: {
        // 'Tab' is reserved and must be dropped; 3 codes must be capped to 2.
        'skill-climber': ['Tab', 'Digit1', 'Digit9', 'Digit8'],
        // Every code reserved -> the whole action is dropped (empty array is not stored).
        pause: ['Escape', 'F5'],
        // `menu` is FIXED — never accepted, even if it looks like a normal binding.
        menu: ['KeyZ'],
      },
    },
  });
  const save = loadSave(memoryStore({ [STORAGE_KEY]: raw }));
  assert.deepEqual(save.settings.bindings['skill-climber'], ['Digit1', 'Digit9']);
  assert.equal(save.settings.bindings.pause, undefined);
  assert.equal(save.settings.bindings.menu, undefined);
});

test('recordResult keeps the best save, ORs completed/inTime across attempts, and counts attempts', () => {
  const store = memoryStore();
  const save = new SaveStore(store);
  save.recordResult('lvl', 5, false, false);
  save.recordResult('lvl', 3, false, false);
  save.recordResult('lvl', 8, true, true);
  save.recordResult('lvl', 1, false, false);
  assert.deepEqual(save.current.progress['lvl'], { completed: true, bestSaved: 8, inTime: true, attempts: 4 });
});

test('setLastLevel remembers the last level played and persists it', () => {
  const store = memoryStore();
  const save = new SaveStore(store);
  assert.equal(save.current.lastLevelId, null);
  save.setLastLevel('lvl-3');
  assert.equal(save.current.lastLevelId, 'lvl-3');
  assert.equal(new SaveStore(store).current.lastLevelId, 'lvl-3');
});

test('isLevelUnlocked: level 0 is always unlocked, later levels need the previous one completed', () => {
  const levelIds = ['a', 'b', 'c'];
  const progress = { a: { completed: true, bestSaved: 5, inTime: false, attempts: 1 } };
  assert.equal(isLevelUnlocked(levelIds, 0, {}, false), true);
  assert.equal(isLevelUnlocked(levelIds, 1, {}, false), false);
  assert.equal(isLevelUnlocked(levelIds, 1, progress, false), true);
  assert.equal(isLevelUnlocked(levelIds, 2, progress, false), false);
});

test('isLevelUnlocked: unlockAll overrides every lock', () => {
  const levelIds = ['a', 'b', 'c'];
  assert.equal(isLevelUnlocked(levelIds, 2, {}, true), true);
});

test('firstUnfinishedLevelId: the first not-completed level, the last one when all are done, null when empty', () => {
  const levelIds = ['a', 'b', 'c'];
  const none = {};
  const aDone = { a: { completed: true, bestSaved: 5, inTime: false, attempts: 1 } };
  const allDone = {
    a: { completed: true, bestSaved: 5, inTime: false, attempts: 1 },
    b: { completed: true, bestSaved: 5, inTime: false, attempts: 1 },
    c: { completed: true, bestSaved: 5, inTime: false, attempts: 1 },
  };
  assert.equal(firstUnfinishedLevelId(levelIds, none), 'a');
  assert.equal(firstUnfinishedLevelId(levelIds, aDone), 'b');
  assert.equal(firstUnfinishedLevelId(levelIds, allDone), 'c');
  assert.equal(firstUnfinishedLevelId([], none), null);
});

test('an action the player cleared to zero keys stays unbound after a reload', () => {
  const raw = { version: 2, settings: { bindings: { undo: [], pause: ['Tab'] } }, progress: {} };
  const data = migrate(raw);
  assert.deepEqual(data.settings.bindings.undo, []);
  assert.equal(data.settings.bindings.pause, undefined, 'all-invalid codes fall back to defaults');
});
