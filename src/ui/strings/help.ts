// Copy added by e3b2-help-dialogs (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. HELP_...).
//
// The bulk of Help/Pause-menu copy (HELP, HELP_MOUSE_TABLE, PAUSE_MENU, ACTION_LABELS,
// ACTION_GROUPS, SKILL_NAMES, SKILL_DESCRIPTIONS) already lives in ../strings.ts (App. A). This
// file only adds the small bits those tables don't cover: section headings, table headers and
// button labels specific to the Help screen and the in-game dialogs (DESIGN §7.10 / §5.4).

/** Help screen section headings not already in `HELP` (DESIGN §7.10). */
export const HELP_GOAL_HEADING = 'Goal';
export const HELP_QUICK_START_HEADING = 'Quick start';
export const HELP_SCREEN_READER_HEADING = 'Screen reader tips';

/** Column headers for the generated Keyboard table and the static Mouse table (§7.10 #4). */
export const HELP_TABLE_HEADERS = {
  action: 'Action',
  keys: 'Keys',
  input: 'Input',
  where: 'Where',
  behaviour: 'Behaviour',
} as const;

/** Assists section: link to the Settings screen (§7.10 #5). */
export const HELP_OPEN_SETTINGS = 'Open Settings';

/** Navigation button labels: plain "Back" on the full screen, "Back to the game" in an overlay. */
export const HELP_BACK = 'Back';
export const HELP_BACK_TO_GAME = 'Back to the game';

/** Pause-menu mini cheat-sheet (§5.4): a visually-hidden heading for its key list. */
export const DIALOG_CHEAT_SHEET_HEADING = 'Quick keys';

/** `ui/dialog.ts` generic helper: default Cancel label when a caller doesn't give one. */
export const DIALOG_DEFAULT_CANCEL = 'Cancel';
