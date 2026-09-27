/**
 * Tick-stamped command queue. The app (input) and the test hook enqueue commands; the session
 * drains the ones due at the start of each tick. Everything applied is also recorded, so a
 * finished run can be exported as a {@link Replay}.
 */
import type { GameCommand, TimedCommand } from './types.ts';

export class CommandQueue {
  private pending: TimedCommand[] = [];
  private readonly applied: TimedCommand[] = [];

  /** Queue `command` for `tick` (commands for past ticks run on the next tick). */
  push(command: GameCommand, tick: number): void {
    const entry: TimedCommand = { tick, command };
    // Keep sorted by tick; stable for equal ticks (FIFO).
    let i = this.pending.length;
    while (i > 0 && (this.pending[i - 1]?.tick ?? 0) > tick) i--;
    this.pending.splice(i, 0, entry);
  }

  /** Remove and return every command due at or before `tick`, in order. Records them. */
  takeDue(tick: number): GameCommand[] {
    let n = 0;
    while (n < this.pending.length && (this.pending[n]?.tick ?? Infinity) <= tick) n++;
    const due = this.pending.slice(0, n);
    this.pending = this.pending.slice(n);
    for (const entry of due) this.applied.push({ tick, command: entry.command });
    return due.map((entry) => entry.command);
  }

  /** Record a command applied immediately (GameSession.applyNow) at `tick`. */
  record(command: GameCommand, tick: number): void {
    this.applied.push({ tick, command });
  }

  get size(): number {
    return this.pending.length;
  }

  /** Commands actually applied so far, stamped with the tick they ran on. */
  history(): readonly TimedCommand[] {
    return this.applied;
  }
}
