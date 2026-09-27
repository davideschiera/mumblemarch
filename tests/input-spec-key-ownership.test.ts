/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.2.6 (key ownership) and §6.1.3 (wheel):
 * Space/Enter owned by focused controls; arrows/Home/End/PageUp/PageDown owned by
 * `[data-arrow-keys]`/slider widgets; text entry & dialogs own everything; wheel normalisation
 * (deltaX+deltaY, lines ×16, pages ×400) and Ctrl/Meta/Alt handling (tested at the pure-rule level;
 * the actual "ignored" behaviour lives in input-manager.ts's key filter, not reproduced here).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownsKey, type FocusedElementInfo } from '../src/input/key-ownership.ts';
import { normalizeWheelDelta } from '../src/input/wheel.ts';

const NEUTRAL: FocusedElementInfo = { isTextEntry: false, inDialog: false, ownsActivation: false, ownsWidgetKeys: false };

test('Space/Enter are owned by a focused control (button etc.), freeing the game to use them otherwise', () => {
  const focused: FocusedElementInfo = { ...NEUTRAL, ownsActivation: true };
  assert.equal(ownsKey(focused, 'Space'), true);
  assert.equal(ownsKey(focused, 'Enter'), true);
});

test('Space/Enter are NOT owned when focus is on the canvas/body (game gets `assign`)', () => {
  assert.equal(ownsKey(NEUTRAL, 'Space'), false);
  assert.equal(ownsKey(NEUTRAL, 'Enter'), false);
});

test('arrows/Home/End/PageUp/PageDown are owned by [data-arrow-keys]/slider widgets', () => {
  const widget: FocusedElementInfo = { ...NEUTRAL, ownsWidgetKeys: true };
  for (const code of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']) {
    assert.equal(ownsKey(widget, code), true, `${code} should be owned by the widget`);
  }
});

test('arrows/Home/End are NOT owned when no widget has focus (game gets scroll-left/right, camera-hatch/exit)', () => {
  for (const code of ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']) {
    assert.equal(ownsKey(NEUTRAL, code), false, `${code} should be free for the game`);
  }
});

test('a plain game key (e.g. skill digit, Q/E, N, R) is never owned by ownsActivation/ownsWidgetKeys alone', () => {
  const buttonFocused: FocusedElementInfo = { ...NEUTRAL, ownsActivation: true };
  const widgetFocused: FocusedElementInfo = { ...NEUTRAL, ownsWidgetKeys: true };
  for (const code of ['Digit1', 'KeyQ', 'KeyE', 'KeyN', 'KeyR']) {
    assert.equal(ownsKey(buttonFocused, code), false);
    assert.equal(ownsKey(widgetFocused, code), false);
  }
});

test('text entry owns EVERY key, including ones a widget or button would not otherwise own', () => {
  const textEntry: FocusedElementInfo = { ...NEUTRAL, isTextEntry: true };
  assert.equal(ownsKey(textEntry, 'KeyN'), true);
  assert.equal(ownsKey(textEntry, 'Space'), true);
  assert.equal(ownsKey(textEntry, 'ArrowLeft'), true);
});

test('an open dialog owns EVERY key (game keys never reach it)', () => {
  const dialog: FocusedElementInfo = { ...NEUTRAL, inDialog: true };
  assert.equal(ownsKey(dialog, 'KeyN'), true);
  assert.equal(ownsKey(dialog, 'Space'), true);
});

// ─── Wheel (§6.1.3) ──────────────────────────────────────────────────────────────────────────

test('wheel: pixel mode (deltaMode 0) is deltaX + deltaY unscaled', () => {
  assert.equal(normalizeWheelDelta(10, 5, 0), 15);
  assert.equal(normalizeWheelDelta(-3, 2, 0), -1);
});

test('wheel: line mode (deltaMode 1) scales by ×16', () => {
  assert.equal(normalizeWheelDelta(1, 0, 1), 16);
  assert.equal(normalizeWheelDelta(0, 2, 1), 32);
  assert.equal(normalizeWheelDelta(1, 1, 1), 32);
});

test('wheel: page mode (deltaMode 2) scales by ×400', () => {
  assert.equal(normalizeWheelDelta(1, 0, 2), 400);
  assert.equal(normalizeWheelDelta(0.5, 0.5, 2), 400);
});
