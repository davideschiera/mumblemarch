# FR — Final regression (production preview build, http://localhost:5181/)

Build under test: `npm run preview` of `dist/` (test-lead server on :5181, not started/stopped by this agent).
Pages: `fr-regression` (pageId 85, all-levels-completed run) and `fr-regression-2` (pageId 87, fresh-save keyboard run). Viewport 1440×900.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| 1. 12/12 solutions | Every level's `playSolution` wins; L12 needs 45; L8 has new steel patch; level select shows all completed; survives reload (localStorage) | **PASS** | `evidence/FR/case1-level-select-completed.png` |
| 2. Keyboard-only L1 (fresh context) | Full keyboard flow title→...→next level, only `press_key` | **PASS** | `evidence/FR/case2-keyboard-l1-won.png` |
| 3. Console sweep (all screens + all 12 levels) | 0 errors/warnings; no non-200 network; no "Lemm" anywhere | **PASS** | see notes |
| 4. Lighthouse a11y + best-practices | title, level-select, briefing, game(paused), results, settings, help | **PASS — 100/100 everywhere, 0 failed audits** | reports in tool temp dirs (see notes) |
| 5. Reduced motion live comparison | DESIGN §7.4: no particle/shake/eased camera under reduce; title strip static under reduce | **PASS** | `evidence/FR/case5-*.png` |
| 6. Quick perf (`last-shift-at-the-foundry`, RR 99) | fps + tick rate + longtasks, fast-forward vs normal | **PASS** | see notes |
| 7. Visual spot-checks | 6 named screenshots | **PASS** | `evidence/FR/case7-*.png` |
| 8. 0 console errors at end | | **PASS** | see notes |

## Case 1 — 12/12 solutions (detail)

All 12 `playSolution()` runs returned `won:true`, `reason:"all-resolved"` (one `"time-up"`, still won):

| # | Level | saved/required/total |
|---|---|---|
| 1 | spade-expectations | 10/5/10 |
| 2 | gently-down-the-dome | 7/6/12 |
| 3 | bridge-over-troubled-toffee | 12/8/15 |
| 4 | the-punch-line | 12/6/12 |
| 5 | suction-cup-final | 7/6/12 (time-up) |
| 6 | not-one-step-bogward | 14/9/15 |
| 7 | diagonally-yours | 20/14/20 |
| 8 | one-pop-wonder | 19/15/20 |
| 9 | clam-before-the-storm | 31/28/40 |
| 10 | double-boiler | 39/32/40 |
| 11 | wrong-side-of-the-hedge | 30/25/30 |
| 12 | last-shift-at-the-foundry | 53/**45**/60 |

L12's required is confirmed 45 (was 48 pre-fix). Level select shows 12/12 with ✓ (4 "★ Everyone home" perfect, 8 "Completed · best N of M"). After `navigate_page reload`, all 12 still show ✓ (localStorage persisted). 0 console messages after the full sweep.

## Case 2 — Keyboard-only L1 (detail)

Fresh isolated context `fr-regression-2`. Full path driven by `press_key` only:
- Title: `Start` focused by default → `Enter` jumped straight to L1 briefing (a shortcut on a fresh save). Backtracked via `Tab`→`Enter` ("Back to levels") to also exercise the **Level select** screen, then `Enter` on the focused Level-1 card → briefing again → `Enter` on "Let's march!" → game.
- Game: playfield auto-focused (`role="application"`). Used `P` (pause) + `.` (frame-step) to advance precisely, `Z`/`X` (lemming-prev/next) to select mumble id 0 among the 10 walking mumbles (cycle order = ascending on-screen x, confirmed empirically), `Space` to assign Digger (only skill this level offers) at a safe spot in the level's hidden tunnel (verified via `terrainAt` first, read-only).
- Unpaused with `P`; simulation ran to `10/10 saved`, auto-navigated to **Results** ("Level complete! ... Take a bow!"), `Next level` pre-focused → `Enter` → briefing for level 2.
- Keys used end-to-end: `Tab`, `Enter`, `Z`, `X`, `Space`, `P`, `Period`. 0 console messages throughout.

## Case 3 — Console sweep (detail)

Screens visited (all via `navigate`/real interaction): title, level-select, briefing + hint expanded, settings + key-rebind overlay ("Press a key…"), help, game, pause menu (`Escape`), in-game "How to play" (`H`, from pause menu), in-game briefing overlay (`B`), results-won, results-failed (forced via two-step `N`/nuke: 0 saved, 10 dead). All 12 levels loaded once each via `loadLevel` and scanned.
- **Console**: 0 errors/warnings across the entire sweep (only later, during Case 5's own instrumentation, one self-induced `willReadFrequently` perf **advisory** appeared — see Case 8 note; not a game defect, no `getImageData` call exists in `src/`).
- **Network**: every request 200 (34 total on page 85: `/`, `main.css`, `main.js`, plus data-URI thumbnails — no external/non-200 requests).
- **"Lemm" text**: none found in `document.body.innerText`, `document.title`, or any `aria-label`/`title`/`alt` attribute, on any screen visited.

## Case 4 — Lighthouse (detail)

| Screen | Mode | Accessibility | Best Practices | Failed audits |
|---|---|---|---|---|
| Title | navigation | 100 | 100 | 0 (44 passed) |
| Level select | snapshot | 100 | 100 | 0 (31 passed) |
| Briefing | snapshot | 100 | 100 | 0 (32 passed) |
| Game (paused mid-level) | snapshot | 100 | 100 | 0 (30 passed) |
| Results (won) | snapshot | 100 | 100 | 0 (30 passed) |
| Settings | snapshot | 100 | 100 | 0 (29 passed) |
| Help | snapshot | 100 | 100 | 0 (31 passed) |

SEO and Agentic-browsing also 100 on every screen (not required by the brief, noted incidentally).

**Note (not a bug):** `window.__game.loadLevel(id)` — the debug/inspection API — does not wire the "on level-ended → navigate to results" transition; a level that ends while entered via `loadLevel` stays on the game screen forever (confirmed: `status:"ended"`, `saved:10/10`, but `screen()` stays `"game"` even after 30s+ of real time). The **normal player flow** (briefing → "Let's march!") transitions to Results automatically and promptly, as verified in Cases 2, 4, 5 and 7. This is expected behaviour for a test-only entry point, not a player-facing defect.

## Case 5 — Reduced motion (detail)

The `chrome-devtools` `emulate` tool does **not** expose a `prefers-reduced-motion` parameter (confirmed: passing `reducedMotion` is rejected as an unknown argument, and `matchMedia('(prefers-reduced-motion: reduce)').matches` stays `false` regardless). Substituted the in-app **Settings → Motion** radios (System/Reduced/Full), which set `data-motion="reduce"`/`"full"` on `<html>` directly — the mechanism DESIGN §7.4 and the shipped code (`src/render/effects.ts`, guards at lines ~143/203/209/215/333: `if (!options.reducedMotion) …`) actually key off.

- **Explosion (bomber, `one-pop-wonder`, lemming 0)**: identical deterministic setup (`loadLevel` → `step(400)` → `assignSkill(0,'bomber')` → step to the same `"exploding"` tick, +5 ticks) produced a **different canvas checksum** under Full (`1371724619`) vs Reduced (`1375817695`) — the only implementation difference between the two runs is the `reducedMotion` flag, so this is a real, measurable rendering difference (particles/shake), consistent with the source-code guards. Screenshots: `case5-explosion-{reduced,full}.png`, `case5-aftermath-{reduced,full}.png`.
- **Camera easing (Home/End)**: dispatching `End` (jump to exit) on the same level, sampled `ui().cameraX` every `requestAnimationFrame`:
  - **Full**: `0,0,10,18,26,34,39,46,52,56,60,64,67,70,72,74,76,77,78,79,79,80,…` — eased over ~21 frames.
  - **Reduced**: `80,80,80,80,…` — instant on the very first sampled frame.
- **Title march strip**: canvas checksum of `canvas.title-strip` sampled 3× over 1.2s — **Reduced**: identical each time (static). **Full**: different each time (animating).

## Case 6 — Quick perf (detail)

`last-shift-at-the-foundry`, RR 99, real time, page brought to front (`select_page`), 5 s `requestAnimationFrame` sampling + a `PerformanceObserver({entryTypes:['longtask']})`:

| Mode | fps | tick rate | longtasks (5 s) |
|---|---|---|---|
| Fast-forward on | 120.2 | 51.0 ticks/s (~3×) | 0 |
| Normal speed | 120.0 | 17.0 ticks/s | 0 |

No long tasks in either mode; fps pinned to the display's 120 Hz refresh in both.

## Case 7 — Visual spot-checks (detail)

All viewed with Read; all clean:
- `case7-level-select.png` — thumbnails fill the top of every card at 1440×900 (colourful per-level art, no stretching/letterboxing).
- `case7-title.png` — march strip (7 mumbles) sits well below the menu buttons; "Sound starts after your first click or key press." note is clearly separated underneath, no overlap.
- `case7-results-headline.png` — "✔ Level complete!" headline reads clearly (green fill, strong stroke) against the dark background.
- `case7-highcontrast-exit.png` — "Clear physics view" (high-contrast) setting on, exit renders as a solid `#3cff6a` box (71 exact-match pixels confirmed via `getImageData`) with a white marker, clearly legible against black/grey high-contrast terrain.
- `case7-rr-max.png` — RR set to 99 via `setReleaseRate`; the "+" button's `aria-label` reads `"Faster release, max"` (not "min").
- `case7-briefing-hint.png` — hint expanded (`aria-expanded="true"`); the `aria-hidden` chevron carries `transform: matrix(0,1,-1,0,0,0)` (90° rotation), the visual expand cue.

## Case 8 — Final console check

0 console **errors** on both pages at the end. One console **warning** remains on page 85: a Chrome-native `Canvas2D: … willReadFrequently …` performance advisory, logged **3 times**, entirely caused by this test agent's own repeated `ctx.getImageData()` calls during Case 5's pixel-comparison instrumentation (confirmed `grep -rn getImageData src/` outside `tests/` returns nothing — the game itself never calls it). Not filed as a bug; a real player session would never trigger it. Page 87 (`fr-regression-2`): 0 console messages of any kind.

## Bugs filed

None. No new defects found; all 18 previously-fixed bugs remain fixed on the production build.
