/**
 * Translates raw DOM input into logical actions and DOM-free pointer samples (`handler.ts`).
 * Knows nothing about the game: the app decides what an action means on the current screen.
 * Owner: E4a. Pure rules (wheel normalisation, key ownership) live in `wheel.ts` /
 * `key-ownership.ts` so they are Node-testable; this file is the DOM glue only.
 */
import type { ActionId } from './actions.ts';
import { buildKeyMap, type KeyBindings } from './bindings.ts';
import type { InputHandler, PointerSample } from './handler.ts';
import { ownsKey, type FocusedElementInfo } from './key-ownership.ts';
import { normalizeWheelDelta } from './wheel.ts';
import type { Point } from '../core/types.ts';

export type { ActionModifiers, ActionPhase, InputHandler, PointerSample } from './handler.ts';

/**
 * Pure decision for `detach(handler?)`: defence in depth for the IF4 overlapping-lifecycle hazard
 * (see `transition()` in `app/router.ts`). A screen's `destroy()` runs some time after the NEXT
 * screen was already built and attached (e.g. if a future call site ever reorders things back, or
 * some other code path destroys a stale reference); without this check, an old handler's `detach()`
 * would unconditionally rip out the new handler's listeners. `detach()` called with no argument
 * (nothing to compare against) keeps the original "always detach whatever is attached" behaviour,
 * used by `attach()` to clear any previous handler before taking over.
 */
export function shouldDetach(current: InputHandler | null, requested: InputHandler | undefined): boolean {
  if (requested === undefined) return current !== null;
  return current === requested;
}

export interface InputManagerOptions {
  /** Element receiving pointer events (the game canvas). */
  readonly pointerTarget: HTMLElement;
  /** Element receiving key events (usually `window`). */
  readonly keyTarget: Window | HTMLElement;
  /** Convert client (CSS pixel) coordinates to world pixels; null when outside the view. */
  readonly toWorld: (clientX: number, clientY: number) => Point | null;
  readonly bindings: KeyBindings;
}

export class InputManager {
  private readonly options: InputManagerOptions;
  private keyMap: ReadonlyMap<string, ActionId>;
  private handler: InputHandler | null = null;
  private readonly held = new Set<string>();
  /** The pointer currently captured for a press (middle-drag, assign-on-release across the whole press). */
  private capturedPointerId: number | null = null;

  constructor(options: InputManagerOptions) {
    this.options = options;
    this.keyMap = buildKeyMap(options.bindings);
  }

  setBindings(bindings: KeyBindings): void {
    this.keyMap = buildKeyMap(bindings);
  }

  /** Start routing input to `handler` (replaces any previous handler). */
  attach(handler: InputHandler): void {
    this.detach();
    this.handler = handler;
    const { keyTarget, pointerTarget } = this.options;
    keyTarget.addEventListener('keydown', this.onKeyDown as EventListener);
    keyTarget.addEventListener('keyup', this.onKeyUp as EventListener);
    pointerTarget.addEventListener('pointermove', this.onPointerMove);
    pointerTarget.addEventListener('pointerleave', this.onPointerLeave);
    pointerTarget.addEventListener('pointerdown', this.onPointerDown);
    pointerTarget.addEventListener('pointerup', this.onPointerUp);
    pointerTarget.addEventListener('pointercancel', this.onPointerUp);
    pointerTarget.addEventListener('wheel', this.onWheel, { passive: false });
    pointerTarget.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', this.releaseAll);
  }

  /**
   * Stop routing input. With no argument this always detaches (used by `attach()` to clear any
   * previous handler). Given a `handler`, it detaches only when that handler is the one currently
   * attached — a no-op otherwise, so a stale/old handler's `destroy()` can never tear down a
   * different handler that has since taken over (see `shouldDetach` above).
   */
  detach(handler?: InputHandler): void {
    if (!shouldDetach(this.handler, handler)) return;
    const { keyTarget, pointerTarget } = this.options;
    keyTarget.removeEventListener('keydown', this.onKeyDown as EventListener);
    keyTarget.removeEventListener('keyup', this.onKeyUp as EventListener);
    pointerTarget.removeEventListener('pointermove', this.onPointerMove);
    pointerTarget.removeEventListener('pointerleave', this.onPointerLeave);
    pointerTarget.removeEventListener('pointerdown', this.onPointerDown);
    pointerTarget.removeEventListener('pointerup', this.onPointerUp);
    pointerTarget.removeEventListener('pointercancel', this.onPointerUp);
    pointerTarget.removeEventListener('wheel', this.onWheel);
    pointerTarget.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('blur', this.releaseAll);
    this.held.clear();
    this.capturedPointerId = null;
    this.handler = null;
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return; // leave browser shortcuts alone
    if (ownsKey(describeFocusedElement(event.target), event.code)) return; // the focused control handles it
    const action = this.keyMap.get(event.code);
    if (!action || !this.handler) return;
    event.preventDefault();
    if (this.held.has(event.code)) return; // ignore OS auto-repeat; the app repeats holdables
    this.held.add(event.code);
    this.handler.onAction(action, 'down', event);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.held.delete(event.code)) return;
    const action = this.keyMap.get(event.code);
    if (action && this.handler) this.handler.onAction(action, 'up', event);
  };

  /** Window lost focus: keyups will never arrive, so release every held key now. */
  private readonly releaseAll = (): void => {
    for (const code of this.held) {
      const action = this.keyMap.get(code);
      if (action && this.handler) this.handler.onAction(action, 'up', null);
    }
    this.held.clear();
  };

  private sample(event: PointerEvent, button: number): PointerSample {
    const r = this.options.pointerTarget.getBoundingClientRect();
    return {
      world: this.options.toWorld(event.clientX, event.clientY),
      cssX: event.clientX - r.left,
      cssY: event.clientY - r.top,
      cssWidth: r.width,
      cssHeight: r.height,
      button,
      buttons: event.buttons,
      shiftKey: event.shiftKey,
      pointerType: event.pointerType,
    };
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    this.handler?.onPointerMove(this.sample(event, -1));
  };

  private readonly onPointerLeave = (): void => {
    // A captured press keeps delivering pointermove outside the canvas (middle-drag,
    // assign-on-release): don't clear the cursor mid-press just because the pointer physically
    // left the element's bounds.
    if (this.capturedPointerId !== null) return;
    this.handler?.onPointerMove(null);
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    // Capture so pointermove/pointerup keep targeting the canvas even if the pointer leaves it
    // mid-press (middle-drag panning, assign-on-release, §6.1.3).
    try {
      this.options.pointerTarget.setPointerCapture(event.pointerId);
      this.capturedPointerId = event.pointerId;
    } catch {
      // Unsupported / already released — the press still works, just without off-canvas tracking.
    }
    this.handler?.onPointerDown(this.sample(event, event.button));
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.capturedPointerId === event.pointerId) {
      try {
        this.options.pointerTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Already released (e.g. pointercancel) — nothing to do.
      }
      this.capturedPointerId = null;
    }
    this.handler?.onPointerUp(this.sample(event, event.button));
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey || !this.handler) return; // Ctrl+wheel / pinch = browser zoom (§6.1.3)
    event.preventDefault();
    this.handler.onWheel(normalizeWheelDelta(event.deltaX, event.deltaY, event.deltaMode));
  };

  private readonly onContextMenu = (event: Event): void => {
    event.preventDefault(); // right-click is a game input
  };
}

/** Build the DOM-free description `key-ownership.ts`'s pure `ownsKey()` rule needs. */
function describeFocusedElement(target: EventTarget | null): FocusedElementInfo {
  if (!(target instanceof Element)) return { isTextEntry: false, inDialog: false, ownsActivation: false, ownsWidgetKeys: false };
  const isTextEntry =
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'range'].includes(target.type)));
  return {
    isTextEntry,
    inDialog: target.closest('dialog') !== null,
    ownsActivation: target.closest('button, a[href], input, select, textarea, summary, [role="button"]') !== null,
    ownsWidgetKeys: target.closest('input[type="range"], select, [role="slider"], [role="listbox"], [role="radiogroup"], [data-arrow-keys]') !== null,
  };
}
