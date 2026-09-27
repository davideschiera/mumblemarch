// Copy added by e3a2-levels-briefing (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. LEVELS_...).
//
// The bulk of level-select/briefing copy (LEVEL_SELECT, LEVEL_CARD_STATE, BRIEFING,
// BRIEFING_EXTRA, TIER_NAMES, TIER_BLURBS, SKILL_NAMES, formatClock) already lives in
// ../strings.ts (App. A). This file only adds the small bits those tables don't cover.

import type { TierId } from '../../levels/format.ts';

/** Level-select back-to-title button (DESIGN §5.4 "a back button to the title"). */
export const LEVELS_BACK = 'Back';

/** Briefing overlay mode (DESIGN §6.1.1 B / the briefing contract's `options.overlay`). */
export const LEVELS_BACK_TO_GAME = 'Back to the game';

/** Tier heading difficulty pips: aria-hidden shape, this is its text alternative (DESIGN §5.4/§7.2). */
export function LEVELS_TIER_DIFFICULTY_LABEL(tier: TierId): string {
  return `Difficulty ${tier} of 4`;
}

/** Decorative glyphs beside a card's state text (the state TEXT itself carries the meaning). */
export const LEVELS_BADGE_ICON = {
  locked: '🔒',
  completed: '✓',
  perfect: '★',
  inTime: '⏱',
} as const;

/** Extra accessible description for the small "finished in time" clock badge (DESIGN §7.9). */
export const LEVELS_IN_TIME_DESCRIPTION = 'Finished within the time limit.';

/** Extra accessible description for the current/last-played card stripe (DESIGN §5.4). */
export const LEVELS_LAST_PLAYED_DESCRIPTION = 'This is the level you played last.';

/** Accessible label for the briefing's big level-map canvas (role="img"). */
export function LEVELS_THUMBNAIL_LABEL(title: string): string {
  return `${title}: level map`;
}
