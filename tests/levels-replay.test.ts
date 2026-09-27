/**
 * One headless replay per campaign level (LEVELS.md note 12 / App. E.5 L12): the intended
 * solution from `LEVEL_SOLUTIONS` is driven through `SolutionDriver` + `GameSession` exactly as
 * CONTRACTS §3 prescribes (commandsFor → applyNow each, BEFORE every step) until the level ends.
 *
 * Per level it asserts the LEVELS.md fairness rules that the design sim checked:
 *  - the intended solution wins (saved ≥ required), every scripted step really fired (so the
 *    solution that won is the intended one) and no scripted assignment was refused;
 *  - the last mumble is home within half the time limit (limit ≥ 2 × last home);
 *  - doing nothing does NOT reach the requirement, at the level's release rate and at RR 99.
 * Failure messages carry the full diagnostics (saved, deaths, assignment log, driver progress).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/core/session.ts';
import type { DeathCause, GameEvent, LevelOutcome, SkillId } from '../src/core/types.ts';
import { compileLevel } from '../src/levels/compiler.ts';
import type { LevelDef } from '../src/levels/format.ts';
import { LEVELS } from '../src/levels/registry.ts';
import { SolutionDriver, type SolutionStepProgress } from '../src/levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../src/levels/solutions.ts';

/** Extra ticks past the time limit before a run is cut off (the session ends itself at time-up). */
const OVERRUN_TICKS = 50;

interface PlayResult {
  readonly outcome: LevelOutcome | null;
  readonly endTick: number;
  readonly saved: number;
  readonly required: number;
  readonly total: number;
  readonly timeLimitTicks: number;
  readonly goalTick: number | null;
  readonly lastExitTick: number | null;
  readonly deaths: Partial<Record<DeathCause, number>>;
  readonly assignments: readonly string[];
  readonly rejections: readonly string[];
  readonly progress: readonly SolutionStepProgress[];
}

function play(def: LevelDef, mode: { readonly solution: boolean; readonly releaseRate?: number }): PlayResult {
  const level = compileLevel(def);
  const session = new GameSession(level);
  const script = LEVEL_SOLUTIONS[def.id];
  const driver = mode.solution && script ? new SolutionDriver(script) : null;
  const deaths: Partial<Record<DeathCause, number>> = {};
  const assignments: string[] = [];
  const rejections: string[] = [];
  let goalTick: number | null = null;
  let lastExitTick: number | null = null;

  const note = (event: GameEvent, tick: number): void => {
    if (event.type === 'lemming-died') deaths[event.cause] = (deaths[event.cause] ?? 0) + 1;
    else if (event.type === 'goal-reached' && goalTick === null) goalTick = tick;
    else if (event.type === 'lemming-exited') lastExitTick = tick;
  };
  const assigned = (lemmingId: number, skill: SkillId, tick: number): void => {
    const lem = session.lemmingById(lemmingId);
    assignments.push(`${skill}#${lemmingId}@t${tick}(${lem?.x},${lem?.y},${lem?.dir})`);
  };

  if (mode.releaseRate !== undefined) session.applyNow({ type: 'set-release-rate', rate: mode.releaseRate });
  const maxTicks = level.timeLimitTicks + OVERRUN_TICKS;
  while (session.status === 'running' && session.tick <= maxTicks) {
    if (driver) {
      for (const command of driver.commandsFor(session, (id, skill) => session.checkAssign(id, skill))) {
        for (const event of session.applyNow(command)) {
          if (event.type === 'skill-assigned') assigned(event.lemmingId, event.skill, session.tick);
          else if (event.type === 'skill-rejected') {
            rejections.push(`${event.skill}#${event.lemmingId}@t${session.tick}: ${event.reason}/${event.detail ?? '-'}`);
          } else note(event, session.tick);
        }
      }
    }
    const tick = session.tick;
    for (const event of session.step()) note(event, tick);
  }

  return {
    outcome: session.outcome,
    endTick: session.tick,
    saved: session.counts.saved,
    required: level.saveRequired,
    total: level.lemmingCount,
    timeLimitTicks: level.timeLimitTicks,
    goalTick,
    lastExitTick,
    deaths,
    assignments,
    rejections,
    progress: driver ? driver.progress : [],
  };
}

function describeRun(label: string, r: PlayResult): string {
  return [
    `${label}: saved ${r.saved}/${r.required} (of ${r.total}), ended ${r.outcome ? `${r.outcome.reason} won=${r.outcome.won}` : 'NOT ENDED'} at tick ${r.endTick}`,
    `  goal tick ${r.goalTick ?? '-'}, last exit tick ${r.lastExitTick ?? '-'}, limit ${r.timeLimitTicks} ticks`,
    `  deaths ${JSON.stringify(r.deaths)}`,
    `  assignments ${r.assignments.join(' ') || '(none)'}`,
    `  rejections ${r.rejections.join(' ') || '(none)'}`,
    `  driver progress ${JSON.stringify(r.progress)}`,
  ].join('\n');
}

test('every registered level has a solution script', () => {
  assert.deepEqual(
    LEVELS.map((def) => def.id).filter((id) => !LEVEL_SOLUTIONS[id]),
    [],
    'levels without LEVEL_SOLUTIONS entry',
  );
});

LEVELS.forEach((def, index) => {
  test(`replay L${index + 1} ${def.id}: intended solution wins in time; doing nothing fails at RR ${def.releaseRate} and RR 99`, () => {
    const sol = play(def, { solution: true });
    const info = describeRun('solution', sol);

    // 1. The intended solution wins.
    assert.ok(sol.outcome, `level did not end\n${info}`);
    assert.equal(sol.outcome.won, true, `solution did not win\n${info}`);
    assert.ok(sol.saved >= sol.required, `saved < required\n${info}`);

    // 2. It is the intended solution: every step fired in full, nothing was refused or over budget.
    assert.ok(sol.progress.length > 0, `no driver progress\n${info}`);
    for (const [i, step] of sol.progress.entries()) {
      assert.equal(step.left, 0, `step ${i} did not fire completely\n${info}`);
      assert.equal(step.overBudget, false, `step ${i} ran over the skill budget\n${info}`);
    }
    assert.deepEqual(sol.rejections, [], `a scripted assignment was refused\n${info}`);

    // 3. Time sanity (LEVELS.md fairness): last mumble home within half the time limit.
    assert.notEqual(sol.goalTick, null, `goal-reached never fired\n${info}`);
    assert.ok(sol.lastExitTick !== null && sol.lastExitTick <= sol.timeLimitTicks / 2, `last exit after half the time limit\n${info}`);

    // 4–5. Doing nothing never reaches the requirement, at the level's RR and at RR 99.
    for (const releaseRate of [def.releaseRate, 99]) {
      const idle = play(def, { solution: false, releaseRate });
      const idleInfo = describeRun(`no skills @ RR ${releaseRate}`, idle);
      assert.ok(idle.saved < idle.required, `doing nothing reaches the requirement\n${idleInfo}`);
      assert.notEqual(idle.outcome?.won, true, `doing nothing wins\n${idleInfo}`);
    }
  });
});
