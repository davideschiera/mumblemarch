/**
 * INDEPENDENT validation for workstream D ("audio"), task D-V1 — `src/audio/music-data.ts`
 * against DESIGN.md §8.6 (table + scheduling constants), DESIGN-APPENDIX App. C (note data), and
 * the lab's `compileTheme`/`scheduleTheme` (`docs/design/mockups/audio-lab.html` lines 509–566),
 * which DESIGN §8.6 calls authoritative.
 *
 * Coordinator clarification used: music variant n -> n mod 3 (non-negative) with transpose
 * +0/+2/-3 semitones and BPM +0/+4/-4; unknown theme -> mossgrove loop.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  compileTheme,
  hz,
  LOOK_AHEAD_S,
  MIX,
  MUSIC,
  MUSIC_FADE_IN_S,
  MUSIC_START_TICK,
  MUSIC_STOP_FADE_S,
  midiOf,
  musicVariant,
  PUMP_MS,
  themeEvents,
  themeForLevel,
  type MusicId,
} from '../src/audio/music-data.ts';

const MUSIC_IDS: readonly MusicId[] = ['title', 'mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef'];

// ─── DESIGN §8.6 table, transcribed independently ──────────────────────────────────────────

interface ExpectedTheme {
  readonly title: string;
  readonly bpm: number;
  readonly key: string;
  readonly lead: 'pulse12' | 'pulse25' | 'pulse50' | 'triangle';
  readonly bars: number;
  readonly echo: boolean;
  /** Approx loop seconds at variant 0, from the table's "Loop" column (± rounding). */
  readonly loopSApprox: number;
}

const EXPECTED: Readonly<Record<MusicId, ExpectedTheme>> = {
  title: { title: 'Doorstep Fanfare', bpm: 124, key: 'C major', lead: 'pulse25', bars: 4, echo: false, loopSApprox: 7.74 },
  mossgrove: { title: 'Bog Hop', bpm: 116, key: 'G major', lead: 'pulse25', bars: 8, echo: false, loopSApprox: 16.55 },
  sugarworks: { title: 'Taffy Pull', bpm: 132, key: 'F major', lead: 'pulse12', bars: 8, echo: false, loopSApprox: 14.55 },
  observatory: { title: 'Clockwork Stars', bpm: 100, key: 'D dorian', lead: 'triangle', bars: 8, echo: false, loopSApprox: 19.2 },
  foundry: { title: 'Piston Polka', bpm: 150, key: 'A harmonic minor', lead: 'pulse50', bars: 8, echo: false, loopSApprox: 12.8 },
  reef: { title: 'Tide Tumble', bpm: 108, key: 'B♭ major', lead: 'triangle', bars: 8, echo: true, loopSApprox: 17.78 },
};

test('MUSIC: title/bpm/key/lead/echo match the DESIGN §8.6 table for all 6 themes', () => {
  for (const id of MUSIC_IDS) {
    const th = MUSIC[id];
    const want = EXPECTED[id];
    assert.equal(th.title, want.title, `${id}: title`);
    assert.equal(th.bpm, want.bpm, `${id}: bpm`);
    assert.equal(th.key, want.key, `${id}: key`);
    assert.equal(th.lead, want.lead, `${id}: lead`);
    assert.equal(th.melody.length, want.bars, `${id}: bars (melody length)`);
    assert.equal(!!th.echo, want.echo, `${id}: echo`);
  }
});

test('compileTheme: all 6 themes parse with 0 errors, for variants 0/1/2', () => {
  for (const id of MUSIC_IDS) {
    for (const variant of [0, 1, 2]) {
      const compiled = compileTheme(MUSIC[id], variant);
      assert.deepEqual(compiled.errors, [], `${id} variant ${variant}: ${compiled.errors.join('; ')}`);
    }
  }
});

test('compileTheme: loop length (variant 0) matches bars*4*(60/bpm) and the §8.6 table (± 0.05 s)', () => {
  for (const id of MUSIC_IDS) {
    const want = EXPECTED[id];
    const expectedLoopDur = want.bars * 4 * (60 / want.bpm); // DESIGN §8.6 "the theme loop ... bars"
    const compiled = compileTheme(MUSIC[id], 0);
    assert.ok(Math.abs(compiled.loopDur - expectedLoopDur) < 1e-9, `${id}: loopDur ${compiled.loopDur} vs ${expectedLoopDur}`);
    assert.ok(Math.abs(compiled.loopDur - want.loopSApprox) < 0.05, `${id}: loopDur ${compiled.loopDur} vs table ~${want.loopSApprox}`);
  }
});

// ─── Per-level variety (§8.6 "Per-level variety" + coordinator clarification) ──────────────

test('musicVariant: n mod 3, non-negative, for negative and large n', () => {
  assert.equal(musicVariant(0), 0);
  assert.equal(musicVariant(1), 1);
  assert.equal(musicVariant(2), 2);
  assert.equal(musicVariant(3), 0);
  assert.equal(musicVariant(4), 1);
  assert.equal(musicVariant(-1), 2);
  assert.equal(musicVariant(-2), 1);
  assert.equal(musicVariant(-3), 0);
  assert.equal(musicVariant(-4), 2);
});

test('compileTheme: variant 1 transposes every pitched note +2 semitones and BPM +4; drums unchanged', () => {
  for (const id of MUSIC_IDS) {
    const th = MUSIC[id];
    const base = compileTheme(th, 0);
    const v1 = compileTheme(th, 1);
    assert.equal(v1.bpm, th.bpm + 4, `${id}: bpm`);
    assert.equal(v1.lead.length, base.lead.length);
    for (let i = 0; i < base.lead.length; i++) assert.equal(v1.lead[i]?.midi, (base.lead[i]?.midi ?? NaN) + 2, `${id}: lead[${i}]`);
    for (let i = 0; i < base.bass.length; i++) assert.equal(v1.bass[i]?.midi, (base.bass[i]?.midi ?? NaN) + 2, `${id}: bass[${i}]`);
    for (let i = 0; i < base.arp.length; i++) assert.equal(v1.arp[i]?.midi, (base.arp[i]?.midi ?? NaN) + 2, `${id}: arp[${i}]`);
    assert.deepEqual(v1.drums, base.drums, `${id}: drums must not change with the variant`);
  }
});

test('compileTheme: variant 2 transposes every pitched note -3 semitones and BPM -4; drums unchanged', () => {
  for (const id of MUSIC_IDS) {
    const th = MUSIC[id];
    const base = compileTheme(th, 0);
    const v2 = compileTheme(th, 2);
    assert.equal(v2.bpm, th.bpm - 4, `${id}: bpm`);
    for (let i = 0; i < base.lead.length; i++) assert.equal(v2.lead[i]?.midi, (base.lead[i]?.midi ?? NaN) - 3, `${id}: lead[${i}]`);
    for (let i = 0; i < base.bass.length; i++) assert.equal(v2.bass[i]?.midi, (base.bass[i]?.midi ?? NaN) - 3, `${id}: bass[${i}]`);
    assert.deepEqual(v2.drums, base.drums, `${id}: drums must not change with the variant`);
  }
});

// ─── App. C note data spot-check (first bars, variant 0 / no transpose) ────────────────────

test('App. C: mossgrove lead bar 1 "D5 . B4 . G4 A4 B4 -" compiles to the expected steps/pitches', () => {
  const compiled = compileTheme(MUSIC.mossgrove, 0);
  // D5=74, B4=71, G4=67, A4=69; the trailing "-" holds B4 for 2 steps (6,7).
  const first5 = compiled.lead.slice(0, 5);
  assert.deepEqual(
    first5.map((n) => ({ step: n.step, len: n.len, midi: n.midi })),
    [
      { step: 0, len: 1, midi: 74 },
      { step: 2, len: 1, midi: 71 },
      { step: 4, len: 1, midi: 67 },
      { step: 5, len: 1, midi: 69 },
      { step: 6, len: 2, midi: 71 },
    ],
  );
});

test('App. C: foundry lead bar 1 "A4 . C5 . E5 . A5 ." compiles to the expected steps/pitches', () => {
  const compiled = compileTheme(MUSIC.foundry, 0);
  // A4=69, C5=72, E5=76, A5=81, each a single unheld 8th.
  const first4 = compiled.lead.slice(0, 4);
  assert.deepEqual(
    first4.map((n) => ({ step: n.step, len: n.len, midi: n.midi })),
    [
      { step: 0, len: 1, midi: 69 },
      { step: 2, len: 1, midi: 72 },
      { step: 4, len: 1, midi: 76 },
      { step: 6, len: 1, midi: 81 },
    ],
  );
});

test('App. C: reef lead bar 1 "F4 . Bb4 . D5 - C5 Bb4" compiles to the expected steps/pitches', () => {
  const compiled = compileTheme(MUSIC.reef, 0);
  // F4=65, Bb4=70, D5=74 held into step5 (len2), C5=72, Bb4=70.
  const first5 = compiled.lead.slice(0, 5);
  assert.deepEqual(
    first5.map((n) => ({ step: n.step, len: n.len, midi: n.midi })),
    [
      { step: 0, len: 1, midi: 65 },
      { step: 2, len: 1, midi: 70 },
      { step: 4, len: 2, midi: 74 },
      { step: 6, len: 1, midi: 72 },
      { step: 7, len: 1, midi: 70 },
    ],
  );
});

// ─── themeEvents: lab scheduleTheme timing rules (lines 553–566) ───────────────────────────

test('themeEvents: sorted by time, all within [0, loopDur), count = lead+bass+arp+drums', () => {
  for (const id of MUSIC_IDS) {
    const th = MUSIC[id];
    const compiled = compileTheme(th, 0);
    const events = themeEvents(compiled, th);
    assert.equal(events.length, compiled.lead.length + compiled.bass.length + compiled.arp.length + compiled.drums.length, id);
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1];
      const cur = events[i];
      assert.ok(prev && cur && cur.time >= prev.time, `${id}: events must be time-sorted`);
    }
    for (const ev of events) {
      assert.ok(ev.time >= 0 && ev.time < compiled.loopDur, `${id}: event at ${ev.time} outside [0, ${compiled.loopDur})`);
    }
  }
});

test('themeEvents: lead time = step*(beat/2), dur = len*(beat/2)*0.9 (lab line 561)', () => {
  const th = MUSIC.mossgrove;
  const compiled = compileTheme(th, 0);
  const e8 = compiled.beat / 2;
  const events = themeEvents(compiled, th);
  const leadEvents = events.filter((e) => e.kind === 'lead');
  // First lead note: step 0, len 1.
  const first = leadEvents[0];
  assert.ok(first);
  assert.ok(Math.abs(first.time - 0) < 1e-9);
  assert.ok(Math.abs(first.dur - 1 * e8 * 0.9) < 1e-9);
  assert.ok(Math.abs(first.freq - hz(74)) < 1e-9); // D5
  // The held note at step 6, len 2 (see App. C spot-check above).
  const held = leadEvents.find((e) => Math.abs(e.time - 6 * e8) < 1e-9);
  assert.ok(held, 'expected a lead event at step 6');
  assert.ok(held && Math.abs(held.dur - 2 * e8 * 0.9) < 1e-9);
});

test('themeEvents: bass time = step*beat, dur = min(len*beat*0.9, beat*0.55+(len-1)*beat) (lab line 562)', () => {
  // Cover both branches of the min(): mossgrove's bass is all len-1 notes; observatory's and
  // reef's hold every other quarter (len 2), which is the branch most likely to regress.
  for (const id of ['mossgrove', 'observatory', 'reef'] as const) {
    const th = MUSIC[id];
    const compiled = compileTheme(th, 0);
    const events = themeEvents(compiled, th);
    const bassEvents = events.filter((e) => e.kind === 'bass');
    if (id !== 'mossgrove') assert.ok(compiled.bass.some((n) => n.len > 1), `${id}: fixture should include a held bass note`);
    for (let i = 0; i < compiled.bass.length; i++) {
      const n = compiled.bass[i];
      assert.ok(n);
      const expectedTime = n.step * compiled.beat;
      const expectedDur = Math.min(n.len * compiled.beat * 0.9, compiled.beat * 0.55 + (n.len - 1) * compiled.beat);
      const ev = bassEvents.find((e) => Math.abs(e.time - expectedTime) < 1e-9);
      assert.ok(ev, `${id}: bass note at step ${n.step} not found in events`);
      assert.ok(ev && Math.abs(ev.dur - expectedDur) < 1e-9, `${id}: bass note at step ${n.step}: dur ${ev?.dur} vs ${expectedDur}`);
    }
  }
});

test('themeEvents: arp time = step*(beat/4), dur = (beat/4)*0.7; drums time = step*(beat/4), dur = 0 (lab lines 563–564)', () => {
  const th = MUSIC.observatory; // has an arp track
  const compiled = compileTheme(th, 0);
  const e16 = compiled.beat / 4;
  const events = themeEvents(compiled, th);
  const arpEvents = events.filter((e) => e.kind === 'arp');
  assert.equal(arpEvents.length, compiled.arp.length);
  for (const ev of arpEvents) assert.ok(Math.abs(ev.dur - e16 * 0.7) < 1e-9);
  const drumEvents = events.filter((e) => e.kind === 'k' || e.kind === 's' || e.kind === 'h');
  assert.equal(drumEvents.length, compiled.drums.length);
  for (const d of compiled.drums) {
    const expectedTime = d.step * e16;
    const ev = drumEvents.find((e) => e.kind === d.kind && Math.abs(e.time - expectedTime) < 1e-9);
    assert.ok(ev, `drum ${d.kind} at step ${d.step} not found`);
    assert.equal(ev?.dur, 0, `drum hits have 0 duration`);
    assert.equal(ev?.freq, 0, `drum hits have 0 freq`);
  }
});

// ─── Pitch helpers ──────────────────────────────────────────────────────────────────────────

test('midiOf: note-name parsing (A4=69, sharps, flats)', () => {
  assert.equal(midiOf('A4'), 69);
  assert.equal(midiOf('C4'), 60);
  assert.equal(midiOf('C#4'), 61);
  assert.equal(midiOf('Bb3'), 58);
  assert.equal(midiOf('.'), null);
  assert.equal(midiOf('-'), null);
});

test('hz: A4 (midi 69) = 440 Hz; A5 (midi 81) = 880 Hz', () => {
  assert.equal(hz(69), 440);
  assert.ok(Math.abs(hz(81) - 880) < 1e-9);
});

// ─── themeForLevel (unknown theme -> mossgrove, coordinator clarification) ─────────────────

test('themeForLevel: known level themes map to themselves; unknown falls back to mossgrove', () => {
  for (const id of ['mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef'] as const) {
    assert.equal(themeForLevel(id), id);
  }
  assert.equal(themeForLevel('not-a-real-theme'), 'mossgrove');
  assert.equal(themeForLevel('title'), 'mossgrove', 'title is a one-shot jingle, not a level loop');
});

// ─── Scheduling constants (DESIGN §8.1, §8.6) ──────────────────────────────────────────────

test('scheduling constants match DESIGN §8.1/§8.6', () => {
  assert.equal(MUSIC_START_TICK, 55);
  assert.equal(MUSIC_FADE_IN_S, 1.5);
  assert.equal(MUSIC_STOP_FADE_S, 0.4);
  assert.equal(LOOK_AHEAD_S, 0.1);
  assert.equal(PUMP_MS, 25);
});

// ─── Mix levels (DESIGN §8.6, the lab's authoritative MIX object) ──────────────────────────

test('MIX matches the lab: lead .07, bass .164, arp .029, kick .246, snare .082, hat .029', () => {
  assert.deepEqual(MIX, { lead: 0.07, bass: 0.164, arp: 0.029, kick: 0.246, snare: 0.082, hat: 0.029 });
});
