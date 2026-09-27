/**
 * The single, rebindable key table. Values are `KeyboardEvent.code` strings (layout-independent
 * physical keys). User overrides from settings are merged over the defaults.
 * TODO(design): confirm defaults; keep Tab / Shift+Tab free for focus navigation.
 */
import type { ActionId } from './actions.ts';

export type KeyBindings = Readonly<Record<ActionId, readonly string[]>>;

export const DEFAULT_BINDINGS: KeyBindings = {
  'skill-climber': ['Digit1'],
  'skill-floater': ['Digit2'],
  'skill-bomber': ['Digit3'],
  'skill-blocker': ['Digit4'],
  'skill-builder': ['Digit5'],
  'skill-basher': ['Digit6'],
  'skill-miner': ['Digit7'],
  'skill-digger': ['Digit8'],
  'skill-next': ['KeyE'],
  'skill-prev': ['KeyQ'],
  'lemming-next': ['KeyX', 'BracketRight'],
  'lemming-prev': ['KeyZ', 'BracketLeft'],
  assign: ['Space', 'Enter'],
  'cursor-left': ['KeyA'],
  'cursor-right': ['KeyD'],
  'cursor-up': ['KeyW'],
  'cursor-down': ['KeyS'],
  'scroll-left': ['ArrowLeft'],
  'scroll-right': ['ArrowRight'],
  'camera-center': ['KeyC'],
  'camera-follow': ['KeyL'],
  'camera-hatch': ['Home'],
  'camera-exit': ['End'],
  'filter-cycle': ['KeyV'],
  'release-rate-down': ['Minus', 'NumpadSubtract'],
  'release-rate-up': ['Equal', 'NumpadAdd'],
  pause: ['KeyP'],
  'frame-step': ['Period'],
  'fast-forward': ['KeyF'],
  nuke: ['KeyN'],
  undo: ['KeyU'],
  restart: ['KeyR'],
  mute: ['KeyM'],
  briefing: ['KeyB'],
  help: ['KeyH', 'F1'],
  menu: ['Escape'],
};

/**
 * Codes no action may ever claim (browser/OS shortcuts and focus navigation). Rebinding UI
 * (dev phase) must refuse these.
 */
export const RESERVED_CODES: ReadonlySet<string> = new Set([
  'Tab',
  'Escape',
  'F5',
  'F11',
  'F12',
  'Slash',
  'Quote',
  'Backspace',
]);

/** Actions whose binding never changes (rebinding UI must not offer them). */
export const FIXED_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>(['menu']);

/**
 * Merge user overrides (from settings) over the defaults. A key the player bound to an action
 * is removed from every OTHER action, so a rebinding never silently loses to a default.
 */
export function resolveBindings(overrides: Partial<Record<ActionId, readonly string[]>> = {}): KeyBindings {
  const claimed = new Set(Object.values(overrides).flat());
  const resolved = {} as Record<ActionId, readonly string[]>;
  for (const [action, codes] of Object.entries(DEFAULT_BINDINGS) as [ActionId, readonly string[]][]) {
    resolved[action] = overrides[action] ?? codes.filter((code) => !claimed.has(code));
  }
  return resolved;
}

/** Reverse lookup table: key code → action. First binding wins on conflicts. */
export function buildKeyMap(bindings: KeyBindings): ReadonlyMap<string, ActionId> {
  const map = new Map<string, ActionId>();
  for (const [action, codes] of Object.entries(bindings) as [ActionId, readonly string[]][]) {
    for (const code of codes) if (!map.has(code)) map.set(code, action);
  }
  return map;
}

const KEY_NAMES: Readonly<Record<string, { label: string; aria: string }>> = {
  Space: { label: 'Space', aria: 'Space' },
  Enter: { label: 'Enter', aria: 'Enter' },
  Minus: { label: '−', aria: '-' },
  Equal: { label: '+', aria: '=' },
  Period: { label: '.', aria: '.' },
  BracketLeft: { label: '[', aria: '[' },
  BracketRight: { label: ']', aria: ']' },
  ArrowLeft: { label: '←', aria: 'ArrowLeft' },
  ArrowRight: { label: '→', aria: 'ArrowRight' },
  ArrowUp: { label: '↑', aria: 'ArrowUp' },
  ArrowDown: { label: '↓', aria: 'ArrowDown' },
  Escape: { label: 'Esc', aria: 'Escape' },
  Home: { label: 'Home', aria: 'Home' },
  End: { label: 'End', aria: 'End' },
  NumpadAdd: { label: 'Num +', aria: '+' },
  NumpadSubtract: { label: 'Num −', aria: '-' },
};

/** Human label for a key code, for help screens and tooltips ("Digit1" → "1"). */
export function keyLabel(code: string): string {
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Key')) return code.slice(3);
  return KEY_NAMES[code]?.label ?? code;
}

/** `aria-keyshortcuts` value for an action's keys (KeyboardEvent.key names, space-separated). */
export function ariaKeyShortcuts(codes: readonly string[]): string {
  const names = codes.map((code) => {
    if (code.startsWith('Digit')) return code.slice(5);
    if (code.startsWith('Key')) return code.slice(3);
    return KEY_NAMES[code]?.aria ?? code;
  });
  return [...new Set(names)].join(' ');
}
