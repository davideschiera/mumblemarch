/**
 * Results decor: a row of saved mumbles hopping (DESIGN §5.4 Results "Decor: saved mumbles hop
 * (static with reduced motion)"). Purely decorative (`aria-hidden`); the hop is a CSS animation
 * (screens.css) disabled under `[data-motion="reduce"]`, so no rAF loop is needed here.
 * Owner: e3a1-title-results.
 */
import { MUMBLE_ANIMS, MUMBLE_PALETTE } from '../../art/index.ts';
import { h } from '../dom.ts';
import { frameSize, pixelFrameToDataUrl } from '../pixel-art.ts';

const SCALE = 3;
const MAX_MUMBLES = 12;
// The "exiting" hop pose (arms-up frame), same art used in-game for a saved mumble (§3.4).
const FRAME = MUMBLE_ANIMS.exiting.frames[1] ?? MUMBLE_ANIMS.exiting.frames[0]!;
const { w, h: frameH } = frameSize(FRAME);
const SPRITE_URL = pixelFrameToDataUrl(FRAME, MUMBLE_PALETTE, SCALE);

/** Up to `count` hopping mumbles (one per saved mumble, capped so the row stays small). */
export function createHopStrip(count: number): HTMLElement {
  const n = Math.max(0, Math.min(count, MAX_MUMBLES));
  const icons = Array.from({ length: n }, (_, i) =>
    h('span', {
      class: 'results-hop__mumble',
      style: `width:${w * SCALE}px;height:${frameH * SCALE}px;background-image:url(${SPRITE_URL});animation-delay:${(i % 6) * 90}ms`,
    }),
  );
  return h('div', { class: 'results-hop', 'aria-hidden': 'true' }, ...icons);
}
