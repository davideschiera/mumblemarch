/**
 * Canvas scale rule (DESIGN §5.1, E.1 N11): the integer CSS scale for the persistent 400×160
 * backing-store canvas, derived from the viewport size — a 32 px side gutter, a 196 px vertical
 * budget for the HUD around the stage, clamped to ×2…×4 — recomputed on every resize. A Settings
 * `scale` of 2/3/4 always overrides the rule; 0 means "auto" (the rule below).
 *
 * Pure and DOM-free on purpose: `tests/app-shell-scale.test.ts` exercises the exact table from
 * the spec without a DOM. `app.ts` is the only caller that feeds it real viewport numbers.
 */
import { MAX_SCALE, MIN_SCALE, SCALE_HUD_BUDGET_PX, SCALE_SIDE_PADDING_PX } from './config.ts';
import { VIEW_HEIGHT, VIEW_WIDTH } from '../render/camera.ts';

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

/** DESIGN §5.1: `s = clamp(2, 4, min(floor((vw − 32) / 400), floor((vh − 196) / 160)))`. */
export function autoScale(viewportWidth: number, viewportHeight: number): number {
  const byWidth = Math.floor((viewportWidth - SCALE_SIDE_PADDING_PX) / VIEW_WIDTH);
  const byHeight = Math.floor((viewportHeight - SCALE_HUD_BUDGET_PX) / VIEW_HEIGHT);
  return clamp(MIN_SCALE, MAX_SCALE, Math.min(byWidth, byHeight));
}

/**
 * The scale to actually use: `override` (Settings `scale`) wins whenever it is non-zero (0 =
 * "auto"), otherwise {@link autoScale}. A non-zero override is still clamped to ×2…×4 so a
 * corrupted save can never produce an unusable canvas size.
 */
export function resolveScale(viewportWidth: number, viewportHeight: number, override: number): number {
  if (override) return clamp(MIN_SCALE, MAX_SCALE, Math.trunc(override));
  return autoScale(viewportWidth, viewportHeight);
}
