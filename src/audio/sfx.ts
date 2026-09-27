/**
 * Sound-effect recipes, synthesised with Web Audio (no sample files, no speech, nothing modelled
 * on the 1991 sounds — RESEARCH §9, D10). Ported 1:1 from the audio lab
 * (`docs/design/mockups/audio-lab.html` lines 236–399, DESIGN §8.3): same `G` values, same
 * structure. `G` is each recipe's calibrated level — every internal peak is relative to it, so
 * loudness scales linearly with `G`. Only voice chirps (`lets-go`, `ohno`, `exit`) and
 * `builder-low` / `builder-shrug` read `pitch` (DESIGN §8.4); the rest ignore it.
 */
import { bell, noise, tone, voice } from './synth.ts';
import type { SfxId } from './sfx-ids.ts';

export { SFX_IDS, VOICE_SFX, type SfxId } from './sfx-ids.ts';

export type SfxRecipe = (ctx: BaseAudioContext, out: AudioNode, when: number, pitch: number) => void;

export const SFX: Readonly<Record<SfxId, SfxRecipe>> = {
  // ─── UI tier ───────────────────────────────────────────────────────────────────────
  'ui-move': (ctx, out, when, _pitch) => {
    const G = 0.2251;
    tone(ctx, out, { t: when, type: 'sine', f: 1200, a: 0.003, d: 0.04, peak: G });
  },
  'ui-select': (ctx, out, when, _pitch) => {
    const G = 0.203;
    tone(ctx, out, { t: when, type: 'triangle', f: 880, a: 0.003, d: 0.05, peak: G });
    tone(ctx, out, { t: when + 0.045, type: 'triangle', f: 1320, a: 0.003, d: 0.07, peak: G });
  },
  'ui-back': (ctx, out, when, _pitch) => {
    const G = 0.2033;
    tone(ctx, out, { t: when, type: 'triangle', f: 1320, a: 0.003, d: 0.05, peak: G });
    tone(ctx, out, { t: when + 0.045, type: 'triangle', f: 880, a: 0.003, d: 0.07, peak: G });
  },
  'ui-deny': (ctx, out, when, _pitch) => {
    const G = 0.1387;
    tone(ctx, out, { t: when, type: 'square', f: 185, a: 0.004, d: 0.06, peak: G, filter: { type: 'lowpass', f: 1100 } });
    tone(ctx, out, { t: when + 0.09, type: 'square', f: 175, a: 0.004, d: 0.08, peak: G, filter: { type: 'lowpass', f: 1100 } });
  },
  'ui-empty': (ctx, out, when, _pitch) => {
    const G = 0.1518;
    tone(ctx, out, { t: when, type: 'sine', f: 330, f1: 190, a: 0.004, d: 0.1, peak: G });
    noise(ctx, out, { t: when, a: 0.002, d: 0.05, peak: G * 0.35, filter: { type: 'bandpass', f: 650, Q: 1.5 } });
  },
  'ui-arm': (ctx, out, when, _pitch) => {
    const G = 0.1368;
    tone(ctx, out, { t: when, type: 'triangle', f: 660, a: 0.005, d: 0.09, peak: G });
    tone(ctx, out, { t: when + 0.11, type: 'triangle', f: 880, a: 0.005, d: 0.2, peak: G, vib: [9, 25] });
    tone(ctx, out, { t: when + 0.11, duty: 0.25, f: 1760, a: 0.005, d: 0.12, peak: G * 0.25 });
  },
  pause: (ctx, out, when, _pitch) => {
    const G = 0.1738;
    tone(ctx, out, { t: when, type: 'triangle', f: 880, a: 0.004, d: 0.07, peak: G });
    tone(ctx, out, { t: when + 0.07, type: 'triangle', f: 587, a: 0.004, d: 0.12, peak: G });
  },
  unpause: (ctx, out, when, _pitch) => {
    const G = 0.1741;
    tone(ctx, out, { t: when, type: 'triangle', f: 587, a: 0.004, d: 0.07, peak: G });
    tone(ctx, out, { t: when + 0.07, type: 'triangle', f: 880, a: 0.004, d: 0.12, peak: G });
  },
  'ff-on': (ctx, out, when, _pitch) => {
    const G = 0.2225;
    tone(ctx, out, { t: when, type: 'triangle', f: 500, f1: 1400, gd: 0.06, a: 0.003, d: 0.07, peak: G });
    tone(ctx, out, { t: when + 0.07, type: 'triangle', f: 500, f1: 1400, gd: 0.06, a: 0.003, d: 0.07, peak: G });
  },
  'ff-off': (ctx, out, when, _pitch) => {
    const G = 0.2225;
    tone(ctx, out, { t: when, type: 'triangle', f: 1400, f1: 500, gd: 0.06, a: 0.003, d: 0.07, peak: G });
    tone(ctx, out, { t: when + 0.07, type: 'triangle', f: 1400, f1: 500, gd: 0.06, a: 0.003, d: 0.07, peak: G });
  },
  'rr-up': (ctx, out, when, _pitch) => {
    const G = 0.3209;
    tone(ctx, out, { t: when, type: 'triangle', f: 1046, a: 0.002, d: 0.03, peak: G });
    noise(ctx, out, { t: when, a: 0.001, d: 0.006, peak: G * 0.3, filter: { type: 'highpass', f: 4000 } });
  },
  'rr-down': (ctx, out, when, _pitch) => {
    const G = 0.3209;
    tone(ctx, out, { t: when, type: 'triangle', f: 784, a: 0.002, d: 0.03, peak: G });
    noise(ctx, out, { t: when, a: 0.001, d: 0.006, peak: G * 0.3, filter: { type: 'highpass', f: 4000 } });
  },
  undo: (ctx, out, when, _pitch) => {
    const G = 0.1348;
    tone(ctx, out, { t: when, type: 'sine', f: 1600, f1: 380, gd: 0.14, a: 0.003, d: 0.14, peak: G });
    tone(ctx, out, { t: when + 0.05, type: 'sine', f: 1200, f1: 300, gd: 0.12, a: 0.003, d: 0.12, peak: G * 0.5 });
  },

  // ─── Cue tier ──────────────────────────────────────────────────────────────────────
  assign: (ctx, out, when, _pitch) => {
    const G = 0.4105;
    tone(ctx, out, { t: when, type: 'triangle', f: 260, f1: 150, a: 0.002, d: 0.07, peak: G });
    noise(ctx, out, { t: when, a: 0.001, d: 0.012, peak: G * 0.25, filter: { type: 'lowpass', f: 2200 } });
  },
  fuse: (ctx, out, when, _pitch) => {
    const G = 0.3839;
    noise(ctx, out, { t: when, a: 0.01, d: 0.35, peak: G * 0.5, filter: { type: 'highpass', f: 4500 } });
    const ticks = [0.03, 0.08, 0.13, 0.2, 0.27];
    ticks.forEach((offset, i) => {
      noise(ctx, out, { t: when + offset, a: 0.001, d: 0.012, peak: G, off: i * 0.1, filter: { type: 'bandpass', f: 3200, Q: 3 } });
    });
    tone(ctx, out, { t: when, type: 'sine', f: 1800, f1: 2700, a: 0.005, d: 0.06, peak: G * 0.3 });
  },
  'builder-low': (ctx, out, when, pitch) => {
    const G = 0.3124;
    const p = pitch || 1;
    // pitch = 1 / 1.1667 / 1.3333 for 3 / 2 / 1 bricks left (≈1.8 / 2.1 / 2.4 kHz, rising urgency)
    tone(ctx, out, { t: when, type: 'triangle', f: 1800 * p, a: 0.002, d: 0.12, peak: G });
    tone(ctx, out, { t: when, type: 'sine', f: 3600 * p, a: 0.002, d: 0.05, peak: G * 0.25 });
  },
  'builder-shrug': (ctx, out, when, pitch) => {
    const G = 0.2339;
    const p = pitch || 1;
    voice(
      ctx,
      out,
      when,
      p,
      [
        { at: 0, dur: 0.1, f0: 330, f1: 335, F1: 300, F2: 1000 },
        { at: 0.14, dur: 0.16, f0: 300, f1: 400, F1: 300, F2: 1100 },
      ],
      G,
      { vibRate: 5, vibCents: 15 },
    );
  },
  steel: (ctx, out, when, _pitch) => {
    const G = 0.2288;
    bell(ctx, out, { t: when, f: 1760, ratio: 1.41, index: 3, d: 0.16, peak: G });
    noise(ctx, out, { t: when, a: 0.001, d: 0.008, peak: G * 0.8, filter: { type: 'bandpass', f: 5000, Q: 2 } });
  },
  'time-low': (ctx, out, when, _pitch) => {
    const G = 0.3995;
    tone(ctx, out, { t: when, type: 'sine', f: 820, a: 0.001, d: 0.05, peak: G });
    noise(ctx, out, { t: when, a: 0.001, d: 0.02, peak: G * 0.6, filter: { type: 'bandpass', f: 1600, Q: 5 } });
    tone(ctx, out, { t: when + 0.25, type: 'sine', f: 620, a: 0.001, d: 0.06, peak: G * 0.8 });
    noise(ctx, out, { t: when + 0.25, a: 0.001, d: 0.02, peak: G * 0.5, off: 0.3, filter: { type: 'bandpass', f: 1300, Q: 5 } });
  },

  // ─── Event tier: voice barks (voice bus; `pitch` = per-mumble ratio, DESIGN §8.4) ──────
  'lets-go': (ctx, out, when, pitch) => {
    const G = 0.3279;
    const p = pitch || 1;
    // "Off we go!" — three rising syllables (o · e · o)
    voice(
      ctx,
      out,
      when,
      p,
      [
        { at: 0, dur: 0.09, f0: 500, f1: 540, F1: 520, F2: 900 },
        { at: 0.12, dur: 0.08, f0: 600, f1: 660, F1: 380, F2: 2100 },
        { at: 0.23, dur: 0.2, f0: 760, f1: 900, F1: 480, F2: 900, F2b: 800 },
      ],
      G,
      { vibRate: 7, vibCents: 20 },
    );
  },
  ohno: (ctx, out, when, pitch) => {
    const G = 0.3224;
    const p = pitch || 1;
    // "Uh-oh…" — high "uh", then a falling, wobbling "oh"
    voice(
      ctx,
      out,
      when,
      p,
      [
        { at: 0, dur: 0.12, f0: 700, f1: 690, F1: 620, F2: 1150 },
        { at: 0.17, dur: 0.3, f0: 560, f1: 420, F1: 470, F2: 820, F2b: 760 },
      ],
      G,
      { vibRate: 6, vibCents: 45 },
    );
  },
  exit: (ctx, out, when, pitch) => {
    const G = 1.4388;
    const p = pitch || 1;
    // "Wheee!" — upward glide on "ee" + three sparkle pings
    voice(ctx, out, when, p, [{ at: 0, dur: 0.3, f0: 600, f1: 1400, F1: 320, F2: 2300, F2b: 2600 }], G, { vibRate: 8, vibCents: 30 });
    const sp = [2637, 3136, 3951];
    sp.forEach((freq, i) => {
      tone(ctx, out, { t: when + 0.18 + i * 0.06, type: 'sine', f: freq, a: 0.002, d: 0.08, peak: G * 0.05 });
    });
  },

  // ─── Event tier: hazards & traps ───────────────────────────────────────────────────
  'entrance-open': (ctx, out, when, _pitch) => {
    const G = 0.2555;
    // hatch creak … clunk
    tone(ctx, out, {
      t: when,
      type: 'sawtooth',
      f: 92,
      a: 0.06,
      d: 0.42,
      peak: G,
      vib: [11, 120],
      filter: { type: 'bandpass', f: 950, f1: 600, fd: 0.45, Q: 7 },
    });
    tone(ctx, out, { t: when + 0.5, type: 'sine', f: 120, f1: 55, a: 0.002, d: 0.18, peak: G * 1.4 });
    noise(ctx, out, { t: when + 0.5, a: 0.002, d: 0.09, peak: G * 0.8, filter: { type: 'lowpass', f: 450 } });
  },
  splat: (ctx, out, when, _pitch) => {
    const G = 0.3748;
    tone(ctx, out, { t: when, type: 'sine', f: 150, f1: 45, a: 0.002, d: 0.14, peak: G });
    noise(ctx, out, { t: when, a: 0.002, d: 0.12, peak: G * 0.6, filter: { type: 'lowpass', f: 900, f1: 200, fd: 0.1 } });
    tone(ctx, out, { t: when + 0.02, type: 'triangle', f: 240, f1: 120, a: 0.002, d: 0.06, peak: G * 0.4 });
  },
  drown: (ctx, out, when, _pitch) => {
    const G = 0.4775;
    // six bubbles, each a quick upward chirp
    const bubbles: ReadonlyArray<readonly [number, number]> = [
      [0, 260],
      [0.06, 340],
      [0.11, 300],
      [0.19, 420],
      [0.24, 380],
      [0.33, 480],
    ];
    for (const [at, freq] of bubbles) {
      tone(ctx, out, { t: when + at, type: 'sine', f: freq, f1: freq * 2.4, gd: 0.04, a: 0.004, d: 0.05, peak: G });
    }
    noise(ctx, out, { t: when, a: 0.02, d: 0.35, peak: G * 0.25, filter: { type: 'lowpass', f: 500 } });
  },
  burn: (ctx, out, when, _pitch) => {
    const G = 0.2825;
    noise(ctx, out, { t: when, a: 0.03, d: 0.4, peak: G, filter: { type: 'highpass', f: 2500 } });
    noise(ctx, out, { t: when, a: 0.01, d: 0.22, peak: G * 0.6, off: 0.5, filter: { type: 'bandpass', f: 1200, f1: 500, fd: 0.2, Q: 3 } });
    tone(ctx, out, { t: when, type: 'sine', f: 420, f1: 150, a: 0.005, d: 0.2, peak: G * 0.4 });
  },
  trap: (ctx, out, when, _pitch) => {
    const G = 0.5554;
    // generic fallback: snap + low clunk
    noise(ctx, out, { t: when, a: 0.001, d: 0.02, peak: G, filter: { type: 'bandpass', f: 2500, Q: 2 } });
    tone(ctx, out, { t: when + 0.01, type: 'square', f: 190, f1: 80, a: 0.003, d: 0.12, peak: G * 0.6, filter: { type: 'lowpass', f: 800 } });
  },
  'trap-flytrap': (ctx, out, when, _pitch) => {
    const G = 0.4577;
    // Mossgrove snapjaw: snap · chomp · chomp · gulp
    noise(ctx, out, { t: when, a: 0.001, d: 0.015, peak: G, filter: { type: 'bandpass', f: 2200, Q: 2 } });
    tone(ctx, out, { t: when + 0.05, type: 'square', f: 210, f1: 95, a: 0.003, d: 0.08, peak: G * 0.7, filter: { type: 'lowpass', f: 700 } });
    tone(ctx, out, { t: when + 0.16, type: 'square', f: 185, f1: 85, a: 0.003, d: 0.08, peak: G * 0.7, filter: { type: 'lowpass', f: 650 } });
    tone(ctx, out, { t: when + 0.28, type: 'sine', f: 320, f1: 120, a: 0.005, d: 0.14, peak: G * 0.8 });
  },
  'trap-press': (ctx, out, when, _pitch) => {
    const G = 0.2766;
    // Sugarworks cookie-cutter press: ka-CHUNK + spring boing
    noise(ctx, out, { t: when, a: 0.001, d: 0.012, peak: G * 0.8, filter: { type: 'bandpass', f: 3200, Q: 3 } });
    tone(ctx, out, { t: when + 0.08, type: 'sine', f: 110, f1: 50, a: 0.002, d: 0.18, peak: G * 1.2 });
    noise(ctx, out, { t: when + 0.08, a: 0.002, d: 0.1, peak: G * 0.6, off: 0.2, filter: { type: 'lowpass', f: 500 } });
    tone(ctx, out, { t: when + 0.12, type: 'sine', f: 290, a: 0.01, d: 0.35, peak: G * 0.35, vib: [14, 180] });
  },
  'trap-pendulum': (ctx, out, when, _pitch) => {
    const G = 0.8237;
    // Observatory pendulum: swish … clang
    noise(ctx, out, {
      t: when,
      a: 0.14,
      d: 0.26,
      peak: G,
      filter: { type: 'bandpass', f: 400, f1: 2200, fd: 0.18, f2: 500, fd2: 0.38, Q: 2.5 },
    });
    bell(ctx, out, { t: when + 0.34, f: 1400, ratio: 1.41, index: 2, d: 0.45, peak: G * 0.3 });
  },
  'trap-piston': (ctx, out, when, _pitch) => {
    const G = 0.249;
    // Foundry piston hammer: hiss … BANG + ring
    noise(ctx, out, { t: when, a: 0.02, d: 0.16, peak: G * 0.4, filter: { type: 'highpass', f: 3000 } });
    tone(ctx, out, { t: when + 0.2, type: 'sine', f: 90, f1: 40, a: 0.002, d: 0.2, peak: G * 1.2 });
    noise(ctx, out, { t: when + 0.2, a: 0.002, d: 0.1, peak: G, off: 0.4, filter: { type: 'lowpass', f: 1200 } });
    bell(ctx, out, { t: when + 0.2, f: 620, ratio: 2.76, index: 1.5, d: 0.4, peak: G * 0.3 });
  },
  'trap-clam': (ctx, out, when, _pitch) => {
    const G = 0.476;
    // Reef giant clam: clack-clack · gloop · two bubbles
    noise(ctx, out, { t: when, a: 0.001, d: 0.025, peak: G, filter: { type: 'bandpass', f: 1300, Q: 4 } });
    noise(ctx, out, { t: when + 0.07, a: 0.001, d: 0.025, peak: G, off: 0.3, filter: { type: 'bandpass', f: 1300, Q: 4 } });
    tone(ctx, out, { t: when + 0.15, type: 'sine', f: 520, f1: 180, a: 0.005, d: 0.13, peak: G * 0.8 });
    tone(ctx, out, { t: when + 0.3, type: 'sine', f: 300, f1: 700, gd: 0.04, a: 0.004, d: 0.05, peak: G * 0.5 });
    tone(ctx, out, { t: when + 0.36, type: 'sine', f: 360, f1: 860, gd: 0.04, a: 0.004, d: 0.05, peak: G * 0.5 });
  },

  // ─── Event tier: big moments & stingers ────────────────────────────────────────────
  explosion: (ctx, out, when, _pitch) => {
    const G = 0.2455;
    // cartoon "pop!": bright click, falling noise puff, soft thump
    tone(ctx, out, { t: when, type: 'square', f: 900, f1: 150, a: 0.001, d: 0.04, peak: G * 0.5 });
    noise(ctx, out, { t: when, a: 0.002, d: 0.3, peak: G, filter: { type: 'lowpass', f: 5000, f1: 250, fd: 0.25 } });
    tone(ctx, out, { t: when, type: 'sine', f: 120, f1: 40, a: 0.002, d: 0.22, peak: G });
  },
  nuke: (ctx, out, when, _pitch) => {
    const G = 0.2821;
    // Pop all: friendly rising wind-up + "fwip"
    tone(ctx, out, {
      t: when,
      type: 'sawtooth',
      f: 180,
      f1: 720,
      gd: 0.7,
      a: 0.08,
      d: 0.7,
      peak: G,
      vib: [12, 40],
      filter: { type: 'lowpass', f: 1400, Q: 3 },
    });
    tone(ctx, out, { t: when + 0.66, type: 'sine', f: 1500, f1: 3000, a: 0.003, d: 0.1, peak: G * 0.5 });
  },
  'level-won': (ctx, out, when, _pitch) => {
    const G = 0.2122;
    const arp = [523.25, 659.26, 783.99];
    arp.forEach((freq, i) => {
      tone(ctx, out, { t: when + i * 0.09, duty: 0.25, f: freq, a: 0.004, d: 0.12, peak: G });
    });
    tone(ctx, out, { t: when + 0.27, duty: 0.25, f: 1046.5, a: 0.004, d: 0.6, peak: G });
    tone(ctx, out, { t: when + 0.27, type: 'triangle', f: 523.25, a: 0.004, d: 0.6, peak: G });
    const sp = [2637, 3136, 3951];
    sp.forEach((freq, j) => {
      tone(ctx, out, { t: when + 0.34 + j * 0.08, type: 'sine', f: freq, a: 0.002, d: 0.08, peak: G * 0.4 });
    });
  },
  'level-lost': (ctx, out, when, _pitch) => {
    const G = 0.2764;
    // gentle "try again": E5 · C5 · D5 (last one held, vibrato) — hopeful, never a sad trombone
    tone(ctx, out, { t: when, type: 'triangle', f: 659.26, a: 0.01, d: 0.2, peak: G });
    tone(ctx, out, { t: when + 0.24, type: 'triangle', f: 523.25, a: 0.01, d: 0.2, peak: G });
    tone(ctx, out, { t: when + 0.5, type: 'triangle', f: 587.33, a: 0.01, d: 0.6, peak: G, vib: [5, 20] });
  },
};
