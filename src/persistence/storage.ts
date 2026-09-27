/**
 * localStorage persistence with safe fallbacks. Storage can be missing, full, disabled or hold
 * garbage from an older build — none of that may crash the game: we fall back to defaults and
 * keep playing (progress is then simply not persisted).
 */
import { ACTION_IDS, type ActionId } from '../input/actions.ts';
import { FIXED_ACTIONS, RESERVED_CODES } from '../input/bindings.ts';
import {
  DEFAULT_SAVE,
  DEFAULT_SETTINGS,
  SAVE_VERSION,
  STORAGE_KEY,
  type LevelProgress,
  type SaveData,
  type Settings,
} from './schema.ts';

/** The subset of the Web Storage API we use (injectable for tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadSave(store: KeyValueStore | null): SaveData {
  if (!store) return DEFAULT_SAVE;
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw === null ? DEFAULT_SAVE : migrate(JSON.parse(raw));
  } catch {
    return DEFAULT_SAVE;
  }
}

/** Returns false if the data could not be written (quota, privacy mode…). */
export function writeSave(store: KeyValueStore | null, data: SaveData): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Accept any JSON value and return valid, current-version SaveData. v1 → v2 kept `settings` and
 * `progress` as-is (both sanitizers already fall back field-by-field), so migrating is just
 * accepting the old version number and re-sanitizing into the v2 shape (new fields get their
 * v2 defaults; nothing the player earned is lost).
 */
export function migrate(raw: unknown): SaveData {
  if (!isObject(raw)) return DEFAULT_SAVE;
  const version = raw['version'];
  if (version !== 1 && version !== SAVE_VERSION) return DEFAULT_SAVE;
  return {
    version: SAVE_VERSION,
    settings: sanitizeSettings(raw['settings']),
    progress: sanitizeProgress(raw['progress']),
    lastLevelId: typeof raw['lastLevelId'] === 'string' ? raw['lastLevelId'] : null,
  };
}

function sanitizeSettings(raw: unknown): Settings {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const d = DEFAULT_SETTINGS;
  const unit = (v: unknown, fallback: number): number =>
    typeof v === 'number' && v >= 0 && v <= 1 ? v : fallback;
  const oneOf = <T extends string | number>(v: unknown, options: readonly T[], fallback: T): T =>
    options.includes(v as T) ? (v as T) : fallback;
  const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
  return {
    masterVolume: unit(raw['masterVolume'], d.masterVolume),
    sfxVolume: unit(raw['sfxVolume'], d.sfxVolume),
    voiceVolume: unit(raw['voiceVolume'], d.voiceVolume),
    musicVolume: unit(raw['musicVolume'], d.musicVolume),
    muted: bool(raw['muted'], d.muted),
    musicEnabled: bool(raw['musicEnabled'], d.musicEnabled),
    motion: oneOf(raw['motion'], ['system', 'reduce', 'full'], d.motion),
    announcements: oneOf(raw['announcements'], ['off', 'essential', 'all'], d.announcements),
    captions: oneOf(raw['captions'], ['off', 'barks', 'all'], d.captions),
    cursorSize: oneOf(raw['cursorSize'], [32, 48, 64], d.cursorSize),
    highContrast: bool(raw['highContrast'], d.highContrast),
    fallRuler: bool(raw['fallRuler'], d.fallRuler),
    edgeScroll: bool(raw['edgeScroll'], d.edgeScroll),
    cameraFollow: bool(raw['cameraFollow'], d.cameraFollow),
    assignOn: oneOf(raw['assignOn'], ['press', 'release'], d.assignOn),
    relaxedTimer: bool(raw['relaxedTimer'], d.relaxedTimer),
    pauseOnBlur: bool(raw['pauseOnBlur'], d.pauseOnBlur),
    pauseWhileChoosing: bool(raw['pauseWhileChoosing'], d.pauseWhileChoosing),
    gameSpeed: oneOf(raw['gameSpeed'], [1, 0.75, 0.5], d.gameSpeed),
    showKeyHints: bool(raw['showKeyHints'], d.showKeyHints),
    unlockAll: bool(raw['unlockAll'], d.unlockAll),
    scale: Number.isInteger(raw['scale']) && (raw['scale'] as number) >= 0 ? (raw['scale'] as number) : d.scale,
    bindings: sanitizeBindings(raw['bindings']),
  };
}

/**
 * Keep only known, overridable actions whose value is a list of key-code strings: drop reserved
 * codes (`RESERVED_CODES`, e.g. `Tab`/`Escape`), cap at 2 codes per action, and never accept an
 * override for a `FIXED_ACTIONS` entry (`menu` is always `Escape`) — DESIGN §6.1.2/§7.11.
 */
function sanitizeBindings(raw: unknown): Settings['bindings'] {
  const out: Partial<Record<ActionId, readonly string[]>> = {};
  if (!isObject(raw)) return out;
  for (const action of ACTION_IDS) {
    if (FIXED_ACTIONS.has(action)) continue;
    const codes = raw[action];
    if (!Array.isArray(codes)) continue;
    const cleaned = codes.filter((c): c is string => typeof c === 'string' && !RESERVED_CODES.has(c));
    // An explicit empty list means "the player cleared every key" (Settings → Backspace) and must
    // survive a reload; a list whose codes were ALL invalid falls back to the defaults instead.
    if (codes.length === 0) out[action] = [];
    else if (cleaned.length > 0) out[action] = cleaned.slice(0, 2);
  }
  return out;
}

function sanitizeProgress(raw: unknown): Record<string, LevelProgress> {
  const out: Record<string, LevelProgress> = {};
  if (!isObject(raw)) return out;
  for (const [id, value] of Object.entries(raw)) {
    if (!isObject(value)) continue;
    const bestSaved = value['bestSaved'];
    const attempts = value['attempts'];
    out[id] = {
      completed: value['completed'] === true,
      bestSaved: typeof bestSaved === 'number' && bestSaved >= 0 ? Math.floor(bestSaved) : 0,
      inTime: value['inTime'] === true,
      attempts: typeof attempts === 'number' && attempts >= 0 ? Math.floor(attempts) : 0,
    };
  }
  return out;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Level-select unlock rule (DESIGN §5.4/§7.11): level 0 is always unlocked, level n unlocks once
 * `levelIds[n-1]` is completed, and `unlockAll` (Settings) overrides everything. `persistence`
 * must not import `levels`, so the caller passes the campaign order as plain ids.
 */
export function isLevelUnlocked(
  levelIds: readonly string[],
  index: number,
  progress: Readonly<Record<string, LevelProgress>>,
  unlockAll: boolean,
): boolean {
  if (unlockAll) return true;
  if (index <= 0) return true;
  const prevId = levelIds[index - 1];
  return prevId !== undefined && progress[prevId]?.completed === true;
}

/**
 * The level "Play"/"Continue" should open (DESIGN §5.4 Title screen): the first campaign level
 * not yet completed, or the last level when every level is completed. `null` only for an empty
 * campaign.
 */
export function firstUnfinishedLevelId(
  levelIds: readonly string[],
  progress: Readonly<Record<string, LevelProgress>>,
): string | null {
  if (levelIds.length === 0) return null;
  const firstUnfinished = levelIds.find((id) => progress[id]?.completed !== true);
  return firstUnfinished ?? levelIds[levelIds.length - 1]!;
}

/**
 * In-memory owner of the save data: read it, update it immutably, auto-persist, notify.
 */
export class SaveStore {
  private data: SaveData;
  private readonly store: KeyValueStore | null;
  private readonly listeners = new Set<(data: SaveData) => void>();

  constructor(store: KeyValueStore | null) {
    this.store = store;
    this.data = loadSave(store);
  }

  get current(): SaveData {
    return this.data;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.commit({ ...this.data, settings: { ...this.data.settings, ...patch } });
  }

  /** Record a finished attempt: keeps the best result, ORs completed/inTime, counts attempts. */
  recordResult(levelId: string, saved: number, won: boolean, inTime = false): void {
    const prev = this.data.progress[levelId];
    const next: LevelProgress = {
      completed: (prev?.completed ?? false) || won,
      bestSaved: Math.max(prev?.bestSaved ?? 0, saved),
      inTime: (prev?.inTime ?? false) || inTime,
      attempts: (prev?.attempts ?? 0) + 1,
    };
    this.commit({ ...this.data, progress: { ...this.data.progress, [levelId]: next } });
  }

  /** Remember the last level played, for a "Continue" entry point. */
  setLastLevel(id: string): void {
    this.commit({ ...this.data, lastLevelId: id });
  }

  subscribe(listener: (data: SaveData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private commit(next: SaveData): void {
    this.data = next;
    writeSave(this.store, next);
    for (const listener of this.listeners) listener(next);
  }
}
