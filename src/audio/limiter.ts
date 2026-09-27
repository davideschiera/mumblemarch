/**
 * Per-id rate limiting, polyphony caps and music-ducking table (DESIGN §8.5). Pure data + logic —
 * no Web Audio or DOM types/globals — so Node's test runner (which compiles this file with
 * `lib: ES2023` only, no DOM) can import and unit-test it directly. Never import `sfx.ts`,
 * `synth.ts` or `audio-engine.ts` from here.
 */
import { SFX_IDS, type SfxId } from './sfx-ids.ts';

export interface SfxLimit {
  /** A trigger of this id starting sooner than this after the last accepted one is dropped. */
  readonly minGapMs: number;
  /** Max concurrently-sounding instances of this id (by measured `durMs`); over the cap, dropped. */
  readonly maxVoices: number;
  /** Measured time-to-silence (DESIGN §8.3 "Dur ms"), used as this id's end-of-voice estimate. */
  readonly durMs: number;
  /** Plays at most once between `beginLevel()` calls. */
  readonly oncePerLevel: boolean;
}

/** Engine default when an id has no §8.5 override. */
export const DEFAULT_MIN_GAP_MS = 60;

/** Dur ms, DESIGN §8.3 (time to −60 dBFS, offline measurement, unity bus gain). */
const DUR_MS: Readonly<Record<SfxId, number>> = {
  'ui-move': 34,
  'ui-select': 101,
  'ui-deny': 151,
  'ui-back': 101,
  'ui-empty': 77,
  'ui-arm': 256,
  assign: 62,
  'entrance-open': 654,
  'lets-go': 429,
  exit: 351,
  splat: 120,
  drown: 378,
  burn: 373,
  trap: 117,
  ohno: 470,
  explosion: 190,
  'builder-low': 101,
  steel: 128,
  nuke: 742,
  'time-low': 301,
  'level-won': 761,
  'level-lost': 996,
  pause: 163,
  unpause: 163,
  'ff-on': 127,
  'ff-off': 127,
  'rr-up': 27,
  'rr-down': 27,
  undo: 127,
  fuse: 297,
  'builder-shrug': 299,
  'trap-flytrap': 403,
  'trap-press': 361,
  'trap-pendulum': 701,
  'trap-piston': 451,
  'trap-clam': 403,
};

/** §8.5 min-gap / max-concurrent overrides; every other id gets DEFAULT_MIN_GAP_MS / Infinity. */
const OVERRIDES: Readonly<Partial<Record<SfxId, { readonly minGapMs: number; readonly maxVoices: number }>>> = {
  explosion: { minGapMs: 80, maxVoices: 6 },
  exit: { minGapMs: 120, maxVoices: 3 },
  splat: { minGapMs: 100, maxVoices: 3 },
  drown: { minGapMs: 150, maxVoices: 3 },
  burn: { minGapMs: 150, maxVoices: 2 },
  trap: { minGapMs: 150, maxVoices: 2 },
  'trap-flytrap': { minGapMs: 150, maxVoices: 2 },
  'trap-press': { minGapMs: 150, maxVoices: 2 },
  'trap-pendulum': { minGapMs: 150, maxVoices: 2 },
  'trap-piston': { minGapMs: 150, maxVoices: 2 },
  'trap-clam': { minGapMs: 150, maxVoices: 2 },
  steel: { minGapMs: 90, maxVoices: Infinity },
  ohno: { minGapMs: 150, maxVoices: Infinity },
  'ui-move': { minGapMs: 40, maxVoices: Infinity },
  'rr-up': { minGapMs: 50, maxVoices: Infinity },
  'rr-down': { minGapMs: 50, maxVoices: Infinity },
};

/** Once per level (independently per id): `lets-go`, `entrance-open`, `nuke`, `level-won`, `level-lost`. */
export const ONCE_PER_LEVEL_IDS: readonly SfxId[] = ['lets-go', 'entrance-open', 'nuke', 'level-won', 'level-lost'];
const ONCE_PER_LEVEL_SET: ReadonlySet<SfxId> = new Set(ONCE_PER_LEVEL_IDS);

function buildLimits(): Readonly<Record<SfxId, SfxLimit>> {
  const limits = {} as Record<SfxId, SfxLimit>;
  for (const id of SFX_IDS) {
    const override = OVERRIDES[id];
    limits[id] = {
      minGapMs: override?.minGapMs ?? DEFAULT_MIN_GAP_MS,
      maxVoices: override?.maxVoices ?? Infinity,
      durMs: DUR_MS[id],
      oncePerLevel: ONCE_PER_LEVEL_SET.has(id),
    };
  }
  return limits;
}

/** The default per-id limits table (§8.5), built once. */
export const SFX_LIMITS: Readonly<Record<SfxId, SfxLimit>> = buildLimits();

export interface DuckSpec {
  /** Target level for the music bus while ducked, in dB (negative). */
  readonly db: number;
  readonly attackS: number;
  readonly releaseS: number;
}

const VOICE_CHIRP_DUCK: DuckSpec = { db: -6, attackS: 0.02, releaseS: 0.3 };
const BIG_MOMENT_DUCK: DuckSpec = { db: -3, attackS: 0.02, releaseS: 0.3 };

/** Music-bus ducking per id (§8.5); SFX are never ducked. Ids absent here never duck the music. */
export const SFX_DUCK: Readonly<Partial<Record<SfxId, DuckSpec>>> = {
  'lets-go': VOICE_CHIRP_DUCK,
  ohno: VOICE_CHIRP_DUCK,
  exit: VOICE_CHIRP_DUCK,
  'builder-shrug': VOICE_CHIRP_DUCK,
  explosion: BIG_MOMENT_DUCK,
  nuke: BIG_MOMENT_DUCK,
};

/**
 * Tracks per-id rate limits, polyphony caps and once-per-level gating (DESIGN §8.5). Concurrency
 * is tracked as id → list of end times (`end = start + durMs`); over the cap, or inside the
 * minimum gap, or already played once this level, a trigger is dropped and nothing is recorded.
 */
export class SfxLimiter {
  private readonly limits: Readonly<Record<SfxId, SfxLimit>>;
  private readonly lastAcceptedStartMs = new Map<SfxId, number>();
  private readonly activeEndsMs = new Map<SfxId, number[]>();
  private readonly playedOnceThisLevel = new Set<SfxId>();

  constructor(limits: Readonly<Record<SfxId, SfxLimit>> = SFX_LIMITS) {
    this.limits = limits;
  }

  /**
   * Would a trigger of `id` starting at `startMs` (AudioContext time in ms) play? If yes, records
   * it (last-accepted start, an end-time slot for concurrency, the once-per-level flag) and
   * returns true. If not — rate limited, over the concurrency cap, or already played once this
   * level — returns false and nothing is recorded.
   */
  tryStart(id: SfxId, startMs: number): boolean {
    const limit = this.limits[id];

    if (limit.oncePerLevel && this.playedOnceThisLevel.has(id)) return false;

    const lastStart = this.lastAcceptedStartMs.get(id);
    if (lastStart !== undefined && startMs - lastStart < limit.minGapMs) return false;

    const ends = this.activeEndsMs.get(id) ?? [];
    const stillActive = ends.filter((end) => end > startMs);
    if (stillActive.length >= limit.maxVoices) return false;

    stillActive.push(startMs + limit.durMs);
    this.activeEndsMs.set(id, stillActive);
    this.lastAcceptedStartMs.set(id, startMs);
    if (limit.oncePerLevel) this.playedOnceThisLevel.add(id);
    return true;
  }

  /** Clears only the once-per-level record (call at the start of each level). */
  beginLevel(): void {
    this.playedOnceThisLevel.clear();
  }

  /** Clears everything: rate limits, concurrency slots and the once-per-level record. */
  reset(): void {
    this.lastAcceptedStartMs.clear();
    this.activeEndsMs.clear();
    this.playedOnceThisLevel.clear();
  }
}
