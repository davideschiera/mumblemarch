/**
 * INDEPENDENT validation for workstream D ("audio"), task D-V1 — `src/audio/event-sounds.ts`
 * against DESIGN.md §8.3 (catalogue + "Not sounded"), §8.4 (voice pitch), §8.5 ("Pitch arg" for
 * `builder-low`), DESIGN-APPENDIX App. E.4 S2, and CONTRACTS.md §6.
 *
 * Expected ids/pitches below are transcribed from the spec documents, not from
 * `event-sounds.ts` itself (see docs/PROGRESS.md D-V1 kickoff). Coordinator clarifications used:
 * once-per-level is per-id (not tested here, see audio-limiter.test.ts); `skill-rejected` reasons
 * `not-applicable`/`blocker-overlap`/`too-high`/`no-lemming` → `ui-deny`; `soundFor` pitch is 1
 * for every non-voice cue except `builder-low`; `builder-low` pitch clamps (≥3 bricks → 1,
 * ≤1 → 4/3); unknown theme → `trap` fallback sound.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { DeathCause, GameEvent, LevelOutcome, SkillRejectReason } from '../src/core/types.ts';
import { SKILL_IDS } from '../src/core/types.ts';
import { EventSounds, lemmingPitch, soundFor, type SoundCue, type SoundPlayer } from '../src/audio/event-sounds.ts';
import { SFX_IDS, VOICE_SFX, type SfxId } from '../src/audio/sfx-ids.ts';
import { THEME_IDS, type ThemeId } from '../src/levels/themes.ts';

// ─── Fixtures ──────────────────────────────────────────────────────────────────────────────

/** DESIGN.md §8.3 covers the 5 level themes; add one unknown id (App. E.4 S2 fallback rule). */
const THEMES_TO_CHECK: readonly string[] = [...THEME_IDS, 'not-a-real-theme'];

const SKILL_REJECT_REASONS: readonly SkillRejectReason[] = [
  'none-left',
  'not-applicable',
  'steel',
  'one-way',
  'blocker-overlap',
  'too-high',
  'no-lemming',
  'level-ended',
];

const DEATH_CAUSES: readonly DeathCause[] = ['splat', 'drown', 'burn', 'trap', 'explode', 'out-of-bounds'];

function wonOutcome(): LevelOutcome {
  return { won: true, saved: 8, required: 8, total: 8, reason: 'all-resolved', ticks: 4000, overtimeTicks: 0 };
}
function lostOutcome(): LevelOutcome {
  return { won: false, saved: 3, required: 8, total: 8, reason: 'time-up', ticks: 5100, overtimeTicks: 0 };
}

function expectCue(actual: SoundCue | null, id: SfxId, pitch = 1): void {
  assert.ok(actual !== null, `expected {id: ${id}, pitch: ${pitch}}, got null`);
  assert.equal(actual.id, id);
  assert.ok(Math.abs(actual.pitch - pitch) < 1e-9, `pitch ${actual.pitch} !== ${pitch}`);
}

// ─── §8.4 voice pitch: pitchSemitones(id) = ((id*5+3) mod 7) - 3, pitch = 2^(st/12) ────────

test('lemmingPitch: formula matches DESIGN §8.4 for ids 0..20', () => {
  for (let id = 0; id <= 20; id++) {
    const semitone = (((id * 5 + 3) % 7) + 7) % 7 - 3; // spec formula, non-negative mod
    const expected = 2 ** (semitone / 12);
    const actual = lemmingPitch(id);
    assert.ok(Math.abs(actual - expected) < 1e-12, `id ${id}: expected ${expected}, got ${actual}`);
  }
});

test('lemmingPitch: every semitone offset is in -3..+3', () => {
  for (let id = 0; id <= 200; id++) {
    const pitch = lemmingPitch(id);
    const semitone = 12 * Math.log2(pitch);
    assert.ok(semitone >= -3 - 1e-9 && semitone <= 3 + 1e-9, `id ${id}: semitone ${semitone} out of range`);
    // Must be one of the 7 values the spec's mod-7 formula can produce (integers -3..3).
    assert.ok(Math.abs(semitone - Math.round(semitone)) < 1e-9, `id ${id}: semitone ${semitone} not an integer`);
  }
});

test('lemmingPitch: 7 consecutive ids are pairwise distinct (never repeats within a run of 7)', () => {
  for (const start of [0, 1, 5, 13, 100]) {
    const pitches = Array.from({ length: 7 }, (_, i) => lemmingPitch(start + i));
    const rounded = pitches.map((p) => Math.round(12 * Math.log2(p) * 1e6));
    assert.equal(new Set(rounded).size, 7, `ids ${start}..${start + 6} should give 7 distinct pitches`);
  }
});

// ─── soundFor: every GameEvent variant × every theme (DESIGN §8.3, App. E.4 S2) ────────────

test('soundFor: lets-go -> lets-go (level-wide, pitch 1)', () => {
  for (const themeId of THEMES_TO_CHECK) {
    expectCue(soundFor({ type: 'lets-go' }, { themeId }), 'lets-go', 1);
  }
});

test('soundFor: entrance-opened -> entrance-open', () => {
  for (const themeId of THEMES_TO_CHECK) {
    expectCue(soundFor({ type: 'entrance-opened' }, { themeId }), 'entrance-open', 1);
  }
});

test('soundFor: lemming-spawned is not sounded (DESIGN §8.3 "Not sounded")', () => {
  const event: GameEvent = { type: 'lemming-spawned', lemmingId: 3, x: 10, y: 20 };
  for (const themeId of THEMES_TO_CHECK) assert.equal(soundFor(event, { themeId }), null);
});

test('soundFor: skill-assigned -> fuse for bomber, assign for every other skill', () => {
  for (const skill of SKILL_IDS) {
    const event: GameEvent = { type: 'skill-assigned', lemmingId: 1, skill };
    const expected: SfxId = skill === 'bomber' ? 'fuse' : 'assign';
    expectCue(soundFor(event, { themeId: 'mossgrove' }), expected, 1);
  }
});

test('soundFor: skill-rejected -> per coordinator mapping, for every SkillRejectReason', () => {
  const expected: Readonly<Record<SkillRejectReason, SfxId | null>> = {
    'none-left': 'ui-empty',
    'not-applicable': 'ui-deny',
    steel: 'steel',
    'one-way': 'steel',
    'blocker-overlap': 'ui-deny',
    'too-high': 'ui-deny',
    'no-lemming': 'ui-deny',
    'level-ended': null,
  };
  for (const reason of SKILL_REJECT_REASONS) {
    // lemmingId may be null (e.g. no-lemming); skill is arbitrary — soundFor ignores it here.
    const event: GameEvent = { type: 'skill-rejected', lemmingId: reason === 'no-lemming' ? null : 2, skill: 'digger', reason };
    const want = expected[reason];
    const got = soundFor(event, { themeId: 'sugarworks' });
    if (want === null) assert.equal(got, null, `reason ${reason} should be silent`);
    else expectCue(got, want, 1);
  }
});

test('soundFor: lemming-exited -> exit, pitched per lemmingId', () => {
  for (const id of [0, 1, 7, 15]) {
    const event: GameEvent = { type: 'lemming-exited', lemmingId: id };
    expectCue(soundFor(event, { themeId: 'foundry' }), 'exit', lemmingPitch(id));
  }
});

test('soundFor: lemming-died -> splat/drown/burn sound; trap/explode/out-of-bounds silent', () => {
  const expected: Readonly<Record<DeathCause, SfxId | null>> = {
    splat: 'splat',
    drown: 'drown',
    burn: 'burn',
    trap: null,
    explode: null,
    'out-of-bounds': null,
  };
  for (const cause of DEATH_CAUSES) {
    const event: GameEvent = { type: 'lemming-died', lemmingId: 4, cause };
    const want = expected[cause];
    const got = soundFor(event, { themeId: 'observatory' });
    if (want === null) assert.equal(got, null, `cause ${cause} should be silent (§8.3 "Not sounded")`);
    else expectCue(got, want, 1);
  }
});

test('soundFor: lemming-ohno -> silent while nuking, else ohno pitched per lemmingId', () => {
  for (const id of [0, 2, 9]) {
    const nuking: GameEvent = { type: 'lemming-ohno', lemmingId: id, nuking: true };
    assert.equal(soundFor(nuking, { themeId: 'reef' }), null, 'nuking ohno must be silent (one nuke sound, not a chorus)');
    const solo: GameEvent = { type: 'lemming-ohno', lemmingId: id, nuking: false };
    expectCue(soundFor(solo, { themeId: 'reef' }), 'ohno', lemmingPitch(id));
  }
});

test('soundFor: explosion -> explosion', () => {
  const event: GameEvent = { type: 'explosion', lemmingId: 1, x: 5, y: 6 };
  expectCue(soundFor(event, { themeId: 'mossgrove' }), 'explosion', 1);
});

test('soundFor: builder-low-bricks -> builder-low, pitch clamps per DESIGN §8.5 {3:1, 2:7/6, 1:4/3}', () => {
  const cases: ReadonlyArray<readonly [number, number]> = [
    [5, 1], // >=3 bricks left -> clamp to the "3" pitch
    [4, 1],
    [3, 1],
    [2, 7 / 6],
    [1, 4 / 3],
    [0, 4 / 3], // <=1 -> clamp to the "1" pitch
    [-1, 4 / 3],
  ];
  for (const [bricksLeft, pitch] of cases) {
    const event: GameEvent = { type: 'builder-low-bricks', lemmingId: 1, bricksLeft };
    expectCue(soundFor(event, { themeId: 'sugarworks' }), 'builder-low', pitch);
  }
});

test('soundFor: builder-finished -> builder-shrug, pitched per lemmingId', () => {
  for (const id of [0, 3, 11]) {
    const event: GameEvent = { type: 'builder-finished', lemmingId: id };
    expectCue(soundFor(event, { themeId: 'foundry' }), 'builder-shrug', lemmingPitch(id));
  }
});

test('soundFor: hit-steel -> steel', () => {
  const event: GameEvent = { type: 'hit-steel', lemmingId: 1, x: 1, y: 2 };
  expectCue(soundFor(event, { themeId: 'observatory' }), 'steel', 1);
});

test('soundFor: trap-triggered -> theme-specific trap sound (App. E.4 S2), unknown theme -> trap fallback', () => {
  const expectedByTheme: Readonly<Record<ThemeId, SfxId>> = {
    mossgrove: 'trap-flytrap',
    sugarworks: 'trap-press',
    observatory: 'trap-pendulum',
    foundry: 'trap-piston',
    reef: 'trap-clam',
  };
  for (const themeId of THEME_IDS) {
    const event: GameEvent = { type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 };
    expectCue(soundFor(event, { themeId }), expectedByTheme[themeId], 1);
  }
  const event: GameEvent = { type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 };
  expectCue(soundFor(event, { themeId: 'not-a-real-theme' }), 'trap', 1);
});

test('soundFor: release-rate-changed / all-released are not sounded (§8.3 "Not sounded")', () => {
  for (const event of [{ type: 'release-rate-changed', rate: 50 } as const, { type: 'all-released' } as const]) {
    for (const themeId of THEMES_TO_CHECK) assert.equal(soundFor(event, { themeId }), null);
  }
});

test('soundFor: nuke-started -> nuke', () => {
  expectCue(soundFor({ type: 'nuke-started' }, { themeId: 'mossgrove' }), 'nuke', 1);
});

test('soundFor: time-low -> time-low, for every secondsLeft', () => {
  for (const secondsLeft of [60, 30, 10]) {
    const event: GameEvent = { type: 'time-low', secondsLeft };
    expectCue(soundFor(event, { themeId: 'reef' }), 'time-low', 1);
  }
});

test('soundFor: level-ended -> level-won when outcome.won, else level-lost', () => {
  for (const themeId of THEMES_TO_CHECK) {
    expectCue(soundFor({ type: 'level-ended', outcome: wonOutcome() }, { themeId }), 'level-won', 1);
    expectCue(soundFor({ type: 'level-ended', outcome: lostOutcome() }, { themeId }), 'level-lost', 1);
  }
});

test('soundFor: overtime-started / goal-reached / goal-impossible are silent (not in the §8.3 catalogue)', () => {
  const events: readonly GameEvent[] = [
    { type: 'overtime-started' },
    { type: 'goal-reached', saved: 4 },
    { type: 'goal-impossible' },
  ];
  for (const event of events) {
    for (const themeId of THEMES_TO_CHECK) assert.equal(soundFor(event, { themeId }), null);
  }
});

test('soundFor: every non-null cue returns an id from SFX_IDS', () => {
  const ids = new Set<string>(SFX_IDS);
  const sampleEvents: readonly GameEvent[] = [
    { type: 'lets-go' },
    { type: 'entrance-opened' },
    ...SKILL_IDS.map((skill): GameEvent => ({ type: 'skill-assigned', lemmingId: 1, skill })),
    { type: 'lemming-exited', lemmingId: 1 },
    ...DEATH_CAUSES.map((cause): GameEvent => ({ type: 'lemming-died', lemmingId: 1, cause })),
    { type: 'lemming-ohno', lemmingId: 1, nuking: false },
    { type: 'explosion', lemmingId: 1, x: 0, y: 0 },
    { type: 'builder-low-bricks', lemmingId: 1, bricksLeft: 2 },
    { type: 'builder-finished', lemmingId: 1 },
    { type: 'hit-steel', lemmingId: 1, x: 0, y: 0 },
    { type: 'trap-triggered', hazardIndex: 0, lemmingId: 1 },
    { type: 'nuke-started' },
    { type: 'time-low', secondsLeft: 10 },
    { type: 'level-ended', outcome: wonOutcome() },
    { type: 'level-ended', outcome: lostOutcome() },
  ];
  for (const themeId of THEMES_TO_CHECK) {
    for (const event of sampleEvents) {
      const cue = soundFor(event, { themeId });
      if (cue) assert.ok(ids.has(cue.id), `${event.type} -> unknown sfx id ${cue.id}`);
    }
  }
});

// ─── VOICE_SFX (CONTRACTS §6, DESIGN-APPENDIX App. E.4 S1) ─────────────────────────────────

test('VOICE_SFX is exactly the 4 voice ids', () => {
  assert.deepEqual([...VOICE_SFX].sort(), ['builder-shrug', 'exit', 'lets-go', 'ohno'].sort());
});

// ─── EventSounds: fires onCue + play() in event order, silent events produce nothing ───────

class FakePlayer implements SoundPlayer {
  readonly calls: Array<{ id: SfxId; pitch: number | undefined }> = [];
  play(id: SfxId, pitch?: number): void {
    this.calls.push({ id, pitch });
  }
}

test('EventSounds: calls onCue and play() for every sounded event, in order; nothing for silent ones', () => {
  const player = new FakePlayer();
  const cues: SoundCue[] = [];
  const sink = new EventSounds(player, { themeId: () => 'mossgrove', onCue: (cue) => cues.push(cue) });

  const events: readonly GameEvent[] = [
    { type: 'lets-go' }, // sounded: lets-go
    { type: 'lemming-spawned', lemmingId: 0, x: 0, y: 0 }, // silent
    { type: 'skill-assigned', lemmingId: 0, skill: 'builder' }, // sounded: assign
    { type: 'skill-rejected', lemmingId: null, skill: 'digger', reason: 'level-ended' }, // silent
    { type: 'hit-steel', lemmingId: 0, x: 1, y: 1 }, // sounded: steel
    { type: 'lemming-died', lemmingId: 0, cause: 'out-of-bounds' }, // silent
    { type: 'trap-triggered', hazardIndex: 0, lemmingId: 0 }, // sounded: trap-flytrap (mossgrove)
    { type: 'level-ended', outcome: wonOutcome() }, // sounded: level-won
  ];
  sink.handleEvents(events, 100);

  assert.deepEqual(
    cues.map((c) => c.id),
    ['lets-go', 'assign', 'steel', 'trap-flytrap', 'level-won'],
  );
  assert.deepEqual(
    player.calls.map((c) => c.id),
    ['lets-go', 'assign', 'steel', 'trap-flytrap', 'level-won'],
  );
  // Every play() call's pitch matches the cue reported to onCue, in the same order.
  for (let i = 0; i < cues.length; i++) {
    const call = player.calls[i];
    assert.ok(call);
    assert.equal(call.pitch, cues[i]?.pitch);
  }
});

test('EventSounds: onCue fires even though this fake player never "mutes" (captions = visual twin, DESIGN §8.1)', () => {
  const player = new FakePlayer();
  let cueCount = 0;
  const sink = new EventSounds(player, { themeId: () => 'reef', onCue: () => cueCount++ });
  sink.handleEvents([{ type: 'nuke-started' }], 1);
  assert.equal(cueCount, 1);
  assert.equal(player.calls.length, 1);
});

test('EventSounds: works with no onCue supplied (optional per CONTRACTS §6)', () => {
  const player = new FakePlayer();
  const sink = new EventSounds(player, { themeId: () => 'mossgrove' });
  assert.doesNotThrow(() => sink.handleEvents([{ type: 'nuke-started' }], 1));
  assert.deepEqual(
    player.calls.map((c) => c.id),
    ['nuke'],
  );
});
