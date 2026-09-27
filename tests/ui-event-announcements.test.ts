/**
 * Unit tests for `src/ui/event-announcements.ts` — the tick-driven §7.3 catalogue rows (#1, #10–
 * #13, #24, #26–#27, #29–#34). Uses a fake `Speaker` that records every `say()` call, so each
 * assertion checks both the exact template text and the key/politeness/level options. DOM-free,
 * so it runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AnnounceQueue, type AnnounceOptions, type Speaker } from '../src/ui/announce-queue.ts';
import { EventAnnouncer, type IntroInfo } from '../src/ui/event-announcements.ts';
import { ANNOUNCE, describeLemming } from '../src/ui/strings.ts';
import { EVENT_BATCH_MS } from '../src/ui/ui-config.ts';
import { TICKS_PER_SECOND } from '../src/core/constants.ts';
import { SKILL_IDS, type GameEvent, type Lemming, type SkillCounts, type SkillId } from '../src/core/types.ts';

const BATCH_TICKS = Math.round((EVENT_BATCH_MS / 1000) * TICKS_PER_SECOND);

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

function announcer(lemmingById: (id: number) => Readonly<Lemming> | undefined = () => undefined): { announcer: EventAnnouncer; said: Said[] } {
  const { speaker, said } = fakeSpeaker();
  return { announcer: new EventAnnouncer(speaker, { lemmingById }), said };
}

// ─── #1 game ready ──────────────────────────────────────────────────────────────────────────────

test('#1: announces the exact ANNOUNCE.ready template with only the skills that have a count', () => {
  const { announcer: a, said } = announcer();
  const info: IntroInfo = {
    title: 'Spade first, questions later',
    required: 8,
    total: 10,
    skills: skillCounts({ digger: 3, builder: 5 }),
    selectedSkill: 'digger',
  };
  a.announceIntro(info);
  assert.equal(said.length, 1);
  // SKILL_IDS order (climber…digger): builder comes before digger.
  const expected = ANNOUNCE.ready('Spade first, questions later', 8, 10, [
    { skill: 'builder', count: 5 },
    { skill: 'digger', count: 3 },
  ], 'digger');
  assert.equal(said[0]?.text, expected);
  assert.ok(expected.includes('Digger 3'));
  assert.ok(expected.includes('Builder 5'));
  assert.ok(!expected.includes('Climber')); // 0-count skills are omitted
  assert.deepEqual(said[0]?.options, { key: 'ready' });
});

test('#1: falls back to a skill in the list when selectedSkill is null', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 1, total: 1, skills: skillCounts({ climber: 1 }), selectedSkill: null });
  assert.ok(said[0]?.text.includes('Climber chosen'));
});

// ─── #10 saves/losses batch (≥ 2 s apart) ──────────────────────────────────────────────────────

test('#10: batches saves/losses and flushes only once BATCH_TICKS have elapsed', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }], 0);
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 2 }], BATCH_TICKS - 1); // too soon
  assert.equal(said.length, 0);
  a.handleEvents([], BATCH_TICKS); // no new events, but the window has elapsed
  assert.equal(said.length, 1);
  assert.equal(said[0]?.text, ANNOUNCE.batch(2, 0, 2, 0));
  assert.equal(said[0]?.options?.key, 'batch:0'); // A11Y-4 round 2: generation-suffixed coalesce key
  assert.equal(typeof said[0]?.options?.merge, 'function'); // A11Y-2: sums s/l across a replaced batch
});

test('#10: omits the zero part and tracks a running "saved" total across batches', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }, { type: 'lemming-died', lemmingId: 2, cause: 'splat' }], BATCH_TICKS);
  assert.equal(said[0]?.text, ANNOUNCE.batch(1, 1, 1, 0));
  assert.ok(said[0]?.text.includes('1 saved, 1 lost'));

  a.handleEvents([{ type: 'lemming-died', lemmingId: 3, cause: 'drown' }], 2 * BATCH_TICKS);
  assert.equal(said[1]?.text, ANNOUNCE.batch(0, 1, 1, 0)); // saved delta omitted; total saved stays 1
  assert.ok(!said[1]?.text.includes('saved,'));
});

test('#10: no flush at all while nothing was saved or lost', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([], 10 * BATCH_TICKS);
  assert.equal(said.length, 0);
});

// ─── A11Y-2: through a REAL AnnounceQueue, a replaced-in-place batch sums s/l instead of losing them ──
//
// The fake `Speaker` above just records every `say()` call — it can't reproduce the actual bug,
// which lives in the announce queue's rule-2 "replace in place by key" coalescing. These tests
// wire EventAnnouncer to the real AnnounceQueue with a FROZEN clock, exactly like the repro
// (`__game.setRealtime(false)` + repeated `step()`: many BATCH_TICKS-apart flushes land within the
// same instant of real/wall-clock time, so the queue's own ≥1000ms polite gate never gets a
// chance to drain the still-queued 'batch' message between them).

function realQueueAnnouncer(): { a: EventAnnouncer; queue: AnnounceQueue } {
  const queue = new AnnounceQueue(() => 0); // frozen clock
  const speaker: Speaker = { say: (text, options) => queue.push(text, options) };
  return { a: new EventAnnouncer(speaker, { lemmingById: () => undefined }), queue };
}

test('A11Y-2: 10 saves folded into one still-queued batch message reads "10 saved", not "1 saved"', () => {
  const { a, queue } = realQueueAnnouncer();
  for (let i = 1; i <= 10; i++) {
    a.handleEvents([{ type: 'lemming-exited', lemmingId: i }], i * BATCH_TICKS);
  }
  const due = queue.due();
  assert.equal(due.length, 1);
  assert.equal(due[0]?.text, ANNOUNCE.batch(10, 0, 10, 0));
  assert.ok(due[0]?.text.startsWith('10 saved'));
});

test('A11Y-2: mixed saves/losses across replaced batches sum s and l independently; cumulative "saved" stays the latest value', () => {
  const { a, queue } = realQueueAnnouncer();
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }, { type: 'lemming-exited', lemmingId: 2 }], BATCH_TICKS);
  a.handleEvents([{ type: 'lemming-died', lemmingId: 3, cause: 'splat' }], BATCH_TICKS * 2);
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 4 }], BATCH_TICKS * 3);
  const due = queue.due();
  assert.equal(due.length, 1);
  assert.equal(due[0]?.text, ANNOUNCE.batch(3, 1, 3, 0)); // 2+1 saved, 1 lost, cumulative saved=3
});

// ─── #11/#12 goal reached / impossible ─────────────────────────────────────────────────────────

test('#11: goal-reached uses the level`s required count from announceIntro', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 8, total: 10, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  said.length = 0;
  a.handleEvents([{ type: 'goal-reached', saved: 8 }], 500);
  assert.deepEqual(said[0], { text: ANNOUNCE.goalReached(8, 8), options: { key: 'goal' } });
});

// ─── A11Y-4: a pending saved delta must not leave the joined "Goal reached" total stale ────────
//
// Bug: a save that reaches the goal in the same tick as an EARLIER, still-unflushed batch delta
// used to only speak the goal-reached message; the pending delta stayed unflushed until its own
// ≥2s schedule, so the next-flushed batch could later join with a DIFFERENT (older) "Goal reached"
// total once queued near it. Concretely, when several saves land within one throttle window and
// the last one reaches the goal, the utterance must never say e.g. "1 saved. 4 of 5 home. Goal
// reached: 5 of 5 home!" — two different running totals in one utterance.

test('A11Y-4: goal-reached flushes a pending saved delta first, so the batch and the goal clause share the same total', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 5, total: 5, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  said.length = 0;
  // The save that reaches the goal arrives in the SAME tick's events, well inside the batch
  // window (tick 1 — nowhere near BATCH_TICKS), so §10's own schedule would not have flushed it.
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }, { type: 'goal-reached', saved: 1 }], 1);
  assert.equal(said.length, 2, 'the pending delta is flushed as its own batch message before the goal clause');
  assert.equal(said[0]?.text, ANNOUNCE.batch(1, 0, 1, 5));
  assert.equal(said[0]?.options?.key, 'batch:0'); // A11Y-4 round 2: generation-suffixed coalesce key
  assert.equal(said[1]?.text, ANNOUNCE.goalReached(1, 5));
  assert.equal(said[1]?.options?.key, 'goal');
});

test('A11Y-4 round 2: goal-reached seals the batch coalesce key, so a save AFTER the goal flushes under a NEW key', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 5, total: 5, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  said.length = 0;
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 1 }, { type: 'goal-reached', saved: 1 }], 1);
  assert.equal(said[0]?.options?.key, 'batch:0');
  assert.equal(said[1]?.options?.key, 'goal');
  // A later save, once its own §10 window elapses, must NOT reuse 'batch:0' (the queued item that
  // sits BEFORE 'goal') — reusing it would let this later, higher total replace-in-place a message
  // the goal clause follows, running the batch ahead of "Goal reached" in reading order.
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 2 }], 1 + BATCH_TICKS);
  assert.equal(said.length, 3);
  assert.equal(said[2]?.text, ANNOUNCE.batch(1, 0, 2, 5));
  assert.equal(said[2]?.options?.key, 'batch:1');
});

test('A11Y-4: goal-reached with nothing pending does not add an extra flush (unchanged #11 behaviour)', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 8, total: 10, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  said.length = 0;
  a.handleEvents([{ type: 'goal-reached', saved: 8 }], 500);
  assert.equal(said.length, 1, 'no pending saved/died delta at goal time: no extra batch message');
  assert.deepEqual(said[0], { text: ANNOUNCE.goalReached(8, 8), options: { key: 'goal' } });
});

test('A11Y-4 (through a REAL AnnounceQueue): saves arriving within one throttle window where the goal is reached never join into an utterance with two different running totals', () => {
  const { a, queue } = realQueueAnnouncer();
  a.announceIntro({ title: 'T', required: 5, total: 5, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  queue.clear(); // drop #1 "ready" (not part of the utterance under test) without touching the pacing gate
  // 3 saves flush on schedule (queued, not yet spoken: frozen clock).
  a.handleEvents(
    [{ type: 'lemming-exited', lemmingId: 1 }, { type: 'lemming-exited', lemmingId: 2 }, { type: 'lemming-exited', lemmingId: 3 }],
    BATCH_TICKS,
  );
  // A 4th save flushes again (still frozen clock — replaces the queued 'batch' item in place).
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 4 }], BATCH_TICKS * 2);
  // A 5th save reaches the goal just 1 tick later — nowhere near another BATCH_TICKS window, so
  // without the A11Y-4 fix this delta would stay unflushed while "Goal reached: 5 of 5 home!"
  // joins the stale still-queued "…4 of 5 home." batch message in the very same utterance.
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 5 }, { type: 'goal-reached', saved: 5 }], BATCH_TICKS * 2 + 1);
  const due = queue.due();
  assert.equal(due.length, 1);
  assert.equal(due[0]?.text, `${ANNOUNCE.batch(5, 0, 5, 5)} ${ANNOUNCE.goalReached(5, 5)}`);
  assert.ok(!due[0]?.text.includes('4 of 5'), 'must not state a stale running total alongside the fresh one');
  // A11Y-2 still holds: {s} is the delta since the previous batch's cumulative (3 -> 4 -> 5 = 1+1),
  // folded with the earlier queued 3, so the coalesced s sums to the true total saved (5).
  assert.ok(due[0]?.text.startsWith('5 saved'));
});

test('A11Y-4 round 2 (through a REAL AnnounceQueue): saves AFTER the goal never rewrite the pre-goal batch message, so every total in the utterance reads in non-decreasing order', () => {
  const { a, queue } = realQueueAnnouncer();
  a.announceIntro({ title: 'T', required: 5, total: 5, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  queue.clear(); // drop #1 "ready"; not part of the utterance under test
  // 5 saves reach the goal, coalesced (round 1) into one pre-goal batch immediately followed by
  // "Goal reached: 5 of 5 home!" — same setup as the round-1 test above.
  a.handleEvents(
    [{ type: 'lemming-exited', lemmingId: 1 }, { type: 'lemming-exited', lemmingId: 2 }, { type: 'lemming-exited', lemmingId: 3 }],
    BATCH_TICKS,
  );
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 4 }], BATCH_TICKS * 2);
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 5 }, { type: 'goal-reached', saved: 5 }], BATCH_TICKS * 2 + 1);
  // 2 more saves land before the queue ever gets to speak (still frozen clock) — exactly what
  // __game.step() (or ×3 fast-forward in real play) can produce. Without round 2's key-sealing,
  // their eventual flush would replace-in-place the queued PRE-goal batch (same 'batch' key),
  // running it ahead of "Goal reached" once spoken: "7 saved. 7 of 5 home. Goal reached: 5 of 5
  // home!" — a total that goes backwards reading left to right.
  a.handleEvents([{ type: 'lemming-exited', lemmingId: 6 }, { type: 'lemming-exited', lemmingId: 7 }], BATCH_TICKS * 2 + 2); // too soon to flush yet
  a.handleEvents([], BATCH_TICKS * 3 + 3); // that window elapses: flushes under the NEW (post-goal) generation
  const due = queue.due();
  assert.equal(due.length, 1);
  assert.equal(
    due[0]?.text,
    `${ANNOUNCE.batch(5, 0, 5, 5)} ${ANNOUNCE.goalReached(5, 5)} ${ANNOUNCE.batch(2, 0, 7, 5)}`,
  );
  const totals = [...due[0]!.text.matchAll(/(\d+) of 5 home/g)].map((m) => Number(m[1]));
  assert.deepEqual(totals, [5, 5, 7], 'every "N of 5 home" figure, in reading order');
  for (let i = 1; i < totals.length; i++) {
    assert.ok(totals[i]! >= totals[i - 1]!, `totals must not go backwards: ${totals}`);
  }
});

test('#12: goal-impossible', () => {
  const { announcer: a, said } = announcer();
  a.announceIntro({ title: 'T', required: 5, total: 10, skills: skillCounts({ digger: 1 }), selectedSkill: 'digger' });
  said.length = 0;
  a.handleEvents([{ type: 'goal-impossible' }], 500);
  assert.deepEqual(said[0], { text: ANNOUNCE.goalImpossible(5), options: { key: 'goal' } });
});

// ─── #24 nuke-started (assertive) ───────────────────────────────────────────────────────────────

test('#24: nuke-started is assertive, keyed "arm"', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'nuke-started' }], 0);
  assert.deepEqual(said[0], { text: ANNOUNCE.nukeStarted, options: { politeness: 'assertive', key: 'arm' } });
});

// ─── #26/#27 time-low / relaxed overtime ───────────────────────────────────────────────────────

test('#26: time-low uses the exact 60/30/10 s templates', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'time-low', secondsLeft: 60 }], 0);
  a.handleEvents([{ type: 'time-low', secondsLeft: 30 }], 100);
  a.handleEvents([{ type: 'time-low', secondsLeft: 10 }], 200);
  assert.equal(said[0]?.text, '1 minute left');
  assert.equal(said[1]?.text, '30 seconds left');
  assert.equal(said[2]?.text, '10 seconds left');
  for (const s of said) assert.deepEqual(s.options, { key: 'time' });
});

test('#27: overtime-started (relaxed clock hits 0), once', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'overtime-started' }], 0);
  assert.deepEqual(said[0], { text: ANNOUNCE.relaxedTimeUp, options: { key: 'time' } });
});

// ─── #29–#33 builder/steel/hatch/bomber chatter (level 'all') ──────────────────────────────────

test('#29/#30: builder-low-bricks and builder-finished are level "all"', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'builder-low-bricks', lemmingId: 1, bricksLeft: 2 }], 0);
  a.handleEvents([{ type: 'builder-finished', lemmingId: 1 }], 1);
  assert.deepEqual(said[0], { text: ANNOUNCE.builderLow(2), options: { key: 'builder', level: 'all' } });
  assert.deepEqual(said[1], { text: ANNOUNCE.builderFinished, options: { key: 'builder', level: 'all' } });
});

test('#31: hit-steel uses describeLemming for a mumble that can still be found', () => {
  const lem = lemming({ id: 7, state: 'walking' });
  const { announcer: a, said } = announcer((id) => (id === 7 ? lem : undefined));
  a.handleEvents([{ type: 'hit-steel', lemmingId: 7, x: 0, y: 0 }], 0);
  assert.deepEqual(said[0], { text: ANNOUNCE.hitSteel(describeLemming(lem)), options: { key: 'steel', level: 'all' } });
});

test('#31: hit-steel falls back to a generic label when the mumble is gone', () => {
  const { announcer: a, said } = announcer(() => undefined);
  a.handleEvents([{ type: 'hit-steel', lemmingId: 99, x: 0, y: 0 }], 0);
  assert.ok(said[0]?.text.endsWith('hit steel'));
  assert.deepEqual(said[0]?.options, { key: 'steel', level: 'all' });
});

test('#32: lets-go / entrance-opened / all-released each use their own key, level "all"', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'lets-go' }], 0);
  a.handleEvents([{ type: 'entrance-opened' }], 1);
  a.handleEvents([{ type: 'all-released' }], 2);
  assert.deepEqual(said[0], { text: 'Off we go!', options: { key: 'letsGo', level: 'all' } });
  assert.deepEqual(said[1], { text: 'Hatch open', options: { key: 'hatchOpen', level: 'all' } });
  assert.deepEqual(said[2], { text: 'All mumbles are out', options: { key: 'allReleased', level: 'all' } });
});

test('#33: lemming-ohno announces only when not nuking', () => {
  const { announcer: a, said } = announcer();
  a.handleEvents([{ type: 'lemming-ohno', lemmingId: 1, nuking: true }], 0);
  assert.equal(said.length, 0, 'silent during a nuke (one nuke sound/announcement, not a chorus)');
  a.handleEvents([{ type: 'lemming-ohno', lemmingId: 1, nuking: false }], 1);
  assert.deepEqual(said[0], { text: ANNOUNCE.bomberWarning, options: { key: 'bomber', level: 'all' } });
});

// ─── #34 level-ended (assertive) ────────────────────────────────────────────────────────────────

test('#34: level-ended uses the won/lost/time-up templates and is assertive', () => {
  const { announcer: a, said } = announcer();
  const outcome = { won: true, saved: 8, required: 8, total: 10, reason: 'all-resolved' as const, ticks: 100, overtimeTicks: 0 };
  a.handleEvents([{ type: 'level-ended', outcome }], 0);
  assert.deepEqual(said[0], { text: ANNOUNCE.levelEnded(outcome), options: { politeness: 'assertive', key: 'levelEnded' } });
  assert.ok(said[0]?.text.startsWith('Level complete!'));
});

test('#34: lost at time-up reads "Time`s up!"', () => {
  const { announcer: a, said } = announcer();
  const outcome = { won: false, saved: 3, required: 8, total: 10, reason: 'time-up' as const, ticks: 100, overtimeTicks: 0 };
  a.handleEvents([{ type: 'level-ended', outcome }], 0);
  assert.ok(said[0]?.text.startsWith("Time's up!"));
});

test('#34: lost by all-resolved reads "Not quite."', () => {
  const { announcer: a, said } = announcer();
  const outcome = { won: false, saved: 3, required: 8, total: 10, reason: 'all-resolved' as const, ticks: 100, overtimeTicks: 0 };
  a.handleEvents([{ type: 'level-ended', outcome }], 0);
  assert.ok(said[0]?.text.startsWith('Not quite.'));
});

// ─── Events this class deliberately ignores ────────────────────────────────────────────────────

test('events with no §7.3 row here (e.g. skill-assigned) produce no announcement', () => {
  const { announcer: a, said } = announcer();
  const ignored: readonly GameEvent[] = [
    { type: 'skill-assigned', lemmingId: 1, skill: 'digger' },
    { type: 'explosion', lemmingId: 1, x: 0, y: 0 },
    { type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 },
    { type: 'release-rate-changed', rate: 50 },
    { type: 'lemming-spawned', lemmingId: 1, x: 0, y: 0 },
  ];
  a.handleEvents(ignored, 0);
  assert.equal(said.length, 0);
});
