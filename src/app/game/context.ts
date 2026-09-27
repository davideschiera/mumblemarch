/**
 * PlayContext — what every game module receives: the session, the level, the app services,
 * the HUD view, the shared PlayState, the other modules, and a few verbs (command, say,
 * uiSound, setStatus, step…). Modules never reach into the controller or the DOM directly
 * (except through `services`), so each one can be implemented on its own file.
 *
 * Module wiring: `ctx.modules.<name>` is available once the controller finished constructing
 * every module (do NOT call other modules from a constructor). Type-only imports keep the
 * module graph acyclic at runtime.
 * Owner: ui-lead (E0 wrote it). The controller implements it.
 */
import type { SfxId } from '../../audio/sfx-ids.ts';
import type { GameSession } from '../../core/session.ts';
import type { GameCommand, GameEvent, LevelOutcome } from '../../core/types.ts';
import type { LevelDef } from '../../levels/format.ts';
import type { Settings } from '../../persistence/schema.ts';
import type { AnnounceOptions } from '../../ui/announce-queue.ts';
import type { GameHudView } from '../../ui/hud/types.ts';
import type { ResultRecord, ScreenContext } from '../../ui/screens/screen.ts';
import type { AppServices } from '../services.ts';
import type { AudioWiring } from './audio-wiring.ts';
import type { CameraControl } from './camera-control.ts';
import type { GameDialogs } from './dialogs.ts';
import type { FlowControl } from './flow.ts';
import type { KeyboardCursor } from './keyboard-cursor.ts';
import type { MinimapControl } from './minimap-control.ts';
import type { PlayState, StatusKind } from './play-state.ts';
import type { PointerControl } from './pointer.ts';
import type { PopRestartControl } from './pop-restart.ts';
import type { ReleaseRateControl } from './release-rate.ts';
import type { Selection } from './selection.ts';
import type { SkillsControl } from './skills.ts';
import type { UndoControl } from './undo.ts';

/** Who caused a command/choice: drives feedback (§7.3 #6 "essential (mouse: all)", de-dup bypass). */
export type CommandSource = 'key' | 'pointer' | 'hud' | 'hook';

/** Every game module, by owner (see each file's header). */
export interface PlayModules {
  readonly selection: Selection; // E4
  readonly camera: CameraControl; // E4
  readonly cursor: KeyboardCursor; // E4
  readonly pointer: PointerControl; // E4
  readonly minimap: MinimapControl; // E4
  readonly skills: SkillsControl; // E5a
  readonly flow: FlowControl; // E5a
  readonly releaseRate: ReleaseRateControl; // E5a
  readonly popRestart: PopRestartControl; // E5a
  readonly undo: UndoControl; // E5a
  readonly dialogs: GameDialogs; // E5a
  readonly audio: AudioWiring; // E5b
}

/** Leaving the game screen (screens.ts provides these; each destroys this run). */
export interface PlayNavigation {
  /** Restart the level (a fresh game screen). */
  restart(): void;
  /** Quit to level select. */
  quit(): void;
  /** Show the results screen for `outcome`. */
  results(outcome: LevelOutcome, record: ResultRecord): void;
}

export interface PlayContext {
  /** The live session. A getter: undo (§6.4.7) may replace it via `replaceSession`. */
  readonly session: GameSession;
  readonly level: LevelDef;
  readonly services: AppServices;
  readonly view: GameHudView;
  readonly state: PlayState;
  readonly modules: PlayModules;
  readonly nav: PlayNavigation;
  /** For in-game overlays that reuse screen content (help, briefing, settings). */
  readonly screen: ScreenContext;

  /**
   * Apply a player command now (works while paused, DESIGN §6.4.1), dispatch its events to every
   * sink and module (skills gets them via handleCommandEvents), and return them.
   */
  command(command: GameCommand, source: CommandSource): readonly GameEvent[];
  /** Run `ticks` simulation ticks now through the normal tick path (frame-step, §6.4.2). */
  step(ticks: number): void;
  /** Speak via the Announcer (§7.3; the announcer applies the Announcements setting). */
  say(message: string, options?: AnnounceOptions): void;
  /** Play a UI sound (no-op until audio is unlocked / when muted). */
  uiSound(id: SfxId): void;
  /** Show a transient status-line message for `ms` (§6.1.3, §6.4.4, §6.5). */
  setStatus(text: string, kind: StatusKind, ms: number): void;
  settings(): Settings;
  /** Current integer CSS scale of the canvas (≥ 1), for the snap radius ceil(24 / scale) (§6.3.3). */
  scale(): number;
  /** Move focus to the playfield canvas unless it already has it (§6.2.6). */
  focusCanvas(): void;
  /** Swap in a rebuilt session (undo, §6.4.7): re-points renderer, minimap and sinks. */
  replaceSession(next: GameSession): void;
}
