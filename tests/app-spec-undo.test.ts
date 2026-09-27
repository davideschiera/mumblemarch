/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.4.7: undo removes only the most recent
 * `assign-skill` or `nuke` command (RR commands are kept), is repeatable, and — the trickiest
 * clause — a command applied while PAUSED at the current tick must be undoable immediately (not
 * just after the next tick runs).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/core/session.ts';
import type { TimedCommand } from '../src/core/types.ts';
import { planUndo, rebuildSession } from '../src/app/game/undo-commands.ts';
import { compiled, FLOOR_Y } from './helpers.ts';

const ON_FLOOR = [{ x: 40, y: FLOOR_Y }];

test('undo removes only the most recent assign-skill/nuke; RR commands are kept', () => {
  const commands: TimedCommand[] = [
    { tick: 0, command: { type: 'assign-skill', lemmingId: 1, skill: 'climber' } },
    { tick: 1, command: { type: 'adjust-release-rate', delta: -1 } },
    { tick: 2, command: { type: 'set-release-rate', rate: 40 } },
    { tick: 3, command: { type: 'nuke' } },
  ];
  const plan = planUndo(commands);
  assert.ok(plan);
  assert.equal(plan.removed.command.type, 'nuke');
  assert.deepEqual(
    plan.remaining.map((c) => c.command.type),
    ['assign-skill', 'adjust-release-rate', 'set-release-rate'],
  );
});

test('undo is repeatable: dropping the last assign-skill/nuke each time until nothing remains', () => {
  let commands: readonly TimedCommand[] = [
    { tick: 0, command: { type: 'assign-skill', lemmingId: 1, skill: 'climber' } },
    { tick: 1, command: { type: 'assign-skill', lemmingId: 2, skill: 'floater' } },
    { tick: 2, command: { type: 'nuke' } },
  ];
  let plan = planUndo(commands);
  assert.equal(plan?.removed.command.type, 'nuke');
  commands = plan!.remaining;

  plan = planUndo(commands);
  assert.equal(plan?.removed.tick, 1); // last assign-skill (floater)
  commands = plan!.remaining;

  plan = planUndo(commands);
  assert.equal(plan?.removed.tick, 0); // last remaining assign-skill (climber)
  commands = plan!.remaining;

  assert.equal(planUndo(commands), null); // nothing left
});

/** Step only until lemming 0 is in an assignable state (no further ticks after that) — mirrors
 * "paused right after the hatch opened", the earliest point a skill can be assigned. */
function stepUntilWalking(session: GameSession, id: number, maxTicks = 300): void {
  for (let i = 0; i < maxTicks; i++) {
    if (session.lemmingById(id)?.state === 'walking') return;
    session.step();
  }
  throw new Error(`lemming ${id} never started walking`);
}

test('a command applied while PAUSED at the CURRENT tick is undoable immediately (session never stepped past it)', () => {
  const level = compiled({ skills: { digger: 3 }, lemmings: 5, saveRequired: 1, entrances: ON_FLOOR });
  const session = new GameSession(level, { seed: 1 });
  stepUntilWalking(session, 0);
  const tickWhenPaused = session.tick;
  // No further session.step() calls: this is "paused", the current tick has not run yet.
  const events = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  assert.equal(events[0]?.type, 'skill-assigned', 'sanity: the assignment must actually be applied, not queued');
  assert.equal(session.skills.digger, 2, 'the count must drop at once, before any tick runs (§6.4.1)');

  // Undo it right now, with the session still at the SAME tick it was recorded at.
  assert.equal(session.tick, tickWhenPaused, 'sanity: applyNow must not itself advance the tick');
  const replay = session.replay();
  const plan = planUndo(replay.commands);
  assert.ok(plan, 'the paused assignment must be found by planUndo');
  assert.equal(plan.removed.tick, session.tick, 'recorded at the current (not-yet-run) tick');

  const rebuilt = rebuildSession(level, replay.seed, replay.relaxedTimer, plan.remaining, session.tick);
  assert.equal(rebuilt.tick, session.tick, 'rebuild lands on the exact same tick — nothing was skipped');
  assert.equal(rebuilt.skills.digger, 3, 'the skill count is restored at once, without running a tick');
});

test('undoing a same-tick paused command does not silently advance the clock/lemmings', () => {
  const level = compiled({ skills: { climber: 2 }, lemmings: 5, saveRequired: 1, entrances: ON_FLOOR });
  const session = new GameSession(level, { seed: 2 });
  stepUntilWalking(session, 0);
  const tickWhenPaused = session.tick;
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'climber' });
  const replay = session.replay();
  const plan = planUndo(replay.commands)!;
  const rebuilt = rebuildSession(level, replay.seed, replay.relaxedTimer, plan.remaining, session.tick);
  assert.equal(rebuilt.tick, tickWhenPaused);
  assert.equal(rebuilt.timeLeftTicks, session.timeLeftTicks, 'the clock must not have ticked forward');
});
