/**
 * Pure key-rebinding logic for Settings → Controls (DESIGN §6.1.2, §7.1 A13, §5.4). No DOM: this
 * file is imported directly by node tests (`tests/tsconfig.json` has no DOM lib), so it only
 * touches `ActionId`/`KeyBindings` (input/actions.ts, input/bindings.ts).
 *
 * Rules enforced here (CONTRACTS §0/§E, DESIGN §6.1.2):
 * - at most 2 key codes per action;
 * - a reserved code (`RESERVED_CODES`) is never accepted;
 * - `FIXED_ACTIONS` (`menu`/Esc) is never touched;
 * - a clash offers **Swap** (the displaced action gets the key being replaced, or loses the slot
 *   if there was none) or **Cancel** (handled by the caller — just don't call `applyRebind`);
 * - the result always round-trips through `resolveBindings` with no duplicate codes.
 */
import { ACTION_IDS, type ActionId } from './actions.ts';
import { FIXED_ACTIONS, RESERVED_CODES, resolveBindings, type KeyBindings } from './bindings.ts';

/** Same shape as `Settings['bindings']` (persistence/schema.ts), kept local so input/ has no
 * dependency on persistence/. */
export type BindingOverrides = Partial<Record<ActionId, readonly string[]>>;

export type CaptureValidation = 'ok' | 'reserved' | 'fixed';

/** Whether a just-captured code may be bound to `action`. `action` is checked too (not just the
 * code) so a defensive caller can never rebind a `FIXED_ACTIONS` entry, even though the Controls
 * list must not offer one in the first place (DESIGN §6.1.2: "menu is fixed and not offered"). */
export function validateCapture(code: string, action: ActionId): CaptureValidation {
  if (FIXED_ACTIONS.has(action)) return 'fixed';
  if (RESERVED_CODES.has(code)) return 'reserved';
  return 'ok';
}

/** The other action currently holding `code`, if any (never `action` itself, never `menu`: a
 * valid, non-reserved `code` can never equal `Escape`, `menu`'s only key). */
export function findClash(bindings: KeyBindings, action: ActionId, code: string): ActionId | null {
  for (const id of ACTION_IDS) {
    if (id === action) continue;
    if (bindings[id].includes(code)) return id;
  }
  return null;
}

export interface RebindResult {
  readonly overrides: BindingOverrides;
  /** The action whose key was taken (mode 'set') or swapped (mode 'swap'); null with no clash. */
  readonly displaced: ActionId | null;
}

/**
 * Bind `code` to `action`'s key slot `slot` (0 or 1; a slot past the action's current key count
 * appends instead of leaving a hole, so the result is always a compact ≤2-length array).
 * - `mode: 'set'` — plain rebind: if another action held `code`, it simply loses it.
 * - `mode: 'swap'` — the displaced action gets back whatever `action` was carrying in `slot`
 *   (or loses the slot entirely if `action` had nothing there), per DESIGN §6.1.2.
 * No-ops (returns `overrides` unchanged, `displaced: null`) for a fixed action or reserved code —
 * the UI should never reach this via `validateCapture`, but the invariant holds either way.
 */
export function applyRebind(
  overrides: BindingOverrides,
  action: ActionId,
  slot: number,
  code: string,
  mode: 'set' | 'swap' = 'set',
): RebindResult {
  if (validateCapture(code, action) !== 'ok') return { overrides, displaced: null };
  const resolved = resolveBindings(overrides);
  const previousCode = resolved[action][slot];
  const clash = findClash(resolved, action, code);

  const actionCodes = dedupe([...resolved[action]]);
  if (slot < actionCodes.length) actionCodes[slot] = code;
  else actionCodes.push(code);
  const nextAction = dedupe(actionCodes).slice(0, 2);

  const next: Record<string, string[]> = {};
  for (const id of ACTION_IDS) if (overrides[id]) next[id] = [...overrides[id]!];
  next[action] = nextAction;

  if (clash && clash !== action && !FIXED_ACTIONS.has(clash)) {
    const clashCodes = [...resolved[clash]];
    const idx = clashCodes.indexOf(code);
    if (mode === 'swap' && previousCode !== undefined) clashCodes[idx] = previousCode;
    else clashCodes.splice(idx, 1);
    next[clash] = clashCodes;
  }
  return { overrides: next as BindingOverrides, displaced: clash };
}

/** Remove the key at `slot` (DESIGN §6.1.2: Backspace clears a key during capture). A no-op if
 * `slot` is out of range. May leave the action with 0 keys (its own choice); note that the
 * persistence sanitiser (persistence/storage.ts `sanitizeBindings`) currently drops an override
 * once it has 0 codes, so a fully-cleared action reverts to its default keys on reload — flagged
 * to ui-lead, not fixed here (storage.ts is out of this file's ownership). */
export function clearKey(overrides: BindingOverrides, action: ActionId, slot: number): BindingOverrides {
  if (FIXED_ACTIONS.has(action)) return overrides;
  const codes = [...resolveBindings(overrides)[action]];
  if (slot < 0 || slot >= codes.length) return overrides;
  codes.splice(slot, 1);
  return { ...overrides, [action]: codes };
}

/** Settings → Controls "Reset to defaults": drop every override, back to `DEFAULT_BINDINGS`. */
export function resetAll(): BindingOverrides {
  return {};
}

function dedupe(codes: readonly string[]): string[] {
  return [...new Set(codes)];
}
