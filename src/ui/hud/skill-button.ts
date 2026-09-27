/**
 * One 80×88 skill button (DESIGN §5.3 state table, §7.2 ARIA row): key hint, count badge, ×3
 * icon, name. `update()` only touches the DOM when a value changed; `flashRefusal()` plays the
 * §5.3/§7.4 shake (or, reduced motion, two ✕-badge blinks).
 *
 * VIS-1 (axe `label-content-name-mismatch`, WCAG 2.5.3): the key-hint digit and count badge are
 * purely decorative visual affordances — the keyboard shortcut is already on `aria-keyshortcuts`,
 * and the count is already spelled out in the label's "N left"/"none left" — but axe compares the
 * *button element's own rendered subtree text* against its accessible name, ignoring
 * `aria-hidden`. Gluing an echo of that text onto the label (the previous fix) made the name read
 * like "Climber, 10 left. 110Climber." to a screen reader. The real fix is to take the key hint
 * and count OUT of the `<button>`'s subtree entirely: `createSkillButton` returns a `.skill-wrap`
 * (`position: relative`) holding the button plus a `.skill-badges` overlay *sibling*
 * (`position: absolute; inset: 0; pointer-events: none; aria-hidden`) that repaints them in the
 * same spot. The button's own visible text is then just the skill name ("Climber"), a clean
 * substring of "Climber, 10 left" — nothing to echo.
 * Owner: e2a-toolbar.
 */
import type { SkillId } from '../../core/types.ts';
import { h, setText } from '../dom.ts';
import { SKILL_NAMES } from '../strings.ts';
import { HUD_TOOLBAR } from '../strings/hud.ts';
import { COUNT_POP_MS, REFUSAL_BLINK_MS, REFUSAL_SHAKE_MS } from '../ui-config.ts';
import { hudIcon } from './hud-icons.ts';

export interface SkillButtonHandle {
  /** `.skill-wrap` — insert THIS into the toolbar (it carries the button plus its badge overlay). */
  readonly element: HTMLElement;
  /** The interactive control itself — focus/roving-tabindex target, and `flashRefusal`'s target. */
  readonly button: HTMLButtonElement;
  readonly skill: SkillId;
  /** `keyHint`/`ariaShortcut` come from the live `KeyBindings` (the toolbar recomputes them). */
  update(count: number, selected: boolean, showKeyHints: boolean, keyHint: string, ariaShortcut: string): void;
  flashRefusal(reducedMotion: boolean): void;
}

export function createSkillButton(skill: SkillId, onSelect: (skill: SkillId) => void): SkillButtonHandle {
  const key = h('span', { class: 'skill__key' }, '');
  const count = h('span', { class: 'skill__count' }, '0');
  const name = h('span', { class: 'skill__name' }, SKILL_NAMES[skill]);
  const button = h(
    'button',
    {
      type: 'button',
      class: 'skill',
      'data-skill': skill,
      tabindex: -1,
      'aria-pressed': 'false',
      onclick: () => onSelect(skill),
    },
    hudIcon(skill),
    name,
  );
  // Decorative overlay (VIS-1): same visual spot as before, but a DOM sibling of `button`, not a
  // descendant — so it's outside the subtree axe compares against the button's accessible name.
  const badges = h('span', { class: 'skill-badges', 'aria-hidden': 'true' }, key, count);
  const element = h('span', { class: 'skill-wrap' }, button, badges);

  let prevCount = -1;
  let prevSelected: boolean | null = null;
  let prevDisabled: boolean | null = null;
  let prevHints: boolean | null = null;
  let prevKeyHint = '';
  let prevShortcut = '';
  let flashTimer: number | null = null;

  return {
    element,
    button,
    skill,
    update(n, selected, showKeyHints, keyHint, ariaShortcut): void {
      if (n !== prevCount) {
        button.setAttribute('aria-label', skillButtonLabel(skill, n));
        setText(count, String(n));
        prevCount = n;
      }
      if (selected !== prevSelected) {
        button.setAttribute('aria-pressed', String(selected));
        prevSelected = selected;
      }
      const disabled = n === 0;
      if (disabled !== prevDisabled) {
        button.setAttribute('aria-disabled', String(disabled));
        prevDisabled = disabled;
      }
      if (showKeyHints !== prevHints) {
        key.hidden = !showKeyHints;
        prevHints = showKeyHints;
      }
      if (keyHint !== prevKeyHint) {
        setText(key, keyHint);
        prevKeyHint = keyHint;
      }
      if (ariaShortcut !== prevShortcut) {
        button.setAttribute('aria-keyshortcuts', ariaShortcut);
        prevShortcut = ariaShortcut;
      }
    },
    flashRefusal(reducedMotion): void {
      if (flashTimer !== null) window.clearTimeout(flashTimer);
      const cls = reducedMotion ? 'skill--refused-blink' : 'skill--refused-shake';
      button.classList.remove('skill--refused-shake', 'skill--refused-blink');
      void button.offsetWidth; // restart the CSS animation even on a repeat flash
      button.classList.add(cls);
      flashTimer = window.setTimeout(() => {
        button.classList.remove(cls);
        flashTimer = null;
      }, reducedMotion ? REFUSAL_BLINK_MS : REFUSAL_SHAKE_MS);
    },
  };
}

/** Skill button accessible name (DESIGN §7.2, verbatim): "Digger, 3 left" / "Digger, none left" —
 * a clean superset of the button's own visible text now that the key hint and count badge live
 * outside its subtree (VIS-1, see file header). */
function skillButtonLabel(skill: SkillId, count: number): string {
  const phrase = count > 0 ? `${count} ${HUD_TOOLBAR.left}` : HUD_TOOLBAR.noneLeft;
  return `${SKILL_NAMES[skill]}, ${phrase}`;
}

/** Count-badge pop (160 ms, none in reduced motion) is applied by the caller when the count drops.
 * Takes the `.skill-wrap` (VIS-1 moved `.skill__count` out of the `<button>` itself). */
export function popCountBadge(wrap: HTMLElement, reducedMotion: boolean): void {
  if (reducedMotion) return;
  const badge = wrap.querySelector<HTMLElement>('.skill__count');
  if (!badge) return;
  badge.classList.remove('skill__count--pop');
  void badge.offsetWidth;
  badge.classList.add('skill__count--pop');
  window.setTimeout(() => badge.classList.remove('skill__count--pop'), COUNT_POP_MS);
}
