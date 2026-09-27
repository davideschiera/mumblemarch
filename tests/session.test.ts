import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandQueue } from '../src/core/commands.ts';
import { releaseIntervalTicks, TICKS_PER_SECOND } from '../src/core/constants.ts';
import { GameSession } from '../src/core/session.ts';
import { compiled, FLOOR_Y } from './helpers.ts';

test('command queue releases commands in tick order, FIFO within a tick', () => {
  const q = new CommandQueue();
  q.push({ type: 'nuke' }, 5);
  q.push({ type: 'set-release-rate', rate: 60 }, 2);
  q.push({ type: 'set-release-rate', rate: 70 }, 2);
  assert.deepEqual(q.takeDue(1), []);
  assert.deepEqual(q.takeDue(2), [
    { type: 'set-release-rate', rate: 60 },
    { type: 'set-release-rate', rate: 70 },
  ]);
  assert.deepEqual(q.takeDue(10), [{ type: 'nuke' }]);
  assert.equal(q.history().length, 3);
});

test('release rate is clamped to [level minimum, 99]; changes emit an event', () => {
  const session = new GameSession(compiled({ releaseRate: 40 }));
  session.enqueue({ type: 'set-release-rate', rate: 10 });
  assert.deepEqual(session.step(), []);
  assert.equal(session.releaseRate, 40);
  session.enqueue({ type: 'set-release-rate', rate: 45 });
  assert.deepEqual(session.step(), [{ type: 'release-rate-changed', rate: 45 }]);
  session.enqueue({ type: 'set-release-rate', rate: 500 });
  session.step();
  assert.equal(session.releaseRate, 99);
});

test('applyNow works between ticks (e.g. while paused) and several adjustments accumulate', () => {
  const session = new GameSession(compiled({ releaseRate: 50 }));
  session.applyNow({ type: 'adjust-release-rate', delta: 1 });
  const events = session.applyNow({ type: 'adjust-release-rate', delta: 1 });
  assert.deepEqual(events, [{ type: 'release-rate-changed', rate: 52 }]);
  assert.equal(session.tick, 0); // no simulation time passed
  assert.deepEqual(session.replay().commands.map((c) => c.tick), [0, 0]);
});

test('assigning a skill to a missing lemming is rejected (not thrown) and not consumed', () => {
  const session = new GameSession(compiled({ skills: { digger: 1 } }));
  const [event] = session.applyNow({ type: 'assign-skill', lemmingId: 123, skill: 'digger' });
  assert.deepEqual(event, { type: 'skill-rejected', lemmingId: null, skill: 'digger', reason: 'no-lemming' });
  assert.equal(session.skills.digger, 1);
});

test('the clock counts down one tick per step and snapshots are JSON-safe', () => {
  const session = new GameSession(compiled({ timeLimitSeconds: 2 }));
  for (let i = 0; i < TICKS_PER_SECOND; i++) session.step();
  const snap = session.snapshot();
  assert.equal(snap.tick, TICKS_PER_SECOND);
  assert.equal(snap.timeLeftSeconds, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(snap)), snap);
});

test('trap cooldowns are exposed per hazard', () => {
  const session = new GameSession(compiled({ hazards: [{ kind: 'trap', x: 200, y: 140, w: 8, h: 10 }] }));
  assert.deepEqual(session.snapshot().hazardCooldowns, [0]);
});

test('session does not mutate the compiled level terrain', () => {
  const level = compiled();
  const session = new GameSession(level);
  session.terrain.remove(10, FLOOR_Y + 5, 0);
  assert.equal(level.terrain.isSolid(10, FLOOR_Y + 5), true);
});

test('release interval matches the original formula (RESEARCH §2.6)', () => {
  assert.equal(releaseIntervalTicks(99), 4);
  assert.equal(releaseIntervalTicks(50), 28);
  assert.equal(releaseIntervalTicks(1), 53);
  assert.equal(releaseIntervalTicks(0), 53); // clamped
});
