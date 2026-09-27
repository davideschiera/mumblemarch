// Copy added by e5a1-skills-arming (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. GAME_...).

/** `assignToTarget()` guard for the (rare) level that starts with every skill count at 0. */
export const GAME_NO_SKILL_CHOSEN = 'No skill chosen';

/**
 * DESIGN §6.4.4 "at a limit" denial, `+` side (the table's example text covers only `−`, whose
 * limit is the level minimum). The `+` limit is always 99 (`RR_MAX`, DESIGN §6.1.1), so unlike
 * `STATUS.rrBelowMin` this needs no parameter.
 */
export const GAME_RR_ABOVE_MAX = "Release rate can't go above 99 here";
