/**
 * Level compiler: LevelDef (authoring) → CompiledLevel (simulation-ready).
 *
 * Pure and deterministic (colouring uses `h2`/`vnoise`, pure functions of (x, y, seed) — see
 * `texture.ts` — never a sequential RNG), so it runs identically in the browser and in Node
 * tests. Painting is a strict two pass process (App. E.2 V5):
 *   1. primitives, in array order, write a material byte and a fill-style code per pixel;
 *   2. every solid pixel is coloured from its FINAL material/fill using the DESIGN §4.2 recipes,
 *      then one-way chevrons (§4.4) are baked over the fill.
 * Each primitive becomes a {@link Shape} (bounding box + per-pixel coverage test); rasterising is
 * shared by all primitive kinds and by `levelGeometryProblems`.
 */
import {
  LEVEL_HEIGHT,
  LEVEL_MAX_WIDTH,
  LEVEL_MIN_WIDTH,
  LEVEL_WIDTH_STEP,
  MAX_ENTRANCES,
  MAX_LEMMINGS,
  MAX_SKILL_COUNT,
  TICKS_PER_SECOND,
} from '../core/constants.ts';
import { hashString } from '../core/rng.ts';
import { Material, Terrain } from '../core/terrain.ts';
import { SKILL_IDS, type CompiledLevel, type HazardZone, type SkillId } from '../core/types.ts';
import type { FillStyle, LevelDef, MaterialName, TerrainPrimitive } from './format.ts';
import { STAMPS } from './stamps.ts';
import { getTheme, type Theme } from './themes.ts';
import { CHEV, h2, mod, PLATE, vnoise } from './texture.ts';

const MATERIALS: Readonly<Record<MaterialName, Material>> = {
  earth: Material.Earth,
  steel: Material.Steel,
  'one-way-left': Material.OneWayLeft,
  'one-way-right': Material.OneWayRight,
};

/** Fill styles packed into a `Uint8Array` for the pass-1 fill map. */
const FILL_STYLES: readonly FillStyle[] = ['natural', 'solid', 'strata', 'bricks', 'metal'];
const FILL_CODES: Readonly<Record<FillStyle, number>> = {
  natural: 0,
  solid: 1,
  strata: 2,
  bricks: 3,
  metal: 4,
};

export class LevelValidationError extends Error {
  readonly problems: readonly string[];
  constructor(levelId: string, problems: readonly string[]) {
    super(`Invalid level '${levelId}':\n  ${problems.join('\n  ')}`);
    this.problems = problems;
  }
}

/**
 * Problems shared by any list of terrain primitives (used for both `LevelDef.terrain` and the
 * optional, uncollided `LevelDef.decor`): unknown materials/fills/stamps and malformed shapes.
 */
function primitiveProblems(prims: readonly TerrainPrimitive[], where: string): string[] {
  const problems: string[] = [];
  prims.forEach((p, i) => {
    const material = p.material ?? 'earth';
    const label = `${where}[${i}]`;
    if (p.fill === 'metal' && material !== 'steel') {
      problems.push(`${label}: fill 'metal' may only be used on steel`);
    }
    if (material === 'steel' && p.fill !== undefined && p.fill !== 'metal') {
      problems.push(`${label}: steel must use fill 'metal' (or omit fill)`);
    }
    if (p.kind === 'polygon' && p.points.length < 3) {
      problems.push(`${label}: polygon needs at least 3 points`);
    }
    if (p.kind === 'stamp') {
      if (!Object.hasOwn(STAMPS, p.stamp)) problems.push(`${label}: unknown stamp '${p.stamp}'`);
      if (p.scale !== undefined && (!Number.isInteger(p.scale) || p.scale <= 0)) {
        problems.push(`${label}: stamp scale must be a positive integer`);
      }
    }
  });
  return problems;
}

/**
 * Human-readable problems with a level definition (empty array = valid). Enforces the level
 * rules of DESIGN D2 and the engine limits in core/constants.ts. Deliberately excludes geometry
 * checks (exits/entrances vs. terrain) — see {@link levelGeometryProblems} — because core tests
 * compile ad-hoc levels whose exits may float.
 */
export function validateLevel(def: LevelDef): string[] {
  const problems: string[] = [];
  const isInt = (n: number): boolean => Number.isInteger(n);
  const inBounds = (p: { x: number; y: number }): boolean =>
    p.x >= 0 && p.y >= 0 && p.x < def.width && p.y < def.height;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(def.id)) problems.push('id must be kebab-case');
  if (def.height !== LEVEL_HEIGHT) problems.push(`height must be ${LEVEL_HEIGHT}`);
  if (!isInt(def.width) || def.width < LEVEL_MIN_WIDTH || def.width > LEVEL_MAX_WIDTH || def.width % LEVEL_WIDTH_STEP !== 0) {
    problems.push(`width must be ${LEVEL_MIN_WIDTH}–${LEVEL_MAX_WIDTH} in steps of ${LEVEL_WIDTH_STEP}`);
  }
  if (!isInt(def.lemmings) || def.lemmings < 1 || def.lemmings > MAX_LEMMINGS) {
    problems.push(`lemmings must be 1–${MAX_LEMMINGS}`);
  }
  if (!isInt(def.saveRequired) || def.saveRequired < 0 || def.saveRequired > def.lemmings) {
    problems.push('saveRequired must be between 0 and lemmings');
  }
  if (!isInt(def.releaseRate) || def.releaseRate < 1 || def.releaseRate > 99) {
    problems.push('releaseRate must be 1–99');
  }
  if (!(def.timeLimitSeconds > 0)) problems.push('timeLimitSeconds must be > 0');
  if (def.entrances.length < 1 || def.entrances.length > MAX_ENTRANCES) {
    problems.push(`entrances must number 1–${MAX_ENTRANCES}`);
  }
  if (def.exits.length === 0) problems.push('at least one exit is required');
  for (const p of [...def.entrances, ...def.exits]) {
    if (!inBounds(p)) problems.push(`point (${p.x}, ${p.y}) is outside the level`);
  }
  for (const [skill, count] of Object.entries(def.skills)) {
    if (!isInt(count) || count < 0 || count > MAX_SKILL_COUNT) {
      problems.push(`skill ${skill} count must be an integer 0–${MAX_SKILL_COUNT}`);
    }
  }
  for (const h of def.hazards ?? []) {
    if (h.w <= 0 || h.h <= 0 || !inBounds(h) || !inBounds({ x: h.x + h.w - 1, y: h.y + h.h - 1 })) {
      problems.push(`${h.kind} hazard at (${h.x}, ${h.y}) must have a positive size inside the level`);
    }
  }
  problems.push(...primitiveProblems(def.terrain, 'terrain'));
  if (def.decor) problems.push(...primitiveProblems(def.decor, 'decor'));
  return problems;
}

/**
 * Geometry problems that require rasterising the level (kept separate from {@link validateLevel}
 * because core tests compile ad-hoc levels whose exits may float): every exit whose anchor pixel
 * is not solid, and every entrance whose anchor pixel is not open air.
 */
export function levelGeometryProblems(def: LevelDef): string[] {
  const problems: string[] = [];
  const { mat } = paintPrimitives(def.width, def.height, def.terrain);
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < def.width && y < def.height && mat[y * def.width + x] !== Material.Empty;
  def.exits.forEach((p, i) => {
    if (!solid(p.x, p.y)) problems.push(`exit ${i} at (${p.x}, ${p.y}) is not on solid floor`);
  });
  def.entrances.forEach((p, i) => {
    if (solid(p.x, p.y)) problems.push(`entrance ${i} at (${p.x}, ${p.y}) is not in open air`);
  });
  return problems;
}

export function compileLevel(def: LevelDef): CompiledLevel {
  const problems = validateLevel(def);
  if (problems.length > 0) throw new LevelValidationError(def.id, problems);

  const seed = def.seed ?? hashString(def.id);
  const theme = getTheme(def.theme);
  const terrain = buildTerrain(def.width, def.height, def.terrain, theme, seed);
  // LevelDef.decor is background-only (no collision) and deliberately not painted here.

  const skills = Object.fromEntries(SKILL_IDS.map((id) => [id, def.skills[id] ?? 0])) as Record<
    SkillId,
    number
  >;
  const hazards: HazardZone[] = (def.hazards ?? []).map((h) => ({
    kind: h.kind,
    area: { x: h.x, y: h.y, w: h.w, h: h.h },
    cooldownTicks: Math.round((h.cooldownSeconds ?? 2) * TICKS_PER_SECOND),
  }));

  return {
    id: def.id,
    width: def.width,
    height: def.height,
    terrain,
    entrances: def.entrances.map((p) => ({ x: p.x, y: p.y })),
    exits: def.exits.map((p) => ({ x: p.x, y: p.y })),
    hazards,
    lemmingCount: def.lemmings,
    saveRequired: def.saveRequired,
    releaseRate: def.releaseRate,
    timeLimitTicks: Math.round(def.timeLimitSeconds * TICKS_PER_SECOND),
    skills,
    seed,
    brickColor: theme.builderBrick,
    themeId: theme.id,
  };
}

// ─── Shapes ────────────────────────────────────────────────────────────────────────────────

interface Shape {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  covers(x: number, y: number): boolean;
}

function shapeOf(p: TerrainPrimitive): Shape {
  switch (p.kind) {
    case 'rect':
      return {
        minX: p.x,
        minY: p.y,
        maxX: p.x + p.w - 1,
        maxY: p.y + p.h - 1,
        covers: (x, y) => x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h,
      };
    case 'ellipse':
      return {
        minX: Math.floor(p.cx - p.rx),
        minY: Math.floor(p.cy - p.ry),
        maxX: Math.ceil(p.cx + p.rx),
        maxY: Math.ceil(p.cy + p.ry),
        covers: (x, y) => {
          // Plain multiplication (not **) keeps results bit-identical across JS engines.
          const nx = (x + 0.5 - p.cx) / p.rx;
          const ny = (y + 0.5 - p.cy) / p.ry;
          return nx * nx + ny * ny <= 1;
        },
      };
    case 'polygon': {
      const xs = p.points.map(([x]) => x);
      const ys = p.points.map(([, y]) => y);
      return {
        minX: Math.floor(Math.min(...xs)),
        minY: Math.floor(Math.min(...ys)),
        maxX: Math.ceil(Math.max(...xs)),
        maxY: Math.ceil(Math.max(...ys)),
        covers: (x, y) => insidePolygon(p.points, x + 0.5, y + 0.5),
      };
    }
    case 'stamp': {
      const rows: readonly string[] = STAMPS[p.stamp];
      const scale = Math.max(1, Math.floor(p.scale ?? 1));
      const cols = Math.max(...rows.map((r) => r.length));
      return {
        minX: p.x,
        minY: p.y,
        maxX: p.x + cols * scale - 1,
        maxY: p.y + rows.length * scale - 1,
        covers: (x, y) => {
          const sx = Math.floor((x - p.x) / scale);
          const col = p.flipX ? cols - 1 - sx : sx;
          return rows[Math.floor((y - p.y) / scale)]?.[col] === '#';
        },
      };
    }
  }
}

/** Even-odd rule point-in-polygon test. */
function insidePolygon(points: readonly (readonly [number, number])[], px: number, py: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ─── Pass 1: rasterise materials + fill styles ────────────────────────────────────────────

/**
 * Paints every primitive, in array order, into a material byte map and a fill-style code map
 * (`add` overwrites, `behind` only where empty, `erase` clears both). Shared by `buildTerrain`
 * (pass 1 of 2) and `levelGeometryProblems` (which only needs the material map).
 */
function paintPrimitives(
  width: number,
  height: number,
  primitives: readonly TerrainPrimitive[],
): { readonly mat: Uint8Array; readonly fillCode: Uint8Array } {
  const mat = new Uint8Array(width * height);
  const fillCode = new Uint8Array(width * height);
  for (const p of primitives) {
    const shape = shapeOf(p);
    const op = p.op ?? 'add';
    const material = MATERIALS[p.material ?? 'earth'];
    const fill: FillStyle = p.fill ?? (material === Material.Steel ? 'metal' : 'natural');
    const fc = FILL_CODES[fill];
    const x0 = Math.max(0, shape.minX);
    const y0 = Math.max(0, shape.minY);
    const x1 = Math.min(width - 1, shape.maxX);
    const y1 = Math.min(height - 1, shape.maxY);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!shape.covers(x, y)) continue;
        const i = y * width + x;
        if (op === 'erase') {
          mat[i] = Material.Empty;
          fillCode[i] = 0;
          continue;
        }
        if (op === 'behind' && mat[i] !== Material.Empty) continue;
        mat[i] = material;
        fillCode[i] = fc;
      }
    }
  }
  return { mat, fillCode };
}

// ─── Pass 2: colour + one-way chevrons ─────────────────────────────────────────────────────

/**
 * Rasterises `primitives` (pass 1) and colours every solid pixel with the DESIGN §4.2 texture
 * recipes, using `depth`/`edge` computed on the FINAL pass-1 material map, then bakes one-way
 * chevrons (§4.4) over the fill (pass 2). Pure: no validation, any size. `compileLevel` is the
 * only other place that should build terrain — call this directly only from tests/tools.
 */
export function buildTerrain(
  width: number,
  height: number,
  primitives: readonly TerrainPrimitive[],
  theme: Theme,
  seed: number,
): Terrain {
  const { mat, fillCode } = paintPrimitives(width, height, primitives);
  const terrain = new Terrain(width, height);
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && mat[y * width + x] !== Material.Empty;
  const earth = theme.earth;
  const steel = theme.steel;
  const [brickW, brickH] = theme.texture.brick;
  const strataBands = theme.texture.strataBands;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const m = mat[i];
      if (m === Material.Empty) continue;
      const fill = FILL_STYLES[fillCode[i] ?? 0] ?? 'natural';

      let depth = 0;
      while (depth < 8 && solid(x, y - depth - 1)) depth++;
      const edge = !solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y + 1);

      let c: number;
      if (fill === 'metal') {
        const row = PLATE[mod(y, 8)]!;
        const k = row[mod(x, 8)];
        c = k === 'L' || k === 'r' ? (steel[2] ?? 0) : k === 'M' ? (steel[1] ?? 0) : (steel[0] ?? 0);
        if (!solid(x, y - 1)) c = steel[2] ?? 0;
        if (!solid(x, y + 1) || !solid(x + 1, y)) c = steel[0] ?? 0;
        if (!solid(x - 1, y)) c = steel[2] ?? 0;
      } else if (fill === 'bricks') {
        const row = Math.floor(y / brickH);
        const off = (row % 2) * Math.floor(brickW / 2);
        const bx = mod(x + off, brickW);
        const by = mod(y, brickH);
        const worn = h2(Math.floor((x + off) / brickW), row, seed ^ 0xb1c) < 0.3;
        c =
          bx === brickW - 1 || by === brickH - 1
            ? theme.bricks[1]
            : by === 0 || bx === 0
              ? theme.brickHi
              : worn && h2(x, y, seed ^ 0x77) < 0.35
                ? theme.brickHi
                : theme.bricks[0];
        if (theme.texture.mossOnBricks && depth === 0) c = theme.surface;
      } else if (fill === 'strata') {
        const yy = y + Math.round(1.5 * Math.sin((x + (seed % 97)) / 9));
        c = strataBands[mod(yy, strataBands.length)] ?? 0;
        if (h2(x, y, seed ^ 0x5eed) < 0.08) c = earth[1] ?? 0;
        if (depth === 0) c = theme.surface;
      } else if (fill === 'solid') {
        c = depth === 0 ? theme.surface : !solid(x, y + 1) ? (earth[1] ?? 0) : (earth[2] ?? 0);
      } else {
        // natural
        const drip = Math.floor(h2(x, 0, seed ^ 0xd1) ** 2 * (theme.texture.dripMax + 1));
        if (depth === 0) c = h2(x, y, seed ^ 0x5a) < 0.18 ? theme.surfaceHi : theme.surface;
        else if (depth <= 1 + drip) c = theme.surface;
        else if (depth === 2 + drip) c = h2(x, y, seed ^ 0x5b) < 0.5 ? theme.surface : (earth[3] ?? 0);
        else {
          const v = 0.6 * vnoise(x, y, 6, 4, seed) + 0.4 * h2(x, y, seed ^ 0xb0d);
          let k = v < 0.3 ? 0 : v < 0.5 ? 1 : v < 0.72 ? 2 : 3;
          if (edge) k = Math.max(k, 1);
          c = earth[k] ?? 0;
        }
      }

      if (m === Material.OneWayLeft || m === Material.OneWayRight) {
        // Chevrons drawn pointing right for one-way-right; one-way-left mirrors the tile.
        // (core/terrain.ts numbers OneWayLeft=3/OneWayRight=4 — the opposite of the reference
        // mockup's 3/4 — so the mirror test below keys on the Material, not on the raw byte.)
        const r = Math.floor(y / 8);
        const ox = (r % 2) * 4;
        let cx = mod(x + ox, 8);
        const cy = mod(y, 8);
        if (m === Material.OneWayLeft) cx = 7 - cx;
        const k = CHEV[cy]![cx];
        if (k === 'A') c = theme.oneWay;
        else if (k === 'E') c = theme.oneWayEdge;
      }

      terrain.set(x, y, m as Material, c);
    }
  }
  return terrain;
}
