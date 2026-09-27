/**
 * Headless tests for SolutionDriver: no session/physics involved — a fake GameView and a fake
 * checkAssign the test controls directly, mirroring the assignment-loop semantics of
 * docs/design/mockups/levels-preview.html (`matches()` + the per-tick assignment pass).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import type { GameCommand, GameView, Lemming, Rejection, SkillId } from '../src/core/types.ts';
import { SolutionDriver, type SolutionScript } from '../src/levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../src/levels/solutions.ts';

// ─── Fixtures ───────────────────────────────────────────────────────────────────────────────

function lem(id: number, overrides: Partial<Lemming> = {}): Lemming {
  return {
    id,
    x: 0,
    y: 0,
    dir: 1,
    state: 'walking',
    stateTicks: 0,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 0,
    removed: false,
    ...overrides,
  };
}

/** Only `tick`, `lemmings` and `skills` are read by the driver — everything else is unused. */
function view(tick: number, lemmings: readonly Lemming[], skills: Partial<Record<SkillId, number>> = {}): GameView {
  return { tick, lemmings, skills } as unknown as GameView;
}

const noReject = (): Rejection | null => null;

function assignedIds(commands: readonly GameCommand[]): number[] {
  return commands.filter((c) => c.type === 'assign-skill').map((c) => c.lemmingId);
}

// ─── releaseRate ────────────────────────────────────────────────────────────────────────────

test('releaseRate is emitted once, first, on the first call only', () => {
  const script: SolutionScript = { releaseRate: 73, assignments: [{ skill: 'digger', idx: 0 }] };
  const driver = new SolutionDriver(script);
  const v = view(0, [lem(0)], { digger: 5 });

  const first = driver.commandsFor(v, noReject);
  assert.deepEqual(first[0], { type: 'set-release-rate', rate: 73 });
  assert.deepEqual(first[1], { type: 'assign-skill', lemmingId: 0, skill: 'digger' });
  assert.equal(first.length, 2);

  const second = driver.commandsFor(view(1, [lem(0)], { digger: 5 }), noReject);
  assert.deepEqual(second, []); // no release-rate again, and the step is already done
});

test('no releaseRate command is ever emitted when the script omits it', () => {
  const script: SolutionScript = { assignments: [{ skill: 'digger', idx: 0 }] };
  const driver = new SolutionDriver(script);
  const commands = driver.commandsFor(view(0, [lem(0)], { digger: 5 }), noReject);
  assert.ok(commands.every((c) => c.type !== 'set-release-rate'));
});

// ─── condition fields ───────────────────────────────────────────────────────────────────────

test('idx matches only that lemming id', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', idx: 2 }] });
  const lemmings = [lem(0), lem(1), lem(2), lem(3)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [2]);
});

test('minIdx matches lemmings with id >= minIdx', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', minIdx: 2 }] });
  const lemmings = [lem(0), lem(1), lem(2), lem(3)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [2]); // first eligible in release order
});

test('x matches an exact x position', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', x: 100 }] });
  const lemmings = [lem(0, { x: 50 }), lem(1, { x: 100 }), lem(2, { x: 150 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('xmin matches x >= xmin', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', xmin: 100 }] });
  const lemmings = [lem(0, { x: 50 }), lem(1, { x: 100 }), lem(2, { x: 150 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('xmax matches x <= xmax', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', xmax: 100 }] });
  const lemmings = [lem(0, { x: 150 }), lem(1, { x: 100 }), lem(2, { x: 50 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]); // id 2 (x:50) also matches but id 1 comes first
});

test('dir matches facing direction', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', dir: -1 }] });
  const lemmings = [lem(0, { dir: 1 }), lem(1, { dir: -1 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('ymin matches y >= ymin', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', ymin: 100 }] });
  const lemmings = [lem(0, { y: 50 }), lem(1, { y: 100 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('ymax matches y <= ymax', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', ymax: 100 }] });
  const lemmings = [lem(0, { y: 150 }), lem(1, { y: 100 })];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('state matches the lemming state', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'floater', state: 'falling' }] });
  const lemmings = [lem(0, { state: 'walking' }), lem(1, { state: 'falling' })];
  const commands = driver.commandsFor(view(0, lemmings, { floater: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

test('after gates on view.tick', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', idx: 0, after: 10 }] });
  const before = driver.commandsFor(view(5, [lem(0)], { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(before), []);
  const after = driver.commandsFor(view(10, [lem(0)], { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(after), [0]);
});

test('afterSkill gates on another step being done, including same-call chaining', () => {
  const driver = new SolutionDriver({
    assignments: [
      { skill: 'climber', idx: 0 },
      { skill: 'basher', idx: 1, afterSkill: 0 },
    ],
  });
  const lemmings = [lem(0), lem(1)];
  // Step 0 fires and step 1 sees it done in the very same call.
  const commands = driver.commandsFor(view(0, lemmings, { climber: 5, basher: 5 }), noReject);
  assert.deepEqual(commands, [
    { type: 'assign-skill', lemmingId: 0, skill: 'climber' },
    { type: 'assign-skill', lemmingId: 1, skill: 'basher' },
  ]);
});

test('afterSkill blocks a step until the dependency has fired, in an earlier call', () => {
  const driver = new SolutionDriver({
    assignments: [
      { skill: 'climber', idx: 5 }, // never matches: no lemming id 5 in this fixture
      { skill: 'basher', idx: 1, afterSkill: 0 },
    ],
  });
  const lemmings = [lem(0), lem(1)];
  const commands = driver.commandsFor(view(0, lemmings, { climber: 5, basher: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), []); // step 0 never fires, so step 1 stays gated
});

test('target matches the lemming a previous step assigned (by id), across calls', () => {
  const driver = new SolutionDriver({
    assignments: [
      { skill: 'blocker', idx: 1 },
      { skill: 'bomber', target: 0 },
    ],
  });
  const lemmings = [lem(0), lem(1)];
  const first = driver.commandsFor(view(0, lemmings, { blocker: 5, bomber: 5 }), noReject);
  assert.deepEqual(first, [{ type: 'assign-skill', lemmingId: 1, skill: 'blocker' }]);

  // Later call: `target: 0` now resolves to lemming 1 (step 0's `who`), not lemming 0.
  const second = driver.commandsFor(view(1, lemmings, { blocker: 5, bomber: 5 }), noReject);
  assert.deepEqual(second, [{ type: 'assign-skill', lemmingId: 1, skill: 'bomber' }]);
});

// ─── count / seen ───────────────────────────────────────────────────────────────────────────

test('count assigns to several different lemmings, across ticks, and never re-targets one it already targeted', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'climber', count: 5, minIdx: 0 }] });
  const lemmings = [lem(0), lem(1), lem(2)]; // only 3 exist, even though count asks for 5

  const first = driver.commandsFor(view(0, lemmings, { climber: 5 }), noReject);
  assert.deepEqual(assignedIds(first), [0, 1, 2]);
  assert.equal(driver.progress[0]?.left, 2);

  // Same 3 lemmings still match and checkAssign still allows them, but `seen` must stop re-targeting.
  const second = driver.commandsFor(view(1, lemmings, { climber: 5 }), noReject);
  assert.deepEqual(assignedIds(second), []);
  assert.equal(driver.progress[0]?.left, 2); // still stuck: no new lemmings ever appear
});

test('a finished step (left reaches 0) never fires again', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', idx: 0 }] });
  const lemmings = [lem(0)];
  const first = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(first), [0]);
  assert.equal(driver.progress[0]?.left, 0);

  const second = driver.commandsFor(view(1, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(second), []);
});

// ─── taken ──────────────────────────────────────────────────────────────────────────────────

test('two steps in one call never pick the same lemming; the second picks the next eligible one', () => {
  const driver = new SolutionDriver({
    assignments: [
      { skill: 'climber', minIdx: 0 },
      { skill: 'floater', minIdx: 0 },
    ],
  });
  const lemmings = [lem(0), lem(1)];
  const commands = driver.commandsFor(view(0, lemmings, { climber: 5, floater: 5 }), noReject);
  assert.deepEqual(commands, [
    { type: 'assign-skill', lemmingId: 0, skill: 'climber' },
    { type: 'assign-skill', lemmingId: 1, skill: 'floater' },
  ]);
});

// ─── budget ─────────────────────────────────────────────────────────────────────────────────

test('the skill budget is shared across steps within one call, including this call\'s own issuance', () => {
  const driver = new SolutionDriver({
    assignments: [
      { skill: 'digger', idx: 0 },
      { skill: 'digger', idx: 1 },
    ],
  });
  const lemmings = [lem(0), lem(1)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 1 }), noReject);
  assert.deepEqual(commands, [{ type: 'assign-skill', lemmingId: 0, skill: 'digger' }]);
  assert.equal(driver.progress[0]?.overBudget, false);
  assert.equal(driver.progress[1]?.overBudget, true);
  assert.equal(driver.progress[1]?.left, 1); // never consumed
});

// ─── checkAssign rejection ──────────────────────────────────────────────────────────────────

test('a checkAssign rejection skips that lemming and tries the next eligible one', () => {
  const reject: Rejection = { reason: 'not-applicable' };
  const checkAssign = (lemmingId: number): Rejection | null => (lemmingId === 0 ? reject : null);
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', minIdx: 0 }] });
  const lemmings = [lem(0), lem(1)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), checkAssign);
  assert.deepEqual(assignedIds(commands), [1]);
});

// ─── release order / removed ────────────────────────────────────────────────────────────────

test('lemmings are scanned in ascending id (release) order even when given out of order', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', minIdx: 0 }] });
  const lemmings = [lem(5), lem(2), lem(0), lem(9)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [0]);
});

test('removed lemmings are skipped', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', minIdx: 0 }] });
  const lemmings = [lem(0, { removed: true }), lem(1)];
  const commands = driver.commandsFor(view(0, lemmings, { digger: 5 }), noReject);
  assert.deepEqual(assignedIds(commands), [1]);
});

// ─── data: LEVEL_SOLUTIONS matches the mockup ──────────────────────────────────────────────

test('LEVEL_SOLUTIONS matches window.MUMBLE_SOLUTIONS from the mockup data file', () => {
  const dataPath = fileURLToPath(new URL('../docs/design/mockups/levels-data.js', import.meta.url));
  const source = readFileSync(dataPath, 'utf8');
  const sandbox = { window: {} as Record<string, unknown> };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const mockSolutions = sandbox.window['MUMBLE_SOLUTIONS'];
  assert.ok(mockSolutions && typeof mockSolutions === 'object');
  assert.equal(Object.keys(mockSolutions as object).length, 12);
  assert.equal(Object.keys(LEVEL_SOLUTIONS).length, 12);

  // JSON-normalise both sides (drops `undefined`-valued keys / function props, orders nothing).
  assert.deepEqual(JSON.parse(JSON.stringify(LEVEL_SOLUTIONS)), JSON.parse(JSON.stringify(mockSolutions)));
});
