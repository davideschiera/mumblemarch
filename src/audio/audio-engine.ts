/**
 * Web Audio engine (DESIGN §8.1, §8.5): one lazily created AudioContext, the full mix graph,
 * volume/mute from settings, per-id rate limiting (`SfxLimiter`), and music ducking.
 *
 * Browsers block audio until a user gesture, so the AudioContext is created (and the graph built)
 * only inside `unlock()`, which the app calls on the first pointerdown/keydown. Before that, every
 * method is a safe no-op — the game never autoplays sound — but settings that matter at unlock
 * time (volumes, the pause-duck flag) are remembered so they take effect as soon as it runs.
 *
 * Graph:
 * ```
 *   sfxBus (sfxVolume) ──────────────────────────────────┐
 *   voiceBus (voiceVolume) ───────────────────────────────┼──► master (masterVolume)
 *   musicIn → duckGain → pauseGain → pauseFilter (LP) →   │        │
 *     musicBus (musicVolume) ──────────────────────────────┘        ▼
 *                                                          limiter (DynamicsCompressor)
 *                                                                    │
 *                                                                    ▼
 *                                                               destination
 * ```
 * `musicIn` is what `musicOutput.out` hands the `MusicPlayer` to connect into. The limiter is a
 * safety net only (threshold −8 dB): calibrated sounds never reach it alone.
 */
import { SFX, VOICE_SFX, type SfxId } from './sfx.ts';
import { SFX_DUCK, SFX_LIMITS, SfxLimiter } from './limiter.ts';

export interface VolumeSettings {
  readonly masterVolume: number;
  readonly sfxVolume: number;
  readonly voiceVolume: number;
  readonly musicVolume: number;
  readonly muted: boolean;
}

/** 'locked' before any user-gesture unlock; then the AudioContext's own running/suspended state. */
export type AudioState = 'locked' | 'running' | 'suspended';

/** Gain ramps for volume/mute changes (DESIGN §8.1 "gains are linear, setTargetAtTime(v, t, 0.02)"). */
const RAMP_TIME_CONSTANT = 0.02;
/** Mute fades master linearly to/from 0 over this long (DESIGN §8.1). */
const MUTE_RAMP_S = 0.02;
/** −10 dB (linear) applied to the music bus while paused (DESIGN §8.5). */
const PAUSE_DUCK_GAIN = Math.pow(10, -10 / 20);
/** Low-pass cutoff applied to the music bus while paused (DESIGN §8.5). */
const PAUSE_DUCK_FREQ = 900;
/** Scheduling headroom so a triggered sound never starts in the past. */
const PLAY_LOOKAHEAD_S = 0.005;
/** Level stingers wait this long for the music to fade when a loop was NOT playing (DESIGN §8.5). */
const LEVEL_END_FADE_S = 0.4;

function clampVolume(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** The ids that wait for `musicActiveUntil` before sounding (DESIGN §8.5 "level end … stinger"). */
function isLevelStinger(id: SfxId): boolean {
  return id === 'level-won' || id === 'level-lost';
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private musicIn: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private pauseGain: GainNode | null = null;
  private pauseFilter: BiquadFilterNode | null = null;
  private musicBus: GainNode | null = null;

  private volumes: VolumeSettings;
  private pauseDuckOn = false;
  private musicActiveUntil = 0;
  private activeDuck: { readonly gain: number; readonly until: number } | null = null;
  private readonly sfxLimiter = new SfxLimiter();

  constructor(volumes: VolumeSettings) {
    this.volumes = volumes;
  }

  /** Call from a user-gesture handler. Safe to call repeatedly (idempotent). */
  unlock(): void {
    if (!this.ctx) {
      if (typeof AudioContext === 'undefined') return;
      const ctx = new AudioContext();
      this.ctx = ctx;

      const master = ctx.createGain();
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 12;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      master.connect(limiter);
      limiter.connect(ctx.destination);

      const sfxBus = ctx.createGain();
      const voiceBus = ctx.createGain();
      sfxBus.connect(master);
      voiceBus.connect(master);

      // Music chain: musicIn → duckGain → pauseGain → pauseFilter (LP) → musicBus → master.
      const musicIn = ctx.createGain();
      const duckGain = ctx.createGain();
      const pauseGain = ctx.createGain();
      const pauseFilter = ctx.createBiquadFilter();
      const musicBus = ctx.createGain();
      pauseFilter.type = 'lowpass';
      pauseFilter.Q.value = 0;
      musicIn.connect(duckGain);
      duckGain.connect(pauseGain);
      pauseGain.connect(pauseFilter);
      pauseFilter.connect(musicBus);
      musicBus.connect(master);

      this.master = master;
      this.sfxBus = sfxBus;
      this.voiceBus = voiceBus;
      this.musicIn = musicIn;
      this.duckGain = duckGain;
      this.pauseGain = pauseGain;
      this.pauseFilter = pauseFilter;
      this.musicBus = musicBus;

      // Initial values: set directly (no ramp) from whatever was remembered before unlock.
      const t = ctx.currentTime;
      sfxBus.gain.setValueAtTime(clampVolume(this.volumes.sfxVolume), t);
      voiceBus.gain.setValueAtTime(clampVolume(this.volumes.voiceVolume), t);
      musicBus.gain.setValueAtTime(clampVolume(this.volumes.musicVolume), t);
      master.gain.setValueAtTime(this.volumes.muted ? 0 : clampVolume(this.volumes.masterVolume), t);
      duckGain.gain.setValueAtTime(1, t);
      pauseGain.gain.setValueAtTime(this.pauseDuckOn ? PAUSE_DUCK_GAIN : 1, t);
      pauseFilter.frequency.setValueAtTime(this.pauseDuckOn ? PAUSE_DUCK_FREQ : ctx.sampleRate / 2, t);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  get unlocked(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** 'locked' before unlock(); otherwise the AudioContext's own 'running'/'suspended' state. */
  get state(): AudioState {
    if (!this.ctx) return 'locked';
    return this.ctx.state === 'running' ? 'running' : 'suspended';
  }

  setVolumes(volumes: VolumeSettings): void {
    const wasMuted = this.volumes.muted;
    this.volumes = volumes;
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.sfxBus || !this.voiceBus || !this.musicBus) return; // remembered; applied at unlock()

    const t = ctx.currentTime;
    this.sfxBus.gain.setTargetAtTime(clampVolume(volumes.sfxVolume), t, RAMP_TIME_CONSTANT);
    this.voiceBus.gain.setTargetAtTime(clampVolume(volumes.voiceVolume), t, RAMP_TIME_CONSTANT);
    this.musicBus.gain.setTargetAtTime(clampVolume(volumes.musicVolume), t, RAMP_TIME_CONSTANT);

    if (volumes.muted !== wasMuted) {
      this.rampMute(volumes.muted);
    } else if (!volumes.muted) {
      this.master.gain.setTargetAtTime(clampVolume(volumes.masterVolume), t, RAMP_TIME_CONSTANT);
    }
  }

  /** Resets "once per level" play limits. */
  beginLevel(): void {
    this.sfxLimiter.beginLevel();
  }

  /**
   * Duck the music bus by `db` decibels (negative), `attackS`/`releaseS` ramp times, holding the
   * duck for `holdS` seconds before releasing. SFX are never ducked. Overlapping ducks keep the
   * deeper one active for as long as either would run.
   */
  duckMusic(db: number, attackS: number, releaseS: number, holdS = 0): void {
    const ctx = this.ctx;
    const duckGain = this.duckGain;
    if (!ctx || !duckGain) return;

    const now = ctx.currentTime;
    const target = Math.pow(10, db / 20);
    const prev = this.activeDuck;
    let gain = target;
    let until = now + attackS + holdS;
    if (prev !== null) {
      if (now < prev.until && prev.gain < target) gain = prev.gain; // a deeper duck is still active — keep it
      until = Math.max(prev.until, until);
    }
    this.activeDuck = { gain, until };

    duckGain.gain.cancelScheduledValues(now);
    duckGain.gain.setTargetAtTime(gain, now, attackS / 3);
    duckGain.gain.setTargetAtTime(1, until, releaseS / 3);
  }

  /**
   * Called by the MusicPlayer: until which AudioContext time music is audible (Infinity while a
   * loop plays, the fade end while stopping, 0 when idle). Level stingers wait for it (DESIGN
   * §8.5 "level end: music fades out over 400 ms, then the stinger plays").
   */
  setMusicActiveUntil(time: number): void {
    this.musicActiveUntil = time;
  }

  /** −10 dB + a 900 Hz low-pass on the music bus while paused. */
  setPauseDuck(on: boolean): void {
    this.pauseDuckOn = on;
    const ctx = this.ctx;
    const pauseGain = this.pauseGain;
    const pauseFilter = this.pauseFilter;
    if (!ctx || !pauseGain || !pauseFilter) return;
    const t = ctx.currentTime;
    pauseGain.gain.setTargetAtTime(on ? PAUSE_DUCK_GAIN : 1, t, RAMP_TIME_CONSTANT);
    pauseFilter.frequency.setTargetAtTime(on ? PAUSE_DUCK_FREQ : ctx.sampleRate / 2, t, RAMP_TIME_CONSTANT);
  }

  /** Play an effect now. `pitch` ≈ 0.9–1.1 gives each critter its own voice (DESIGN §8.4). */
  play(id: SfxId, pitch = 1): void {
    const ctx = this.ctx;
    const sfxBus = this.sfxBus;
    const voiceBus = this.voiceBus;
    if (!ctx || ctx.state !== 'running' || this.volumes.muted || !sfxBus || !voiceBus) return;

    let when = ctx.currentTime + PLAY_LOOKAHEAD_S;
    if (isLevelStinger(id)) {
      when = this.musicActiveUntil === Infinity ? when + LEVEL_END_FADE_S : Math.max(when, this.musicActiveUntil);
    }

    if (!this.sfxLimiter.tryStart(id, when * 1000)) return;

    const bus = VOICE_SFX.has(id) ? voiceBus : sfxBus;
    SFX[id](ctx, bus, when, pitch);

    const duck = SFX_DUCK[id];
    if (duck) this.duckMusic(duck.db, duck.attackS, duck.releaseS, SFX_LIMITS[id].durMs / 1000);
  }

  /** The music chain's entry node, for the music player (null until unlocked). */
  get musicOutput(): { readonly ctx: AudioContext; readonly out: AudioNode } | null {
    return this.ctx && this.musicIn ? { ctx: this.ctx, out: this.musicIn } : null;
  }

  /** Ramps `master` linearly to 0 (mute) or back to masterVolume, in 20 ms (DESIGN §8.1). */
  private rampMute(muted: boolean): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    const target = muted ? 0 : clampVolume(this.volumes.masterVolume);
    const current = master.gain.value;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(current, t);
    master.gain.linearRampToValueAtTime(target, t + MUTE_RAMP_S);
  }
}
