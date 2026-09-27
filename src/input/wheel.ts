/**
 * Pure wheel/trackpad normalisation (DESIGN §6.1.3): `deltaX + deltaY`, scaled by the
 * WheelEvent's `deltaMode` (0 = pixel, 1 = line ×16, 2 = page ×400). Takes plain numbers (not a
 * WheelEvent) so this is Node-testable without a DOM; `input-manager.ts` is the only caller.
 * Owner: E4a.
 */

/** CSS px per "line"/"page" unit. Mirrors `app/config.ts`'s WHEEL_LINE_PX/WHEEL_PAGE_PX — the
 * `input/` layer may only import `core/`, so the DESIGN-fixed numbers are duplicated here. */
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 400;

/** `deltaMode` → CSS px per unit (1 for the default pixel mode). */
function unitPx(deltaMode: number): number {
  if (deltaMode === 1) return WHEEL_LINE_PX;
  if (deltaMode === 2) return WHEEL_PAGE_PX;
  return 1;
}

/** The combined, CSS-px wheel delta the InputHandler reports via `onWheel` (§6.1.3). */
export function normalizeWheelDelta(deltaX: number, deltaY: number, deltaMode: number): number {
  return (deltaX + deltaY) * unitPx(deltaMode);
}
