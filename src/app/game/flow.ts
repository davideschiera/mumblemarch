/**
 * FlowControl — time and the level's life cycle: pause/resume + plate + pending ids + `Ready:`
 * count (DESIGN §6.4.1), frame-step with hold repeat (300 ms, then 10/s; Shift = 17 ticks) and
 * the `Tick n (+1)` note (§6.4.2), fast-forward ×3 and the Game speed setting (§6.4.3),
 * auto-pause (tab hidden, window blur per setting, dialogs; never auto-resume — §6.4.8),
 * `withPause` for dialogs, and level end → save.recordResult (with inTime) → results after a
 * delay. The controller copies `state.paused` / `speed()` into the GameLoop every frame.
 * Writes PlayState: paused, userPaused, fastForward, pendingIds (clears), tickNote, dialogOpen, ended.
 * Owner: E5a2. inTime/ResultRecord arithmetic lives in the pure `flow-result.ts` (unit-testable).
 */
import type { GameEvent, LevelOutcome } from '../../core/types.ts';
import type { ActionPhase } from '../../input/handler.ts';
import { ANNOUNCE, STATUS } from '../../ui/strings.ts';
import {
  FRAME_STEP_ANNOUNCE_DEBOUNCE_MS,
  FRAME_STEP_REPEAT_DELAY_MS,
  FRAME_STEP_REPEAT_MS,
  FRAME_STEP_SHIFT_TICKS,
  RESULTS_DELAY_MS,
  TICK_NOTE_MS,
} from '../config.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { computeResultRecord } from './flow-result.ts';
import { HoldRepeater } from './hold-repeat.ts';
import { loopSpeed } from './rules.ts';

export type AutoPauseReason = 'hidden' | 'blur' | 'dialog';

export class FlowControl {
  /** When false (test hook), the results screen is not opened automatically. */
  autoAdvance = true;
  private readonly ctx: PlayContext;
  private readonly stepHold = new HoldRepeater(FRAME_STEP_REPEAT_DELAY_MS, FRAME_STEP_REPEAT_MS);
  private stepTicks = 1;
  private endTimer: number | null = null;
  /** §7.3 #16: at most one "Stepped …" announcement per FRAME_STEP_ANNOUNCE_DEBOUNCE_MS. */
  private lastStepAnnounceMs = -Infinity;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.1.1 P / Pause button / pause menu Resume: toggle, announce #15 (key 'pause'). */
  togglePause(_source: CommandSource): void {
    this.setPaused(!this.ctx.state.paused, { announce: true, user: true });
  }

  /**
   * Set the pause state. `user` marks an explicit player pause (pauseWhileChoosing never
   * resumes it). `announce` also plays the pause/unpause UI sound (§6.1.1) and #15 (§7.3).
   */
  setPaused(paused: boolean, options: { readonly announce?: boolean; readonly user?: boolean } = {}): void {
    const { state } = this.ctx;
    if (options.user !== undefined) state.userPaused = paused && options.user;
    if (state.paused === paused) return;
    state.paused = paused;
    this.ctx.modules.audio.setPaused(paused);
    if (options.announce) {
      this.ctx.uiSound(paused ? 'pause' : 'unpause');
      this.ctx.say(ANNOUNCE.paused(paused), { key: 'pause', userInitiated: true });
    }
  }

  /** §6.2.6 dialogs: pause while `task` runs, then restore the previous pause state (§6.4.8). */
  async withPause<T>(task: () => Promise<T>): Promise<T> {
    const { state } = this.ctx;
    const wasPaused = state.paused;
    state.dialogOpen = true;
    this.setPaused(true);
    try {
      return await task();
    } finally {
      state.dialogOpen = false;
      this.setPaused(wasPaused);
    }
  }

  /**
   * §6.1.1/§6.4.2 '.': paused → step 1 tick (Shift 17) now, hold repeats after 300 ms at 10/s;
   * running → pause (no step). Sets the `Tick n (+k)` note and announces #16 (debounced 300 ms).
   */
  frameStep(phase: ActionPhase, shift: boolean): void {
    if (phase === 'up') {
      this.stepHold.release();
      return;
    }
    if (!this.ctx.state.paused) {
      this.setPaused(true, { announce: true, user: true });
      return;
    }
    this.stepTicks = shift ? FRAME_STEP_SHIFT_TICKS : 1;
    this.stepHold.press();
    this.doStep();
  }

  /** §6.4.3 F / Fast button: toggle ×3 (stays on across pause; off at level end/restart), ff-on/off sound, #17. */
  toggleFast(_source: CommandSource): void {
    const { state } = this.ctx;
    state.fastForward = !state.fastForward;
    this.ctx.uiSound(state.fastForward ? 'ff-on' : 'ff-off');
    this.ctx.say(ANNOUNCE.fastForward(state.fastForward), { key: 'speed', userInitiated: true });
  }

  /** Loop speed multiplier: ×3 when fast-forwarding, × settings.gameSpeed (§6.4.3). */
  speed(): number {
    return loopSpeed(this.ctx.state.fastForward, this.ctx.settings().gameSpeed);
  }

  /** §6.4.8 auto-pause (tab hidden; window blur when settings.pauseOnBlur); says "Paused". Never resumes. */
  autoPause(reason: AutoPauseReason): void {
    if (reason === 'blur' && !this.ctx.settings().pauseOnBlur) return;
    if (!this.ctx.state.paused) this.setPaused(true, { announce: true, user: true });
  }

  /** After every tick (real time, frame-step, test hook): the pending jobs have started (§6.4.1). */
  onTick(_tick: number): void {
    const { state } = this.ctx;
    if (state.pendingIds.length > 0) state.pendingIds = [];
  }

  /** Level end: FF off, record progress (§7.9 inTime), then the results screen after RESULTS_DELAY_MS. */
  handleEvents(events: readonly GameEvent[]): void {
    for (const event of events) if (event.type === 'level-ended') this.onLevelEnded(event.outcome);
  }

  /** Per frame: frame-step hold repeat. */
  frame(elapsedMs: number): void {
    for (let n = this.stepHold.advance(elapsedMs); n > 0 && this.ctx.state.paused; n--) this.doStep();
  }

  /** §6.4.1 `Ready: {n} jobs start when you resume` count (0 hides it). */
  readyJobs(): number {
    return this.ctx.state.paused ? this.ctx.state.pendingIds.length : 0;
  }

  /** §6.4.2 `Tick 312 (+1)` while fresh, else null. */
  tickNote(): string | null {
    const note = this.ctx.state.tickNote;
    return note && note.untilMs > this.ctx.state.nowMs ? note.text : null;
  }

  destroy(): void {
    if (this.endTimer !== null) window.clearTimeout(this.endTimer);
    this.endTimer = null;
  }

  private doStep(): void {
    const { state, session } = this.ctx;
    this.ctx.step(this.stepTicks);
    state.tickNote = { text: STATUS.tick(session.tick, this.stepTicks), kind: 'info', untilMs: state.nowMs + TICK_NOTE_MS };
    if (state.nowMs - this.lastStepAnnounceMs >= FRAME_STEP_ANNOUNCE_DEBOUNCE_MS) {
      this.lastStepAnnounceMs = state.nowMs;
      this.ctx.say(ANNOUNCE.stepped(this.stepTicks), { key: 'step', level: 'all' });
    }
  }

  /** §7.9: FF off, record progress (inTime BEFORE it changes bestSaved/attempts), remember lastLevel. */
  private onLevelEnded(outcome: LevelOutcome): void {
    const { state, services, session } = this.ctx;
    state.ended = true;
    state.fastForward = false;
    const prev = services.save.current.progress[session.level.id];
    const record = computeResultRecord(outcome, session.relaxedTimer, prev);
    services.save.recordResult(session.level.id, outcome.saved, outcome.won, record.inTime);
    services.save.setLastLevel(session.level.id);
    if (!this.autoAdvance) return;
    this.endTimer = window.setTimeout(() => this.ctx.nav.results(outcome, record), RESULTS_DELAY_MS);
  }
}
