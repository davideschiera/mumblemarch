# T5 — Robustness / performance testing

Build: isolated snapshot server on port 5219 (`node scripts/snapshot.mjs 5219 …`). Browser: chrome-devtools
MCP, own page (`isolatedContext: t5-robust`). Viewport 1440×900 unless noted (Case 4 varies it).

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| 1. Console sweep — all screens/overlays | 0 console errors/warnings, 0 network errors (ARCHITECTURE §14, §12) | **PASS** | see notes |
| 1. Console sweep — 12 levels × `playSolution` → results | Solutions complete, results screen renders, 0 console errors (ARCH §14) | **PASS** | all 12 won; see table below |
| 1. Console sweep — 12 levels × ~600 ticks real-time FF | 0 console errors during sustained FF (DESIGN §6.4.3) | **PASS** | ~11.8 s wall/level, 600–602 ticks each |
| 2. Crowd performance (≥60 alive) | Stable frame rate, tick rate 17/s normal & ~51/s ×3, no long tasks (ARCH §9, DESIGN §6.4.3) | **PASS** | `docs/testing/evidence/T5/crowd-60-perf.png` |
| 3. Tab hidden / window blur → auto-pause | Pauses, announces, never auto-resumes, no tick catch-up (DESIGN §6.4.8) | **PASS** (see methodology note) | `docs/testing/evidence/T5/autopause-hidden.png` |
| 4. Window resize (5 sizes) mid-level | Integer canvas scale per §5.1, no errors, pointer mapping correct | **PASS** | `docs/testing/evidence/T5/resize-800x600.png` |
| 5. Input spam (200 keys + clicks + nav + double Next) | App stays responsive, one game loop, no errors, no stuck overlays | **PASS** (1 methodology caveat, see notes) | — |
| 6. Memory sanity (10× load/restart) | No unbounded growth | **PASS** | heap snapshots 8,088,616 B vs 8,087,851 B (8 MB files not kept in docs/) |
| 7. Long run at ×3 to time-up | Ends cleanly, correct outcome | **PASS** | `docs/testing/evidence/T5/longrun-timeup.png` |

No `ROB-` bugs filed — every case passed. Details and raw numbers below.

## Case 1 — Console sweep

Screens visited via `__game.navigate`: title, level-select, help, settings, briefing, game; in-game
overlays via key dispatch: pause (P), Help overlay (H), Briefing overlay (B), pause menu (Esc) — each
opened/closed a native `<dialog>` correctly. Results screen visited both **won** (`spade-expectations`,
saved 10/10) and **failed** (immediate nuke → 0/5 saved, `reason: "all-resolved"`).

All 12 levels via `__game.playSolution(id)` → won, then navigated to `results` with the returned
outcome:

| Level | Saved | Reason |
|---|---|---|
| spade-expectations | 10 | all-resolved |
| gently-down-the-dome | 7 | all-resolved |
| bridge-over-troubled-toffee | 12 | all-resolved |
| the-punch-line | 12 | all-resolved |
| suction-cup-final | 7 | **time-up** (ends cleanly, won since saved≥required) |
| not-one-step-bogward | 14 | all-resolved |
| diagonally-yours | 20 | all-resolved |
| one-pop-wonder | 19 | all-resolved |
| clam-before-the-storm | 31 | all-resolved |
| double-boiler | 39 | all-resolved |
| wrong-side-of-the-hedge | 30 | all-resolved |
| last-shift-at-the-foundry | 53 | all-resolved |

All 12 levels also loaded fresh and run ~600 ticks (601–602) in **real time at ×3** (Fast-forward
toggled via a real `KeyF` dispatch + `setRealtime(true)`, page kept foreground): each took ≈11.8 s wall
clock for ~600 game ticks (600/11.8 ≈ 50.8 ticks/s, matching the ×3 spec rate). `gently-down-the-dome`
ended mid-sweep (status `ended`) without incident.

`list_console_messages` after each group (screens, playSolution×12, FF×12) and `list_network_requests`:
**0 errors, 0 warnings, 0 non-200 responses** (26/26 requests 200, all local assets/data URIs).

## Case 2 — Crowd performance

`last-shift-at-the-foundry` has **60 total mumbles** (the highest of all 12 levels — see table:
totals are 10,12,15,12,12,15,20,20,40,40,30,**60**). Release rate 99 → all 60 out and alive
simultaneously (0 saved/dead) at tick 300. 80+ is not reachable on this build since no level has
more than 60 total mumbles; 60-alive satisfies the case's ≥60 threshold. Assigned Builder×2,
Basher×2 to add render/terrain load (others refused with `none-left`, per this level's limited
skill counts — expected, not a bug).

**Normal speed** (page foregrounded, 6 s trace + separate 5 s rAF/tick measurement while running):
- rAF frame rate: **120.17 fps** (601 frames / 5001 ms) — matches this machine's 120 Hz display; the
  renderer is not frame-rate-limited by simulation work.
- Tick rate: **17.0 ticks/s** (85 ticks / 5001 ms) — matches spec exactly.
- `PerformanceObserver('longtask')`: **0 long tasks > 50 ms**.
- Trace insights (`performance_start_trace`): INP 31 ms, CLS 0.00.

**×3 fast-forward** (same crowd, FF toggled on):
- rAF frame rate: **120.25 fps** (unchanged — not vsync-limited by load).
- Tick rate: **50.94 ticks/s** (255 ticks / 5007 ms) — matches the ~51/s spec target.
- `PerformanceObserver('longtask')`: **0 long tasks > 50 ms** in either FF run.
- Trace insights (separate FF trace that included a `nuke()` mid-window for an explosion/particle
  burst across all 60 mumbles): INP 34 ms; **CLS 0.19** (flagged `CLSCulprits`, window ≈1 s around
  the nuke). This coincides with the level ending (all 60 die) and the pause/status DOM updating;
  the canvas itself does not visibly shift in the screenshot. Recorded as an **observation**, not
  filed as a bug (no visual jank observed, single measurement, not reproduced with a second run
  since the machine was not contended — see below).

No CPU/GPU contention was observed (frame rate pinned to the display's 120 Hz refresh in both
conditions, 0 long tasks), so no repeat run was needed per the brief's contention clause.

**Max main-thread task: 0 ms > 50 ms threshold observed (no long tasks recorded in either speed).**

## Case 3 — Tab hidden / window blur → auto-pause

The app's auto-pause check is `document.hidden` (src/app/app.ts:131), not `visibilityState`.
**Methodology note:** the brief's exact recipe (`Object.defineProperty(document,'visibilityState',…)`
alone) does **not** trigger auto-pause on this build, because overriding only `visibilityState`
leaves the native `document.hidden` getter unchanged — this is a limitation of the synthetic
simulation, not a bug (real tab-hide always changes both together). Overriding **both**
`document.hidden` and `document.visibilityState` before dispatching `visibilitychange` reproduces
real tab-hide correctly:
- Hidden → `ui().paused` flips `false → true` immediately; tick frozen (0 ticks over 2 s of
  simulated "hidden" wall time).
- Returning to visible → **stays paused** (no auto-resume), exactly per DESIGN §6.4.8.
- Manual resume afterwards advances ticks at the normal rate with **no catch-up burst** (+3 ticks
  over 120 ms ≈ 17–25/s, not a multi-second jump).
- Announcer logged "Paused" at the correct point.

`window blur` path tested independently (via `g.setRealtime(true)` to get an unambiguous running
state, then `window.dispatchEvent(new Event('blur'))`): `paused` flips `false → true`, tick frozen
(0 delta over 400 ms). Matches `pauseOnBlur` default-on behaviour (DESIGN §6.4.8).

## Case 4 — Window resize mid-level

Level loaded and paused (`gently-down-the-dome`), one lemming's frozen world position (24, 38) used
as a pointer target across every size (page brought to front + 2 rAF waits before each hover check,
since hover recompute happens once per animation frame — a backgrounded tab would show a stale
`hoveredLemmingId` even though `ui().cursor` updates synchronously; this is expected per the brief's
own warning about background-tab throttling, not a bug).

| Viewport (CSS px) | Canvas (measured) | Scale | Integer? | Pointer → `hoveredLemmingId` |
|---|---|---|---|---|
| 1920×1080 | 1600×640 | 4 | ✓ | correct (id 0) |
| 1440×900 | 1200×480 | 3 | ✓ | correct |
| 1280×720 | 1200×480 | 3 | ✓ | correct |
| 1024×768 | 800×320 | 2 | ✓ | correct |
| 800×600 | 800×320 | 2 (floor) | ✓ | correct, no horizontal scroll (`scrollWidth` 800 = `innerWidth`) |

All scales are integers and match the §5.1 clamp formula for each viewport. No console errors
across any resize. HUD layout not exhaustively re-inspected pixel-by-pixel at every size (that is
covered by the visual a11y testers); this pass focused on canvas scale, errors and pointer mapping.

## Case 5 — Input spam

200 rapid key taps (proper `keydown`+`keyup` pairs to avoid OS-repeat suppression) drawn from
skill keys 1–8, Space, P, F, −/=, N, R, Esc, H, B, Z/X, interleaved every 5th iteration with a
pointer move+down+up at a random canvas point (40 clicks total), plus 20 random toolbar-button
`.click()` calls, then 30 alternating Enter/Escape taps on the title screen, then a **double** rapid
`.click()` on the results screen's "Next level" button.

- After the 200-key + click spam: app still on the `game` screen, **1 dialog left open** (the pause
  menu — expected, since spam included many `Escape` presses and, per Case 3's finding, only a
  *trusted* Escape closes a native `<dialog>`; synthetic ones don't invoke the browser's native
  close-on-Escape). A single real `press_key('Escape')` closed it immediately and returned focus to
  `#game-canvas` — the app was never actually stuck, this is purely a synthetic-input artifact of
  the spam methodology.
- Tick rate re-checked after the spam: 50 ticks/s over 1 s while FF was (correctly) left on from the
  spam — matches the single-loop ×3 rate, not doubled, so no duplicate game loop was spawned.
- Title screen Enter/Escape spam: stayed on `title`, no stuck dialogs, no errors.
- Double "Next level" click on results: navigated to the correct next level's briefing
  (`gently-down-the-dome`) exactly once — no double-navigation, no error.
- `list_console_messages` after the whole sequence: **0 errors/warnings**.

## Case 6 — Memory sanity

`performance.memory.usedJSHeapSize`: 7.13 MB baseline → 25.81 MB after 10 load/restart cycles
(+17.8 MB) → 26.38 MB after 10 more cycles (+0.6 MB). The large first-batch jump is consistent with
one-time lazy caching (each of the 12 level ids' compiled terrain/sprites/audio being touched for
the first time) rather than a per-cycle leak, confirmed by `take_heapsnapshot` (which forces a GC
before capturing): **8,088,616 bytes** after 10 cycles vs **8,087,851 bytes** after 20 cycles — a
765-byte difference, i.e. flat. **No leak growth detected** across load/restart cycles.

## Case 7 — Long run at ×3 to time-up

`one-pop-wonder` (240 s / 4080-tick timer, the shortest in the set) loaded fresh, no skills assigned
so the crowd never resolves on its own, Fast-forward on, run in real time (page kept foreground) for
the full duration (~80 s wall clock, polled periodically without stepping the sim manually).
Ended **exactly** at tick 4080 with `status: "ended"`, `outcome: {won:false, saved:0, required:15,
reason:"time-up"}`. Fast-forward correctly turned itself off at level end (DESIGN §6.4.3). Announcer
fired "30 seconds left", "10 seconds left", and the assertive "Time's up! 0 of 20 saved, 15 needed."
at the right moments. `list_console_messages`: 0 errors/warnings. Clean end, no hang, no drift.

## Untested / partially covered

- HUD layout correctness at every resize breakpoint beyond canvas scale + pointer mapping (left to
  visual a11y testers).
- The §7.8 "≤3 explosion bursts per rolling second" and "no element blinks faster than 1 Hz" limits
  were not independently instrumented during the Case 2 nuke burst (60 simultaneous deaths); no
  visual artifact was observed in the screenshot, but frame-by-frame confirmation was out of scope
  for this pass.
- Could not reach the "80+ alive" stretch goal in Case 2 since no level in this build exceeds 60
  total mumbles.
