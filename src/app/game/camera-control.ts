/**
 * CameraControl — every way the player moves the camera: scroll keys (tap 8 px, hold 200 px/s
 * after 150 ms, Shift 600 px/s; DESIGN §6.1.1), Home/End jump to hatch/exit with cycling, C centre
 * on the target, L Follow (+ the per-frame follow update keeping the selection in the middle
 * 50 %), wheel, middle-drag and edge zones (§6.1.3), `ensureVisible` for new selections
 * (§6.2.3), and "any manual scroll turns Follow off" (§6.1.1). Cycling/edge-zone geometry are
 * pure helpers (`camera-jump.ts`, `camera-edge.ts`) so their rules are Node-testable.
 * Writes PlayState: follow. Moves `services.camera` (C owns Camera easing: centerOn animate).
 * Owner: E4a.
 */
import type { ActionPhase, PointerSample } from '../../input/handler.ts';
import { ANNOUNCE } from '../../ui/strings.ts';
import {
  CAMERA_EDGE_MARGIN,
  EDGE_DWELL_MS,
  EDGE_RAMP_MS,
  EDGE_SPEED_MAX,
  EDGE_SPEED_MIN,
  EDGE_ZONE_CSS,
  FOLLOW_ZONE_FRACTION,
  SCROLL_HOLD_DELAY_MS,
  SCROLL_HOLD_SPEED,
  SCROLL_SHIFT_SPEED,
  SCROLL_STEP,
} from '../config.ts';
import { edgeSideAt, type EdgeSide } from './camera-edge.ts';
import { nearestIndex, nextCycleIndex } from './camera-jump.ts';
import type { PlayContext } from './context.ts';
import { HoldRepeater, rampSpeed } from './hold-repeat.ts';

export class CameraControl {
  private readonly ctx: PlayContext;
  private readonly scrollHold = new HoldRepeater(SCROLL_HOLD_DELAY_MS, 1);
  private scrollDir: -1 | 0 | 1 = 0;
  private scrollShift = false;

  // Home/End cycling (§6.1.1): which hatch/exit the last jump landed on.
  private hatchIndex: number | null = null;
  private exitIndex: number | null = null;

  // Edge zones + middle-drag (§6.1.3).
  private edge: EdgeSide = null;
  private edgeHeldMs = 0;
  private dragging = false;
  private dragLastCssX = 0;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** Initial camera position for the level (LevelDef.cameraX, else the first hatch). */
  start(): void {
    const { level, services } = this.ctx;
    services.camera.setLevelSize(level.width, level.height);
    services.camera.centerOn(level.cameraX ?? level.entrances[0]?.x ?? 0);
  }

  /** §6.1.1 ←/→: tap = SCROLL_STEP; hold (after 150 ms) = 200 px/s; Shift = 600 px/s. Turns Follow off. */
  scrollKey(dir: -1 | 1, phase: ActionPhase, shift: boolean): void {
    if (phase === 'up') {
      if (this.scrollDir === dir) {
        this.scrollDir = 0;
        this.scrollHold.release();
      }
      return;
    }
    this.scrollDir = dir;
    this.scrollShift = shift;
    this.scrollHold.press();
    this.manualScroll(dir * SCROLL_STEP);
  }

  /**
   * §6.1.1 Home/End: centre on the first hatch / nearest exit; pressing again cycles through
   * every hatch/exit in level order (wrapping). No hatch/exit in the level → no-op.
   */
  jump(kind: 'hatch' | 'exit'): void {
    const { level, services } = this.ctx;
    const points = kind === 'hatch' ? level.entrances : level.exits;
    if (points.length === 0) return;
    if (kind === 'hatch') {
      this.hatchIndex = nextCycleIndex(points.length, this.hatchIndex);
    } else if (this.exitIndex === null) {
      this.exitIndex = nearestIndex(points.map((p) => p.x), services.camera.x + services.camera.viewW / 2);
    } else {
      this.exitIndex = nextCycleIndex(points.length, this.exitIndex);
    }
    const index = (kind === 'hatch' ? this.hatchIndex : this.exitIndex) ?? 0;
    const point = points[index];
    if (!point) return;
    this.ctx.state.follow = false;
    services.camera.centerOn(point.x, point.y, { animate: !services.reducedMotion() });
  }

  /** §6.1.1 C: centre on the target (§6.2.2); none → "No mumble selected". */
  center(): void {
    const target = this.ctx.modules.selection.target();
    if (!target) {
      this.ctx.uiSound('ui-deny');
      this.ctx.say('No mumble selected', { key: 'selection', userInitiated: true });
      return;
    }
    this.ctx.services.camera.centerOn(target.x, target.y, { animate: !this.ctx.services.reducedMotion() });
  }

  /**
   * §6.1.1 L: toggle Follow (persisted in settings.cameraFollow; chip "Follow"). In cursor mode,
   * turning it on with no lock-on selection yet locks the cursor's current pick as the selection
   * first, so there is something to follow. Announces #19 (following / armed / off).
   */
  toggleFollow(): void {
    const { state, modules, services } = this.ctx;
    if (!state.follow && state.cursorMode === 'keyboard' && !modules.selection.selected() && state.hoverId !== null) {
      modules.selection.select(state.hoverId, 'key');
    }
    state.follow = !state.follow;
    services.save.updateSettings({ cameraFollow: state.follow });
    if (!state.follow) {
      this.ctx.say(ANNOUNCE.follow('off'), { key: 'follow', userInitiated: true });
      return;
    }
    this.ctx.say(ANNOUNCE.follow(modules.selection.selected() ? 'following' : 'armed'), { key: 'follow', userInitiated: true });
  }

  /** §6.1.3 wheel: CSS px ÷ scale → camera x. Turns Follow off. */
  onWheel(deltaCssPx: number): void {
    this.manualScroll(deltaCssPx / this.ctx.scale());
  }

  /**
   * §6.1.3 pointer move over the playfield: mid-drag, pan 1:1 (CSS px ÷ scale); otherwise track
   * which edge zone (if any, and only when Settings → Edge scrolling is on) the pointer sits in,
   * for `frame()` to ramp-scroll and for `edgeSide()` (chevron cursor).
   */
  onPointerMove(sample: PointerSample | null): void {
    if (!sample) {
      this.edge = null;
      return;
    }
    if (this.dragging) {
      const dx = sample.cssX - this.dragLastCssX;
      this.dragLastCssX = sample.cssX;
      if (dx !== 0) this.manualScroll(dx / this.ctx.scale());
      return;
    }
    this.edge = this.ctx.settings().edgeScroll ? edgeSideAt(sample.cssX, sample.cssWidth, EDGE_ZONE_CSS) : null;
  }

  /** Middle button starts a drag pan (§6.1.3), turning Follow off. Returns true when consumed. */
  onPointerDown(sample: PointerSample): boolean {
    if (sample.button !== 1) return false;
    this.dragging = true;
    this.dragLastCssX = sample.cssX;
    this.edge = null;
    this.ctx.state.follow = false;
    return true;
  }

  /** Ends a middle-drag. */
  onPointerUp(sample: PointerSample): void {
    if (sample.button === 1) this.dragging = false;
  }

  /** §6.2.3: centre on (x, y) when it is off-screen or within 40 world px of a view edge. */
  ensureVisible(x: number, y: number): void {
    const { camera } = this.ctx.services;
    if (x < camera.x + CAMERA_EDGE_MARGIN || x > camera.x + camera.viewW - CAMERA_EDGE_MARGIN) {
      camera.centerOn(x, y, { animate: !this.ctx.services.reducedMotion() });
    }
  }

  /** The edge zone currently scrolling, for the view to draw a chevron cursor there (§6.1.3). */
  edgeSide(): 'left' | 'right' | null {
    return this.dragging ? null : this.edge;
  }

  /** Per frame (also while paused): held scroll keys, edge-zone ramp, Follow, Camera easing. */
  frame(elapsedMs: number): void {
    if (this.scrollDir !== 0) {
      this.scrollHold.advance(elapsedMs);
      if (this.scrollHold.heldMs >= SCROLL_HOLD_DELAY_MS) {
        const speed = this.scrollShift ? SCROLL_SHIFT_SPEED : SCROLL_HOLD_SPEED;
        this.manualScroll((this.scrollDir * speed * elapsedMs) / 1000);
      }
    }
    if (this.edge && !this.dragging) {
      this.edgeHeldMs += elapsedMs;
      const speed = rampSpeed(this.edgeHeldMs, EDGE_DWELL_MS, EDGE_SPEED_MIN, EDGE_SPEED_MAX, EDGE_RAMP_MS);
      if (speed > 0) this.manualScroll(((this.edge === 'left' ? -1 : 1) * speed * elapsedMs) / 1000);
    } else {
      this.edgeHeldMs = 0;
    }
    if (this.ctx.state.follow) this.applyFollow();
    this.ctx.services.camera.update(elapsedMs);
  }

  /** Any manual scroll (keys, edge, wheel, minimap, Home/End) turns Follow off (§6.1.1). */
  manualScroll(dx: number): void {
    this.ctx.state.follow = false;
    this.ctx.services.camera.scrollBy(dx);
  }

  /**
   * §6.1.1 Follow: dead-zone the camera so the selection stays inside the middle 50 % of the
   * view — no movement while it is inside the zone; otherwise ease (instant cut in reduced
   * motion, §7.4) just far enough to put it back at the zone's edge.
   */
  private applyFollow(): void {
    const lem = this.ctx.modules.selection.selected();
    if (!lem) return;
    const { camera } = this.ctx.services;
    const margin = (camera.viewW * (1 - FOLLOW_ZONE_FRACTION)) / 2;
    let targetLeft: number | null = null;
    if (lem.x < camera.x + margin) targetLeft = lem.x - margin;
    else if (lem.x > camera.x + camera.viewW - margin) targetLeft = lem.x - (camera.viewW - margin);
    if (targetLeft === null) return;
    camera.centerOn(targetLeft + camera.viewW / 2, camera.y + camera.viewH / 2, { animate: !this.ctx.services.reducedMotion() });
  }
}
