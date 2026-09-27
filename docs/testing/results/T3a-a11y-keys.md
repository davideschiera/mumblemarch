# T3a-a11y-keys — accessibility & keyboard-only play

Tester: t3a-a11y-keys · Build: snapshot :5216 · Viewport 1440×900 · Date 2026-09-26

**Method.** Own snapshot server/page (port 5216), fresh save (`localStorage.clear()` + reload). All play was
keyboard-only (`press_key`; no `click`/pointer events used for gameplay input — a few one-off setup clicks on
snapshot `uid`s were used only to open Settings rebind controls and Reset-to-defaults, never for skill/mumble
selection). `__game.loadLevel`/`step`/`assignSkill` were used only to **set up** states for the dialog/a11y-tree/
announcer checks (Cases 4–7), never to substitute for the keyboard input under test. Real keys drove the full
Case 1 flow, all dialog opens/closes, rebinding, and the toolbar/grid roving-tabindex checks.

**Limitation (stated per brief):** no real screen reader (VoiceOver/NVDA) was available. Verified instead via
the accessibility tree (`take_snapshot`), the live-region DOM nodes, computed focus styles, and
`__game.announcerLog()` compared verbatim against DESIGN §7.3. This confirms the *content* a screen reader
would receive is correct, but not actual speech output/timing in a real AT.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| 1. Full flow, fresh save | Title→briefing→win L1 (keys only)→results→Next level→L2 briefing→back to levels→Settings→Help→title (§6.2) | PASS: `Enter`/`Tab` through title→briefing; `P`,`X`,`Space` selected+assigned Digger while paused (tick unchanged); resumed, all 10/10 saved; `Enter` on "Next level"→L2 briefing; keyboard "Back to levels"→Levels grid; Tab to Settings, Help, Back — all via real keys | 01-results-focus.png, 02-help-screen.png |
| 2. Visible focus, every screen | Cyan ≥3px ring, no trap outside modals, no loss to `<body>` (A3) | PASS: `outline: solid 3px rgb(111,227,255)` confirmed on title, briefing, level grid, toolbar skill button, pause dialog invoker. `document.activeElement` was never `<body>`/`null` at any screen transition | 03-toolbar-focus.png, 04-pause-dialog-focus.png |
| 3. Focus order / roving tabindex | Tab order = DOM = visual (2.4.3); toolbar & level grid roving (§6.2.6) | PASS: title Tab order Start→Levels→How to play→Settings; briefing Show hint→Let's march!→Back to levels; game Tab order canvas→filter chip→follow chip→minimap→toolbar (lands on selected skill). `ArrowRight`/`End` moved roving focus inside the toolbar (Floater→Bomber→…→Pause menu) and inside the level grid (Level 2→Level 3, still-locked levels stay focusable) | — |
| 4. Dialogs/overlays | Focus moves in, trapped, Esc closes, focus returns, pause state restored (§6.2.6, §6.4.6) | PASS for Pause menu (Esc), in-game Help (H), Briefing (B): each opened as native `<dialog>` with focus on the least-destructive control, `Shift+Tab` from the first control wrapped to the last (trap confirmed), `Esc` closed and returned focus to `#game-canvas`, `paused` state preserved. Restart confirm (from Pause menu) showed "Restart? Your mumbles go back to the hatch." with focus on Cancel. Pop-all two-step (`N`,`N`) and Esc-disarm worked with exact §7.3 text. NOTE (not a bug): closing a dialog opened *from inside* the Pause dialog (Settings, or Restart-confirm) returns focus to the canvas, not back to the reopened Pause menu — spec only documents "invoker = canvas when a key opened the dialog" and doesn't cover nested-dialog-of-a-dialog, and the resulting state (paused, canvas focused, no dead end) is safe | 04-pause-dialog-focus.png |
| 5. a11y tree per screen | Landmarks, one h1, accessible names = labels, toggle/skill states, canvas role, no "Lemm-" (§7.2) | PASS on title/briefing/levels/game/settings/help/results: exactly one `<h1>` per screen, `main` landmark, canvas `role="application"` + `aria-label="Playfield: {title}"` + `aria-describedby` text matching §7.2 verbatim, skill buttons `"{Skill}, {n} left"` / `"{Skill}, none left"` + `aria-disabled`, RR buttons' `aria-describedby` text matches spec verbatim, minimap `role="slider"` with `aria-valuetext="Showing 0 to 400 of 400. 0 mumbles in view."` (confirmed via DOM read; the a11y-snapshot tool itself showed a stale empty valuetext once — a snapshot-tool quirk, not a page bug), locked levels `aria-disabled` + "Locked. Finish level N to unlock.". No "Lemm-" found anywhere in any snapshot | — |
| 6. Live regions | Exactly one polite + one assertive; announcements match §7.3 templates; throttling | PASS: exactly one polite (`live="polite"`) and one assertive (`live="assertive"`) region present on every screen (Settings additionally uses spec-mandated `<output>`/`role="status"` elements for slider % and "Saved" feedback — a separate, spec-called-for pattern, not a second Announcer). Verbatim matches confirmed for templates #1, #4, #6, #8, #10, #11, #12, #15, #22, #23, #24, #34. Consecutive polite messages were always ≥1000 ms apart in the log. FOUND: see A11Y-2 (batch "s saved" undercounts) | — |
| 7. Help reflects live bindings | Rebind one key in Settings → Help shows it; reset after (§7.10, A13) | PASS: rebound Pause/resume key 1 from `P`→`K` in Settings; Help's Game-flow table immediately showed "Pause / resume: K"; reset via "Reset to defaults" restored `P`, confirmed in both Settings label and Help table | — |
| 8. Key ownership while typing in Settings | Game keys must not fire while focused in a settings control (§6.1, §6.2.6) | PASS: with focus on a checkbox inside the in-game Settings dialog, pressing `1` and `N` did not toggle the checkbox, arm Pop all, or change `__game.ui().selectedSkill`/`armed` after closing the dialog | — |
| 9. Console errors/warnings | 0 | 1 error found, see A11Y-3 (test-hook edge case, not a normal-flow bug) | — |

## Bugs filed
- **A11Y-1** (minor) — Level 1 briefing hint omits the keyboard/mouse control names required by RESEARCH/DESIGN A16.
- **A11Y-2** (minor) — Batched "saved" live-region announcement always reports "1 saved" instead of the true count when multiple saves are coalesced by the throttle.
- **A11Y-3** (minor) — `__game.navigate()` to a screen with no explicit `back` target throws an uncaught TypeError when its Back button is pressed.

## Untested / not verified within budget
- Real screen-reader speech output (VoiceOver/NVDA) — no AT available; verified the underlying a11y tree/live-region content instead (see Limitation above).
- Live-region templates #2, #3, #5, #9, #13, #14, #16–#21, #25–#33, #35 were not individually exercised (budget); the ones checked matched their templates verbatim with no formatting deviations, so no systemic issue is expected, but these rows are unconfirmed.
- `time-low` warnings (#26) and the relaxed-timer overtime message (#27) require running a level down to its final minute; not exercised.
- Minimap keyboard scrolling (`←`/`→`/`PageUp`/`PageDown`/`Home`/`End` on the minimap itself) was not individually driven, only its roving Tab stop and `aria-valuetext` were confirmed.
- Greyscale/colour-blind contrast checks (§7.5/A6) and reduced-motion checks (§7.4) are out of this case list and were not attempted.
