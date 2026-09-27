/**
 * Versioned save-data schema. Bump SAVE_VERSION and add a step to `migrate()` (storage.ts)
 * whenever the shape changes — never break existing players' progress.
 */
import type { ActionId } from '../input/actions.ts';

export const SAVE_VERSION = 2;
/** Never change once shipped (players would lose progress). */
export const STORAGE_KEY = 'mumblemarch.save';

export type MotionPreference = 'system' | 'reduce' | 'full';
export type AnnouncementLevel = 'off' | 'essential' | 'all';
/** DESIGN §7.11: how much of the spoken narration is also shown as on-screen captions. */
export type CaptionsLevel = 'off' | 'barks' | 'all';
export type CursorSize = 32 | 48 | 64;
/** When a mouse skill choice is committed: on the initial press, or only on release. */
export type AssignTiming = 'press' | 'release';
export type GameSpeedSetting = 1 | 0.75 | 0.5;

export interface Settings {
  /** 0–1 each. Effective gain = master × channel, 0 when muted. */
  readonly masterVolume: number;
  readonly sfxVolume: number;
  /** Critter chirps ("let's go", "uh-oh", "yippee"). */
  readonly voiceVolume: number;
  readonly musicVolume: number;
  readonly muted: boolean;
  readonly musicEnabled: boolean;
  readonly motion: MotionPreference;
  readonly announcements: AnnouncementLevel;
  /** On-screen captions for narration/barks (DESIGN §7.11). */
  readonly captions: CaptionsLevel;
  /** In-canvas keyboard-cursor size in CSS px. */
  readonly cursorSize: CursorSize;
  /** High-contrast terrain/HUD palette. */
  readonly highContrast: boolean;
  /** DESIGN §7.11: mark the safe (≤ 63 px) vs deadly fall distance under the cursor/selection. */
  readonly fallRuler: boolean;
  /** Keyboard/mouse cursor near the view edge scrolls the camera. */
  readonly edgeScroll: boolean;
  /** Camera follows the selected mumble automatically. */
  readonly cameraFollow: boolean;
  /** When a mouse skill assignment is committed. */
  readonly assignOn: AssignTiming;
  /** The clock never ends a level (SessionOptions.relaxedTimer). */
  readonly relaxedTimer: boolean;
  /** Auto-pause when the browser tab loses focus. */
  readonly pauseOnBlur: boolean;
  /** Auto-pause whenever a skill is being chosen (DESIGN §7.11). */
  readonly pauseWhileChoosing: boolean;
  /** Simulation speed multiplier (1 = normal). */
  readonly gameSpeed: GameSpeedSetting;
  /** Show key-hint labels in the HUD. */
  readonly showKeyHints: boolean;
  /** Debug/accessibility escape hatch: every level is playable regardless of progress. */
  readonly unlockAll: boolean;
  /** Integer canvas scale, or 0 for "fit to window". */
  readonly scale: number;
  /** Only the actions the player rebound. */
  readonly bindings: Partial<Record<ActionId, readonly string[]>>;
}

export interface LevelProgress {
  readonly completed: boolean;
  /** Best number of lemmings saved. */
  readonly bestSaved: number;
  /** Ever completed within the time limit (relaxedTimer runs never count). */
  readonly inTime: boolean;
  /**
   * Number of *finished* attempts (won or lost) — `SaveStore.recordResult` is called once per
   * attempt that reaches an end, not once per hatch-start, so a level abandoned mid-run (e.g. a
   * page reload) is never counted.
   */
  readonly attempts: number;
}

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  readonly settings: Settings;
  /** Keyed by LevelDef.id. */
  readonly progress: Readonly<Record<string, LevelProgress>>;
  /** Last level played, for "Continue" (null before any level is played). */
  readonly lastLevelId: string | null;
}

/** TODO(design): confirm defaults (audio must never start loud; music is quiet by default). */
export const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.7,
  sfxVolume: 0.8,
  voiceVolume: 0.8,
  musicVolume: 0.35,
  muted: false,
  musicEnabled: true,
  motion: 'system',
  announcements: 'essential',
  captions: 'barks',
  cursorSize: 32,
  highContrast: false,
  fallRuler: false,
  edgeScroll: true,
  cameraFollow: false,
  assignOn: 'press',
  relaxedTimer: false,
  pauseOnBlur: true,
  pauseWhileChoosing: false,
  gameSpeed: 1,
  showKeyHints: true,
  unlockAll: false,
  scale: 0,
  bindings: {},
};

export const DEFAULT_SAVE: SaveData = {
  version: SAVE_VERSION,
  settings: DEFAULT_SETTINGS,
  progress: {},
  lastLevelId: null,
};
