/**
 * Pre-rendered level "scenery": background + decor dots, hazard pools, traps, entrance hatches
 * and exits. Everything animatable is baked once per level/theme into cached canvases at
 * `setLevel`; per-frame drawing only picks a canvas (by ambient/tick-driven frame index) and
 * blits it — no per-frame pixel work, no per-frame allocation. Ported from
 * `docs/design/mockups/sprites-themes.html` (`drawPool`, `drawObj`, `scene`). DESIGN §3.5,
 * §4.5–§4.8, §4.9.
 */
import type { PixelFrame } from '../art/anim.ts';
import { THEME_OBJECTS } from '../art/objects.ts';
import { MUMBLE_PALETTE } from '../art/palette.ts';
import type { ArtThemeId, ThemeObjects } from '../art/types.ts';
import type { CompiledLevel, GameEvent, GameView } from '../core/types.ts';
import { getTheme, type Theme } from '../levels/themes.ts';
import { HC, HC_EXIT_H, HC_EXIT_W, hcExitPixel, hcPoolLine, hcTrapStripe } from './high-contrast.ts';
import { ambientFrame, ambientTick, decorDotVisible, decorDots, exitGlowLit, hatchCrestLit, hatchFrame, trapTriggerFrame } from './object-anim.ts';

const mod = (a: number, n: number): number => ((a % n) + n) % n;

function getThemeObjects(themeId: string): ThemeObjects {
  return THEME_OBJECTS[themeId as ArtThemeId] ?? THEME_OBJECTS.mossgrove;
}

function newCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function frameSize(rows: PixelFrame): { w: number; h: number } {
  let w = 1;
  for (const row of rows) w = Math.max(w, row.length);
  return { w, h: Math.max(1, rows.length) };
}

/** Paint one PixelFrame's non-transparent pixels through `pal`; `overrideChar`'s pixels (if given
 * and resolvable) always use `overrideColor` instead. */
function paintPixels(
  ctx: CanvasRenderingContext2D,
  rows: PixelFrame,
  pal: Readonly<Record<string, string>>,
  overrideChar?: string,
  overrideColor?: string,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? '';
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === '.') continue;
      const color = overrideChar !== undefined && overrideColor !== undefined && ch === overrideChar ? overrideColor : pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function renderFrame(rows: PixelFrame, pal: Readonly<Record<string, string>>, overrideChar?: string, overrideColor?: string): HTMLCanvasElement {
  const { w, h } = frameSize(rows);
  const { canvas, ctx } = newCanvas(w, h);
  paintPixels(ctx, rows, pal, overrideChar, overrideColor);
  return canvas;
}

/** The exit's "all-lit" variant: frame 0, plus every pixel that is '4' (the glow key) in ANY
 * frame forced to the glow colour — a single frame combining every glow mote. */
function renderExitAllLit(frames: readonly PixelFrame[], pal: Readonly<Record<string, string>>): HTMLCanvasElement {
  let w = 1;
  let h = 1;
  for (const f of frames) {
    const s = frameSize(f);
    w = Math.max(w, s.w);
    h = Math.max(h, s.h);
  }
  const { canvas, ctx } = newCanvas(w, h);
  const base = frames[0];
  if (base) paintPixels(ctx, base, pal);
  const glow = pal['4'];
  if (glow) {
    for (const frame of frames) {
      for (let y = 0; y < frame.length; y++) {
        const row = frame[y] ?? '';
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '4') {
            ctx.fillStyle = glow;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    }
  }
  return canvas;
}

/** One hazard pool frame: top `surface.length` rows tile `surface`, the rest tile `deep`; both
 * world-aligned (`mod(worldX/worldY, tile)`), so the pattern is continuous across pool edges. */
function renderPoolFrame(
  w: number,
  h: number,
  areaX: number,
  areaY: number,
  surface: PixelFrame,
  deep: PixelFrame,
  tile: number,
  pal: Readonly<Record<string, string>>,
): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(w, h);
  const surfaceRows = surface.length;
  for (let j = 0; j < h; j++) {
    const worldY = areaY + j;
    for (let i = 0; i < w; i++) {
      const worldX = areaX + i;
      const ch = j < surfaceRows ? surface[j]?.[mod(worldX, tile)] : deep[mod(worldY, tile)]?.[mod(worldX, tile)];
      if (!ch || ch === '.') continue;
      const color = pal[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(i, j, 1, 1);
    }
  }
  return canvas;
}

/** Static HC hazard-pool pattern (DESIGN §4.9): black wave/zigzag lines over a flat fill. */
function renderPoolHC(w: number, h: number, areaX: number, areaY: number, kind: 'water' | 'fire'): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(w, h);
  const fill = kind === 'water' ? HC.water : HC.fire;
  for (let j = 0; j < h; j++) {
    const worldY = areaY + j;
    for (let i = 0; i < w; i++) {
      const worldX = areaX + i;
      ctx.fillStyle = hcPoolLine(kind, worldX, worldY) ? HC.line : fill;
      ctx.fillRect(i, j, 1, 1);
    }
  }
  return canvas;
}

/** Static HC trap warning-stripe canvas (16×16, LOCAL coordinates — position-independent).
 * `fromRow` = 8 draws only the bottom half (the "triggering/cooling" shape cue). */
function buildHcTrapCanvas(fromRow: number): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(16, 16);
  for (let j = fromRow; j < 16; j++) {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = hcTrapStripe(i, j) ? HC.trap : HC.trapStripe;
      ctx.fillRect(i, j, 1, 1);
    }
  }
  return canvas;
}

/** Static HC exit canvas: a 1 px outline of the 16×14 doorway box + a 3×5 door glyph, both flat
 * `HC.exit` (DESIGN §4.9) — never the theme's own frame art or `'4'` glow-mote colour.
 * Position/theme-independent — built once from the pure `hcExitPixel` shape, blitted at
 * (x − 8, y − 14). */
function buildHcExitCanvas(): HTMLCanvasElement {
  const { canvas, ctx } = newCanvas(HC_EXIT_W, HC_EXIT_H);
  ctx.fillStyle = HC.exit;
  for (let y = 0; y < HC_EXIT_H; y++) {
    for (let x = 0; x < HC_EXIT_W; x++) {
      if (hcExitPixel(x, y)) ctx.fillRect(x, y, 1, 1);
    }
  }
  return canvas;
}

interface PoolCanvases {
  readonly normal: readonly HTMLCanvasElement[];
  readonly hc: HTMLCanvasElement;
}

export class ScenePainter {
  private theme: Theme = getTheme('mossgrove');
  private level: CompiledLevel | null = null;
  private objPal: Readonly<Record<string, string>> = MUMBLE_PALETTE;

  private decorDotsArr: Int16Array = new Int16Array(0);

  private lastTriggerTick = new Int32Array(0);
  private lastExitTick = new Int32Array(0);
  private readonly lastKnownPos = new Map<number, { x: number; y: number }>();

  private poolCanvases: ReadonlyArray<PoolCanvases | null> = [];

  private trapAnchorX = 8;
  private trapAnchorY = 16;
  private trapIdleCanvases: readonly HTMLCanvasElement[] = [];
  private trapTriggerCanvases: readonly HTMLCanvasElement[] = [];
  private readonly hcTrapFullCanvas = buildHcTrapCanvas(0);
  private readonly hcTrapPartialCanvas = buildHcTrapCanvas(8);

  private entranceAnchorX = 12;
  private entranceAnchorY = 14;
  /** [frame][0 = unlit crest, 1 = lit crest]. */
  private hatchCanvases: ReadonlyArray<readonly [HTMLCanvasElement, HTMLCanvasElement]> = [];

  private exitAnchorX = 10;
  private exitAnchorY = 22;
  private exitFrameCanvases: readonly HTMLCanvasElement[] = [];
  private exitAllLitCanvas: HTMLCanvasElement | null = null;
  private readonly hcExitCanvas = buildHcExitCanvas();

  /** Reset all per-level state and pre-render every object frame/variant (restart-safe). */
  setLevel(level: CompiledLevel, theme: Theme): void {
    this.level = level;
    this.theme = theme;
    this.objPal = { ...MUMBLE_PALETTE, ...getThemeObjects(level.themeId).palette };
    this.decorDotsArr = decorDots(level.seed, level.width, level.height);
    this.lastTriggerTick = new Int32Array(level.hazards.length).fill(-1000);
    this.lastExitTick = new Int32Array(level.exits.length).fill(-1000);
    this.lastKnownPos.clear();
    this.buildPoolCanvases();
    this.buildTrapCanvases();
    this.buildHatchCanvases();
    this.buildExitCanvases();
  }

  /** `trap-triggered` starts that trap's snap animation; `lemming-exited` lights the nearest
   * exit's all-lit glow. Also refreshes the last-known position of every live lemming, so the
   * nearest-exit lookup still works the tick a lemming is removed. */
  handleEvents(events: readonly GameEvent[], _tick: number, view: GameView): void {
    if (!this.level) return;
    const vt = view.tick;
    for (const ev of events) {
      if (ev.type === 'trap-triggered') {
        if (ev.hazardIndex >= 0 && ev.hazardIndex < this.lastTriggerTick.length) {
          this.lastTriggerTick[ev.hazardIndex] = vt;
        }
      } else if (ev.type === 'lemming-exited') {
        const pos = this.positionOf(ev.lemmingId, view);
        if (pos) {
          const idx = this.nearestExitIndex(pos.x, pos.y);
          if (idx >= 0) this.lastExitTick[idx] = vt;
        }
      }
    }
    for (const lem of view.lemmings) {
      if (lem.removed) continue;
      const known = this.lastKnownPos.get(lem.id);
      if (known) {
        known.x = lem.x;
        known.y = lem.y;
      } else {
        this.lastKnownPos.set(lem.id, { x: lem.x, y: lem.y });
      }
    }
  }

  drawBackground(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    timeMs: number,
    reducedMotion: boolean,
    highContrast: boolean,
  ): void {
    ctx.fillStyle = highContrast ? HC.background : this.theme.background;
    ctx.fillRect(0, 0, viewW, viewH);
    if (highContrast || !this.level) return;
    const color = this.theme.palette[this.theme.decor];
    if (!color) return;
    const count = this.decorDotsArr.length / 2;
    if (count === 0) return;
    const ambient = ambientTick(timeMs, reducedMotion);
    ctx.fillStyle = color;
    for (let k = 0; k < count; k++) {
      if (!decorDotVisible(k, ambient)) continue;
      const wx = this.decorDotsArr[k * 2] ?? 0;
      const wy = this.decorDotsArr[k * 2 + 1] ?? 0;
      const vx = wx - camX;
      const vy = wy - camY;
      if (vx < 0 || vx >= viewW || vy < 0 || vy >= viewH) continue;
      ctx.fillRect(vx, vy, 1, 1);
    }
  }

  drawPools(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    viewW: number,
    viewH: number,
    timeMs: number,
    reducedMotion: boolean,
    highContrast: boolean,
  ): void {
    const level = this.level;
    if (!level) return;
    const frame = ambientFrame(timeMs, 4, 4, reducedMotion);
    for (let i = 0; i < level.hazards.length; i++) {
      const zone = level.hazards[i];
      if (!zone || (zone.kind !== 'water' && zone.kind !== 'fire')) continue;
      const pools = this.poolCanvases[i];
      if (!pools) continue;
      const { x, y, w, h } = zone.area;
      const vx = x - camX;
      const vy = y - camY;
      if (vx + w <= 0 || vx >= viewW || vy + h <= 0 || vy >= viewH) continue;
      const canvas = highContrast ? pools.hc : pools.normal[frame];
      if (canvas) ctx.drawImage(canvas, vx, vy);
    }
  }

  drawTraps(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    camX: number,
    camY: number,
    timeMs: number,
    reducedMotion: boolean,
    highContrast: boolean,
  ): void {
    const level = this.level;
    if (!level) return;
    const idleFrame = ambientFrame(timeMs, 8, 2, reducedMotion);
    for (let i = 0; i < level.hazards.length; i++) {
      const zone = level.hazards[i];
      if (!zone || zone.kind !== 'trap') continue;
      const ax = Math.floor(zone.area.x + zone.area.w / 2);
      const ay = zone.area.y + zone.area.h;
      const since = this.lastTriggerTick[i] ?? -1000;
      const triggerFrame = trapTriggerFrame(view.tick - since);
      const cooldown = view.hazardCooldowns[i] ?? 0;
      const dx = ax - this.trapAnchorX - camX;
      const dy = ay - this.trapAnchorY - camY;
      if (highContrast) {
        const armed = triggerFrame < 0 && cooldown <= 0;
        ctx.drawImage(armed ? this.hcTrapFullCanvas : this.hcTrapPartialCanvas, dx, dy);
        continue;
      }
      let canvas: HTMLCanvasElement | undefined;
      if (triggerFrame >= 0) canvas = this.trapTriggerCanvases[triggerFrame];
      else if (cooldown > 0) canvas = this.trapTriggerCanvases[1];
      else canvas = this.trapIdleCanvases[idleFrame];
      if (canvas) ctx.drawImage(canvas, dx, dy);
    }
  }

  /**
   * NOTE: RENDER-PLAN §4's compact signature omits `reducedMotion`, but `hatchFrame` needs it
   * (DESIGN §7.4: the opening timing is gameplay information kept in both, but reduced motion
   * skips the multi-frame reveal and jumps straight to open) — added here; see final report.
   */
  drawHatches(ctx: CanvasRenderingContext2D, view: GameView, camX: number, camY: number, reducedMotion: boolean, _highContrast: boolean): void {
    const level = this.level;
    if (!level || this.hatchCanvases.length === 0) return;
    const frame = hatchFrame(view.tick, reducedMotion, view.nuking);
    const lit = hatchCrestLit(view.tick) ? 1 : 0;
    const pair = this.hatchCanvases[frame];
    const canvas = pair?.[lit];
    if (!canvas) return;
    for (const p of level.entrances) {
      ctx.drawImage(canvas, p.x - this.entranceAnchorX - camX, p.y - this.entranceAnchorY - camY);
    }
  }

  drawExits(
    ctx: CanvasRenderingContext2D,
    view: GameView,
    camX: number,
    camY: number,
    timeMs: number,
    reducedMotion: boolean,
    highContrast: boolean,
  ): void {
    const level = this.level;
    if (!level) return;
    const frame = ambientFrame(timeMs, 4, 4, reducedMotion);
    for (let k = 0; k < level.exits.length; k++) {
      const p = level.exits[k];
      if (!p) continue;
      if (highContrast) {
        ctx.drawImage(this.hcExitCanvas, p.x - 8 - camX, p.y - 14 - camY);
        continue;
      }
      const lit = exitGlowLit(view.tick, this.lastExitTick[k] ?? -1000);
      const canvas = lit ? this.exitAllLitCanvas : this.exitFrameCanvases[frame];
      if (canvas) ctx.drawImage(canvas, p.x - this.exitAnchorX - camX, p.y - this.exitAnchorY - camY);
    }
  }

  private buildPoolCanvases(): void {
    const level = this.level;
    if (!level) {
      this.poolCanvases = [];
      return;
    }
    const art = getThemeObjects(level.themeId).hazard;
    const pal = this.objPal;
    this.poolCanvases = level.hazards.map((zone): PoolCanvases | null => {
      if (zone.kind !== 'water' && zone.kind !== 'fire') return null;
      const { x, y, w, h } = zone.area;
      const normal = art.surface.map((surface) => renderPoolFrame(w, h, x, y, surface, art.deep, art.tile, pal));
      const hc = renderPoolHC(w, h, x, y, zone.kind);
      return { normal, hc };
    });
  }

  private buildTrapCanvases(): void {
    const level = this.level;
    if (!level) return;
    const art = getThemeObjects(level.themeId).trap;
    const pal = this.objPal;
    this.trapAnchorX = art.anchorX;
    this.trapAnchorY = art.anchorY;
    this.trapIdleCanvases = art.idle.map((rows) => renderFrame(rows, pal));
    this.trapTriggerCanvases = art.trigger.map((rows) => renderFrame(rows, pal));
  }

  private buildHatchCanvases(): void {
    const level = this.level;
    if (!level) return;
    const art = getThemeObjects(level.themeId).entrance;
    const pal = this.objPal;
    this.entranceAnchorX = art.anchorX;
    this.entranceAnchorY = art.anchorY;
    const glow = pal['4'];
    this.hatchCanvases = art.frames.map(
      (rows) => [renderFrame(rows, pal), glow ? renderFrame(rows, pal, '+', glow) : renderFrame(rows, pal)] as const,
    );
  }

  private buildExitCanvases(): void {
    const level = this.level;
    if (!level) return;
    const art = getThemeObjects(level.themeId).exit;
    const pal = this.objPal;
    this.exitAnchorX = art.anchorX;
    this.exitAnchorY = art.anchorY;
    this.exitFrameCanvases = art.frames.map((rows) => renderFrame(rows, pal));
    this.exitAllLitCanvas = renderExitAllLit(art.frames, pal);
  }

  private positionOf(id: number, view: GameView): { x: number; y: number } | null {
    for (const lem of view.lemmings) {
      if (lem.id === id) return { x: lem.x, y: lem.y };
    }
    return this.lastKnownPos.get(id) ?? null;
  }

  private nearestExitIndex(x: number, y: number): number {
    const level = this.level;
    if (!level || level.exits.length === 0) return -1;
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < level.exits.length; i++) {
      const p = level.exits[i];
      if (!p) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }
}
