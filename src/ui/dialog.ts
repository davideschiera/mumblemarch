/**
 * Generic modal dialogs built on the native <dialog> element (DESIGN §6.2.6, §7.2): the least
 * destructive button gets initial focus, `aria-labelledby`/`aria-describedby` point at the
 * `<h2>`/message, the backdrop and surface come from `.dialog`/`.dialog::backdrop` (§5.4, 60%
 * black), Escape closes natively, focus returns to whatever invoked it (the canvas, when a key
 * did) with no extra work here, and `close` always removes the element from the DOM. Game keys
 * are ignored while a dialog has focus (InputManager `isInDialog`).
 */
import { focusElement } from './focus.ts';
import { h } from './dom.ts';
import { DIALOG_DEFAULT_CANCEL } from './strings.ts';

export interface Choice<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly kind?: 'primary' | 'danger';
}

export interface ChoiceOptions<T extends string> {
  readonly title: string;
  readonly message?: string;
  readonly choices: readonly Choice<T>[];
  /** Choice focused on open (default: the first — callers list the least destructive first). */
  readonly initial?: T;
}

let nextDialogId = 0;

/** Open a modal with one button per choice. Resolves with the chosen id, or null on Escape. */
export function choiceDialog<T extends string>(options: ChoiceOptions<T>): Promise<T | null> {
  return new Promise((resolve) => {
    const uid = nextDialogId++;
    const titleId = `dialog-title-${uid}`;
    const messageId = `dialog-message-${uid}`;
    const buttons = options.choices.map((choice) =>
      h('button', { type: 'button', class: `button${choice.kind ? ` button--${choice.kind}` : ''}`, value: choice.id }, choice.label),
    );
    const dialog = h(
      'dialog',
      { class: 'dialog', 'aria-labelledby': titleId, 'aria-describedby': options.message ? messageId : undefined },
      h('h2', { id: titleId, class: 'dialog__title' }, options.title),
      options.message ? h('p', { id: messageId, class: 'dialog__message' }, options.message) : null,
      h('div', { class: 'dialog__actions' }, ...buttons),
    );
    for (const button of buttons) button.addEventListener('click', () => dialog.close(button.value));
    dialog.addEventListener('close', () => {
      dialog.remove();
      const chosen = options.choices.find((c) => c.id === dialog.returnValue);
      resolve(chosen ? chosen.id : null);
    });
    document.body.append(dialog);
    dialog.showModal();
    focusElement(buttons.find((b) => b.value === options.initial) ?? buttons[0]);
  });
}

export interface ConfirmOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel?: string;
}

/** Yes/no confirmation; the safe option (cancel) is focused first. */
export async function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  const result = await choiceDialog({
    title: options.title,
    message: options.message,
    choices: [
      { id: 'cancel', label: options.cancelLabel ?? DIALOG_DEFAULT_CANCEL },
      { id: 'confirm', label: options.confirmLabel, kind: 'danger' },
    ],
    initial: 'cancel',
  });
  return result === 'confirm';
}
