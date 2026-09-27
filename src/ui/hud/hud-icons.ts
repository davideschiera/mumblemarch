/**
 * HUD icon rendering (DESIGN §5.3 icons; "Icons" note in the E2a task spec): each 16×16
 * `art/icons.ts` `PixelFrame` is rasterised ONCE at ×3 (48×48) into a cached PNG data URL, then
 * placed as an `<img>` (decorative: `alt=""` + `aria-hidden`); CSS decides the on-screen size per
 * button family (48×48 for skill buttons, 32×32 for the smaller controls/RR ± glyphs), scaling the
 * shared 48×48 bitmap down with `image-rendering: pixelated` so every icon still shares one cache.
 * Owner: e2a-toolbar.
 */
import { ICONS } from '../../art/icons.ts';
import { MUMBLE_PALETTE } from '../../art/palette.ts';
import { h } from '../dom.ts';
import { pixelFrameToDataUrl } from '../pixel-art.ts';

const ICON_SCALE = 3;
const cache = new Map<string, string>();

function dataUrl(id: string): string {
  const cached = cache.get(id);
  if (cached !== undefined) return cached;
  const frame = ICONS[id];
  const url = frame ? pixelFrameToDataUrl(frame, MUMBLE_PALETTE, ICON_SCALE) : '';
  cache.set(id, url);
  return url;
}

/** A fresh decorative `<img>` for icon `id` (48×48 bitmap; style its displayed size in CSS). */
export function hudIcon(id: string): HTMLImageElement {
  return h('img', { class: 'hud-icon', src: dataUrl(id), alt: '', 'aria-hidden': 'true', width: 48, height: 48 });
}
