/**
 * Independent validation of `docs/development/CONTRACTS.md` §2–§10 (Step 1: shared types,
 * constants and cross-layer APIs). Written by contracts-validator, NOT by the workstream that
 * implements the bodies — these assertions check the FROZEN shapes and the small amount of
 * already-implemented logic (checkAssign ordering, already-* skill rejections, art/theme data
 * generation, persistence defaults/migration, input bindings) without depending on stub
 * behaviour (spawning, physics, rendering) that workstream A/B/C/D/E will still fill in.
 *
 * NOTE: `src/audio/**` and `src/render/{renderer,sprites,terrain-layer,minimap}.ts` are
 * intentionally NOT imported here — see the "tests/tsconfig.json has no DOM lib" defect in the
 * validator's report. Importing any of them makes `tsc -p tests/tsconfig.json` fail (Cannot
 * find name 'AudioContext' / 'HTMLCanvasElement' / ...), so doing so would turn `npm run check`
 * red for everyone. `src/render/camera.ts` and `cursor.ts` have no DOM references and are
 * exercised below.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import {
  DEFAULT_TRAP_COOLDOWN_SECONDS,
  BASH_CARVE_PHASES,
  BASH_MOVE_PHASES,
  BUILDER_BRICK_PHASE,
  BUILDER_STEP_PHASE,
  BUILDER_WARN_PHASE,
  BURN_TICKS,
  DIG_ROW_PHASE,
  DROWN_TICKS,
  EXIT_TICKS,
  GROUP_GAP,
  MINE_CARVE_PHASES,
  MINE_STEP_X_PHASES,
  MINE_STEP_Y_PHASES,
  SNAP_RADIUS_CSS,
  SPLAT_TICKS,
} from '../src/core/constants.ts';
import { GameSession } from '../src/core/session.ts';
import {
  cycleLemming,
  isSelectable,
  lemmingsAt,
  passesFilter,
  pickLemmingAt,
  SELECTION_FILTERS,
  type CycleOptions,
  type PickOptions,
  type SelectionFilter,
} from '../src/core/picking.ts';
import type {
  GameEvent,
  GameSnapshot,
  GameView,
  Lemming,
  LevelOutcome,
  Rejection,
  RejectDetail,
  SkillId,
} from '../src/core/types.ts';

import { compileLevel } from '../src/levels/compiler.ts';
import type { HazardDef, LevelDef, TerrainPrimitive } from '../src/levels/format.ts';
import { SolutionDriver, type SolutionScript, type SolutionStep } from '../src/levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../src/levels/solutions.ts';
import { getTheme, THEME_IDS, THEMES, type Theme, type ThemeId } from '../src/levels/themes.ts';

import { animFrameIndex, type Anim } from '../src/art/anim.ts';
import { ICON_LABELS, ICON_ORDER, ICONS } from '../src/art/icons.ts';
import { MUMBLE_ANIMS } from '../src/art/mumble.ts';
import { MUMBLE_PALETTE } from '../src/art/palette.ts';
import { OVERLAYS } from '../src/art/overlays.ts';
import { THEME_OBJECTS } from '../src/art/objects.ts';

import { Camera, integerScale, VIEW_HEIGHT, VIEW_WIDTH } from '../src/render/camera.ts';
import { crosshairCursorCss } from '../src/render/cursor.ts';

import {
  DEFAULT_SAVE,
  DEFAULT_SETTINGS,
  SAVE_VERSION,
  type LevelProgress,
  type Settings,
} from '../src/persistence/schema.ts';
import { loadSave, SaveStore, type KeyValueStore } from '../src/persistence/storage.ts';

import { ACTION_IDS, HOLDABLE_ACTIONS, type ActionId } from '../src/input/actions.ts';
import { DEFAULT_BINDINGS, FIXED_ACTIONS, RESERVED_CODES } from '../src/input/bindings.ts';

import { compiled, FLOOR_Y } from './helpers.ts';

// ─── Test-only helper: expose GameSession's protected spawn() ──────────────────────────────
// checkAssign's 'none-left' / detail branches only fire for a lemming that EXISTS in the
// session. `releaseLemmings()` (the timed-spawn path) is a TODO(dev) stub owned by workstream A,
// so we must not depend on it. `spawn` is `protected` (the session.ts header note says so
// explicitly, "so the stubs compile while unused"), so a trivial subclass exposes it for tests
// without touching stub physics/timing at all.
class TestSession extends GameSession {
  spawnAt(x: number, y: number): Lemming {
    return this.spawn(x, y);
  }
}

// ═══ §2.1 core/types.ts — RejectDetail, Rejection, skill-rejected.detail, new GameEvents ═════

test('§2.1 RejectDetail/Rejection/GameEvent shapes accept the contract literals', () => {
  const details: readonly RejectDetail[] = [
    'already-climber',
    'already-floater',
    'fuse-lit',
    'airborne',
    'is-blocker',
    'same-job',
    'busy-dying',
    'ahead',
    'below',
  ];
  assert.equal(details.length, 9);

  const withDetail: Rejection = { reason: 'not-applicable', detail: 'already-climber' };
  const withoutDetail: Rejection = { reason: 'none-left' };
  assert.equal(withDetail.detail, 'already-climber');
  assert.equal(withoutDetail.detail, undefined);

  const rejectedWithDetail: GameEvent = {
    type: 'skill-rejected',
    lemmingId: 1,
    skill: 'climber',
    reason: 'not-applicable',
    detail: 'already-climber',
  };
  const rejectedWithoutDetail: GameEvent = {
    type: 'skill-rejected',
    lemmingId: null,
    skill: 'digger',
    reason: 'no-lemming',
  };
  assert.equal(rejectedWithDetail.type, 'skill-rejected');
  assert.equal(rejectedWithoutDetail.type, 'skill-rejected');

  // New GameEvents (§2.1): overtime-started (once), goal-reached (saved), goal-impossible (once).
  const newEvents: readonly GameEvent[] = [
    { type: 'overtime-started' },
    { type: 'goal-reached', saved: 3 },
    { type: 'goal-impossible' },
  ];
  assert.deepEqual(
    newEvents.map((e) => e.type),
    ['overtime-started', 'goal-reached', 'goal-impossible'],
  );
});

test('§2.1 LevelOutcome/GameView/GameSnapshot carry overtimeTicks', () => {
  const outcome: LevelOutcome = {
    won: true,
    saved: 3,
    required: 3,
    total: 5,
    reason: 'all-resolved',
    ticks: 1234,
    overtimeTicks: 0,
  };
  assert.equal(outcome.overtimeTicks, 0);

  const session = new GameSession(compiled());
  const view: GameView = session; // type-checks GameSession's GameView surface
  assert.equal(view.overtimeTicks, 0);
  const snapshot: GameSnapshot = session.snapshot();
  assert.equal(snapshot.overtimeTicks, 0);
});

// ═══ §2.2 core/constants.ts — phase hooks ════════════════════════════════════════════════════

test('§2.2 phase-hook constants match DESIGN §3.4 exactly', () => {
  assert.equal(BUILDER_BRICK_PHASE, 9);
  assert.equal(BUILDER_WARN_PHASE, 10);
  assert.equal(BUILDER_STEP_PHASE, 0);
  assert.deepEqual(BASH_CARVE_PHASES, { from: 2, to: 5 });
  assert.deepEqual(BASH_MOVE_PHASES, { from: 11, to: 15 });
  assert.deepEqual(MINE_CARVE_PHASES, { from: 1, to: 2 });
  assert.deepEqual(MINE_STEP_X_PHASES, [3, 15]);
  assert.deepEqual(MINE_STEP_Y_PHASES, [0, 3]);
  assert.equal(DIG_ROW_PHASE, 0);
  assert.equal(SNAP_RADIUS_CSS, 24);
  assert.equal(GROUP_GAP, 8);
  assert.equal(DEFAULT_TRAP_COOLDOWN_SECONDS, 2);
  // "Existing SPLAT/DROWN/BURN/EXIT_TICKS stay."
  assert.equal(SPLAT_TICKS, 16);
  assert.equal(DROWN_TICKS, 16);
  assert.equal(BURN_TICKS, 14);
  assert.equal(EXIT_TICKS, 8);
});

// ═══ §2.4 core/session.ts — checkAssign order & Rejection.detail propagation ═════════════════

test('§2.4 checkAssign: unknown id → no-lemming (even though the skill also has 0 left)', () => {
  const session = new GameSession(compiled({ skills: {} }));
  assert.deepEqual(session.checkAssign(999, 'climber'), { reason: 'no-lemming' });
});

test('§2.4 checkAssign: known lemming, 0 left → none-left (checked AFTER existence)', () => {
  const session = new TestSession(compiled({ skills: { climber: 0 } }));
  const lem = session.spawnAt(40, 20);
  assert.deepEqual(session.checkAssign(lem.id, 'climber'), { reason: 'none-left' });
});

test('§2.4/§6.5 checkAssign carries RejectDetail (already-climber), and applyNow emits it without consuming the skill', () => {
  const session = new TestSession(compiled({ skills: { climber: 1 } }));
  const lem = session.spawnAt(40, 20);
  lem.isClimber = true; // already has the skill
  assert.deepEqual(session.checkAssign(lem.id, 'climber'), { reason: 'not-applicable', detail: 'already-climber' });

  const events = session.applyNow({ type: 'assign-skill', lemmingId: lem.id, skill: 'climber' });
  assert.deepEqual(events, [
    { type: 'skill-rejected', lemmingId: lem.id, skill: 'climber', reason: 'not-applicable', detail: 'already-climber' },
  ]);
  assert.equal(session.skills.climber, 1); // never consumed
});

test('§2.4 checkAssign: level-ended takes priority over everything else', () => {
  const session = new TestSession(compiled({ skills: { digger: 1 } }));
  const lem = session.spawnAt(40, 20);
  // No public way to end a level yet (checkEnd() is a stub); reach into the protected `end`
  // the same way TestSession reaches `spawn`, so this test stays independent of that stub.
  (session as unknown as { end: (reason: LevelOutcome['reason']) => void }).end('all-resolved');
  assert.deepEqual(session.checkAssign(lem.id, 'digger'), { reason: 'level-ended' });
});

// ═══ §2.5 core/picking.ts ════════════════════════════════════════════════════════════════════

test('§2.5 SELECTION_FILTERS is exactly the 4 chip values, and passesFilter/isSelectable honour them', () => {
  assert.deepEqual(SELECTION_FILTERS, ['all', 'walkers', 'facing-left', 'facing-right']);
  const walker: Lemming = {
    id: 1,
    x: 10,
    y: 20,
    dir: 1,
    state: 'walking',
    stateTicks: 0,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 0,
    removed: false,
  };
  const exiting: Lemming = { ...walker, id: 2, state: 'exiting' };
  assert.equal(isSelectable(walker), true);
  assert.equal(isSelectable(exiting), false); // UNASSIGNABLE_STATES

  const filters: readonly SelectionFilter[] = SELECTION_FILTERS;
  assert.equal(passesFilter(walker, 'all'), true);
  assert.equal(passesFilter(walker, 'walkers'), true);
  assert.equal(passesFilter({ ...walker, state: 'falling' }, 'walkers'), false);
  assert.equal(passesFilter(walker, 'facing-right'), true);
  assert.equal(passesFilter({ ...walker, dir: -1 }, 'facing-left'), true);
  assert.equal(filters.length, 4);

  const options: PickOptions = { filter: 'walkers', walkersOnly: true, snapRadius: 24, accepts: () => true };
  assert.equal(options.filter, 'walkers');
  // DESIGN §6.3.1: the status count (and lemmingsAt) covers only selectable, filter-passing
  // mumbles, so the exiting one is excluded; pickLemmingAt picks the walker.
  const hits = lemmingsAt([walker, exiting], { x: 10, y: 20 }, { filter: 'all' });
  assert.equal(hits.length, 1);
  assert.equal(pickLemmingAt([walker, exiting], { x: 10, y: 20 }, 'climber')?.id, 1);
});

test('§2.5 cycleLemming: left→right order, wraps, skips non-selectable', () => {
  const base: Lemming = {
    id: 0,
    x: 0,
    y: 0,
    dir: 1,
    state: 'walking',
    stateTicks: 0,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 0,
    removed: false,
  };
  const a = { ...base, id: 1, x: 30 };
  const b = { ...base, id: 2, x: 10 };
  const c = { ...base, id: 3, x: 20, state: 'exiting' as const }; // not selectable
  const options: CycleOptions = { filter: 'all' };
  assert.equal(cycleLemming([a, b, c], null, 1, options)?.id, 2); // leftmost first
  assert.equal(cycleLemming([a, b, c], 2, 1)?.id, 1); // b → a (c is skipped, not selectable)
  assert.equal(cycleLemming([a, b, c], 1, 1)?.id, 2); // wraps a → b
  assert.equal(cycleLemming([], null, 1), null);
});

// ═══ §3 levels/themes.ts + theme-data.ts (GENERATED from sprites.js) ════════════════════════

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spritesSource = readFileSync(path.join(root, 'docs/design/mockups/sprites.js'), 'utf8');
const sandbox: { window: Record<string, unknown> } = { window: {} };
vm.createContext(sandbox);
vm.runInContext(spritesSource, sandbox, { filename: 'sprites.js' });
const ART = sandbox.window['MUMBLE_ART'] as Record<string, unknown>;
const SPRITE_THEMES = ART['themes'] as Record<string, { palette: readonly string[] }>;
/** Normalises vm-realm objects to plain same-realm ones before deepEqual (see art-port.test.ts). */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test('§3 THEME_IDS is exactly the 5 shipped themes; getTheme falls back to mossgrove', () => {
  assert.deepEqual(THEME_IDS, ['mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef']);
  const ids: readonly ThemeId[] = THEME_IDS;
  assert.equal(ids.length, 5);
  assert.equal(getTheme('mossgrove').id, 'mossgrove');
  assert.equal(getTheme('not-a-real-theme').id, 'mossgrove');
});

test('§3 every theme palette matches docs/design/mockups/sprites.js exactly', () => {
  for (const id of THEME_IDS) {
    const generated = THEMES[id].palette;
    const source = SPRITE_THEMES[id];
    assert.ok(source, `sprites.js is missing theme '${id}'`);
    assert.deepEqual(plain(generated), plain(source.palette), `theme '${id}' palette diverged from sprites.js`);
  }
});

test('§3 Theme carries every V4 role field (surfaceHi, texture.strataBands[12], minimap, ...)', () => {
  const t: Theme = THEMES.mossgrove;
  assert.equal(typeof t.surfaceHi, 'number');
  assert.equal(typeof t.brickHi, 'number');
  assert.equal(typeof t.oneWayEdge, 'number');
  assert.equal(typeof t.accent, 'number');
  assert.equal(t.hazard.length, 3);
  assert.equal(t.trap.length, 3);
  assert.equal(t.hatch.length, 2);
  assert.equal(t.exit.length, 2);
  assert.equal(typeof t.decor, 'number');
  assert.ok(['water', 'fire', 'trap'].includes(t.hazardKind));
  assert.equal(typeof t.hazardName, 'string');
  assert.equal(typeof t.trapName, 'string');
  assert.equal(typeof t.texture.dripMax, 'number');
  assert.equal(t.texture.strataBands.length, 12);
  assert.equal(t.texture.brick.length, 2);
  assert.equal(typeof t.texture.mossOnBricks, 'boolean');
  assert.equal(typeof t.minimap.terrain, 'string');
  assert.equal(typeof t.minimap.steel, 'string');
  assert.equal(typeof t.minimap.hazard, 'string');
  assert.equal(typeof t.minimap.exit, 'string');
  assert.equal(typeof t.minimap.mumble, 'string');
  assert.equal(typeof t.minimap.view, 'string');
});

// ═══ §3 levels/format.ts — LevelDef.decor?, HazardDef.art? ═══════════════════════════════════

test('§3 LevelDef.decor and HazardDef.art are accepted, decor is not simulated (no collision)', () => {
  const decor: readonly TerrainPrimitive[] = [{ kind: 'rect', x: 5, y: 5, w: 4, h: 4 }];
  const hazardWithArt: HazardDef = { kind: 'trap', x: 100, y: FLOOR_Y - 10, w: 8, h: 10, art: { x: 100, y: FLOOR_Y - 10, flipX: true } };
  const def: LevelDef = {
    id: 'decor-test',
    title: 'Decor test',
    tier: 1,
    theme: 'mossgrove',
    width: 400,
    height: 160,
    lemmings: 1,
    saveRequired: 1,
    releaseRate: 50,
    timeLimitSeconds: 60,
    skills: {},
    entrances: [{ x: 40, y: 20 }],
    exits: [{ x: 360, y: FLOOR_Y }],
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 400, h: 10 }],
    decor,
    hazards: [hazardWithArt],
  };
  const level = compileLevel(def);
  // decor is drawn, never simulated: it must not appear in the compiled/simulated terrain.
  assert.equal(level.terrain.isSolid(6, 6), false);
  assert.equal(level.hazards.length, 1);
});

// ═══ §3 levels/solutions.ts + solution-driver.ts ═════════════════════════════════════════════

test('§3 SolutionScript/SolutionStep shape; SolutionDriver applies releaseRate once, before the first assignment', () => {
  const step: SolutionStep = { skill: 'climber', idx: 0, minIdx: 0, x: 10, xmin: 0, xmax: 20, dir: 1, ymin: 0, ymax: 160, state: 'walking', after: 5, afterSkill: 1, target: 2, count: 1 };
  const script: SolutionScript = { releaseRate: 60, assignments: [step] };
  assert.equal(script.assignments.length, 1);
  assert.equal(typeof LEVEL_SOLUTIONS, 'object');

  const driver = new SolutionDriver(script);
  const session = new GameSession(compiled());
  const view: GameView = session;
  const checkAssign = (id: number, skill: SkillId) => session.checkAssign(id, skill);
  const first = driver.commandsFor(view, checkAssign);
  assert.ok(
    first.some((c) => c.type === 'set-release-rate' && c.rate === 60),
    'releaseRate is applied on the first call',
  );
  const second = driver.commandsFor(view, checkAssign);
  assert.ok(
    !second.some((c) => c.type === 'set-release-rate'),
    'releaseRate is applied only once (not on every call)',
  );
});

// ═══ §4 art/* (GENERATED by scripts/port-art.mjs from sprites.js) ═══════════════════════════

test('§4 art/anim.ts animFrameIndex follows the DESIGN §3.4 rule for loop / loopFrom / one-shot', () => {
  // Plain loop (walking: 8 frames, ticksPerFrame 1, loopFrom defaults to 0 → i % n).
  const walking = MUMBLE_ANIMS.walking;
  assert.equal(walking.loop, true);
  assert.equal(walking.loopFrom, undefined);
  assert.equal(walking.frames.length, 8);
  assert.equal(walking.ticksPerFrame, 1);
  for (let ticks = 0; ticks < 24; ticks++) assert.equal(animFrameIndex(walking, ticks), ticks % 8);

  // loopFrom anim (floating: 4 opening + 8 loop frames, loopFrom: 4).
  const floating: Anim = MUMBLE_ANIMS.floating;
  assert.equal(floating.loop, true);
  assert.equal(floating.loopFrom, 4);
  const n = floating.frames.length;
  for (let ticks = 0; ticks < n; ticks++) assert.equal(animFrameIndex(floating, ticks), ticks); // plays 0..n-1 once
  assert.equal(animFrameIndex(floating, n), 4); // then wraps the [4, n) tail
  assert.equal(animFrameIndex(floating, n + (n - 4)), 4);

  // One-shot (splatting) clamps to the last frame forever.
  const splatting = MUMBLE_ANIMS.splatting;
  assert.equal(splatting.loop, false);
  const last = splatting.frames.length - 1;
  assert.equal(animFrameIndex(splatting, splatting.ticksPerFrame * last), last);
  assert.equal(animFrameIndex(splatting, 1_000_000), last);
});

test('§4 MUMBLE_ANIMS has all 18 LEMMING_STATES with the exact DESIGN §3.4 table values', () => {
  // [frames, ticksPerFrame, footX, footY, w, h, loop, loopFrom]
  const table: Readonly<Record<string, readonly [number, number, number, number, number, number, boolean, number | undefined]>> = {
    walking: [8, 1, 4, 10, 8, 10, true, undefined],
    jumping: [2, 1, 4, 10, 8, 10, true, undefined],
    falling: [4, 2, 5, 10, 10, 10, true, undefined],
    climbing: [4, 2, 7, 12, 8, 12, true, undefined],
    hoisting: [4, 2, 7, 12, 11, 12, false, undefined],
    floating: [12, 1, 5, 16, 10, 16, true, 4],
    splatting: [8, 2, 5, 10, 10, 10, false, undefined],
    blocking: [4, 4, 4, 14, 12, 14, true, undefined],
    building: [8, 2, 4, 10, 10, 10, true, undefined],
    shrugging: [4, 2, 5, 10, 10, 10, false, undefined],
    bashing: [8, 2, 4, 10, 12, 10, true, undefined],
    mining: [8, 3, 4, 12, 12, 13, true, undefined],
    digging: [4, 2, 4, 10, 10, 12, true, undefined],
    ohno: [4, 4, 5, 10, 10, 10, false, undefined],
    exploding: [1, 1, 8, 12, 16, 16, false, undefined],
    drowning: [8, 2, 5, 10, 10, 10, false, undefined],
    burning: [7, 2, 4, 12, 8, 12, false, undefined],
    exiting: [4, 2, 5, 13, 10, 13, false, undefined],
  };
  const states = Object.keys(table);
  assert.equal(states.length, 18);
  for (const state of states) {
    const anim = MUMBLE_ANIMS[state as keyof typeof MUMBLE_ANIMS];
    const [frames, ticksPerFrame, footX, footY, w, h, loop, loopFrom] = table[state] ?? assert.fail(state);
    assert.equal(anim.frames.length, frames, `${state}.frames.length`);
    assert.equal(anim.ticksPerFrame, ticksPerFrame, `${state}.ticksPerFrame`);
    assert.equal(anim.footX, footX, `${state}.footX`);
    assert.equal(anim.footY, footY, `${state}.footY`);
    assert.equal(anim.loop, loop, `${state}.loop`);
    assert.equal(anim.loopFrom, loopFrom, `${state}.loopFrom`);
    const firstFrame = anim.frames[0] ?? assert.fail(`${state} has no frames`);
    assert.equal(firstFrame.length, h, `${state} frame height`);
    assert.equal(firstFrame[0]?.length, w, `${state} frame width`);
  }
});

test('§4 MUMBLE_PALETTE has the 31 keys of DESIGN §3.1', () => {
  const keys = Object.keys(MUMBLE_PALETTE);
  assert.equal(keys.length, 31);
  for (const key of ['o', 'b', 'B', 'h', 'c', 't', 'T', 'w', 'p']) assert.ok(keys.includes(key), key);
});

test('§4 ICONS/ICON_ORDER/ICON_LABELS cover the 8 skills + 5 HUD icons', () => {
  assert.equal(ICON_ORDER.length, 13);
  for (const skill of ['climber', 'floater', 'bomber', 'blocker', 'builder', 'basher', 'miner', 'digger']) {
    assert.ok(ICON_ORDER.includes(skill), skill);
    assert.ok(ICONS[skill], skill);
    assert.equal(typeof ICON_LABELS[skill], 'string');
  }
  for (const hud of ['rrMinus', 'rrPlus', 'pause', 'fastForward', 'popAll']) assert.ok(ICON_ORDER.includes(hud), hud);
});

test('§4 art/index-equivalent generated data is byte-faithful to sprites.js (objects, overlays)', () => {
  assert.deepEqual(plain(THEME_OBJECTS), plain(ART['objects']));
  assert.deepEqual(plain(OVERLAYS), plain(ART['overlays']));
});

// ═══ §5 render/camera.ts + cursor.ts (DOM-free parts of the render contract) ════════════════

test('§5 Camera: constructor, setLevelSize/scrollBy/centerOn/toWorld, integerScale', () => {
  assert.equal(VIEW_WIDTH, 400);
  assert.equal(VIEW_HEIGHT, 160);
  const camera = new Camera();
  camera.setLevelSize(1600, 160);
  camera.scrollBy(50);
  assert.equal(camera.x, 50);
  // CONTRACTS §5 / DESIGN §7.4: animate → 200 ms ease-out; instant when not animated.
  camera.centerOn(800, 80, { animate: true });
  assert.equal(camera.animating, true);
  camera.update(250);
  assert.equal(camera.animating, false);
  assert.equal(camera.x, 600);
  camera.centerOn(300);
  assert.equal(camera.animating, false);
  assert.equal(camera.x, 100);
  assert.equal(camera.levelWidth, 1600);
  const world = camera.toWorld(0, 0);
  assert.equal(world.x, camera.x);
  assert.equal(integerScale(1600, 640), 4);
});

test('§5 crosshairCursorCss accepts 32|48|64 and returns a CSS cursor value', () => {
  for (const size of [32, 48, 64] as const) assert.equal(typeof crosshairCursorCss(size), 'string');
});

// ═══ §6 audio — NOT testable here (see file header); recorded as a known gap ════════════════

test('§6 audio contract could not be exercised: tests/tsconfig.json has no DOM lib (see report)', () => {
  // src/audio/sfx.ts, audio-engine.ts, music.ts and event-sounds.ts all reference DOM/Web-Audio
  // globals (AudioContext, GainNode, OscillatorType, ...) that tests/tsconfig.json's
  // `"lib": ["ES2023"]` does not provide. Importing ANY of them here makes
  // `tsc -p tests/tsconfig.json` fail, which would turn `npm run check` red. Verified by manual
  // source read instead (see the validator's final report): SFX_IDS has the 17 new ids,
  // VOICE_SFX includes 'builder-shrug', and lemmingPitch/EventSounds match DESIGN §8.4/§6.
  assert.ok(true);
});

// ═══ §7 persistence/schema.ts + storage.ts ═══════════════════════════════════════════════════

test('§7 SAVE_VERSION is 2 and DEFAULT_SETTINGS matches DESIGN §7.11 exactly', () => {
  assert.equal(SAVE_VERSION, 2);
  const expected: Settings = {
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
  assert.deepEqual(DEFAULT_SETTINGS, expected);
  assert.equal(DEFAULT_SAVE.version, 2);
  const progress: Readonly<Record<string, LevelProgress>> = DEFAULT_SAVE.progress;
  assert.deepEqual(progress, {});
});

interface V1Save {
  readonly version: 1;
  readonly settings: Settings;
  readonly progress: Readonly<Record<string, LevelProgress>>;
}

test('§7 a v1 save migrates to v2, keeping progress and lastLevelId defaulting to null', () => {
  const v1: V1Save = {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, masterVolume: 0.42 },
    progress: { 'l1': { completed: true, bestSaved: 7, inTime: true, attempts: 3 } },
  };
  const store: KeyValueStore = {
    getItem: (k) => (k === 'mumblemarch.save' ? JSON.stringify(v1) : null),
    setItem: () => {},
  };
  const loaded = loadSave(store);
  assert.equal(loaded.version, SAVE_VERSION);
  assert.equal(loaded.settings.masterVolume, 0.42);
  assert.deepEqual(loaded.progress['l1'], { completed: true, bestSaved: 7, inTime: true, attempts: 3 });

  const saveStore = new SaveStore(store);
  assert.deepEqual(saveStore.current.progress, loaded.progress);
});

// ═══ §8 input/actions.ts + bindings.ts (ActionId list FROZEN) ═══════════════════════════════

test('§8 the 7 new actions exist with their default keys, and frame-step is holdable', () => {
  const newActions: ReadonlyArray<readonly [ActionId, readonly string[]]> = [
    ['camera-center', ['KeyC']],
    ['camera-follow', ['KeyL']],
    ['filter-cycle', ['KeyV']],
    ['briefing', ['KeyB']],
    ['undo', ['KeyU']],
    ['camera-hatch', ['Home']],
    ['camera-exit', ['End']],
  ];
  for (const [action, codes] of newActions) {
    assert.ok(ACTION_IDS.includes(action), action);
    assert.deepEqual(DEFAULT_BINDINGS[action], codes, action);
  }
  assert.ok(HOLDABLE_ACTIONS.has('frame-step'));
});

test('§8 default bindings have no duplicate codes, and RESERVED_CODES/FIXED_ACTIONS match the spec', () => {
  const seen = new Map<string, ActionId>();
  for (const action of ACTION_IDS) {
    for (const code of DEFAULT_BINDINGS[action]) {
      assert.ok(!seen.has(code), `'${code}' bound to both '${seen.get(code)}' and '${action}'`);
      seen.set(code, action);
    }
  }
  assert.deepEqual([...RESERVED_CODES].sort(), ['Backspace', 'Escape', 'F11', 'F12', 'F5', 'Quote', 'Slash', 'Tab'].sort());
  assert.deepEqual([...FIXED_ACTIONS], ['menu']);
  assert.deepEqual(DEFAULT_BINDINGS.menu, ['Escape']);
});
