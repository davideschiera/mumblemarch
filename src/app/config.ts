/**
 * App-level tuning (not simulation physics — those live in core/constants.ts). DOM-free, no
 * imports: pure helpers and Node tests may import it. Every number the DESIGN names for the app
 * layer has a named constant here; UI-layer timings (toast, captions, announcer throttle) live in
 * `ui/ui-config.ts` because `ui/` must not import `app/`.
 * Owner: ui-lead (E0 created it; E5c keeps it tidy — add constants, never inline magic numbers).
 */
export const DEV_PORT = 5180;

// ─── Loop & scale ────────────────────────────────────────────────────────────────────────────
/** Simulation speed multiplier while fast-forward is on (DESIGN §6.4.3). */
export const FAST_FORWARD_SPEED = 3;
/** Never run more than this many ticks in one animation frame (avoids spiral of death). */
export const MAX_TICKS_PER_FRAME = 10;
/** Events kept for the test hook (ring buffer). */
export const EVENT_LOG_LIMIT = 500;
/** Canvas CSS scale bounds (DESIGN §5.1: integer scales ×2…×4). */
export const MIN_SCALE = 2;
export const MAX_SCALE = 4;
/** DESIGN §5.1 scale rule: s = clamp(2, 4, min(floor((vw − 32) / 400), floor((vh − 196) / 160))). */
export const SCALE_SIDE_PADDING_PX = 32;
export const SCALE_HUD_BUDGET_PX = 196;

// ─── Release rate (DESIGN §6.1.1, §6.4.4) ─────────────────────────────────────────────────
export const RR_MAX = 99;
/** Shift makes each release-rate step ±10. */
export const RR_SHIFT_STEP = 10;
/** Hold: first step on press, repeat after 400 ms every 60 ms (Shift: every 150 ms). */
export const RR_REPEAT_DELAY_MS = 400;
export const RR_REPEAT_MS = 60;
export const RR_REPEAT_SHIFT_MS = 150;
/** §7.3 #14: the rate is announced 500 ms after the last step (coalesced). */
export const RR_ANNOUNCE_DEBOUNCE_MS = 500;

// ─── Frame-step (DESIGN §6.1.1, §6.4.2) ───────────────────────────────────────────────────
/** Shift+. steps one game second. */
export const FRAME_STEP_SHIFT_TICKS = 17;
/** Hold: repeat after 300 ms at 10 steps/s. */
export const FRAME_STEP_REPEAT_DELAY_MS = 300;
export const FRAME_STEP_REPEAT_MS = 100;
/** `Tick 312 (+1)` note in the status line. */
export const TICK_NOTE_MS = 1500;
/** §7.3 #16 "Stepped 1 tick" debounce. */
export const FRAME_STEP_ANNOUNCE_DEBOUNCE_MS = 300;

// ─── Camera (DESIGN §6.1.1, §6.1.3, §6.2.3) ────────────────────────────────────────────────
/** Scroll key tap = 8 world px (SCROLL_STEP). */
export const SCROLL_STEP = 8;
/** Scroll key hold (after 150 ms) = 200 world px/s; Shift = 600 px/s. */
export const SCROLL_HOLD_DELAY_MS = 150;
export const SCROLL_HOLD_SPEED = 200;
export const SCROLL_SHIFT_SPEED = 600;
/** Centre-on/jump easing (Camera implements it; instant cut in reduced motion). */
export const CAMERA_EASE_MS = 200;
/** §6.2.3: centre on a new selection that is off-screen or within 40 world px of a view edge. */
export const CAMERA_EDGE_MARGIN = 40;
/** §6.1.1 Follow: keep the selected mumble inside the middle 50 % of the view. */
export const FOLLOW_ZONE_FRACTION = 0.5;
/** Wheel: deltaMode lines ×16, pages ×400 (then ÷ scale → world px). */
export const WHEEL_LINE_PX = 16;
export const WHEEL_PAGE_PX = 400;
/** Edge zones: inner 32 CSS px; 120 ms dwell; 150 → 400 world px/s over 1 s. */
export const EDGE_ZONE_CSS = 32;
export const EDGE_DWELL_MS = 120;
export const EDGE_SPEED_MIN = 150;
export const EDGE_SPEED_MAX = 400;
export const EDGE_RAMP_MS = 1000;

// ─── Keyboard cursor (DESIGN §6.2.4) ───────────────────────────────────────────────────────
/** Tap = 2 world px; hold (after 150 ms) 60 → 180 px/s over 600 ms; Shift ×2. */
export const CURSOR_TAP_STEP = 2;
export const CURSOR_HOLD_DELAY_MS = 150;
export const CURSOR_SPEED_MIN = 60;
export const CURSOR_SPEED_MAX = 180;
export const CURSOR_RAMP_MS = 600;
export const CURSOR_SHIFT_FACTOR = 2;
/** §6.2.4 / §7.3 #5: the pick is announced after the cursor is still for 150 ms. */
export const CURSOR_SETTLE_MS = 150;

// ─── Minimap slider (DESIGN §7.2) ───────────────────────────────────────────────────────────
/** ←/→ ±16 world px (hold repeats), PageUp/PageDown ±400. */
export const MINIMAP_STEP = 16;
export const MINIMAP_PAGE = 400;
/** Hold-repeat timing for minimap arrow keys (not in the spec; matches release rate). */
export const MINIMAP_REPEAT_DELAY_MS = 400;
export const MINIMAP_REPEAT_MS = 60;

// ─── Feedback timings (DESIGN §5.3, §6.1.3, §6.5) ───────────────────────────────────────────
/** Refusal status text shows for 2.5 s. */
export const STATUS_REFUSAL_MS = 2500;
/** Info status ("No mumble here") shows for 1.5 s. */
export const STATUS_INFO_MS = 1500;
/** §6.2.5 selection "poof" when the selected mumble exits/dies. */
export const SELECTION_POOF_MS = 250;

// ─── Level flow (DESIGN §6.4, §8.6) ─────────────────────────────────────────────────────────
/** Delay between level end and the results screen, so the last events can be seen/heard. */
export const RESULTS_DELAY_MS = 1500;
/** §6.4.6: restart is immediate when no command was issued and the tick is below this. */
export const RESTART_IMMEDIATE_TICKS = 54;
/** §5.3: the clock turns to the warning style under 30 s. */
export const TIME_LOW_SECONDS = 30;
/** §8.6: the theme loop starts at tick 55 (after the first mumble drops). */
export const MUSIC_START_TICK = 55;
/** §8.6: variant = index of the level within its theme, mod 3. */
export const MUSIC_VARIANTS = 3;
/** §8.5: level end fades the music out over 400 ms. */
export const MUSIC_END_FADE_S = 0.4;
/** §6.4.7: show "Rewinding…" when an undo rebuild takes longer than this. */
export const UNDO_REWIND_NOTICE_MS = 100;
