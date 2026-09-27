/**
 * Screen contract. A screen is a function (context, route) → Screen that builds its DOM
 * subtree; the app's router mounts it, moves focus, updates document.title, announces it and
 * later calls `destroy()`. Screens never navigate by touching the DOM of other screens.
 */
import type { LevelOutcome } from '../../core/types.ts';
import type { KeyBindings } from '../../input/bindings.ts';
import type { LevelDef, TierId } from '../../levels/format.ts';
import type { SaveStore } from '../../persistence/storage.ts';
import type { AnnounceOptions } from '../announce-queue.ts';

/** UI feedback sounds screens may play (mapped to SfxIds by the app: ui-move/select/deny/back). */
export type UiSoundKind = 'move' | 'select' | 'deny' | 'back';

/** Every navigable place in the app, with its parameters. */
export type Route =
  | { readonly screen: 'title' }
  | { readonly screen: 'level-select'; readonly focusLevelId?: string }
  | { readonly screen: 'briefing'; readonly levelId: string }
  | { readonly screen: 'game'; readonly levelId: string }
  | { readonly screen: 'results'; readonly levelId: string; readonly outcome: LevelOutcome; readonly record?: ResultRecord }
  | { readonly screen: 'help'; readonly back: Route }
  | { readonly screen: 'settings'; readonly back: Route };

/**
 * Facts about the finished attempt that the results screen cannot recompute after progress was
 * saved (DESIGN §9.5): "New best!", the verdict variant (attempt mod 2), relaxed notes, and
 * "Beat the clock ✓". Computed by the game flow BEFORE `save.recordResult`. Owner: ui-lead.
 */
export interface ResultRecord {
  /** saved > the previous best (and the previous best existed or saved > 0). */
  readonly newBest: boolean;
  /** 0-based index of this finished attempt (previous `attempts`), for `verdictFor(…, attempt)`. */
  readonly attempt: number;
  /** The run used the relaxed timer (`session.relaxedTimer`). */
  readonly relaxed: boolean;
  /** Won within the clock on the standard timer (§7.9 `inTime`). */
  readonly inTime: boolean;
}

export type ScreenId = Route['screen'];

export interface Screen {
  /** Root element (a <section>) inserted into #screen-root. */
  readonly element: HTMLElement;
  /** Short name: used for document.title and announced on entry. */
  readonly title: string;
  /** Show the persistent canvas stage while this screen is active. */
  readonly usesStage?: boolean;
  /**
   * True when the screen already announces its own arrival on entry — e.g. the game screen's
   * §7.3 #1 "ready" message (which opens with the level title) plus the canvas's own
   * `aria-label` (read natively when focus lands on it, §7.2). The router's default fallback
   * (announce `title` whenever focus lands away from the `<h1>`, so screens that focus a plain
   * button like "Play" still get their context spoken) would otherwise double up with that.
   */
  readonly announcesEntry?: boolean;
  /** Element to focus on entry (default: the screen's <h1>). */
  focusTarget?(): HTMLElement | null;
  destroy(): void;
}

/**
 * What screens may use from the app (dependency inversion: ui never imports app).
 * Owner: ui-lead (E0 extended it). Progress helpers (unlock rule, best) live in persistence;
 * in-game style modals are opened by importing `ui/dialog.ts` / `ui/dialogs/*` directly.
 * Built as a plain object literal in app.ts (overlays spread it: keep members own properties).
 */
export interface ScreenContext {
  navigate(route: Route): void;
  readonly save: SaveStore;
  readonly levels: readonly LevelDef[];
  readonly tiers: readonly { readonly id: TierId; readonly name: string }[];
  readonly bindings: () => KeyBindings;
  /** Speak via the Announcer (DESIGN §7.3 options: key, politeness, level, userInitiated). */
  announce(message: string, options?: AnnounceOptions): void;
  /** Short UI feedback sound (no-op until audio is unlocked / when muted). */
  uiSound(kind: UiSoundKind): void;
  /** Reduced motion in effect (settings.motion + prefers-reduced-motion, DESIGN §7.4). */
  reducedMotion(): boolean;
}

/**
 * Options for screens that can also be shown INSIDE an in-game modal dialog (briefing B, help H,
 * settings from the pause menu — `ui/dialogs/overlay.ts`). In overlay mode: `ctx.navigate()` just
 * closes the dialog; show one "Close"/"Back to the game" button (initial focus) instead of the
 * screen's navigation buttons (no "Let's march!", no "Back to levels"); the heading is an `<h2>`
 * (the dialog's `aria-labelledby`). Owner: ui-lead.
 */
export interface ScreenBuildOptions {
  readonly overlay?: boolean;
}

/** Standard screen shell: <section> with an <h1> (the default focus target). */
export function screenSection(className: string, heading: string): { section: HTMLElement; h1: HTMLHeadingElement } {
  const section = document.createElement('section');
  section.className = `screen ${className}`;
  const h1 = document.createElement('h1');
  h1.className = 'screen__title';
  h1.tabIndex = -1;
  h1.textContent = heading;
  section.append(h1);
  return { section, h1 };
}
