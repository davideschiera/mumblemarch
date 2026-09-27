/**
 * Filter + Follow chips (DESIGN §5.3 item 0, §6.3.4, §7.2): real `<button>`s, 32 px high inside
 * the 44 px status row. `mousedown.preventDefault()` so a click never parks focus on the HUD
 * (§6.2.6) — the canvas keeps it, so the next Space still assigns.
 * Owner: e2b-hud-view.
 */
import { FILTER_TEXT, FOLLOW } from '../strings.ts';
import { h, setText } from '../dom.ts';
import type { HudCallbacks, HudState } from './types.ts';

export class Chips {
  readonly element: HTMLElement;
  private readonly filter: HTMLButtonElement;
  private readonly follow: HTMLButtonElement;
  private lastFilter: HudState['filter'] | null = null;
  private lastFollow: boolean | null = null;

  constructor(callbacks: HudCallbacks) {
    this.filter = h('button', { type: 'button', class: 'status-chip' });
    this.follow = h('button', { type: 'button', class: 'status-chip', 'aria-pressed': 'false', 'aria-label': FOLLOW.aria }, FOLLOW.label);
    this.filter.addEventListener('click', () => callbacks.onFilterCycle());
    this.follow.addEventListener('click', () => callbacks.onFollowToggle());
    for (const chip of [this.filter, this.follow]) chip.addEventListener('mousedown', (event) => event.preventDefault());
    this.element = h('span', { class: 'status-chips' }, this.filter, this.follow);
  }

  update(state: HudState): void {
    if (state.filter !== this.lastFilter) {
      this.lastFilter = state.filter;
      const text = FILTER_TEXT[state.filter];
      setText(this.filter, text.chip);
      this.filter.setAttribute('aria-label', text.aria);
    }
    if (state.follow !== this.lastFollow) {
      this.lastFollow = state.follow;
      this.follow.setAttribute('aria-pressed', String(state.follow));
    }
  }
}
