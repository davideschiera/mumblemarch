# Phase 5 — Bugs

Severity: **critical** (crash, softlock, data loss, can't finish/progress) · **major** (spec behaviour
wrong / a11y blocker / visible glitch in normal play) · **minor** (polish, cosmetic, copy) · **note**
(observation, no change needed).
Fix status: `OPEN` → `FIXING` → `FIXED` (fixer: files + check result) → `VERIFIED` (by a different agent,
with browser evidence) · or `DEFERRED` (reason) / `WONTFIX` (reason, e.g. per spec).

Testers **append** new bugs at the end of this file with a shell append (`cat >> docs/testing/BUGS.md <<'EOF'`),
using their own id prefix (e.g. `FUN-1`, `FLOW-2`, `PLAY-3`, `A11Y-4`, `VIS-5`, `AUD-6`, `ROB-7`, `CMP-8`).
Never rewrite other agents' entries. Template:

```
### <ID> — <short title>
- Severity: critical|major|minor|note · Area: T1a… · Found by: <agent label> · Build: snapshot :<port> <HH:MM>
- Steps: 1. … 2. …
- Expected: … (spec ref: DESIGN §x.y / RESEARCH §x / LEVELS.md)
- Actual: …
- Evidence: docs/testing/evidence/<area>/<file>.png (+ snapshot/log excerpts)
- Suspected cause (optional): src/…
- Owner: — · Fix status: OPEN · Fixed by: — · Verified by: —
```

## Index (maintained by test-lead)

| Id | Sev | Title | Status |
|---|---|---|---|
| PLAY-A1 | major | L8 bomber under the hatch column → later spawns fall 80 px, run unwinnable | VERIFIED |
| PLAY-B1 | minor | L12 piston toll depends on unseen crowd timing; hint-following run saves exactly 48/48 | VERIFIED |
| PLAY-A2 | minor | L8 hint "thin tin floor" points at the wrong strips | VERIFIED |
| A11Y-1 | minor | L1 briefing hint doesn't name the keys / click (DESIGN §7.1 A16) | VERIFIED |
| PLAY-B2 | minor | Stale "Level complete!" text left in the assertive live region on later screens | VERIFIED |
| A11Y-2 | minor | Batched "saved" announcement always says "1 saved" | VERIFIED |
| A11Y-3 | minor | `__game.navigate()` without `back` → Back throws (test hook only) | VERIFIED |
| PLAY-A3 | minor | Briefing "Show hint" label unchanged when expanded (spec + ARIA disclosure keep the label; add a visual state cue) | VERIFIED (visual cue) |
| PLAY-A4 | minor | Level-card description "limit.This" missing space | VERIFIED |
| VIS-1 | minor | axe label-content-name-mismatch: level cards, filter chip, RR floor button, skill buttons | VERIFIED |
| VIS-2 | minor | Results headline text-stroke 1.09:1 → Lighthouse a11y 95 | VERIFIED |
| VIS-3 | minor | Settings heading order h1 → h3 → Lighthouse a11y 98 | VERIFIED |
| VIS-4 | minor | High-contrast view: exit not drawn in the §4.9 #3cff6a beacon colour | VERIFIED |
| VIS-5 | minor | Level-select thumbnails tiny inside large cards (orchestrator polish item) | VERIFIED |
| AUD-1 | minor | Caption strip never moves to the top-left when the cursor/selected mumble is under it (§7.7) | VERIFIED |
| CMP-1 | minor | RR "+" at 99 shows "🔒 min" instead of a max label | VERIFIED |
| A11Y-4 | minor | Coalesced saved batch lags the joined "Goal reached" count in one utterance (+ card-name separator, DESIGN §7.2 sync) | VERIFIED |
| CMP-2 | minor | Title "Sound starts…" note overlaps the march strip (low contrast); strip scaled ×2.88 (non-integer) | VERIFIED |
| VIS-6 | minor | Level-select cards still mostly empty (thin strip thumbnail) — taller contain-fit thumbnail | VERIFIED |
| VIS-7 | minor | Game screen top-aligned → ~300 px empty band below the toolbar at 1440×900 | VERIFIED |

## Entries

### PLAY-B1 — L12 "Last Shift at the Foundry": piston toll hinges on invisible crowd timing; hint-following run saves exactly 48/48
- Severity: minor · Area: T2b · Found by: t2b-play · Build: snapshot :5214 14:19
- Steps: 1. L12, Climber on the first mumble; Builder at the brass channel (x≈461). 2. Raise RR to 99 (Shift+=), so all 60 wait on the dock. 3. Miner on the scout at the heap (x≈1045). 4. When the route is ready (≈t1350), Basher on a crowd mumble at the slag wall (x≈277) to "let the whole shift through at once" (the hint).
- Expected: a Stampede finale with a readable margin. LEVELS §12 sim saves 52–53 with 7–8 piston bites (a 3 s re-arm against a bunched crowd).
- Actual: the crowd reaches the heap after the tunnel is already open, so it never bunches. It trickles past the piston (re-arm ≈50 ticks) spread over ≈500 px: 11 crowd bites + the scout = 12 lost → **48/60, need 48, zero margin**. The bunching only happens if the crowd is released early enough to pile up on the heap *while the miner digs*. The level and the hint don't show this ("Scout ahead, bridge the brass, then let the whole shift through at once" suggests the opposite order). A slightly worse spread would fail.
- Evidence: docs/testing/evidence/T2b/L12-midplay-trap.png; results docs/testing/results/T2b-play.md (L12)
- Suspected cause (optional): level balance (save 48 vs the non-bunched toll). Options: save 46, a longer piston re-arm, or a hint that points at releasing before the miner breaks through.
- Owner: FX1 · Fix status: VERIFIED · Fixed by: FX1 (src/levels/data/last-shift-at-the-foundry.ts, tests/levels-replay-spec.test.ts, docs/design/LEVELS.md, docs/design/mockups/levels-data.js; check 1054/1054) + FX1b (hint copy) · Verified by: V1 — briefing shows Save 45 (75%); replayed the bug's exact hint-following schedule (climber/builder early, RR99, miner on scout, basher on a dock mumble only at t=1350 after the tunnel was already open, no bunching) via assignSkill/step: saved 52/60 >= 45 (margin 7), 8 trap bites; new hint explicitly says 'bunched up before the tunnel opens', signposting the timing that broke the old run

### PLAY-B2 — Stale "Level complete!" text stays in the assertive live region on the Levels / Briefing screens
- Severity: minor · Area: T2b · Found by: t2b-play · Build: snapshot :5214 14:19
- Steps: 1. Finish L11 (results screen announces "Level complete! 30 of 30 saved, 25 needed."). 2. Try again → Esc → Quit to levels. 3. Open L12's briefing.
- Expected: live regions hold only text that is current for the screen (DESIGN §7.2/§7.3).
- Actual: the assertive region (`aria-live="assertive"`) still contains "Level complete! 30 of 30 saved, 25 needed." on the Levels screen and the L12 briefing. It is not re-announced, but a screen-reader user who browses the page finds an out-of-date result.
- Evidence: a11y snapshot of the Levels screen and the L12 briefing (uid 117_30 text) during the t2b-play run.
- Owner: FX2 · Fix status: VERIFIED · Fixed by: FX2 (src/ui/announcer.ts, src/ui/announce-queue.ts, src/app/router.ts; check 1054/1054) · Verified by: V2 — real UI transitions (results->levels->briefing->game) leave both live regions clean each screen ('Levels'/'Briefing: ...'/game-ready only; assertive empty); announcerLog() shows each screen's entry announcement exactly once; game-ready fires once on Let's march!. 0 console errors.

### PLAY-A1 — L8 "One-Pop Wonder": a bomber that pops under the hatch drop column makes every later spawn fall 80 px and splat (run becomes unwinnable)
- Severity: major · Area: T2a · Found by: t2a-play · Build: snapshot :5213 14:30
- Steps: 1. Start L8 at RR 50, pause at tick ≈285 (9 out, 11 still to release). 2. Choose Bomber (3), click the mumble at x≈119 in the hopper; it walks on and pops at x=129. 3. Step on.
- Expected: LEVELS.md §8 says "Give any one a Bomber … It pops wherever it stands" and "Popping at the very first mumble works too; later mumbles simply fall through the hole one by one" — so the pop position should not matter (or the danger should be signposted).
- Actual: the crater (floor rows x 122..135) opens the hopper floor right under the hatch (spawn x=124, y=24). Every later mumble falls 24→104 = 80 px straight through the hole and splats: events `lemming-died … splat` at ticks 416, 444, 472, 500, 528, 556 (one per spawn); with 11 still to release, max saved = 8 < 15 → lost. Any pop at x≈118..131 (~30 % of the 44 px hopper) does this while mumbles remain to be released. My first run (pop at x=146) saved 19/20. Nothing in the view, briefing or hint warns about it; the fall-height ruler is off by default.
- Evidence: docs/testing/evidence/T2a/L8-midplay.jpg (hopper, hatch directly above), announcer/events from the run above.
- Suspected cause (optional): level geometry — hatch spawn height vs. works floor (80 px) is only safe while the hopper floor is intact. Options: lower the hatch/raise the works floor so hatch→floor ≤ 63 px, put a steel plate under the drop column, or say it in the hint.
- Owner: FX1 · Fix status: VERIFIED · Fixed by: FX1 (src/levels/data/one-pop-wonder.ts, tests/levels-l8-pop-anywhere.test.ts, docs/design/LEVELS.md, docs/design/mockups/levels-data.js; check 1054/1054) · Verified by: V1 — real input repro (key 3 + synthetic canvas click) popped a mumble at x=129 (exact bug coord) mid-play (9 out/11 to release) and at x=124 on the very first mumble; steel patch (x120-128) holds in both, 0 splats, level won 19/20 (>=15) both times; evidence docs/testing/evidence/V1/L8-pop-under-hatch.png

### PLAY-A2 — L8 hint "a thin tin floor" points at the wrong thing visually
- Severity: minor · Area: T2a · Found by: t2a-play · Build: snapshot :5213 14:30
- Steps: 1. Open L8 briefing → Show hint ("Steel walls, a thin tin floor, and one brave volunteer."). 2. Look at the level.
- Expected: the floor you must pop through reads as the "thin tin floor" (LEVELS.md §8: hopper floor 6 px).
- Actual: the hopper floor is drawn in the same orange brick as the thick hall walls, while the only thin tan "tin"-looking strips are the solid 4 px bars at y=72 left and right of the hopper (decor "steam pipes", but real Earth terrain). A player following the hint looks at the wrong strips.
- Evidence: docs/testing/evidence/T2a/L8-midplay.jpg
- Owner: FX1 · Fix status: VERIFIED · Fixed by: FX1 (src/levels/data/one-pop-wonder.ts, docs/design/LEVELS.md, docs/design/mockups/levels-data.js; check 1054/1054) + FX1b (hint copy) · Verified by: V1 — screenshot shows hopper floor as the same orange brick as the main hall floor (matches new hint 'a brick floor'), steel columns/patch visibly distinct riveted blue-grey; docs/testing/evidence/V1/L8-pop-under-hatch.png

### PLAY-A3 — Briefing "Show hint" button keeps its label when the hint is open
- Severity: minor · Area: T2a · Found by: t2a-play · Build: snapshot :5213 14:25
- Steps: 1. Level select → L8 card → briefing. 2. Click "Show hint".
- Expected: the toggle says what it will do next ("Hide hint"), or stops being a toggle.
- Actual: `<button aria-expanded="true">Show hint</button>` — label unchanged after expanding (same in the in-game B briefing dialog).
- Evidence: DOM excerpt above.
- Owner: FX2 · Fix status: VERIFIED (visual cue) · Fixed by: FX2 (src/ui/screens/briefing.ts, src/styles/screens.css; check 1054/1054) · Verified by: V2 — real click on briefing Show hint: label text stays 'Show hint', aria-expanded false->true, aria-hidden .briefing__hint-chevron rotates (matrix(1,0,0,1,0,0)->matrix(0,1,-1,0,0,0)); same in-game via B overlay; Esc closes overlay and focus returns to canvas. Screenshots evidence/V2/play-a3-briefing-{collapsed,expanded}.png.

### PLAY-A4 — Level card description joins two sentences without a space
- Severity: minor · Area: T2a · Found by: t2a-play · Build: snapshot :5213 14:33
- Steps: 1. Finish L8, Quit to levels. 2. Read the L8 card's accessible description.
- Expected: "Finished within the time limit. This is the level you played last."
- Actual: `description="Finished within the time limit.This is the level you played last."` (screen readers read "limit.This").
- Evidence: a11y snapshot of the Levels screen.
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 (src/ui/screens/level-select.ts, using announce-queue.ts's joinUtterance; check 1064/1064) · Verified by: V3 — level card (inTime+isCurrent both true) aria-describedby text reads verbatim 'Finished within the time limit. This is the level you played last.' (space after first period, joinUtterance)

### AUD-1 — Caption strip never moves to top-left when cursor/selected mumble is over it (DESIGN §7.7)
- Severity: minor · Area: T4 · Found by: T4-audio · Build: snapshot :5218 14:50
- Steps: 1. Code review of `src/ui/hud/captions.ts` (caption strip, bottom-left inset 8 px, `aria-hidden`). 2. Cross-check DESIGN §7.7.
- Expected: DESIGN §7.7 "The strip moves to the top-left while the cursor or the selected mumble is inside its box."
- Actual: `Captions` never repositions; its own doc comment says so explicitly: "DESIGN also has the strip move to the top-left while the cursor or the selected mumble is inside its box; skipped — the view is given no on-screen position for either (TODO(E2b) if a later worker exposes one via HudState)." Confirmed live: triggering barks (e.g. "Off we go!", "[creak… clunk]") always renders in the fixed bottom-left `.caption-strip`, regardless of cursor/selection position.
- Evidence: src/ui/hud/captions.ts lines 1-30 (doc comment + `add()`); live captions observed via `.caption-strip__line` at docs/testing/results/T4-audio.md.
- Suspected cause (optional): `HudState` (ui/hud/types.ts) has no cursor/selected-mumble screen position field for the caption view to read.
- Owner: FX4 · Fix status: VERIFIED · Fixed by: FX4 (src/ui/hud/captions.ts, src/ui/hud/types.ts, src/app/game/view-state.ts, src/ui/screens/game.ts, src/styles/overlays.css, tests/ui-hud-captions.test.ts; check 1064/1064) · Verified by: V2 — real pointermove over the .caption-strip's box (while 'Off we go!' showing): strip gets caption-strip--top and its rect jumps from bottom-left (top~461) to top-left (top~24, same left~128, 8px inset both corners); moving away reverts it. Under Settings->Motion->Reduced (real click), the same hover adds caption-strip--instant and the rect is already at the final top-left position after a single frame pair (no 150ms transition wait needed) -- confirmed instant. 0 console errors.

### VIS-1 — Lighthouse/axe "label-content-name-mismatch" on level-select cards, game HUD chips, skill buttons and RR buttons
- Severity: minor · Area: T3b · Found by: t3b-a11y-visual · Build: snapshot :5217 14:30
- Steps: 1. Lighthouse accessibility audit (snapshot mode) on Level select, then on the game screen (mid-level, paused).
- Expected: WCAG 2.5.3 Label in Name — an element's visible text label should be contained within its accessible name so speech-input users ("click <visible text>") land on the right control.
- Actual: `label-content-name-mismatch` fails on: (a) every level-select card, e.g. visible text "1 Spade Expectations New" vs `aria-label="Level 1: Spade Expectations. Breezy. New."` — the tier word "Breezy." sits between "Expectations" and "New" in the name, breaking the contiguous match; (b) the game screen's filter chip (visible "Pick: All", `aria-label="Selection filter: all mumbles"` — "Pick:" isn't in the name); (c) the RR− button at its floor (visible "🔒 min", `aria-label="Slower release"` — "min" isn't in the name); (d) all 8 skill buttons (visible key-hint digit "1"–"8" is not part of `aria-label="Climber, none left"` etc.). 10 failing elements found on the game screen alone. Lighthouse's Accessibility category score stays 100 (the audit has 0 weight) but it is a genuine axe/WCAG finding.
- Evidence: Lighthouse JSON reports (level-select + game screen), audit id `label-content-name-mismatch`.
- Suspected cause (optional): visible key-hint digits/state badges are appended/prepended outside the semantic `aria-label` string in `src/ui/screens/level-select.ts` and `src/ui/hud/*`.
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 + FX3b (clean names: src/ui/hud/skill-button.ts, src/ui/hud/rr-group.ts, src/ui/hud/toolbar.ts, src/ui/screens/level-select.ts, src/ui/strings.ts, src/styles/hud.css, tests/ui-spec-copy.test.ts; check 1065/1065; LH level-select 100/0-fail, game 100/0-fail (RR at min/max, a skill at 0, key hints on/off), label-content-name-mismatch pass) · Verified by: V3 — Lighthouse label-content-name-mismatch: 0 fails on level-select (100/100/100/100, 31/31) and game screen at both RR=50(floor)/RR=99(ceiling) and skills-at-0 (100/100/100/100, 30/30). Live names: filter chip 'Pick: All. Selection filter: all mumbles.'; RR floor 'Slower release, min' (visible 🔒 min), RR ceiling 'Faster release, max' (visible 🔒 max); skill buttons clean 'Climber, none left'/'Digger, 5 left' (visible text is just the name, key-hint+badge moved to overlay); level card 'Level 1: Spade Expectations Everyone home. Breezy.'. Toolbar screenshot confirms key-hint digit + count badge + hatch overlay still visible/positioned correctly in default/selected/0-left states. Clicking a 0-left skill button (uid) still reaches the button (announced 'No climbers left', selection unchanged) — overlay does not block pointer events. Real key '2' selected Floater on a level where only floater>0. Evidence: docs/testing/evidence/V3/toolbar.png

### VIS-2 — Results headline: "sticker" text-stroke outline is only 1.09:1 against the results-screen background
- Severity: minor · Area: T3b · Found by: t3b-a11y-visual · Build: snapshot :5217 14:30
- Steps: 1. `__game.navigate({screen:'results', levelId, outcome:{...won:true}})`. 2. Lighthouse accessibility audit (snapshot mode).
- Expected: DESIGN §5.2 `--font-display` "sticker" treatment (`-webkit-text-stroke` + text-shadow, both `#2a1433`) is meant to keep the headline legible over any background; §4.10's contrast rules require ≥3:1 for the visible glyph edge.
- Actual: axe `color-contrast` fails the `<h1 class="results-headline results-headline--success">` — computed foreground (the text-stroke colour) `#2a1433` vs background `#14112a` = **1.09:1** (needs 3:1), because the plum stroke and the dark-plum page background are nearly identical hues. Lighthouse Accessibility score for this screen drops to 95. Note: the fill colour itself (`--color-success #72e08e`) is 11.17:1 against the same background, so the headline stays readable in practice — the stroke just fails to add the intended outline contrast on this particular background.
- Evidence: Lighthouse JSON report (results screen), audit id `color-contrast`; computed styles `color: rgb(114,224,142)`, `-webkit-text-stroke-color: rgb(42,20,51)`, background `rgb(20,17,42)`.
- Suspected cause (optional): `--font-display` sticker stroke colour is a fixed `#2a1433` regardless of the page background; on screens whose background is close to that plum, the stroke stops contributing contrast (`src/styles/tokens.css` / headline styles).
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 (src/styles/screens.css: .results-headline stroke/shadow now --color-border-strong, 7.4:1 on --color-bg; check 1064/1064; LH results win 100/0 fail, loss 100/0 fail) · Verified by: V3 — Results headline stroke/shadow now rgb(165,157,224)=--color-border-strong vs bg rgb(20,17,42)=--color-bg, computed contrast 7.44:1 (>=3:1); Lighthouse Accessibility 100 (was 95) on both win (28/28) and loss (28/28) snapshots; screenshot shows a legible sticker headline. Evidence: docs/testing/evidence/V3/results-win.png

### VIS-3 — Settings screen: heading order skips from h1 to h3 (Controls group headings)
- Severity: minor · Area: T3b · Found by: t3b-a11y-visual · Build: snapshot :5217 14:30
- Steps: 1. Navigate to Settings. 2. Lighthouse accessibility audit (snapshot mode), or list `h1,h2,h3` in the DOM.
- Expected: WCAG 1.3.1/2.4.6 heading order — headings should not skip levels, so screen-reader users navigating by heading can build an accurate outline (DESIGN §5.4 "one `<h1>`" per screen, sections use `<fieldset>`/`<legend>`, but the Controls list's per-group titles use real headings).
- Actual: axe `heading-order` fails. DOM heading sequence on Settings is `H1 "Settings"` → `H3 "Skills"` → `H3 "Choosing mumbles"` → `H3 "Camera"` → `H3 "Game flow"` → `H3 "Sound & info"` — no `h2` in between.
- Evidence: Lighthouse JSON report (Settings screen), audit id `heading-order`; Accessibility score 98 on this screen.
- Suspected cause (optional): the Controls rebinding list's group titles (`.settings-controls__group-title`) are marked up as `<h3>` with no wrapping `<h2>` (e.g. "Controls") — likely in `src/ui/screens/settings.ts`.
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 (src/ui/screens/settings-controls.ts: group titles h3→h2; check 1064/1064; LH settings 100, 0 fail, heading-order H1→H2×5) · Verified by: V3 — Settings heading sequence now H1 Settings -> H2 Skills/Choosing mumbles/Camera/Game flow/Sound & info, no skipped level; Lighthouse Accessibility 100 (was 98), 29/29 passed, 0 heading-order fails

### VIS-4 — High-contrast "clear physics" view: exit doorway doesn't use the spec's #3cff6a beacon colour
- Severity: minor · Area: T3b · Found by: t3b-a11y-visual · Build: snapshot :5217 14:30
- Steps: 1. Settings → Display → "Clear physics view" on. 2. Load "Last Shift at the Foundry" (or Spade Expectations), step to reveal the exit. 3. `getImageData` the game canvas and scan for `#3cff6a`.
- Expected: DESIGN §4.9 says the exit renders as `#3cff6a` fill with a 1px outline of the doorway + a 3×5 door glyph (ratio 15.70 vs black), so every material class has its own flat HC colour distinct from the others.
- Actual: 0 pixels of `#3cff6a` anywhere in the rendered frame. The exit's outline instead uses the generic earth-edge white (`#ffffff`, same colour used for every other terrain edge in HC mode), and a handful of pixels (~8) still show the *normal-theme* glow colour unconverted (foundry `#7dff9a`) bleeding through the beacon motes. Earth (`#a0a0a0`+white edge) and traps (`#ffd400`, confirmed 127px sampled on "Clam Before the Storm") render correctly per §4.9; only the exit's HC colour mapping appears to be missing. Contrast is still very high (white on black) and the arch silhouette still reads as an exit by shape, so this is not itself a WCAG failure, but it's a real deviation from the documented HC palette that reduces the intended colour-coded distinctiveness of the exit "beacon."
- Evidence: docs/testing/evidence/T3b/hc-mossgrove-normal.png, hc-mossgrove-highcontrast.png, hc-foundry-normal.png, hc-foundry-highcontrast.png; pixel-scan counts recorded in results.
- Suspected cause (optional): the HC material LUT (renderer) likely maps `earth`/`steel`/`hazard`/`trap` but not `exit`, or the exit's glow-mote colour is drawn from the theme palette instead of the HC LUT.
- Owner: FX4 · Fix status: VERIFIED · Fixed by: FX4 (src/render/high-contrast.ts, src/render/scene.ts, tests/render-high-contrast.test.ts; check 1064/1064) · Verified by: V2 — Clear physics view enabled via real Settings checkbox; getImageData scan of #game-canvas (fresh 2D copy) on 3 levels/themes (spade-expectations/mossgrove, last-shift-at-the-foundry/foundry at End-key exit view, clam-before-the-storm/reef): all show exactly 71px #3cff6a and 0px leaked glow #7dff9a, matching fixer's claim. HC-off comparison (after a fresh loadLevel) shows normal theme colours, no #3cff6a.

### VIS-5 — Level-select cards: thumbnails render far smaller than the card, leaving most of the card empty
- Severity: minor · Area: T3b · Found by: t3b-a11y-visual (orchestrator-flagged) · Build: snapshot :5217 14:30
- Steps: 1. Level select at 1440×900 or 1280×720. 2. Compare a card's bounding box to its `.level-card__thumb` canvas's rendered box.
- Expected: DESIGN §5.4 describes the card thumbnail as "a mini minimap... over the theme background colour" sized to the card (cards are 282×176 in the spec's wireframe). `docs/design/mockups/menus.html` (lines ~220-225) implements this by painting the theme background across a fixed 250×34 canvas first, then drawing the level's raster scaled to fit that width, and stretching the canvas to the card with CSS `width:100%; image-rendering:pixelated` — so every card's thumbnail fills the card width regardless of the level's own length.
- Actual: `src/ui/screens/level-select.ts` draws the thumbnail at a fixed **world→CSS** scale (`CARD_THUMB_SCALE = 25/LEVEL_HEIGHT`, i.e. 25/160) with no CSS width stretch and no background fill outside the level's own pixels (`src/ui/thumbnail.ts` sizes the canvas to `round(level.width*scale) × round(level.height*scale)` only). Measured at 1440×900: cards are 271×176 CSS px, but thumbnails are only 63×25 to 95×25 CSS px (23–35% of the card's width, 14% of its height), floating in an otherwise-empty card with no background treatment — for any level narrower than 1600 world px (i.e. almost every level), this leaves a large blank area above the title.
- Evidence: docs/testing/evidence/T3b/level-select-thumbnails-1440.png, level-select-thumbnails-1280.png (measured boxes in results docs/testing/results/T3b-a11y-visual.md).
- Suspected cause (optional): `src/ui/screens/level-select.ts` (`CARD_THUMB_SCALE`, line ~27) and `src/ui/thumbnail.ts` (`drawLevelThumbnail`, canvas sized to level pixels only). Suggested fix, consistent with the mockup: give `.level-card__thumb` (`src/styles/levels.css`) a CSS `width: 100%` alongside its existing `height: 25px; image-rendering: pixelated`, so the small canvas is upscaled (pixelated, not blurry) to the card's full width; optionally also pre-fill the canvas with `theme.background` across its full width before drawing the terrain slice, matching the mockup and the "over the theme background colour" wording in DESIGN §5.4.
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 (src/ui/thumbnail.ts, src/ui/screens/level-select.ts, src/styles/levels.css; check 1064/1064; LH level-select 100, 0 label-content-name-mismatch fails) · Verified by: V3 — thumbnail canvas backing 250x25, CSS width:100% stretches to card content width (235px @1440, 231px card @1024, all cards keep 176px height across 1440/1280/1024), theme bg painted full width (getImageData rgb(22,18,44) at x=2,mid,right-2 identical), pixelated upscale visually confirmed; docs/testing/evidence/V3/level-select-{1440,1280,1024}.png
### A11Y-1 — Level 1 briefing hint doesn't name the keyboard/mouse controls (A16)
- Severity: minor · Area: T3a · Found by: t3a-a11y-keys · Build: snapshot :5216 14:43
- Steps: 1. Fresh save, open the "Spade Expectations" (level 1) briefing. 2. Press `Tab` to "Show hint", press `Enter` to expand it. 3. Read the hint text.
- Expected: RESEARCH §7 A16 / DESIGN §7.1 acceptance criterion: "Level 1's hint names the keys" — "Level 1's briefing hint includes '1–8, X, Space' (keyboard) and 'click a mumble' (mouse)."
- Actual: The hint reads only "The burrow is right under your feet. One spade is all it takes." — no mention of any key or of clicking a mumble. (The in-game Help screen and the game-ready announcement do name the keys, so keyboard play is not blocked — only the level-1 briefing hint itself is missing them.)
- Evidence: docs/testing/results/T3a-a11y-keys.md (Case 1); hint text captured via `document.body.innerText` on the briefing screen.
- Suspected cause (optional): level-1 briefing hint string in src/levels/data (or ui/strings.ts) likely never updated to include the A16 control-naming requirement.
- Owner: FX1 · Fix status: VERIFIED · Fixed by: FX1 (src/levels/data/spade-expectations.ts, docs/design/LEVELS.md, docs/design/mockups/levels-data.js; check 1054/1054) · Verified by: V1 — keyboard-only: navigated to L1 briefing, Shift+Tab to focus 'Show hint' (aria-expanded=false), Enter expanded it; hint text 'The burrow is right under your feet. Click a mumble, or use 1–8, X, Space — one spade is all it takes.' contains both '1–8, X, Space' and 'click a mumble'

### A11Y-2 — Batched "saved" announcement always says "1 saved" instead of the true batch count
- Severity: minor · Area: T3a · Found by: t3a-a11y-keys · Build: snapshot :5216 14:43
- Steps: 1. `__game.loadLevel('spade-expectations')`, `__game.setRealtime(false)`. 2. Assign Digger to a walker (`__game.assignSkill(id,'digger')`) so all 10 mumbles can reach the exit. 3. `__game.step(20)` repeatedly until `status==='ended'`. 4. Read `__game.announcerLog()`.
- Expected: DESIGN §7.3 template #10 `{s} saved, {l} lost. {saved} of {required} home.` where `{s}` is the number of mumbles newly saved in that coalesced batch (throttle rule: batches ≥2s apart are combined into one message, so `{s}` should be the sum of saves folded into it).
- Actual: The final combined announcement read `"1 saved. 10 of 5 home. Goal reached: 5 of 5 home!"` — the cumulative figure (`10 of 5 home`) is correct, but `{s}` shows `1` even though all 10 mumbles (a jump from a prior cumulative of 0) were folded into this single coalesced message. The same pattern (`{s}=1` while the cumulative jumps by much more than 1) was also seen mid-level: `"1 saved. 9 of 5 home. Goal reached: 5 of 5 home!"` after a cumulative jump from 1→9. This suggests the "replace in place" throttle rule (§7.3 throttle rule 2) keeps only the last individual save event's own `s=1` instead of accumulating `s` across the replaced messages.
- Evidence: docs/testing/results/T3a-a11y-keys.md (Case 6); raw `announcerLog()` entries quoted above.
- Suspected cause (optional): Announcer's polite-queue "replace in place by key" coalescing (src/audio or src/app announcer, `batch` key) likely overwrites the whole queued message including `s` instead of summing `s` across replaced updates.
- Owner: FX2 · Fix status: VERIFIED · Fixed by: FX2 (src/ui/announce-queue.ts, src/ui/event-announcements.ts; check 1054/1054) · Verified by: V2 — spade-expectations, digger on 1st walker, all 10 saved/0 lost: batch messages '1 saved. 1 of 5 home.' / '2 saved. 3 of 5 home.' / '1 saved. 4 of 5 home...' / '5 saved. 9 of 5 home.' / '1 saved. 10 of 5 home.' — each s equals delta from the previous batch's cumulative (1,2,1,5,1 sum to 10); l omitted throughout (0 dead).

### A11Y-3 — __game.navigate() to a screen without an explicit `back` target crashes on Back
- Severity: minor · Area: T3a · Found by: t3a-a11y-keys · Build: snapshot :5216 14:43
- Steps: 1. From any screen, run `__game.navigate({screen:'settings'})` (no `back` field). 2. Click/activate the Settings screen's "Back" button.
- Expected: Either the Back button is hidden/disabled when there is no back target, or it falls back to a sane default (e.g. title) without erroring. (ARCHITECTURE §14 documents `navigate(route)` with an example that includes an explicit `back`, implying route objects are expected to carry one, but the app should not crash if a caller omits it.)
- Actual: `list_console_messages` shows `Uncaught TypeError: Cannot read properties of undefined (reading 'screen')` (×2), and the screen does not change (stays on Settings). Note: navigating the same route the normal way (Tab/Enter from Title → Settings, which sets `back:{screen:'title'}` implicitly) works correctly — Back returns to Title with no error. This bug only reproduces via the direct `__game.navigate()` test hook without a `back` field, not through any real player-facing UI path.
- Evidence: docs/testing/results/T3a-a11y-keys.md (Case 1 notes); console message captured via `list_console_messages`.
- Suspected cause (optional): router "Back" handler reads `route.back.screen` without a null check; src/app router/navigate implementation.
- Owner: FX2 · Fix status: VERIFIED · Fixed by: FX2 (src/app/test-hook.ts; check 1054/1054) · Verified by: V2 — __game.navigate({screen:'settings'}) then real click on Back -> lands on Title (document.title='Mumblemarch...'); same for {screen:'help'}. 0 console errors both times.

### CMP-1 — RR "+" button shows "🔒 min" when the release rate is at its maximum (99)
- Severity: minor · Area: T6 · Found by: t6-compare · Build: snapshot :5220 15:02
- Steps: 1. `__game.playSolution('last-shift-at-the-foundry', {maxTicks: 820})` (its script sets RR 99), or raise RR to 99 with "+" on any level. 2. Look at the "+" (Faster release) button.
- Expected: the disabled "+" at 99 reads as the ceiling (e.g. padlock + "max"), and never shows the floor label. DESIGN §5.3 puts the padlock + "min" on "−" at the level minimum; "+" is aria-disabled at 99.
- Actual: "+" shows the padlock glyph over "min" at RR 99 (DOM: `button[aria-label="Faster release"][aria-disabled="true"]` → text "🔒min"). Players are told the rate is at its minimum while it is at its maximum.
- Evidence: docs/testing/compare/ours/06-dark-crowd-hover.png (toolbar, left group), docs/testing/compare/06-dos-vga-busy-hover-compare.png
- Suspected cause (optional): src/ui/hud/rr-group.ts line ~31 builds the same lock span with `HUD_TOOLBAR.rrMin` for both buttons; src/ui/strings/hud.ts has only `rrMin: 'min'` (a `rrMax: 'max'` for the + button is missing).
- Owner: FX3 · Fix status: VERIFIED · Fixed by: FX3 (src/ui/hud/rr-group.ts, src/ui/strings/hud.ts: added rrMax, + button now shows padlock+"max"; check 1064/1064; LH game 100, 0 fail) · Verified by: V3 — raised RR to 99 via real Shift+= key presses on Spade Expectations: '+' shows aria-label 'Faster release, max' (visible 🔒 max), aria-disabled=true; '-' enabled, plain 'Slower release'. At the level minimum (50) '-' shows 'Slower release, min' (visible 🔒 min), '+' enabled. Never shows 'min' at the ceiling.

### CMP-2 — Title screen: "Sound starts after your first click or key press." overlaps the marching grass strip (low contrast)
- Severity: minor · Area: T6 · Found by: t6-compare · Build: snapshot :5220 15:02
- Steps: 1. Open the title screen at 1440×900. 2. Look at the small note under the marching strip.
- Expected: the footer note sits below the strip on the page background, legible (DESIGN §5.4 Title: canvas strip, then small text; text contrast ≥ 4.5:1).
- Actual: `.title-sound-note` has `margin-top: -8px` and the strip (`canvas.title-strip`, 400×32 drawn at 1152×92 CSS) ends at y≈539 while the note starts at y≈531, so its upper half is drawn over the sage-green grass band: lavender text on mid-green, visibly low contrast. Also, the strip is scaled by 2.88 (not an integer), so the marchers' pixels are uneven.
- Evidence: docs/testing/compare/ours/04-title.png (bottom of the strip), docs/testing/compare/04-title-menu-compare.png
- Suspected cause (optional): title CSS in src/styles/ (negative margin on `.title-sound-note`; strip width 100% of a 1152 px column rather than an integer multiple of 400).
- Owner: FX5 · Fix status: VERIFIED · Fixed by: FX5 (src/ui/screens/title.ts, src/ui/screens/march-strip.ts, src/styles/screens.css; check 1042/1042) · Verified by: V3 — Title strip CSS size is an integer multiple of 400x32 (800x64 = x2) at 1440/1280/1024 widths; sound note sits 8px below the strip's bottom edge (no overlap) with computed contrast ~8.3:1 (rgb(176,169,212) on rgb(20,17,42) page bg); under Settings motion='reduce' the strip canvas is bit-identical across 500ms (static), under 'system'/default it animates. Evidence: docs/testing/evidence/V3/title-{1440,1280,1024}.png

### A11Y-4 — Coalesced "saved" batch and the joined "Goal reached" clause disagree in one utterance
- Severity: minor · Area: T3a/TF · Found by: V2 (fix-lead's verifier, noted unfiled) → filed by test-lead · Build: post-FX2 snapshot
- Steps: 1. `__game.loadLevel('spade-expectations')`, Digger on the first walker, `step()` until the level ends. 2. Read `__game.announcerLog()`.
- Expected: one utterance never states two different running totals (DESIGN §7.3 #10 + #11 + throttle rule 1 join): e.g. "2 saved. 5 of 5 home. Goal reached: 5 of 5 home!" (or the batch flushed with the latest count before the goal clause).
- Actual: "1 saved. 4 of 5 home. Goal reached: 5 of 5 home!" — the batch's cumulative lags the goal-reached event by one save that landed before the join.
- Evidence: docs/testing/results/V2-verify.md (A11Y-2 detail).
- Also (same fixer, polish): level-card accessible name after VIS-1 reads "Level 1: Spade Expectations Everyone home. Breezy." — title and state run together; add a separator that keeps axe `label-content-name-mismatch` passing; sync DESIGN §7.2 rows (level card name order, RR "min"/"max" names) with the shipped VIS-1 wording.
- Owner: fx6-fixer · Fix status: VERIFIED (round 2) · Fixed by: fx6-fixer (src/ui/event-announcements.ts, src/ui/strings.ts, tests/ui-event-announcements.test.ts, tests/ui-spec-copy.test.ts, tests/ui-spec-event-announcer.test.ts, docs/design/DESIGN.md; check 1070/1070) · Verified by: v4-verifier — check 1070/1070 green. Code: `batchGeneration` bumped on every `goal-reached`, coalesce key `batch:${generation}`, so a later flush can't replace-in-place the sealed pre-goal batch (announce-queue.ts rule 2); reviewed tests/ui-event-announcements.test.ts — the two "through a REAL AnnounceQueue" tests use an actual `AnnounceQueue` (frozen clock, real push()/due()/merge, not just a fake Speaker) and the round-2 test explicitly extracts every "N of 5 home" via regex and asserts non-decreasing order (`totals=[5,5,7]`). Live browser (snapshot :5247, spade-expectations, Digger assigned via assignSkill, `step()` in many separate real-time-spaced calls to level end): announcerLog() showed "2 saved. 5 of 5 home. Goal reached: 5 of 5 home!" (both 5, consistent) then post-goal saves in their own later utterance ("1 saved. 6 of 5 home.", "3 saved. 9 of 5 home.") — never rewriting the sealed clause. Repeated with rapid back-to-back step() calls (near-zero real-world gap, the harder repro): one utterance actually joined post-goal into the same burst — "Digger assigned... 5 saved. 5 of 5 home. Goal reached: 5 of 5 home! 4 saved. 9 of 5 home." — figures [5,5,9], still non-decreasing, no counter-example found across 2 full-level runs. A11Y-2 regression: batch `{s}` varied (2,3,4,5 saved — not stuck at 1). No `..`/`!.`/`?.` joins in any of 19 logged utterances (scripted regex check). Level-select card name confirmed live: `aria-label="Level 1: Spade Expectations, Everyone home. Breezy."` (exact VIS-1/A11Y-4 wording). 0 console errors/warnings both runs. Residual risk: none found within tested scope; only single-lemming-run levels with one digger were exercised (matches the original repro), not a multi-skill/multi-goal-event level.

### VIS-6 — Level-select cards still mostly empty: the thumbnail is a thin 25 px strip with the level drawn in its left fifth
- Severity: minor (polish, orchestrator-flagged) · Area: T7/T3b · Found by: test-lead (review of docs/screenshots/03-flow.png after VIS-5) · Build: production dist 16:50
- Steps: 1. Level select at 1440×900. 2. Look at any card of a 400–480 px wide level (L1–L8).
- Expected: the card's thumbnail reads as a picture of the level and uses the card's spare middle band (DESIGN §5.4 "a mini minimap … over the theme background colour"; the orchestrator asked to review the tiny-thumbnail/empty-card look).
- Actual: after VIS-5 the strip spans the card width, but it is still only ~25 CSS px tall at a fixed 25/160 world scale, so a 400 px level is a ~62×25 sliver in the strip's left fifth and each 176 px card has a ~90 px empty band between the title and the status row (evidence: docs/screenshots/03-flow.png; the mockup menus.png has the same empty band).
- Suggested fix: make the thumbnail box taller (e.g. ~64–80 CSS px, using the empty band; card height unchanged if possible) and draw the whole level **contain-fitted and centred** in that box over the theme background, pixelated; keep entrance/exit readable; locked cards keep their dimmed look; 1440×900, 1280×720, 1024×768 all fit without overflow.
- Owner: fx7-fixer · Fix status: VERIFIED · Fixed by: fx7-fixer (src/ui/thumbnail.ts, src/ui/screens/level-select.ts, src/styles/levels.css; check 1070/1070) · Verified by: v5-verifier — production build :5181, mixed-progress save (3 levels completed via playSolution, quit-to-levels through the real pause menu). At 1440×900/1280×720/1024×768: thumbnail box is 72 CSS px tall (in the 64–80 target), canvas backing store exactly `round(cssW×dpr)×round(cssH×dpr)` (e.g. 470×144 = 235×72×2) at every size — crisp, not blurry; contain-fit centring confirmed via getImageData on card 1 (55px background margin on both left/right, symmetric); theme background fills the full box; locked cards render at `opacity:0.6` (dashed border); no horizontal scroll at any size; 4-col grid intact. Resized 1024→800→1280 to exercise the ResizeObserver: canvas backing store matched the new CSS size exactly after the round trip (no stale draw). Briefing thumbnail (480×160, scale 1) unchanged and undistorted. Screenshots: docs/testing/evidence/V5/level-select-1440.png, level-select-1024.png, briefing-thumb-1280.png. 0 console errors.

### VIS-7 — Game screen is top-aligned, leaving a large empty band under the toolbar on common desktop sizes
- Severity: minor (polish) · Area: T6/T7 · Found by: t6-compare (gap 3) + test-lead · Build: production dist 16:50
- Steps: 1. Play any level at 1440×900 (×3) or 1920×1080 (×4).
- Expected: DESIGN §5.1 centres the content column horizontally; vertical placement is unspecified — a game screen normally sits centred in spare height.
- Actual: the game block hugs the top; at 1440×900 ≈ 300 CSS px of empty background remain below the toolbar (evidence: docs/screenshots/01-gameplay-crowd.png).
- Suggested fix: centre the game block vertically when the viewport is taller than the block (e.g. `min-height: 100dvh` + `align-content/justify-content: center` or `margin-block: auto` on the game screen wrapper); keep top alignment + page scroll when it doesn't fit (below ×2); overlays/toasts/captions/edge-scroll zones and pointer mapping must still line up.
- Owner: fx7-fixer · Fix status: VERIFIED · Fixed by: fx7-fixer (src/styles/layout.css; check 1070/1070) · Verified by: v5-verifier — production build :5181. Game block (stage + screen-root) vertically centred with symmetric top/bottom gaps whenever it fits: 1920×1080 (measured viewport 987px owing to browser chrome) 91.5/91.5, 1440×900 128/128 (screenshot docs/testing/evidence/V5/game-1440.png), 1280×800 78/78, 1024×768 70/70. At 800×600 (content 660px > viewport 600px) it falls back to top alignment (16px = page padding) with page scroll (`scrollHeight 660 > clientHeight 600`), exactly the documented no-op case. `#stage-overlay`'s rect matched `#game-canvas`'s rect exactly (pixel-for-pixel) at every size, so the pause-pill row, a live caption-strip line ("Off we go!", triggered via the level's real tick-15 `lets-go` event) and the toast/bubble anchors all measured inside the canvas box; edge-scroll zones are computed directly from the canvas's own `getBoundingClientRect()` (src/app/app.ts `toWorld`, src/app/game/camera-control.ts), so they align by construction. Pointer mapping verified exact: dispatched `pointermove` over an isolated mumble at its precise world coords → `ui().hoveredLemmingId` equalled that mumble's id; a real `pointerdown`/`pointerup` pair on `#game-canvas` at 1440×900 assigned Basher to it (state walking→bashing). Title and Settings screens confirmed unaffected (`.app` `justify-content: normal`, content top at 16px, unchanged from before the fix). 0 console errors.
