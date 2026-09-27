/**
 * Pause menu (DESIGN §5.4): a native <dialog> over the frozen game — `<h2>Paused</h2>`, the
 * objective line ("Saved 3 · need 8 of 20 · 4:12 left"), buttons Resume (initial focus; Esc/P) ·
 * Restart level · Show briefing · How to play · Settings · Quit to levels, and a mini controls
 * cheat-sheet (5 most-used keys, from the live bindings). Restart asks for confirmation INSIDE the
 * dialog ("Restart? Your mumbles go back to the hatch." [Restart] [Cancel]): the button row and
 * objective line are swapped for a confirm row and warning text, without closing the dialog; the
 * promise resolves 'restart' only once confirmed, and Cancel returns to the menu with focus back
 * on Restart. Esc always closes the whole dialog and resolves 'resume' (§6.2.6 "focus returns to
 * the invoker"). The game stays paused while it is open (the controller wraps it in
 * flow.withPause).
 * Owner: E3b2.
 */
import type { ActionId } from '../../input/actions.ts';
import type { KeyBindings } from '../../input/bindings.ts';
import { keyLabel } from '../../input/bindings.ts';
import { h } from '../dom.ts';
import { focusElement } from '../focus.ts';
import { ACTION_LABELS, DIALOG_CHEAT_SHEET_HEADING, PAUSE_MENU } from '../strings.ts';

export type PauseChoice = 'resume' | 'restart' | 'briefing' | 'help' | 'settings' | 'quit';

export interface PauseMenuOptions {
  /** Objective line, already composed (§5.4). */
  readonly objective: string;
  /** Live bindings for the cheat-sheet. */
  readonly bindings: KeyBindings;
}

/** The 5 most-used actions while playing, shown as the mini cheat-sheet (§5.4). */
const CHEAT_SHEET_ACTIONS: readonly ActionId[] = ['assign', 'lemming-next', 'lemming-prev', 'pause', 'fast-forward'];

/** Open the pause menu; resolves with the player's choice ('resume' on Esc). */
export function openPauseMenu(options: PauseMenuOptions): Promise<PauseChoice> {
  return new Promise((resolve) => {
    const resumeButton = h('button', { type: 'button', class: 'button button--primary', onclick: () => finish('resume') }, PAUSE_MENU.resume);
    const restartButton = h('button', { type: 'button', class: 'button', onclick: showConfirm }, PAUSE_MENU.restart);
    const briefingButton = h('button', { type: 'button', class: 'button', onclick: () => finish('briefing') }, PAUSE_MENU.briefing);
    const helpButton = h('button', { type: 'button', class: 'button', onclick: () => finish('help') }, PAUSE_MENU.help);
    const settingsButton = h('button', { type: 'button', class: 'button', onclick: () => finish('settings') }, PAUSE_MENU.settings);
    const quitButton = h('button', { type: 'button', class: 'button button--danger', onclick: () => finish('quit') }, PAUSE_MENU.quit);
    const menuRow = h('div', { class: 'pause-menu__actions' }, resumeButton, restartButton, briefingButton, helpButton, settingsButton, quitButton);

    const confirmYes = h('button', { type: 'button', class: 'button button--danger', onclick: () => finish('restart') }, PAUSE_MENU.restartConfirmYes);
    const confirmCancel = h('button', { type: 'button', class: 'button', onclick: showMenu }, PAUSE_MENU.restartConfirmCancel);
    const confirmRow = h('div', { class: 'pause-menu__actions', hidden: true }, confirmYes, confirmCancel);

    const message = h('p', { id: 'pause-menu-desc', class: 'pause-menu__objective' }, options.objective);

    const dialog = h(
      'dialog',
      { class: 'dialog dialog--pause', 'aria-labelledby': 'pause-menu-title', 'aria-describedby': 'pause-menu-desc' },
      h('h2', { id: 'pause-menu-title', class: 'dialog__title' }, PAUSE_MENU.title),
      message,
      menuRow,
      confirmRow,
      cheatSheet(options.bindings),
    );

    function showConfirm(): void {
      message.textContent = PAUSE_MENU.restartConfirmBody;
      menuRow.hidden = true;
      confirmRow.hidden = false;
      focusElement(confirmCancel);
    }
    function showMenu(): void {
      message.textContent = options.objective;
      confirmRow.hidden = true;
      menuRow.hidden = false;
      focusElement(restartButton);
    }
    function finish(choice: PauseChoice): void {
      dialog.close(choice);
    }

    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve((dialog.returnValue || 'resume') as PauseChoice);
    });
    document.body.append(dialog);
    dialog.showModal();
    focusElement(resumeButton);
  });
}

/** Mini cheat-sheet: `<kbd>` + short label per action, straight from the live bindings. */
function cheatSheet(bindings: KeyBindings): HTMLElement {
  return h(
    'ul',
    { class: 'cheat-sheet', 'aria-label': DIALOG_CHEAT_SHEET_HEADING },
    ...CHEAT_SHEET_ACTIONS.map((action) => {
      const key = keyLabel(bindings[action][0] ?? '');
      return h('li', {}, h('kbd', { class: 'kbd' }, key), ' ', ACTION_LABELS[action]);
    }),
  );
}
