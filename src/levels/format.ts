/**
 * Level AUTHORING format. Levels are plain TypeScript objects (type-checked, no parser, no
 * fetch). `compiler.ts` turns a LevelDef into a simulation-ready CompiledLevel.
 *
 * Coordinates are world pixels, origin top-left, y grows downwards. Terrain primitives are
 * painted in array order, so later shapes overwrite (or carve) earlier ones.
 */
import type { SkillId } from '../core/types.ts';
import type { StampId } from './stamps.ts';
import type { ThemeId } from './themes.ts';

export type TierId = 1 | 2 | 3 | 4;

/** What a primitive paints. One-way materials are earth that can only be tunnelled one way. */
export type MaterialName = 'earth' | 'steel' | 'one-way-left' | 'one-way-right';

/**
 * - `add`    (default) paint material over whatever is there
 * - `behind` paint only where the terrain is currently empty (background decoration/fill)
 * - `erase`  carve back to empty (caves, tunnels, arches)
 */
export type PaintOp = 'add' | 'behind' | 'erase';

/** How colours are chosen from the theme palette (deterministic, seeded by the level). */
export type FillStyle = 'natural' | 'solid' | 'strata' | 'bricks' | 'metal';

interface PrimitiveBase {
  readonly op?: PaintOp;
  /** Default 'earth'. */
  readonly material?: MaterialName;
  /** Default: 'metal' for steel, 'natural' otherwise. */
  readonly fill?: FillStyle;
}

export interface RectPrimitive extends PrimitiveBase {
  readonly kind: 'rect';
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PolygonPrimitive extends PrimitiveBase {
  readonly kind: 'polygon';
  /** Closed polygon, even-odd fill. */
  readonly points: readonly (readonly [x: number, y: number])[];
}

export interface EllipsePrimitive extends PrimitiveBase {
  readonly kind: 'ellipse';
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A pre-drawn shape from `stamps.ts` (ASCII art), placed by its top-left corner. */
export interface StampPrimitive extends PrimitiveBase {
  readonly kind: 'stamp';
  readonly stamp: StampId;
  readonly x: number;
  readonly y: number;
  readonly flipX?: boolean;
  /** Integer pixel scale (default 1). */
  readonly scale?: number;
}

export type TerrainPrimitive = RectPrimitive | PolygonPrimitive | EllipsePrimitive | StampPrimitive;

export interface HazardDef {
  readonly kind: 'water' | 'fire' | 'trap';
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Traps only (default 2 s). */
  readonly cooldownSeconds?: number;
  /** Stretch/optional: visual anchor for the hazard/trap art (defaults to the box's own placement). */
  readonly art?: { readonly x: number; readonly y: number; readonly flipX?: boolean };
}

export interface LevelDef {
  /** Stable kebab-case id — used as the progress key in localStorage. Never rename shipped ids. */
  readonly id: string;
  readonly title: string;
  readonly tier: TierId;
  /** One-line hint shown on the briefing screen (optional, spoiler-light). */
  readonly hint?: string;
  readonly theme: ThemeId;
  /** 400–1600 px, a multiple of 8 (DESIGN D2). */
  readonly width: number;
  /** Always 160 (DESIGN D2). */
  readonly height: number;
  /** Lemmings released in total. */
  readonly lemmings: number;
  /** Lemmings that must be saved to win. */
  readonly saveRequired: number;
  /** Initial and minimum release rate (1–99). */
  readonly releaseRate: number;
  readonly timeLimitSeconds: number;
  /** Omitted skills are 0. */
  readonly skills: Partial<Record<SkillId, number>>;
  /** Entrance hatch spawn points (1–4; must be empty space — lemmings spawn falling). */
  readonly entrances: readonly { readonly x: number; readonly y: number }[];
  /**
   * Exit anchors: the FLOOR pixel under the doorway centre (same convention as a lemming's
   * foot — it must be solid terrain; tests check this).
   */
  readonly exits: readonly { readonly x: number; readonly y: number }[];
  readonly terrain: readonly TerrainPrimitive[];
  /** Stretch/optional: background decoration primitives, drawn but never simulated (no collision). */
  readonly decor?: readonly TerrainPrimitive[];
  readonly hazards?: readonly HazardDef[];
  /** Initial camera centre x (default: first entrance). */
  readonly cameraX?: number;
  /** RNG seed for texture noise and the session (default: hash of id). */
  readonly seed?: number;
}
