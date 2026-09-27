RESULT: FAIL (2 issues)

# Design review (V6, final) — `docs/design/DESIGN.md` + deliverables

Independent final-phase review. Scope: `DESIGN.md` (1328 lines) against the design brief, cross-checked
for internal consistency against `DESIGN-APPENDIX.md`, `docs/design/mockups/{mockup.css,sprites.js,
levels-data.js}`, `src/core/types.ts`, `src/persistence/schema.ts`, `src/input/{actions,bindings}.ts`,
`src/render/camera.ts`, `docs/architecture/ARCHITECTURE.md`, and the six earlier `validation/*.md`
reports. Method: full read of `DESIGN.md` and `DESIGN-APPENDIX.md`; Node scripts (in the session
scratchpad, not committed) for §-reference/link resolution, `levels-data.js` vs §10 diffing (via
`vm.runInNewContext`), and WCAG 2.2 relative-luminance recomputation of every contrast ratio in §5.2,
§4.9 and App. D (100 theme pairs + 30 token pairs + 6 overlay pairs); visual read of `game-screen.png`
and `menus.png`. No files under review were edited.

**Overall: this is an unusually rigorous document.** Every one of the ~130 contrast ratios claimed in
the text was recomputed independently and matched the stated value exactly (diff 0.00 in all but a
handful, which were within 0.01–0.05, all inside the ±0.1 tolerance). The §10 level table matches
`levels-data.js` field-for-field across all 12 rows. All 54 distinct `§x.y` cross-references and all
file links resolve. Key bindings have zero duplicates and match the D8 baseline exactly. The only
finding that outweighs this is one internal contradiction on a specific pixel value (Issue 1) and one
stale dev-note (Issue 2) — both narrow and fixable in a few lines.

---

## A. Coverage table (brief items 1–9)

| # | Brief item | Section id(s) | Status |
|---|---|---|---|
| 1 | Design pillars + keep/change list | §1, §1.1 | ✓ |
| 2 | Art direction: resolution/scaling, pixel-art rules, critter design, sprite specs per state, ASCII walk cycle | §2.1, §2.2, §3.1–§3.5 | ✓ |
| 3 | Terrain themes (4–5 novel, palette/texture/steel/hazard/hatch-exit/background) | §4.1–§4.8 (5 themes: mossgrove/sugarworks/observatory/foundry/reef) | ✓ |
| 4 | UI design: wireframe+measurements, tokens+WCAG ratios, fonts, button states, screens | §5.1–§5.4 | ✓ |
| 5 | Interaction design: control map, keyboard-only, pause-assign, ff, hold-repeat, nuke confirm, restart, camera, hover/status, priority, filters, invalid feedback | §6.1–§6.5 | ✓ |
| 6 | Accessibility: A1–A16 mapping, focus order, ARIA, live-region catalogue, reduced motion, colour-blind, visual-for-sound, captions, ≥24px, no time pressure, pause anytime, flash <3/s | §7.1–§7.11 | ✓ |
| 7 | Audio design: event→recipe catalogue, no voice samples, mixing, music concept, mute/volume, gesture-gated | §8.1–§8.6 | ✓ |
| 8 | Copywriting voice: tone, samples, level-title style | §9.1–§9.6 | ✓ |
| 9 | Notes for architecture/dev | §11 (detail in App. E) | ✓ |

All 9 required items present with correct section ids. Reference data correctly deferred to
`DESIGN-APPENDIX.md` (App. A–E) and `mockups/*` per §0's "how to use this document" table.

---

## B. Internal consistency

Checked and **PASS** (no contradiction found):
- HUD sizes: skill button 80px (`--skill-w`), controls 72/72/92 (`--control-w` + `.hud-button--pop`),
  ☰ 48 (`.hud-button--menu`), minimap 1 CSS px = 5 world px (1600/5=320, 640/5=128, both cited
  correctly), minimap well 332×44 (`.minimap-well`) — all match `mockup.css` exactly.
- Status-line width arithmetic: canvas 1200 − minimap well 332 − gap 8 = 860, matching §5.1's stated
  "flex 1 → 860 px" (an earlier `validation/ui-contrast.md` measured 780/412 for this pair — that
  report predates a `mockup.css` edit made 11 minutes later per file mtimes; the current CSS/DESIGN.md
  values agree with each other, so this is stale historical data in an old report, not a live bug).
- Critter name "mumbles" used consistently; every "Lemm-" hit in `DESIGN.md` is either a permitted code
  identifier (`LemmingState`, `cycleLemming`, `pickLemmingAt`) or a dev-note describing what to *remove*
  from the old scaffold (App. E N2/N4) — no user-facing "Lemm-" string exists.
- Tier names (Breezy/Knotty/Gnarly/Stampede) and theme ids (mossgrove/sugarworks/observatory/foundry/
  reef): consistent spelling everywhere they appear (checked every occurrence).
- Key bindings: §6.1.1 vs `src/input/bindings.ts` (`DEFAULT_BINDINGS`) match exactly for all 19 existing
  actions; the 7 NEW keys (`C L V U B Home End`) are confirmed unused in the current table, matching the
  §6.1.2 audit's claim. §7.10 help text and §5's toolbar description use the same key set.
- 18 sprite states: `src/core/types.ts` `LEMMING_STATES` (18, including `jumping`) matches `sprites.js`
  `ART.sprites` (18 keys, same order) and DESIGN §3.4's table (18 rows) exactly. (This was originally a
  blocker in `validation/visual.md` — `jumping` was missing — and was fixed; see §E below.)
- §10 level table vs `mockups/levels-data.js`: **all 12 rows match exactly** on id, title, tier, theme,
  skills, save/total, width and time (verified programmatically).
- §7.11 settings vs `src/persistence/schema.ts`: all 12 existing fields present with matching types;
  `musicVolume` default 0.4→0.35 is correctly flagged as a change (S5); the 11 NEW fields are correctly
  marked NEW (not yet in the scaffold — expected, since I8 lists them as work still to do).
- Every `§x.y` reference resolves to a real heading (54 distinct refs checked; the one apparent miss,
  `§2.9`, is an explicit `RESEARCH §2.9` cross-doc reference and resolves there). Every relative link in
  `DESIGN.md` and `DESIGN-APPENDIX.md` resolves on disk, except `validation/design-review.md` itself
  (this file, correctly not yet existing before this review ran).

Found and **FAILED** (see numbered issues below):
- **Issue 1 (major):** the status-line font size is given as **18 px** in §5.1 (wireframe) and §5.3
  ("Status line (sunken well, 18 px mono...)"), matching the actual `mockup.css` `.status` rule
  (`font: 600 1.125rem`, i.e. 18px) — but §5.2's "Minimums" bullet states **"The status line is 20 px
  mono."** Three-to-one, and the implementation, say 18; one line in §5.2 says 20.
- **Issue 2 (minor):** `DESIGN-APPENDIX.md` App. E.1, rows N1 and N3, describe the scaffold's "Current"
  state as `VIEW_WIDTH = 320` and `STORAGE_KEY = 'lemmings.save'`. Both are already the "needs" value in
  the actual scaffold (`src/render/camera.ts` has `VIEW_WIDTH = 400`; `src/persistence/schema.ts` has
  `STORAGE_KEY = 'mumblemarch.save'`; `docs/architecture/ARCHITECTURE.md` already documents 400×160 and
  cites "DESIGN D2"). These two dev-handoff rows are stale — harmless (a developer would just find the
  work already done) but factually wrong as written, and §11's numbered "must-do" list still cites N1/V10
  as outstanding without noting this.

---

## C. Contrast recomputation (WCAG 2.2 relative luminance)

**§5.2 design tokens vs `mockup.css` `:root`:** all 30 stated ratios recomputed from the exact hex values
in `mockup.css`. **30/30 match within ±0.1** (most within ±0.05; several exact to 2 decimals):

| Token pair | Stated | Computed |
|---|---:|---:|
| text vs bg / surface / raised / sunken | 16.8 / 15.0 / 12.6 / 17.9 | 16.81 / 14.99 / 12.60 / 17.90 |
| text-faint vs hover / raised / surface / sunken | 5.0 / 6.2 / 7.4 / 8.8 | 4.97 / 6.21 / 7.39 / 8.82 |
| border vs bg / surface / raised | 4.3 / 3.8 / 3.2 | 4.31 / 3.84 / 3.23 |
| focus vs bg / surface / raised | 12.3 / 11.0 / 9.3 | 12.34 / 11.00 / 9.25 |
| accent-contrast vs accent | 11.0 | 10.97 |
| *(+22 more pairs, all within tolerance — see script output; all text ≥ 4.5:1 on its background, all non-text (borders/focus ring) ≥ 3:1)* | | |

This independently reproduces `validation/ui-contrast.md`'s own 31/31 verification (that report's one
FAIL, text-faint on hover at 4.27:1, was fixed to `#b0a9d4` and now recomputes to 4.97:1, matching both
the current `mockup.css` and DESIGN §5.2).

**§4.9 high-contrast view vs black:** all 11 stated ratios (earth 8.03, steel 6.86/5.45 hatch, one-way
7.81, water 10.71, fire 8.04, trap 14.67, exit 15.70, mumble outline-vs-HC-earth 6.44, body-vs-black
9.08) recomputed **exact matches**.

**§4.10 "overlays on plum" ratios:** all 6 (white 16.85, cream pips 15.09, amber pips 7.15, tuft 10.97,
refusal red 4.41, used pips 3.63) recomputed **exact matches**.

**App. D full theme table, spot-check (task asked for 5; all 100 were checked given the low marginal
cost of the script):** every one of the 20 pairs × 5 themes recomputed from `sprites.js` hex values
**matches to 0.00 diff**. Worst pair overall: foundry steel seam vs background, 3.04:1 — still ≥ 3:1 for
a non-text element. No pair is below the WCAG non-text floor; no text pair is below 4.5:1.

**Conclusion: every contrast claim in the document is numerically correct.**

---

## D. Mockups

| File | Size | Status |
|---|---:|---|
| `sprites-themes.png` | 1.70 MB | present, ≫ 50 KB |
| `game-screen.png` | 427 KB | present, ≫ 50 KB |
| `menus.png` | 1.49 MB | present, ≫ 50 KB |
| `audio-lab.png` | 1.44 MB | present, ≫ 50 KB |
| `levels-preview.png` | 1.57 MB | present, ≫ 50 KB |

All 5 PNGs listed in §12 exist and are far above the 50 KB non-trivial threshold.

`game-screen.png`: matches §5 — paused plate ("⏸ Paused — you can still assign skills"), refusal toast
("✕ Can't dig: steel below"), bark caption strip (bottom-left, 2 lines), status line (Pick:All / Follow
/ Walker ×3 / Out 12 / Saved 3 with 8-segment meter / need 8 / Time 4:12), minimap well, toolbar (RR
group with 1.6s sub-label matching the `((99−50)>>1)+4)/17` formula in §6.4.4, 8 skill buttons with key
hints/counts/icons, Pause/Fast/Pop all, ☰), and the HUD button-state gallery (default/hover/
focus-visible/pressed/selected/selected+focus/0-left/selected+0-left+refused, plus Pop-all armed) — all
match §5.3's state table. Critters are coral/orange round beans with yellow tufts; no green hair, no
blue robe, no paw prints, no mushroom cloud (Pop-all icon is a radial starburst).

`menus.png`: matches §5.4 — title (logo, tagline, Continue/Levels/How to play/Settings, marching
footer, gesture note), level select (4 tiers with correct names/blurbs/pip marks, locked/completed/
new/"up next" states), briefing (Level 4 · Breezy · "The Punch Line", facts row Mumbles 12/Save
6(50%)/Release rate 50/Time 5:00/Tier Breezy — matches §10's row 4 exactly: Basher 5, 6/12, 5:00),
pause dialog, and results (Level complete!, "You saved 14 of 20", meter with notch at "needed 10", New
best badge, verdict text, Beat the clock ✓). All match §5.4's screen table.

`validation/screenshots.md`: **RESULT: PASS** (5/5 pages captured, 0 console errors, 36/36 audio
measurements pass, 12/12 levels pass `runChecks()`).

---

## E. Validation trail

| Report | Initial result | Resolution present? | Unresolved blocker/major? |
|---|---|---|---|
| `ui-contrast.md` | FAIL (1: text-faint 4.27:1 on hover) | Yes — fixed to `#b0a9d4` (4.97:1), re-verified here | None |
| `visual.md` | FAIL (2: 1 blocker — no `jumping` sprite; 1 minor — devtools console artifact) | Yes (W1) — `jumping` added to `sprites.js`/table, confirmed 18/18 states here; minor explicitly dispositioned as a tooling artifact, not a bug | None |
| `spec.md` | FAIL (3: 2 major IP/copy reuse — "Superb", "Right on"; 1 minor — `level-ended` refusal has no announcement) | Yes (W2) — both banned phrases replaced (confirmed absent from `DESIGN.md` by grep) and the exception sentence added to §6.5 (confirmed present) | None |
| `levels-1-6.md` | PASS (3 minor) | Yes (W3) | None (already PASS) |
| `levels-7-12.md` | PASS (2 major: miner-window arithmetic errors, L7/L12) | Yes (W3) — windows re-derived, L7 time limit raised 240→300s | None |
| `levels-recheck.md` | PASS (1 minor: L7 window left-edge rationale) | N/A — final recheck; confirms "RESULT: ALL MATCH" | None |
| `screenshots.md` | PASS | N/A | None |

No unresolved blocker or major issues remain anywhere in the validation trail. `DESIGN.md`'s own §12
summary table accurately reflects every one of these reports' initial result and fix status.

---

## F. IP check

- No banned original strings found anywhere in `DESIGN.md`, `DESIGN-APPENDIX.md`, `LEVELS.md`, or
  `mockups/*.{js,html}`: checked "Just dig!", "Superb", "Rock bottom", "Oh no,"/"Let's go,"/"Yippee" as
  shipped lines, "Right on", "stormed that level" — zero hits (the two that were originally present,
  "Superb" and "Right on the line", were caught by `spec.md` and fixed; confirmed gone).
- No paw-print or mushroom-cloud icon references anywhere; `visual.md` independently confirmed the
  Pause icon is two bars and Pop-all is a starburst, matching what's visible in `game-screen.png`.
- No green-hair/blue-robe critter: §3.1 explicitly states "no green anywhere on the mumble and no blue
  robe"; confirmed in the palette (9 body/face keys, none green or blue) and visually in the screenshots.
  The only place "green-hair/blue-robe" appears in the docs is App. E (N2, N4), describing what to
  *remove* from the old scaffold — correctly framed as a change, not a keep.
- No "Lemm-" in user-facing text (see Consistency §B above); all hits are permitted code identifiers or
  dev-note descriptions of what to rename/remove.

**IP check: clean.**

---

## G. Length recommendation

`DESIGN.md` is 1328 lines against a ≈400–900 target; `DESIGN-APPENDIX.md` adds 225. Given the actual
required surface area — 18 fully-specified sprite states with frame/timing data, 5 complete themes
(palette + procedural recipe + steel + hazard + traps + hatch/exit for each), a full control map, a
16-item accessibility matrix with acceptance criteria, a 35-row live-region catalogue, a 30-recipe sound
catalogue, and a 12-level summary — the ≈900-line upper bound looks unrealistic for lossless coverage of
brief items 1–9. The author has already used the appendix pattern well (App. A–E already hold ~700
lines of reference data that would otherwise be in the main body). That said, more can move:

| Candidate section | Lines | Recommendation | Est. lines saved |
|---|---:|---|---:|
| §7.3 live-region catalogue (full 35-row table + 5 throttle rules) | 843–889 (46) | Keep the 5 throttle rules and ~6 representative rows (skill choice, refusal, pop-all arm/confirm, level-ended) in `DESIGN.md`; move the full 35-row table to a new App. F, cross-referenced. | ~30 |
| §8.3 sound-event catalogue (30-row table with Recipe/G/Dur/Peak/RMS/Loud columns) | 1033–1077 (44) | Keep SfxId/Trigger/Recipe columns in `DESIGN.md` (needed for the "event→recipe" brief item); move the numeric G/Dur/Peak/RMS/Loud measurement columns to a new App. G (they're verification data, already re-derivable from `audio-lab.html`'s `measureAll()`, same pattern already used for App. D's contrast numbers). | ~20 |
| §9.3–§9.4 sample-strings/captions tables | 1159–1183 (24) | These substantially duplicate App. A (already the canonical `ui/strings.ts`-ready table). Trim to 4–5 representative examples per row-type and point to App. A for the rest. | ~15 |
| §4.2 per-theme texture parameters sub-table | 269–276 (8) | Minor: could fold into the App. D-style reference pattern, but it's small; low priority. | ~5 |

**Total realistic saving: ~65–70 lines** (to ≈1260), which does not by itself reach the 900-line target.
**Recommendation: the length is largely justified by content density, not padding** — every section that
was checked for correctness in this review (contrast math, level data, key bindings, sprite states) was
internally consistent and directly traceable to a brief requirement or a data file, i.e. there's very
little redundant prose to cut without literally dropping a rule (which this review was told not to
recommend). The ≈400–900-line target in the brief should be treated as aspirational for a document
covering this much required, cross-validated, per-state/per-theme detail; a more realistic target for a
document of this scope, after the App. F/G moves above, is **≈1150–1250 lines** in `DESIGN.md` proper.

---

## Numbered issue list

1. **[MAJOR] Status-line font size contradiction.** `docs/design/DESIGN.md:489` ("**Minimums:** no
   running text below 14 px. The status line is 20 px mono. Skill names are 14 px/600. Counts are 20 px
   mono/700.") states the status line is 20 px mono. This contradicts `docs/design/DESIGN.md:421`
   (wireframe: "status line (sunken well, **18 px mono**...)"), `docs/design/DESIGN.md:541` ("**Status
   line** (sunken well, **18 px mono**...)"), and the actual implementation in
   `docs/design/mockups/mockup.css:183` (`.status { font: 600 1.125rem / 1 var(--font-mono); ... }` —
   1.125rem = 18px at the default 16px root).
   **Fix:** change line 489 to read "The status line is 18 px mono." (Leave "Counts are 20 px mono/700"
   as-is — that one correctly matches `.skill__count`'s `var(--text-lg)` = 20px in `mockup.css:254`, a
   different element.)

2. **[MINOR] Stale "Current" values in the dev change list.** `docs/design/DESIGN-APPENDIX.md` App. E.1,
   row **N1** (`src/render/camera.ts VIEW_WIDTH`) lists "Current: 320", and row **N3**
   (`persistence/schema.ts STORAGE_KEY`) lists "Current: `lemming.save`". Both are already the "needs"
   value in the current scaffold: `src/render/camera.ts:6` has `export const VIEW_WIDTH = 400;`, and
   `src/persistence/schema.ts:8` has `export const STORAGE_KEY = 'mumblemarch.save';`. Additionally,
   `docs/architecture/ARCHITECTURE.md:11,29,334` already documents the 400×160 view and explicitly cites
   "DESIGN D2" as its source, so architecture is not stale here — only the two App. E "Current" cells
   (and, by extension, `DESIGN.md §11`'s "must-do" item 1, which still lists N1/V10 as outstanding) are.
   **Fix:** update the "Current" column in App. E N1 and N3 to reflect the scaffold's actual state (or
   mark both rows "Resolved already" alongside V9/L1 in §11), so a developer picking up the list doesn't
   spend time re-verifying work that's already done.

No blocker-level issues were found.

## Resolution (design lead, 2026-09-26)
1. **MAJOR fixed:** the status line is now "18 px mono" in DESIGN.md §5.2 (source `parts/ui.md`); §5.1, §5.3 and `mockup.css` already said 18 px. The count badges stay at 20 px (a different element).
2. **MINOR fixed:** the App. E and §11 digest rows N1/N3 (and most of N2) are marked done by the architecture phase (`VIEW_WIDTH` 400, `STORAGE_KEY` `mumblemarch.save`, title/description/`GAME_TITLE`). Still open: the `package.json` name, the favicon art and the `SPRITE_COLORS` comment.
3. **Length:** kept at ≈1330 lines + a 220-line appendix, on purpose. The three suggested moves (§7.3 announcement templates, §8.3 recipe/measurement table, §9.3–9.4 sample strings) are all content the brief requires *in the rulebook* ("exact message templates", "catalogue … → synthesized recipe", "sample strings"). Moving them would save about 65 lines but split required rules from their context. Pure reference data (strings code, key frames, note data, the full contrast table, the full change list) is already in DESIGN-APPENDIX.md.
