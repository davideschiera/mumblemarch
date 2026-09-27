/**
 * Canvas 2D renderer for the play area. Reads a GameView (never mutates it) and draws, in
 * order: background, decor dots, terrain, hazard pools, traps, entrance hatches, exits, mumbles,
 * per-lemming overlays (fall ruler, pips, bomber digit/fuse, hover/selected brackets, pending
 * badges), transient effects, confetti particles, keyboard crosshair (App. E.2 V7). Draws at
 * world-pixel resolution; CSS does the integer upscaling (`image-rendering: pixelated`), so there
 * is no sub-pixel blur and no smoothing cost.
 */
import { MUMBLE_ANIMS, MUMBLE_PALETTE } from '../art/index.ts';
import type { CompiledLevel, EventSink, GameEvent, GameView, Lemming, Point } from '../core/types.ts';
import { getTheme, type Theme } from '../levels/themes.ts';
import { Camera, VIEW_HEIGHT, VIEW_WIDTH } from './camera.ts';
import { Effects, type EffectPainter } from './effects.ts';
import { drawFallRuler } from './fall-ruler.ts';
import { OverlayPainter } from './overlays.ts';
import { BurstLimiter, ParticleSystem } from './particles.ts';
import { ScenePainter } from './scene.ts';
import { showsPips } from './sprite-geometry.ts';
import { SpriteAtlas } from './sprites.ts';
import { TerrainLayer } from './terrain-layer.ts';

export interface RenderState {
  readonly game: GameView;
  readonly camera: Camera;
  /** Keyboard/mouse-selected lemming: thick bracket + ▼ (not colour alone). */
  readonly selectedLemmingId: number | null;
  /** Thin bracket. */
  readonly hoveredLemmingId: number | null;
  /** Dashed bracket + ✕: the hovered skill would be refused here (predicted, via checkAssign). */
  readonly hoverWouldRefuse: boolean;
  /** In-canvas crosshair, keyboard cursor mode only (world pixels). */
  readonly keyboardCursor: Point | null;
  /** Assigned while paused: drawn with a pending badge until the next tick applies it. */
  readonly pendingLemmingIds: readonly number[];
  /** Wall-clock ms, for ambient animation (water shimmer…); frozen when motion is reduced. */
  readonly timeMs: number;
  readonly reducedMotion: boolean;
  /** DESIGN §4.9: a clearer, higher-contrast physics view. */
  readonly highContrast: boolean;
  /** DESIGN §7.11: mark the safe (≤ 63 px) vs deadly fall distance under the cursor/selection. */
  readonly fallRuler: boolean;
  readonly paused: boolean;
}

export class Renderer implements EventSink {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly sprites = new SpriteAtlas();
  private readonly scene = new ScenePainter();
  private readonly overlays = new OverlayPainter();
  private readonly particleSystem = new ParticleSystem();
  private readonly burstLimiter = new BurstLimiter();
  private readonly effects = new Effects(this.particleSystem, this.burstLimiter);
  private terrainLayer: TerrainLayer | null = null;
  private theme: Theme = getTheme('mossgrove');
  /** The live view handed to `setLevel`; `handleEvents` (which gets no view of its own) forwards
   * it to the scene painter. `GameView` is a live, allocation-free read view the session keeps
   * up to date in place, so this stays current for the life of the level. */
  private view: GameView | null = null;

  /** Camera window from the last `render()` call: world→view conversion for the effect adapter
   * below and for `EffectOptions.inView` (also read from `handleEvents`, which runs between
   * renders and has no camera of its own — DESIGN intent: use the last drawn window). */
  private camX = 0;
  private camY = 0;
  private viewW = VIEW_WIDTH;
  private viewH = VIEW_HEIGHT;

  /** One adapter, created once: converts world px to view px with the live camX/camY fields
   * above and draws through `sprites`/`overlays`/`fillRect`. No per-frame allocation. */
  private readonly effectPainter: EffectPainter = {
    popStar: (x, y) => this.sprites.drawFrame(this.ctx, 'exploding', 0, x - this.camX, y - this.camY, 1),
    dustPuff: (cx, cy) => this.overlays.dustPuff(this.ctx, cx - this.camX, cy - this.camY),
    steelSpark: (cx, cy, frame) => this.overlays.steelSpark(this.ctx, cx - this.camX, cy - this.camY, frame),
    refusal: (cx, cy) => this.overlays.refusal(this.ctx, cx - this.camX, cy - this.camY),
    assignRing: (cx, cy, frame) => this.overlays.assignRing(this.ctx, cx - this.camX, cy - this.camY, frame),
    pixel: (x, y, w, h, paletteKey) => {
      this.ctx.fillStyle = MUMBLE_PALETTE[paletteKey] ?? '#ffffff';
      this.ctx.fillRect(x - this.camX, y - this.camY, w, h);
    },
  };

  /** One reusable, mutable options object: `reducedMotion` mirrors the latest `RenderState`
   * (false before the first render), `nowMs` is refreshed on every render/handleEvents call, and
   * `inView` (bound once) tests against the live camera window fields above. */
  private readonly effectOptions: { reducedMotion: boolean; nowMs: number; inView: (x: number, y: number) => boolean } =
    {
      reducedMotion: false,
      nowMs: 0,
      inView: (x, y) => x >= this.camX && x < this.camX + this.viewW && y >= this.camY && y < this.camY + this.viewH,
    };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = VIEW_WIDTH;
    canvas.height = VIEW_HEIGHT;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  /** Prepare for a new level (call after creating its GameSession). Resets all per-level state
   * (scene, effects, particles, burst limiter), so calling it again on restart is safe. */
  setLevel(level: CompiledLevel, view: GameView): void {
    this.theme = getTheme(level.themeId);
    this.terrainLayer = new TerrainLayer(view.terrain, this.theme);
    this.scene.setLevel(level, this.theme);
    this.effects.setLevel(level);
    this.view = view;
    this.camX = 0;
    this.camY = 0;
  }

  /** Current terrain bitmap (the minimap draws a scaled copy of it). */
  get terrainCanvas(): HTMLCanvasElement | null {
    return this.terrainLayer?.canvas ?? null;
  }

  render(state: RenderState): void {
    const { ctx, scene, overlays } = this;
    const { camera, game, timeMs, reducedMotion, highContrast } = state;
    const camX = camera.x;
    const camY = camera.y;
    const viewW = camera.viewW;
    const viewH = camera.viewH;

    // Cache the camera window: the effect adapter and `EffectOptions.inView` read these fields
    // (the latter also from `handleEvents`, between renders — the last drawn window is correct).
    this.camX = camX;
    this.camY = camY;
    this.viewW = viewW;
    this.viewH = viewH;

    scene.drawBackground(ctx, camX, camY, viewW, viewH, timeMs, reducedMotion, highContrast);
    if (!this.terrainLayer) return;

    this.terrainLayer.setHighContrast(highContrast);
    this.terrainLayer.sync();
    ctx.drawImage(this.terrainLayer.canvas, camX, camY, viewW, viewH, 0, 0, viewW, viewH);

    scene.drawPools(ctx, camX, camY, viewW, viewH, timeMs, reducedMotion, highContrast);
    scene.drawTraps(ctx, game, camX, camY, timeMs, reducedMotion, highContrast);
    scene.drawHatches(ctx, game, camX, camY, reducedMotion, highContrast);
    scene.drawExits(ctx, game, camX, camY, timeMs, reducedMotion, highContrast);

    // Draw every mumble sprite in one pass, picking up the selected/hovered lemming (if still
    // present and not removed) along the way — the fall ruler needs their (x, y, dir), and this
    // avoids a dedicated lookup scan.
    let selectedLem: Readonly<Lemming> | undefined;
    let hoveredLem: Readonly<Lemming> | undefined;
    for (const lem of game.lemmings) {
      if (!lem.removed) {
        if (lem.id === state.selectedLemmingId) selectedLem = lem;
        if (lem.id === state.hoveredLemmingId) hoveredLem = lem;
      }
      if (lem.removed || lem.state === 'exploding') continue; // the pop star is an effect.
      this.sprites.drawLemming(ctx, lem.state, lem.stateTicks, lem.x - camX, lem.y - camY, lem.dir);
    }

    // Fall ruler: the selected lemming if one is selected and still present, else the hovered
    // one. Drawn before the per-lemming overlay pass so pips/digit/brackets stay on top of it.
    if (state.fallRuler) {
      const rulerLem = selectedLem ?? hoveredLem;
      if (rulerLem) drawFallRuler(ctx, game.terrain, rulerLem.x, rulerLem.y, rulerLem.dir, camX, camY);
    }

    // Per-lemming overlays: one single pass over `game.lemmings`, comparing ids directly (no
    // Map/array built per frame).
    for (const lem of game.lemmings) {
      if (lem.removed) continue;
      const footY = MUMBLE_ANIMS[lem.state].footY;
      const vx = lem.x - camX;
      const vy = lem.y - camY;
      const pips = showsPips(lem.state);
      if (pips) overlays.pips(ctx, vx, vy, footY, lem.bricksLeft);
      if (lem.fuseTicks > 0) overlays.bomber(ctx, vx, vy, footY, lem.fuseTicks, pips);

      const isSelected = lem.id === state.selectedLemmingId;
      if (lem.id === state.hoveredLemmingId) {
        if (state.hoverWouldRefuse) overlays.hoverRefuse(ctx, vx, vy);
        else if (!isSelected) overlays.hover(ctx, vx, vy);
      }
      if (isSelected) overlays.selected(ctx, vx, vy);
      if (state.pendingLemmingIds.includes(lem.id)) overlays.pending(ctx, vx, vy, footY);
    }

    // Transient effects (explosions, sparks, refusal ✕, assign rings, trap leaf, splat dust,
    // drown ripple), then confetti particles on top (V7 order).
    this.effectOptions.reducedMotion = reducedMotion;
    this.effectOptions.nowMs = performance.now();
    this.effects.draw(this.effectPainter, game, this.effectOptions);
    this.effects.particles.draw(ctx, game.tick, camX, camY, viewW, viewH);

    // In-canvas keyboard crosshair (world px → view px).
    if (state.keyboardCursor) {
      overlays.crosshair(ctx, state.keyboardCursor.x - camX, state.keyboardCursor.y - camY);
    }
  }

  handleEvents(events: readonly GameEvent[], tick: number): void {
    if (!this.view) return;
    this.scene.handleEvents(events, tick, this.view);
    this.effectOptions.nowMs = performance.now();
    this.effects.handleEvents(events, tick, this.view, this.effectOptions);
  }
}
