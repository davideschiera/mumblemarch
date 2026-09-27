/**
 * Choosing which lemming a click or keyboard selection refers to (DESIGN §6.2.3 / §6.3.2).
 * Pure functions over the lemming list so mouse, keyboard and tests share the same rules.
 */
import { UNASSIGNABLE_STATES } from './behaviours/index.ts';
import { GROUP_GAP, LEMMING_HITBOX } from './constants.ts';
import type { Lemming, LemmingState, Point, SkillId } from './types.ts';

/** Selection-filter chip values (DESIGN §6.3.2): narrow who a click/cycle can pick. */
export const SELECTION_FILTERS = ['all', 'walkers', 'facing-left', 'facing-right'] as const;
export type SelectionFilter = (typeof SELECTION_FILTERS)[number];

/** States preferred on overlap (DESIGN §6.3.2 step 4 / RESEARCH §2.2); `ohno` never reaches here
 * because it is not selectable, but it is listed for parity with the original. */
const BUSY_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'blocking',
  'building',
  'shrugging',
  'bashing',
  'mining',
  'digging',
  'ohno',
]);

/** Lemmings a player can meaningfully select (not removed, not dying/exiting). */
export function isSelectable(lem: Readonly<Lemming>): boolean {
  return !lem.removed && !UNASSIGNABLE_STATES.has(lem.state);
}

/** Does `lem` pass the selection filter chip, and (when set) a "walkers only" press? */
export function passesFilter(lem: Readonly<Lemming>, filter: SelectionFilter, walkersOnly = false): boolean {
  const isWalkerLike = lem.state === 'walking' || lem.state === 'jumping';
  if (walkersOnly && !isWalkerLike) return false;
  switch (filter) {
    case 'all':
      return true;
    case 'walkers':
      return isWalkerLike;
    case 'facing-left':
      return lem.dir === -1;
    case 'facing-right':
      return lem.dir === 1;
  }
}

export interface PickOptions {
  /** Chip value (default 'all'). */
  readonly filter?: SelectionFilter;
  /** Shift-click / right-held for this press. */
  readonly walkersOnly?: boolean;
  /** World px; used only when no hit box contains p. */
  readonly snapRadius?: number;
  /** Would the lemming take the chosen skill? (`checkAssign`-backed) */
  readonly accepts?: (lem: Readonly<Lemming>) => boolean;
}

/** Every lemming whose hitbox contains `p`, in release order (for "WALKER 6"-style status). */
export function lemmingsAt(
  lemmings: readonly Readonly<Lemming>[],
  p: Point,
  options: Pick<PickOptions, 'filter' | 'walkersOnly'> = {},
): Readonly<Lemming>[] {
  const { dx, dy, w, h } = LEMMING_HITBOX;
  const filter = options.filter ?? 'all';
  return lemmings.filter(
    (lem) =>
      isSelectable(lem) &&
      passesFilter(lem, filter, options.walkersOnly) &&
      p.x >= lem.x + dx &&
      p.x < lem.x + dx + w &&
      p.y >= lem.y + dy &&
      p.y < lem.y + dy + h,
  );
}

/**
 * The lemming a click at `p` targets, or null (DESIGN §6.3.2, MUST):
 * 1. Candidates = `lemmingsAt(p)` (selectable, filter-passing, hit box contains p).
 * 2. None → the single nearest selectable, filter-passing lemming whose body centre (x, y−5)
 *    lies within `options.snapRadius` (integer d² ≤ R²); ties go to the higher id; none within
 *    radius → null.
 * 3. If `skill` is given, `options.accepts` is given, and ≥ 1 candidate would accept it, drop
 *    the ones that would refuse (generalises the original builder/basher/miner/digger fallback,
 *    RESEARCH §2.2, to every skill).
 * 4. Prefer busy candidates (blocking, building, shrugging, bashing, mining, digging, ohno).
 * 5. Then the highest id (last released).
 */
export function pickLemmingAt(
  lemmings: readonly Readonly<Lemming>[],
  p: Point,
  skill: SkillId | null,
  options: PickOptions = {},
): Readonly<Lemming> | null {
  let candidates = lemmingsAt(lemmings, p, options);

  if (candidates.length === 0) {
    const filter = options.filter ?? 'all';
    const radius = options.snapRadius ?? 0;
    const maxD2 = radius * radius;
    let best: Readonly<Lemming> | null = null;
    let bestD2 = Infinity;
    for (const lem of lemmings) {
      if (!isSelectable(lem) || !passesFilter(lem, filter, options.walkersOnly)) continue;
      const dx = p.x - lem.x;
      const dy = p.y - (lem.y - 5);
      const d2 = dx * dx + dy * dy;
      if (d2 > maxD2) continue;
      if (best === null || d2 < bestD2 || (d2 === bestD2 && lem.id > best.id)) {
        best = lem;
        bestD2 = d2;
      }
    }
    if (best === null) return null;
    candidates = [best];
  }

  if (skill !== null && options.accepts && candidates.some(options.accepts)) {
    candidates = candidates.filter(options.accepts);
  }

  const busy = candidates.filter((lem) => BUSY_STATES.has(lem.state));
  const pool = busy.length > 0 ? busy : candidates;
  return pool.reduce((best, lem) => (lem.id > best.id ? lem : best));
}

export interface CycleOptions {
  readonly filter?: SelectionFilter;
  /** When the current lemming is gone, continue from this x (its last known position). */
  readonly fromX?: number;
  /** Camera window, for the "start in view" rule (used only when there is no current lemming
   * and no `fromX`). */
  readonly view?: { readonly x0: number; readonly x1: number };
  /** Shift: jump to the next group (> GROUP_GAP px away or a different state). */
  readonly group?: boolean;
}

/**
 * Keyboard selection: the next (step = 1) or previous (step = -1) lemming after `currentId`,
 * ordered left→right by x then id; wraps around. Null when nothing is selectable.
 *
 * With a current selection: plain ±1 in that order, wrapping; with `options.group`, instead walk
 * in `step` direction (wrapping) to the first lemming more than `GROUP_GAP` px away from the
 * current one's x, or in a different state — falling back to plain ±1 when none qualifies.
 *
 * With no current selection (missing or null): `options.fromX`, when given, picks the first
 * lemming at or past it (step 1) or the last at or before it (step -1), wrapping to the first/last
 * when none qualifies; otherwise `options.view`, when given, picks the leftmost (step 1) or
 * rightmost (step -1) lemming in `[x0, x1]`, or — when none is in view — the lemming nearest the
 * view centre (ties → higher id); otherwise the first (step 1) or last (step -1) lemming overall.
 */
export function cycleLemming(
  lemmings: readonly Readonly<Lemming>[],
  currentId: number | null,
  step: 1 | -1,
  options: CycleOptions = {},
): Readonly<Lemming> | null {
  const filter = options.filter ?? 'all';
  const order = lemmings
    .filter((lem) => isSelectable(lem) && passesFilter(lem, filter))
    .sort((a, b) => a.x - b.x || a.id - b.id);
  if (order.length === 0) return null;
  const n = order.length;

  const index = currentId === null ? -1 : order.findIndex((l) => l.id === currentId);
  if (index >= 0) {
    const current = order[index]!;
    if (options.group) {
      for (let i = 1; i < n; i++) {
        const idx = (((index + step * i) % n) + n) % n;
        const candidate = order[idx]!;
        if (Math.abs(candidate.x - current.x) > GROUP_GAP || candidate.state !== current.state) {
          return candidate;
        }
      }
      // No lemming forms a distinct group (e.g. everyone is one tight cluster) → plain ±1.
    }
    return order[((index + step) % n + n) % n] ?? null;
  }

  if (options.fromX !== undefined) {
    const fromX = options.fromX;
    const next = step === 1 ? order.find((l) => l.x >= fromX) : [...order].reverse().find((l) => l.x <= fromX);
    return next ?? (step === 1 ? order[0]! : order[n - 1]!);
  }

  if (options.view !== undefined) {
    const { x0, x1 } = options.view;
    const inView = order.filter((l) => l.x >= x0 && l.x <= x1);
    if (inView.length > 0) return step === 1 ? inView[0]! : inView[inView.length - 1]!;
    const center = (x0 + x1) / 2;
    let best = order[0]!;
    let bestD = Math.abs(best.x - center);
    for (const lem of order) {
      const d = Math.abs(lem.x - center);
      if (d < bestD || (d === bestD && lem.id > best.id)) {
        best = lem;
        bestD = d;
      }
    }
    return best;
  }

  return step === 1 ? order[0]! : order[n - 1]!;
}
