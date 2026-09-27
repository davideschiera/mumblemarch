// Copy added by e3a1-title-results (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. SCREENS_...).

/** Results meter's notch caption (DESIGN §5.4 Results: "a notch at the requirement… 'needed 10'"). */
export function SCREENS_NEEDED(required: number): string {
  return `needed ${required}`;
}

/** Results failure-only hint disclosure, once expanded (DESIGN §5.4 Results / Briefing "Show hint" pattern). */
export const SCREENS_HIDE_HINT = 'Hide hint';
