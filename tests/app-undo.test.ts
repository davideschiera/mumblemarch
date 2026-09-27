/**
 * Undo mechanics (DESIGN §6.4.7), DOM-free: `planUndo` finds and drops the LAST
 * `assign-skill`/`nuke` command (keeping every RR command, and any earlier assignment), and
 * `rebuildSession` replays what remains to the same tick.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/core/session.ts';
import type { TimedCommand } from '../src/core/types.ts';
import { planUndo, rebuildSession } from '../src/app/game/undo-commands.ts';
import { compiled, FLOOR_Y } from './helpers.ts';

/** The default test level's entrance (40, 20) is a lethal 130 px fall onto the floor at 150; put it on the floor instead. */
const ON_FLOOR = [{ x: 40, y: FLOOR_Y }];

function stepUntilWalking(session: GameSession, id: number, maxTicks = 300): void {
  for (let i = 0; i < maxTicks; i++) {
    if (session.lemmingById(id)?.state === 'walking') return;
    session.step();
  }
  throw new Error(`lemming ${id} never started walking`);
}

test('planUndo: nothing to undo when only release-rate commands were issued', () => {
  const commands: TimedCommand[] = [
    { tick: 0, command: { type: 'set-release-rate', rate: 60 } },
    { tick: 3, command: { type: 'adjust-release-rate', delta: -1 } },
  ];
  assert.equal(planUndo(commands), null);
});

test('planUndo: drops the LAST assign-skill/nuke only, keeping an earlier one and every RR command', () => {
  const commands: TimedCommand[] = [
    { tick: 0, command: { type: 'assign-skill', lemmingId: 1, skill: 'climber' } },
    { tick: 1, command: { type: 'set-release-rate', rate: 70 } },
    { tick: 2, command: { type: 'nuke' } },
  ];
  const plan = planUndo(commands);
  assert.deepEqual(plan?.removed, commands[2]);
  assert.deepEqual(plan?.remaining, [commands[0], commands[1]]);
});

test('undo: rebuilding on the remaining commands restores the skill count and keeps the RR change', () => {
  const level = compiled({ skills: { digger: 2, basher: 1 }, lemmings: 5, saveRequired: 1, releaseRate: 30, entrances: ON_FLOOR });
  const session = new GameSession(level, { seed: 7 });
  stepUntilWalking(session, 0);

  session.applyNow({ type: 'adjust-release-rate', delta: 5 }); // RR command — must survive the undo
  const [assigned] = session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  assert.equal(assigned?.type, 'skill-assigned'); // sanity: not refused, so it was actually consumed
  assert.equal(session.skills.digger, 1);
  for (let i = 0; i < 5; i++) session.step();

  const replay = session.replay();
  const plan = planUndo(replay.commands);
  assert.ok(plan, 'an assign-skill command should be found');
  assert.equal(plan.removed.command.type, 'assign-skill');
  assert.equal(
    plan.remaining.some((c) => c.command.type === 'assign-skill'),
    false,
  );
  assert.equal(
    plan.remaining.some((c) => c.command.type === 'adjust-release-rate'),
    true,
  );

  const rebuilt = rebuildSession(level, replay.seed, replay.relaxedTimer, plan.remaining, session.tick);
  assert.equal(rebuilt.tick, session.tick); // headless to the SAME tick
  assert.equal(rebuilt.skills.digger, 2); // the skill count is back to what it was (+1)
  assert.equal(rebuilt.skills.basher, 1); // untouched skills unaffected
  assert.equal(rebuilt.releaseRate, session.releaseRate); // RR command re-applied
});

test('undo is repeatable: two assignments, two undos, back to the start (last assigned, first undone)', () => {
  const level = compiled({ skills: { climber: 5, floater: 5 }, lemmings: 5, saveRequired: 1, entrances: ON_FLOOR });
  let session = new GameSession(level, { seed: 3 });
  stepUntilWalking(session, 0);
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'climber' });
  session.applyNow({ type: 'assign-skill', lemmingId: 0, skill: 'floater' }); // Climber + Floater stacks
  assert.equal(session.skills.climber, 4);
  assert.equal(session.skills.floater, 4);

  const undoOnce = (s: GameSession): GameSession => {
    const replay = s.replay();
    const plan = planUndo(replay.commands);
    assert.ok(plan, 'expected something to undo');
    return rebuildSession(level, replay.seed, replay.relaxedTimer, plan.remaining, s.tick);
  };

  session = undoOnce(session);
  assert.equal(session.skills.floater, 5); // the most recent assignment is undone first
  assert.equal(session.skills.climber, 4); // the earlier one is untouched

  session = undoOnce(session);
  assert.equal(session.skills.climber, 5); // fully back to the start
  assert.equal(planUndo(session.replay().commands), null); // nothing left to undo
});
