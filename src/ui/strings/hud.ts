// Copy added by e2a-toolbar (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. HUD_...).
//
// Most toolbar copy already lives in ../strings.ts (HUD, RR_ARIA, ACTION_LABELS, SKILL_NAMES) —
// this file only adds what's missing (DESIGN §5.3 / §7.2). Kept as plain strings (no functions):
// tests/ui-strings.test.ts (e1-copy's) deep-walks every runtime export of strings.ts and calls
// any function it finds with registered sample args, so a new exported function here would need
// an entry there too — `hud/skill-button.ts` composes "Digger, 3 left" from these fragments.
export const HUD_TOOLBAR = {
  /** `role="toolbar"` accessible name (DESIGN §7.2). */
  ariaLabel: 'Skills and controls',
  /** Pause button visible text (accessible name doubles as the label; DESIGN §5.3). */
  pause: 'Pause',
  /** Fast button visible text; its accessible name is `fastForwardLabel` (DESIGN §7.2). */
  fast: 'Fast',
  fastForwardLabel: 'Fast forward',
  /** Pop all's accessible name once armed (DESIGN §7.2). */
  confirmPopAll: 'Confirm pop all',
  /** RR − padlock sub-label at the level minimum (DESIGN §5.3). */
  rrMin: 'min',
  /** RR + padlock sub-label at 99, the release-rate ceiling (DESIGN §5.3; CMP-1: was reusing `rrMin`). */
  rrMax: 'max',
  /** Skill button accessible-name suffix when it still has skills left (DESIGN §7.2). */
  left: 'left',
  /** Skill button accessible-name suffix at 0 left (DESIGN §7.2). */
  noneLeft: 'none left',
} as const;
