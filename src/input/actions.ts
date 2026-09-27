/**
 * Every logical input action in the game. Keys/buttons map to these in ONE table
 * (bindings.ts); nothing else in the codebase looks at raw key codes.
 */
export const ACTION_IDS = [
  // Skill selection (skill-bar order).
  'skill-climber',
  'skill-floater',
  'skill-bomber',
  'skill-blocker',
  'skill-builder',
  'skill-basher',
  'skill-miner',
  'skill-digger',
  'skill-next',
  'skill-prev',
  // Keyboard lemming selection & assignment.
  'lemming-next',
  'lemming-prev',
  'assign',
  'cursor-left',
  'cursor-right',
  'cursor-up',
  'cursor-down',
  // Camera.
  'scroll-left',
  'scroll-right',
  'camera-center',
  'camera-follow',
  'camera-hatch',
  'camera-exit',
  // Selection.
  'filter-cycle',
  // Game control.
  'release-rate-down',
  'release-rate-up',
  'pause',
  'frame-step',
  'fast-forward',
  'nuke',
  'undo',
  'restart',
  'mute',
  'briefing',
  'help',
  'menu',
] as const;
export type ActionId = (typeof ACTION_IDS)[number];

/** Actions that repeat while held (the app handles `down`/`up` for them). */
export const HOLDABLE_ACTIONS: ReadonlySet<ActionId> = new Set<ActionId>([
  'release-rate-down',
  'release-rate-up',
  'scroll-left',
  'scroll-right',
  'cursor-left',
  'cursor-right',
  'cursor-up',
  'cursor-down',
  'frame-step',
]);
