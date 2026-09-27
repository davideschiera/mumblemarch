/**
 * Release-rate group (DESIGN §5.3 "Release-rate group", §7.2 RR group row): − / value well / +.
 * − is `aria-disabled` (padlock + "min") at the level minimum, + at 99 (padlock + "max"; CMP-1 —
 * was showing "min" on both). While a padlock is showing, that button's `aria-label` also switches
 * to a form that contains the visible "min"/"max" sub-label, so it stays inside the accessible
 * name (VIS-1, WCAG 2.5.3 Label in Name) — "Slower release, min" / "Faster release, max": clean
 * words, not a glued echo of the button's own rendered text (axe strips the "🔒" emoji and the
 * `<br>` before comparing, so the plain sub-label is all that's left to contain). Both buttons
 * hold-repeat (pointerdown → 'down', pointerup/leave/cancel → 'up'; a keyboard Space/Enter
 * activation reports 'down' then 'up' via the synthetic `click`, DESIGN §6.1.3/§7.2).
 * Owner: e2a-toolbar.
 */
import { h, setText } from '../dom.ts';
import { RR_ARIA } from '../strings.ts';
import { HUD_TOOLBAR } from '../strings/hud.ts';
import { hudIcon } from './hud-icons.ts';

export interface RrCallbacks {
  onReleaseRate(delta: -1 | 1, phase: 'down' | 'up', shift: boolean): void;
}

export interface RrGroupHandle {
  readonly element: HTMLElement;
  readonly minusButton: HTMLButtonElement;
  readonly plusButton: HTMLButtonElement;
  update(value: number, min: number, max: number, intervalText: string, describedText: string, minusShortcut: string, plusShortcut: string): void;
}

let nextId = 0;

export function createRrGroup(callbacks: RrCallbacks): RrGroupHandle {
  const descId = `rr-desc-${(nextId += 1)}`;
  const desc = h('span', { class: 'visually-hidden', id: descId }, '');

  const holdButton = (delta: -1 | 1, label: string, lockText: string): HTMLButtonElement => {
    const lock = h('span', { class: 'rr-lock', 'aria-hidden': 'true' }, '🔒', h('br'), lockText);
    const button = h(
      'button',
      { type: 'button', class: 'hud-button hud-button--rr', 'aria-label': label, 'aria-describedby': descId },
      hudIcon(delta < 0 ? 'rrMinus' : 'rrPlus'),
      lock,
    );
    button.addEventListener('pointerdown', (e) => callbacks.onReleaseRate(delta, 'down', e.shiftKey));
    for (const type of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
      button.addEventListener(type, () => callbacks.onReleaseRate(delta, 'up', false));
    }
    button.addEventListener('click', (e) => {
      if (e.detail !== 0) return; // real pointer clicks were already handled by pointerdown/up
      callbacks.onReleaseRate(delta, 'down', e.shiftKey);
      callbacks.onReleaseRate(delta, 'up', false);
    });
    return button;
  };

  const minusButton = holdButton(-1, RR_ARIA.slower, HUD_TOOLBAR.rrMin);
  const plusButton = holdButton(1, RR_ARIA.faster, HUD_TOOLBAR.rrMax);
  const valueNum = h('span', { class: 'rr-value__num' }, '0');
  const valueSub = h('small', { class: 'rr-value__sub' }, '');
  const value = h('div', { class: 'rr-value', 'aria-hidden': 'true' }, valueNum, valueSub);
  const element = h('div', { class: 'rr-group', role: 'group', 'aria-label': RR_ARIA.groupLabel }, minusButton, value, plusButton, desc);

  let prevValue = -1;
  let prevMinDisabled: boolean | null = null;
  let prevMaxDisabled: boolean | null = null;
  let prevMinusShortcut = '';
  let prevPlusShortcut = '';

  return {
    element,
    minusButton,
    plusButton,
    update(v, min, max, intervalText, describedText, minusShortcut, plusShortcut): void {
      if (v !== prevValue) {
        setText(valueNum, String(v));
        setText(valueSub, intervalText);
        prevValue = v;
      }
      if (desc.textContent !== describedText) setText(desc, describedText);
      const atMin = v <= min;
      if (atMin !== prevMinDisabled) {
        minusButton.setAttribute('aria-disabled', String(atMin));
        minusButton.setAttribute('aria-label', atMin ? `${RR_ARIA.slower}, ${HUD_TOOLBAR.rrMin}` : RR_ARIA.slower);
        prevMinDisabled = atMin;
      }
      const atMax = v >= max;
      if (atMax !== prevMaxDisabled) {
        plusButton.setAttribute('aria-disabled', String(atMax));
        plusButton.setAttribute('aria-label', atMax ? `${RR_ARIA.faster}, ${HUD_TOOLBAR.rrMax}` : RR_ARIA.faster);
        prevMaxDisabled = atMax;
      }
      if (minusShortcut !== prevMinusShortcut) {
        minusButton.setAttribute('aria-keyshortcuts', minusShortcut);
        prevMinusShortcut = minusShortcut;
      }
      if (plusShortcut !== prevPlusShortcut) {
        plusButton.setAttribute('aria-keyshortcuts', plusShortcut);
        prevPlusShortcut = plusShortcut;
      }
    },
  };
}
