/**
 * The InputManager → app contract (DOM-free types): logical actions plus DOM-free pointer
 * samples, so pure pointer logic (edge zones, press/release rules) is testable in Node.
 * Owner: ui-lead (E0 wrote it). E4 implements the DOM side in `input-manager.ts`; the game
 * controller implements `InputHandler`. Changes go through ui-lead.
 */
import type { Point } from '../core/types.ts';
import type { ActionId } from './actions.ts';

export type ActionPhase = 'down' | 'up';

/** Modifier state of the key event behind an action (a KeyboardEvent satisfies it). */
export interface ActionModifiers {
  /** DESIGN §6.1.1 Shift rule: Shift makes the step bigger, never changes which action runs. */
  readonly shiftKey: boolean;
}

/** One pointer event over the playfield canvas, in both world and CSS space. */
export interface PointerSample {
  /** World pixel under the pointer, or null when outside the canvas view. */
  readonly world: Point | null;
  /** CSS px from the canvas' left/top edge (edge zones use `cssX` vs `cssWidth`, §6.1.3). */
  readonly cssX: number;
  readonly cssY: number;
  /** Canvas CSS size. */
  readonly cssWidth: number;
  readonly cssHeight: number;
  /** Button that changed (down/up): 0 left, 1 middle, 2 right; -1 for moves. */
  readonly button: number;
  /** Bitmask of held buttons (1 left, 2 right, 4 middle) — "right held + left press" = walkers only. */
  readonly buttons: number;
  readonly shiftKey: boolean;
  /** 'mouse' | 'pen' | 'touch'. */
  readonly pointerType: string;
}

export interface InputHandler {
  /** A bound key went down/up. `event` is null for synthetic releases (e.g. window blur). */
  onAction(action: ActionId, phase: ActionPhase, event: ActionModifiers | null): void;
  /** Pointer moved over the playfield (`null` = it left the canvas). */
  onPointerMove(sample: PointerSample | null): void;
  onPointerDown(sample: PointerSample): void;
  onPointerUp(sample: PointerSample): void;
  /**
   * Wheel / trackpad over the playfield, already normalised to CSS px (`deltaX + deltaY`,
   * lines ×16, pages ×400); Ctrl+wheel is never reported (browser zoom, §6.1.3).
   */
  onWheel(deltaCssPx: number): void;
}
