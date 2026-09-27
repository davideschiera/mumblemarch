/**
 * In-game overlays (DESIGN §6.1.1 B/H, §5.4 pause-menu entries, §7.10): modal native <dialog>s
 * that keep the game screen alive underneath — the level briefing, How to play and Settings.
 * Each resolves when closed (Esc or its Close button; focus returns to the invoker natively).
 * The CONTROLLER keeps the game paused while one is open and restores the previous pause state
 * on close (flow.withPause) — these functions know nothing about the game.
 * Decision (E0): Settings from the pause menu opens as an overlay too, because navigating to the
 * settings screen would destroy the run.
 * Owner: E3b2 (briefing content is shared with E3a2's briefing screen; settings with E3b1's).
 * Each screen builder gets `{ overlay: true }` (CONTRACTS) so it renders its overlay variant: an
 * `<h2>` (this file's `aria-labelledby` target) plus one Close/"Back to the game" button instead
 * of its normal navigation buttons.
 */
import type { LevelDef } from '../../levels/format.ts';
import { h } from '../dom.ts';
import { focusElement } from '../focus.ts';
import { createBriefingScreen } from '../screens/briefing.ts';
import { createHelpScreen } from '../screens/help.ts';
import type { Screen, ScreenContext } from '../screens/screen.ts';
import { createSettingsScreen } from '../screens/settings.ts';

/** §6.1.1 B: the level briefing as a modal (Close gets initial focus). */
export function openBriefingOverlay(ctx: ScreenContext, level: LevelDef): Promise<void> {
  return openScreenOverlay(ctx, (overlayCtx) => createBriefingScreen(overlayCtx, level, { overlay: true }));
}

/** §6.1.1 H/F1 and pause menu "How to play": help as a modal (§7.10). */
export function openHelpOverlay(ctx: ScreenContext): Promise<void> {
  return openScreenOverlay(ctx, (overlayCtx) => createHelpScreen(overlayCtx, { screen: 'title' }, { overlay: true }));
}

/** Pause menu "Settings" (§7.11) as a modal; changes apply at once. */
export function openSettingsOverlay(ctx: ScreenContext): Promise<void> {
  return openScreenOverlay(ctx, (overlayCtx) => createSettingsScreen(overlayCtx, { screen: 'title' }, { overlay: true }));
}

/** Mount a screen's content in a modal dialog; any navigate() from inside just closes it. */
function openScreenOverlay(ctx: ScreenContext, build: (overlayCtx: ScreenContext) => Screen): Promise<void> {
  return new Promise((resolve) => {
    const dialog = h('dialog', { class: 'dialog dialog--overlay' });
    const overlayCtx: ScreenContext = { ...ctx, navigate: () => dialog.close() };
    const screen = build(overlayCtx);
    const heading = screen.element.querySelector<HTMLElement>('h1, h2');
    if (heading) {
      heading.id = heading.id || 'overlay-title';
      dialog.setAttribute('aria-labelledby', heading.id);
    }
    dialog.append(screen.element);
    dialog.addEventListener('close', () => {
      screen.destroy();
      dialog.remove();
      resolve();
    });
    document.body.append(dialog);
    dialog.showModal();
    focusElement(screen.focusTarget?.() ?? heading);
  });
}
