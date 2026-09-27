/**
 * UndoControl — undo the last assignment (DESIGN §6.4.7, SHOULD/stretch): U removes the most
 * recent `assign-skill`/`nuke` from `session.replay().commands`, rebuilds a GameSession from
 * (level, seed, relaxedTimer, remaining commands), runs it headless to the current tick with the
 * sinks muted (the rebuilt session is never handed to a sink until it replaces the live one), and
 * swaps it in via `ctx.replaceSession()`, leaving the game paused. Plays `undo`, shows the
 * "Undone" toast (the restored skill count follows from the rebuilt session automatically), and
 * announces "Undid {Skill}. Paused." (#28); "Rewinding…" when the rebuild takes longer than
 * `UNDO_REWIND_NOTICE_MS`. Nothing to undo → `ui-deny` + "Nothing to undo". Repeatable. RR
 * commands are kept (`planUndo` only ever drops the last assign-skill/nuke).
 * Owner: E5a2. The pure mechanics (find/drop, rebuild) live in `undo-commands.ts`.
 */
import { ANNOUNCE, STATUS } from '../../ui/strings.ts';
import { FLOW_UNDO_NUKE } from '../../ui/strings/flow.ts';
import { STATUS_INFO_MS, UNDO_REWIND_NOTICE_MS } from '../config.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { planUndo, rebuildSession } from './undo-commands.ts';

export class UndoControl {
  private readonly ctx: PlayContext;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.4.7 U. */
  undo(_source: CommandSource): void {
    const { ctx } = this;
    const { session } = ctx;
    const replay = session.replay();
    const plan = planUndo(replay.commands);
    if (!plan) {
      ctx.uiSound('ui-deny');
      ctx.say(ANNOUNCE.undo(null), { key: 'undo', userInitiated: true });
      return;
    }

    const currentTick = session.tick;
    const startedAt = Date.now();
    const next = rebuildSession(session.level, replay.seed, replay.relaxedTimer, plan.remaining, currentTick);
    ctx.replaceSession(next);
    ctx.modules.flow.setPaused(true, { user: true });
    if (Date.now() - startedAt > UNDO_REWIND_NOTICE_MS) ctx.setStatus(STATUS.rewinding, 'info', STATUS_INFO_MS);

    ctx.uiSound('undo');
    ctx.view.showToast(STATUS.undone, 'info');
    const removed = plan.removed.command;
    ctx.say(removed.type === 'assign-skill' ? ANNOUNCE.undo(removed.skill) : FLOW_UNDO_NUKE, {
      key: 'undo',
      userInitiated: true,
    });
  }
}
