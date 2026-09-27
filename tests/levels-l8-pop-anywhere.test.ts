/**
 * PLAY-A1 regression: "One-Pop Wonder" must stay winnable no matter where in the hopper the
 * bomber pops, or when. The bug was that a pop directly under the hatch's drop column (x≈124)
 * opened the hopper floor right where later spawns fall, so every later mumble fell the full
 * 80 px to the works floor and splatted (unwinnable). The fix (`src/levels/data/one-pop-wonder.ts`)
 * adds a small steel patch (x 120–128) under the hatch inside the hopper floor: steel is never
 * removed by an explosion (`EXPLOSION_MASK`, `src/core/behaviours/bomb.ts`), so a fresh spawn at
 * x=124 always has 32 px of solid footing under it, whatever the rest of the floor looks like.
 *
 * This sweeps the whole 44 px hopper (every 3 px) and a wide spread of pop times (from the very
 * first mumble through well into the release), each time bombing whichever walking mumble is
 * first found near that x, then playing the intended basher step (`LEVEL_SOLUTIONS`'s own
 * x=316 basher) so the level is actually winnable, not just "not-unsafe".
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameSession } from '../src/core/session.ts';
import type { CompiledLevel } from '../src/core/types.ts';
import { compileLevel } from '../src/levels/compiler.ts';
import { onePopWonderLevel } from '../src/levels/data/one-pop-wonder.ts';
import { SolutionDriver } from '../src/levels/solution-driver.ts';

const HOPPER_X_MIN = 104;
const HOPPER_X_MAX = 147;
const X_STEP = 3;
const POP_TICKS = [0, 1, 20, 50, 100, 200, 300, 400, 600, 800, 1200];
const SAVE_REQUIRED = onePopWonderLevel.saveRequired; // 15
const SPAWN_DROP_MAX = 40; // LEVELS.md "Fairness rules used everywhere": spawn drops <= 40 px

interface Run {
  readonly bombed: boolean;
  readonly saved: number;
  readonly won: boolean;
  readonly worstSpawnDrop: number;
  readonly splats: number;
}

/**
 * Bombs the first walking mumble found within +-1px of `targetX`, at or after `targetTick`
 * ("pops wherever it stands" — position is approximate, exactly like a player clicking a body
 * that happens to be near that spot), then runs the intended basher step from
 * `LEVEL_SOLUTIONS['one-pop-wonder']` every tick so the crowd can actually reach the exit.
 */
function runPopAt(level: CompiledLevel, targetX: number, targetTick: number): Run {
  const session = new GameSession(level);
  const driver = new SolutionDriver({ assignments: [{ skill: 'basher', x: 316, dir: 1, ymin: 100 }] });
  let bombed = false;
  const spawnY = new Map<number, number>();
  const landed = new Set<number>();
  let worstSpawnDrop = 0;
  let splats = 0;
  const maxTicks = level.timeLimitTicks + 50;

  while (session.status === 'running' && session.tick <= maxTicks) {
    for (const command of driver.commandsFor(session, (id, skill) => session.checkAssign(id, skill))) {
      session.applyNow(command);
    }
    if (!bombed && session.tick >= targetTick) {
      for (const lem of session.lemmings) {
        if (lem.removed || lem.state !== 'walking') continue;
        if (Math.abs(lem.x - targetX) > 1) continue;
        if (session.checkAssign(lem.id, 'bomber') !== null) continue;
        session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'bomber' });
        bombed = true;
        break;
      }
    }
    const events = session.step();
    for (const e of events) {
      if (e.type === 'lemming-spawned') spawnY.set(e.lemmingId, e.y);
      if (e.type === 'lemming-died' && e.cause === 'splat') splats++;
    }
    for (const lem of session.lemmings) {
      if (!landed.has(lem.id) && spawnY.has(lem.id) && lem.state === 'walking') {
        worstSpawnDrop = Math.max(worstSpawnDrop, lem.y - spawnY.get(lem.id)!);
        landed.add(lem.id);
      }
    }
  }

  return { bombed, saved: session.counts.saved, won: session.outcome?.won === true, worstSpawnDrop, splats };
}

test('L8 one-pop-wonder: a bomber popped anywhere in the hopper, at any time, still saves >= required with no lethal spawn drop', () => {
  const level = compileLevel(onePopWonderLevel);
  let cases = 0;
  for (let x = HOPPER_X_MIN; x <= HOPPER_X_MAX; x += X_STEP) {
    for (const t of POP_TICKS) {
      const r = runPopAt(level, x, t);
      if (!r.bombed) continue; // no walker was near x at/after t in this run; not a real case
      cases++;
      assert.ok(
        r.worstSpawnDrop <= SPAWN_DROP_MAX,
        `pop at x=${x} t=${t}: a spawn fell ${r.worstSpawnDrop}px (limit ${SPAWN_DROP_MAX}px) — the hatch column is not safe`,
      );
      assert.ok(r.saved >= SAVE_REQUIRED, `pop at x=${x} t=${t}: only saved ${r.saved}/${SAVE_REQUIRED} required`);
      assert.equal(r.won, true, `pop at x=${x} t=${t}: level did not register as won (saved ${r.saved})`);
    }
  }
  assert.ok(cases > 100, `expected a broad sweep, only exercised ${cases} cases`);
});

test('L8 one-pop-wonder: the exact bug-report scenario (pop at x=129 right after the first mumble lands) is now safe', () => {
  const level = compileLevel(onePopWonderLevel);
  const r = runPopAt(level, 129, 0);
  assert.equal(r.bombed, true);
  assert.equal(r.splats, 0, 'no splats should occur from a pop under the hatch column');
  assert.ok(r.worstSpawnDrop <= SPAWN_DROP_MAX, `worst spawn drop ${r.worstSpawnDrop}px exceeds ${SPAWN_DROP_MAX}px`);
  assert.ok(r.saved >= SAVE_REQUIRED, `saved ${r.saved} < required ${SAVE_REQUIRED}`);
  assert.equal(r.won, true);
});
