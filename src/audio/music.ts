/**
 * Procedural background music: a tiny step sequencer on the music bus (DESIGN §8.6).
 *
 * `instrNote`/`drumHit`/`scheduleTheme` are 1:1 ports of the lab's synth calls
 * (`docs/design/mockups/audio-lab.html` lines 528–566); `scheduleTheme` schedules one full pass
 * of a theme and is used by offline validation (the lab's `checkMusic`).
 *
 * `MusicPlayer` is the live player: it does NOT call `scheduleTheme` per pass (that would
 * rebuild the reef echo chain every loop). Instead it precomputes one pass's worth of timed
 * events (`themeEvents`) and walks them itself with a 25 ms look-ahead timer, so a theme's echo
 * chain (if any) is built exactly once per run and passes loop seamlessly.
 */
import type { AudioEngine } from './audio-engine.ts';
import { noise, pulseWave, tone } from './synth.ts';
import {
  LOOK_AHEAD_S,
  MIX,
  MUSIC,
  MUSIC_FADE_IN_S,
  MUSIC_STOP_FADE_S,
  PUMP_MS,
  compileTheme,
  hz,
  musicVariant,
  themeEvents,
  themeForLevel,
  type MusicId,
  type MusicTheme,
  type ThemeEvent,
} from './music-data.ts';

/** One enveloped lead/bass/arp note (lab `instrNote`, lines 528–544). */
function instrNote(
  ctx: BaseAudioContext,
  out: AudioNode,
  kind: 'lead' | 'bass' | 'arp',
  th: MusicTheme,
  t: number,
  dur: number,
  f: number,
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  let level: number;
  if (kind === 'lead') {
    level = MIX.lead;
    if (th.lead === 'triangle') {
      osc.type = 'triangle';
      level *= 1.6;
    } else {
      osc.setPeriodicWave(pulseWave(ctx, th.lead === 'pulse12' ? 0.125 : th.lead === 'pulse25' ? 0.25 : 0.5));
    }
  } else if (kind === 'bass') {
    osc.type = 'triangle';
    level = MIX.bass;
  } else {
    osc.setPeriodicWave(pulseWave(ctx, 0.5));
    level = MIX.arp;
  }
  osc.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.005);
  g.gain.exponentialRampToValueAtTime(level * 0.55, t + Math.min(0.08, dur * 0.6));
  g.gain.setValueAtTime(level * 0.55, t + Math.max(Math.min(0.081, dur * 0.61), dur - 0.03));
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** One drum hit (lab `drumHit`, lines 545–551). */
function drumHit(ctx: BaseAudioContext, out: AudioNode, kind: 'k' | 's' | 'h', t: number): void {
  if (kind === 'k') {
    tone(ctx, out, { t, type: 'sine', f: 150, f1: 45, gd: 0.1, a: 0.002, d: 0.15, peak: MIX.kick });
  } else if (kind === 's') {
    noise(ctx, out, { t, a: 0.001, d: 0.12, peak: MIX.snare, filter: { type: 'bandpass', f: 1800, Q: 0.8 } });
    tone(ctx, out, { t, type: 'triangle', f: 190, a: 0.001, d: 0.06, peak: MIX.snare * 0.5 });
  } else {
    noise(ctx, out, { t, a: 0.001, d: 0.03, peak: MIX.hat, off: 0.6, filter: { type: 'highpass', f: 7000 } });
  }
}

/**
 * Schedule one full pass of a theme starting at `t0` on `out` (lab `scheduleTheme`, lines
 * 553–566, incl. the echo chain). Returns the pass duration. Used for offline validation
 * (rendering a theme to measure peak/RMS); the live `MusicPlayer` schedules notes itself instead.
 */
export function scheduleTheme(ctx: BaseAudioContext, out: AudioNode, th: MusicTheme, t0: number, variant = 0): number {
  const c = compileTheme(th, variant);
  const e8 = c.beat / 2;
  const e16 = c.beat / 4;
  let leadOut: AudioNode = out;
  if (th.echo) {
    const dl = ctx.createDelay(1);
    const fb = ctx.createGain();
    const wet = ctx.createGain();
    const bus = ctx.createGain();
    dl.delayTime.value = 3 * e16;
    fb.gain.value = 0.3;
    wet.gain.value = 0.35;
    bus.connect(out);
    bus.connect(dl);
    dl.connect(fb);
    fb.connect(dl);
    dl.connect(wet);
    wet.connect(out);
    leadOut = bus;
  }
  c.lead.forEach((n) => instrNote(ctx, leadOut, 'lead', th, t0 + n.step * e8, n.len * e8 * 0.9, hz(n.midi)));
  c.bass.forEach((n) =>
    instrNote(
      ctx,
      out,
      'bass',
      th,
      t0 + n.step * c.beat,
      Math.min(n.len * c.beat * 0.9, c.beat * 0.55 + (n.len - 1) * c.beat),
      hz(n.midi),
    ),
  );
  c.arp.forEach((n) => instrNote(ctx, out, 'arp', th, t0 + n.step * e16, e16 * 0.7, hz(n.midi)));
  c.drums.forEach((d) => drumHit(ctx, out, d.kind, t0 + d.step * e16));
  return c.loopDur;
}

interface PendingRequest {
  readonly themeId: MusicId;
  readonly variant: number;
}

interface ActiveRun {
  readonly ctx: AudioContext;
  readonly theme: MusicTheme;
  /** Per-run fade-in/out gain, connected into the engine's music bus. */
  readonly gain: GainNode;
  /** Where lead notes go: `gain` directly, or the echo bus for an echo theme. */
  readonly leadOut: AudioNode;
  /** Extra nodes (gain + echo chain) to disconnect once the run is fully stopped. */
  readonly extraNodes: readonly AudioNode[];
  /** One pass's worth of events, time-sorted, relative to the start of a pass. */
  readonly events: readonly ThemeEvent[];
  readonly loopDur: number;
  readonly loop: boolean;
  /** AudioContext time the current pass started. */
  passStart: number;
  /** Index of the next unscheduled event in `events`. */
  index: number;
  timer: ReturnType<typeof setInterval> | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
}

/** Live music player: look-ahead scheduler + fades (DESIGN §8.1, §8.6; CONTRACTS §6). */
export class MusicPlayer {
  private readonly engine: AudioEngine;
  private enabled = true;
  /** The title jingle plays at most once per MusicPlayer instance (= per session). */
  private titlePlayed = false;
  /** The last level theme requested, so `setEnabled(true)` can resume it. */
  private pending: PendingRequest | null = null;
  private current: ActiveRun | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  get isPlaying(): boolean {
    return this.current !== null;
  }

  /** Start (or switch to) a level's theme loop, picking a variant, after an optional delay. */
  startTheme(themeId: string, variant: number, delaySeconds = 0): void {
    const v = musicVariant(variant);
    const loopId = themeForLevel(themeId);
    this.pending = { themeId: loopId, variant: v };
    const out = this.engine.musicOutput;
    if (!this.enabled || !out) return; // remembered above; setEnabled(true) can start it later
    this.beginRun(MUSIC[loopId], v, out, delaySeconds);
  }

  /** Fade the current run to silence over `fadeSeconds` and stop the scheduler. */
  stop(fadeSeconds: number = MUSIC_STOP_FADE_S): void {
    this.pending = null;
    const run = this.current;
    if (!run) return;
    this.current = null;
    this.haltRun(run, fadeSeconds);
    this.engine.setMusicActiveUntil(run.ctx.currentTime + fadeSeconds);
  }

  /** Play the title-screen jingle once per session (no loop, no fade-in). */
  playTitleJingle(): void {
    if (this.titlePlayed || !this.enabled) return;
    const out = this.engine.musicOutput;
    if (!out) return; // not unlocked yet; titlePlayed stays false, so a later call can still play it
    this.titlePlayed = true;
    this.beginRun(MUSIC.title, 0, out, 0.05, 0);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      const run = this.current;
      if (run) {
        this.current = null;
        this.haltRun(run, MUSIC_STOP_FADE_S);
        this.engine.setMusicActiveUntil(run.ctx.currentTime + MUSIC_STOP_FADE_S);
      }
      return;
    }
    if (this.pending && !this.current) {
      const out = this.engine.musicOutput;
      if (out) this.beginRun(MUSIC[this.pending.themeId], this.pending.variant, out, 0);
    }
  }

  private beginRun(
    theme: MusicTheme,
    variant: number,
    out: { readonly ctx: AudioContext; readonly out: AudioNode },
    delaySeconds: number,
    fadeInS: number = MUSIC_FADE_IN_S,
  ): void {
    const previous = this.current;
    this.current = null;
    if (previous) this.haltRun(previous, 0.05); // replace a running run with a quick fade

    const ctx = out.ctx;
    const compiled = compileTheme(theme, variant);
    const events = themeEvents(compiled, theme);
    // A little scheduling headroom: with delaySeconds = 0 the first pump (25 ms later) would
    // otherwise see time-0 events (downbeat kick, first lead/bass note) as already past and
    // skip them.
    const startAt = ctx.currentTime + Math.max(delaySeconds, 0.05);

    const gain = ctx.createGain();
    if (fadeInS > 0) {
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(1, startAt + fadeInS);
    } else {
      gain.gain.setValueAtTime(1, startAt);
    }
    gain.connect(out.out);

    let leadOut: AudioNode = gain;
    const extraNodes: AudioNode[] = [gain];
    if (theme.echo) {
      const e16 = compiled.beat / 4;
      const dl = ctx.createDelay(1);
      const fb = ctx.createGain();
      const wet = ctx.createGain();
      const bus = ctx.createGain();
      dl.delayTime.value = 3 * e16;
      fb.gain.value = 0.3;
      wet.gain.value = 0.35;
      bus.connect(gain);
      bus.connect(dl);
      dl.connect(fb);
      fb.connect(dl);
      dl.connect(wet);
      wet.connect(gain);
      leadOut = bus;
      extraNodes.push(bus, dl, fb, wet);
    }

    const run: ActiveRun = {
      ctx,
      theme,
      gain,
      leadOut,
      extraNodes,
      events,
      loopDur: compiled.loopDur,
      loop: theme.loop,
      passStart: startAt,
      index: 0,
      timer: null,
      finishTimer: null,
    };
    run.timer = setInterval(() => this.pump(run), PUMP_MS);
    this.current = run;
    this.engine.setMusicActiveUntil(theme.loop ? Infinity : startAt + compiled.loopDur);
    this.pump(run); // schedule this pass's first look-ahead window immediately, not 25ms late
  }

  private pump(run: ActiveRun): void {
    if (this.current !== run) return; // stale timer from a run that was already replaced/stopped
    const now = run.ctx.currentTime;
    const lookahead = now + LOOK_AHEAD_S;
    for (;;) {
      if (run.index >= run.events.length) {
        if (!run.loop) {
          this.finish(run);
          return;
        }
        run.passStart += run.loopDur; // seamless: next pass starts exactly one loop later
        run.index = 0;
        continue;
      }
      const ev = run.events[run.index];
      if (!ev) break;
      const absTime = run.passStart + ev.time;
      if (absTime >= lookahead) break;
      if (absTime >= now) this.scheduleEvent(run, ev, absTime);
      // else: this event's start time already passed (a throttled timer) — skip it, don't play
      // it late, but still advance the position past it.
      run.index++;
    }
  }

  private scheduleEvent(run: ActiveRun, ev: ThemeEvent, absTime: number): void {
    switch (ev.kind) {
      case 'lead':
        instrNote(run.ctx, run.leadOut, 'lead', run.theme, absTime, ev.dur, ev.freq);
        break;
      case 'bass':
        instrNote(run.ctx, run.gain, 'bass', run.theme, absTime, ev.dur, ev.freq);
        break;
      case 'arp':
        instrNote(run.ctx, run.gain, 'arp', run.theme, absTime, ev.dur, ev.freq);
        break;
      default:
        drumHit(run.ctx, run.gain, ev.kind, absTime);
        break;
    }
  }

  /** A non-looping run has scheduled its last event; wait for the pass to actually finish. */
  private finish(run: ActiveRun): void {
    if (run.timer !== null) {
      clearInterval(run.timer);
      run.timer = null;
    }
    const now = run.ctx.currentTime;
    const delayMs = Math.max(0, (run.passStart + run.loopDur - now) * 1000);
    run.finishTimer = setTimeout(() => {
      for (const node of run.extraNodes) node.disconnect();
      if (this.current === run) {
        this.current = null;
        this.engine.setMusicActiveUntil(0);
      }
    }, delayMs);
  }

  /** Fade a run's gain to 0 over `fadeSeconds`, stop its scheduler, disconnect after the fade. */
  private haltRun(run: ActiveRun, fadeSeconds: number): void {
    if (run.timer !== null) {
      clearInterval(run.timer);
      run.timer = null;
    }
    if (run.finishTimer !== null) {
      clearTimeout(run.finishTimer);
      run.finishTimer = null;
    }
    const now = run.ctx.currentTime;
    run.gain.gain.cancelScheduledValues(now);
    run.gain.gain.setValueAtTime(run.gain.gain.value, now);
    run.gain.gain.linearRampToValueAtTime(0, now + fadeSeconds);
    setTimeout(
      () => {
        for (const node of run.extraNodes) node.disconnect();
      },
      Math.max(0, fadeSeconds * 1000),
    );
  }
}
