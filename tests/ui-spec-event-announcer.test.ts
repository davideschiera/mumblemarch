/**
 * VALIDATOR (ev1b-announce) spec-derived tests for `src/ui/event-announcements.ts`'s
 * `EventAnnouncer` against the literal DESIGN.md §7.3 catalogue rows #1, #10-#13, #24, #26-#27,
 * #29-#34 — independent of `tests/ui-event-announcements.test.ts` (the implementer's own test):
 * expected strings and the pol./level/key columns are transcribed by hand from the spec table
 * here, not built by calling the implementation's own `ANNOUNCE.*` template functions or
 * `ANNOUNCE_META`. DOM-free: only imports `EventAnnouncer`, the `Speaker` type and core types.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { AnnounceOptions, Speaker } from '../src/ui/announce-queue.ts';
import { EventAnnouncer, type IntroInfo } from '../src/ui/event-announcements.ts';
import { TICKS_PER_SECOND } from '../src/core/constants.ts';
import { SKILL_IDS, type Lemming, type SkillCounts, type SkillId } from '../src/core/types.ts';

// §7.3 #10 note: "batch >= 2 s apart" -> 2 s * 17 ticks/s = 34 ticks.
const BATCH_TICKS = Math.round(2 * TICKS_PER_SECOND);

interface Said {
  readonly text: string;
  readonly options?: AnnounceOptions;
}

function fakeSpeaker(): { speaker: Speaker; said: Said[] } {
  const said: Said[] = [];
  return { speaker: { say: (text, options) => said.push(options === undefined ? { text } : { text, options }) }, said };
}

function skillCounts(overrides: Partial<Record<SkillId, number>> = {}): SkillCounts {
  const base = Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
  return { ...base, ...overrides };
}

function lemming(overrides: Partial<Lemming> = {}): Readonly<Lemming> {
  const base: Lemming = {
    id: 1,
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
  };
  return { ...base, ...overrides };
}

function makeAnnouncer(lemmingById: (id: number) => Readonly<Lemming> | undefined = () => undefined): { a: EventAnnouncer; said: Said[] } {
  const { speaker, said } = fakeSpeaker();
  return { a: new EventAnnouncer(speaker, { lemmingById }), said };
}

function intro(a: EventAnnouncer, required: number, total = 10): void {
  const info: IntroInfo = { title: 'T', required, total, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' };
  a.announceIntro(info);
}

// ─── #1 Game screen ready — literal template ──────────────────────────────────────────────────

test('#1: "{title}. Save {required} of {total}. Skills: {Skill} {n}, .... {Skill} chosen. Press H for help."', () => {
  const { a, said } = makeAnnouncer();
  a.announceIntro({
    title: 'Test Level',
    required: 5,
    total: 10,
    skills: skillCounts({ builder: 2, digger: 3 }), // SKILL_IDS order: builder before digger
    selectedSkill: 'digger',
  });
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, 'Test Level. Save 5 of 10. Skills: Builder 2, Digger 3. Digger chosen. Press H for help.');
  assert.deepEqual(said[0]?.options, { key: 'ready' }); // polite/essential by default, spoken once
});

// ─── #10 Saves/losses batch, >= 2 s apart, omit the zero part ─────────────────────────────────

test('#10: "{s} saved, {l} lost. {saved} of {required} home." omits whichever part is zero, and only fires >=BATCH_TICKS apart', () => {
  const { a, said } = makeAnnouncer();
  intro(a, 8, 10);
  said.length = 0;

  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }], 0);
  assert.equal(said.length, 0, 'no flush before BATCH_TICKS have elapsed');
  a.handleEvents([], BATCH_TICKS - 1);
  assert.equal(said.length, 0, 'still 1 tick short');
  a.handleEvents([], BATCH_TICKS);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, '1 saved. 1 of 8 home.', 'lost part omitted (l=0)');
  assert.equal(said[0]?.options?.key, 'batch:0'); // A11Y-4 round 2: generation-suffixed coalesce key

  said.length = 0;
  a.handleEvents([{ type: 'lemming-died', lemmingId: 2, cause: 'splat' }, { type: 'lemming-died', lemmingId: 3, cause: 'drown' }], BATCH_TICKS);
  a.handleEvents([], BATCH_TICKS * 2);
  assert.equal(said[0]?.text, '2 lost. 1 of 8 home.', 'saved part omitted (s=0); cumulative saved stays 1');

  said.length = 0;
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 4 }, { type: 'lemming-died', lemmingId: 5, cause: 'burn' }], BATCH_TICKS * 2);
  a.handleEvents([], BATCH_TICKS * 3);
  assert.equal(said[0]?.text, '1 saved, 1 lost. 2 of 8 home.', 'both parts present (this batch: 1 saved, 1 lost); cumulative saved is now 2');
});

// ─── #11 Goal reached ──────────────────────────────────────────────────────────────────────────

test('#11: "Goal reached: {saved} of {required} home!"', () => {
  const { a, said } = makeAnnouncer();
  intro(a, 8, 10);
  said.length = 0;
  a.handleEvents([{ type: 'goal-reached', saved: 5 }], 0);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, 'Goal reached: 5 of 8 home!');
  assert.deepEqual(said[0]?.options, { key: 'goal' });
});

// ─── #12 Goal now impossible ───────────────────────────────────────────────────────────────────

test('#12: "Not enough mumbles left to reach {required}. Press R to try again."', () => {
  const { a, said } = makeAnnouncer();
  intro(a, 8, 10);
  said.length = 0;
  a.handleEvents([{ type: 'goal-impossible' }], 0);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, 'Not enough mumbles left to reach 8. Press R to try again.');
});

// ─── #24 nuke-started — assertive ──────────────────────────────────────────────────────────────

test('#24: "Popping all mumbles!" spoken assertive', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'nuke-started' }], 0);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, 'Popping all mumbles!');
  assert.equal(said[0]?.options?.politeness, 'assertive');
});

// ─── #26 time-low 60/30/10 ──────────────────────────────────────────────────────────────────────

test('#26: "1 minute left" / "30 seconds left" / "10 seconds left"', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'time-low', secondsLeft: 60 }], 0);
  a.handleEvents([{ type: 'time-low', secondsLeft: 30 }], 1);
  a.handleEvents([{ type: 'time-low', secondsLeft: 10 }], 2);
  assert.deepEqual(said.map((s) => s.text), ['1 minute left', '30 seconds left', '10 seconds left']);
  for (const s of said) assert.equal(s.options?.politeness ?? 'polite', 'polite');
});

// ─── #27 Relaxed clock hits 0 (once) ────────────────────────────────────────────────────────────

test('#27: "Time\'s up, but the relaxed timer lets you keep going."', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'overtime-started' }], 0);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, "Time's up, but the relaxed timer lets you keep going.");
});

// ─── #29-#33: level 'all' chatter rows ──────────────────────────────────────────────────────────

test('#29: "Builder: {n} bricks left", level all', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'builder-low-bricks', lemmingId: 1, bricksLeft: 2 }], 0);
  assert.equal(said[0]?.text, 'Builder: 2 bricks left');
  assert.equal(said[0]?.options?.level, 'all');
});

test('#30: "A builder ran out of planks", level all', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'builder-finished', lemmingId: 1 }], 0);
  assert.equal(said[0]?.text, 'A builder ran out of planks');
  assert.equal(said[0]?.options?.level, 'all');
});

test('#31: "{label} hit steel", level all', () => {
  const { a, said } = makeAnnouncer((id) => (id === 7 ? lemming({ id: 7, state: 'walking' }) : undefined));
  a.handleEvents([{ type: 'hit-steel', lemmingId: 7, x: 0, y: 0 }], 0);
  assert.ok(said[0]?.text.endsWith('hit steel'));
  assert.equal(said[0]?.options?.level, 'all');
});

test('#32: lets-go / entrance-opened / all-released, level all, own keys', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'lets-go' }, { type: 'entrance-opened' }, { type: 'all-released' }], 0);
  assert.deepEqual(
    said.map((s) => s.text),
    ['Off we go!', 'Hatch open', 'All mumbles are out'],
  );
  for (const s of said) assert.equal(s.options?.level, 'all');
  const keys = said.map((s) => s.options?.key);
  assert.equal(new Set(keys).size, 3, 'each of the three sub-events keeps its own coalescing key');
});

test('#33: "A bomber is about to pop" only when NOT nuking, level all', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents([{ type: 'lemming-ohno', lemmingId: 1, nuking: false }], 0);
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, 'A bomber is about to pop');
  assert.equal(said[0]?.options?.level, 'all');

  said.length = 0;
  a.handleEvents([{ type: 'lemming-ohno', lemmingId: 2, nuking: true }], 1);
  assert.equal(said.length, 0, 'nuking bombers do not each get an "about to pop" announcement');
});

// ─── #34 level-ended — assertive, three templates ──────────────────────────────────────────────

test('#34: won -> "Level complete! {saved} of {total} saved, {required} needed." (assertive)', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents(
    [{ type: 'level-ended', outcome: { won: true, saved: 8, required: 8, total: 10, reason: 'all-resolved', ticks: 100, overtimeTicks: 0 } }],
    0,
  );
  assert.equal(said[0]?.text, 'Level complete! 8 of 10 saved, 8 needed.');
  assert.equal(said[0]?.options?.politeness, 'assertive');
});

test('#34: lost (all-resolved) -> "Not quite. {saved} of {total} saved, {required} needed." (assertive)', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents(
    [{ type: 'level-ended', outcome: { won: false, saved: 3, required: 8, total: 10, reason: 'all-resolved', ticks: 100, overtimeTicks: 0 } }],
    0,
  );
  assert.equal(said[0]?.text, 'Not quite. 3 of 10 saved, 8 needed.');
  assert.equal(said[0]?.options?.politeness, 'assertive');
});

test('#34: lost (time-up) -> "Time\'s up! {saved} of {total} saved, {required} needed." (assertive)', () => {
  const { a, said } = makeAnnouncer();
  a.handleEvents(
    [{ type: 'level-ended', outcome: { won: false, saved: 3, required: 8, total: 10, reason: 'time-up', ticks: 100, overtimeTicks: 0 } }],
    0,
  );
  assert.equal(said[0]?.text, "Time's up! 3 of 10 saved, 8 needed.");
  assert.equal(said[0]?.options?.politeness, 'assertive');
});
