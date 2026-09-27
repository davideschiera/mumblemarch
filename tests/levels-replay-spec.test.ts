/**
 * Independent, spec-derived checks for the campaign levels (B4-V replay-validator).
 *
 * Re-derives two things straight from `docs/design/LEVELS.md` without going through
 * `tests/levels-replay.test.ts` or `LEVEL_SOLUTIONS`' own bookkeeping:
 *
 *  1. The Overview table (LEVELS.md lines ~11-27) — id, save/total, release rate, time limit,
 *     in campaign order — must match the shipped `LevelDef`s exactly. Catches drift between the
 *     design doc and `src/levels/data/*.ts` / `registry.ts`.
 *  2. The "Fairness rules used everywhere" (LEVELS.md lines ~1-10) and the per-level
 *     "SIM landings on the route" verification lines: route drops <= 48 px, spawn drops <= 40 px
 *     for any mumble that SURVIVES a fall (floaters are exempt by design — they can open their
 *     umbrella over any drop), and any splat that does happen lands from a lethal height
 *     (>= 80 px; nothing is meant to be survivable in the 49-79 px gap). Drop is measured the way
 *     LEVELS.md defines it ("Conventions": landing surface y - ledge/spawn surface y), tracked
 *     tick by tick against the real engine while `LEVEL_SOLUTIONS[id]` plays out via
 *     `SolutionDriver` + `GameSession`, exactly as CONTRACTS §3 prescribes. Nothing is mocked.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/core/session.ts';
import type { GameCommand, LemmingState } from '../src/core/types.ts';
import { compileLevel } from '../src/levels/compiler.ts';
import { LEVELS } from '../src/levels/registry.ts';
import { SolutionDriver } from '../src/levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../src/levels/solutions.ts';

const OVERRUN_TICKS = 50;

// ─── 1. Overview table (LEVELS.md lines 11-27), campaign order ───────────────────────────────
const OVERVIEW = [
  { id: 'spade-expectations', save: 5, total: 10, rr: 50, timeSeconds: 300 },
  { id: 'gently-down-the-dome', save: 6, total: 12, rr: 50, timeSeconds: 300 },
  { id: 'bridge-over-troubled-toffee', save: 8, total: 15, rr: 50, timeSeconds: 300 },
  { id: 'the-punch-line', save: 6, total: 12, rr: 50, timeSeconds: 300 },
  { id: 'suction-cup-final', save: 6, total: 12, rr: 50, timeSeconds: 300 },
  { id: 'not-one-step-bogward', save: 9, total: 15, rr: 50, timeSeconds: 300 },
  { id: 'diagonally-yours', save: 14, total: 20, rr: 50, timeSeconds: 300 },
  { id: 'one-pop-wonder', save: 15, total: 20, rr: 50, timeSeconds: 240 },
  { id: 'clam-before-the-storm', save: 28, total: 40, rr: 20, timeSeconds: 300 },
  { id: 'double-boiler', save: 32, total: 40, rr: 50, timeSeconds: 240 },
  { id: 'wrong-side-of-the-hedge', save: 25, total: 30, rr: 50, timeSeconds: 300 },
  { id: 'last-shift-at-the-foundry', save: 45, total: 60, rr: 50, timeSeconds: 360 },
] as const;

test('LEVELS.md Overview table (ids, save/total, RR, time) matches the shipped LevelDefs in campaign order', () => {
  assert.equal(LEVELS.length, OVERVIEW.length, `expected ${OVERVIEW.length} levels, found ${LEVELS.length}`);
  LEVELS.forEach((def, i) => {
    const row = OVERVIEW[i];
    assert.ok(row, `no Overview row for LEVELS[${i}] (${def.id})`);
    assert.equal(def.id, row.id, `campaign order: LEVELS[${i}] is ${def.id}, Overview says ${row.id}`);
    assert.equal(def.saveRequired, row.save, `${def.id}: saveRequired`);
    assert.equal(def.lemmings, row.total, `${def.id}: lemmings (total)`);
    assert.equal(def.releaseRate, row.rr, `${def.id}: releaseRate`);
    assert.equal(def.timeLimitSeconds, row.timeSeconds, `${def.id}: timeLimitSeconds`);
  });
});

// ─── 2. Fairness: landing drops during the intended solution ─────────────────────────────────
const FALL_STATES = new Set<LemmingState>(['falling', 'floating']);
const DEATH_STATES = new Set<LemmingState>(['splatting', 'drowning', 'burning']);
const ROUTE_MAX = 48; // LEVELS.md "Fairness rules used everywhere": route drops <= 48 px
const SPAWN_MAX = 40; // ...(spawn <= 40 px)
const LETHAL_MIN = 80; // ...lethal drops >= 80 px; nothing survivable in 49-79 px

interface Landing {
  readonly origin: 'spawn' | 'ledge';
  readonly drop: number;
  readonly endState: LemmingState;
  readonly isFloater: boolean;
}

/** Plays LEVEL_SOLUTIONS[id] through SolutionDriver + GameSession (CONTRACTS §3 order) and
 * records every landing (falling/floating -> some other state), tagged with how the fall began
 * (spawn vs. a mid-route ledge) and the drop, exactly as LEVELS.md's "Conventions" define it
 * (landing surface y - ledge/spawn surface y). */
function recordLandings(def: (typeof LEVELS)[number]): { won: boolean; saved: number; required: number; landings: readonly Landing[] } {
  const level = compileLevel(def);
  const session = new GameSession(level);
  const script = LEVEL_SOLUTIONS[def.id];
  assert.ok(script, `${def.id}: no LEVEL_SOLUTIONS entry`);
  const driver = new SolutionDriver(script);
  const landings: Landing[] = [];

  const fallStart = new Map<number, number>();
  const origin = new Map<number, 'spawn' | 'ledge'>();
  const prevState = new Map<number, LemmingState>();
  const prevY = new Map<number, number>();

  const maxTicks = level.timeLimitTicks + OVERRUN_TICKS;
  while (session.status === 'running' && session.tick <= maxTicks) {
    const commands: GameCommand[] = driver.commandsFor(session, (id, skill) => session.checkAssign(id, skill));
    for (const command of commands) session.applyNow(command);

    const events = session.step();
    for (const event of events) {
      if (event.type === 'lemming-spawned') {
        fallStart.set(event.lemmingId, event.y);
        origin.set(event.lemmingId, 'spawn');
      }
    }
    for (const lem of session.lemmings) {
      const before = prevState.get(lem.id);
      const wasInFall = before !== undefined && FALL_STATES.has(before);
      const nowInFall = FALL_STATES.has(lem.state);
      if (before !== undefined && !FALL_STATES.has(before) && nowInFall) {
        fallStart.set(lem.id, prevY.get(lem.id)!);
        origin.set(lem.id, 'ledge');
      } else if (wasInFall && !nowInFall) {
        const start = fallStart.get(lem.id);
        if (start !== undefined) {
          landings.push({ origin: origin.get(lem.id) ?? 'ledge', drop: lem.y - start, endState: lem.state, isFloater: lem.isFloater });
        }
        fallStart.delete(lem.id);
      }
      prevState.set(lem.id, lem.state);
      prevY.set(lem.id, lem.y);
    }
  }

  return { won: session.outcome?.won === true, saved: session.counts.saved, required: level.saveRequired, landings };
}

LEVELS.forEach((def) => {
  test(`fairness ${def.id}: intended-solution landings respect LEVELS.md drop margins (route <= ${ROUTE_MAX}px, spawn <= ${SPAWN_MAX}px non-floater; splats only from >= ${LETHAL_MIN}px)`, () => {
    const r = recordLandings(def);
    assert.equal(r.won, true, `${def.id}: intended solution must win to be a meaningful fairness sample`);
    assert.ok(r.saved >= r.required, `${def.id}: saved < required`);

    for (const l of r.landings) {
      if (DEATH_STATES.has(l.endState)) {
        if (l.endState === 'splatting') {
          assert.ok(
            l.drop >= LETHAL_MIN,
            `${def.id}: a splat happened from only ${l.drop}px (origin ${l.origin}) — below the ${LETHAL_MIN}px lethal margin LEVELS.md relies on`,
          );
        }
        continue; // drown/burn are hazard contact, not fall-height governed
      }
      if (l.isFloater) continue; // floaters are exempt from the drop margins by design
      const limit = l.origin === 'spawn' ? SPAWN_MAX : ROUTE_MAX;
      assert.ok(
        l.drop <= limit,
        `${def.id}: a surviving non-floater ${l.origin} landing dropped ${l.drop}px (limit ${limit}px)`,
      );
    }
  });
});
