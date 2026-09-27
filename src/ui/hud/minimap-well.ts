/**
 * Minimap well (DESIGN §5.1/§5.3, §6.1.3, §7.2, §7.8): a 332×44 sunken well around the level-map
 * canvas the app's `render/Minimap` draws into. The WELL (not the canvas) is `role="slider"` and
 * the Tab stop, so the accessible/focusable target is the full ≥160×40 well rather than the
 * canvas' own (often much smaller) backing store; the canvas is purely decorative
 * (`aria-hidden="true"`, no tabindex). The canvas' backing store is sized by the renderer
 * (≤ 320×32, 1 CSS px = 5 world px), left-aligned in the well when the level is narrower.
 * `mousedown`/`pointerdown.preventDefault()` keep focus off the HUD on a click (§6.2.6), and
 * pointer capture is taken on the well; the keys it owns are marked with `data-arrow-keys`.
 * Pointer offsets are still measured from the CANVAS' left edge (clamped to its width) so
 * `render/Minimap.toWorldX` — which maps canvas-local CSS px to world x — keeps working
 * unchanged; a click in the well's padding clamps to the nearest canvas edge.
 * Owner: e2b-hud-view.
 */
import { MINIMAP_ARIA_LABEL } from '../strings.ts';
import { h } from '../dom.ts';
import type { HudCallbacks, HudState, MinimapKey } from './types.ts';

const MINIMAP_KEYS: ReadonlySet<string> = new Set<MinimapKey>(['ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);

export interface MinimapWell {
  readonly element: HTMLElement;
  /** The canvas `render/Minimap` draws into (exposed as `GameScreenView.minimapCanvas`). */
  readonly canvas: HTMLCanvasElement;
  update(state: HudState): void;
}

export function createMinimapWell(callbacks: HudCallbacks): MinimapWell {
  const canvas = h('canvas', {
    class: 'minimap-canvas',
    width: 320,
    height: 32,
    'aria-hidden': 'true',
  });
  const element = h(
    'div',
    {
      class: 'minimap-well',
      tabindex: 0,
      role: 'slider',
      'data-arrow-keys': true,
      'aria-label': MINIMAP_ARIA_LABEL,
      'aria-valuemin': 0,
      'aria-valuemax': 0,
      'aria-valuenow': 0,
    },
    canvas,
  );

  // Offset from the CANVAS' left edge (not the well's), clamped to the canvas' own CSS width —
  // a click in the well's padding (canvas narrower than the well) clamps to the nearest edge.
  const offset = (e: PointerEvent): number => {
    const raw = e.clientX - canvas.getBoundingClientRect().left;
    return Math.min(Math.max(raw, 0), canvas.clientWidth);
  };
  const preventFocusPark = (e: Event): void => e.preventDefault(); // mouse never parks focus (§6.2.6)
  element.addEventListener('mousedown', preventFocusPark);
  element.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // keep focus where it was — mouse never parks focus on the HUD (§6.2.6)
    if (e.isTrusted) element.setPointerCapture(e.pointerId);
    callbacks.onMinimapPointer('down', offset(e));
  });
  element.addEventListener('pointermove', (e) => callbacks.onMinimapPointer('move', offset(e)));
  element.addEventListener('pointerup', (e) => callbacks.onMinimapPointer('up', offset(e)));
  element.addEventListener('pointerleave', (e) => callbacks.onMinimapPointer('leave', offset(e)));
  element.addEventListener('keydown', (e) => {
    if (!MINIMAP_KEYS.has(e.key)) return;
    e.preventDefault();
    if (!e.repeat) callbacks.onMinimapKey(e.key as MinimapKey, 'down', e.shiftKey);
  });
  element.addEventListener('keyup', (e) => {
    if (MINIMAP_KEYS.has(e.key)) callbacks.onMinimapKey(e.key as MinimapKey, 'up', e.shiftKey);
  });

  let lastMax = -1;
  let lastNow = -1;
  let lastText = '';
  let lastDragging = false;
  return {
    element,
    canvas,
    update(state: HudState): void {
      const m = state.minimap;
      if (m.valueMax !== lastMax) {
        lastMax = m.valueMax;
        element.setAttribute('aria-valuemax', String(m.valueMax));
      }
      if (m.valueNow !== lastNow) {
        lastNow = m.valueNow;
        element.setAttribute('aria-valuenow', String(m.valueNow));
      }
      if (m.valueText !== lastText) {
        lastText = m.valueText;
        element.setAttribute('aria-valuetext', m.valueText);
      }
      if (m.dragging !== lastDragging) {
        lastDragging = m.dragging;
        element.classList.toggle('minimap-well--dragging', m.dragging);
      }
    },
  };
}
