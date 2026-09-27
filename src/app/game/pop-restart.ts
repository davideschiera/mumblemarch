/**
 * PopRestartControl — the effects of the two-step Pop all and Restart (DESIGN §6.4.5, §6.4.6)
 * around the pure `nextArm` machine (arming.ts): arm → `ui-arm` + assertive announcement
 * (#22/#25) + bubble; confirm → `nuke` command (applied at once when paused) / restart;
 * Esc or any other action/pointer press → disarm + "Pop all cancelled"/"Restart cancelled" (#23).
 * Restart is immediate when nothing happened yet or the level ended. No timeout, ever.
 * The dispatch calls `onOtherAction()` before routing every other action / pointer press.
 * Writes PlayState: armed.
 * Owner: E5a.
 */
import type { PopAllState } from '../../ui/hud/types.ts';
import { ANNOUNCE, HUD } from '../../ui/strings.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { nextArm, restartIsImmediate, type ArmInput, type ArmKind } from './arming.ts';

/** §5.3 armed bubble text, by kind. */
const BUBBLE_TEXT: Readonly<Record<ArmKind, string>> = { 'pop-all': HUD.popBubble, restart: HUD.restartBubble };
/** §7.3 #22/#25 assertive "armed" announcement, by kind. */
const ARMED_TEXT: Readonly<Record<ArmKind, string>> = { 'pop-all': ANNOUNCE.popAllArmed, restart: ANNOUNCE.restartArmed };

export class PopRestartControl {
  private readonly ctx: PlayContext;
  /** The source of the press that last armed/confirmed, for the eventual `nuke` command. */
  private source: CommandSource = 'key';

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.4.5 N / Pop all button (on click). Ignored while already popping or after the end. */
  popAll(source: CommandSource): void {
    if (this.ctx.session.nuking || this.ctx.state.ended) return;
    this.source = source;
    this.apply({ type: 'press', kind: 'pop-all' });
  }

  /** §6.4.6 R: arm/confirm, or restart at once when nothing happened yet / the level ended. */
  restart(source: CommandSource): void {
    const { session, state } = this.ctx;
    if (restartIsImmediate({ tick: session.tick, commandCount: session.replay().commands.length, ended: state.ended })) {
      this.ctx.nav.restart();
      return;
    }
    this.source = source;
    this.apply({ type: 'press', kind: 'restart' });
  }

  /** Esc priority step 2 (§6.1.1): disarm. Returns true when something was armed. */
  cancel(): boolean {
    if (!this.ctx.state.armed) return false;
    this.apply({ type: 'cancel' });
    return true;
  }

  /** §6.4.5 "any other action or pointer press disarms" (called by the dispatch). */
  onOtherAction(): void {
    if (this.ctx.state.armed) this.apply({ type: 'other' });
  }

  /** HudState.popAll. */
  popState(): PopAllState {
    if (this.ctx.session.nuking) return 'popping';
    return this.ctx.state.armed === 'pop-all' ? 'armed' : 'idle';
  }

  private apply(input: ArmInput): void {
    const { state, view } = this.ctx;
    const t = nextArm(state.armed, input);
    state.armed = t.armed;
    if (t.cancelled) this.ctx.say(ANNOUNCE.disarmed(t.cancelled), { key: 'arm', userInitiated: true });
    if (t.newlyArmed) {
      this.ctx.uiSound('ui-arm');
      this.ctx.say(ARMED_TEXT[t.newlyArmed], { key: 'arm', politeness: 'assertive', userInitiated: true });
    }
    view.bubble(t.armed ? { kind: t.armed, text: BUBBLE_TEXT[t.armed] } : null);
    if (t.confirmed === 'pop-all') this.ctx.command({ type: 'nuke' }, this.source);
    else if (t.confirmed === 'restart') this.ctx.nav.restart();
  }
}
