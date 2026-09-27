/**
 * Maps core GameEvents to sound effects (DESIGN §8.3 catalogue, §8.4 voice pitch). The core
 * stays silent and pure; this sink listens.
 *
 * Pure data + logic only: no Web Audio/DOM types or globals, so Node tests (no DOM lib) can
 * import this file. `SoundPlayer` is the minimal shape this file needs from the real audio
 * engine, so the file never has to reference `AudioEngine`/`AudioContext` at all.
 */
import type { EventSink, GameEvent } from '../core/types.ts';
import type { SfxId } from './sfx-ids.ts';

export interface SoundCue {
  readonly id: SfxId;
  readonly pitch: number;
}

export interface SoundContext {
  readonly themeId: string;
}

/** Anything that can play a sound effect — the real `AudioEngine` satisfies this structurally. */
export interface SoundPlayer {
  play(id: SfxId, pitch?: number): void;
}

function nonNegativeMod(n: number, m: number): number {
  const r = n % m;
  return r < 0 ? r + m : r;
}

/** Small, deterministic per-critter pitch variation (DESIGN §8.4): −3…+3 semitones. */
export function lemmingPitch(lemmingId: number): number {
  const semitones = nonNegativeMod(lemmingId * 5 + 3, 7) - 3;
  return 2 ** (semitones / 12);
}

/** `builder-low-bricks` pitch table (DESIGN §8.5): rising urgency as bricks run out. */
export const BUILDER_LOW_PITCH: Readonly<Record<number, number>> = { 3: 1, 2: 7 / 6, 1: 4 / 3 };

function builderLowPitch(bricksLeft: number): number {
  if (bricksLeft >= 3) return BUILDER_LOW_PITCH[3] ?? 1;
  if (bricksLeft <= 1) return BUILDER_LOW_PITCH[1] ?? 4 / 3;
  return BUILDER_LOW_PITCH[bricksLeft] ?? 1;
}

/** `trap-triggered` sound per theme (DESIGN §8.3); an unknown theme falls back to `trap`. */
export const TRAP_SFX_BY_THEME: Readonly<Record<string, SfxId>> = {
  mossgrove: 'trap-flytrap',
  sugarworks: 'trap-press',
  observatory: 'trap-pendulum',
  foundry: 'trap-piston',
  reef: 'trap-clam',
};

const cue = (id: SfxId, pitch = 1): SoundCue => ({ id, pitch });

export function soundFor(event: GameEvent, ctx: SoundContext): SoundCue | null {
  switch (event.type) {
    case 'lets-go':
      return cue('lets-go');
    case 'entrance-opened':
      return cue('entrance-open');
    case 'skill-assigned':
      return cue(event.skill === 'bomber' ? 'fuse' : 'assign');
    case 'skill-rejected':
      switch (event.reason) {
        case 'none-left':
          return cue('ui-empty');
        case 'steel':
        case 'one-way':
          return cue('steel');
        case 'level-ended':
          return null;
        case 'not-applicable':
        case 'blocker-overlap':
        case 'too-high':
        case 'no-lemming':
          return cue('ui-deny');
      }
    case 'lemming-exited':
      return cue('exit', lemmingPitch(event.lemmingId));
    case 'lemming-died':
      switch (event.cause) {
        case 'splat':
          return cue('splat');
        case 'drown':
          return cue('drown');
        case 'burn':
          return cue('burn');
        case 'trap':
        case 'explode':
        case 'out-of-bounds':
          // trap: the matching trap-triggered event plays the theme's variant instead.
          // explode: the explosion event already has its own sound. out-of-bounds: silent.
          return null;
      }
    case 'lemming-ohno':
      return event.nuking ? null : cue('ohno', lemmingPitch(event.lemmingId)); // one nuke sound instead of a chorus
    case 'explosion':
      return cue('explosion');
    case 'builder-low-bricks':
      return cue('builder-low', builderLowPitch(event.bricksLeft));
    case 'builder-finished':
      return cue('builder-shrug', lemmingPitch(event.lemmingId));
    case 'hit-steel':
      return cue('steel');
    case 'trap-triggered':
      return cue(TRAP_SFX_BY_THEME[ctx.themeId] ?? 'trap');
    case 'nuke-started':
      return cue('nuke');
    case 'time-low':
      return cue('time-low');
    case 'level-ended':
      return cue(event.outcome.won ? 'level-won' : 'level-lost');
    case 'lemming-spawned':
    case 'release-rate-changed':
    case 'all-released':
    case 'overtime-started':
    case 'goal-reached':
    case 'goal-impossible':
      return null;
  }
}

export interface EventSoundsOptions {
  readonly themeId: () => string;
  /** Fires for every cue, even when muted — captions are the visual twin of the sound. */
  readonly onCue?: (cue: SoundCue) => void;
}

export class EventSounds implements EventSink {
  private readonly player: SoundPlayer;
  private readonly themeId: () => string;
  private readonly onCue: ((cue: SoundCue) => void) | undefined;

  constructor(player: SoundPlayer, options: EventSoundsOptions) {
    this.player = player;
    this.themeId = options.themeId;
    this.onCue = options.onCue;
  }

  handleEvents(events: readonly GameEvent[], _tick: number): void {
    for (const event of events) {
      const found = soundFor(event, { themeId: this.themeId() });
      if (!found) continue;
      this.onCue?.(found);
      // Ducking (voice chirps −6 dB; explosion/nuke −3 dB, DESIGN §8.5) happens inside the
      // player's own play() (see AudioEngine.play), so this sink must not duck separately.
      this.player.play(found.id, found.pitch);
    }
  }
}
