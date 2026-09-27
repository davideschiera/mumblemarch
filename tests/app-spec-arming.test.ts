/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.4.5–§6.4.6, §7.1 A12: Pop all / Restart
 * arm-confirm state machine. Independent of any implementation test file — derived from SPEC only.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextArm, restartIsImmediate } from '../src/app/game/arming.ts';

test('A12: one N (press) never pops — only arms', () => {
  const t = nextArm(null, { type: 'press', kind: 'pop-all' });
  assert.equal(t.armed, 'pop-all');
  assert.equal(t.confirmed, null);
  assert.equal(t.newlyArmed, 'pop-all');
});

test('A12: arm, then an arbitrarily long wait (no time field to advance), then N still confirms — no timeout', () => {
  let armed: 'pop-all' | 'restart' | null = null;
  const armT = nextArm(armed, { type: 'press', kind: 'pop-all' });
  armed = armT.armed;
  // Simulate "an arbitrarily long wait": nothing in this state machine depends on elapsed time,
  // so simply re-invoking with the SAME armed state after a notional 60s (or 60 years) confirms.
  const confirmT = nextArm(armed, { type: 'press', kind: 'pop-all' });
  assert.equal(confirmT.confirmed, 'pop-all');
  assert.equal(confirmT.armed, null);
});

test('A12: arm then Esc disarms (no confirm)', () => {
  const armT = nextArm(null, { type: 'press', kind: 'pop-all' });
  const cancelT = nextArm(armT.armed, { type: 'cancel' });
  assert.equal(cancelT.armed, null);
  assert.equal(cancelT.confirmed, null);
  assert.equal(cancelT.cancelled, 'pop-all');
});

test('A12: arm then any other action (e.g. a skill key) disarms', () => {
  const armT = nextArm(null, { type: 'press', kind: 'pop-all' });
  const otherT = nextArm(armT.armed, { type: 'other' });
  assert.equal(otherT.armed, null);
  assert.equal(otherT.cancelled, 'pop-all');
  assert.equal(otherT.confirmed, null);
});

test('restart arm/confirm follows the identical machine', () => {
  const armT = nextArm(null, { type: 'press', kind: 'restart' });
  assert.equal(armT.newlyArmed, 'restart');
  const confirmT = nextArm(armT.armed, { type: 'press', kind: 'restart' });
  assert.equal(confirmT.confirmed, 'restart');
});

test('§6.4.6 restart is immediate: no command issued and tick < 54', () => {
  assert.equal(restartIsImmediate({ tick: 0, commandCount: 0, ended: false }), true);
  assert.equal(restartIsImmediate({ tick: 53, commandCount: 0, ended: false }), true);
});

test('§6.4.6 restart is NOT immediate: tick >= 54 with no command (must arm)', () => {
  assert.equal(restartIsImmediate({ tick: 54, commandCount: 0, ended: false }), false);
});

test('§6.4.6 restart is NOT immediate: a command was issued, even at tick 0 (must arm)', () => {
  assert.equal(restartIsImmediate({ tick: 0, commandCount: 1, ended: false }), false);
});

test('§6.4.6 restart is immediate when the level has ended, regardless of tick/commands', () => {
  assert.equal(restartIsImmediate({ tick: 9999, commandCount: 5, ended: true }), true);
});
