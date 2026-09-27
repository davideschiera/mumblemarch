# Design phase: task checklist

Owner: design-lead. **Resuming?** Continue from the first unchecked item. Workers write into
`docs/design/parts/` (drafts) and `docs/design/mockups/`; the lead merges the drafts into
`docs/design/DESIGN.md` and owns `LEVELS.md` sign-off.

## Setup
- [x] S1 Read PLAN.md, PROGRESS.md, research/RESEARCH.md (+ notes), all 6 reference PNGs
- [x] S2 Read architecture scaffold (`src/core/{types,constants,picking}.ts`, `src/levels/{format,themes,stamps}.ts`, `src/input/bindings.ts`, `src/ui/**`, `src/audio/**`, `src/styles/*.css`, `src/persistence/schema.ts`). No `ARCHITECTURE.md` yet.
- [x] S3 Tools verified: Read (PNG), Write, chrome-devtools `new_page` / `evaluate_script` / `close_page` on a `file://` page
- [x] S4 Scope confirmed: write only under `docs/design/` (+ PROGRESS.md lines, and the Design row in PLAN.md at the end)
- [x] S5 Locked decisions written (below)

## Work (parallel)
- [x] W1 Visual worker → `parts/visual.md`, `mockups/sprites.js`, `mockups/sprites-themes.html` + `.png`
- [x] W2 Interaction/a11y/audio/copy worker → `parts/interaction-a11y.md`, `parts/audio-copy.md`, `mockups/audio-lab.html` + `.png`
- [x] W3 Level worker → `LEVELS.md`, `mockups/levels-data.js`, `mockups/levels-preview.html` + `.png`
- [x] L1 Lead: UI design (layout, tokens with verified contrast, button states, screens) → `parts/ui.md` (+ `parts/pillars.md`, `mockups/mockup.css`)
- [x] L2 Lead: `mockups/game-screen.html` + `.png` (fake playfield + real HUD styling; uses sprites.js art + recipes)
- [x] L3 Lead: `mockups/menus.html` + `.png` (title, level select, briefing, results, pause; textured level renders from levels-data.js)

## Validation (independent agents; added 08:35 per the user's orchestration guidelines in PLAN.md)
Rule: the author never signs off on its own work. Validators write reports to `docs/design/validation/`;
flagged items go back to the original worker (SendMessage) or to the lead for lead-authored parts.
- [x] V0 UI tokens + mockup geometry (lead's work) → haiku validator → `validation/ui-contrast.md` (1 FAIL: faint text on hover 4.27 → fixed to #b0a9d4, 4.97)
- [x] V1 Levels (LEVELS.md + levels-data.js + preview sim) → 2 sonnet validators (split for token budget) → `validation/levels-1-6.md` (PASS, 3 minor), `validation/levels-7-12.md` (PASS, 2 major: documented miner windows L7/L12 wrong) → fixes sent to W3
- [x] V2 Sprites/themes data + theme contrast (sprites.js, visual.md) → sonnet validator → `validation/visual.md` (1 blocker: missing `jumping` state → sent to W1; 100/100 contrast values confirmed)
- [x] V3 Interaction/a11y/audio/copy spec (+ audio-lab re-measure) → sonnet validator → `validation/spec.md` (0 blocker, 2 major copy/IP, 1 minor → sent to W2)
- [x] V4 Fixes applied by original authors; re-validate flagged items — W1 (jumping), W2 (copy), W3 (sim + windows) fixed; `validation/levels-recheck.md` PASS (1 minor: L7 window rationale → W3)
- [x] V5 Final screenshots of all mockups + console-error check → haiku runner (`validation/screenshots.md` PASS: 5/5, 0 console errors, runChecks 12/12, measureAll 36)
- [x] V6 Final independent review of DESIGN.md (consistency, deliverables checklist, contrast claims) → sonnet validator → `validation/design-review.md` (2 issues: status-line size mismatch + stale N1/N3 rows → fixed by lead; length justified)

Model policy: workers W1–W3 were launched on the default model before the guidelines (kept running);
new agents: validators = sonnet (reasoning checks) / haiku (tool runs: contrast script, screenshots).

## Consolidation
- [x] C1 Review worker output for consistency with the locked decisions and the research mechanics
- [x] C2 Write `DESIGN.md` (pillars, keep/change, art, themes, UI, interaction, a11y, audio, copy, notes for architecture/dev) — merged via scratchpad/merge_design.py; bulky reference data split to `DESIGN-APPENDIX.md`
- [x] C3 Cross-check LEVELS.md solutions against mechanics numbers; spot-fix (done by independent validators V1a/V1b/V4)
- [x] C4 Final pass: files listed, line counts, screenshots exist; PROGRESS.md appended; PLAN.md Design row → DONE (links + § refs verified; `parts/` marked as superseded drafts)

---

## Locked decisions (all workers MUST follow; propose changes to the lead, don't diverge)

**D1 Names.** Game: **Mumblemarch**. Critters: **mumbles** (one *mumble*; UI copy "mumbles", capitalised
only at sentence start). Code identifiers may stay `lemming*` (architecture), but **no user-facing
string, `<title>`, icon or metadata may contain "Lemm-"**.

**D2 Resolution.** Playfield view = **400×160 world px** (matches `VIEW_WIDTH/VIEW_HEIGHT` in
`src/render/camera.ts`). Level height is **always 160**; level width 400–1600, a multiple of 8.
Default CSS scale **×3 → canvas 1200×480 CSS px**; integer scales only (×2 minimum, ×4 on big
screens). HUD is DOM (real `<button>`s) under the canvas, same width as the canvas.

**D3 Critter ("mumble").** Round bean body, no robe; **sunflower-yellow sprout tuft** (not hair),
warm **coral/apricot body**, **cream face/belly**, **dark plum 1 px outline**, white eye pixel + dark
pupil showing the facing direction. Walk frame ≤ 8 px wide × 10 px tall (tuft included). Foot anchor =
the floor pixel directly under the sprite's bottom-centre (original convention, `core/types.ts`).
Avoid the original's green-hair + blue-robe pairing entirely.

**D4 Themes (ids are fixed; `ThemeId` keys).**
| id | Name | Liquid/fire hazard (format `kind`) | Trap (`kind: 'trap'`) |
|---|---|---|---|
| `mossgrove` | Mossgrove | bog pool (`water`) | snapjaw flytrap |
| `sugarworks` | Sugarworks | bubbling hot caramel (`fire`) | cookie-cutter press |
| `observatory` | Starfrost Observatory | icy meltwater (`water`) | swinging pendulum (brass) |
| `foundry` | Cogwork Foundry | molten brass (`fire`) | piston hammer |
| `reef` | Tidepool Reef | foamy tide pool (`water`) | snapping giant clam |
The scaffold's `meadow` theme is a placeholder to be replaced.

**D5 Tiers** (`TierId` 1–4): **1 Breezy · 2 Knotty · 3 Gnarly · 4 Stampede**.

**D6 Skills.** Keep the generic names and order: Climber, Floater, Bomber, Blocker, Builder, Basher,
Miner, Digger (keys 1–8). Our own props/icons: suction-cup hands (climber), dandelion-puff glider
(floater), fuse sparking from the tuft + big countdown digits (bomber), round "STOP" paddle
(blocker), planks with brick pips (builder), mitts (basher), pick (miner), spade (digger).
The "nuke" action is labelled **"Pop all"** in the UI (action id stays `nuke`), icon is NOT a
mushroom cloud. Pause icon is NOT paw prints.

**D7 Mechanics contract** (from RESEARCH §2; levels are designed against these):
17 ticks/s · walk 1 px/tick · step-up ≤ 6 px (≥ 7 px = wall) · step-down ≤ 3 px · fall 3 px/tick ·
**walk-off drop ≤ 63 px safe, ≥ 64 px splats** (from a hatch spawn ≈ 59 px) · floater opens after ≈ 19 px,
then 2 px/tick · climber 0.5 px/tick, falls off under an overhang · builder 12 bricks of 6×1 px,
+2 px across / +1 px up per brick (stair 28 px long × 12 px high, 192 ticks ≈ 11.3 s) · basher 16×10
mask, 5 px per 16 ticks · miner +4 across/+2 down per 24 ticks · digger 9 px wide, 1 px per 8 ticks ·
bomber 79-tick countdown (digits 5→1) + 16-tick "uh-oh", crater 16 w × 22 h ellipse at x−8..x+7,
y−14..y+7, never hurts other mumbles, never removes steel · blocker field 12×12 px (turns others 1–8 px
from its x) · release interval `(99 − RR) div 2 + 4` ticks · spawn = faller facing right · hatch opens
tick 35, first spawn tick 54 · max 80 mumbles/level.
**Our fixes:** both side edges are walls; steel tested per pixel and never removed; dying/exiting
mumbles accept no skills; **assigning while paused is allowed**; a refused assignment never consumes a skill.

**D8 Controls baseline** (from `src/input/bindings.ts`; extend, don't break): 1–8 skills · Q/E prev/next
skill · Z/X and [ / ] prev/next mumble · Space/Enter assign · W/A/S/D keyboard cursor · ←/→ scroll ·
−/+ release rate · P pause · F fast-forward · N pop-all (press twice) · R restart · H/F1 help ·
Esc pause menu. **Tab/Shift+Tab are reserved for focus navigation** (never game actions).

**D9 HUD structure** (from `src/ui/hud/*`): status line (text, not a live region) + `role="toolbar"`
skill bar of real `<button>`s with `aria-pressed` + minimap `<canvas>`. Two live regions exist:
`#announcer-polite`, `#announcer-assertive`, written only via `Announcer.say()`.

**D10 Voice & IP.** Playful, warm, never mocking the player; wordless synthesized chirps (no voice
samples); captions in our own words. Nothing copied from the original (levels, titles, texts, sprites,
tunes, sounds). Reference PNGs are never shipped.
