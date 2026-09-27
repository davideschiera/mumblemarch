# Development contracts (Step 1 — shared types, constants and cross-layer APIs)

Owner: **dev-lead**. Written before parallel work so workstreams never collide on shared files.
After Step 1 is VALIDATED, every file marked **FROZEN** below may only be changed by the
dev-lead (ask through your coordinator). Public signatures listed here are promises: the
owning workstream implements the body but must not change the signature without the lead.

Spec sources: `docs/design/DESIGN.md` (+ `DESIGN-APPENDIX.md`), `docs/design/LEVELS.md`,
`docs/research/RESEARCH.md` §2, `docs/architecture/ARCHITECTURE.md`.

---

## 0. Workstream file ownership (after Step 1)

| Workstream | Owns (may edit) | Must not edit |
|---|---|---|
| A core | `src/core/**` except FROZEN files; `docs/development/core-rules.md`, `tests/core-fixtures.ts`; `tests/core-*.test.ts`, `tests/session.test.ts`, `tests/terrain.test.ts`, `tests/rng.test.ts`, `tests/behaviours.todo.test.ts` (delete it when replaced) | anything else |
| B levels | `src/levels/**` except FROZEN files; `tests/levels-*.test.ts`, `tests/level-compiler.test.ts`; `docs/design/LEVELS.md` (keep in sync with geometry tweaks) | |
| C render | `src/render/**`, `src/art/**` (data fixes allowed; exported type shapes FROZEN); `tests/render-*.test.ts`, `tests/art-*.test.ts` | |
| D audio | `src/audio/**`; `tests/audio-*.test.ts` | |
| E ui/input/app | `src/ui/**`, `src/input/**` (ActionId list FROZEN), `src/persistence/**`, `src/styles/**`, `src/app/**`, `src/main.ts`, `index.html`; `tests/ui-*.test.ts`, `tests/input-*.test.ts`, `tests/app-*.test.ts`, `tests/storage.test.ts`, `tests/bindings.test.ts`, `tests/game-loop.test.ts` | |
| lead only | FROZEN files; `tests/helpers.ts`; `tests/contracts.test.ts`; `package.json`; `tsconfig*.json`; `scripts/**`; `docs/architecture/ARCHITECTURE.md`; `docs/PLAN.md` | |

**FROZEN:** `src/core/types.ts`, `src/core/constants.ts`, `src/core/behaviours/context.ts`,
`src/levels/format.ts`, `src/levels/themes.ts`, `src/levels/theme-data.ts`,
`src/input/actions.ts` (the `ACTION_IDS` list), `tests/helpers.ts`.

## 1. Rules for every agent

- `npm run check` must be green at every hand-off. Other workstreams edit in parallel: if
  typecheck/tests fail **only in files you don't own**, wait ~1 min and re-run; if it persists,
  report it to your coordinator — never "fix" files you don't own.
- Browser checks: never rely on the shared live-reload dev server (:5180) for validation while
  others are editing — it reloads on every save. Use an isolated snapshot instead:
  `node scripts/snapshot.mjs <port>` (ports 5190–5199; pick one, check it is free with
  `curl -s -o /dev/null -w '%{http_code}' http://localhost:<port>` → `000`). It builds the
  current code once (production mode, no live reload) and serves it. Stop it when done
  (`pkill -f "snapshot.mjs <port>"`). Open your OWN chrome-devtools page (`new_page`) and pass
  its pageId on every call; close only pages you opened.
- Log progress in `docs/PROGRESS.md` (append-only, `- 2026-09-26 HH:MM — [your-label] message`)
  and update your task row status in `docs/development/DEV_TASKS.md` (only your own rows).
- No user-facing text may contain "Lemm-" (identifiers may). All copy comes from
  `src/ui/strings.ts` (DESIGN-APPENDIX App. A).
- Deterministic core: no `Math.random`, `Date`, timers in `core/`, `levels/`, `art/`.

---

## 2. core (FROZEN types; A implements bodies)

### 2.1 `core/types.ts` additions
```ts
/** Why exactly a skill was refused (drives DESIGN §6.5 texts). */
export type RejectDetail =
  | 'already-climber' | 'already-floater' | 'fuse-lit' | 'airborne' | 'is-blocker'
  | 'same-job' | 'busy-dying'   // with reason 'not-applicable'
  | 'ahead' | 'below';          // with reason 'steel' (and 'one-way' uses 'ahead')
export interface Rejection { readonly reason: SkillRejectReason; readonly detail?: RejectDetail }
```
- `skill-rejected` event gains `readonly detail?: RejectDetail`.
- `LevelOutcome` gains `readonly overtimeTicks: number` (0 unless relaxed timer ran past 0:00).
- New `GameEvent`s: `{ type: 'overtime-started' }` (relaxed clock reached 0, once),
  `{ type: 'goal-reached'; saved: number }` (saved first reaches required, once),
  `{ type: 'goal-impossible' }` (saved + still-alive + not-yet-released < required, once).
- `GameView` and `GameSnapshot` gain `readonly overtimeTicks: number`.

### 2.2 `core/constants.ts` additions (phase hooks, DESIGN §3.4; phase = `stateTicks % cycle`)
`BUILDER_BRICK_PHASE = 9`, `BUILDER_WARN_PHASE = 10`, `BUILDER_STEP_PHASE = 0` (only when
stateTicks > 0), `BASH_CARVE_PHASES = {from: 2, to: 5}`, `BASH_MOVE_PHASES = {from: 11, to: 15}`,
`MINE_CARVE_PHASES = {from: 1, to: 2}`, `MINE_STEP_X_PHASES = [3, 15]` (+2 px each),
`MINE_STEP_Y_PHASES = [0, 3]` (+1 px each), `DIG_ROW_PHASE = 0`, `SNAP_RADIUS_CSS = 24`,
`GROUP_GAP = 8`, `DEFAULT_TRAP_COOLDOWN_SECONDS = 2`. Existing `SPLAT/DROWN/BURN/EXIT_TICKS` stay.

### 2.3 `core/behaviours/context.ts`
`SkillRule.rejectReason(lem, ctx): Rejection | null` (was `SkillRejectReason | null`).

### 2.4 `core/session.ts` public API (A owns the file; these signatures are promises)
- `checkAssign(lemmingId: number, skill: SkillId): Rejection | null` — pure (no events, no
  mutation). Order: level ended → `level-ended`; id missing/removed → `no-lemming`; count 0 →
  `none-left`; then the skill rule.
- `applyNow(command)`, `enqueue(command, tick)`, `step()`, `snapshot()`, `replay()`,
  `lemmingById(id)` — unchanged.
- `get overtimeTicks(): number`.
- Level end: all released (or nuking) and no active mumbles → `all-resolved`; also
  **auto-end** (`all-resolved`) when all released, not nuking, and every active mumble is a
  blocker with no lit fuse (LEVELS L11); time up and not relaxed → `time-up`.

### 2.5 `core/picking.ts` public API (A implements the DESIGN §6.2.3 / §6.3.2 rules)
```ts
export const SELECTION_FILTERS = ['all', 'walkers', 'facing-left', 'facing-right'] as const;
export type SelectionFilter = (typeof SELECTION_FILTERS)[number];
export function isSelectable(lem): boolean;
export function passesFilter(lem, filter: SelectionFilter, walkersOnly?: boolean): boolean;
export interface PickOptions {
  readonly filter?: SelectionFilter;   // chip value (default 'all')
  readonly walkersOnly?: boolean;      // Shift-click / right-held for this press
  readonly snapRadius?: number;        // world px; used only when no hit box contains p
  readonly accepts?: (lem: Readonly<Lemming>) => boolean; // would take the chosen skill
}
export function lemmingsAt(lemmings, p: Point, options?: Pick<PickOptions, 'filter' | 'walkersOnly'>): Readonly<Lemming>[];
export function pickLemmingAt(lemmings, p: Point, skill: SkillId | null, options?: PickOptions): Readonly<Lemming> | null;
export interface CycleOptions {
  readonly filter?: SelectionFilter;
  readonly fromX?: number;                         // continue from the last x of a vanished selection
  readonly view?: { readonly x0: number; readonly x1: number }; // camera window, for the "start in view" rule
  readonly group?: boolean;                        // Shift: jump to the next group (> GROUP_GAP px away or other state)
}
export function cycleLemming(lemmings, currentId: number | null, step: 1 | -1, options?: CycleOptions): Readonly<Lemming> | null;
```

## 3. levels (FROZEN format/themes; B implements compiler, data, solutions)

- `levels/themes.ts`: `THEME_IDS = ['mossgrove','sugarworks','observatory','foundry','reef']`,
  `ThemeId`, extended `Theme` (V4 roles: `surfaceHi, brickHi, oneWayEdge, accent,
  hazard:[surface,deep,foam], trap:[main,dark,accent], hatch:[main,dark], exit:[rim,glow], decor,
  hazardKind, hazardName, trapName, texture:{dripMax, strataBands[12], brick:[w,h], mossOnBricks},
  minimap:{terrain,steel,hazard,exit,mumble,view}`), `THEMES`, `getTheme(id)` (fallback
  mossgrove). Data is GENERATED into `levels/theme-data.ts` by `scripts/port-art.mjs` from
  `docs/design/mockups/sprites.js` → `themes`.
- `levels/format.ts`: `LevelDef.decor?: readonly TerrainPrimitive[]` (stretch: drawn, never
  simulated) and `HazardDef.art?: { x; y; flipX? }` (visual anchor; optional).
- `levels/solutions.ts` (B): `LEVEL_SOLUTIONS: Readonly<Record<string, SolutionScript>>` from the
  "Sim solution data" blocks of LEVELS.md.
- `levels/solution-driver.ts` (B): the preview-sim matching semantics
  (`docs/design/mockups/levels-preview.html` `matches()`: idx, minIdx, x, xmin, xmax, dir, ymin,
  ymax, state, after, afterSkill, target, count; script-level `releaseRate`).
  ```ts
  export interface SolutionStep { readonly skill: SkillId; readonly idx?: number; readonly minIdx?: number;
    readonly x?: number; readonly xmin?: number; readonly xmax?: number; readonly dir?: Direction;
    readonly ymin?: number; readonly ymax?: number; readonly state?: LemmingState; readonly after?: number;
    readonly afterSkill?: number; readonly target?: number; readonly count?: number }
  export interface SolutionScript { readonly releaseRate?: number; readonly assignments: readonly SolutionStep[] }
  export class SolutionDriver {
    constructor(script: SolutionScript);
    /** Call once per tick BEFORE session.step(): the commands to apply now (applyNow each, in order). */
    commandsFor(view: GameView, checkAssign: (lemmingId: number, skill: SkillId) => Rejection | null): GameCommand[];
  }
  ```
  Used by the per-level replay tests (headless) and by `__game.playSolution()` (browser).

## 4. art (new pure-data layer `src/art/`, C owns after Step 1)

GENERATED by `scripts/port-art.mjs` from `docs/design/mockups/sprites.js` (never hand-edit the
generated parts; fix the generator or the source). Imports: `core` types only.
- `art/anim.ts`: `PixelFrame = readonly string[]`; `Anim { frames; ticksPerFrame; footX; footY;
  loop; loopFrom? }`; `animFrameIndex(anim, ticks)` = the DESIGN §3.4 rule.
- `art/palette.ts`: `MUMBLE_PALETTE` (31 keys).
- `art/mumble.ts`: `MUMBLE_ANIMS: Readonly<Record<LemmingState, Anim>>` (all 18).
- `art/objects.ts`: `THEME_OBJECTS` per theme id: `palette`, `entrance`, `exit`, `trap`,
  `hazard` (frames + timing + anchors, same field names as sprites.js).
- `art/icons.ts`: `ICONS` (16×16: 8 skills + rrMinus, rrPlus, pause, fastForward, popAll),
  `ICON_ORDER`, `ICON_LABELS`.
- `art/overlays.ts`: `OVERLAYS` (font3x5, digits, digitsAnchor, pips, hover, selected,
  crosshair, steelSpark, refusal, pending, fuse, assignRing).
- `art/index.ts` re-exports. Layer rules: `art → core`; `render`, `ui`, `app` may import `art`.
  UI draws HUD icons, level thumbnails and the title march strip itself from `art` + `levels`.

## 5. render (C implements; E wires in app)

```ts
// render/renderer.ts
export interface RenderState {
  readonly game: GameView; readonly camera: Camera;
  readonly selectedLemmingId: number | null;      // thick bracket + ▼
  readonly hoveredLemmingId: number | null;       // thin bracket
  readonly hoverWouldRefuse: boolean;             // dashed bracket + ✕ (predicted refusal)
  readonly keyboardCursor: Point | null;          // in-canvas crosshair (keyboard mode only)
  readonly pendingLemmingIds: readonly number[];  // assigned while paused → pending badge
  readonly timeMs: number;                        // ambient animation clock
  readonly reducedMotion: boolean;
  readonly highContrast: boolean;                 // DESIGN §4.9 clear physics view
  readonly fallRuler: boolean;                    // DESIGN §7.11 (safe ≤ 63 px vs deadly)
  readonly paused: boolean;
}
export class Renderer implements EventSink {
  constructor(canvas: HTMLCanvasElement);
  setLevel(level: CompiledLevel, view: GameView): void;
  render(state: RenderState): void;
  handleEvents(events: readonly GameEvent[], tick: number): void;  // particles, ✕, sparks, rings
  get terrainCanvas(): HTMLCanvasElement | null;
}
// render/camera.ts
class Camera { x; y; viewW; viewH; setLevelSize(w, h); scrollBy(dx, dy?);
  centerOn(x: number, y?: number, options?: { animate?: boolean }): void; // 200 ms ease-out when animate
  update(elapsedMs: number): void;  get animating(): boolean;  get levelWidth(): number;
  toWorld(viewX, viewY): Point }
// render/minimap.ts
class Minimap { constructor(canvas: HTMLCanvasElement); setLevel(level: CompiledLevel): void;
  render(game: GameView, camera: Camera, hoverWorldX: number | null): void; toWorldX(offsetCssX: number): number }
// render/cursor.ts
export function crosshairCursorCss(sizeCssPx: 32 | 48 | 64): string;  // CSS `cursor` value (data-URL PNG + hotspot + fallback)
```

## 6. audio (D implements; E wires in app)

- `sfx.ts`: `SFX_IDS` gains the 17 NEW ids (`ui-back`, `ui-empty`, `ui-arm`, `pause`, `unpause`,
  `ff-on`, `ff-off`, `rr-up`, `rr-down`, `undo`, `fuse`, `builder-shrug`, `trap-flytrap`,
  `trap-press`, `trap-pendulum`, `trap-piston`, `trap-clam`); `VOICE_SFX` gains `builder-shrug`.
- `audio-engine.ts`:
  ```ts
  export type AudioState = 'locked' | 'running' | 'suspended';
  class AudioEngine { constructor(volumes: VolumeSettings); unlock(): void; get unlocked(): boolean;
    get state(): AudioState; setVolumes(v: VolumeSettings): void; play(id: SfxId, pitch?: number): void;
    beginLevel(): void;                       // resets "once per level" limits
    duckMusic(db: number, attackS: number, releaseS: number): void;
    setPauseDuck(on: boolean): void;          // −10 dB + 900 Hz low-pass on the music bus
    get musicOutput(): { ctx: AudioContext; out: AudioNode } | null }
  ```
- `music.ts`: `class MusicPlayer { constructor(engine); startTheme(themeId: string, variant: number,
  delaySeconds?: number): void; stop(fadeSeconds?: number): void; playTitleJingle(): void;
  setEnabled(enabled: boolean): void; get isPlaying(): boolean }`.
- `event-sounds.ts`:
  ```ts
  export interface SoundCue { readonly id: SfxId; readonly pitch: number }
  export interface SoundContext { readonly themeId: string }
  export function lemmingPitch(lemmingId: number): number;   // DESIGN §8.4
  export function soundFor(event: GameEvent, ctx: SoundContext): SoundCue | null;
  export class EventSounds implements EventSink {
    constructor(engine: AudioEngine, options: { themeId: () => string; onCue?: (cue: SoundCue) => void });
  }   // onCue fires for every cue even when muted (captions = the visual twin)
  ```

## 7. persistence (E owns; v2 shape fixed here)

`SAVE_VERSION = 2` with a v1 → v2 migration that keeps progress. `Settings` gains (DESIGN §7.11):
`captions: 'off'|'barks'|'all'` ('barks'), `cursorSize: 32|48|64` (32), `fallRuler` (false),
`edgeScroll` (true), `cameraFollow` (false), `assignOn: 'press'|'release'` ('press'),
`pauseOnBlur` (true), `pauseWhileChoosing` (false), `gameSpeed: 1|0.75|0.5` (1),
`showKeyHints` (true), `unlockAll` (false); `musicVolume` default **0.35**.
`LevelProgress` gains `inTime: boolean` and `attempts: number`. `SaveData` gains
`lastLevelId: string | null`.

## 8. input (E owns; ActionId list FROZEN)

New actions: `camera-center` (KeyC), `camera-follow` (KeyL), `filter-cycle` (KeyV), `briefing`
(KeyB), `undo` (KeyU), `camera-hatch` (Home), `camera-exit` (End). `frame-step` joins
`HOLDABLE_ACTIONS`. `bindings.ts` exports `RESERVED_CODES` (Tab, Escape, F5, F11, F12, Slash,
Quote, Backspace) and `FIXED_ACTIONS` (`menu` stays on Escape). The `InputHandler.onAction`
event argument already carries `shiftKey` (Shift rule).

## 9. Test hook additions (E implements in `app/test-hook.ts`)

`audioState(): AudioState`, `announcerLog(): {t, text, politeness}[]` (last 50),
`focus(): string | null` (active element id or a descriptive selector),
`playSolution(levelId: string, options?: { maxTicks?: number }): { outcome: LevelOutcome | null; snapshot: GameSnapshot }`
(loads the level, drives `LEVEL_SOLUTIONS[levelId]` through the controller's normal
command + step path until the level ends), plus the existing API.

## 10. Tooling

- `scripts/snapshot.mjs <port> [outdir]`: one-off production build + static serve (no live reload).
- `scripts/port-art.mjs`: regenerates `src/art/*` data and `src/levels/theme-data.ts`.
