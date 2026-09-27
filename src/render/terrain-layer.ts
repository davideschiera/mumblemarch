/**
 * Offscreen bitmap of the whole level's terrain. Built once per level from the terrain's
 * palette indices; afterwards only the dirty rectangle reported by the core is re-coloured
 * and re-uploaded (bashers/diggers change a few pixels per tick, not the whole map).
 *
 * Two colouring modes share the same pixel buffer: the normal theme LUT (palette index → RGBA,
 * precomputed once) and DESIGN §4.9's high-contrast "clear physics" view (colour by Material +
 * a position-dependent pattern, plus a 1 px white edge — so it cannot be a flat 256-entry LUT).
 * `setHighContrast` schedules a full repaint on the next `sync()`, since edges/patterns depend on
 * neighbours and must be recomputed everywhere, not just on the live dirty rect.
 */
import { Material, type ReadonlyTerrain } from '../core/terrain.ts';
import type { Theme } from '../levels/themes.ts';
import { hcTerrainColor, packRgba } from './high-contrast.ts';

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export class TerrainLayer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly terrain: ReadonlyTerrain;
  private readonly image: ImageData;
  private readonly pixels: Uint32Array;
  /** Palette index → packed RGBA (little-endian ABGR), index 0 transparent. */
  private readonly lut = new Uint32Array(256);
  /** `hcTerrainColor`'s hex output → packed RGBA. Only a handful of distinct strings ever occur
   * (HC.edge/earth/steel/steelHatch/oneWay/chevron), so this parses each one only once — the
   * "small material×pattern cache" the plan asks for, keyed by the resulting colour instead of
   * the (material, pattern) input, which is equivalent (same tiny, finite cardinality). */
  private readonly hcCache = new Map<string, number>();
  private highContrast = false;
  private pendingFull = true;

  constructor(terrain: ReadonlyTerrain, theme: Theme) {
    this.terrain = terrain;
    this.canvas = document.createElement('canvas');
    this.canvas.width = terrain.width;
    this.canvas.height = terrain.height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
    this.image = ctx.createImageData(terrain.width, terrain.height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    theme.palette.forEach((hex, i) => {
      if (i === 0) return;
      this.lut[i] = packRgba(hex);
    });
    this.sync();
  }

  /** DESIGN §4.9 clear-physics view. A change forces a full repaint on the next `sync()`. */
  setHighContrast(on: boolean): void {
    if (on === this.highContrast) return;
    this.highContrast = on;
    this.pendingFull = true;
  }

  /** Re-colour and upload whatever changed (or everything). Call once per rendered frame. */
  sync(): void {
    const dirty = this.terrain.takeDirty();
    const wantFull = this.pendingFull;
    this.pendingFull = false;
    const rect: Rect | null = wantFull ? { x: 0, y: 0, w: this.terrain.width, h: this.terrain.height } : dirty;
    if (!rect) return;
    if (this.highContrast) {
      this.syncHighContrast(this.growRect(rect));
    } else {
      this.syncNormal(rect);
    }
  }

  /** Grow a rect by 1 px on every side (clamped to the canvas): HC edges/patterns depend on
   * neighbours, so a pixel just outside the live dirty rect can change how its neighbour looks. */
  private growRect(rect: Rect): Rect {
    const x0 = Math.max(0, rect.x - 1);
    const y0 = Math.max(0, rect.y - 1);
    const x1 = Math.min(this.terrain.width - 1, rect.x + rect.w);
    const y1 = Math.min(this.terrain.height - 1, rect.y + rect.h);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  private syncNormal(rect: Rect): void {
    const { width, color } = this.terrain;
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        const i = y * width + x;
        this.pixels[i] = this.lut[color[i] ?? 0] ?? 0;
      }
    }
    this.ctx.putImageData(this.image, 0, 0, rect.x, rect.y, rect.w, rect.h);
  }

  private syncHighContrast(rect: Rect): void {
    const { width, material } = this.terrain;
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) {
        const i = y * width + x;
        const m = material[i] ?? Material.Empty;
        if (m === Material.Empty) {
          this.pixels[i] = 0;
          continue;
        }
        const edge =
          !this.terrain.isSolid(x - 1, y) || !this.terrain.isSolid(x + 1, y) || !this.terrain.isSolid(x, y - 1) || !this.terrain.isSolid(x, y + 1);
        this.pixels[i] = this.packedHc(m, x, y, edge);
      }
    }
    this.ctx.putImageData(this.image, 0, 0, rect.x, rect.y, rect.w, rect.h);
  }

  private packedHc(material: number, x: number, y: number, edge: boolean): number {
    const hex = hcTerrainColor(material, x, y, edge);
    let packed = this.hcCache.get(hex);
    if (packed === undefined) {
      packed = packRgba(hex);
      this.hcCache.set(hex, packed);
    }
    return packed;
  }
}
