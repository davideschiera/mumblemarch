/**
 * Toolbar — the in-game control bar (DESIGN §5.3, §6.2.6, §7.2): release-rate group, the 8 skill
 * buttons, Pause, Fast, Pop all and ☰ menu, as ONE `role="toolbar"` Tab stop with a roving
 * tabindex (ARIA toolbar pattern: ←/→ move with wrap, Home/End first/last, `aria-disabled` items
 * stay focusable, re-entry lands on the last-focused item — initially the selected skill).
 * This is the seam between the toolbar (owner: e2a-toolbar) and the game view that composes it
 * (`ui/screens/game.ts`, owner: e2b-hud-view): keep this class's public API stable.
 */
import { SKILL_IDS, type SkillId } from '../../core/types.ts';
import type { ActionId } from '../../input/actions.ts';
import { ariaKeyShortcuts, keyLabel, type KeyBindings } from '../../input/bindings.ts';
import { h } from '../dom.ts';
import { RR_ARIA, rrIntervalText } from '../strings.ts';
import { HUD_TOOLBAR } from '../strings/hud.ts';
import { createControls } from './controls.ts';
import { createRrGroup } from './rr-group.ts';
import { createSkillButton, popCountBadge, type SkillButtonHandle } from './skill-button.ts';
import type { HudCallbacks, HudState } from './types.ts';

export interface ToolbarOptions {
  readonly bindings: KeyBindings;
  readonly callbacks: HudCallbacks;
}

const skillAction = (skill: SkillId): ActionId => `skill-${skill}`;

export class Toolbar {
  /** The `role="toolbar"` element (the view places it under the status row). */
  readonly element: HTMLElement;
  private readonly items: readonly HTMLButtonElement[];
  private readonly skillButtons: ReadonlyMap<SkillId, SkillButtonHandle>;
  private readonly rr: ReturnType<typeof createRrGroup>;
  private readonly controls: ReturnType<typeof createControls>;
  private focusedIndex = 0;
  private hasFocusedOnce = false;
  private reducedMotion = false;
  private prevCounts: HudState['skills'] | null = null;

  constructor(options: ToolbarOptions) {
    const { callbacks } = options;
    const rr = createRrGroup({ onReleaseRate: (d, p, s) => callbacks.onReleaseRate(d, p, s) });
    const skillButtons = new Map<SkillId, SkillButtonHandle>();
    for (const skill of SKILL_IDS) skillButtons.set(skill, createSkillButton(skill, (s) => callbacks.onSelectSkill(s)));
    const skillHandles = SKILL_IDS.map((skill) => skillButtons.get(skill)!);
    // VIS-1: insert each `.skill-wrap` (button + its decorative badge overlay), not the bare
    // button — the roving-tabindex `this.items` list below still wants the buttons themselves.
    const skillsWrap = h(
      'div',
      { class: 'toolbar__skills' },
      ...skillHandles.map((handle) => handle.element),
    );
    const controls = createControls({
      onPause: () => callbacks.onPause(),
      onFastForward: () => callbacks.onFastForward(),
      onPopAll: () => callbacks.onPopAll(),
      onMenu: () => callbacks.onMenu(),
    });
    const sep = (n: 1 | 2 | 3): HTMLElement => h('span', { class: `toolbar__sep toolbar__sep--${n}`, 'aria-hidden': 'true' });

    this.element = h(
      'div',
      { class: 'toolbar', role: 'toolbar', 'aria-label': HUD_TOOLBAR.ariaLabel, 'data-arrow-keys': true },
      rr.element,
      sep(1),
      skillsWrap,
      sep(2),
      controls.element,
      sep(3),
      controls.menuButton,
    );

    this.items = [
      rr.minusButton,
      rr.plusButton,
      ...skillHandles.map((handle) => handle.button),
      controls.pauseButton,
      controls.fastButton,
      controls.popAllButton,
      controls.menuButton,
    ];
    for (const [i, item] of this.items.entries()) item.tabIndex = i === 0 ? 0 : -1;

    // Mouse never parks focus on the HUD (§6.2.6): clicks activate via `click` but must not
    // shift keyboard focus here, or the next Space/Enter would re-press this button instead of
    // reaching the game.
    this.element.addEventListener('mousedown', (e) => e.preventDefault());
    this.element.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.element.addEventListener('focusin', (e) => {
      const idx = this.items.indexOf(e.target as HTMLButtonElement);
      if (idx < 0) return;
      this.hasFocusedOnce = true;
      this.setFocusedIndex(idx);
    });

    this.rr = rr;
    this.controls = controls;
    this.skillButtons = skillButtons;
  }

  /** Render the frame's state; only changed values touch the DOM (§5.3). */
  update(state: HudState): void {
    this.reducedMotion = state.reducedMotion;
    const { bindings } = state;

    this.rr.update(
      state.releaseRate.value,
      state.releaseRate.min,
      state.releaseRate.max,
      rrIntervalText(state.releaseRate.value),
      RR_ARIA.describedText(state.releaseRate.value),
      ariaKeyShortcuts(bindings['release-rate-down']),
      ariaKeyShortcuts(bindings['release-rate-up']),
    );

    for (const skill of SKILL_IDS) {
      const handle = this.skillButtons.get(skill);
      if (!handle) continue;
      const count = state.skills[skill];
      const prevCount = this.prevCounts?.[skill];
      const codes = bindings[skillAction(skill)];
      const keyHint = state.showKeyHints ? keyLabel(codes[0] ?? '') : '';
      handle.update(count, state.selectedSkill === skill, state.showKeyHints, keyHint, ariaKeyShortcuts(codes));
      if (prevCount !== undefined && count < prevCount) popCountBadge(handle.element, state.reducedMotion);
    }
    this.prevCounts = state.skills;

    this.controls.update(state.paused, state.fastForward, state.popAll, {
      pause: ariaKeyShortcuts(bindings.pause),
      fast: ariaKeyShortcuts(bindings['fast-forward']),
      popAll: ariaKeyShortcuts(bindings.nuke),
      menu: ariaKeyShortcuts(bindings.menu),
    });

    if (!this.hasFocusedOnce) {
      const selected = state.selectedSkill ? this.skillButtons.get(state.selectedSkill) : undefined;
      this.setFocusedIndex(selected ? this.items.indexOf(selected.button) : 0);
    }
  }

  /** §5.3 refusal flash on a skill button (shake; reduced motion: 2 ✕ blinks). */
  flashRefusal(skill: SkillId): void {
    this.skillButtons.get(skill)?.flashRefusal(this.reducedMotion);
  }

  /** Clear timers (the element itself is removed with the screen). */
  destroy(): void {}

  private onKeyDown(e: KeyboardEvent): void {
    const last = this.items.length - 1;
    let next: number;
    switch (e.key) {
      case 'ArrowLeft':
        next = this.focusedIndex === 0 ? last : this.focusedIndex - 1;
        break;
      case 'ArrowRight':
        next = this.focusedIndex === last ? 0 : this.focusedIndex + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    e.preventDefault();
    this.items[next]?.focus();
  }

  private setFocusedIndex(idx: number): void {
    if (idx < 0 || idx === this.focusedIndex) return;
    const prev = this.items[this.focusedIndex];
    const next = this.items[idx];
    if (prev) prev.tabIndex = -1;
    if (next) next.tabIndex = 0;
    this.focusedIndex = idx;
  }
}
