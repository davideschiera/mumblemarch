/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.1.2 + §7.1 A13: at most 2 keys per action,
 * reserved codes refused, `menu` fixed, clash Swap/Cancel, and `resolveBindings` never producing
 * duplicate codes after any sequence of rebinds.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTION_IDS, type ActionId } from '../src/input/actions.ts';
import { DEFAULT_BINDINGS, RESERVED_CODES, resolveBindings } from '../src/input/bindings.ts';
import { applyRebind, clearKey, findClash, validateCapture } from '../src/input/rebinding.ts';

function allCodes(bindings: Record<string, readonly string[]>): string[] {
  return Object.values(bindings).flat();
}

test('reserved codes are refused (Tab, Escape, F5, F11, F12, Slash, Quote, Backspace)', () => {
  for (const code of ['Tab', 'Escape', 'F5', 'F11', 'F12', 'Slash', 'Quote', 'Backspace']) {
    assert.equal(RESERVED_CODES.has(code), true, `${code} must be in RESERVED_CODES`);
    assert.equal(validateCapture(code, 'skill-climber'), 'reserved');
  }
});

test('a non-reserved code validates ok for a non-fixed action', () => {
  assert.equal(validateCapture('KeyG', 'skill-climber'), 'ok');
});

test('`menu` is fixed and never rebindable, even with a valid code', () => {
  assert.equal(validateCapture('KeyG', 'menu'), 'fixed');
  const result = applyRebind({}, 'menu', 0, 'KeyG');
  assert.deepEqual(result.overrides, {}); // no-op
  assert.equal(result.displaced, null);
});

test('applyRebind refuses a reserved code (no-op)', () => {
  const result = applyRebind({}, 'skill-climber', 0, 'Backspace');
  assert.deepEqual(result.overrides, {});
  assert.equal(result.displaced, null);
});

test('at most 2 keys per action: rebinding slot 1 of a 2-key action replaces, never grows past 2', () => {
  // lemming-next defaults to 2 keys already (KeyX, BracketRight); replace slot 1.
  const overrides = applyRebind({}, 'lemming-next', 1, 'KeyG').overrides;
  const resolved = resolveBindings(overrides)['lemming-next'];
  assert.equal(resolved.length, 2);
  assert.deepEqual([...resolved], ['KeyX', 'KeyG']);
});

test('every action in the default table has at most 2 keys', () => {
  for (const id of ACTION_IDS) assert.ok(DEFAULT_BINDINGS[id].length <= 2, `${id} has more than 2 default keys`);
});

test('findClash reports the other action currently holding a code', () => {
  const bindings = resolveBindings({});
  // KeyE is the default for skill-next.
  assert.equal(findClash(bindings, 'skill-climber', 'KeyE'), 'skill-next');
  assert.equal(findClash(bindings, 'skill-next', 'KeyE'), null); // not a clash with itself
});

test('clash: mode "set" — the other action simply loses the key (Cancel-then-set-anyway semantics for the caller)', () => {
  const result = applyRebind({}, 'skill-climber', 0, 'KeyE', 'set');
  assert.equal(result.displaced, 'skill-next');
  const resolved = resolveBindings(result.overrides);
  assert.equal(resolved['skill-climber'].includes('KeyE'), true);
  assert.equal(resolved['skill-next'].includes('KeyE'), false); // lost it, no swap-back
});

test('clash: mode "swap" — the displaced action gets back what the rebinding action was carrying in that slot', () => {
  // skill-climber currently holds Digit1 in slot 0; give KeyE (skill-next's key) to skill-climber,
  // swap mode should hand skill-next the Digit1 that skill-climber is giving up.
  const result = applyRebind({}, 'skill-climber', 0, 'KeyE', 'swap');
  assert.equal(result.displaced, 'skill-next');
  const resolved = resolveBindings(result.overrides);
  assert.equal(resolved['skill-climber'].includes('KeyE'), true);
  assert.equal(resolved['skill-next'].includes('Digit1'), true, 'skill-next got skill-climber\'s old key back');
});

test('clash: swap when the rebinding action had NOTHING in that slot — the displaced action simply loses the slot', () => {
  // skill-next has one key (KeyE); rebind its (nonexistent) slot 1 to Digit1 (skill-climber's key).
  const result = applyRebind({}, 'skill-next', 1, 'Digit1', 'swap');
  assert.equal(result.displaced, 'skill-climber');
  const resolved = resolveBindings(result.overrides);
  assert.equal(resolved['skill-climber'].length, 0, 'lost the slot entirely, nothing to swap back');
});

test('clearKey removes one key from an action, never touching a fixed action', () => {
  const overrides = clearKey({}, 'lemming-next', 0); // default ['KeyX','BracketRight']
  const resolved = resolveBindings(overrides);
  assert.deepEqual([...resolved['lemming-next']], ['BracketRight']);
  assert.deepEqual(clearKey({}, 'menu', 0), {}); // no-op on fixed action
});

test('resolveBindings has NO duplicate codes across the default table', () => {
  const resolved = resolveBindings({});
  const codes = allCodes(resolved as unknown as Record<string, readonly string[]>);
  assert.equal(codes.length, new Set(codes).size, 'the default table must have no duplicate codes');
});

test('after an arbitrary sequence of rebinds, resolveBindings still has no duplicate codes', () => {
  let overrides: Partial<Record<ActionId, readonly string[]>> = {};
  const steps: [ActionId, number, string, 'set' | 'swap'][] = [
    ['skill-climber', 0, 'KeyE', 'swap'],
    ['pause', 0, 'KeyN', 'set'],
    ['nuke', 0, 'KeyP', 'swap'],
    ['undo', 1, 'Digit1', 'swap'],
    ['fast-forward', 0, 'KeyZ', 'swap'],
    ['camera-center', 0, 'KeyM', 'set'],
  ];
  for (const [action, slot, code, mode] of steps) {
    overrides = applyRebind(overrides, action, slot, code, mode).overrides;
  }
  const resolved = resolveBindings(overrides);
  const codes = allCodes(resolved as unknown as Record<string, readonly string[]>);
  assert.equal(codes.length, new Set(codes).size, 'no duplicate codes after the whole sequence');
  // every action still respects the <=2-keys-per-action rule
  for (const id of ACTION_IDS) assert.ok(resolved[id].length <= 2, `${id} has more than 2 keys`);
});

test('DEFAULT_BINDINGS sanity: no duplicate codes to start with (baseline for the audit table)', () => {
  const codes = allCodes(DEFAULT_BINDINGS as unknown as Record<string, readonly string[]>);
  assert.equal(codes.length, new Set(codes).size);
});
