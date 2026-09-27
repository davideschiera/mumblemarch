/**
 * Pause / Fast / Pop all / ☰ Menu controls (DESIGN §5.3 "Controls", §7.2 rows). Pop all is a
 * 3-state arm/confirm button (idle → armed "Press again" → popping "Popping…"); its `data-state`
 * attribute drives the armed border pulse in CSS (off under `[data-motion='reduce']`, §7.4).
 * Owner: e2a-toolbar.
 */
import type { PopAllState } from './types.ts';
import { h, setText } from '../dom.ts';
import { ACTION_LABELS, HUD } from '../strings.ts';
import { HUD_TOOLBAR } from '../strings/hud.ts';
import { hudIcon } from './hud-icons.ts';

export interface ControlsCallbacks {
  onPause(): void;
  onFastForward(): void;
  onPopAll(): void;
  onMenu(): void;
}

export interface ControlsHandle {
  /** Wraps Pause + Fast + Pop all (the ☰ Menu button sits after its own separator, §5.1). */
  readonly element: HTMLElement;
  readonly pauseButton: HTMLButtonElement;
  readonly fastButton: HTMLButtonElement;
  readonly popAllButton: HTMLButtonElement;
  readonly menuButton: HTMLButtonElement;
  update(
    paused: boolean,
    fastForward: boolean,
    popAll: PopAllState,
    shortcuts: { readonly pause: string; readonly fast: string; readonly popAll: string; readonly menu: string },
  ): void;
}

let nextId = 0;

export function createControls(callbacks: ControlsCallbacks): ControlsHandle {
  const pauseButton = h(
    'button',
    { type: 'button', class: 'hud-button', 'aria-pressed': 'false', onclick: () => callbacks.onPause() },
    hudIcon('pause'),
    h('span', {}, HUD_TOOLBAR.pause),
  );
  const fastButton = h(
    'button',
    { type: 'button', class: 'hud-button', 'aria-pressed': 'false', 'aria-label': HUD_TOOLBAR.fastForwardLabel, onclick: () => callbacks.onFastForward() },
    hudIcon('fastForward'),
    h('span', {}, HUD_TOOLBAR.fast),
  );
  const popDescId = `pop-desc-${(nextId += 1)}`;
  // Only referenced (aria-describedby) while armed; `hidden` also pulls it out of the a11y tree
  // the rest of the time — a screen reader's virtual cursor could otherwise still land on this
  // "visually-hidden" text even with no describedby pointing at it (DESIGN §6.4.5/§7.2).
  const popDesc = h('span', { class: 'visually-hidden', id: popDescId, hidden: true }, HUD.popBubble);
  const popText = h('span', {}, HUD.popAll);
  const popAllButton = h(
    'button',
    { type: 'button', class: 'hud-button hud-button--pop', 'data-state': 'idle', onclick: () => callbacks.onPopAll() },
    hudIcon('popAll'),
    popText,
  );
  const menuButton = h('button', { type: 'button', class: 'hud-button hud-button--menu', 'aria-label': ACTION_LABELS.menu }, '☰');
  menuButton.addEventListener('click', () => callbacks.onMenu());

  const element = h('div', { class: 'toolbar__controls' }, pauseButton, fastButton, popAllButton, popDesc);

  let prevPaused: boolean | null = null;
  let prevFast: boolean | null = null;
  let prevPop: PopAllState | null = null;
  const prevShortcuts = { pause: '', fast: '', popAll: '', menu: '' };

  return {
    element,
    pauseButton,
    fastButton,
    popAllButton,
    menuButton,
    update(paused, fastForward, popAll, shortcuts): void {
      if (paused !== prevPaused) {
        pauseButton.setAttribute('aria-pressed', String(paused));
        prevPaused = paused;
      }
      if (fastForward !== prevFast) {
        fastButton.setAttribute('aria-pressed', String(fastForward));
        prevFast = fastForward;
      }
      if (popAll !== prevPop) {
        popAllButton.dataset['state'] = popAll;
        setText(popText, popAll === 'armed' ? HUD.popArmed : popAll === 'popping' ? HUD.popping : HUD.popAll);
        popDesc.hidden = popAll !== 'armed';
        if (popAll === 'armed') {
          popAllButton.setAttribute('aria-label', HUD_TOOLBAR.confirmPopAll);
          popAllButton.setAttribute('aria-describedby', popDescId);
        } else {
          popAllButton.removeAttribute('aria-label');
          popAllButton.removeAttribute('aria-describedby');
        }
        popAllButton.setAttribute('aria-disabled', String(popAll === 'popping'));
        prevPop = popAll;
      }
      if (shortcuts.pause !== prevShortcuts.pause) {
        pauseButton.setAttribute('aria-keyshortcuts', shortcuts.pause);
        prevShortcuts.pause = shortcuts.pause;
      }
      if (shortcuts.fast !== prevShortcuts.fast) {
        fastButton.setAttribute('aria-keyshortcuts', shortcuts.fast);
        prevShortcuts.fast = shortcuts.fast;
      }
      if (shortcuts.popAll !== prevShortcuts.popAll) {
        popAllButton.setAttribute('aria-keyshortcuts', shortcuts.popAll);
        prevShortcuts.popAll = shortcuts.popAll;
      }
      if (shortcuts.menu !== prevShortcuts.menu) {
        menuButton.setAttribute('aria-keyshortcuts', shortcuts.menu);
        prevShortcuts.menu = shortcuts.menu;
      }
    },
  };
}
