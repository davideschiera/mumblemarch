/**
 * Pure InputManager rules (DESIGN §6.1.3, §6.2.6): wheel normalisation and key ownership.
 * DOM-free so these run in Node — `input-manager.ts` itself is the (untested-here) DOM glue.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { InputHandler } from '../src/input/handler.ts';
import { shouldDetach } from '../src/input/input-manager.ts';
import { ownsKey, type FocusedElementInfo } from '../src/input/key-ownership.ts';
import { normalizeWheelDelta } from '../src/input/wheel.ts';

// ─── normalizeWheelDelta (§6.1.3) ───────────────────────────────────────────────────────────

test('normalizeWheelDelta: pixel mode (0) passes deltaX + deltaY through', () => {
  assert.equal(normalizeWheelDelta(3, 4, 0), 7);
  assert.equal(normalizeWheelDelta(-10, 2, 0), -8);
});

test('normalizeWheelDelta: line mode (1) scales by ×16', () => {
  assert.equal(normalizeWheelDelta(1, 0, 1), 16);
  assert.equal(normalizeWheelDelta(0, -2, 1), -32);
});

test('normalizeWheelDelta: page mode (2) scales by ×400', () => {
  assert.equal(normalizeWheelDelta(1, 0, 2), 400);
  assert.equal(normalizeWheelDelta(0, 2, 2), 800);
});

test('normalizeWheelDelta: deltaX and deltaY combine before scaling', () => {
  assert.equal(normalizeWheelDelta(1, 1, 1), 32);
});

// ─── ownsKey (§6.2.6) ────────────────────────────────────────────────────────────────────────

const noOwner: FocusedElementInfo = { isTextEntry: false, inDialog: false, ownsActivation: false, ownsWidgetKeys: false };

test('ownsKey: text entry claims every key', () => {
  assert.equal(ownsKey({ ...noOwner, isTextEntry: true }, 'Space'), true);
  assert.equal(ownsKey({ ...noOwner, isTextEntry: true }, 'KeyX'), true);
  assert.equal(ownsKey({ ...noOwner, isTextEntry: true }, 'ArrowLeft'), true);
});

test('ownsKey: an open dialog claims every key', () => {
  assert.equal(ownsKey({ ...noOwner, inDialog: true }, 'KeyC'), true);
  assert.equal(ownsKey({ ...noOwner, inDialog: true }, 'Home'), true);
});

test('ownsKey: Space/Enter belong to a focused control, not other keys', () => {
  const info = { ...noOwner, ownsActivation: true };
  assert.equal(ownsKey(info, 'Space'), true);
  assert.equal(ownsKey(info, 'Enter'), true);
  assert.equal(ownsKey(info, 'ArrowLeft'), false);
  assert.equal(ownsKey(info, 'KeyC'), false);
});

test('ownsKey: arrows/Home/End/PageUp/PageDown belong to a slider/roving widget', () => {
  const info = { ...noOwner, ownsWidgetKeys: true };
  for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
    assert.equal(ownsKey(info, code), true, code);
  }
  assert.equal(ownsKey(info, 'Space'), false);
});

test('ownsKey: a plain canvas/body focus never owns a game key', () => {
  for (const code of ['Space', 'Enter', 'ArrowLeft', 'Home', 'KeyC', 'KeyL']) {
    assert.equal(ownsKey(noOwner, code), false, code);
  }
});

// ─── shouldDetach (IF4 defence in depth) ────────────────────────────────────────────────────────
// `InputManager` needs a real DOM to construct (addEventListener targets), so this pure predicate
// carries its handler-aware `detach(handler?)` rule DOM-free; the full attach/detach dance (a
// stale GameController's `destroy()` no longer killing the next one's listeners) is covered by the
// browser check.

const handlerA = {} as InputHandler;
const handlerB = {} as InputHandler;

test('shouldDetach: no argument always detaches whatever is currently attached (attach()\'s "clear any previous handler" call)', () => {
  assert.equal(shouldDetach(handlerA, undefined), true);
});

test('shouldDetach: no argument is a no-op when nothing is attached', () => {
  assert.equal(shouldDetach(null, undefined), false);
});

test('shouldDetach: a handler that matches the one currently attached does detach', () => {
  assert.equal(shouldDetach(handlerA, handlerA), true);
});

test('shouldDetach: a handler that does NOT match the one currently attached is a no-op (a stale screen cannot tear down the new one)', () => {
  assert.equal(shouldDetach(handlerA, handlerB), false);
});

test('shouldDetach: a handler passed while nothing is attached is a no-op', () => {
  assert.equal(shouldDetach(null, handlerA), false);
});
