# EV2 re-check after EF1 — ui-lead-2, 2026-09-26

Snapshot build on :5195, own page in isolatedContext "ui-lead-2-ev2" (clean storage), 1280×720.
Spec: DESIGN §7.2 (level select row, minimap row), §7.8 targets, §7.1 A1/A3, §6.2.6 tab order.
Checked by ui-lead-2 (not the EF1 fixer). Screenshots: recheck-1..6-*.png in this folder.

## The 3 EF1 items
1. **Locked level-card name — PASS.** 11 locked cards, e.g.
   "Level 2: Gently Down the Dome. Breezy. Locked. Finish level 1 to unlock." …
   "Level 12: Last Shift at the Foundry. Stampede. Locked. Finish level 11 to unlock."
   (`aria-disabled="true"`, tabindex −1; L1 "Level 1: Spade Expectations. Breezy. New.", focused on entry).
   Cards 271×176, `<h2>` per tier: Breezy, Knotty, Gnarly, Stampede. (recheck-1-level-select.png)
2. **Minimap slider target — PASS.** `role=slider` is on `div.minimap-well` 332×44 (≥ 160×40), tabindex 0,
   data-arrow-keys, aria-label "Level map", valuemin 0, valuemax 1200 (L12, w 1600), valuenow = camera.x,
   valuetext "Showing 0 to 400 of 1600. 2 mumbles in view."; inner 320×32 canvas `aria-hidden="true"`,
   no tabindex/role. Note: §7.2 literally names a `<canvas role=slider>`; moving the role to the well is
   the ui-lead decision that satisfies §7.8/A1 (≥ 160×40) — same attributes, bigger target.
   (chrome-devtools a11y snapshot prints valuetext="" for every div slider, incl. a control probe with a
   static aria-valuetext → tool limitation; DOM attributes verified directly.)
3. **Settings control sizes — PASS.** 12 checkboxes 24×24, 19 radios 24×24, 4 ranges 308×44, 0 inputs < 24×24;
   rows ≥ 44 (range rows 48). Key-binding buttons 40×32 in a 44-px row with 8-px gaps = the A1 chip
   exception (≥ 32 high inside a 44 row). (recheck-4-settings.png)

## Regression checks
- **Tab order (real Tab key) — PASS:** canvas → "Selection filter: all mumbles" → "Follow selected mumble" →
  "Level map" slider → toolbar (one stop, lands on the chosen skill "Climber, 2 left") → leaves (body).
- **Focus ring — PASS:** every stop `:focus-visible` with `outline: solid 3px rgb(111,227,255)` offset 2px;
  visible cyan ring around the whole minimap well (recheck-2-minimap-focus-ring.png, recheck-3-toolbar-stop.png).
- **Minimap keys (real keys, focus on the well, paused, tick unchanged) — PASS:** → 0→16; PageDown 16→416;
  End →1200; PageUp 1200→800; ← 800→784; Home →0. aria-valuenow = camera.x and valuetext updated each time.
- **Pointer — PASS:** real click on the well centre → camera 600 (centred on world 800); pointer drag
  down@40 px → 0 (clamped), move@120 → 400, move@280 → 1200 (clamped), no drag after pointerup; a press on
  the well's top padding (outside the canvas) → 300 (centred on world 500).
- **A1 on the game screen — PASS:** toolbar buttons 48–92×88, well 332×44, chips 74/64×32 in a 44-px
  status line with an 8-px gap.
- **Landing focus / dialogs — PASS:** title → Start; levels → L1 card; briefing → "Let's march!"; help/settings
  → h1; game → canvas; Esc → native pause dialog (aria-labelledby "Paused", describedby set, focus Resume),
  Esc closes → canvas; results → "Next level" (56 px buttons).
- **Console — PASS:** 0 errors / 0 warnings / 0 issues on title, level select, briefing, help, settings,
  game (L1 + L12), pause menu, results (two page loads).

## Found and fixed during the re-check (ui-lead-2)
- Rule-1 burst join produced "…Press H for help.. Spade Expectations" → `joinUtterance()` in
  `src/ui/announce-queue.ts` (+ 2 tests in tests/ui-announce-queue.test.ts).
- Results screen title/announcement "Level complete!. Every single…" → `results.ts` uses `joinUtterance`.
  Verified after rebuild: "Level complete! Every single mumble made it home. Take a bow!" (recheck-6-results.png).

## Minor notes (not failures)
- Game screen: the router also says the screen title after §7.3 #1, so the ready utterance ends with the
  level title a second time ("… Press H for help. Spade Expectations"). Redundant, not wrong.
- The Pop all describedby text ("Press Pop all again (or N)…") is a visually-hidden span that stays in the
  a11y tree while idle (browse-mode readers can reach it).

**Verdict: EV2 PASS (12/12 after EF1).**
