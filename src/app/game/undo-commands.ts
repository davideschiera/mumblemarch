/**
 * Pure undo mechanics (DESIGN §6.4.7), split out of undo.ts so they are unit-testable without a
 * PlayContext: find + drop the last `assign-skill`/`nuke` from a replay's command history (RR
 * commands are kept), and rebuild a session from what remains, headless, to a given tick.
 * Owner: E5a2.
 */
import { GameSession } from '../../core/session.ts';
import type { CompiledLevel, GameCommand, TimedCommand } from '../../core/types.ts';

export interface UndoPlan {
  readonly removed: TimedCommand;
  readonly remaining: readonly TimedCommand[];
}

/** The last `assign-skill`/`nuke` command (and everything else, in order) — null when there is none. */
export function planUndo(commands: readonly TimedCommand[]): UndoPlan | null {
  for (let i = commands.length - 1; i >= 0; i--) {
    const { command } = commands[i]!;
    if (command.type === 'assign-skill' || command.type === 'nuke') {
      const remaining = commands.slice(0, i).concat(commands.slice(i + 1));
      return { removed: commands[i]!, remaining };
    }
  }
  return null;
}

/**
 * `new GameSession(level, {seed, relaxedTimer})` + `enqueue` every remaining command at its
 * original tick, then `step()` headless up to (not including) `uptoTick` — the live session's
 * current tick, i.e. the next tick that has NOT run yet. A command recorded at `uptoTick` itself
 * is one `applyNow` made while paused (§6.4.1: applied immediately, "before anything moves",
 * with nothing yet moved for that tick); replaying it the same way (`applyNow`, once the step
 * loop reaches the same paused boundary) reproduces the exact same immediate effect instead of
 * leaving it stuck in the queue for a tick this session hasn't reached either. The caller mutes
 * the sinks simply by never handing this session's events to them.
 */
export function rebuildSession(
  level: CompiledLevel,
  seed: number,
  relaxedTimer: boolean,
  remaining: readonly TimedCommand[],
  uptoTick: number,
): GameSession {
  const session = new GameSession(level, { seed, relaxedTimer });
  const dueNow: GameCommand[] = [];
  for (const { command, tick } of remaining) {
    if (tick < uptoTick) session.enqueue(command, tick);
    else dueNow.push(command); // tick === uptoTick (never >): not executed yet, same as live
  }
  for (let i = 0; i < uptoTick; i++) session.step();
  for (const command of dueNow) session.applyNow(command);
  return session;
}
