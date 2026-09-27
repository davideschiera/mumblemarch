/**
 * The in-game HUD contract (DESIGN §5.3, §7.2, mockups/game-screen.html) — DOM-free types
 * only, so pure code and Node tests may import them.
 *
 *   controller ──HudState (every frame)──▶ GameHudView ──HudCallbacks──▶ controller
 *
 * The controller (app/game/view-state.ts) assembles a complete `HudState` every animation frame;
 * the view diffs it and touches the DOM only when something changed. The view never reads the
 * session and never decides game rules: it renders state and reports user intent.
 * Owner: ui-lead (E0 wrote it). E2 implements `GameHudView` in `ui/screens/game.ts` + `ui/hud/*`;
 * changes to these types go through ui-lead.
 */
import type { SelectionFilter } from '../../core/picking.ts';
import type { GameCounts, SkillCounts, SkillId } from '../../core/types.ts';
import type { KeyBindings } from '../../input/bindings.ts';

export type HoldPhase = 'down' | 'up';

/** §5.3 Pop all button: idle → armed ("Press again") → popping ("Popping…", aria-disabled). */
export type PopAllState = 'idle' | 'armed' | 'popping';

/** §5.3 value well: the number + the interval sub-label ("1.6 s"); §7.2 hidden description. */
export interface HudReleaseRate {
  readonly value: number;
  /** Level minimum: − is aria-disabled (padlock + "min") at this value. */
  readonly min: number;
  /** 99: + is aria-disabled at this value. */
  readonly max: number;
  /** Seconds between releases (the view formats "1.6 s" / "one every 1.6 seconds"). */
  readonly intervalSeconds: number;
}

/** §5.3 status item 4 + §7.9 relaxed overtime. */
export interface HudTime {
  readonly timeLeftTicks: number;
  /** > 0 once the relaxed clock passed 0:00 → `Time +0:12 · relaxed`. */
  readonly overtimeTicks: number;
  /** Relaxed timer on: `Time 4:12 · relaxed`. */
  readonly relaxed: boolean;
  /** Under 30 s (and not overtime): warning colour + ⚠ (1 Hz blink unless reduced motion). */
  readonly low: boolean;
}

/** §7.2 minimap slider values. */
export interface HudMinimap {
  readonly valueMax: number;
  readonly valueNow: number;
  /** "Showing {x0} to {x1} of {w}. {n} mumbles in view." */
  readonly valueText: string;
  /** Pointer is dragging it (cursor `grabbing`, §6.1.3). */
  readonly dragging: boolean;
}

/** A transient message in the status line's focus slot (§6.1.3, §6.4.4, §6.5). */
export interface HudStatus {
  readonly text: string;
  readonly kind: 'info' | 'refusal' | 'warning';
}

/** Everything the HUD shows, recomputed every frame (the view diffs). */
export interface HudState {
  /** Counts per skill in bar order (SKILL_IDS). A skill with 0 is aria-disabled (hatched, §5.3). */
  readonly skills: SkillCounts;
  /** aria-pressed skill (stays selected when it runs out — hatched + selected, §6.1.1). */
  readonly selectedSkill: SkillId | null;
  readonly releaseRate: HudReleaseRate;
  readonly paused: boolean;
  readonly fastForward: boolean;
  readonly popAll: PopAllState;
  /** R armed (§6.4.6): the view shows the restart bubble text given via `bubble()`. */
  readonly restartArmed: boolean;
  /** Filter chip value (`Pick: All` …, §6.3.4). */
  readonly filter: SelectionFilter;
  /** Follow chip aria-pressed (§6.1.1 L). */
  readonly follow: boolean;
  /** Composed focus-label text for the fixed 16ch slot (§6.3.1), e.g. "Walker ×3 — can't dig: steel below". */
  readonly focusLabel: string;
  /** Transient status message (shown instead of / beside the focus label), or null. */
  readonly status: HudStatus | null;
  readonly counts: GameCounts;
  /** saved ≥ required: success colour + ✓ + "goal met". */
  readonly goalMet: boolean;
  readonly time: HudTime;
  /** Speaker-off glyph + "Muted" in the status line (§8.1). */
  readonly muted: boolean;
  /** §6.4.1 `Ready: 2 jobs start when you resume` (0 = hidden). */
  readonly readyJobs: number;
  /** §6.4.2 `Tick 312 (+1)` for 1.5 s, or null. */
  readonly tickNote: string | null;
  readonly minimap: HudMinimap;
  /** Settings → key hints on the buttons (§7.11). */
  readonly showKeyHints: boolean;
  /** Live bindings: key-hint labels and `aria-keyshortcuts` (same object until the player rebinds). */
  readonly bindings: KeyBindings;
  /** The level has ended (results pending): the view may disable the toolbar. */
  readonly ended: boolean;
  /** Reduced motion is in effect (no shakes, pulses, fades; §7.4). */
  readonly reducedMotion: boolean;
  /**
   * DESIGN §7.7: cursor and selected-mumble on-screen positions, in the 400×160 canvas VIEW
   * space (world px minus the camera window — the same space `render/renderer.ts` draws sprites
   * in), so the caption strip can tell whether either one is currently over its own box and, if
   * so, move to the top-left. `null` = nothing there (cursor off-canvas / no selection).
   * Optional: a HudState built without this field just never triggers that move.
   */
  readonly captionAvoidPoints?: {
    readonly cursor: { readonly x: number; readonly y: number } | null;
    readonly selected: { readonly x: number; readonly y: number } | null;
  };
}

export type MinimapPointerPhase = 'down' | 'move' | 'up' | 'leave';
/** Keys the minimap slider owns (§7.2; `data-arrow-keys`). */
export type MinimapKey = 'ArrowLeft' | 'ArrowRight' | 'PageUp' | 'PageDown' | 'Home' | 'End';

/**
 * HUD → controller. Every callback is also reachable by a key (§6). Buttons fire on `click`
 * (pointer-up) except the release-rate buttons, which report press/release so the controller can
 * hold-repeat (400 ms / 60 ms, §6.1.3); a keyboard activation reports 'down' then 'up'.
 */
export interface HudCallbacks {
  onSelectSkill(skill: SkillId): void;
  onReleaseRate(delta: -1 | 1, phase: HoldPhase, shift: boolean): void;
  onPause(): void;
  onFastForward(): void;
  onPopAll(): void;
  /** ☰ button: open the pause menu (§5.1). */
  onMenu(): void;
  onFilterCycle(): void;
  onFollowToggle(): void;
  /** Minimap press/drag/hover; `offsetCssX` = CSS px from the minimap canvas' left edge (§6.1.3). */
  onMinimapPointer(phase: MinimapPointerPhase, offsetCssX: number): void;
  /** Minimap slider keys (§7.2); 'up' ends a hold-repeat. */
  onMinimapKey(key: MinimapKey, phase: HoldPhase, shift: boolean): void;
}

export type ToastKind = 'refusal' | 'info';
export type ArmBubbleKind = 'pop-all' | 'restart';
/** §5.3 armed bubble ("Press Pop all again (or N) to pop every mumble · Esc cancels"). */
export interface ArmBubble {
  readonly kind: ArmBubbleKind;
  readonly text: string;
}
/** §6.2.2 edge arrow when the selected mumble is out of view with Follow off ("▸ Walker"). */
export interface EdgeArrow {
  readonly side: 'left' | 'right';
  readonly label: string;
}

/**
 * The game HUD view (DOM-free interface; the DOM parts — root element, minimap canvas — are
 * exposed by the factory in `ui/screens/game.ts`). Overlay plates (pause pill, ×3 pill, toast,
 * caption strip, edge arrow) are mounted into the stage overlay container over the canvas.
 */
export interface GameHudView {
  /** Render the frame's state; only changed values touch the DOM (§5.3). */
  update(state: HudState): void;
  /** §5.3 toast top-centre: ✕ + danger border (refusal) or ℹ + info border; 2.5 s; newest replaces. */
  showToast(text: string, kind: ToastKind): void;
  /** §5.3 skill-button refusal flash (shake, or ✕ blinks in reduced motion). */
  flashRefusal(skill: SkillId): void;
  /** §7.7 caption strip: add a line (max 2, 2.5 s each, same text within 1 s → "×N"). */
  caption(text: string): void;
  /** §5.3/§6.4.5–6 armed bubble; null hides it. Cheap to call repeatedly. */
  bubble(bubble: ArmBubble | null): void;
  /** §6.2.2 edge arrow; null hides it. Called every frame; no-op when unchanged. */
  edgeArrow(arrow: EdgeArrow | null): void;
  /** Remove overlay plates and timers (the root element is removed by the router). */
  destroy(): void;
}
