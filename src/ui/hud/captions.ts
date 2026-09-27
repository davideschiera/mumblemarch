/**
 * Caption strip (DESIGN §7.7): DOM, bottom-left inset 8 px inside the canvas box, `aria-hidden`
 * (the Announcer covers speech). At most 2 lines, 16 px, 2.5 s each; the newest line is at the
 * bottom with a 150 ms fade (none in reduced motion — status.css). The same text arriving again
 * within 1 s coalesces into one line, "{text} ×{n}".
 *
 * The strip also moves to the top-left while the cursor or the selected mumble is inside its
 * box (AUD-1 fix): `ui/screens/game.ts` passes `HudState.captionAvoidPoints` (view-space px,
 * `app/game/view-state.ts`) to `updatePosition()` every frame, which converts them to this
 * element's own CSS-px space (via a scale cached from the stage-overlay's measured CSS width —
 * `setScale()`, called only on resize, never per frame) and runs the pure `shouldMoveToTopLeft`
 * decision against `stripRect`, a CSS rect cached here and only re-measured when the strip's own
 * content changes (`add`/`expire`) — never a per-frame layout read. The `caption-strip--top`
 * class is toggled only when the decision actually flips. The CSS move transition (overlays.css)
 * is skipped under reduced motion via `caption-strip--instant` (same `reducedMotion` flag as the
 * line fade below).
 * Owner: e2b-hud-view.
 */
import { h } from '../dom.ts';
import { CAPTION_COALESCE_MS, CAPTION_FADE_MS, CAPTION_MAX_LINES, CAPTION_MS } from '../ui-config.ts';

interface Line {
  readonly el: HTMLElement;
  readonly text: string;
  count: number;
  lastAt: number;
  timer: number;
}

/** A point in some 2D pixel space (view px or CSS px — callers keep the two straight). */
export interface CssPoint {
  readonly x: number;
  readonly y: number;
}

/** A rect in the same pixel space as the `CssPoint`s it's tested against, `left`/`top` inclusive
 * through `right`/`bottom` inclusive. */
export interface CssRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Pure: whether point `p` lies inside `rect` (inclusive edges), both in the same pixel space.
 * `null` for either argument (no cursor/selection, or the strip has no measured box yet) is
 * always "not inside". */
export function pointInRect(p: CssPoint | null, rect: CssRect | null): boolean {
  if (!p || !rect) return false;
  return p.x >= rect.left && p.x <= rect.right && p.y >= rect.top && p.y <= rect.bottom;
}

/** DESIGN §7.7: "The strip moves to the top-left while the cursor OR the selected mumble is
 * inside its box" — pure, no DOM. */
export function shouldMoveToTopLeft(cursor: CssPoint | null, selected: CssPoint | null, stripRect: CssRect | null): boolean {
  return pointInRect(cursor, stripRect) || pointInRect(selected, stripRect);
}

/** The renderer's 400×160 view width (`render/camera.ts` VIEW_WIDTH) — duplicated here because
 * `ui/` may not import `render/` (ARCHITECTURE.md layering); kept in sync by RENDER-PLAN. Used
 * only to turn the view-space points `HudState.captionAvoidPoints` carries into this element's
 * own CSS-px space, via the scale `setScale()` caches from the stage overlay's CSS width (the
 * same technique `ui/screens/march-strip.ts` uses for its own `WORLD_W`). */
const VIEW_W = 400;

export class Captions {
  readonly element: HTMLElement;
  private readonly lines: Line[] = [];
  private reducedMotion = false;

  /** CSS px per view px, from the stage overlay's last measured width; updated only on resize
   * (never per frame — see `setScale`). A sane pre-first-resize default: DESIGN §5.1's minimum
   * integer scale (×2). */
  private scale = 2;
  /** This element's own box, in CSS px relative to its offsetParent (the stage overlay) — same
   * space the scaled points below land in. Re-measured only when content changes size (`add` /
   * `expire`), never every frame. `null` before the first line ever shows. */
  private stripRect: CssRect | null = null;
  /** Cached last decision, so the DOM class is touched only on an actual flip. */
  private top = false;

  constructor() {
    this.element = h('div', { class: 'caption-strip', 'aria-hidden': 'true' });
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.element.classList.toggle('caption-strip--instant', on);
  }

  /** Called only when the stage overlay's CSS width actually changes (its ResizeObserver in
   * `ui/screens/game.ts`) — not every frame. */
  setScale(overlayCssWidth: number): void {
    if (overlayCssWidth > 0) this.scale = overlayCssWidth / VIEW_W;
  }

  /**
   * DESIGN §7.7: recompute whether the strip should be at the top-left, from the cursor's and
   * the selected mumble's on-screen positions (view px, `HudState.captionAvoidPoints`; `null` =
   * neither on screen). Pure arithmetic plus (at most) one class toggle — no layout read here;
   * `stripRect` was already cached by `add`/`expire`.
   */
  updatePosition(cursor: CssPoint | null, selected: CssPoint | null): void {
    const scale = this.scale;
    const toCss = (p: CssPoint | null): CssPoint | null => (p ? { x: p.x * scale, y: p.y * scale } : null);
    const inside = shouldMoveToTopLeft(toCss(cursor), toCss(selected), this.stripRect);
    if (inside === this.top) return;
    this.top = inside;
    this.element.classList.toggle('caption-strip--top', inside);
  }

  add(text: string): void {
    const now = Date.now();
    const last = this.lines[this.lines.length - 1];
    if (last && last.text === text && now - last.lastAt < CAPTION_COALESCE_MS) {
      last.count += 1;
      last.lastAt = now;
      last.el.textContent = `${text} ×${last.count}`;
      window.clearTimeout(last.timer);
      last.timer = window.setTimeout(() => this.expire(last), CAPTION_MS);
      this.measureRect(); // the "×N" suffix can widen the line.
      return;
    }
    const el = h('span', { class: 'caption-strip__line' }, text);
    const line: Line = { el, text, count: 1, lastAt: now, timer: 0 };
    line.timer = window.setTimeout(() => this.expire(line), CAPTION_MS);
    this.lines.push(line);
    this.element.append(el);
    while (this.lines.length > CAPTION_MAX_LINES) {
      const oldest = this.lines[0];
      if (!oldest) break;
      window.clearTimeout(oldest.timer);
      this.expire(oldest);
    }
    this.measureRect(); // content size may have changed — never done per frame, only here.
  }

  private expire(line: Line): void {
    const i = this.lines.indexOf(line);
    if (i === -1) return;
    this.lines.splice(i, 1);
    if (this.reducedMotion) {
      line.el.remove();
      this.measureRect();
      return;
    }
    line.el.classList.add('caption-strip__line--out');
    window.setTimeout(() => {
      line.el.remove();
      this.measureRect();
    }, CAPTION_FADE_MS);
  }

  /** Re-measure the strip's own ACTUAL rendered box (CSS px, relative to its offsetParent — the
   * stage overlay), for `updatePosition`'s "inside my box" test. Uses `getBoundingClientRect`
   * (not `offsetTop`/`offsetLeft`, which ignore `transform` — the top/bottom corner switch above
   * is transform-based) on both the strip and its offsetParent, then takes the difference so the
   * result is relative to the overlay regardless of the page's own scroll position. Only called
   * on a content change (`add`/`expire`), never per animation frame. */
  private measureRect(): void {
    const parent = this.element.offsetParent;
    if (!parent) {
      this.stripRect = null;
      return;
    }
    const p = parent.getBoundingClientRect();
    const r = this.element.getBoundingClientRect();
    this.stripRect = { left: r.left - p.left, top: r.top - p.top, right: r.right - p.left, bottom: r.bottom - p.top };
  }

  destroy(): void {
    for (const line of this.lines) window.clearTimeout(line.timer);
  }
}
