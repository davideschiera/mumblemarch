import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTION_IDS } from '../src/input/actions.ts';
import { DEFAULT_BINDINGS, FIXED_ACTIONS, RESERVED_CODES, resolveBindings } from '../src/input/bindings.ts';
import { applyRebind, clearKey, findClash, resetAll, validateCapture } from '../src/input/rebinding.ts';

test('validateCapture refuses every reserved code', () => {
  for (const code of RESERVED_CODES) assert.equal(validateCapture(code, 'pause'), 'reserved', code);
  assert.equal(validateCapture('KeyK', 'pause'), 'ok');
});

test('validateCapture refuses a fixed action (menu) regardless of the code', () => {
  assert.equal(validateCapture('KeyK', 'menu'), 'fixed');
  assert.ok(FIXED_ACTIONS.has('menu'));
});

test('findClash finds the other action holding a code, never the action itself', () => {
  const bindings = resolveBindings({});
  assert.equal(findClash(bindings, 'pause', 'KeyE'), 'skill-next');
  assert.equal(findClash(bindings, 'skill-next', 'KeyE'), null);
  assert.equal(findClash(bindings, 'pause', 'KeyZZZ-unused'), null);
});

test('applyRebind: no clash just sets the slot', () => {
  const { overrides, displaced } = applyRebind({}, 'pause', 0, 'KeyK');
  assert.deepEqual(overrides['pause'], ['KeyK']);
  assert.equal(displaced, null);
  const resolved = resolveBindings(overrides);
  assert.deepEqual(resolved.pause, ['KeyK']);
  assertNoDuplicateCodes(resolved);
});

test('applyRebind appends to slot 1 without leaving a hole when the action had 1 key', () => {
  const { overrides } = applyRebind({}, 'pause', 1, 'KeyK');
  assert.deepEqual(overrides['pause'], ['KeyP', 'KeyK']);
});

test('applyRebind caps at 2 codes per action', () => {
  let overrides = applyRebind({}, 'pause', 0, 'KeyK').overrides;
  overrides = applyRebind(overrides, 'pause', 1, 'KeyJ').overrides;
  assert.equal(overrides['pause']!.length, 2);
  // A third slot index still only ever produces a 2-length array (appended then sliced).
  overrides = applyRebind(overrides, 'pause', 2, 'KeyH').overrides;
  assert.equal(overrides['pause']!.length, 2);
});

test('applyRebind mode "set" takes the key from the clashing action with nothing given back', () => {
  // KeyE is skill-next's default key; rebind pause to KeyE.
  const { overrides, displaced } = applyRebind({}, 'pause', 0, 'KeyE', 'set');
  assert.equal(displaced, 'skill-next');
  const resolved = resolveBindings(overrides);
  assert.deepEqual(resolved.pause, ['KeyE']);
  assert.ok(!resolved['skill-next'].includes('KeyE'));
  assertNoDuplicateCodes(resolved);
});

test('applyRebind mode "swap" gives the clashing action the replaced key', () => {
  // pause defaults to KeyP; rebind it to KeyE (skill-next's key) via swap.
  const { overrides, displaced } = applyRebind({}, 'pause', 0, 'KeyE', 'swap');
  assert.equal(displaced, 'skill-next');
  const resolved = resolveBindings(overrides);
  assert.deepEqual(resolved.pause, ['KeyE']);
  assert.ok(resolved['skill-next'].includes('KeyP'), 'skill-next should get pause\'s old key back');
  assertNoDuplicateCodes(resolved);
});

test('applyRebind swap removes the slot entirely when the rebound action had nothing there', () => {
  // Give pause a 2nd slot first (empty -> KeyE would be slot 1, nothing to give back).
  const { overrides, displaced } = applyRebind({}, 'pause', 1, 'KeyE', 'swap');
  assert.equal(displaced, 'skill-next');
  const resolved = resolveBindings(overrides);
  assert.deepEqual(resolved.pause, ['KeyP', 'KeyE']);
  assert.equal(resolved['skill-next'].length, 0, 'skill-next loses the key with nothing to swap back');
});

test('applyRebind never touches the fixed action menu', () => {
  const { overrides, displaced } = applyRebind({}, 'menu', 0, 'KeyK');
  assert.deepEqual(overrides, {});
  assert.equal(displaced, null);
});

test('applyRebind never produces a reserved code', () => {
  const { overrides, displaced } = applyRebind({}, 'pause', 0, 'Tab');
  assert.deepEqual(overrides, {});
  assert.equal(displaced, null);
});

test('clearKey removes just the given slot, compacting the array', () => {
  const withTwo = applyRebind(applyRebind({}, 'lemming-next', 0, 'KeyK').overrides, 'lemming-next', 1, 'KeyJ').overrides;
  const cleared = clearKey(withTwo, 'lemming-next', 0);
  assert.deepEqual(cleared['lemming-next'], ['KeyJ']);
});

test('clearKey can empty an action down to 0 keys; out-of-range slot is a no-op', () => {
  const one = applyRebind({}, 'pause', 0, 'KeyK').overrides;
  const cleared = clearKey(one, 'pause', 0);
  assert.deepEqual(cleared['pause'], []);
  assert.deepEqual(clearKey(one, 'pause', 5), one);
});

test('clearKey never touches menu', () => {
  assert.deepEqual(clearKey({}, 'menu', 0), {});
});

test('resetAll returns empty overrides that resolve back to the defaults', () => {
  const overrides = resetAll();
  assert.deepEqual(overrides, {});
  assert.deepEqual(resolveBindings(overrides), resolveBindings({}));
  assert.deepEqual(resolveBindings(overrides).pause, DEFAULT_BINDINGS.pause);
});

test('a sequence of rebinds always round-trips through resolveBindings with no duplicate codes', () => {
  let overrides = {};
  overrides = applyRebind(overrides, 'pause', 0, 'KeyK').overrides;
  overrides = applyRebind(overrides, 'fast-forward', 0, 'KeyP', 'swap').overrides; // steals pause's old default back
  overrides = applyRebind(overrides, 'skill-climber', 1, 'KeyQ', 'swap').overrides; // clashes with skill-prev
  overrides = clearKey(overrides, 'mute', 0);
  assertNoDuplicateCodes(resolveBindings(overrides));
});

function assertNoDuplicateCodes(bindings: ReturnType<typeof resolveBindings>): void {
  const seen = new Map<string, string>();
  for (const action of ACTION_IDS) {
    for (const code of bindings[action]) {
      assert.ok(!seen.has(code), `${code} bound to both ${seen.get(code)} and ${action}`);
      seen.set(code, action);
    }
  }
}
