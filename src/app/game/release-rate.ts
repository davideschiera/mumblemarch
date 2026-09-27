/**
 * ReleaseRateControl — release rate −/+ (DESIGN §6.1.1, §6.4.4): ±1 per press, Shift ±10; hold:
 * first step on press, repeat after 400 ms every 60 ms (Shift every 150 ms). A step predicted to
 * hit the `[level minimum, 99]` limit (rr-limits.ts) is never sent as a command: it plays
 * `ui-deny`, shows the limit status text and stops the hold (repeating into a limit is pointless).
 * An accepted step plays `rr-up`/`rr-down` at input time (§8.1 S6) and (re)starts the 500 ms
 * debounce for #14 ("Release rate {rr}, one every {s} seconds", "…, the lowest for this level"
 * at the minimum). Keys and the HUD −/+ buttons (pointer hold) share this.
 * Owner: E5a.
 */
import type { ActionPhase } from '../../input/handler.ts';
import { ANNOUNCE, GAME_RR_ABOVE_MAX, STATUS, rrIntervalSeconds } from '../../ui/strings.ts';
import { RR_ANNOUNCE_DEBOUNCE_MS, RR_MAX, RR_REPEAT_DELAY_MS, RR_REPEAT_MS, RR_REPEAT_SHIFT_MS, STATUS_REFUSAL_MS } from '../config.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { HoldRepeater } from './hold-repeat.ts';
import { releaseRateStepAmount, releaseRateWouldChange } from './rr-limits.ts';

export class ReleaseRateControl {
  private readonly ctx: PlayContext;
  private readonly hold = new HoldRepeater(RR_REPEAT_DELAY_MS, RR_REPEAT_MS);
  private dir: -1 | 1 = 1;
  private shift = false;
  private source: CommandSource = 'key';
  /** `state.nowMs` of the last accepted step, or null when the #14 announce is not pending. */
  private lastChangeAtMs: number | null = null;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** The level minimum (the level's initial rate, §6.4.4). */
  get min(): number {
    return this.ctx.session.level.releaseRate;
  }

  get max(): number {
    return RR_MAX;
  }

  /** −/+ key or HUD button down/up. Down: one step now + start the hold repeat. */
  press(dir: -1 | 1, phase: ActionPhase, shift: boolean, source: CommandSource): void {
    if (phase === 'up') {
      if (dir === this.dir) this.hold.release();
      return;
    }
    this.dir = dir;
    this.shift = shift;
    this.source = source;
    this.hold.intervalMs = shift ? RR_REPEAT_SHIFT_MS : RR_REPEAT_MS;
    this.hold.press();
    this.stepOnce();
  }

  /** Per frame (also while paused): hold repeat, and the #14 debounce once things settle. */
  frame(_elapsedMs: number): void {
    for (let n = this.hold.advance(_elapsedMs); n > 0; n--) this.stepOnce();
    const since = this.lastChangeAtMs;
    if (since !== null && this.ctx.state.nowMs - since >= RR_ANNOUNCE_DEBOUNCE_MS) {
      this.lastChangeAtMs = null;
      this.announceSettled();
    }
  }

  private stepOnce(): void {
    const delta = releaseRateStepAmount(this.dir, this.shift);
    const current = this.ctx.session.releaseRate;
    if (!releaseRateWouldChange(current, delta, this.min, this.max)) {
      this.hold.release();
      this.ctx.uiSound('ui-deny');
      const text = this.dir === -1 ? STATUS.rrBelowMin(this.min) : GAME_RR_ABOVE_MAX;
      this.ctx.setStatus(text, 'refusal', STATUS_REFUSAL_MS);
      return;
    }
    this.ctx.command({ type: 'adjust-release-rate', delta }, this.source);
    this.ctx.uiSound(this.dir === 1 ? 'rr-up' : 'rr-down');
    this.lastChangeAtMs = this.ctx.state.nowMs;
  }

  private announceSettled(): void {
    const rr = this.ctx.session.releaseRate;
    const seconds = rrIntervalSeconds(rr).toFixed(1);
    this.ctx.say(ANNOUNCE.releaseRate(rr, seconds, rr <= this.min), { key: 'rr', userInitiated: true });
  }
}
