/**
 * Overlay plates mounted in `#stage-overlay`, over the canvas (DESIGN §5.1, §5.3, §6.2.2): the
 * pause/×3 pills top-centre, the refusal/info toast under them, the Pop all/Restart armed
 * bubble, and the edge arrow for a selection that scrolled off-screen. All `aria-hidden` — the
 * Announcer speaks the equivalent text (§7.6).
 * Owner: e2b-hud-view.
 */
import { HUD } from '../strings.ts';
import { h, setText } from '../dom.ts';
import { TOAST_MS } from '../ui-config.ts';
import type { ArmBubble, EdgeArrow, HudState, ToastKind } from './types.ts';

export class Plates {
  /** Mounted into the stage overlay by the game view. */
  readonly elements: readonly HTMLElement[];
  private readonly pillRow: HTMLElement;
  private readonly pausePill: HTMLElement;
  private readonly fastPill: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly bubbleEl: HTMLElement;
  private readonly arrow: HTMLElement;
  private toastTimer: number | null = null;
  private pausedShown = false;
  private fastShown = false;
  private lastBubbleText: string | null = null;
  private lastArrowSide: EdgeArrow['side'] | null = null;
  private lastArrowLabel: string | null = null;

  constructor() {
    this.pausePill = h('span', { class: 'overlay-pill' }, HUD.pausedPlate);
    this.fastPill = h('span', { class: 'overlay-pill' }, HUD.fastPlate);
    this.pausePill.hidden = true;
    this.fastPill.hidden = true;
    this.pillRow = h('div', { class: 'overlay-pill-row', 'aria-hidden': 'true', hidden: true }, this.pausePill, this.fastPill);
    this.toast = h('div', { class: 'overlay-toast', 'aria-hidden': 'true', hidden: true });
    this.bubbleEl = h('div', { class: 'overlay-bubble', 'aria-hidden': 'true', hidden: true });
    this.arrow = h('div', { class: 'overlay-edge', 'aria-hidden': 'true', hidden: true });
    this.elements = [this.pillRow, this.toast, this.bubbleEl, this.arrow];
  }

  /** §5.3: the pause pill hides once the level has ended (results pending). */
  update(state: HudState): void {
    const showPause = state.paused && !state.ended;
    if (showPause !== this.pausedShown) {
      this.pausedShown = showPause;
      this.pausePill.hidden = !showPause;
    }
    if (state.fastForward !== this.fastShown) {
      this.fastShown = state.fastForward;
      this.fastPill.hidden = !state.fastForward;
    }
    this.pillRow.hidden = this.pausePill.hidden && this.fastPill.hidden;
  }

  showToast(text: string, kind: ToastKind): void {
    setText(this.toast, text);
    this.toast.dataset['kind'] = kind;
    this.toast.hidden = false;
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
      this.toastTimer = null;
    }, TOAST_MS);
  }

  /** Cheap to call every frame with the same value — a true no-op then (GameHudView contract). */
  bubble(next: ArmBubble | null): void {
    const text = next?.text ?? null;
    if (text === this.lastBubbleText) return;
    this.lastBubbleText = text;
    this.bubbleEl.hidden = next === null;
    if (next) setText(this.bubbleEl, next.text);
  }

  /** Called every frame (§6.2.2 selection follow-up) — a true no-op when side/label repeat. */
  edgeArrow(next: EdgeArrow | null): void {
    const side = next?.side ?? null;
    const label = next?.label ?? null;
    if (side === this.lastArrowSide && label === this.lastArrowLabel) return;
    this.lastArrowSide = side;
    this.lastArrowLabel = label;
    this.arrow.hidden = next === null;
    if (!next) return;
    setText(this.arrow, next.side === 'left' ? `◂ ${next.label}` : `${next.label} ▸`);
    this.arrow.dataset['side'] = next.side;
  }

  destroy(): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
  }
}
