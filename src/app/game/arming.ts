/**
 * Pop all / Restart arm–confirm state machine (DESIGN §6.4.5, §6.4.6) — pure and DOM-free, so
 * tests can drive it directly. The side effects (sound, announcements, bubble, nuke command,
 * restart navigation) live in `pop-restart.ts`; the current state lives in `PlayState.armed`.
 * Owner: E5a (E0 wrote the machine; E5a owns tests and any refinement).
 */
import { RESTART_IMMEDIATE_TICKS } from '../config.ts';

export type ArmKind = 'pop-all' | 'restart';

/** What happened to the arm state machine. */
export type ArmInput =
  /** N / Pop all click (`pop-all`) or R (`restart`): arms, or confirms when already armed. */
  | { readonly type: 'press'; readonly kind: ArmKind }
  /** Esc (§6.1.1 menu priority): disarms. */
  | { readonly type: 'cancel' }
  /** Any other action or pointer press (§6.4.5): disarms. */
  | { readonly type: 'other' };

export interface ArmTransition {
  /** The new state. */
  readonly armed: ArmKind | null;
  /** This input confirmed that action (send `nuke` / restart now). */
  readonly confirmed: ArmKind | null;
  /** This input armed that action (play `ui-arm`, assertive announcement #22/#25, bubble). */
  readonly newlyArmed: ArmKind | null;
  /** This input disarmed that action (announce #23 "Pop all cancelled" / "Restart cancelled"). */
  readonly cancelled: ArmKind | null;
}

/**
 * §6.4.5: Idle → Armed on a press; Armed → Confirmed on the next press of the same kind;
 * Armed → Idle on Esc or any other input. There is no timeout. Pressing the other kind while
 * armed disarms the first and arms the second.
 */
export function nextArm(armed: ArmKind | null, input: ArmInput): ArmTransition {
  if (input.type === 'press') {
    if (armed === input.kind) return { armed: null, confirmed: input.kind, newlyArmed: null, cancelled: null };
    return { armed: input.kind, confirmed: null, newlyArmed: input.kind, cancelled: armed };
  }
  return { armed: null, confirmed: null, newlyArmed: null, cancelled: armed };
}

/**
 * §6.4.6: restart skips the arm step when nothing has happened yet (no command issued and the
 * tick is below 54) or when the level has ended.
 */
export function restartIsImmediate(info: { readonly tick: number; readonly commandCount: number; readonly ended: boolean }): boolean {
  return info.ended || (info.commandCount === 0 && info.tick < RESTART_IMMEDIATE_TICKS);
}
