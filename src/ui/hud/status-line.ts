/**
 * Status line (DESIGN §5.3 items 0–4, §7.2): chips, a fixed 16ch focus slot, `Out n`, `Saved n`
 * + an 8-segment meter + `need m` (+ "goal met ✓"), and `Time m:ss` (overtime / relaxed / low
 * warning), plus the Muted / Ready / Tick notes. A plain `<p>`, deliberately NOT a live region
 * (D9) — the Announcer speaks updates; the meter segments are `aria-hidden`.
 * Owner: e2b-hud-view.
 */
import { formatClock, HUD } from '../strings.ts';
import { h, setText } from '../dom.ts';
import { Chips } from './chips.ts';
import type { HudCallbacks, HudState } from './types.ts';

const METER_SEGMENTS = 8;
/** Speaker-off glyph paired with the "Muted" text (§7.5); no dedicated icon asset exists for it. */
const MUTED_GLYPH = '🔇';
/** Time-low glyph (§5.3); blinks at 1 Hz unless reduced motion (status.css). */
const TIME_LOW_GLYPH = '⚠';

export class StatusLine {
  readonly element: HTMLElement;
  private readonly chips: Chips;
  private readonly focus: HTMLElement;
  private readonly out: HTMLElement;
  private readonly savedLabel: HTMLElement;
  private readonly meterSegs: readonly HTMLElement[];
  private readonly need: HTMLElement;
  private readonly goalGlyph: HTMLElement;
  private readonly goalSr: HTMLElement;
  private readonly savedGroup: HTMLElement;
  private readonly timeText: HTMLElement;
  private readonly timeWarn: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly note: HTMLElement;
  private lastFocusText: string | null = null;
  private lastFocusKind: string | null = null;
  private lastFilled = -1;
  private lastGoalMet: boolean | null = null;
  private lastTimeText: string | null = null;
  private lastLow: boolean | null = null;
  private lastNote: string | null = null;

  constructor(callbacks: HudCallbacks) {
    this.chips = new Chips(callbacks);
    this.focus = h('span', { class: 'status-line__focus' });
    this.out = h('span', {});
    this.savedLabel = h('span', {});
    this.meterSegs = Array.from({ length: METER_SEGMENTS }, (_, i) =>
      h('i', { class: i === METER_SEGMENTS - 1 ? 'status-meter__seg status-meter__seg--goal' : 'status-meter__seg' }),
    );
    const meter = h('span', { class: 'status-meter', 'aria-hidden': 'true' }, ...this.meterSegs);
    this.need = h('span', {});
    // Compact visible glyph (§5.3 "success colour + ✓ glyph + 'goal met'"); the full wording
    // goes to assistive tech only (visually-hidden) — kept as one row, it overflows the 860 px
    // status line at ×3 with a 2-digit "need" (measured while testing at 1280×720).
    this.goalGlyph = h('span', { class: 'status-line__goal-glyph', 'aria-hidden': 'true' }, ' ✓');
    this.goalSr = h('span', { class: 'visually-hidden' });
    this.savedGroup = h('span', { class: 'status-line__saved' }, this.savedLabel, meter, this.need, this.goalGlyph, this.goalSr);
    this.timeText = h('span', {});
    this.timeWarn = h('span', { class: 'status-line__warn', 'aria-hidden': 'true', hidden: true }, TIME_LOW_GLYPH);
    this.timeEl = h('span', { class: 'status-line__time' }, this.timeText, this.timeWarn);
    this.note = h('span', { class: 'status-line__note' });
    this.element = h(
      'p',
      { class: 'status-line' },
      this.chips.element,
      this.focus,
      sep(),
      this.out,
      sep(),
      this.savedGroup,
      sep(),
      this.timeEl,
      this.note,
    );
  }

  update(state: HudState): void {
    this.chips.update(state);

    const status = state.status;
    const focusText = status ? (status.kind === 'refusal' ? `✕ ${status.text}` : status.text) : state.focusLabel;
    const focusKind = status?.kind ?? '';
    if (focusText !== this.lastFocusText) {
      this.lastFocusText = focusText;
      setText(this.focus, focusText);
    }
    if (focusKind !== this.lastFocusKind) {
      this.lastFocusKind = focusKind;
      if (focusKind) this.focus.dataset['kind'] = focusKind;
      else delete this.focus.dataset['kind'];
    }

    setText(this.out, HUD.out(state.counts.out));
    setText(this.savedLabel, HUD.saved(state.counts.saved));
    setText(this.need, HUD.need(state.counts.required));
    if (state.goalMet !== this.lastGoalMet) {
      this.lastGoalMet = state.goalMet;
      this.savedGroup.classList.toggle('status-line__saved--met', state.goalMet);
      this.goalGlyph.hidden = !state.goalMet;
      setText(this.goalSr, state.goalMet ? ` ${HUD.goalMet}` : '');
    }
    const filled =
      state.counts.required > 0
        ? Math.max(0, Math.min(METER_SEGMENTS, Math.round((state.counts.saved / state.counts.required) * METER_SEGMENTS)))
        : state.counts.saved > 0
          ? METER_SEGMENTS
          : 0;
    if (filled !== this.lastFilled) {
      this.lastFilled = filled;
      this.meterSegs.forEach((seg, i) => seg.classList.toggle('status-meter__seg--on', i < filled));
    }

    const { time } = state;
    const clock = formatClock(time.overtimeTicks > 0 ? time.overtimeTicks : time.timeLeftTicks);
    const timeText = time.overtimeTicks > 0 ? HUD.overtime(clock) : HUD.time(clock) + (time.relaxed ? ' · relaxed' : '');
    if (timeText !== this.lastTimeText) {
      this.lastTimeText = timeText;
      setText(this.timeText, timeText);
    }
    if (time.low !== this.lastLow) {
      this.lastLow = time.low;
      this.timeWarn.hidden = !time.low;
      this.timeEl.classList.toggle('status-line__time--low', time.low);
    }

    const notes = [
      state.muted ? `${MUTED_GLYPH} ${HUD.muted}` : '',
      state.readyJobs > 0 ? HUD.ready(state.readyJobs) : '',
      state.tickNote ?? '',
    ]
      .filter(Boolean)
      .join(' · ');
    if (notes !== this.lastNote) {
      this.lastNote = notes;
      setText(this.note, notes);
    }
  }
}

function sep(): HTMLElement {
  return h('span', { class: 'status-line__sep', 'aria-hidden': 'true' });
}
