/**
 * Shared synth helpers, ported 1:1 from `docs/design/mockups/audio-lab.html` (DESIGN §8).
 * Same numbers, same fallbacks (`||` / `== null` semantics kept on purpose), so recipes render
 * exactly like the lab's `measureAll()`. Typed on `BaseAudioContext` so the same code runs in a
 * live `AudioContext` and in an `OfflineAudioContext` (measurement).
 */

/** Biquad spec: optional exponential sweeps f→f1 (at t+fd) →f2 (at t+fd2). */
export interface FilterSpec {
  readonly type: BiquadFilterType;
  readonly f: number;
  readonly Q?: number;
  readonly f1?: number;
  readonly fd?: number;
  readonly f2?: number;
  readonly fd2?: number;
}

/** Enveloped oscillator: waveform `type` or pulse `duty`; optional glide f→f1 over `gd`. */
export interface ToneOptions {
  readonly t: number;
  readonly type?: OscillatorType;
  readonly duty?: number;
  readonly f: number;
  readonly f1?: number;
  readonly gd?: number;
  readonly lin?: boolean;
  readonly a: number;
  readonly d: number;
  readonly peak: number;
  /** [rate Hz, depth cents] */
  readonly vib?: readonly [number, number];
  readonly filter?: FilterSpec;
}

/** Enveloped noise through 0..n filters; `off` = start offset into the noise buffer (s). */
export interface NoiseOptions {
  readonly t: number;
  readonly a: number;
  readonly d: number;
  readonly peak: number;
  readonly filter?: FilterSpec | readonly FilterSpec[];
  readonly off?: number;
}

/** 2-operator FM bell (inharmonic ratio = metallic). */
export interface BellOptions {
  readonly t: number;
  readonly f: number;
  readonly ratio: number;
  readonly index: number;
  readonly d: number;
  readonly peak: number;
}

/** One voice syllable, seconds relative to the call's `t`, Hz. */
export interface Syllable {
  readonly at: number;
  readonly dur: number;
  readonly f0: number;
  readonly f1: number;
  readonly F1: number;
  readonly F2: number;
  readonly F1b?: number;
  readonly F2b?: number;
  readonly v?: number;
}

export interface VoiceOptions {
  readonly vibRate?: number;
  readonly vibCents?: number;
}

const NOISE_CACHE = new WeakMap<BaseAudioContext, AudioBuffer>();

/** 1 s of deterministic white noise per context (seeded LCG: measurements are reproducible). */
export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = NOISE_CACHE.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    let s = 0x2468ace;
    for (let i = 0; i < d.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      d[i] = s / 2147483648 - 1;
    }
    NOISE_CACHE.set(ctx, b);
  }
  return b;
}

const WAVE_CACHE = new WeakMap<BaseAudioContext, Map<number, PeriodicWave>>();

/** Band-limited pulse wave with duty cycle `duty` (0.125, 0.25, 0.5), 32 harmonics. */
export function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  let m = WAVE_CACHE.get(ctx);
  if (!m) {
    m = new Map();
    WAVE_CACHE.set(ctx, m);
  }
  let w = m.get(duty);
  if (!w) {
    const n = 32;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = ctx.createPeriodicWave(re, im);
    m.set(duty, w);
  }
  return w;
}

/** Linear attack to `peak`, exponential decay to −60 dB of peak over `d`, then hard 0. */
export function envAD(p: AudioParam, t: number, a: number, peak: number, d: number): void {
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.exponentialRampToValueAtTime(Math.max(peak * 0.001, 1e-6), t + a + d);
  p.setValueAtTime(0, t + a + d + 0.001);
}

export function mkFilter(ctx: BaseAudioContext, s: FilterSpec, t: number): BiquadFilterNode {
  const b = ctx.createBiquadFilter();
  b.type = s.type;
  b.Q.value = s.Q == null ? 0.7 : s.Q;
  b.frequency.setValueAtTime(s.f, t);
  if (s.f1) b.frequency.exponentialRampToValueAtTime(s.f1, t + (s.fd || 0.2));
  if (s.f2) b.frequency.exponentialRampToValueAtTime(s.f2, t + (s.fd2 || 0.4));
  return b;
}

export function tone(ctx: BaseAudioContext, out: AudioNode, o: ToneOptions): void {
  const t = o.t;
  const end = t + o.a + o.d;
  const osc = ctx.createOscillator();
  if (o.duty) osc.setPeriodicWave(pulseWave(ctx, o.duty));
  else osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t);
  if (o.f1) {
    const ge = t + (o.gd || o.a + o.d);
    if (o.lin) osc.frequency.linearRampToValueAtTime(o.f1, ge);
    else osc.frequency.exponentialRampToValueAtTime(o.f1, ge);
  }
  if (o.vib) {
    const l = ctx.createOscillator();
    const lg = ctx.createGain();
    l.frequency.value = o.vib[0];
    lg.gain.value = o.vib[1];
    l.connect(lg);
    lg.connect(osc.detune);
    l.start(t);
    l.stop(end + 0.05);
  }
  const g = ctx.createGain();
  envAD(g.gain, t, o.a, o.peak, o.d);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = mkFilter(ctx, o.filter, t);
    node.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(end + 0.05);
}

export function noise(ctx: BaseAudioContext, out: AudioNode, o: NoiseOptions): void {
  const t = o.t;
  const end = t + o.a + o.d;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  let node: AudioNode = src;
  const fs: readonly FilterSpec[] = o.filter ? (isFilterList(o.filter) ? o.filter : [o.filter]) : [];
  for (const spec of fs) {
    const f = mkFilter(ctx, spec, t);
    node.connect(f);
    node = f;
  }
  const g = ctx.createGain();
  envAD(g.gain, t, o.a, o.peak, o.d);
  node.connect(g);
  g.connect(out);
  src.start(t, o.off || 0);
  src.stop(end + 0.05);
}

function isFilterList(f: FilterSpec | readonly FilterSpec[]): f is readonly FilterSpec[] {
  return Array.isArray(f);
}

export function bell(ctx: BaseAudioContext, out: AudioNode, o: BellOptions): void {
  const t = o.t;
  const end = t + o.d;
  const car = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const mg = ctx.createGain();
  const g = ctx.createGain();
  car.frequency.setValueAtTime(o.f, t);
  mod.frequency.setValueAtTime(o.f * o.ratio, t);
  mg.gain.setValueAtTime(o.f * o.index, t);
  mg.gain.exponentialRampToValueAtTime(o.f * o.index * 0.02, end);
  mod.connect(mg);
  mg.connect(car.frequency);
  envAD(g.gain, t, 0.002, o.peak, o.d);
  car.connect(g);
  g.connect(out);
  car.start(t);
  mod.start(t);
  car.stop(end + 0.05);
  mod.stop(end + 0.05);
}

/**
 * Wordless "mumble voice": sawtooth → two parallel band-pass formants (F1, F2) → syllable
 * envelope. Pitch `p` scales the glottal pitch only (formants stay put, so higher mumbles sound
 * smaller, not chipmunked).
 */
export function voice(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  p: number,
  sylls: readonly Syllable[],
  peak: number,
  opt: VoiceOptions = {},
): void {
  const src = ctx.createOscillator();
  src.type = 'sawtooth';
  const lfo = ctx.createOscillator();
  const lg = ctx.createGain();
  lfo.frequency.value = opt.vibRate || 7;
  lg.gain.value = opt.vibCents || 20;
  lfo.connect(lg);
  lg.connect(src.detune);
  const f1 = ctx.createBiquadFilter();
  const f2 = ctx.createBiquadFilter();
  const g2 = ctx.createGain();
  const env = ctx.createGain();
  f1.type = 'bandpass';
  f1.Q.value = 5;
  f2.type = 'bandpass';
  f2.Q.value = 8;
  g2.gain.value = 0.6;
  src.connect(f1);
  src.connect(f2);
  f2.connect(g2);
  f1.connect(env);
  g2.connect(env);
  env.connect(out);
  env.gain.setValueAtTime(0, t);
  let last = t;
  for (const s of sylls) {
    const s0 = t + s.at;
    const s1 = s0 + s.dur;
    const v = peak * (s.v || 1);
    src.frequency.setValueAtTime(s.f0 * p, s0);
    src.frequency.exponentialRampToValueAtTime(s.f1 * p, s1);
    f1.frequency.setValueAtTime(s.F1, s0);
    f2.frequency.setValueAtTime(s.F2, s0);
    if (s.F1b) f1.frequency.linearRampToValueAtTime(s.F1b, s1);
    if (s.F2b) f2.frequency.linearRampToValueAtTime(s.F2b, s1);
    env.gain.setValueAtTime(0, s0);
    env.gain.linearRampToValueAtTime(v, s0 + 0.012);
    env.gain.setValueAtTime(v, Math.max(s0 + 0.013, s1 - 0.035));
    env.gain.linearRampToValueAtTime(0, s1);
    last = s1;
  }
  src.start(t);
  lfo.start(t);
  src.stop(last + 0.05);
  lfo.stop(last + 0.05);
}
