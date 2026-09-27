RESULT: FAIL (3 issues)

Validator: V3 (independent, sonnet). Scope: `docs/design/parts/interaction-a11y.md`, `docs/design/parts/audio-copy.md`, `docs/design/mockups/audio-lab.html`, checked against `DESIGN_TASKS.md` D1–D10, `RESEARCH.md` §2.2/§2.5/§5/§7/§9, and `src/input/{bindings,actions}.ts`, `src/persistence/schema.ts`, `src/audio/sfx.ts`, `src/core/types.ts`.

No blockers. 2 major issues (both IP/copy reuse of banned original wording in results verdicts) and 1 minor issue (one `SkillRejectReason` lacks live-region feedback, contradicting the section's own blanket rule). Everything else checked — a11y coverage, keyboard map, picking, refusal-reason coverage, announcement catalogue, sound↔visual twins, motion/flash limits, settings table, and the re-measured audio numbers — passes cleanly and matches the reference numbers exactly (re-measured live in the lab, see §9 below).

## Checks table

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | A11y coverage (A1–A16 → testable criteria) | PASS | All 16 rows in `interaction-a11y.md` §6.1 have an observable pass/fail test. |
| 2 | Keyboard (duplicates, Tab reserved, D8 baseline, remap/WCAG 2.1.4, no Ctrl/browser-reserved keys, arrow conflict, keyboard-only completeness) | PASS | No duplicate codes; all 7 sub-checks satisfied. |
| 3 | Picking (priority matches §2.2, hit area ≥24×24 CSS px, walkers-only without holding) | PASS | `pickLemmingAt` steps 1–5 generalize the original busy/fallback rule correctly; hitbox 39×39 CSS px at ×3; "Walkers" filter chip is the no-hold alternative. |
| 4 | Refusal feedback (every `SkillRejectReason` has visual+sound+announcement; refusal not consumed; matches §2.5) | MINOR FAIL | `level-ended` has no sound and is explicitly "(status only)" — no live announcement — contradicting the section's own "every refusal... announcement" rule. All other 7 reasons and the assignability matrix match RESEARCH §2.5. "Never consumed" is stated explicitly. |
| 5 | Announcements (exact templates, politeness+throttle, no flooding, pop-all/results announced) | PASS | 35 rows, all with politeness + throttle key; queue rule caps polite messages at ≤1/1000ms; pop-all arm/confirm (#22, #24) and results (#34, #35) are covered. |
| 6 | Visual twin for every sound | PASS | All 36 `SfxId`s in `audio-copy.md` §1.3 have a row (or a grouped row) in `interaction-a11y.md` §6.6. None missing. |
| 7 | Motion/flash (reduced-motion list, ≤3 flashes/s never full-screen incl. pop-all, relaxed timer, pause anytime) | PASS | §6.4 table is concrete (14 elements); §6.8 states the 3/s cap, no full-screen change including Pop all, and pause always available. |
| 8 | Settings (type/default/range; existing fields mapped; new fields listed) | PASS | All 12 existing `Settings` fields mapped with matching defaults (musicVolume change 0.4→0.35 explicitly called out); 11 NEW fields listed with SAVE_VERSION bump noted (I8). |
| 9 | Audio numbers (peaks ≤−6dBFS; table matches ±1dB; every SfxId has a lab recipe; `(ctx,out,when)=>void` signature; no console errors; no autoplay before gesture) | PASS | Re-ran `measureAll()`/`checkMusic()` live in the lab — see evidence below. All 36/36 pass, numbers match the doc table almost to the decimal, 6/6 music themes parse with 0 errors, no `AudioContext` created before a gesture. |
| 10 | IP and copy (no "Lemm-", no original voice lines, no copied results text, no original level titles, "Pop all" label, "mumbles" name, original music) | MAJOR FAIL | Verdict table reuses two banned original result phrases (see issues #2, #3). Everything else (Lemm-, voice-line captions, nuke label, critter name, level-title guidance, music originality) is clean. |
| 11 | Consistency with locked decisions (tiers, theme ids/hazards, skill names/order, HUD structure) | PASS | Tier names, theme↔hazard↔trap-sound mapping (D4), skill order (D6), and HUD structure (D9: status line not live, toolbar role, two live regions) all match exactly. |

## Evidence for check 9 (live re-measurement)

Opened `docs/design/mockups/audio-lab.html` in an isolated background page and ran, via `evaluate_script`:
```js
const measure = await window.measureAll();
const music = await window.checkMusic();
```
- `measure`: 36/36 rows returned `pass:true` (peak ≤ −6dBFS and short-term loudness inside its tier band for all of `ui-move … level-lost`). Every numeric value (peakDb, rmsDb, stDb, durMs) matched the table in `audio-copy.md` §1.3 exactly or within 0.1 dB (e.g. `ui-move` −13.2/−25.4/−27.0 vs doc's −13.2/−25.4/−27.0; `drown` −6.5/−20.5/−19.4 vs doc's −6.5/−20.5/−19.4).
- `checkMusic`: all 6 themes (`title, mossgrove, sugarworks, observatory, foundry, reef`) parsed with `errors: []`; peak/RMS matched §1.6's table exactly (e.g. `reef` −7.2/−24.5 vs doc's −7.2/−24.5).
- `window.__lab.SFX` has exactly 36 keys, one per `SfxId` in `audio-copy.md`'s catalogue (19 ids already in `src/audio/sfx.ts` `SFX_IDS` + the 17 NEW ids the doc calls out) — none missing.
- All recipes are declared `function (ctx, out, when[, pitch])`, compatible with `SfxRecipe = (ctx, out, when, pitch) => void` from `src/audio/sfx.ts` (voice chirps and `builder-low` use the 4th arg; the rest ignore it, as the doc states).
- `live` (the lazily-created `AudioContext` wrapper) was `null` after page load and after running `measureAll`/`checkMusic` (both use `OfflineAudioContext`, which needs no gesture) — confirms nothing auto-plays before a user gesture.
- `list_console_messages` showed exactly one message, both before and after running the two functions: `Unsafe attempt to load URL file://…audio-lab.html from frame with URL file://…audio-lab.html. 'file:' URLs are treated as unique security origins.` This is a browser/tooling artifact from opening a `file://` page in the devtools harness (the page's own source has no `<iframe>`, `window.open`, or self-navigation of any kind — confirmed by reading the full 754-line file) and is not attributable to the audio-lab script or the design's recipes. No error was produced by `measureAll()` or `checkMusic()` themselves.

## Issues

1. **[minor]** `docs/design/parts/interaction-a11y.md` §5 ("Invalid-assignment feedback"), table row `level-ended`.
   **Problem:** The section opens with "Every refusal shows: a ✕ badge… the status text… and the announcement (same words, polite, key `refusal`)" — implying all `SkillRejectReason`s get a live announcement. But the `level-ended` row gives `Sound: none` and `Status / announcement text: "The level is over" (status only)`, i.e. no sound and no live-region announcement. This is the one `SkillRejectReason` (of the 8 in `src/core/types.ts`) that does not get full visual+sound+announcement feedback, contradicting the section's own blanket rule.
   **Fix:** Either (a) give `level-ended` a low-priority `ui-deny` sound and a throttled/coalesced polite announcement (key `refusal`, so it doesn't stack with the level-end message #34), or (b) keep it status-only but add one sentence to §5's intro explicitly carving out this exception and explaining why (e.g., "except `level-ended`, whose outcome was already announced via message #34 — further input after the level ends is shown as status text only, to avoid re-announcing a stale result").

2. **[major]** `docs/design/parts/audio-copy.md` §2.5, results-verdict table, row 7 ("way above"), Variant B.
   **Problem:** Text is `"What a crowd at the exit. Superb work!"`. `RESEARCH.md` §9 do-not-copy item 6 bans reusing the original's screen texts, and its own reference-screenshot notes (§8, `05-results.png`) record the original's 100%-completion verdict opening with **"Superb!"** — the design constraint D10 says "Nothing copied from the original... texts." Using "Superb" here reuses that exact banned word.
   **Fix:** Replace with a phrase that avoids "Superb", e.g. `"What a crowd at the exit. Marvellous work!"` or `"What a crowd at the exit — nicely marched!"`.

3. **[major]** `docs/design/parts/audio-copy.md` §2.5, results-verdict table, row 6 ("exactly"), Variant A.
   **Problem:** Text is `"Right on the line. Every mumble counted!"`, opening with the exact banned phrase **"RIGHT ON"** (the original's verdict for meeting the save target exactly). Same D10/§9 violation as issue #2.
   **Fix:** Reword to drop the phrase, e.g. `"Landed exactly on target. Every mumble counted!"` or `"Bang on the number. Every mumble counted!"`.

## Resolution (W2)
- `parts/audio-copy.md` §2.5 row 6, variant A → "Bang on the number. Every mumble counted!" (was "Right on the line…").
- `parts/audio-copy.md` §2.5 row 7, variant B → "What a crowd at the exit. Nicely marched!" (was "…Superb work!").
- `parts/audio-copy.md` §2.1 rule 1: removed the quoted "ROCK BOTTOM" example. A scan of all W2 files (both parts and `audio-lab.html`) for Superb / Rock bottom / stormed / So near / Right on / Let's go / Oh no / Yippee now finds nothing. The only remaining hits are the sound id `lets-go`, a code identifier.
- `parts/interaction-a11y.md` §5 intro: added the exception. `level-ended` refusals are status-only (no sound, no announcement) because the result was already announced assertively (§6.3 #34).
