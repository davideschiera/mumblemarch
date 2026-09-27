/**
 * Procedural chiptune note data and the pure sequencer math, ported 1:1 from the audio lab
 * (`docs/design/mockups/audio-lab.html` lines 447–566, DESIGN §8.6 + DESIGN-APPENDIX App. C).
 * Same note strings, BPMs, keys and mix levels as the lab's authoritative `MUSIC`/`MIX` objects.
 *
 * Pure data + math only: no Web Audio/DOM types or globals, so Node tests (no DOM lib) can
 * import this file. All melodies were written for this game (RESEARCH §5.2) — none quotes the
 * 1991 soundtrack.
 */

// ─── Theme data ──────────────────────────────────────────────────────────────────────────────

export type MusicLead = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle';

export interface MusicDrums {
  /** 16-step patterns ('x'/'.'), one bar long, repeated for every bar of the theme. */
  readonly k: string;
  readonly s: string;
  readonly h: string;
}

export interface MusicArp {
  /** One chord (space-separated note tokens) per bar. */
  readonly chords: readonly string[];
  /** Chord-tone index cycled across the bar's 16 steps. */
  readonly pattern: readonly number[];
}

export interface MusicTheme {
  readonly title: string;
  readonly bpm: number;
  readonly key: string;
  readonly lead: MusicLead;
  readonly loop: boolean;
  readonly echo?: boolean;
  /** 8 tokens/bar (8ths): note name, '.' rest, '-' hold previous note. */
  readonly melody: readonly string[];
  /** 4 tokens/bar (quarters). */
  readonly bass: readonly string[];
  readonly arp?: MusicArp;
  readonly drums: MusicDrums;
}

export const MUSIC_IDS = ['title', 'mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef'] as const;
export type MusicId = (typeof MUSIC_IDS)[number];

/** Note data, verbatim from the lab's `MUSIC` object — authoritative (DESIGN §8.6, App. C). */
export const MUSIC: Readonly<Record<MusicId, MusicTheme>> = {
  title: {
    title: 'Doorstep Fanfare',
    bpm: 124,
    key: 'C major',
    lead: 'pulse25',
    loop: false,
    melody: ['C5 . E5 . G5 . C6 -', 'A5 . F5 . C5 . A5 -', 'G5 F5 E5 D5 B4 . D5 .', 'C5 - - - . . . .'],
    bass: ['C3 G2 C3 G2', 'F2 C3 F2 C3', 'G2 D3 G2 B2', 'C3 - - .'],
    drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  mossgrove: {
    title: 'Bog Hop',
    bpm: 116,
    key: 'G major',
    lead: 'pulse25',
    loop: true,
    melody: [
      'D5 . B4 . G4 A4 B4 -',
      'C5 . E5 . D5 C5 B4 -',
      'A4 . F#4 A4 D5 - C5 -',
      'B4 A4 G4 . D4 . G4 .',
      'E5 . B4 . G4 B4 E5 -',
      'E5 D5 C5 . G4 . C5 .',
      'D5 . F#5 . E5 D5 C5 A4',
      'G4 . B4 D5 G5 - . .',
    ],
    bass: [
      'G2 D3 B2 D3',
      'C3 G3 E3 G3',
      'D3 A3 F#3 A3',
      'G2 D3 B2 D3',
      'E3 B3 G3 B3',
      'C3 G3 E3 G3',
      'D3 A3 F#3 A2',
      'G2 D3 G2 .',
    ],
    drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
  },
  sugarworks: {
    title: 'Taffy Pull',
    bpm: 132,
    key: 'F major',
    lead: 'pulse12',
    loop: true,
    melody: [
      'C5 A4 F4 A4 C5 . F5 .',
      'D5 . Bb4 . D5 F5 D5 .',
      'E5 . G5 . E5 C5 G4 .',
      'A4 C5 F5 - . . . .',
      'D5 F5 A5 - F5 D5 A4 .',
      'Bb4 D5 F5 - D5 . Bb4 .',
      'C5 E5 G5 . Bb5 . G5 E5',
      'F5 . C5 . A4 . F4 .',
    ],
    bass: [
      'F2 C3 F2 C3',
      'Bb2 F3 Bb2 F3',
      'C3 G3 C3 G3',
      'F2 C3 A2 C3',
      'D3 A3 D3 A3',
      'Bb2 F3 Bb2 F3',
      'C3 G3 E3 G3',
      'F2 C3 F2 .',
    ],
    drums: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  observatory: {
    title: 'Clockwork Stars',
    bpm: 100,
    key: 'D dorian',
    lead: 'triangle',
    loop: true,
    melody: [
      'A4 - - - D5 - E5 -',
      'F5 - E5 - C5 - - -',
      'D5 - - - B4 - G4 -',
      'A4 - - - . . . .',
      'C5 - - - F5 - A5 -',
      'G5 - E5 - C5 - - -',
      'B4 - D5 - G5 - F5 -',
      'E5 - D5 - - - . .',
    ],
    bass: ['D3 - A2 -', 'C3 - G2 -', 'G2 - D3 -', 'D3 - A2 -', 'F2 - C3 -', 'C3 - G2 -', 'G2 - B2 -', 'D3 - - -'],
    arp: {
      chords: ['D5 F5 A5', 'C5 E5 G5', 'B4 D5 G5', 'D5 F5 A5', 'C5 F5 A5', 'C5 E5 G5', 'B4 D5 G5', 'D5 F5 A5'],
      pattern: [0, 1, 2, 1],
    },
    drums: { k: '................', s: '................', h: 'x...x...x...x...' },
  },
  foundry: {
    title: 'Piston Polka',
    bpm: 150,
    key: 'A harmonic minor',
    lead: 'pulse50',
    loop: true,
    melody: [
      'A4 . C5 . E5 . A5 .',
      'G#5 . E5 . B4 . G#4 .',
      'A4 C5 E5 C5 A4 . . .',
      'B4 . D5 . G#4 - E4 .',
      'D5 . F5 . A5 . F5 .',
      'E5 . C5 . A4 . C5 .',
      'B4 D5 G#5 . E5 . D5 .',
      'C5 B4 A4 . A4 . . .',
    ],
    bass: [
      'A2 E3 A2 E3',
      'E2 B2 E2 G#2',
      'A2 E3 A2 C3',
      'E2 B2 G#2 B2',
      'D3 A3 D3 F3',
      'A2 E3 C3 E3',
      'E2 B2 G#2 B2',
      'A2 E3 A2 .',
    ],
    drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: '..x...x...x...x.' },
  },
  reef: {
    title: 'Tide Tumble',
    bpm: 108,
    key: 'B♭ major',
    lead: 'triangle',
    echo: true,
    loop: true,
    melody: [
      'F4 . Bb4 . D5 - C5 Bb4',
      'G4 - D5 - Bb4 - . .',
      'G4 . Bb4 . Eb5 - D5 C5',
      'C5 - F5 - A4 - . .',
      'D5 . F5 . Bb5 - G5 F5',
      'G5 - D5 - Bb4 - . .',
      'Eb5 - C5 - F5 - C5 -',
      'Bb4 - - - . . . .',
    ],
    bass: [
      'Bb2 - F3 D3',
      'G2 - D3 Bb2',
      'Eb3 - Bb2 G2',
      'F2 - C3 A2',
      'Bb2 - F3 D3',
      'G2 - D3 Bb2',
      'Eb3 - F3 -',
      'Bb2 - - .',
    ],
    drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x..x..x.x..x..x.' },
  },
};

/** Mix levels at unity music-bus gain (calibrated with the offline check, DESIGN §8.6). */
export const MIX = { lead: 0.07, bass: 0.164, arp: 0.029, kick: 0.246, snare: 0.082, hat: 0.029 } as const;

/** Pitch classes (semitones above C), keyed by note letter. */
export const PC: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Parse a note token ("C5", "F#4", "Bb3") into a MIDI note number, or null if not a note. */
export function midiOf(tok: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(tok);
  if (!m) return null;
  const letter = m[1] ?? '';
  const accidental = m[2] ?? '';
  const octave = m[3] ?? '0';
  const pc = PC[letter] ?? 0;
  const accSemitones = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (Number(octave) + 1) + pc + accSemitones;
}

/** MIDI note number → frequency (Hz), A4 = 440 Hz. */
export function hz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface MutableTrackNote {
  step: number;
  len: number;
  midi: number;
}

/** A note event once parsed and compiled: `step` in `perBar`-per-bar units, `len` in steps. */
export interface MusicNote {
  readonly step: number;
  readonly len: number;
  readonly midi: number;
}

export interface MusicDrumHit {
  readonly step: number;
  readonly kind: 'k' | 's' | 'h';
}

/** Parse bars of tokens into [{step, len, midi}] (step unit = 1/perBar of a bar). */
export function parseTrack(bars: readonly string[], perBar: number, errors: string[], label: string): MusicNote[] {
  const notes: MutableTrackNote[] = [];
  bars.forEach((bar, bi) => {
    const toks = bar.trim().split(/\s+/);
    if (toks.length !== perBar) errors.push(`${label} bar ${bi + 1}: ${toks.length} tokens, expected ${perBar}`);
    toks.forEach((tok, i) => {
      const step = bi * perBar + i;
      if (tok === '.') return;
      if (tok === '-') {
        const last = notes[notes.length - 1];
        if (last && last.step + last.len === step) last.len++;
        else errors.push(`${label} bar ${bi + 1}: orphan hold`);
        return;
      }
      const mi = midiOf(tok);
      if (mi === null) errors.push(`${label} bar ${bi + 1}: bad token ${tok}`);
      else notes.push({ step, len: 1, midi: mi });
    });
  });
  return notes;
}

// ─── Per-level variants (DESIGN §8.6 "Per-level variety") ──────────────────────────────────

export interface MusicVariant {
  readonly transpose: number;
  readonly bpmDelta: number;
}

export const MUSIC_VARIANTS: readonly MusicVariant[] = [
  { transpose: 0, bpmDelta: 0 },
  { transpose: 2, bpmDelta: 4 },
  { transpose: -3, bpmDelta: -4 },
];

/** Safe `n mod MUSIC_VARIANTS.length`: negative or non-integer `n` still lands in 0..2. */
export function musicVariant(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const len = MUSIC_VARIANTS.length;
  const m = Math.trunc(n) % len;
  return (m < 0 ? m + len : m) || 0; // normalises -0 (e.g. musicVariant(-3)) to 0
}

export interface CompiledTheme {
  readonly lead: readonly MusicNote[];
  readonly bass: readonly MusicNote[];
  readonly arp: readonly MusicNote[];
  readonly drums: readonly MusicDrumHit[];
  readonly errors: readonly string[];
  readonly bars: number;
  readonly beat: number;
  readonly loopDur: number;
  /** Effective BPM after the variant's `bpmDelta`. */
  readonly bpm: number;
  /** Effective transpose (semitones) applied to every pitched note. */
  readonly transpose: number;
}

/**
 * Compile a theme's note strings into timed note/drum lists (lab `compileTheme`, DESIGN §8.6),
 * transposing every pitched note and shifting the tempo by the level `variant`'s semitones/BPM.
 */
export function compileTheme(th: MusicTheme, variant = 0): CompiledTheme {
  const v = MUSIC_VARIANTS[musicVariant(variant)] ?? { transpose: 0, bpmDelta: 0 };
  const errors: string[] = [];
  const bars = th.melody.length;
  if (th.bass.length !== bars) errors.push(`bass has ${th.bass.length} bars, melody ${bars}`);

  const lead: MusicNote[] = parseTrack(th.melody, 8, errors, 'lead').map((n) => ({ ...n, midi: n.midi + v.transpose }));
  const bass: MusicNote[] = parseTrack(th.bass, 4, errors, 'bass').map((n) => ({ ...n, midi: n.midi + v.transpose }));

  const arp: MusicNote[] = [];
  if (th.arp) {
    const arpDef = th.arp;
    arpDef.chords.forEach((chord, bi) => {
      const tones = chord.split(/\s+/).map(midiOf);
      for (let s = 0; s < 16; s++) {
        const patIdx = arpDef.pattern[s % arpDef.pattern.length] ?? 0;
        const tone = tones[patIdx];
        if (tone !== null && tone !== undefined) arp.push({ step: bi * 16 + s, len: 1, midi: tone + v.transpose });
      }
    });
  }

  const drums: MusicDrumHit[] = [];
  (['k', 's', 'h'] as const).forEach((kind) => {
    const pat = th.drums[kind];
    if (pat.length !== 16) errors.push(`drum ${kind} pattern length ${pat.length}`);
    for (let b = 0; b < bars; b++) {
      for (let s = 0; s < 16; s++) {
        if (pat[s] === 'x') drums.push({ step: b * 16 + s, kind });
      }
    }
  });

  const bpm = th.bpm + v.bpmDelta;
  const beat = 60 / bpm;
  const loopDur = bars * 4 * beat;
  return { lead, bass, arp, drums, errors, bars, beat, loopDur, bpm, transpose: v.transpose };
}

// ─── Event timeline (used by MusicPlayer's look-ahead scheduler) ───────────────────────────

export interface ThemeEvent {
  /** Seconds from the start of one pass (loop iteration). */
  readonly time: number;
  readonly kind: 'lead' | 'bass' | 'arp' | 'k' | 's' | 'h';
  /** Note duration in seconds; 0 for drum hits. */
  readonly dur: number;
  /** Frequency in Hz; 0 for drum hits. */
  readonly freq: number;
}

/**
 * Flatten a compiled theme into a time-sorted event list for one pass, with exactly the lab
 * `scheduleTheme` timing (DESIGN §8.6; `docs/design/mockups/audio-lab.html` lines 553–566).
 */
export function themeEvents(compiled: CompiledTheme, _theme: MusicTheme): readonly ThemeEvent[] {
  const e8 = compiled.beat / 2;
  const e16 = compiled.beat / 4;
  const events: ThemeEvent[] = [];
  for (const n of compiled.lead) {
    events.push({ time: n.step * e8, kind: 'lead', dur: n.len * e8 * 0.9, freq: hz(n.midi) });
  }
  for (const n of compiled.bass) {
    const dur = Math.min(n.len * compiled.beat * 0.9, compiled.beat * 0.55 + (n.len - 1) * compiled.beat);
    events.push({ time: n.step * compiled.beat, kind: 'bass', dur, freq: hz(n.midi) });
  }
  for (const n of compiled.arp) {
    events.push({ time: n.step * e16, kind: 'arp', dur: e16 * 0.7, freq: hz(n.midi) });
  }
  for (const d of compiled.drums) {
    events.push({ time: d.step * e16, kind: d.kind, dur: 0, freq: 0 });
  }
  events.sort((a, b) => a.time - b.time);
  return events;
}

/** Level theme ids that have their own loop (excludes the one-shot `title` jingle). */
const LEVEL_MUSIC_IDS: readonly MusicId[] = ['mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef'];

/** The loop to play for a level's `themeId` (falls back to `mossgrove` for an unknown theme). */
export function themeForLevel(themeId: string): MusicId {
  return (LEVEL_MUSIC_IDS as readonly string[]).includes(themeId) ? (themeId as MusicId) : 'mossgrove';
}

// ─── Scheduling constants (DESIGN §8.1, §8.6) ───────────────────────────────────────────────

/** The theme loop starts at this tick (after the first mumble drops). */
export const MUSIC_START_TICK = 55;
/** Fade-in for a freshly started run, seconds. */
export const MUSIC_FADE_IN_S = 1.5;
/** Default fade-out when stopping music, seconds. */
export const MUSIC_STOP_FADE_S = 0.4;
/** Look-ahead window for the scheduler, seconds. */
export const LOOK_AHEAD_S = 0.1;
/** Look-ahead timer period, milliseconds. */
export const PUMP_MS = 25;
