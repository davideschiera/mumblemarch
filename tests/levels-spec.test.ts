/**
 * INDEPENDENT spec validation for workstream B ("levels"), task B23-V.
 *
 * These tests are derived from the SPEC — docs/design/LEVELS.md, docs/development/CONTRACTS.md
 * §3, and the assignment-loop semantics of docs/design/mockups/levels-preview.html — and checked
 * against the implementation (src/levels/data/*.ts, registry.ts, solutions.ts,
 * solution-driver.ts). They do not import expectations from the implementation's own tests
 * (tests/levels-data.test.ts, tests/levels-solution-driver.test.ts); LEVELS.md is parsed here
 * from scratch.
 *
 * No physics/session dependency: the driver tests use fake GameView objects only.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import type { Direction, GameCommand, GameView, Lemming, Rejection, SkillId } from '../src/core/types.ts';
import { LEMMING_STATES, SKILL_IDS } from '../src/core/types.ts';
import type { LevelDef } from '../src/levels/format.ts';
import { getLevel, LEVELS, nextLevel, TIERS } from '../src/levels/registry.ts';
import { SolutionDriver, type SolutionScript, type SolutionStep } from '../src/levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../src/levels/solutions.ts';
import { STAMPS } from '../src/levels/stamps.ts';
import { THEME_IDS } from '../src/levels/themes.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Same technique as the existing suite: normalise vm-sandbox values to same-realm plain data. */
const plain = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

// ─── Parse docs/design/LEVELS.md ourselves (independent of levels-data.js) ─────────────────

const levelsMdPath = path.join(root, 'docs/design/LEVELS.md');
const levelsMd = readFileSync(levelsMdPath, 'utf8');

interface OverviewRow {
  readonly id: string;
  readonly title: string;
  readonly tier: number;
  readonly tierName: string;
  readonly theme: string;
  readonly skills: Readonly<Record<string, number>>;
  readonly saveRequired: number;
  readonly lemmings: number;
  readonly width: number;
  readonly releaseRate: number;
  readonly timeLimitSeconds: number;
}

function parseOverviewTable(md: string): OverviewRow[] {
  const block = md.match(/## Overview\n\n([\s\S]*?)\n\n### Difficulty curve/);
  assert.ok(block, 'Overview table not found in LEVELS.md');
  const lines = block[1]!.split('\n').filter((l) => l.startsWith('|')).slice(2); // drop header + separator
  return lines.map((line) => {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const id = (cells[1] ?? '').replace(/`/g, '');
    const title = cells[2] ?? '';
    const tierParts = (cells[3] ?? '').split(' ');
    const tier = Number(tierParts[0]);
    const tierName = tierParts.slice(1).join(' ');
    const theme = cells[4] ?? '';
    const skillsCell = cells[6] ?? '';
    const skills: Record<string, number> = {};
    if (!skillsCell.startsWith('—')) {
      for (const part of skillsCell.split(',')) {
        const m = part.trim().match(/^([A-Za-z]+)\s+(\d+)$/);
        assert.ok(m, `${id}: unparseable skills cell part "${part}"`);
        skills[m[1]!.toLowerCase()] = Number(m[2]);
      }
    }
    const saveTotal = (cells[7] ?? '').match(/^(\d+)\/(\d+)/);
    assert.ok(saveTotal, `${id}: unparseable save/total cell "${cells[7]}"`);
    const width = Number(cells[8]);
    const releaseRate = Number(cells[9]);
    const timeLimitSeconds = Number((cells[10] ?? '').replace(' s', ''));
    return {
      id,
      title,
      tier,
      tierName,
      theme,
      skills,
      saveRequired: Number(saveTotal[1]),
      lemmings: Number(saveTotal[2]),
      width,
      releaseRate,
      timeLimitSeconds,
    };
  });
}

const overviewRows = parseOverviewTable(levelsMd);

interface LevelSection {
  readonly id: string;
  readonly draftText: string;
  readonly solutionValue: unknown;
}

function parseLevelSections(md: string): LevelSection[] {
  const headerRe = /^## \d+\. .+? — `([a-z0-9-]+)`$/gm;
  const starts: { id: string; index: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(md))) starts.push({ id: m[1]!, index: m.index });
  const stampsIndex = md.indexOf('\n## Proposed stamps');
  assert.ok(starts.length > 0 && stampsIndex > 0, 'level section headers not found');
  return starts.map((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1]!.index : stampsIndex;
    const text = md.slice(s.index, end);
    const solutionMatch = text.match(/<summary>Sim solution data<\/summary>\s*\n\n```js\n([\s\S]*?)\n```/);
    assert.ok(solutionMatch, `${s.id}: no "Sim solution data" block found`);
    const draftMatch = text.match(
      /\*\*Draft `LevelDef`\*\* → `src\/levels\/data\/([a-z0-9-]+)\.ts`\n\n```ts\n([\s\S]*?)\n```/,
    );
    assert.ok(draftMatch, `${s.id}: no "Draft LevelDef" block found`);
    assert.equal(draftMatch[1], s.id, `${s.id}: Draft LevelDef path id mismatches section header id`);
    const solutionValue = vm.runInNewContext(`(${solutionMatch[1]})`);
    return { id: s.id, draftText: draftMatch[2]!, solutionValue };
  });
}

const levelSections = parseLevelSections(levelsMd);

/** Trailing whitespace / final-newline differences only; content must otherwise match exactly. */
const normalise = (text: string): string =>
  text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\s+$/, '');

// ─── Load the mockup data file (docs/design/mockups/levels-data.js) via vm ─────────────────

const mockupPath = path.join(root, 'docs/design/mockups/levels-data.js');
const mockupSource = readFileSync(mockupPath, 'utf8');
const sandbox: { window: Record<string, unknown> } = { window: {} };
vm.createContext(sandbox);
vm.runInContext(mockupSource, sandbox, { filename: mockupPath });
const MUMBLE_LEVELS = sandbox.window['MUMBLE_LEVELS'] as readonly LevelDef[];
const MUMBLE_SOLUTIONS = sandbox.window['MUMBLE_SOLUTIONS'] as Readonly<Record<string, SolutionScript>>;

// ══ 1. Data fidelity ════════════════════════════════════════════════════════════════════════

test('LEVELS.md has 12 level sections, in Overview order, matching the registry order', () => {
  assert.equal(levelSections.length, 12);
  assert.equal(overviewRows.length, 12);
  assert.deepEqual(
    levelSections.map((s) => s.id),
    overviewRows.map((r) => r.id),
  );
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    overviewRows.map((r) => r.id),
  );
});

for (const section of levelSections) {
  test(`src/levels/data/${section.id}.ts is identical (mod trailing whitespace) to its LEVELS.md Draft LevelDef block`, () => {
    const filePath = path.join(root, 'src/levels/data', `${section.id}.ts`);
    const fileText = readFileSync(filePath, 'utf8');
    assert.equal(normalise(fileText), normalise(section.draftText));
  });
}

test('LEVELS deep-equals window.MUMBLE_LEVELS from the mockup data file, in the same order', () => {
  assert.equal(MUMBLE_LEVELS.length, 12);
  assert.equal(LEVELS.length, 12);
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    plain(MUMBLE_LEVELS.map((l) => l.id)),
  );
  for (let i = 0; i < LEVELS.length; i++) {
    assert.deepEqual(plain(LEVELS[i]), plain(MUMBLE_LEVELS[i]), `mismatch at index ${i}`);
  }
});

test('every registered level matches its Overview row: title, tier, theme, lemmings/save, width, RR, time', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i]!;
    const row = overviewRows[i]!;
    assert.equal(level.id, row.id);
    assert.equal(level.title, row.title, `${level.id}: title`);
    assert.equal(level.tier, row.tier, `${level.id}: tier`);
    assert.equal(level.theme, row.theme, `${level.id}: theme`);
    assert.equal(level.lemmings, row.lemmings, `${level.id}: lemmings`);
    assert.equal(level.saveRequired, row.saveRequired, `${level.id}: saveRequired`);
    assert.equal(level.width, row.width, `${level.id}: width`);
    assert.equal(level.releaseRate, row.releaseRate, `${level.id}: releaseRate`);
    assert.equal(level.timeLimitSeconds, row.timeLimitSeconds, `${level.id}: timeLimitSeconds`);
  }
});

test('every registered level\'s skills object matches its Overview "Skills available" cell exactly', () => {
  for (let i = 0; i < LEVELS.length; i++) {
    const level = LEVELS[i]!;
    const row = overviewRows[i]!;
    const levelSkills: Record<string, number> = {};
    for (const id of SKILL_IDS) {
      const n = level.skills[id];
      if (n) levelSkills[id] = n;
    }
    assert.deepEqual(levelSkills, row.skills, `${level.id}: skills`);
  }
});

test('TIERS names match the Overview tier names, and every Overview theme is a known ThemeId', () => {
  for (const row of overviewRows) {
    const tierDef = TIERS.find((t) => t.id === row.tier);
    assert.ok(tierDef, `${row.id}: no TIERS entry for tier ${row.tier}`);
    assert.equal(tierDef.name, row.tierName, row.id);
    assert.ok((THEME_IDS as readonly string[]).includes(row.theme), `${row.id}: theme "${row.theme}"`);
  }
});

// ══ 2. Integrity ════════════════════════════════════════════════════════════════════════════

test('level ids are unique and kebab-case', () => {
  const seen = new Set<string>();
  for (const level of LEVELS) {
    assert.match(level.id, /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/, `${level.id}: not kebab-case`);
    assert.ok(!seen.has(level.id), `duplicate id: ${level.id}`);
    seen.add(level.id);
  }
});

test('getLevel finds every registered level by id, and returns undefined for an unknown id', () => {
  for (const level of LEVELS) assert.equal(getLevel(level.id), level);
  assert.equal(getLevel('not-a-real-level'), undefined);
});

test('nextLevel walks the campaign in Overview order; the last level has no next', () => {
  for (let i = 0; i < overviewRows.length - 1; i++) {
    assert.equal(nextLevel(overviewRows[i]!.id)?.id, overviewRows[i + 1]!.id);
  }
  assert.equal(nextLevel(overviewRows[overviewRows.length - 1]!.id), undefined);
  assert.equal(nextLevel('not-a-real-level'), undefined);
});

function walkFiles(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
}

test('no leftover reference to the deleted example level in src/ or tests/', () => {
  // Built by concatenation so this very assertion string can't trip its own check.
  const banned = 'example' + '-first-steps';
  const files: string[] = [];
  walkFiles(path.join(root, 'src'), files);
  walkFiles(path.join(root, 'tests'), files);
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.ok(!text.includes(banned), `${file}: still references "${banned}"`);
  }
});

test('no level title or hint contains a banned "lemm" substring (user-facing text)', () => {
  for (const level of LEVELS) {
    assert.doesNotMatch(level.title, /lemm/i, `${level.id}: title "${level.title}"`);
    if (level.hint !== undefined) {
      assert.doesNotMatch(level.hint, /lemm/i, `${level.id}: hint "${level.hint}"`);
    }
  }
});

test('every stamp id referenced by a level (terrain or decor) exists in STAMPS', () => {
  const known = new Set(Object.keys(STAMPS));
  for (const level of LEVELS) {
    for (const prims of [level.terrain, level.decor]) {
      if (!prims) continue;
      for (const p of prims) {
        if (p.kind === 'stamp') assert.ok(known.has(p.stamp), `${level.id}: unknown stamp '${p.stamp}'`);
      }
    }
  }
});

// ══ 3. Solutions ════════════════════════════════════════════════════════════════════════════

test('LEVEL_SOLUTIONS has exactly the 12 registered level ids', () => {
  assert.equal(Object.keys(LEVEL_SOLUTIONS).length, 12);
  assert.deepEqual(
    Object.keys(LEVEL_SOLUTIONS).sort(),
    LEVELS.map((l) => l.id).sort(),
  );
});

for (const section of levelSections) {
  test(`LEVEL_SOLUTIONS['${section.id}'] deep-equals the LEVELS.md "Sim solution data" block`, () => {
    const script = LEVEL_SOLUTIONS[section.id];
    assert.ok(script, `${section.id}: missing from LEVEL_SOLUTIONS`);
    assert.deepEqual(plain(script), plain(section.solutionValue));
  });
}

test('LEVEL_SOLUTIONS deep-equals window.MUMBLE_SOLUTIONS from the mockup data file', () => {
  assert.equal(Object.keys(MUMBLE_SOLUTIONS).length, 12);
  assert.deepEqual(plain(LEVEL_SOLUTIONS), plain(MUMBLE_SOLUTIONS));
});

test("every solution step's skill has budget on its level, and total assignments per skill stay within it", () => {
  for (const level of LEVELS) {
    const script = LEVEL_SOLUTIONS[level.id];
    assert.ok(script, level.id);
    const totals = new Map<SkillId, number>();
    for (const step of script.assignments) {
      totals.set(step.skill, (totals.get(step.skill) ?? 0) + (step.count ?? 1));
    }
    for (const [skill, total] of totals) {
      const budget = level.skills[skill] ?? 0;
      assert.ok(budget > 0, `${level.id}: solution uses '${skill}' but the level's budget is 0`);
      assert.ok(total <= budget, `${level.id}: solution needs ${total} '${skill}' but budget is ${budget}`);
    }
  }
});

// ══ 4. Driver semantics — differential test against an independent oracle ══════════════════
//
// The oracle below is ported directly from docs/design/mockups/levels-preview.html's assignment
// loop (matches() / apply() / the `// 1. assignments` pass) and docs/development/CONTRACTS.md
// §3, NOT from src/levels/solution-driver.ts. The one intentional divergence from the preview,
// per the coordinator's accepted engine mapping, is that the per-skill budget is tracked as
// "remaining, decremented by commands already emitted" (both across calls, via the harness
// below re-slicing the shared skill pool, and within one call, via `issuedThisCall`) instead of
// the preview's "cumulative used-so-far vs a fixed total" — the two are arithmetically identical
// as long as the harness decrements the shared pool by exactly what was emitted each tick, which
// it does.

interface OracleStepState {
  left: number;
  done: boolean;
  who: number | null;
  readonly seen: Set<number>;
}

function newOracleSteps(script: SolutionScript): OracleStepState[] {
  return script.assignments.map((s) => ({ left: s.count ?? 1, done: false, who: null, seen: new Set<number>() }));
}

function oracleMatches(
  step: SolutionStep,
  lem: Readonly<Lemming>,
  tick: number,
  steps: readonly OracleStepState[],
): boolean {
  if (step.idx !== undefined && lem.id !== step.idx) return false;
  if (step.minIdx !== undefined && lem.id < step.minIdx) return false;
  if (step.x !== undefined && lem.x !== step.x) return false;
  if (step.xmin !== undefined && lem.x < step.xmin) return false;
  if (step.xmax !== undefined && lem.x > step.xmax) return false;
  if (step.dir !== undefined && lem.dir !== step.dir) return false;
  if (step.ymin !== undefined && lem.y < step.ymin) return false;
  if (step.ymax !== undefined && lem.y > step.ymax) return false;
  if (step.state !== undefined && lem.state !== step.state) return false;
  if (step.after !== undefined && tick < step.after) return false;
  if (step.afterSkill !== undefined) {
    const dep = steps[step.afterSkill];
    if (dep === undefined || !dep.done) return false;
  }
  if (step.target !== undefined) {
    const dep = steps[step.target];
    if (dep === undefined || dep.who === null || lem.id !== dep.who) return false;
  }
  return true;
}

function oraclePass(
  steps: OracleStepState[],
  firstCallBox: { first: boolean },
  script: SolutionScript,
  tick: number,
  lemmingsThisTick: readonly Lemming[],
  checkAssign: (lemmingId: number, skill: SkillId) => Rejection | null,
  remainingBudget: Record<SkillId, number>,
): GameCommand[] {
  const commands: GameCommand[] = [];
  if (firstCallBox.first) {
    firstCallBox.first = false;
    if (script.releaseRate !== undefined) commands.push({ type: 'set-release-rate', rate: script.releaseRate });
  }

  const sorted = lemmingsThisTick
    .filter((l) => !l.removed)
    .slice()
    .sort((a, b) => a.id - b.id);
  const taken = new Set<number>();
  const issuedThisCall = new Map<SkillId, number>();

  for (let ai = 0; ai < script.assignments.length; ai++) {
    const step = script.assignments[ai]!;
    const state = steps[ai]!;
    if (state.left <= 0) continue;
    for (const lem of sorted) {
      if (taken.has(lem.id)) continue;
      if (state.seen.has(lem.id)) continue;
      if (!oracleMatches(step, lem, tick, steps)) continue;
      if (checkAssign(lem.id, step.skill) !== null) continue;

      const budget = remainingBudget[step.skill] ?? 0;
      const issued = issuedThisCall.get(step.skill) ?? 0;
      if (budget - issued <= 0) break; // overBudget: stop scanning candidates for this step

      commands.push({ type: 'assign-skill', lemmingId: lem.id, skill: step.skill });
      taken.add(lem.id);
      issuedThisCall.set(step.skill, issued + 1);
      state.left--;
      state.done = true;
      state.who = lem.id;
      state.seen.add(lem.id);
      if (state.left <= 0) break;
    }
  }
  return commands;
}

// ─── deterministic PRNG + fixture generators ───────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  const item = arr[Math.floor(rng() * arr.length)];
  assert.ok(item !== undefined);
  return item;
}

function randomStep(rng: () => number, numSteps: number): SolutionStep {
  const has = (p: number): boolean => rng() < p;
  const skill = pick(rng, SKILL_IDS);
  return {
    skill,
    ...(has(0.35) ? { idx: Math.floor(rng() * 16) - 2 } : {}),
    ...(has(0.35) ? { minIdx: Math.floor(rng() * 16) - 2 } : {}),
    ...(has(0.3) ? { x: Math.floor(rng() * 200) * 4 } : {}),
    ...(has(0.3) ? { xmin: Math.floor(rng() * 200) * 4 } : {}),
    ...(has(0.3) ? { xmax: Math.floor(rng() * 200) * 4 } : {}),
    ...(has(0.3) ? { dir: (rng() < 0.5 ? -1 : 1) as Direction } : {}),
    ...(has(0.3) ? { ymin: Math.floor(rng() * 40) * 4 } : {}),
    ...(has(0.3) ? { ymax: Math.floor(rng() * 40) * 4 } : {}),
    ...(has(0.25) ? { state: pick(rng, LEMMING_STATES) } : {}),
    ...(has(0.3) ? { after: Math.floor(rng() * 20) } : {}),
    ...(has(0.25) ? { afterSkill: Math.floor(rng() * numSteps) } : {}),
    ...(has(0.25) ? { target: Math.floor(rng() * numSteps) } : {}),
    ...(has(0.35) ? { count: 1 + Math.floor(rng() * 3) } : {}),
  };
}

function randomScript(rng: () => number): SolutionScript {
  const numSteps = 1 + Math.floor(rng() * 5); // 1..5
  const assignments: SolutionStep[] = [];
  for (let i = 0; i < numSteps; i++) assignments.push(randomStep(rng, numSteps));
  if (rng() < 0.5) return { assignments };
  return { releaseRate: 1 + Math.floor(rng() * 99), assignments };
}

function randomLemming(rng: () => number, id: number): Lemming {
  return {
    id,
    x: Math.floor(rng() * 200) * 4,
    y: Math.floor(rng() * 40) * 4,
    dir: (rng() < 0.5 ? -1 : 1) as Direction,
    state: pick(rng, LEMMING_STATES),
    stateTicks: Math.floor(rng() * 10),
    fallDistance: 0,
    isClimber: rng() < 0.3,
    isFloater: rng() < 0.3,
    fuseTicks: 0,
    bricksLeft: 0,
    removed: rng() < 0.1,
  };
}

function randomBudgets(rng: () => number): Record<SkillId, number> {
  const out = {} as Record<SkillId, number>;
  for (const id of SKILL_IDS) out[id] = Math.floor(rng() * 4); // 0..3
  return out;
}

/** Materialised up front so it's a pure, order-independent function of (id, skill) for the tick. */
function buildCheckAssign(rng: () => number, poolSize: number): (id: number, skill: SkillId) => Rejection | null {
  const table = new Map<string, boolean>();
  for (let id = 0; id < poolSize; id++) {
    for (const skill of SKILL_IDS) table.set(`${id}:${skill}`, rng() < 0.2);
  }
  return (id: number, skill: SkillId): Rejection | null =>
    table.get(`${id}:${skill}`) ? { reason: 'not-applicable' } : null;
}

const RUNS = 500;

test(`SolutionDriver matches an independent oracle port of levels-preview.html's assignment loop over ${RUNS} random runs`, () => {
  for (let run = 0; run < RUNS; run++) {
    const rng = mulberry32(0x9e3779b9 ^ run);
    const script = randomScript(rng);
    const poolSize = 1 + Math.floor(rng() * 12); // 1..12 potential lemmings, ids ascending
    const numTicks = 6 + Math.floor(rng() * 10); // 6..15

    const driver = new SolutionDriver(script);
    const oracleSteps = newOracleSteps(script);
    const oracleFirstCall = { first: true };
    const remaining = randomBudgets(rng);

    for (let tick = 0; tick < numTicks; tick++) {
      const lemmings: Lemming[] = [];
      for (let id = 0; id < poolSize; id++) {
        if (rng() < 0.8) lemmings.push(randomLemming(rng, id)); // appear/disappear between ticks
      }
      for (let i = lemmings.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = lemmings[i]!;
        lemmings[i] = lemmings[j]!;
        lemmings[j] = tmp;
      } // shuffle: the driver must still scan in ascending-id (release) order regardless of input order

      const checkAssign = buildCheckAssign(rng, poolSize);
      const view = { tick, lemmings, skills: { ...remaining } } as unknown as GameView;

      const driverCommands = driver.commandsFor(view, checkAssign);
      const oracleCommands = oraclePass(oracleSteps, oracleFirstCall, script, tick, lemmings, checkAssign, remaining);

      assert.deepEqual(
        driverCommands,
        oracleCommands,
        `run ${run} tick ${tick}: driver=${JSON.stringify(driverCommands)} oracle=${JSON.stringify(oracleCommands)} ` +
          `script=${JSON.stringify(script)}`,
      );

      for (const cmd of driverCommands) {
        if (cmd.type === 'assign-skill') remaining[cmd.skill] = (remaining[cmd.skill] ?? 0) - 1;
      }
    }
  }
});

// ─── small, explicit checks alongside the fuzz test ────────────────────────────────────────

function mkLemming(id: number, overrides: Partial<Lemming> = {}): Lemming {
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

const noReject = (): Rejection | null => null;

test('SolutionStep accepts a literal with all 14 CONTRACTS §3 fields (type-level)', () => {
  const step: SolutionStep = {
    skill: 'climber',
    idx: 0,
    minIdx: 0,
    x: 0,
    xmin: 0,
    xmax: 100,
    dir: 1,
    ymin: 0,
    ymax: 100,
    state: 'walking',
    after: 0,
    afterSkill: 0,
    target: 0,
    count: 1,
  };
  assert.equal(Object.keys(step).length, 14);
});

test('constructor(script) + commandsFor(view, checkAssign): releaseRate fires once, first, before any assignment', () => {
  const script: SolutionScript = { releaseRate: 42, assignments: [{ skill: 'digger', idx: 0 }] };
  const driver = new SolutionDriver(script);
  const view = (tick: number): GameView =>
    ({ tick, lemmings: [mkLemming(0)], skills: { digger: 5 } }) as unknown as GameView;

  const first: GameCommand[] = driver.commandsFor(view(0), noReject);
  assert.deepEqual(first[0], { type: 'set-release-rate', rate: 42 });
  assert.equal(first[1]?.type, 'assign-skill');
  assert.equal(first.filter((c) => c.type === 'set-release-rate').length, 1);

  const second = driver.commandsFor(view(1), noReject);
  assert.equal(second.some((c) => c.type === 'set-release-rate'), false);
});

test('no command is emitted when nothing matches', () => {
  const driver = new SolutionDriver({ assignments: [{ skill: 'digger', idx: 999 }] });
  const view = { tick: 0, lemmings: [mkLemming(0)], skills: { digger: 5 } } as unknown as GameView;
  assert.deepEqual(driver.commandsFor(view, noReject), []);
});

test('commandsFor only ever emits assign-skill / set-release-rate commands', () => {
  const driver = new SolutionDriver({ releaseRate: 10, assignments: [{ skill: 'digger', idx: 0 }] });
  const view = { tick: 0, lemmings: [mkLemming(0)], skills: { digger: 5 } } as unknown as GameView;
  for (const c of driver.commandsFor(view, noReject)) {
    assert.ok(c.type === 'assign-skill' || c.type === 'set-release-rate', c.type);
  }
});
