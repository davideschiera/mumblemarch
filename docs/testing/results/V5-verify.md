# V5-verify — independent verification of VIS-6 and VIS-7 (fx7-fixer)

Build under test: rebuilt production bundle served at http://localhost:5181/ (not started/stopped by this
agent). Browser: chrome-devtools MCP, own page (`isolatedContext: 'v5'`), closed at the end.

## Cases

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| VIS-6 thumbnail height | ~64–80 CSS px box (DESIGN §5.4 "mini minimap"; BUGS.md VIS-6 suggested fix) | PASS | `.level-card__thumb` computed `height: 72px` at 1440/1280/1024 |
| VIS-6 crispness | Backing store = CSS size × devicePixelRatio (pixelated, not blurry) | PASS | dpr=2: 1440→470×144 css 235×72; 1280→ same (screen-root capped at 1152px column); 1024→390×144 css 195×72. All `backingW === round(cssW*dpr)` exactly |
| VIS-6 contain-fit + centring | Whole level contain-fitted, centred, over theme background | PASS | getImageData on card 1's canvas: symmetric 55px background margin left/right; code review of `drawCardThumbnail` (src/ui/thumbnail.ts) confirms `scale = min(w/level.width, h/level.height)` + `offsetX/Y = round((backing-raster)/2)` |
| VIS-6 no overflow / grid | No card overflow/horizontal scroll; 4-col grid intact | PASS | `document.documentElement.scrollWidth === clientWidth` at all 3 sizes; `grid-template-columns: repeat(4,1fr)` throughout |
| VIS-6 locked cards dimmed | Locked cards still show a dimmed thumbnail | PASS | `.level-card[aria-disabled="true"] .level-card__thumb { opacity: 0.6 }`, confirmed on levels 5–12 with a mixed-progress save (3 of 12 completed) |
| VIS-6 ResizeObserver redraw | Resizing back and forth redraws each canvas at the new size, no stale draw | PASS | Resized 1280×720 → 800×600 → 1280×720; canvas backing store matched the fresh 235×72×dpr=2 (470×144) exactly, not a stale value |
| VIS-6 briefing thumbnail | Unaffected by the card-thumbnail change | PASS | `.briefing__thumb` still 480×160 CSS = 480×160 backing (scale 1, untouched) |
| VIS-7 vertical centring (spare height) | Game block centred when it fits (DESIGN §5.1) | PASS | Symmetric top/bottom gaps: 1920×1080 (987px viewport) 91.5/91.5; 1440×900 128/128; 1280×800 78/78; 1024×768 70/70 |
| VIS-7 top-align + scroll (no spare height) | Falls back to top alignment + page scroll | PASS | 800×600: content 660px > viewport 600px; topGap=16 (page padding), `scrollHeight(660) > clientHeight(600)` |
| VIS-7 overlay/stage alignment | Pause pill, toast, caption strip, edge-scroll zones line up with the stage | PASS | `#stage-overlay` rect === `#game-canvas` rect (pixel-identical) at every size tested; pill-row and a live caption line ("Off we go!", real tick-15 `lets-go` event) both measured inside the canvas box; edge zones are computed directly from the canvas's own rect (code review, src/app/app.ts + camera-control.ts) |
| VIS-7 pointer mapping | `pointermove`/`pointerdown`/`pointerup` map exactly to world coords | PASS | Isolated mumble: `pointermove` at its exact world (client) coords → `ui().hoveredLemmingId` equalled its id; `pointerdown`+`pointerup` on `#game-canvas` at 1440×900 assigned Basher (state walking→bashing) |
| VIS-7 other screens unaffected | Title/Settings/etc. not shifted | PASS | `.app` `justify-content: normal` on Title and Settings, content top at 16px (page padding), unchanged |
| Regression — `npm run check` | All unit tests green | PASS | 1070/1070 |
| Regression — 12/12 `playSolution` wins | All levels win, saved ≥ required | PASS | Same figures as V1-verify.md: spade-expectations 10/5 · gently-down-the-dome 7/6 · bridge-over-troubled-toffee 12/8 · the-punch-line 12/6 · suction-cup-final 7/6 (time-up, won) · not-one-step-bogward 14/9 · diagonally-yours 20/14 · one-pop-wonder 19/15 · clam-before-the-storm 31/28 · double-boiler 39/32 · wrong-side-of-the-hedge 30/25 · last-shift-at-the-foundry 53/45. All `won:true` |
| Regression — Lighthouse (level select, snapshot) | Accessibility + Best Practices high | PASS | Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100 (31/31 audits passed) |
| Regression — Lighthouse (game, paused, snapshot) | Accessibility + Best Practices high | PASS | Accessibility 100, Best Practices 100, SEO 100, Agentic Browsing 100 (30/30 audits passed) |
| Regression — console | 0 errors/warnings | PASS | `list_console_messages` (incl. preserved) empty across the whole session, including this agent's own `getImageData` calls (no `willReadFrequently` warning appeared) |

## Notes

- Mixed-progress save was built by clearing localStorage in the isolated `v5` browser context, completing
  `spade-expectations`, `gently-down-the-dome` and `bridge-over-troubled-toffee` via `__game.playSolution`,
  then reaching Level Select through the real UI (Esc → pause menu → "Quit to levels"), per the brief.
- `suction-cup-final`'s default `playSolution` run needed `maxTicks: 6000` (default 5000 wasn't enough to
  reach its scripted time-up finish); with that raised limit it reproduces the exact figures already on
  record in V1-verify.md (7/6, time-up, won:true) — not a regression, just a tick-budget note for future
  verifiers re-running that one level standalone.
- One cosmetic, out-of-scope observation (not filed, not part of VIS-6/VIS-7): in the `game-1440.png`
  screenshot the "Saved 0 ⬚⬚⬚⬚⬚⬚⬚⬚⬚⬚ need 6" status line shows a run of tofu/placeholder glyphs where a
  per-mumble progress-dot icon font apparently isn't rendering in this headless Chrome. Unrelated to either
  bug under test; flagging for the record only.
- Evidence: `docs/testing/evidence/V5/level-select-1440.png`, `level-select-1024.png`,
  `briefing-thumb-1280.png`, `game-1440.png`.
