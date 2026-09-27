/**
 * Game screen VIEW: the HUD around the persistent canvas stage (status line + chips, minimap
 * well, toolbar) plus the plates mounted in the stage overlay over the canvas (pause/×3 pills,
 * toast, armed bubble, edge arrow, caption strip). Implements `GameHudView` (ui/hud/types.ts):
 * presentational only — the controller pushes HudState every frame and gets user intent back
 * through HudCallbacks.
 *
 * Layout (DESIGN §5.1): the canvas itself lives in `#stage` (sized by app.ts's integer-scale
 * rule), a sibling of this screen's root in `#app`; this view has no direct handle to it. The
 * HUD row and toolbar match its width by observing `overlay`, which `layout.css` keeps sized
 * exactly to the canvas (`.stage__box`/`.stage__overlay`) regardless of scale.
 * Owner: e2b-hud-view.
 */
import type { SkillId } from '../../core/types.ts';
import type { KeyBindings } from '../../input/bindings.ts';
import type { LevelDef } from '../../levels/format.ts';
import { h } from '../dom.ts';
import { Captions } from '../hud/captions.ts';
import { Plates } from '../hud/plates.ts';
import { StatusBar } from '../hud/status-bar.ts';
import { Toolbar } from '../hud/toolbar.ts';
import type { ArmBubble, EdgeArrow, GameHudView, HudCallbacks, HudState, ToastKind } from '../hud/types.ts';
import { screenSection } from './screen.ts';

/** The DOM-side view the app mounts: GameHudView + its root element and minimap canvas. */
export interface GameScreenView extends GameHudView {
  readonly element: HTMLElement;
  /** The minimap canvas (the app's render/Minimap draws into it). */
  readonly minimapCanvas: HTMLCanvasElement;
}

export interface GameScreenOptions {
  readonly level: LevelDef;
  readonly bindings: KeyBindings;
  readonly callbacks: HudCallbacks;
  /** `#stage-overlay`: positioned over the canvas; plates are mounted here and removed on destroy. */
  readonly overlay: HTMLElement;
}

export function createGameScreenView(options: GameScreenOptions): GameScreenView {
  const { level, bindings, callbacks, overlay } = options;
  const { section, h1 } = screenSection('screen--game', level.title);
  // No top-of-page chrome during play (§5.1): the heading stays for the router/title, off-screen.
  h1.classList.add('visually-hidden');

  const statusBar = new StatusBar(callbacks);
  const toolbar = new Toolbar({ bindings, callbacks });
  const toolbarWrap = h('div', { class: 'game-toolbar stage-width' }, toolbar.element);
  section.append(statusBar.element, toolbarWrap);

  const plates = new Plates();
  const captions = new Captions();
  overlay.append(...plates.elements, captions.element);

  // Keep the HUD row/toolbar exactly as wide as the canvas (§5.1 "content column = canvas
  // width"), at every scale, without depending on app.ts internals: `overlay` always fills the
  // box that hugs the canvas (layout.css), so its own rendered width IS the canvas' CSS width.
  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) {
        section.style.setProperty('--stage-w', `${width}px`);
        // AUD-1 (§7.7): the caption strip's cursor/selection points arrive in 400-wide view
        // space; this is the only place the CSS scale is measured, and only on resize.
        captions.setScale(width);
      }
    });
    resizeObserver.observe(overlay);
  }

  const plateElements = [...plates.elements, captions.element];

  return {
    element: section,
    minimapCanvas: statusBar.minimapCanvas,
    update(state: HudState): void {
      statusBar.update(state);
      toolbar.update(state);
      plates.update(state);
      captions.setReducedMotion(state.reducedMotion);
      captions.updatePosition(state.captionAvoidPoints?.cursor ?? null, state.captionAvoidPoints?.selected ?? null);
    },
    showToast(text: string, kind: ToastKind): void {
      plates.showToast(text, kind);
    },
    flashRefusal(skill: SkillId): void {
      toolbar.flashRefusal(skill);
    },
    caption(text: string): void {
      captions.add(text);
    },
    bubble(next: ArmBubble | null): void {
      plates.bubble(next);
    },
    edgeArrow(next: EdgeArrow | null): void {
      plates.edgeArrow(next);
    },
    destroy(): void {
      resizeObserver?.disconnect();
      plates.destroy();
      captions.destroy();
      toolbar.destroy();
      for (const el of plateElements) el.remove();
    },
  };
}
