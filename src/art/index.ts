/**
 * Pure-data art layer: sprite/anim data ported 1:1 from `docs/design/mockups/sprites.js` by
 * `scripts/port-art.mjs`. Imports `core` types only; `render`, `ui` and `app` may import this.
 */
export type { Anim, PixelFrame } from './anim.ts';
export { animFrameIndex } from './anim.ts';
export type {
  AnchoredOverlay,
  ArtThemeId,
  DigitsAnchor,
  FramesOverlay,
  HazardArt,
  ObjectAnim,
  OverlaysData,
  PipsArt,
  ThemeObjects,
  TrapArt,
} from './types.ts';
export { ART_THEME_IDS } from './types.ts';
export { MUMBLE_PALETTE } from './palette.ts';
export { MUMBLE_ANIMS } from './mumble.ts';
export { THEME_OBJECTS } from './objects.ts';
export { ICONS, ICON_LABELS, ICON_ORDER } from './icons.ts';
export { OVERLAYS } from './overlays.ts';
