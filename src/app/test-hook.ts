/**
 * `window.__game` — a small, stable automation API so browser tests (chrome-devtools MCP
 * `evaluate_script`) can drive the game deterministically without pixel-hunting.
 * Everything returned is plain JSON. Loading a level through the hook pauses real time, so
 * the test owns the clock via `step()`.
 * Owner: E5c (E0 added audioState / announcerLog / focus / playSolution, CONTRACTS §9).
 */
import type { AudioState } from '../audio/audio-engine.ts';
import { Material } from '../core/terrain.ts';
import type { GameCommand, GameSnapshot, LevelOutcome, SkillId } from '../core/types.ts';
import { getLevel, LEVELS } from '../levels/registry.ts';
import { SolutionDriver } from '../levels/solution-driver.ts';
import { LEVEL_SOLUTIONS } from '../levels/solutions.ts';
import type { AnnouncerLogEntry } from '../ui/announcer.ts';
import type { Route, ScreenId } from '../ui/screens/screen.ts';
import type { ControllerState, LoggedEvent } from './game/controller.ts';
import type { Router } from './router.ts';
import type { ScreenHost } from './screens.ts';

/** Default tick budget for playSolution (> the longest level: 300 s × 17 ticks + overtime slack). */
const PLAY_SOLUTION_MAX_TICKS = 12_000;

/** Every `Route['screen']` value, for validating hook input against typos / wrong shapes. */
const KNOWN_SCREENS: ReadonlySet<ScreenId> = new Set<ScreenId>(['title', 'level-select', 'help', 'settings', 'briefing', 'game', 'results']);

/** The screens whose route carries a `levelId` that must name a real, registered level. */
const SCREENS_WITH_LEVEL_ID: ReadonlySet<ScreenId> = new Set<ScreenId>(['briefing', 'game', 'results']);

/**
 * The screens whose route contract carries a `back` target (their Back button navigates to it —
 * see `ui/screens/screen.ts`'s `Route` union). A11Y-3: `__game.navigate({screen:'settings'})`
 * with no `back` field used to reach the router as-is (this function never checked it), so
 * activating Back later called `ctx.navigate(undefined)` and crashed
 * (`Cannot read properties of undefined (reading 'screen')`). Every REAL navigation always
 * supplies an explicit `back`; only the raw test hook can omit one, so default it here to the
 * title screen — a safe, always-valid landing spot — instead of touching the settings/help
 * screens themselves.
 */
const SCREENS_WITH_BACK: ReadonlySet<ScreenId> = new Set<ScreenId>(['help', 'settings']);
const DEFAULT_BACK_ROUTE: Route = { screen: 'title' };

/**
 * Validates a route candidate BEFORE it reaches the router. Regression: `__game.navigate(...)`
 * used to hand anything straight to `Router.go()` — a plain string like `'level-select'` (instead
 * of `{screen: 'level-select'}`) made `createScreen()` switch on `undefined` and return
 * `undefined`, and `Router.go()` stored that as the active screen before throwing, wedging every
 * later navigation (including real UI clicks) until a reload. Pure — no DOM — so it is
 * unit-testable from `tests/app-*.test.ts`; `hasLevel` defaults to the real level registry but can
 * be swapped out in tests.
 */
export function validateRoute(candidate: unknown, hasLevel: (id: string) => boolean = (id) => getLevel(id) !== undefined): Route {
  if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) {
    throw new Error(`navigate: expected a route object like {screen: 'title'}, got ${describeCandidate(candidate)}`);
  }
  const screen = (candidate as { screen?: unknown }).screen;
  if (typeof screen !== 'string' || !KNOWN_SCREENS.has(screen as ScreenId)) {
    throw new Error(`navigate: unknown screen ${JSON.stringify(screen)} (expected one of ${[...KNOWN_SCREENS].join(', ')})`);
  }
  if (SCREENS_WITH_LEVEL_ID.has(screen as ScreenId)) {
    const levelId = (candidate as { levelId?: unknown }).levelId;
    if (typeof levelId !== 'string' || !hasLevel(levelId)) {
      throw new Error(`navigate: unknown levelId ${JSON.stringify(levelId)} for screen '${screen}'`);
    }
  }
  if (SCREENS_WITH_BACK.has(screen as ScreenId) && (candidate as { back?: unknown }).back === undefined) {
    return { ...(candidate as Record<string, unknown>), screen, back: DEFAULT_BACK_ROUTE } as Route;
  }
  return candidate as Route;
}

/** `'level-select'`, `42`, `null`, `undefined`, `an array`, `an object` — for the error message above. */
function describeCandidate(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';
  if (typeof value === 'object') return 'an object';
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

export interface GameTestHook {
  readonly version: 1;
  /** Current screen id, e.g. 'title', 'game'. */
  screen(): ScreenId | null;
  navigate(route: Route): void;
  levels(): { id: string; title: string; tier: number }[];
  /**
   * Open the game screen for `levelId` with real time paused and auto-advance to the results
   * screen OFF (the test owns the clock); returns the initial snapshot.
   */
  loadLevel(levelId: string, options?: { autoAdvance?: boolean }): GameSnapshot;
  /** Advance `ticks` simulation ticks (default 1) synchronously. */
  step(ticks?: number): GameSnapshot;
  snapshot(): GameSnapshot | null;
  /** UI-side state: selected skill/lemming, hover, cursor, paused, speed, camera x, filter, follow… */
  ui(): ControllerState | null;
  /** Apply a command now (like a player; works while paused). Its events appear in events(). */
  assignSkill(lemmingId: number, skill: SkillId): void;
  setReleaseRate(rate: number): void;
  /** Nuke without the arm/confirm step. */
  nuke(): void;
  /** Resume (true) or pause (false) real-time simulation. */
  setRealtime(running: boolean): void;
  /** Most recent core events with their tick (oldest first). */
  events(limit?: number): readonly LoggedEvent[];
  /** Terrain material name at a world pixel, or null outside the game screen. */
  terrainAt(x: number, y: number): keyof typeof Material | null;
  /** Web Audio state: 'locked' until the first gesture, then 'running' / 'suspended'. */
  audioState(): AudioState;
  /** The last 50 spoken announcements, oldest first. */
  announcerLog(): readonly AnnouncerLogEntry[];
  /** The focused element: `#id`, else a descriptive selector (`button.skill[data-skill="digger"]`, CONTRACTS §9); null for <body>. */
  focus(): string | null;
  /**
   * Load `levelId` and drive `LEVEL_SOLUTIONS[levelId]` through the controller's normal command +
   * step path until the level ends (or `maxTicks`).
   */
  playSolution(levelId: string, options?: { maxTicks?: number }): { outcome: LevelOutcome | null; snapshot: GameSnapshot };
}

declare global {
  interface Window {
    __game?: GameTestHook;
  }
}

export function installTestHook(router: Router, host: ScreenHost): void {
  const game = () => {
    if (!host.currentGame) throw new Error('No level loaded — call __game.loadLevel(id) first');
    return host.currentGame;
  };
  const send = (command: GameCommand): void => void game().command(command, 'hook');
  const materialNames = Object.fromEntries(Object.entries(Material).map(([k, v]) => [v, k])) as Record<number, keyof typeof Material>;

  const hook: GameTestHook = {
    version: 1,
    screen: () => router.route?.screen ?? null,
    navigate: (route) => router.go(validateRoute(route)),
    levels: () => LEVELS.map(({ id, title, tier }) => ({ id, title, tier })),
    loadLevel: (levelId, options = {}) => {
      router.go({ screen: 'game', levelId });
      const controller = game();
      controller.setPaused(true);
      controller.autoAdvance = options.autoAdvance ?? false;
      return controller.session.snapshot();
    },
    step: (ticks = 1) => game().stepTicks(ticks),
    snapshot: () => host.currentGame?.session.snapshot() ?? null,
    ui: () => host.currentGame?.state ?? null,
    assignSkill: (lemmingId, skill) => send({ type: 'assign-skill', lemmingId, skill }),
    setReleaseRate: (rate) => send({ type: 'set-release-rate', rate }),
    nuke: () => send({ type: 'nuke' }),
    setRealtime: (running) => game().setPaused(!running),
    events: (limit) => game().events(limit),
    terrainAt: (x, y) => {
      const session = host.currentGame?.session;
      return session ? (materialNames[session.terrain.get(x, y)] ?? null) : null;
    },
    audioState: () => host.services.audio.state,
    announcerLog: () => host.services.announcer.log(),
    focus: () => describeFocus(document.activeElement),
    playSolution: (levelId, options = {}) => {
      const script = LEVEL_SOLUTIONS[levelId];
      if (!script) throw new Error(`No solution script for level '${levelId}'`);
      hook.loadLevel(levelId);
      const controller = game();
      const driver = new SolutionDriver(script);
      const maxTicks = options.maxTicks ?? PLAY_SOLUTION_MAX_TICKS;
      for (let i = 0; i < maxTicks && controller.session.status === 'running'; i++) {
        const session = controller.session;
        for (const command of driver.commandsFor(session, (id, skill) => session.checkAssign(id, skill))) controller.command(command, 'hook');
        controller.stepTicks(1);
      }
      return { outcome: controller.session.outcome, snapshot: controller.session.snapshot() };
    },
  };
  window.__game = hook;
}

/** `#id`, else `tag.firstClass[attr="value"]` (CONTRACTS §9 example: `button.skill[data-skill="digger"]`). */
function describeFocus(el: Element | null): string | null {
  if (!el || el === document.body) return null;
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const firstClass = el.classList.item(0);
  const classPart = firstClass ? `.${firstClass}` : '';
  for (const attr of ['data-skill', 'aria-label', 'role']) {
    const value = el.getAttribute(attr);
    if (value) return `${tag}${classPart}[${attr}="${value}"]`;
  }
  return `${tag}${classPart}`;
}
