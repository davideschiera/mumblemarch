/**
 * Pure ordering shared by keyboard cycling and the §7.3 #4 selection announcement (DESIGN
 * §6.2.3): selectable mumbles passing the filter chip, sorted by `x` then `id` — the exact order
 * `core/picking.ts`'s `cycleLemming` walks. DOM-free so it is unit-testable in Node.
 * Owner: E4b.
 */
import { isSelectable, passesFilter, type CycleOptions, type SelectionFilter } from '../../core/picking.ts';
import type { Direction, Lemming } from '../../core/types.ts';

/** Selectable, filter-passing mumbles sorted left→right by `x`, ties by `id` (DESIGN §6.2.3). */
export function orderedSelectables(lemmings: readonly Readonly<Lemming>[], filter: SelectionFilter): readonly Readonly<Lemming>[] {
  return lemmings.filter((lem) => isSelectable(lem) && passesFilter(lem, filter)).sort((a, b) => a.x - b.x || a.id - b.id);
}

/** 1-based position of `id` within `order`, and the order's length; null when `id` is absent. */
export function orderPosition(order: readonly Readonly<Lemming>[], id: number): { readonly i: number; readonly n: number } | null {
  const idx = order.findIndex((lem) => lem.id === id);
  return idx < 0 ? null : { i: idx + 1, n: order.length };
}

/** `Direction` → the §7.3 #4 template's `{left|right}` word. */
export function dirLabel(dir: Direction): 'left' | 'right' {
  return dir === -1 ? 'left' : 'right';
}

/**
 * §6.2.3 cycling start rule: with no current selection, `fromX` (the vanished selection's last x)
 * takes over once there has been one; otherwise the very first cycle in a level starts in view
 * (or nearest the view centre) via `view`. `cycleLemming` ignores both when a current selection
 * is passed (plain ±1), so this only matters for the "no selection" branch.
 */
export function cycleStartOptions(
  filter: SelectionFilter,
  group: boolean,
  selectedLastX: number | null,
  view: { readonly x0: number; readonly x1: number },
): CycleOptions {
  return selectedLastX === null ? { filter, group, view } : { filter, group, fromX: selectedLastX };
}
