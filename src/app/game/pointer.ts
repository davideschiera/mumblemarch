/**
 * PointerControl — the playfield mouse/trackpad (DESIGN §6.1.3): hover moves the shared cursor
 * (mouse mode); left press on a mumble selects it and assigns the chosen skill on pointerdown,
 * or — with Settings → Assign on release — locks the target at pointerdown and assigns on
 * pointerup unless the pointer left the target's snap area first (WCAG 2.5.2); Shift or right
 * button held = walkers only for that press; empty ground = status "No mumble here" (1.5 s),
 * nothing deselected, no sound. Middle-drag / edge zones are forwarded to CameraControl.
 * Writes PlayState: cursor, cursorMode ('mouse'). Selection/assignment go through Selection/Skills.
 * Owner: E4a.
 */
import { pickLemmingAt } from '../../core/picking.ts';
import type { PointerSample } from '../../input/handler.ts';
import { NO_MUMBLE_HERE } from '../../ui/strings.ts';
import { STATUS_INFO_MS } from '../config.ts';
import type { PlayContext } from './context.ts';
import { pressWalkersOnly } from './pointer-modifiers.ts';

export class PointerControl {
  private readonly ctx: PlayContext;
  /** Set by a press under Settings → Assign on release; the assignment fires on pointerup. */
  private pendingAssignId: number | null = null;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.1.3 hover: the mouse becomes the cursor (null when it leaves the canvas). */
  move(sample: PointerSample | null): void {
    const { state, modules } = this.ctx;
    modules.camera.onPointerMove(sample);
    if (!sample || !sample.world) {
      if (state.cursorMode === 'mouse') state.cursor = null;
      return;
    }
    state.cursor = sample.world;
    state.cursorMode = 'mouse';
  }

  /**
   * §6.1.3 press. Left: select, then assign at once (assignOn 'press', default) or lock the
   * target for `up()` to assign (assignOn 'release'). Shift / right-held = walkers only.
   * Empty ground: status only, nothing selected/deselected, no sound.
   */
  down(sample: PointerSample): void {
    const { modules } = this.ctx;
    this.pendingAssignId = null;
    if (modules.camera.onPointerDown(sample)) return; // middle-drag consumed the press
    if (sample.button !== 0 || !sample.world) return; // right alone: no-op
    this.move(sample);
    const walkersOnly = pressWalkersOnly(sample.shiftKey, sample.buttons);
    const lem = modules.selection.pickAt(sample.world, walkersOnly);
    if (!lem) {
      this.ctx.setStatus(NO_MUMBLE_HERE, 'info', STATUS_INFO_MS);
      return;
    }
    modules.selection.select(lem.id, 'pointer');
    if (this.ctx.settings().assignOn === 'release') {
      this.pendingAssignId = lem.id;
    } else {
      modules.skills.assignTo(lem.id, 'pointer');
    }
  }

  /**
   * §6.1.3 release: completes an assign-on-release press — unless the pointer is no longer over
   * the locked mumble's hit box/snap area (WCAG 2.5.2), checked geometrically (filter/skill
   * ignored: only "is this still the same target"). Also ends a middle-drag (CameraControl).
   */
  up(sample: PointerSample): void {
    this.ctx.modules.camera.onPointerUp(sample);
    const pendingId = this.pendingAssignId;
    this.pendingAssignId = null;
    if (pendingId === null || !sample.world) return; // left the canvas → cancelled
    const stillOver = pickLemmingAt(this.ctx.session.lemmings, sample.world, null, {
      snapRadius: this.ctx.modules.selection.snapRadius(),
    });
    if (stillOver?.id === pendingId) this.ctx.modules.skills.assignTo(pendingId, 'pointer');
  }
}
