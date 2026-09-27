/**
 * Settings → Controls (DESIGN §5.4, §6.1.2, §7.1 A13): the rebinding list, grouped by
 * `ACTION_GROUPS`. Each row shows up to 2 key chips (`keyLabel`); clicking one starts a capture
 * ("Press a key… Esc cancels"). Reserved keys are refused with a message; a clash offers
 * Swap/Cancel; Backspace clears the slot being captured. While capturing, Escape must cancel the
 * capture and NOT close an enclosing `<dialog>` (pause-menu overlay), so this owns two
 * screen-lifetime guards (§6.1.2 build note): a window-level capture-phase `keydown` that beats
 * the dialog's own default action, and a document-level `cancel` guard as a second defense.
 */
import { ACTION_GROUPS, ACTION_LABELS, SETTINGS } from '../strings.ts';
import type { ActionId } from '../../input/actions.ts';
import { FIXED_ACTIONS, keyLabel } from '../../input/bindings.ts';
import { applyRebind, clearKey, findClash, resetAll, validateCapture } from '../../input/rebinding.ts';
import { h } from '../dom.ts';
import { SETTINGS_CAPTURE_HINT, SETTINGS_CONTROLS_HINT, SETTINGS_KEY_EMPTY } from '../strings/settings.ts';
import type { ScreenContext } from './screen.ts';

export interface ControlsSection {
  readonly element: HTMLElement;
  destroy(): void;
}

interface CaptureSession {
  readonly action: ActionId;
  readonly slot: number;
  readonly button: HTMLButtonElement;
  readonly originalLabel: string;
}

/** `announceSaved` lets a rebind/clear/reset share the screen's one "Saved" status text. */
export function createControlsSection(ctx: ScreenContext, announceSaved: () => void): ControlsSection {
  const rows = h('div', { class: 'settings-controls' });
  const status = h('p', { class: 'settings-controls__status', role: 'status' });
  let session: CaptureSession | null = null;

  const chipLabel = (action: ActionId, slot: number): string => {
    const code = ctx.bindings()[action][slot];
    return code ? keyLabel(code) : '—';
  };

  function render(): void {
    const groups = ACTION_GROUPS.map((group) => {
      const actions = group.actions.filter((action) => !FIXED_ACTIONS.has(action));
      if (actions.length === 0) return null;
      return h(
        'div',
        { class: 'settings-controls__group' },
        // VIS-3 (heading-order): was `<h3>` with no `<h2>` anywhere on the page (the Sound/
        // Display/Play/Controls sections are `<fieldset><legend>`, not headings), so the sequence
        // skipped straight from the page's `<h1>` to `<h3>`. `<h2>` here closes that gap.
        h('h2', { class: 'settings-controls__group-title' }, group.label),
        ...actions.map(buildRow),
      );
    }).filter((el): el is HTMLDivElement => el !== null);
    rows.replaceChildren(...groups);
  }

  function buildRow(action: ActionId): HTMLElement {
    const label = ACTION_LABELS[action];
    return h(
      'div',
      { class: 'settings-row settings-row--controls' },
      h('span', { class: 'settings-row__label' }, label),
      h(
        'div',
        { class: 'settings-row__keys', role: 'group', 'aria-label': `Keys for ${label}` },
        buildChip(action, 0, label),
        buildChip(action, 1, label),
      ),
    );
  }

  function buildChip(action: ActionId, slot: number, actionLabel: string): HTMLButtonElement {
    const value = chipLabel(action, slot);
    const spoken = value === '—' ? SETTINGS_KEY_EMPTY : value;
    const button = h(
      'button',
      {
        type: 'button',
        class: `kbd-btn${value === '—' ? ' kbd-btn--empty' : ''}`,
        'data-action': action,
        'data-slot': slot,
        'aria-label': `${SETTINGS.rebind.change} key ${slot + 1} for ${actionLabel}, currently ${spoken}`,
      },
      value,
    );
    button.addEventListener('click', () => beginCapture(action, slot, button));
    return button;
  }

  /** After `render()` rebuilds every row's chips, the just-edited one is a new DOM node and
   * focus would otherwise fall back to `<body>` — keep it on the chip the player just used. */
  function refocus(action: ActionId, slot: number): void {
    rows.querySelector<HTMLButtonElement>(`[data-action="${action}"][data-slot="${slot}"]`)?.focus();
  }

  function setStatus(text: string): void {
    status.replaceChildren(text);
  }

  function beginCapture(action: ActionId, slot: number, button: HTMLButtonElement): void {
    if (session) cancelCapture();
    session = { action, slot, button, originalLabel: button.textContent ?? '' };
    button.textContent = SETTINGS.rebind.pressAKey;
    button.classList.add('kbd-btn--capturing');
    setStatus(SETTINGS_CAPTURE_HINT);
    window.addEventListener('keydown', onCaptureKeydown, true);
  }

  function stopListening(): void {
    window.removeEventListener('keydown', onCaptureKeydown, true);
  }

  function restoreButton(): void {
    if (!session) return;
    session.button.textContent = session.originalLabel;
    session.button.classList.remove('kbd-btn--capturing');
  }

  function cancelCapture(): void {
    if (!session) return;
    stopListening();
    restoreButton();
    session = null;
    setStatus('');
  }

  /** Only fires while `session` is set (capturing OR waiting on a clash decision): beats the
   * dialog's own Escape-to-close default action (registered once, at construction, on `window`
   * — see the class header comment). */
  function onEscapeGuard(event: KeyboardEvent): void {
    if (!session || event.code !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    cancelCapture();
  }

  /** Second defense (build note): if a `<dialog>` ancestor still fires `cancel` while capturing,
   * swallow it too. `cancel` does not bubble, but a capture-phase listener on `document` still
   * sees it on the way down to the `<dialog>` target. */
  function onCancelGuard(event: Event): void {
    if (session) event.preventDefault();
  }

  /** The actual key-listening step: only registered between `beginCapture` and its outcome, so
   * Escape (handled by `onEscapeGuard`, registered earlier and thus dispatched first) never
   * reaches here. */
  function onCaptureKeydown(event: KeyboardEvent): void {
    if (!session) return;
    event.preventDefault();
    event.stopPropagation();
    const code = event.code;
    if (code === 'Backspace') {
      commitClear();
      return;
    }
    const validity = validateCapture(code, session.action);
    if (validity !== 'ok') {
      setStatus(SETTINGS.rebind.reservedKey(keyLabel(code)));
      restoreButton();
      stopListening();
      session = null;
      return;
    }
    const clash = findClash(ctx.bindings(), session.action, code);
    if (clash && clash !== session.action) {
      stopListening();
      showClash(code, clash);
      return;
    }
    commit(code, 'set');
  }

  function showClash(code: string, clashAction: ActionId): void {
    const swap = h('button', { type: 'button', class: 'button' }, SETTINGS.rebind.swap);
    const cancel = h('button', { type: 'button', class: 'button' }, SETTINGS.rebind.cancel);
    swap.addEventListener('click', () => commit(code, 'swap'));
    cancel.addEventListener('click', () => cancelCapture());
    status.replaceChildren(`${SETTINGS.rebind.clash(keyLabel(code), ACTION_LABELS[clashAction])} `, swap, cancel);
    swap.focus();
  }

  function commitClear(): void {
    if (!session) return;
    const { action, slot } = session;
    const next = clearKey(ctx.save.current.settings.bindings, action, slot);
    ctx.save.updateSettings({ bindings: next });
    stopListening();
    session = null;
    setStatus('');
    render();
    refocus(action, slot);
    announceSaved();
  }

  function commit(code: string, mode: 'set' | 'swap'): void {
    if (!session) return;
    const { action, slot } = session;
    const { overrides } = applyRebind(ctx.save.current.settings.bindings, action, slot, code, mode);
    ctx.save.updateSettings({ bindings: overrides });
    session = null;
    setStatus('');
    render();
    refocus(action, slot);
    announceSaved();
  }

  const resetButton = h('button', { type: 'button', class: 'button' }, SETTINGS.rebind.resetDefaults);
  resetButton.addEventListener('click', () => {
    if (session) cancelCapture();
    ctx.save.updateSettings({ bindings: resetAll() });
    render();
    announceSaved();
  });

  window.addEventListener('keydown', onEscapeGuard, true);
  document.addEventListener('cancel', onCancelGuard, true);
  render();

  const element = h(
    'fieldset',
    {},
    h('legend', {}, SETTINGS.sections.controls),
    h('p', { class: 'settings-controls__hint' }, SETTINGS_CONTROLS_HINT),
    rows,
    status,
    resetButton,
  );

  return {
    element,
    destroy(): void {
      stopListening();
      window.removeEventListener('keydown', onEscapeGuard, true);
      document.removeEventListener('cancel', onCancelGuard, true);
    },
  };
}
