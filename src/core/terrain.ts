/**
 * Pixel-destructible terrain: one byte of material + one byte of palette colour per pixel.
 *
 * The core only reasons about `material`; `color` is carried along so the renderer can paint
 * exactly what the simulation sees. Every mutation grows a dirty rectangle that the renderer
 * consumes (`takeDirty`) to re-upload only the changed pixels.
 */
import type { Direction, Rect } from './types.ts';

/** Material codes (a const object instead of an enum — enums are not erasable syntax). */
export const Material = {
  Empty: 0,
  Earth: 1,
  Steel: 2,
  /** Earth that can only be bashed/mined while moving left. */
  OneWayLeft: 3,
  /** Earth that can only be bashed/mined while moving right. */
  OneWayRight: 4,
} as const;
export type Material = (typeof Material)[keyof typeof Material];

/** Palette index 0 means "no colour" (transparent). */
export const NO_COLOR = 0;

export interface ReadonlyTerrain {
  readonly width: number;
  readonly height: number;
  /** Row-major material bytes (index = y * width + x). */
  readonly material: Readonly<Uint8Array>;
  /** Row-major palette indices (index = y * width + x). */
  readonly color: Readonly<Uint8Array>;
  inBounds(x: number, y: number): boolean;
  /** Material at (x, y); out-of-bounds reads as Empty. */
  get(x: number, y: number): Material;
  isSolid(x: number, y: number): boolean;
  /** Changed area since the last call, or null. Single consumer: the renderer's terrain layer. */
  takeDirty(): Rect | null;
}

export class Terrain implements ReadonlyTerrain {
  readonly width: number;
  readonly height: number;
  readonly material: Uint8Array;
  readonly color: Uint8Array;
  private dirtyMinX = Infinity;
  private dirtyMinY = Infinity;
  private dirtyMaxX = -Infinity;
  private dirtyMaxY = -Infinity;

  constructor(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
      throw new RangeError(`Invalid terrain size ${width}x${height}`);
    }
    this.width = width;
    this.height = height;
    this.material = new Uint8Array(width * height);
    this.color = new Uint8Array(width * height);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): Material {
    if (!this.inBounds(x, y)) return Material.Empty;
    return (this.material[y * this.width + x] ?? Material.Empty) as Material;
  }

  isSolid(x: number, y: number): boolean {
    return this.get(x, y) !== Material.Empty;
  }

  /** Unconditionally write a pixel (level compiler, builder bricks). Out of bounds is ignored. */
  set(x: number, y: number, material: Material, color: number): void {
    if (!this.inBounds(x, y)) return;
    const i = y * this.width + x;
    this.material[i] = material;
    this.color[i] = material === Material.Empty ? NO_COLOR : color;
    this.markDirty(x, y, 1, 1);
  }

  /**
   * Whether a skill/explosion may remove the pixel. Steel never; one-way earth only when
   * `dir` matches its arrow (pass `0` for direction-less removal such as digging or bombs).
   */
  canRemove(x: number, y: number, dir: Direction | 0): boolean {
    const m = this.get(x, y);
    if (m === Material.Steel) return false;
    if (m === Material.OneWayLeft) return dir !== 1;
    if (m === Material.OneWayRight) return dir !== -1;
    return true;
  }

  /** Remove one pixel if allowed. Returns false when the pixel is protected (steel / one-way). */
  remove(x: number, y: number, dir: Direction | 0): boolean {
    if (!this.canRemove(x, y, dir)) return false;
    if (this.isSolid(x, y)) this.set(x, y, Material.Empty, NO_COLOR);
    return true;
  }

  clone(): Terrain {
    const copy = new Terrain(this.width, this.height);
    copy.material.set(this.material);
    copy.color.set(this.color);
    copy.markAll();
    return copy;
  }

  markDirty(x: number, y: number, w: number, h: number): void {
    this.dirtyMinX = Math.min(this.dirtyMinX, x);
    this.dirtyMinY = Math.min(this.dirtyMinY, y);
    this.dirtyMaxX = Math.max(this.dirtyMaxX, x + w - 1);
    this.dirtyMaxY = Math.max(this.dirtyMaxY, y + h - 1);
  }

  markAll(): void {
    this.markDirty(0, 0, this.width, this.height);
  }

  /** Changed area since the last call (clamped to bounds), or null. Resets tracking. */
  takeDirty(): Rect | null {
    if (this.dirtyMaxX < this.dirtyMinX) return null;
    const x = Math.max(0, this.dirtyMinX);
    const y = Math.max(0, this.dirtyMinY);
    const rect: Rect = {
      x,
      y,
      w: Math.min(this.width - 1, this.dirtyMaxX) - x + 1,
      h: Math.min(this.height - 1, this.dirtyMaxY) - y + 1,
    };
    this.dirtyMinX = this.dirtyMinY = Infinity;
    this.dirtyMaxX = this.dirtyMaxY = -Infinity;
    return rect.w > 0 && rect.h > 0 ? rect : null;
  }
}
