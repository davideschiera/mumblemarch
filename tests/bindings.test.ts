import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTION_IDS } from '../src/input/actions.ts';
import { ariaKeyShortcuts, buildKeyMap, DEFAULT_BINDINGS, resolveBindings } from '../src/input/bindings.ts';

test('every action has at least one default key and no key is bound twice', () => {
  const seen = new Map<string, string>();
  for (const action of ACTION_IDS) {
    assert.ok(DEFAULT_BINDINGS[action].length > 0, action);
    for (const code of DEFAULT_BINDINGS[action]) {
      assert.ok(!seen.has(code), `${code} bound to ${seen.get(code)} and ${action}`);
      seen.set(code, action);
    }
  }
  assert.ok(!seen.has('Tab'), 'Tab is reserved for focus navigation');
});

test('a rebinding wins over the default that used the same key', () => {
  const bindings = resolveBindings({ pause: ['Space'] });
  assert.equal(buildKeyMap(bindings).get('Space'), 'pause');
  assert.ok(!bindings.assign.includes('Space'));
  assert.ok(bindings.assign.includes('Enter'));
});

test('aria-keyshortcuts uses KeyboardEvent.key names', () => {
  assert.equal(ariaKeyShortcuts(['Digit1']), '1');
  assert.equal(ariaKeyShortcuts(['Minus', 'NumpadSubtract']), '-');
  assert.equal(ariaKeyShortcuts(['Escape']), 'Escape');
});
