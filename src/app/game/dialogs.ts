/**
 * GameDialogs — opening the in-game modals and acting on their result: the pause menu (Esc / ☰,
 * DESIGN §5.4) and the briefing (B), help (H/F1) and settings overlays (§6.1.1). Every dialog runs
 * inside flow.withPause (auto-pause; the previous pause state is restored on close, §6.4.8);
 * only one opens at a time. Pause-menu choices: resume · restart (already confirmed in the
 * dialog) · briefing · help · settings · quit.
 * Owner: E5a2.
 */
import { openPauseMenu } from '../../ui/dialogs/pause-menu.ts';
import { openBriefingOverlay, openHelpOverlay, openSettingsOverlay } from '../../ui/dialogs/overlay.ts';
import { formatClock, PAUSE_MENU } from '../../ui/strings.ts';
import type { PlayContext } from './context.ts';

export class GameDialogs {
  private readonly ctx: PlayContext;
  private busy = false;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** A dialog is open (Esc priority step 1 is native: the dialog closes itself). */
  get isOpen(): boolean {
    return this.busy;
  }

  /** §5.4 pause menu (Esc priority step 4, ☰ button). */
  async menu(): Promise<void> {
    const choice = await this.run(() => openPauseMenu({ objective: this.objective(), bindings: this.ctx.services.bindings() }));
    switch (choice) {
      case 'restart':
        this.ctx.nav.restart();
        return;
      case 'quit':
        this.ctx.nav.quit();
        return;
      case 'briefing':
        return this.briefing();
      case 'help':
        return this.help();
      case 'settings':
        return this.settings();
      default:
        return;
    }
  }

  /** §6.1.1 B: the level briefing overlay. */
  async briefing(): Promise<void> {
    await this.run(() => openBriefingOverlay(this.ctx.screen, this.ctx.level));
  }

  /** §6.1.1 H/F1: How to play overlay. */
  async help(): Promise<void> {
    await this.run(() => openHelpOverlay(this.ctx.screen));
  }

  /** Pause menu → Settings overlay (§7.11). */
  async settings(): Promise<void> {
    await this.run(() => openSettingsOverlay(this.ctx.screen));
  }

  private async run<T>(open: () => Promise<T>): Promise<T | null> {
    if (this.busy) return null;
    this.busy = true;
    try {
      return await this.ctx.modules.flow.withPause(open);
    } finally {
      this.busy = false;
    }
  }

  /** §5.4 objective line: "Saved 3 · need 8 of 20 · 4:12 left". */
  private objective(): string {
    const { counts, timeLeftTicks } = this.ctx.session;
    return PAUSE_MENU.objective(counts.saved, counts.required, counts.total, formatClock(timeLeftTicks));
  }
}
