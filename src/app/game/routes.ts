/**
 * The dispatch table: every ActionId (all 36 of input/actions.ts) and every HUD callback routed
 * to the module that owns it. Cross-cutting rules applied here, before routing:
 *  - §6.4.5 "any other action or pointer press disarms" an armed Pop all / Restart;
 *  - §6.2.6 playfield actions (lemming-*, cursor-*, camera-center, camera-follow) pull focus
 *    back to the canvas first;
 *  - §6.1.1 Esc priority: (native dialog close) → disarm → end minimap drag → pause menu.
 * Owner: E5a after E0 (part of the controller). Other workers should never need to edit it:
 * change behaviour inside the target module instead.
 */
import type { SkillId } from '../../core/types.ts';
import type { ActionId } from '../../input/actions.ts';
import type { ActionPhase } from '../../input/handler.ts';
import type { HudCallbacks } from '../../ui/hud/types.ts';
import type { PlayContext } from './context.ts';

/** §6.2.6: these pull focus back to the canvas (so the next Space assigns). */
const PLAYFIELD_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>([
  'lemming-next', 'lemming-prev', 'cursor-left', 'cursor-right', 'cursor-up', 'cursor-down', 'camera-center', 'camera-follow',
]);

/** Actions that must not disarm first (they drive the arm machine or Esc's own priority). */
const ARM_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>(['nuke', 'restart', 'menu']);

const SKILL_ACTIONS: Readonly<Partial<Record<ActionId, SkillId>>> = {
  'skill-climber': 'climber',
  'skill-floater': 'floater',
  'skill-bomber': 'bomber',
  'skill-blocker': 'blocker',
  'skill-builder': 'builder',
  'skill-basher': 'basher',
  'skill-miner': 'miner',
  'skill-digger': 'digger',
};

/** Route one key action (down or up). Only holdable actions care about 'up'. */
export function routeAction(ctx: PlayContext, action: ActionId, phase: ActionPhase, shift: boolean): void {
  const m = ctx.modules;
  const down = phase === 'down';
  if (down && !ARM_ACTIONS.has(action)) m.popRestart.onOtherAction();
  if (down && PLAYFIELD_ACTIONS.has(action)) ctx.focusCanvas();
  const skill = SKILL_ACTIONS[action];
  if (skill) {
    if (down) m.skills.choose(skill, 'key');
    return;
  }
  switch (action) {
    // Held actions: down + up.
    case 'cursor-left':
    case 'cursor-right':
    case 'cursor-up':
    case 'cursor-down':
      return m.cursor.key(action, phase, shift);
    case 'scroll-left':
    case 'scroll-right':
      return m.camera.scrollKey(action === 'scroll-left' ? -1 : 1, phase, shift);
    case 'release-rate-down':
    case 'release-rate-up':
      return m.releaseRate.press(action === 'release-rate-down' ? -1 : 1, phase, shift, 'key');
    case 'frame-step':
      return m.flow.frameStep(phase, shift);
    default:
      break;
  }
  if (!down) return;
  switch (action) {
    case 'skill-next':
      return m.skills.step(1);
    case 'skill-prev':
      return m.skills.step(-1);
    case 'lemming-next':
      return m.selection.cycle(1, shift);
    case 'lemming-prev':
      return m.selection.cycle(-1, shift);
    case 'assign':
      return m.skills.assignToTarget('key');
    case 'camera-center':
      return m.camera.center();
    case 'camera-follow':
      return m.camera.toggleFollow();
    case 'camera-hatch':
      return m.camera.jump('hatch');
    case 'camera-exit':
      return m.camera.jump('exit');
    case 'filter-cycle':
      return m.selection.cycleFilter();
    case 'pause':
      return m.flow.togglePause('key');
    case 'fast-forward':
      return m.flow.toggleFast('key');
    case 'nuke':
      return m.popRestart.popAll('key');
    case 'undo':
      return m.undo.undo('key');
    case 'restart':
      return m.popRestart.restart('key');
    case 'mute':
      return m.audio.toggleMute();
    case 'briefing':
      return void m.dialogs.briefing();
    case 'help':
      return void m.dialogs.help();
    case 'menu':
      return escape(ctx);
    default:
      return;
  }
}

/** §6.1.1 Esc priority (step 1, closing an open dialog, is native: keys inside dialogs never get here). */
function escape(ctx: PlayContext): void {
  const m = ctx.modules;
  if (m.popRestart.cancel()) return;
  if (m.minimap.endDrag()) return;
  void m.dialogs.menu();
}

/** HUD → modules. Every HUD press except Pop all itself disarms first (§6.4.5). */
export function hudCallbacks(ctx: PlayContext): HudCallbacks {
  const m = () => ctx.modules;
  /** Disarm, then run `fn` (modules are resolved lazily: callbacks exist before the modules). */
  const press = (fn: () => void): void => {
    m().popRestart.onOtherAction();
    fn();
  };
  return {
    onSelectSkill: (skill) => press(() => m().skills.choose(skill, 'hud')),
    onReleaseRate: (delta, phase, shift) => {
      if (phase === 'down') m().popRestart.onOtherAction();
      m().releaseRate.press(delta, phase, shift, 'hud');
    },
    onPause: () => press(() => m().flow.togglePause('hud')),
    onFastForward: () => press(() => m().flow.toggleFast('hud')),
    onPopAll: () => m().popRestart.popAll('hud'),
    onMenu: () => press(() => void m().dialogs.menu()),
    onFilterCycle: () => press(() => m().selection.cycleFilter()),
    onFollowToggle: () => press(() => m().camera.toggleFollow()),
    onMinimapPointer: (phase, offsetCssX) => {
      if (phase === 'down') m().popRestart.onOtherAction();
      m().minimap.pointer(phase, offsetCssX);
    },
    onMinimapKey: (key, phase, shift) => {
      if (phase === 'down') m().popRestart.onOtherAction();
      m().minimap.key(key, phase, shift);
    },
  };
}
