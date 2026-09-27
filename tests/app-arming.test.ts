/**
 * Unit tests for `src/app/game/arming.ts` — the pure Pop all / Restart arm–confirm machine
 * (DESIGN §6.4.5, §6.4.6). Pure and DOM-free, so it runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { nextArm, restartIsImmediate } from '../src/app/game/arming.ts';
import { RESTART_IMMEDIATE_TICKS } from '../src/app/config.ts';

test('idle + press arms (newlyArmed, no confirm, no cancel)', () => {
  const t = nextArm(null, { type: 'press', kind: 'pop-all' });
  assert.deepEqual(t, { armed: 'pop-all', confirmed: null, newlyArmed: 'pop-all', cancelled: null });
});

test('one N never pops: a single press only arms', () => {
  const t = nextArm(null, { type: 'press', kind: 'pop-all' });
  assert.equal(t.confirmed, null);
  assert.equal(t.armed, 'pop-all');
});

test('armed + press of the same kind confirms, with no timeout (DESIGN §6.4.5 "no timeout, ever")', () => {
  // The machine carries no time of its own, so "waiting 60 s" cannot decay it — the second
  // press confirms exactly as it would immediately after the first, proving there is no timer.
  const armed = nextArm(null, { type: 'press', kind: 'pop-all' }).armed;
  const t = nextArm(armed, { type: 'press', kind: 'pop-all' });
  assert.deepEqual(t, { armed: null, confirmed: 'pop-all', newlyArmed: null, cancelled: null });
});

test('armed + Esc (cancel) disarms and reports what was cancelled', () => {
  const t = nextArm('restart', { type: 'cancel' });
  assert.deepEqual(t, { armed: null, confirmed: null, newlyArmed: null, cancelled: 'restart' });
});

test('idle + Esc is a no-op (nothing to cancel)', () => {
  const t = nextArm(null, { type: 'cancel' });
  assert.deepEqual(t, { armed: null, confirmed: null, newlyArmed: null, cancelled: null });
});

test('armed + any other action disarms, same as Esc', () => {
  const t = nextArm('pop-all', { type: 'other' });
  assert.deepEqual(t, { armed: null, confirmed: null, newlyArmed: null, cancelled: 'pop-all' });
});

test('idle + other action is a no-op', () => {
  const t = nextArm(null, { type: 'other' });
  assert.deepEqual(t, { armed: null, confirmed: null, newlyArmed: null, cancelled: null });
});

test('pressing the other kind while armed disarms the first and arms the second', () => {
  const t = nextArm('pop-all', { type: 'press', kind: 'restart' });
  assert.deepEqual(t, { armed: 'restart', confirmed: null, newlyArmed: 'restart', cancelled: 'pop-all' });
});

// ─── restartIsImmediate (DESIGN §6.4.6) ───────────────────────────────────────────────────────

test('restart is immediate once the level has ended, regardless of tick/commandCount', () => {
  assert.equal(restartIsImmediate({ tick: 10_000, commandCount: 40, ended: true }), true);
});

test('restart is immediate with no commands issued and the tick below the threshold', () => {
  assert.equal(RESTART_IMMEDIATE_TICKS, 54);
  assert.equal(restartIsImmediate({ tick: 0, commandCount: 0, ended: false }), true);
  assert.equal(restartIsImmediate({ tick: 53, commandCount: 0, ended: false }), true);
});

test('restart needs the two-step arm once the tick reaches the threshold', () => {
  assert.equal(restartIsImmediate({ tick: 54, commandCount: 0, ended: false }), false);
});

test('restart needs the two-step arm once any command has been issued, even early', () => {
  assert.equal(restartIsImmediate({ tick: 1, commandCount: 1, ended: false }), false);
});
