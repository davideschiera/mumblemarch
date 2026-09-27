// Copy added by e3b1-settings (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. SETTINGS_...).
//
// The bulk of Settings copy (SETTINGS.sections/fields/options/rebind) already lives in
// ../strings.ts (DESIGN §7.11/§5.4). This file only adds the small bits that table doesn't
// cover: the exact capture prompt (§6.1.2), the empty-slot label, and this screen's own nav
// button text.

/** Shown while listening for the next key press (DESIGN §6.1.2: "press a key, Esc cancels"). */
export const SETTINGS_CAPTURE_HINT = 'Press a key… Esc cancels.';

/** Intro line above the Controls rows, explaining the click-a-chip interaction model. */
export const SETTINGS_CONTROLS_HINT = 'Click a key to change it. Press Backspace to clear it, or Escape to cancel.';

/** Accessible name for an unbound key slot (the visible chip just shows "—"). */
export const SETTINGS_KEY_EMPTY = 'not set';

/** Nav button labels: plain "Back" on the full screen, "Close" in the pause-menu overlay. */
export const SETTINGS_BACK = 'Back';
export const SETTINGS_CLOSE = 'Close';

/** Screen title (document.title / Screen.title / <h1>|<h2> text). */
export const SETTINGS_TITLE = 'Settings';
