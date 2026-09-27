/**
 * AudioWiring — everything in-game that talks to the audio layer: the EventSounds sink with its
 * `onCue` → caption strip (DESIGN §7.7/§9.4: `settings.captions` 'barks' = voice-chirp captions
 * only (CAPTIONS), 'all' adds the bracketed sound captions (SOUND_CAPTIONS), 'off' = none),
 * `beginLevel()` (§8.5 once-per-level limits + this level's music variant), the theme music
 * starting at `MUSIC_START_TICK` with variant = the level's index within its theme mod 3 (§8.6,
 * `musicVariant` in rules.ts, levels grouped via `levels/registry.ts`), the pause duck
 * (§6.4.1/§8.5), music stop on level end (§8.5: 400 ms fade before the stinger) and on leaving
 * the screen (`destroy()`, default fade), UI sounds, and the M mute toggle (§7.3 #20).
 * Owner: E5b.
 */
import { EventSounds, type SoundCue } from '../../audio/event-sounds.ts';
import type { SfxId } from '../../audio/sfx-ids.ts';
import type { EventSink, GameEvent } from '../../core/types.ts';
import { LEVELS } from '../../levels/registry.ts';
import { ANNOUNCE } from '../../ui/strings.ts';
import { MUSIC_END_FADE_S, MUSIC_START_TICK } from '../config.ts';
import { captionFor } from './audio-captions.ts';
import { musicVariantFor, readyToStartMusic } from './audio-music.ts';
import type { PlayContext } from './context.ts';

export class AudioWiring {
  /** Plays each tick's event sounds; `onCue` feeds the captions. */
  readonly sink: EventSink;
  private readonly ctx: PlayContext;
  /** This level's music variant (§8.6: its index within its theme, mod 3), set by `beginLevel()`. */
  private variant = 0;
  private musicStarted = false;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
    this.sink = new EventSounds(ctx.services.audio, {
      themeId: () => this.ctx.session.level.themeId,
      onCue: (cue) => this.onCue(cue),
    });
  }

  /** Level start: reset once-per-level sound limits and pick this level's music variant (§8.5/§8.6). */
  beginLevel(): void {
    this.ctx.services.audio.beginLevel();
    this.musicStarted = false;
    this.variant = musicVariantFor(LEVELS, this.ctx.level);
  }

  /**
   * After every tick: start the theme loop once the tick reaches `MUSIC_START_TICK` (§8.6, "after
   * the first mumble drops"). `MusicPlayer.startTheme` remembers the request even while
   * `musicEnabled` is off, so turning music on mid-level (Settings) still starts this level's
   * theme at the right variant instead of waiting for the next level.
   */
  onTick(tick: number): void {
    if (!readyToStartMusic(tick, MUSIC_START_TICK, this.musicStarted)) return;
    this.musicStarted = true;
    this.ctx.services.music.startTheme(this.ctx.level.theme, this.variant);
  }

  /** §6.4.1/§8.5 pause duck (−10 dB + 900 Hz low-pass on the music bus); UI sounds keep playing. */
  setPaused(paused: boolean): void {
    this.ctx.services.audio.setPauseDuck(paused);
  }

  /** §8.5 `level-ended`: fade the music out over 400 ms so the win/lose stinger is heard clearly. */
  handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'level-ended') this.ctx.services.music.stop(MUSIC_END_FADE_S);
    }
  }

  /** A UI sound (no-op until audio is unlocked / when muted). */
  uiSound(id: SfxId): void {
    this.ctx.services.audio.play(id);
  }

  /** §6.1.1 M: toggle Settings.muted (persisted) and say "Sound off"/"Sound on" (§7.3 #20). */
  toggleMute(): void {
    const muted = !this.ctx.settings().muted;
    this.ctx.services.save.updateSettings({ muted });
    this.ctx.say(ANNOUNCE.mute(muted), { key: 'mute', userInitiated: true });
  }

  /** Leaving the game screen: stop the music (default fade, DESIGN §8.1/§8.5). */
  destroy(): void {
    this.ctx.services.music.stop();
  }

  /**
   * §7.7/§9.4 captions from sound cues — `onCue` fires for every cue even when muted, since
   * captions are the visual twin of the sound, not a substitute triggered by muting.
   */
  private onCue(cue: SoundCue): void {
    const text = captionFor(cue.id, this.ctx.settings().captions);
    if (text) this.ctx.view.caption(text);
  }
}
