/**
 * Run a session without any UI — the backbone of simulation tests and replay verification.
 */
import { GameSession } from './session.ts';
import type { CompiledLevel, GameEvent, TimedCommand } from './types.ts';

export interface HeadlessOptions {
  readonly commands?: readonly TimedCommand[];
  /** Hard stop (default: the level's time limit + 1). */
  readonly maxTicks?: number;
  readonly seed?: number;
  readonly relaxedTimer?: boolean;
}

export interface HeadlessResult {
  readonly session: GameSession;
  /** Every event with the tick it happened on. */
  readonly events: readonly { readonly tick: number; readonly event: GameEvent }[];
}

export function runHeadless(level: CompiledLevel, options: HeadlessOptions = {}): HeadlessResult {
  const session = new GameSession(level, {
    ...(options.seed === undefined ? {} : { seed: options.seed }),
    ...(options.relaxedTimer === undefined ? {} : { relaxedTimer: options.relaxedTimer }),
  });
  for (const { tick, command } of options.commands ?? []) session.enqueue(command, tick);
  const events: { tick: number; event: GameEvent }[] = [];
  const maxTicks = options.maxTicks ?? level.timeLimitTicks + 1;
  while (session.status === 'running' && session.tick < maxTicks) {
    const tick = session.tick;
    for (const event of session.step()) events.push({ tick, event });
  }
  return { session, events };
}
