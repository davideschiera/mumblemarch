/**
 * UI-layer timings (DOM-free, no imports). `ui/` must not import `app/config.ts`, so view and
 * announcer constants live here.
 * Owner: ui-lead (E0 created it; E2 view timings, E5b announcer timings — add, don't inline).
 */

// ─── HUD view (DESIGN §5.3, §7.7) ──────────────────────────────────────────────────────────
/** Toast (refusal / info plate over the canvas): 2.5 s, max 1 at a time (newest replaces). */
export const TOAST_MS = 2500;
/** Caption strip: max 2 lines, 2.5 s each, 150 ms fade; same text within 1 s → "Wheee! ×3". */
export const CAPTION_MS = 2500;
export const CAPTION_MAX_LINES = 2;
export const CAPTION_FADE_MS = 150;
export const CAPTION_COALESCE_MS = 1000;
/** Skill-button refusal flash: 3 shakes of ±3 px over 240 ms; reduced motion: 2 ✕ blinks over 400 ms. */
export const REFUSAL_SHAKE_MS = 240;
export const REFUSAL_BLINK_MS = 400;
/** Count badge pop 1.0 → 1.25 → 1.0 over 160 ms (none with reduced motion). */
export const COUNT_POP_MS = 160;

// ─── Announcer throttle (DESIGN §7.3 rules 1–5) ───────────────────────────────────────────
/** Rule 1: messages said within 50 ms join with ". ". */
export const ANNOUNCE_JOIN_MS = 50;
/** Rule 2: ≥ 1000 ms between polite messages; queue holds at most 4. */
export const ANNOUNCE_POLITE_GAP_MS = 1000;
export const ANNOUNCE_QUEUE_MAX = 4;
/** Rule 3: the same text within 3 s is dropped unless user-initiated. */
export const ANNOUNCE_DEDUP_MS = 3000;
/** Rule 4: assertive messages at most 1 per 1000 ms. */
export const ANNOUNCE_ASSERTIVE_GAP_MS = 1000;
/** `__game.announcerLog()` keeps the last 50 messages (CONTRACTS §9). */
export const ANNOUNCE_LOG_LIMIT = 50;
/** §7.3 #10: saves/losses are batched ≥ 2 s apart. */
export const EVENT_BATCH_MS = 2000;
