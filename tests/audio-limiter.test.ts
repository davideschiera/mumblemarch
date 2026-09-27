/**
 * INDEPENDENT validation for workstream D ("audio"), task D-V1 — `src/audio/limiter.ts` against
 * DESIGN.md §8.3 ("Dur ms" column) and §8.5 (rate limits, polyphony, ducking).
 *
 * Expected numbers below are transcribed from DESIGN.md, not from `limiter.ts`. Coordinator
 * clarifications used: the `trap-*` row of §8.5 (150 ms / 2 concurrent) also covers the fallback
 * `trap` id; default for an id with no §8.5 override = 60 ms gap, unlimited concurrency; once-
 * per-level applies individually to `lets-go`, `entrance-open`, `nuke`, `level-won`, `level-lost`;
 * ducks: voice chirps -6 dB (attack .02/release .3), `explosion`/`nuke` -3 dB (same times).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SFX_IDS, type SfxId } from '../src/audio/sfx-ids.ts';
import { ONCE_PER_LEVEL_IDS, SFX_DUCK, SFX_LIMITS, SfxLimiter, type SfxLimit } from '../src/audio/limiter.ts';

// ─── DESIGN §8.3 "Dur ms" column, transcribed independently ────────────────────────────────

const EXPECTED_DUR_MS: Readonly<Record<SfxId, number>> = {
  'ui-move': 34,
  'ui-select': 101,
  'ui-back': 101,
  'ui-deny': 151,
  'ui-empty': 77,
  'ui-arm': 256,
  pause: 163,
  unpause: 163,
  'ff-on': 127,
  'ff-off': 127,
  'rr-up': 27,
  'rr-down': 27,
  undo: 127,
  assign: 62,
  fuse: 297,
  'builder-low': 101,
  'builder-shrug': 299,
  steel: 128,
  'time-low': 301,
  'lets-go': 429,
  ohno: 470,
  exit: 351,
  'entrance-open': 654,
  splat: 120,
  drown: 378,
  burn: 373,
  trap: 117,
  'trap-flytrap': 403,
  'trap-press': 361,
  'trap-pendulum': 701,
  'trap-piston': 451,
  'trap-clam': 403,
  explosion: 190,
  nuke: 742,
  'level-won': 761,
  'level-lost': 996,
};

// ─── DESIGN §8.5 rate-limit / polyphony overrides, transcribed independently ───────────────
// Ids absent here (per the coordinator's default rule) get 60 ms / Infinity.

const EXPECTED_OVERRIDES: Readonly<Partial<Record<SfxId, { readonly minGapMs: number; readonly maxVoices: number }>>> = {
  explosion: { minGapMs: 80, maxVoices: 6 },
  exit: { minGapMs: 120, maxVoices: 3 },
  splat: { minGapMs: 100, maxVoices: 3 },
  drown: { minGapMs: 150, maxVoices: 3 },
  burn: { minGapMs: 150, maxVoices: 2 },
  trap: { minGapMs: 150, maxVoices: 2 }, // coordinator: fallback trap shares the trap-* row
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

const DEFAULT_MIN_GAP_MS = 60;

/** Independently transcribed from the coordinator's decision (per-id, not a group toggle). */
const EXPECTED_ONCE_PER_LEVEL = new Set<SfxId>(['lets-go', 'entrance-open', 'nuke', 'level-won', 'level-lost']);

test('SFX_LIMITS covers all 36 SFX_IDS', () => {
  assert.equal(SFX_IDS.length, 36, 'sanity: DESIGN §8.3 lists 36 sfx ids');
  for (const id of SFX_IDS) assert.ok(id in SFX_LIMITS, `missing limit for ${id}`);
  assert.equal(Object.keys(SFX_LIMITS).length, SFX_IDS.length);
});

test('SFX_LIMITS: durMs matches DESIGN §8.3 for every id', () => {
  for (const id of SFX_IDS) {
    assert.equal(SFX_LIMITS[id].durMs, EXPECTED_DUR_MS[id], `${id}: durMs`);
  }
});

test('SFX_LIMITS: minGapMs/maxVoices match DESIGN §8.5 overrides, default 60 ms / unlimited otherwise', () => {
  for (const id of SFX_IDS) {
    const override = EXPECTED_OVERRIDES[id];
    const expectedGap = override?.minGapMs ?? DEFAULT_MIN_GAP_MS;
    const expectedVoices = override?.maxVoices ?? Infinity;
    assert.equal(SFX_LIMITS[id].minGapMs, expectedGap, `${id}: minGapMs`);
    assert.equal(SFX_LIMITS[id].maxVoices, expectedVoices, `${id}: maxVoices`);
  }
});

test('SFX_LIMITS: oncePerLevel is set for exactly lets-go/entrance-open/nuke/level-won/level-lost', () => {
  for (const id of SFX_IDS) {
    assert.equal(SFX_LIMITS[id].oncePerLevel, EXPECTED_ONCE_PER_LEVEL.has(id), `${id}: oncePerLevel`);
  }
  assert.deepEqual(new Set(ONCE_PER_LEVEL_IDS), EXPECTED_ONCE_PER_LEVEL);
});

// ─── SFX_DUCK (DESIGN §8.5 "Ducking") ──────────────────────────────────────────────────────

test('SFX_DUCK: voice chirps -6 dB, explosion/nuke -3 dB, attack .02 / release .3; nothing else ducks', () => {
  const voiceChirps: readonly SfxId[] = ['lets-go', 'ohno', 'exit', 'builder-shrug'];
  const bigMoments: readonly SfxId[] = ['explosion', 'nuke'];
  for (const id of voiceChirps) {
    const duck = SFX_DUCK[id];
    assert.ok(duck, `${id} should duck the music bus`);
    assert.equal(duck.db, -6);
    assert.equal(duck.attackS, 0.02);
    assert.equal(duck.releaseS, 0.3);
  }
  for (const id of bigMoments) {
    const duck = SFX_DUCK[id];
    assert.ok(duck, `${id} should duck the music bus`);
    assert.equal(duck.db, -3);
    assert.equal(duck.attackS, 0.02);
    assert.equal(duck.releaseS, 0.3);
  }
  const ducking = new Set([...voiceChirps, ...bigMoments]);
  for (const id of SFX_IDS) {
    if (!ducking.has(id)) assert.equal(SFX_DUCK[id], undefined, `${id} should never duck the music bus (SFX are never ducked)`);
  }
});

// ─── SfxLimiter behaviour (mechanism, independent of the calibrated table above) ───────────

/** A full 36-id limits table, built from a single override — lets tests isolate one id's rule. */
function limitsWith(overrides: Partial<Record<SfxId, SfxLimit>>): Readonly<Record<SfxId, SfxLimit>> {
  return { ...SFX_LIMITS, ...overrides } as Readonly<Record<SfxId, SfxLimit>>;
}

test('SfxLimiter: drops a trigger inside the default 60 ms gap, accepts at exactly 60 ms', () => {
  const limiter = new SfxLimiter(); // real SFX_LIMITS; 'assign' has no §8.5 override -> default 60 ms
  assert.equal(limiter.tryStart('assign', 0), true);
  assert.equal(limiter.tryStart('assign', 59), false);
  assert.equal(limiter.tryStart('assign', 60), true);
});

test('SfxLimiter: overridden min gap (ui-move, 40 ms) drops under the gap, accepts at the gap', () => {
  const limiter = new SfxLimiter();
  assert.equal(limiter.tryStart('ui-move', 0), true);
  assert.equal(limiter.tryStart('ui-move', 39), false, '39 ms apart is under the 40 ms gap');
  assert.equal(limiter.tryStart('ui-move', 40), true, 'exactly 40 ms apart is accepted');
});

test('SfxLimiter: a dropped (rate-limited) trigger does not reset the gap clock', () => {
  const limiter = new SfxLimiter();
  assert.equal(limiter.tryStart('ui-move', 0), true);
  assert.equal(limiter.tryStart('ui-move', 10), false); // dropped
  assert.equal(limiter.tryStart('ui-move', 20), false); // still measured from t=0, not t=10
  // If the dropped attempt had reset the clock to 10, 40 would read as only 30 ms since last and
  // still be rejected; it must be accepted (40 ms since the ACCEPTED start at 0).
  assert.equal(limiter.tryStart('ui-move', 40), true);
});

test('SfxLimiter: concurrency cap drops the trigger over the cap while enough are still sounding, accepts once one ends', () => {
  // Custom durMs so the cap is actually reachable at an 80 ms cadence (independent of the real
  // measured durations, which never overlap 6-deep at their own rate limits).
  const limits = limitsWith({ explosion: { minGapMs: 80, maxVoices: 6, durMs: 500, oncePerLevel: false } });
  const limiter = new SfxLimiter(limits);
  const starts = [0, 80, 160, 240, 320, 400];
  for (const t of starts) assert.equal(limiter.tryStart('explosion', t), true, `start ${t} should be accepted`);
  // 7th, 80 ms after the 6th: all 6 previous (ends at start+500) are still sounding -> dropped.
  assert.equal(limiter.tryStart('explosion', 480), false);
  // The first of the 6 ends at 500; by 550 only 5 are still active -> accepted.
  assert.equal(limiter.tryStart('explosion', 550), true);
});

test('SfxLimiter: a concurrency-dropped trigger is not recorded (no phantom voice, no gap-clock update)', () => {
  const limits = limitsWith({ explosion: { minGapMs: 10, maxVoices: 1, durMs: 1000, oncePerLevel: false } });
  const limiter = new SfxLimiter(limits);
  assert.equal(limiter.tryStart('explosion', 0), true);
  assert.equal(limiter.tryStart('explosion', 20), false); // still 1 active (cap 1) -> dropped
  assert.equal(limiter.tryStart('explosion', 30), false); // dropped again; still measured vs t=0
  assert.equal(limiter.tryStart('explosion', 1000), true); // first one has ended by now
});

test('SfxLimiter: once-per-level id plays once, then again only after beginLevel()', () => {
  const limiter = new SfxLimiter();
  assert.equal(limiter.tryStart('lets-go', 0), true);
  assert.equal(limiter.tryStart('lets-go', 1_000_000), false, 'already played this level, however long after');
  limiter.beginLevel();
  assert.equal(limiter.tryStart('lets-go', 2_000_000), true, 'a new level resets the once-per-level gate');
});

test('SfxLimiter: once-per-level ids are gated independently of each other', () => {
  const limiter = new SfxLimiter();
  assert.equal(limiter.tryStart('nuke', 0), true);
  assert.equal(limiter.tryStart('nuke', 100), false);
  // A different once-per-level id is unaffected.
  assert.equal(limiter.tryStart('level-won', 100), true);
  assert.equal(limiter.tryStart('entrance-open', 100), true);
  assert.equal(limiter.tryStart('level-lost', 100), true);
});

test('SfxLimiter: beginLevel() does not clear rate-limit / concurrency state, only the once-per-level gate', () => {
  const limits = limitsWith({ explosion: { minGapMs: 1000, maxVoices: 1, durMs: 1000, oncePerLevel: false } });
  const limiter = new SfxLimiter(limits);
  assert.equal(limiter.tryStart('explosion', 0), true);
  limiter.beginLevel();
  assert.equal(limiter.tryStart('explosion', 100), false, 'rate limit / concurrency survive beginLevel()');
});

test('SfxLimiter: reset() clears rate limits, concurrency and the once-per-level gate', () => {
  const limits = limitsWith({ explosion: { minGapMs: 1000, maxVoices: 1, durMs: 1000, oncePerLevel: false } });
  const limiter = new SfxLimiter(limits);
  assert.equal(limiter.tryStart('lets-go', 0), true);
  assert.equal(limiter.tryStart('explosion', 0), true);
  limiter.reset();
  assert.equal(limiter.tryStart('lets-go', 1), true, 'once-per-level gate cleared');
  assert.equal(limiter.tryStart('explosion', 1), true, 'rate limit / concurrency cleared');
});

test('SfxLimiter: independent ids never interfere with each other', () => {
  const limiter = new SfxLimiter();
  assert.equal(limiter.tryStart('ui-move', 0), true);
  assert.equal(limiter.tryStart('steel', 0), true); // different id, same instant: unaffected
  assert.equal(limiter.tryStart('ui-move', 1), false); // still within ui-move's own 40 ms gap
});
