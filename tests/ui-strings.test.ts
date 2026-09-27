/**
 * Coverage for src/ui/strings.ts (DESIGN.md §9 / DESIGN-APPENDIX.md App. A):
 *  - verdictFor against an independent re-implementation of the §9.5 rule, all 8 rows, both
 *    variants, and the two named boundaries;
 *  - refusalText for every §6.5 row;
 *  - describeLemming for every §6.3.1 example, plus the lit-fuse suffix;
 *  - length budgets (§9.1): verdicts ≤ 70, announcements ≤ 90 (sample values), short HUD/status
 *    strings ≤ 28;
 *  - "no Lemm-" anywhere: every runtime export of strings.ts (deep-walked, functions called with
 *    plausible sample args) and every string/template literal in src/ui/**, src/app/** and
 *    index.html (import specifiers and code-identifier-shaped literals, e.g. the ActionId
 *    "lemming-next", excluded — DESIGN §9.1.4 only forbids it in USER-FACING text).
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { Lemming, LevelOutcome, Rejection, SkillId } from '../src/core/types.ts';
import { ACTION_IDS } from '../src/input/actions.ts';
import * as Strings from '../src/ui/strings.ts';
import { ANNOUNCE, VERDICTS, describeLemming, refusalText, verdictFor } from '../src/ui/strings.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ─── Helpers ────────────────────────────────────────────────────────────────────────────────

function makeLemming(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 1,
    x: 100,
    y: 50,
    dir: 1,
    state: 'walking',
    stateTicks: 1,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 12,
    removed: false,
    ...overrides,
  };
}

// ─── describeLemming (DESIGN §6.3.1) ───────────────────────────────────────────────────────

test('describeLemming: every §6.3.1 example', () => {
  assert.equal(describeLemming(makeLemming({ state: 'walking', isClimber: true, isFloater: true })), 'Climber + Floater');
  assert.equal(describeLemming(makeLemming({ state: 'walking', isClimber: true })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'falling', isFloater: true })), 'Floater');
  assert.equal(describeLemming(makeLemming({ state: 'jumping', isClimber: true })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'walking' })), 'Walker');
  assert.equal(describeLemming(makeLemming({ state: 'falling' })), 'Faller');
  assert.equal(describeLemming(makeLemming({ state: 'jumping' })), 'Walker');
  assert.equal(describeLemming(makeLemming({ state: 'climbing' })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'hoisting' })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'floating' })), 'Floater');
  assert.equal(describeLemming(makeLemming({ state: 'blocking' })), 'Blocker');
  assert.equal(describeLemming(makeLemming({ state: 'building', bricksLeft: 4 })), 'Builder · 4 bricks');
  assert.equal(describeLemming(makeLemming({ state: 'shrugging' })), 'Builder · out of bricks');
  assert.equal(describeLemming(makeLemming({ state: 'bashing' })), 'Basher');
  assert.equal(describeLemming(makeLemming({ state: 'mining' })), 'Miner');
  assert.equal(describeLemming(makeLemming({ state: 'digging' })), 'Digger');
  assert.equal(describeLemming(makeLemming({ state: 'ohno' })), 'Bomber · uh-oh');
});

test('describeLemming: lit-fuse suffix counts 5…1 and is suppressed once popping (ohno/exploding)', () => {
  assert.equal(describeLemming(makeLemming({ state: 'walking', fuseTicks: 79 })), 'Walker · pops in 5');
  assert.equal(describeLemming(makeLemming({ state: 'walking', fuseTicks: 18 })), 'Walker · pops in 2');
  assert.equal(describeLemming(makeLemming({ state: 'walking', fuseTicks: 1 })), 'Walker · pops in 1');
  assert.equal(describeLemming(makeLemming({ state: 'climbing', fuseTicks: 40 })), 'Climber · pops in 3');
  assert.equal(describeLemming(makeLemming({ state: 'ohno', fuseTicks: 1 })), 'Bomber · uh-oh');
  assert.equal(describeLemming(makeLemming({ state: 'exploding', fuseTicks: 0 })), 'Bomber');
});

// ─── refusalText (DESIGN §6.5) ──────────────────────────────────────────────────────────────

test('refusalText: every DESIGN §6.5 row, exact wording', () => {
  const r = (rejection: Rejection, skill: SkillId): string => refusalText(rejection, skill);
  assert.equal(r({ reason: 'none-left' }, 'digger'), 'No diggers left');
  assert.equal(r({ reason: 'not-applicable', detail: 'already-climber' }, 'climber'), 'Already a climber');
  assert.equal(r({ reason: 'not-applicable', detail: 'already-floater' }, 'floater'), 'Already a floater');
  assert.equal(r({ reason: 'not-applicable', detail: 'fuse-lit' }, 'bomber'), 'That fuse is already lit');
  assert.equal(r({ reason: 'not-applicable', detail: 'airborne' }, 'digger'), 'Needs solid ground to dig');
  assert.equal(r({ reason: 'not-applicable', detail: 'is-blocker' }, 'digger'), 'Blockers only take a Bomber');
  assert.equal(r({ reason: 'not-applicable', detail: 'same-job' }, 'digger'), 'Already digging');
  assert.equal(r({ reason: 'not-applicable', detail: 'busy-dying' }, 'digger'), 'Too late for that one');
  assert.equal(r({ reason: 'steel', detail: 'ahead' }, 'digger'), "Can't dig: steel ahead");
  assert.equal(r({ reason: 'steel', detail: 'below' }, 'digger'), "Can't dig: steel below");
  assert.equal(r({ reason: 'one-way' }, 'basher'), "Can't bash against the arrows");
  assert.equal(r({ reason: 'blocker-overlap' }, 'blocker'), 'Too close to another blocker');
  assert.equal(r({ reason: 'too-high' }, 'builder'), 'No room to build up here');
  assert.equal(r({ reason: 'no-lemming' }, 'digger'), 'No mumble selected — press X to pick one');
  assert.equal(r({ reason: 'level-ended' }, 'digger'), 'The level is over');
  // Bare click on empty ground (no command at all) uses the same text as REFUSAL.noMumbleHere.
  assert.equal(Strings.NO_MUMBLE_HERE, 'No mumble here');
});

// ─── verdictFor (DESIGN §9.5) ───────────────────────────────────────────────────────────────

/** Independent re-implementation of the §9.5 rule, to catch drift from the real one. */
function expectedRow(S: number, R: number, T: number): number {
  const m = Math.max(1, Math.round(T * 0.05));
  if (S === T) return 1;
  if (S === 0) return 2;
  if (S < Math.ceil(R / 2)) return 3;
  if (S < R - m) return 4;
  if (S < R) return 5;
  if (S === R) return 6;
  if (S >= R + Math.max(2, Math.ceil((T - R) / 2))) return 7;
  return 8;
}

function expectedVerdict(S: number, R: number, T: number, attempt: number): string {
  const row = expectedRow(S, R, T);
  const variant = attempt % 2 === 0 ? 0 : 1;
  return VERDICTS[row - 1]![variant].replace('{n}', String(R - S));
}

test('verdictFor: matches the §9.5 rule for every S at T = 10, 20, 80 (two R choices), all 8 rows reachable', () => {
  for (const T of [10, 20, 80]) {
    const rowsSeen = new Set<number>();
    for (const R of [Math.ceil(T / 2), Math.max(1, T - 2)]) {
      for (let S = 0; S <= T; S++) {
        rowsSeen.add(expectedRow(S, R, T));
        assert.equal(verdictFor(S, R, T, 0), expectedVerdict(S, R, T, 0), `T=${T} R=${R} S=${S} attempt=0`);
        assert.equal(verdictFor(S, R, T, 1), expectedVerdict(S, R, T, 1), `T=${T} R=${R} S=${S} attempt=1`);
        // attempt parity must pick a genuinely different line (variant A vs B).
        assert.notEqual(verdictFor(S, R, T, 0), verdictFor(S, R, T, 1), `T=${T} R=${R} S=${S}`);
      }
    }
    assert.equal(rowsSeen.size, 8, `T=${T}: expected all 8 rows reachable, saw {${[...rowsSeen].sort().join(',')}}`);
  }
});

test('verdictFor boundaries: S = R − m lands on row 5 (not row 4); S = R + max(2, ⌈(T−R)/2⌉) lands on row 7', () => {
  for (const T of [10, 20, 80]) {
    const R = Math.ceil(T / 2);
    const m = Math.max(1, Math.round(T * 0.05));
    const low = R - m;
    assert.equal(expectedRow(low, R, T), 5, `sanity check T=${T}`);
    assert.equal(verdictFor(low, R, T, 0), VERDICTS[4]![0].replace('{n}', String(R - low)));
    const high = R + Math.max(2, Math.ceil((T - R) / 2));
    assert.ok(high <= T, `sanity check T=${T}: boundary S=${high} must be reachable`);
    assert.equal(expectedRow(high, R, T), 7, `sanity check T=${T}`);
    assert.equal(verdictFor(high, R, T, 0), VERDICTS[6]![0].replace('{n}', String(R - high)));
  }
});

// ─── ACTION_GROUPS completeness ─────────────────────────────────────────────────────────────

test('ACTION_GROUPS covers every ActionId exactly once (Help screen §7.10 #4)', () => {
  const grouped = Strings.ACTION_GROUPS.flatMap((g) => g.actions);
  assert.equal(grouped.length, ACTION_IDS.length);
  assert.deepEqual([...grouped].sort(), [...ACTION_IDS].sort());
});

// ─── Length budgets (DESIGN §9.1) ───────────────────────────────────────────────────────────

test('verdicts are ≤ 70 characters (both variants, representative {n} values)', () => {
  for (const [a, b] of VERDICTS) {
    for (const n of [1, 9, 27]) {
      const withA = a.replace('{n}', String(n));
      const withB = b.replace('{n}', String(n));
      assert.ok(withA.length <= 70, `"${withA}" is ${withA.length} chars`);
      assert.ok(withB.length <= 70, `"${withB}" is ${withB.length} chars`);
    }
  }
});

test('every §7.3 announcement template is ≤ 90 characters with representative sample values', () => {
  const outcome: Pick<LevelOutcome, 'won' | 'reason' | 'saved' | 'total' | 'required'> = {
    won: true,
    reason: 'all-resolved',
    saved: 14,
    total: 20,
    required: 10,
  };
  const samples: readonly string[] = [
    ANNOUNCE.ready('Spade Expectations', 5, 10, [{ skill: 'digger', count: 5 }], 'digger'),
    ANNOUNCE.skillChosen('digger', 3),
    ANNOUNCE.skillEmpty('digger'),
    ANNOUNCE.selection('Walker', 'left', 3, 8, 'walkers'),
    ANNOUNCE.underCursor('Builder · 4 bricks'),
    ANNOUNCE.assigned('digger', true),
    ANNOUNCE.assigned('digger', false),
    ANNOUNCE.selectedExited,
    ANNOUNCE.selectedDied('drown'),
    ANNOUNCE.batch(2, 1, 6, 10),
    ANNOUNCE.goalReached(10, 10),
    ANNOUNCE.goalImpossible(10),
    ANNOUNCE.onlyBlockersLeft,
    ANNOUNCE.releaseRate(50, '1.6', false),
    ANNOUNCE.releaseRate(1, '53.0', true),
    ANNOUNCE.paused(true),
    ANNOUNCE.paused(false),
    ANNOUNCE.stepped(1),
    ANNOUNCE.stepped(17),
    ANNOUNCE.fastForward(true),
    ANNOUNCE.fastForward(false),
    ANNOUNCE.filter('walkers', 5),
    ANNOUNCE.follow('following'),
    ANNOUNCE.follow('armed'),
    ANNOUNCE.follow('off'),
    ANNOUNCE.mute(true),
    ANNOUNCE.mute(false),
    ANNOUNCE.popAllArmed,
    ANNOUNCE.disarmed('pop-all'),
    ANNOUNCE.disarmed('restart'),
    ANNOUNCE.nukeStarted,
    ANNOUNCE.restartArmed,
    ANNOUNCE.timeLow(60),
    ANNOUNCE.timeLow(30),
    ANNOUNCE.timeLow(10),
    ANNOUNCE.relaxedTimeUp,
    ANNOUNCE.undo('digger'),
    ANNOUNCE.undo(null),
    ANNOUNCE.builderLow(3),
    ANNOUNCE.builderFinished,
    ANNOUNCE.hitSteel('Basher'),
    ANNOUNCE.letsGo,
    ANNOUNCE.hatchOpen,
    ANNOUNCE.allReleased,
    ANNOUNCE.bomberWarning,
    ANNOUNCE.levelEnded(outcome),
    ANNOUNCE.levelEnded({ ...outcome, won: false, reason: 'time-up', saved: 6 }),
    ANNOUNCE.levelEnded({ ...outcome, won: false, reason: 'all-resolved', saved: 6 }),
    ANNOUNCE.resultsTitle('Level complete!', 'Bang on the number. Every mumble counted!'),
  ];
  for (const s of samples) assert.ok(s.length <= 90, `"${s}" is ${s.length} chars`);
});

test('short HUD/status strings stay ≤ 28 characters (DESIGN §9.1.2)', () => {
  const shortStrings: readonly string[] = [
    Strings.HUD.out(12),
    Strings.HUD.saved(3),
    Strings.HUD.need(8),
    Strings.HUD.goalMet,
    Strings.HUD.time('4:12'),
    Strings.HUD.overtime('0:12'),
    Strings.HUD.muted,
    Strings.HUD.filter.all,
    Strings.HUD.filter.walkers,
    Strings.HUD.filter.left,
    Strings.HUD.filter.right,
    Strings.STATUS.noMumblesToSelect,
    Strings.STATUS.noWalkersToSelect,
    Strings.STATUS.noSkillsLeft,
    Strings.STATUS.noMumbleSelected,
    Strings.STATUS.rewinding,
    Strings.STATUS.undone,
    Strings.FOLLOW.label,
    describeLemming(makeLemming({ state: 'walking' })),
    describeLemming(makeLemming({ state: 'building', bricksLeft: 4 })),
  ];
  for (const s of shortStrings) assert.ok(s.length <= 28, `"${s}" is ${s.length} chars`);
});

// ─── No "Lemm-" anywhere user-facing ─────────────────────────────────────────────────────────

/**
 * A bare lowercase-kebab token (no spaces, no punctuation) reads as a code identifier in this
 * codebase's style — an `ActionId` or a `GameEvent`/`SfxId` tag such as "lemming-next" or
 * "lemming-died" — never as prose. Real copy always has a space, capital or punctuation.
 */
const KEBAB_IDENTIFIER = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function assertNoUserFacingLemm(text: string, where: string): void {
  if (KEBAB_IDENTIFIER.test(text)) return;
  assert.ok(!/lemm/i.test(text), `${where} contains "Lemm": "${text}"`);
}

function makeSampleLemming(): Lemming {
  return makeLemming();
}

const SAMPLE_REJECTION: Rejection = { reason: 'steel', detail: 'below' };
const SAMPLE_OUTCOME: Pick<LevelOutcome, 'won' | 'reason' | 'saved' | 'total' | 'required'> = {
  won: true,
  reason: 'all-resolved',
  saved: 14,
  total: 20,
  required: 10,
};

/** Sample arguments for every function-valued export, keyed by its dotted path in the module. */
const SAMPLE_ARGS: Readonly<Record<string, readonly unknown[]>> = {
  describeLemming: [makeSampleLemming()],
  refusalText: [SAMPLE_REJECTION, 'digger'],
  playfieldAriaLabel: ['Spade Expectations'],
  rrIntervalSeconds: [50],
  rrIntervalText: [50],
  minimapValueText: [0, 400, 1600, 5],
  focusLabelText: ['Walker', 3, { selected: true, refusal: "Can't dig: steel below" }],
  noMumblesHereText: ['walkers'],
  verdictFor: [6, 8, 10, 0],
  resultsHeadline: [{ won: true, reason: 'all-resolved' }],
  relaxedNote: [17],
  beatClockLine: [true, true, false],
  formatClock: [312],
  'REFUSAL.noneLeft': ['digger'],
  'REFUSAL.airborne': ['digger'],
  'REFUSAL.sameJob': ['digger'],
  'REFUSAL.steel': ['digger', 'ahead'],
  'REFUSAL.oneWay': ['basher'],
  'HUD.out': [12],
  'HUD.saved': [3],
  'HUD.need': [8],
  'HUD.time': ['4:12'],
  'HUD.overtime': ['0:12'],
  'HUD.ready': [2],
  'BRIEFING_EXTRA.levelHeader': [3, 'Breezy'],
  'BRIEFING_EXTRA.timeRelaxed': ['5:00'],
  'BRIEFING_EXTRA.best': [14],
  'RESULTS.score': [14, 20, 10],
  'RESULTS.relaxedOvertime': ['0:12'],
  'TITLE.continue': [4, 'The Punch Line'],
  'LEVEL_SELECT.cardNumber': [3],
  'LEVEL_SELECT.locked': [2],
  'LEVEL_SELECT.completed': [14, 20],
  'LEVEL_SELECT.cardAriaName': [3, 'Spade Expectations', 'Breezy', 'Completed, best 14 of 20'],
  'LEVEL_SELECT.cardAriaLocked': [2],
  'LEVEL_CARD_STATE.completed': [14, 20],
  'PAUSE_MENU.objective': [3, 8, 20, '4:12'],
  'SETTINGS.rebind.reservedKey': ['Tab'],
  'SETTINGS.rebind.clash': ['E', 'Next skill'],
  'STATUS.rrBelowMin': [50],
  'STATUS.tick': [312, 1],
  'RR_ARIA.describedText': [50],
  'ANNOUNCE.ready': ['Spade Expectations', 5, 10, [{ skill: 'digger', count: 5 }], 'digger'],
  'ANNOUNCE.skillChosen': ['digger', 3],
  'ANNOUNCE.skillEmpty': ['digger'],
  'ANNOUNCE.selection': ['Walker', 'left', 3, 8, 'walkers'],
  'ANNOUNCE.underCursor': ['Builder · 4 bricks'],
  'ANNOUNCE.assigned': ['digger', true],
  'ANNOUNCE.selectedDied': ['drown'],
  'ANNOUNCE.batch': [2, 1, 6, 10],
  'ANNOUNCE.goalReached': [10, 10],
  'ANNOUNCE.goalImpossible': [10],
  'ANNOUNCE.releaseRate': [50, '1.6', false],
  'ANNOUNCE.paused': [true],
  'ANNOUNCE.stepped': [1],
  'ANNOUNCE.fastForward': [true],
  'ANNOUNCE.filter': ['walkers', 5],
  'ANNOUNCE.follow': ['following'],
  'ANNOUNCE.mute': [true],
  'ANNOUNCE.disarmed': ['pop-all'],
  'ANNOUNCE.timeLow': [30],
  'ANNOUNCE.undo': ['digger'],
  'ANNOUNCE.builderLow': [3],
  'ANNOUNCE.hitSteel': ['Basher'],
  'ANNOUNCE.levelEnded': [SAMPLE_OUTCOME],
  'ANNOUNCE.resultsTitle': ['Level complete!', 'Bang on the number. Every mumble counted!'],
};

function walkForLemm(value: unknown, path_: string, seen: Set<unknown>): void {
  if (typeof value === 'string') {
    assertNoUserFacingLemm(value, path_);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walkForLemm(v, `${path_}[${i}]`, seen));
  } else if (typeof value === 'function') {
    // Registered args when known; otherwise (copy added later by other workers) try a few
    // generic argument shapes and scan whatever renders. The raw-literal source scan below
    // catches any literal that no call path reaches.
    const fn = value as (...a: unknown[]) => unknown;
    const registered = SAMPLE_ARGS[path_];
    const attempts: readonly (readonly unknown[])[] = registered
      ? [registered]
      : [[3, 20, 10, 5], ['digger', 3, 20, 10], ['Sample title', 'Breezy', 3, 20], [SAMPLE_OUTCOME], [SAMPLE_REJECTION, 'digger'], []];
    let rendered = false;
    for (const args of attempts) {
      let result: unknown;
      try {
        result = fn(...(args as unknown[]));
      } catch (error) {
        if (registered) throw error;
        continue;
      }
      walkForLemm(result, `${path_}()`, seen);
      rendered = true;
    }
    assert.ok(rendered, `${path_}: could not render with registered or generic sample args`);
  } else if (value !== null && typeof value === 'object') {
    if (seen.has(value)) return;
    seen.add(value);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkForLemm(v, `${path_}.${k}`, seen);
    }
  }
}

test('no export of ui/strings.ts renders "Lemm-" in any user-facing text', () => {
  const seen = new Set<unknown>();
  const names = Object.keys(Strings);
  assert.ok(names.length > 20, 'sanity: expected many exports from strings.ts');
  for (const [name, value] of Object.entries(Strings)) {
    walkForLemm(value, name, seen);
  }
});

// ─── Raw-source scan: index.html and every ui/app source file ──────────────────────────────

/** Blanks out (same length, so nothing else shifts) block/line comments and import specifiers. */
function stripCommentsAndImportSpecifiers(source: string): string {
  const noComments = source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/.*$/gm, (m) => m.replace(/./g, ' '));
  return noComments.replace(/\bfrom\s*(['"])(?:\\.|(?!\1)[^\\\n])*\1/g, (m) => m.replace(/[^\n]/g, ' '));
}

const LITERAL_RE = /'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g;

function scanLiteralsForLemm(source: string, filePath: string): void {
  const code = stripCommentsAndImportSpecifiers(source);
  for (const match of code.matchAll(LITERAL_RE)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? '';
    // `${lemmingId}` is an interpolated code identifier, never rendered as literal text.
    const text = raw.replace(/\$\{[^}]*\}/g, '');
    assertNoUserFacingLemm(text, `${filePath} literal "${raw}"`);
  }
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

test('no string/template literal in src/ui/**/*.ts or src/app/**/*.ts renders "Lemm-"', () => {
  const files = [...listTsFiles(path.join(ROOT, 'src', 'ui')), ...listTsFiles(path.join(ROOT, 'src', 'app'))];
  assert.ok(files.length > 10, 'sanity: expected to find source files under src/ui and src/app');
  for (const file of files) {
    scanLiteralsForLemm(readFileSync(file, 'utf8'), path.relative(ROOT, file));
  }
});

test('index.html contains no "Lemm-"', () => {
  const html = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(!/lemm/i.test(html), 'index.html must not contain "Lemm-"');
});
