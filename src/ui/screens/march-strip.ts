/**
 * Title screen footer decor: a canvas strip where 5–8 mumbles march right across a grassy
 * ledge (DESIGN §5.4 Title). World canvas 400×32 px, scaled by CSS to an integer multiple
 * (DESIGN §5.1 integer scaling) that `resize()` snaps to the caller's measured column width.
 * Reduced motion (§7.4 "Title-screen marching strip: animated → static frame"): a single static
 * frame, no animation loop. Cheap: one small canvas, no DOM per mumble.
 * Owner: e3a1-title-results.
 */
import { TICK_MS } from '../../core/constants.ts';
import { animFrameIndex, MUMBLE_ANIMS, MUMBLE_PALETTE } from '../../art/index.ts';
import { getTheme } from '../../levels/themes.ts';
import { h } from '../dom.ts';
import { drawPixelFrame } from '../pixel-art.ts';

const WORLD_W = 400;
const WORLD_H = 32;
const GROUND_Y = 25; // world px: the lit grass row mumbles stand on
const WALK = MUMBLE_ANIMS.walking;
const THEME = getTheme('mossgrove');
const WALKER_COUNT = 7; // 5–8 per DESIGN §5.4

interface Walker {
  readonly x0: number; // even starting spread across the strip
  readonly phase: number; // tick offset so mumbles don't step in lockstep
}

export interface MarchStrip {
  readonly element: HTMLCanvasElement;
  /** Snap the strip's rendered CSS size to the largest integer multiple of 400×32 that fits
   * `containerWidth` (min ×1), so the marchers' pixels stay even (DESIGN §5.1). */
  resize(containerWidth: number): void;
  destroy(): void;
}

function makeWalkers(): readonly Walker[] {
  const spacing = WORLD_W / WALKER_COUNT;
  // Half-spacing offset keeps every walker's sprite clear of the x=0 seam (footX would clip it).
  return Array.from({ length: WALKER_COUNT }, (_, i) => ({
    x0: Math.round(spacing / 2 + i * spacing),
    phase: (i * 3 * WALK.ticksPerFrame) % (WALK.frames.length * WALK.ticksPerFrame),
  }));
}

function wrap(x: number, width: number): number {
  const m = x % width;
  return m < 0 ? m + width : m;
}

function drawGround(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = THEME.palette[THEME.earth[1] ?? THEME.earth[0] ?? 0] ?? '#5a3d2b';
  ctx.fillRect(0, GROUND_Y + 1, WORLD_W, WORLD_H - (GROUND_Y + 1));
  ctx.fillStyle = THEME.palette[THEME.surface] ?? '#6cc04a';
  ctx.fillRect(0, GROUND_Y, WORLD_W, 1);
}

/** `tick` = simulated walk-cycle ticks elapsed (0 for the reduced-motion static frame). */
function render(ctx: CanvasRenderingContext2D, walkers: readonly Walker[], tick: number): void {
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);
  drawGround(ctx);
  for (const walker of walkers) {
    const frame = WALK.frames[animFrameIndex(WALK, tick + walker.phase)];
    if (!frame) continue;
    const x = wrap(walker.x0 + tick, WORLD_W);
    const y = GROUND_Y - WALK.footY;
    drawPixelFrame(ctx, frame, MUMBLE_PALETTE, Math.round(x - WALK.footX), y, 1, false);
    // A second copy one strip-width to the left so a walker crossing x=0 wraps seamlessly.
    drawPixelFrame(ctx, frame, MUMBLE_PALETTE, Math.round(x - WALK.footX - WORLD_W), y, 1, false);
  }
}

/** Builds the strip; call `destroy()` when the title screen unmounts to stop its rAF loop. */
export function createMarchStrip(reducedMotion: boolean): MarchStrip {
  const canvas = h('canvas', { width: WORLD_W, height: WORLD_H, class: 'title-strip', 'aria-hidden': 'true' });
  const ctx = canvas.getContext('2d');
  const walkers = makeWalkers();
  let destroyed = false;
  let raf = 0;

  function resize(containerWidth: number): void {
    const scale = Math.max(1, Math.floor(containerWidth / WORLD_W));
    canvas.style.width = `${WORLD_W * scale}px`;
    canvas.style.height = `${WORLD_H * scale}px`;
  }

  if (ctx) {
    if (reducedMotion) {
      render(ctx, walkers, 0);
    } else {
      let tick = 0;
      let acc = 0;
      let last = 0;
      const loop = (now: number): void => {
        if (destroyed) return;
        if (last === 0) last = now;
        acc += now - last;
        last = now;
        for (let steps = 0; acc >= TICK_MS && steps < 4; steps++) {
          tick++;
          acc -= TICK_MS;
        }
        render(ctx, walkers, tick);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
  }

  return {
    element: canvas,
    resize,
    destroy(): void {
      destroyed = true;
      if (raf) cancelAnimationFrame(raf);
    },
  };
}
