/**
 * Data shapes for the generated art/* files (objects.ts, overlays.ts). Hand-written: these
 * mirror `docs/design/mockups/sprites.js` field-for-field so the generator needs no reshaping.
 */
import type { HazardKind } from '../core/types.ts';
import type { PixelFrame } from './anim.ts';

/** The 5 shipped theme ids. Local to `art/` (art must not depend on `levels/`). */
export const ART_THEME_IDS = ['mossgrove', 'sugarworks', 'observatory', 'foundry', 'reef'] as const;
export type ArtThemeId = (typeof ART_THEME_IDS)[number];

/** A looping/one-shot object animation (entrance, exit): frames + timing + a foot-style anchor. */
export interface ObjectAnim {
  readonly frames: readonly PixelFrame[];
  readonly ticksPerFrame: number;
  readonly loop: boolean;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly note?: string;
}

/** A trap's idle loop + trigger burst. */
export interface TrapArt {
  readonly name: string;
  readonly idle: readonly PixelFrame[];
  readonly trigger: readonly PixelFrame[];
  readonly idleTicksPerFrame: number;
  readonly triggerTicksPerFrame: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly note?: string;
}

/** A hazard pool's animated surface + a static deep-water/lava tile. */
export interface HazardArt {
  readonly kind: HazardKind;
  readonly name: string;
  readonly surface: readonly PixelFrame[];
  readonly deep: PixelFrame;
  readonly surfaceTicksPerFrame: number;
  readonly tile: number;
}

export interface ThemeObjects {
  readonly palette: Readonly<Record<string, string>>;
  readonly entrance: ObjectAnim;
  readonly exit: ObjectAnim;
  readonly trap: TrapArt;
  readonly hazard: HazardArt;
}

/** A static (non-animated) overlay anchored by a point (hover ring, refusal mark…). */
export interface AnchoredOverlay {
  readonly rows: PixelFrame;
  readonly anchorX: number;
  readonly anchorY: number;
}

/** A small animated overlay (steel spark, fuse, assign ring); anchor is optional. */
export interface FramesOverlay {
  readonly frames: readonly PixelFrame[];
  readonly ticksPerFrame: number;
  readonly anchorX?: number;
  readonly anchorY?: number;
}

export interface DigitsAnchor {
  readonly anchorX: number;
  readonly gapAboveSprite: number;
}

export interface PipsArt {
  readonly plate: string;
  readonly full: string;
  readonly warn: string;
  readonly empty: string;
  readonly w: number;
  readonly h: number;
  readonly cols: number;
  readonly rows: number;
  readonly warnAt: number;
  readonly example12: readonly string[];
  readonly example3: readonly string[];
}

export interface OverlaysData {
  readonly font3x5: Readonly<Record<string, PixelFrame>>;
  readonly digits: Readonly<Record<string, PixelFrame>>;
  readonly digitsAnchor: DigitsAnchor;
  readonly pips: PipsArt;
  readonly hover: AnchoredOverlay;
  readonly selected: AnchoredOverlay;
  readonly crosshair: AnchoredOverlay;
  readonly steelSpark: FramesOverlay;
  readonly refusal: AnchoredOverlay;
  readonly pending: AnchoredOverlay;
  readonly fuse: FramesOverlay;
  readonly assignRing: FramesOverlay;
}
