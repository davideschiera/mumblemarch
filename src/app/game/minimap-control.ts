/**
 * MinimapControl — the minimap as a pointer target and an ARIA slider (DESIGN §6.1.3, §7.2):
 * pointerdown centres the camera on that x, dragging continues (the view holds pointer capture),
 * hover feeds the ghost viewport; keys ←/→ ±16 world px (hold repeats), PageUp/PageDown ±400,
 * Home/End start/end. Every move turns Follow off (manual scroll). Esc ends a drag (§6.1.1).
 * Also renders the minimap each frame and provides the slider values for HudState.
 * Owner: E4a.
 */
import type { Minimap } from '../../render/minimap.ts';
import type { HoldPhase, HudMinimap, MinimapKey, MinimapPointerPhase } from '../../ui/hud/types.ts';
import { minimapValueText } from '../../ui/strings.ts';
import { MINIMAP_PAGE, MINIMAP_REPEAT_DELAY_MS, MINIMAP_REPEAT_MS, MINIMAP_STEP } from '../config.ts';
import type { PlayContext } from './context.ts';
import { HoldRepeater } from './hold-repeat.ts';
import { countMumblesInView } from './minimap-count.ts';

export class MinimapControl {
  private readonly ctx: PlayContext;
  private readonly minimap: Minimap;
  private drag = false;
  private hoverX: number | null = null;

  // §7.2 ←/→ hold-repeat (PageUp/PageDown/Home/End are single-shot per the spec table).
  private readonly repeater = new HoldRepeater(MINIMAP_REPEAT_DELAY_MS, MINIMAP_REPEAT_MS);
  private repeatDir: -1 | 0 | 1 = 0;

  constructor(ctx: PlayContext, minimap: Minimap) {
    this.ctx = ctx;
    this.minimap = minimap;
  }

  /** Re-point after a new/rebuilt session (level start, undo). */
  setLevel(): void {
    this.minimap.setLevel(this.ctx.session.level);
  }

  /** §6.1.3 press/drag/hover on the minimap (`offsetCssX` from its left edge). */
  pointer(phase: MinimapPointerPhase, offsetCssX: number): void {
    const worldX = this.minimap.toWorldX(offsetCssX);
    switch (phase) {
      case 'down':
        this.drag = true;
        this.centerOn(worldX);
        break;
      case 'move':
        if (this.drag) this.centerOn(worldX);
        this.hoverX = worldX;
        break;
      case 'up':
        this.drag = false;
        break;
      case 'leave':
        this.hoverX = null;
        break;
    }
  }

  /** §7.2 slider keys: ←/→ ±16 (hold repeats), PageUp/PageDown ±400, Home/End start/end. */
  key(key: MinimapKey, phase: HoldPhase, _shift: boolean): void {
    const isArrow = key === 'ArrowLeft' || key === 'ArrowRight';
    if (phase === 'up') {
      if (isArrow) {
        this.repeatDir = 0;
        this.repeater.release();
      }
      return;
    }
    if (isArrow) {
      this.repeatDir = key === 'ArrowLeft' ? -1 : 1;
      this.repeater.press();
      this.step(this.repeatDir * MINIMAP_STEP);
      return;
    }
    const { camera } = this.ctx.services;
    const max = Math.max(0, camera.levelWidth - camera.viewW);
    const target =
      key === 'PageUp' ? camera.x - MINIMAP_PAGE
      : key === 'PageDown' ? camera.x + MINIMAP_PAGE
      : key === 'Home' ? 0
      : max;
    this.step(target - camera.x);
  }

  get dragging(): boolean {
    return this.drag;
  }

  /** Esc priority step 3 (§6.1.1): end a minimap drag. Returns true when a drag was ended. */
  endDrag(): boolean {
    if (!this.drag) return false;
    this.drag = false;
    return true;
  }

  /** §7.2 slider values: valuemax = w − viewW, valuenow = camera x, "…{n} mumbles in view." text. */
  slider(): HudMinimap {
    const { camera } = this.ctx.services;
    const w = camera.levelWidth;
    const x0 = Math.round(camera.x);
    const x1 = x0 + camera.viewW;
    return {
      valueMax: Math.max(0, w - camera.viewW),
      valueNow: x0,
      valueText: minimapValueText(x0, x1, w, countMumblesInView(this.ctx.session.lemmings, x0, x1)),
      dragging: this.drag,
    };
  }

  /** Per frame: ←/→ hold-repeat. The minimap render itself happens in `render()` (paint order). */
  frame(elapsedMs: number): void {
    if (this.repeatDir === 0) return;
    const steps = this.repeater.advance(elapsedMs);
    if (steps > 0) this.step(this.repeatDir * MINIMAP_STEP * steps);
  }

  /** Draw the minimap (called from the controller's render()). */
  render(): void {
    this.minimap.render(this.ctx.session, this.ctx.services.camera, this.drag ? null : this.hoverX);
  }

  private step(delta: number): void {
    this.ctx.modules.camera.manualScroll(delta);
  }

  private centerOn(worldX: number): void {
    const { camera } = this.ctx.services;
    this.step(worldX - (camera.x + camera.viewW / 2));
  }
}
