# Phase 4 — Development tasks (resume point)

Lead: **dev-lead**. Contracts & file ownership: [`CONTRACTS.md`](CONTRACTS.md).
Statuses: `TODO` → `IN-PROGRESS` → `IMPL-DONE` → `VALIDATED` (or `FIX-NEEDED` after a failed
validation). Every task is implemented by one agent and validated by a **different** agent.
Sub-coordinators add their own sub-task rows inside their workstream section.
**Resuming:** read this file + the tail of `docs/PROGRESS.md`, check the code on disk, and
continue from the first task that is not `VALIDATED`. Never redo VALIDATED tasks.

## Setup (Step 0) — DONE 2026-09-26
- Toolchain: `npm install` OK; `npm run check` green on the scaffold (40 pass / 16 todo).
- Browser: chrome-devtools `new_page`/`evaluate_script`/`list_console_messages`/`close_page` OK,
  scaffold loads with zero console errors. Dev server :5180 started by dev-lead.
- Nesting: lead → sub-agent → sub-sub-agent verified (haiku probe).

## Plan
1. **Step 1 — Contracts** (serial). Then shared files are FROZEN (lead-only).
2. **Step 2 — Parallel workstreams** A core · B levels · C render · D audio · E ui/input/app.
   B's replay tests wait for A.
3. **Step 3 — Integration + independent validation** (E owns `app/`, so wiring happens inside
   E against the Step-1 APIs; Step 3 is the cross-workstream validation round + fixes).
4. **Step 4 — Final smoke** (independent agent): all 12 solutions in the real page via
   `__game.playSolution`, keyboard-only level 1, zero console errors, screenshots in
   `docs/development/smoke/`. Then PLAN.md Development row → DONE.

## Step 1 — Contracts

| Id | Task | Owner | Model | Files | Depends | Acceptance | Status |
|---|---|---|---|---|---|---|---|
| S1 | Apply CONTRACTS.md §2–§10 (types, constants, context, session/picking signatures, themes + art port, format, sfx ids, audio/render/music API stubs, schema v2, actions/bindings, snapshot + port-art scripts, arch guard `art` layer) | contracts-impl | sonnet | see CONTRACTS.md | — | `npm run check` + `npm run build` green; every signature in CONTRACTS.md exists; generated art/theme data deep-equals sprites.js | VALIDATED |
| S1-V | Validate S1 against CONTRACTS.md | contracts-validator | sonnet | read-only (+ `tests/contracts.test.ts`) | S1 | report pass/fail with evidence | VALIDATED (FIX-NEEDED → resolved by dev-lead: tests/tsconfig.json gains DOM lib types; test-hook §9 methods are E's task by design) |

## Step 2 — Workstreams

### A — Core simulation (sub-coordinator: core-lead)
Scope: session flow (release + ABBA, nuke, triggers incl. deterministic trap cooldown for
walkers and fallers, clock + relaxed overtime, end/auto-end, goal events, checkAssign/applyNow),
movement (walk/step-up/jump/turn/step-down/walk-off, fall + splat, float, climb + overhang
check (x−dir, y−8) + hoist, terminal drown/burn/splat/exit timings), skills (block, bomb, build
symmetric, bash, mine, dig with §3.4 phase hooks; rejectReason + detail), picking + cycling.
Validators write spec-derived tests (RESEARCH §2 + DESIGN), replacing `behaviours.todo.test.ts`.

Resolved rule details (shared by implementers + validators): [`core-rules.md`](core-rules.md).
Test fixtures (no level compiler): `tests/core-fixtures.ts`. Movement helper API: `src/core/behaviours/movement.ts` (core-lead).

| Id | Task | Owner | Model | Files | Depends | Acceptance | Status | Validator verdict |
|---|---|---|---|---|---|---|---|---|
| A0 | Rules doc, movement helper API, core test fixtures | core-lead | — | core-rules.md, movement.ts, tests/core-fixtures.ts | — | check green | DONE | — |
| A1 | Session flow: release/ABBA, nuke, triggers + trap cooldown, kill/save timing, blocker field, clock + relaxed overtime, goal events, end/auto-end, checkAssign/applyNow | core-a1-impl | sonnet | session.ts, headless.ts, commands.ts | A0 | core-rules §F; check green | VALIDATED | PASS (43) |
| A2 | Movement: walk/jump/turn/step-down/walk-off, fall + splat, float, climb + overhang + hoist, terminal drown/burn/splat/exit | core-a2-impl | sonnet | walk.ts, fall.ts, climb.ts, terminal.ts | A0 | core-rules §M, §R (climber/floater) | VALIDATED | PASS (47) |
| A3a | Skills: blocker, bomber (fuse/ohno/crater), builder (symmetric, phases) + their rules | core-a3a-impl | sonnet | block.ts, bomb.ts, build.ts | A0 | core-rules §S, §R | VALIDATED | PASS (30) |
| A3b | Skills: basher, miner, digger (masks, per-pixel steel, one-way, phases) + their rules | core-a3b-impl | sonnet | bash.ts, mine.ts, dig.ts (+ optional masks.ts) | A0 | core-rules §S, §R | VALIDATED | PASS (28) |
| A4 | Picking + cycling | core-a4-impl | sonnet | picking.ts | A0 | core-rules §P, DESIGN §6.2.3/§6.3 | VALIDATED | PASS (48) |
| A1-V | Validate session flow (+ determinism test, perf smoke) | core-a1-val | sonnet | tests/core-session.test.ts, tests/session.test.ts | A1–A3 | spec-derived tests pass | VALIDATED | PASS (43) |
| A2-V | Validate movement | core-a2-val | sonnet | tests/core-movement.test.ts | A1, A2 | spec-derived tests pass | VALIDATED | PASS (47) |
| A3a-V | Validate blocker/bomber/builder + their rejections | core-a3a-val | sonnet | tests/core-skills-a.test.ts | A1–A3 | spec-derived tests pass | VALIDATED | PASS (30) |
| A3b-V | Validate basher/miner/digger + their rejections (steel/one-way) | core-a3b-val | sonnet | tests/core-skills-b.test.ts | A1–A3 | spec-derived tests pass | VALIDATED | PASS (28) |
| A4-V | Validate picking | core-a4-val | sonnet | tests/core-picking.test.ts | A4 | spec-derived tests pass | VALIDATED | PASS (48) |

**Status for B (levels-lead):** workstream A is **VALIDATED** (A1–A4 PASS, 196 core tests in tests/core-*.test.ts; `behaviours.todo.test.ts` replaced and deleted). Replay tests can rely on the engine; report engine bugs to core-lead via this section.

**Request to dev-lead (resolved):** `tests/contracts.test.ts` `lemmingsAt` assertion now expects selectable-only (1). → **DONE by dev-lead** (assertion now expects 1).

### B — Levels (sub-coordinator: levels-lead)
Scope: two-pass compiler with hashed texture recipes (DESIGN §4.2–4.4), `validateLevel` metal
rule, stamps, 12 levels from LEVELS.md/levels-data.js + registry, `solutions.ts` +
`solution-driver.ts`, **one headless replay test per level** (solution saves ≥ required; no
skills fails) — after A. Geometry tweaks allowed; keep LEVELS.md in sync.

| Id | Task | Status |
|---|---|---|
| B | Workstream summary | VALIDATED 11:56 (B1–B4; all 12 solutions win in the real engine unchanged) |

| Id | Task | Owner | Model | Files | Depends | Acceptance | Status | Validator verdict |
|---|---|---|---|---|---|---|---|---|
| B1 | Two-pass compiler (DESIGN §4.2–4.4, App. E.2 V5): fill map, h2/vnoise recipes natural/strata/bricks/solid/metal, post-paint depth/edge, one-way chevrons; `validateLevel` metal↔steel rule; 5 proposed stamps; exported `buildTerrain` for pixel tests | compiler-impl | sonnet | `src/levels/compiler.ts`, `src/levels/stamps.ts`, `tests/level-compiler.test.ts` | — | byte-identical to reference `buildTerrain` (sprites-themes.html) on its scene for all 5 themes; deterministic; indices ∈ 1–16; check green | VALIDATED | PASS (compiler-validator) |
| B2 | 12 LevelDefs (`src/levels/data/<id>.ts`) from LEVELS.md blocks via scratch converter; registry in campaign order; example level removed | leveldata-impl | sonnet | `src/levels/data/*.ts`, `src/levels/registry.ts`, `tests/levels-data.test.ts` | — | registered levels deep-equal `levels-data.js` `MUMBLE_LEVELS` (test); all validate/compile; check green | VALIDATED | PASS (data-validator) |
| B3 | `solutions.ts` (12 scripts) + `SolutionDriver` (levels-preview `matches()` semantics, taken/skills_seen/count/budget, releaseRate) + fake-view unit tests | driver-impl | sonnet | `src/levels/solutions.ts`, `src/levels/solution-driver.ts`, `tests/levels-solution-driver.test.ts` | — | `LEVEL_SOLUTIONS` deep-equals `MUMBLE_SOLUTIONS`; driver tests cover every condition field; check green | VALIDATED | PASS (data-validator) |
| B1-V | Validate B1 against DESIGN §4.1–4.4/V5 (spec-derived tests + pixel diff vs reference + 5-theme visual vs `sprites-themes.png`) | compiler-validator | sonnet | `tests/levels-compiler-spec.test.ts` (+ read-only) | B1 | PASS/FAIL with evidence | DONE | PASS: 17 spec tests (tests/levels-compiler-spec.test.ts), 0/100000 px diff vs reference ×5 themes, 5 theme + 12 level renders inspected |
| B23-V | Validate B2+B3 against LEVELS.md / levels-data.js / CONTRACTS §3 / levels-preview.html `matches()` | data-validator | sonnet | `tests/levels-spec.test.ts` (+ read-only) | B2, B3 | PASS/FAIL with evidence | DONE | PASS: 43 spec tests (tests/levels-spec.test.ts), 500-run differential oracle vs preview loop, 0 divergences |
| B4 | Phase 2 (after A): one headless replay test per level (solution wins; no skills fails at RR and RR 99; last home ≤ ½ limit); fairness-respecting tweaks synced to LEVELS.md + levels-data.js | levels-lead (subagent limit reached) | — | `tests/levels-replay*.test.ts`, level data | A, B1–B3 | — | VALIDATED (tests/levels-replay.test.ts, 13 tests; all 12 levels win unchanged; no tweaks) | PASS (replay-validator) |
| B4-V | Validate B4 against the brief/LEVELS.md/DESIGN §10 (mutation checks, fairness drops, sim-vs-engine discrepancies) | replay-validator | sonnet | `tests/levels-replay-spec.test.ts` (+ read-only) | B4 | PASS/FAIL with evidence | DONE | PASS: test matches spec, manual spot-check L1/L10/L12 identical, mutations fail, fairness drops OK in engine (tests/levels-replay-spec.test.ts, 14 tests); only doc drift (L9 31/40 vs 32/40) → LEVELS.md note 12 updated |

Core bugs for dev-lead: none found (all 12 levels pass in the engine unchanged).

### C — Rendering (sub-coordinator: render-lead)
Scope: sprite atlas from `art/` (per-state anim rule, mirrored origin), overlays (digits,
fuse, pips, hover/selected/refuse brackets, pending, ✕, steel spark, assign ring, crosshair),
terrain layer (theme LUT, dirty rects, high-contrast mode §4.9), objects (hatch, exit, traps,
hazard pools; ambient frozen under reduced motion), particles (§3.5, pool 256, ≤ 3 bursts/s),
camera easing, minimap (§5.1), CSS cursor, fall ruler.

Module plan + resolved spec decisions (input for C workers):
`/private/tmp/claude-501/-Users-davideschiera-Projects-lemmings/58d5c9d4-6163-42e3-8eb9-452b3de6012f/scratchpad/render/RENDER-PLAN.md`
(if lost on resume: the APIs are in the files themselves; validators test against DESIGN).

| Id | Task | Owner | Model | Files | Depends | Acceptance | Status | Verdict |
|---|---|---|---|---|---|---|---|---|
| C1 | Sprite atlas (18 states, §3.4 frame rule, mirrored origin, cache state:frame:dir, IP comment), overlay art painter (digit, fuse, pips, brackets, would-refuse, pending, ✕, spark, ring, puff, crosshair+halo), CSS cursor PNG 32/48/64 | render-c1 | sonnet | render/sprites.ts, sprite-geometry.ts, overlays.ts, cursor.ts | — | plan §2 APIs; check green | VALIDATED | PASS (CV1a unit, CV3/CV3b browser) |
| C2 | Terrain layer (theme LUT, dirty rects, HC §4.9 grown rect, mode switch repaint), scene painter (bg + decor, pools, traps, hatches, exits, HC variants), object timing helpers, renderer draw order V7 up to mumbles | render-c2 | sonnet | render/terrain-layer.ts, high-contrast.ts, object-anim.ts, scene.ts, renderer.ts | — | plan §4; check green | VALIDATED | PASS (CV1b 35/35 unit, CV2 browser 9/9) |
| C3 | Particles (pool 256, seeded, analytic, 24/6), burst limiter, event effects (§3.5), fall ruler, camera easing, minimap §5.1 | render-c3 | sonnet | render/pixel-target.ts, particles.ts, effects.ts, fall-ruler.ts, camera.ts, minimap-geometry.ts, minimap.ts | — | plan §3; check green | VALIDATED | PASS (CV1a 137/137 unit, CV3/CV3b browser) |
| C4 | Integrate overlays + effects + particles + fall ruler + crosshair into renderer.ts | render-c4 | sonnet | render/renderer.ts | C1–C3 | plan §5; check green; snapshot loads, 0 console errors | VALIDATED | PASS (CV2 + CV3 + CV3b browser, 0 console errors) |
| CV1a | Spec-derived unit tests: sprite geometry, particles/limiter, effects, camera, minimap geometry, fall ruler | render-v1a | sonnet | tests/render-{sprite-geometry,particles,effects,camera,minimap-geometry,fall-ruler}.test.ts | C1, C3 | tests vs DESIGN pass | VALIDATED | PASS 137/137 (render-v1a) |
| CV1b | Spec-derived unit tests: HC patterns, object timing (hatch/trap/exit/ambient/decor), terrain LUT packing | render-v1b | sonnet | tests/render-{high-contrast,object-anim}.test.ts | C2 | tests vs DESIGN pass | VALIDATED | PASS 35/35 (render-v1b) |
| CV2 | Browser validation: themes/terrain/HC/objects/reduced motion (harness + snapshot :5192), screenshots vs mockups, 0 console errors | render-v2 | sonnet | scratchpad only | C4 | report with screenshots | VALIDATED | PASS 9/9, 0 console errors (render-v2) |
| CV3 | Browser validation: mumbles/overlays/effects/minimap/camera/cursor/fall ruler (harness :5193) | render-v3 | sonnet | scratchpad only | C4 | report with screenshots | VALIDATED | PASS 8/8, 0 console errors (render-v3); 2 live gaps → CV3b |
| CV3b | Live gap checks: burst limiter + amber pips ≤ 3 | render-v3b | haiku | scratchpad only | C4 | numbers per DESIGN §7.8/§3.4 | VALIDATED | PASS: 6 explosions in one wall second → 3 pop stars, confetti at all 6; pips amber at ≤ 3 (render-v3b) |

**Request to dev-lead (C, shared file):** `tests/contracts.test.ts` line ~501 asserts `camera.animating === false` right after `centerOn(800, 80, { animate: true })` (old stub placeholder, its own TODO says so). Camera now eases for real (brief: 200 ms ease-out), so `animating` is `true` until 200 ms elapse → this test is red. Please change it to `assert.equal(camera.animating, true); camera.update(200); assert.equal(camera.animating, false);` (or drop the line). C does not own that file. → **DONE by dev-lead** (test now asserts easing: animating true, then false after 250 ms; instant when not animated).

### D — Audio (sub-coordinator: audio-lead)
Scope: port `audio-lab.html` helpers + 36 recipes 1:1 (`audio/synth.ts`, `sfx.ts`), master
limiter, per-id rate/polyphony table (§8.5), once-per-level ids, ducking + pause duck,
`soundFor` mapping incl. theme trap variants + voice pitch (§8.3–8.4), music sequencer with 6
tunes, variants, start at tick 55, title jingle (§8.6).

**Status: VALIDATED 2026-09-26** (all rows below PASS; `npm run check` audio-clean).

Design split (audio-lead): pure modules with **no Web Audio types** so Node tests (no DOM lib)
can import them — `sfx-ids.ts` (ids, VOICE_SFX), `limiter.ts` (per-id table + SfxLimiter),
`music-data.ts` (MUSIC, MIX, compileTheme, variants), `event-sounds.ts` (soundFor,
lemmingPitch, EventSounds typed on a structural `SoundPlayer`). Web Audio modules: `synth.ts`,
`sfx.ts` (re-exports sfx-ids), `audio-engine.ts`, `music.ts`. Engine extras beyond CONTRACTS §6
(additive): `duckMusic(db, attackS, releaseS, holdS = 0)`, `setMusicActiveUntil(time)`.

| Id | Task | Owner | Model | Files | Depends | Acceptance | Status | Verdict |
|---|---|---|---|---|---|---|---|---|
| D0 | Shared scaffolding: `synth.ts` 1:1 lab port, `sfx-ids.ts`, sfx.ts re-export, engine stubs | audio-lead | — | synth.ts, sfx-ids.ts, sfx.ts, audio-engine.ts | — | typecheck green | VALIDATED | PASS (D-V1 static 1:1 review, D-V2 measurement) |
| D1 | 36 recipes 1:1 (`sfx.ts`), `limiter.ts` (§8.5 table + durations §8.3, once-per-level), engine (§8.1 graph + limiter, buses, mute ramp, ducking, pause duck, stinger wait) | audio-sfx-impl | sonnet | sfx.ts, limiter.ts, audio-engine.ts | D0 | check green; 1:1 with lab | VALIDATED | PASS (D-V1 + D-V2) |
| D2 | `music-data.ts` (MUSIC/MIX/compileTheme + variants), `music.ts` (look-ahead sequencer, fade-in/out, jingle, enable), `event-sounds.ts` (§8.3 mapping, S2) | audio-music-impl | sonnet | music-data.ts, music.ts, event-sounds.ts | D0 | check green; 1:1 with lab | VALIDATED | PASS (D-V1 + D-V2) |
| D-V1 | Node unit validation vs spec: `tests/audio-*.test.ts` (soundFor all events × themes, pitch tables, limiter, music data/variants) + static review of engine/music API | audio-unit-validator | sonnet | tests/audio-*.test.ts | D1, D2 | PASS/FAIL with evidence | VALIDATED | PASS: 59/59 (audio-sound-map 26, audio-limiter 15, audio-music-data 18); static review sfx/synth 1:1 with lab (numeric diff), engine/music vs §8.1/§8.5/§8.6 OK |
| D-V2 | Browser validation (:5194): IIFE bundle, measureAll 36 vs §8.3 (±1 dB), checkMusic 6 tunes, live engine graph/duck/limiter probe, snapshot page: no AudioContext before gesture | audio-browser-validator | sonnet | scratch only | D1, D2 | PASS/FAIL with evidence | VALIDATED | PASS: 36/36 SFX within ±1 dB of §8.3 (max Δpeak 0.83 rr-down, Δloud 0.05, Δdur 0.5 ms); 18/18 music renders (6×3 variants) 0 errors, peak ≤ −6, loops exact; live probe (graph, limiter, once-per-level, mute, duck, pause duck, loop, jingle) OK; real page: 0 AudioContext before gesture |

### E — UI, input, accessibility, app integration (sub-coordinator: ui-lead)
Scope: strings (App. A) + `verdictFor()`, tokens/CSS (§5.2), persistence v2, HUD (§5.3),
all screens (§5.4), dialogs (pause menu, in-game briefing/help overlays), input (Shift rule,
focus ownership, pointer modifiers, wheel, edge scroll, assign-on-release), keyboard-only play
(§6.2), Pop all / Restart arm–confirm, pause/frame-step/fast/game speed/undo, auto-pause,
announcer keyed queue + §7.3 catalogue, captions strip, settings (§7.11) incl. rebinding,
wiring of render/audio/music APIs, test hook additions (CONTRACTS §9), `index.html` ARIA.

| Id | Task | Status |
|---|---|---|
| E | (ui-lead → ui-lead-2: sub-task rows below) | VALIDATED (12:25, ui-lead-2; EF2 polish: independent check in I1) |

Sub-tasks (ui-lead). Phase 1: E0 ‖ E1. Phase 2 (after E0+E1): E2, E3a, E3b, E4, E5a, E5b, E5c in
parallel on disjoint files (ownership = the Files column). Phase 3: validators (different agents).
Tests must not import DOM-typed modules (tests/tsconfig has no DOM lib): testable logic lives in
DOM-free modules.

| Id | Task | Owner label | Model | Files | Depends | Acceptance | Status | Validator verdict |
|---|---|---|---|---|---|---|---|---|
| E0 | Skeleton: split controller into `src/app/game/*` modules + shared `PlayState`/`PlayContext`; HUD view interfaces (`HudState`, `HudCallbacks`, view methods); dialog/overlay + announcer + test-hook signatures; stage overlay container; keep game running | e0-skeleton | opus | `src/app/**`, `src/ui/hud/types.ts`, `src/ui/screens/game.ts`, `src/ui/announcer.ts` (signature), `src/ui/pixel-art.ts`, `src/ui/dialogs/*` (stubs), `src/styles/main.css`, `index.html` | — | check green; every module ≤ ~250 l with typed stubs + JSDoc citing DESIGN §; game still playable | VALIDATED | EV1c + EV2 + EV3 PASS (skeleton exercised end-to-end); module map in app/game/*.ts headers |
| E1 | Copy & data: `ui/strings.ts` (App. A, §6.5 refusals, §6.3.1 describeLemming, §7.3 templates, §9.3/§5.4/§7.10/§7.11 copy, VERDICTS + verdictFor), `ui/strings/*.ts` extension files; persistence v2 polish + unlock rule; tokens.css §5.2 + base.css from mockup.css; tests | e1-copy | sonnet | `src/ui/strings.ts`, `src/ui/strings/*`, `src/persistence/**`, `src/styles/tokens.css`, `src/styles/base.css`, `tests/storage.test.ts`, `tests/ui-strings.test.ts` | — | verdict tests 8 rows × T=10/20/80; no "Lemm-" test; migration tests; check green | VALIDATED | EV1a PASS |
| E2a | Toolbar: roving tabindex, RR group (hold via down/up, limits, interval, aria), 8 skill buttons (icon ×3, key hint, count badge, all states, refusal flash, count pop), Pause/Fast/Pop all (idle/armed/popping)/☰ | e2a-toolbar | sonnet | `src/ui/hud/toolbar.ts` (keep API), `src/ui/hud/skill-bar.ts`, new `src/ui/hud/{skill-button,rr-group,controls,icons}*.ts`, `src/ui/strings/hud.ts`, `src/styles/hud.css` | E0,E1 | §5.3, §6.2.6, §7.2 + mockup | VALIDATED | EV2 PASS (toolbar roving tabindex, ARIA §7.2, 48–92×88 targets, focus ring) + EV3 PASS (keyboard play) |
| E2b | Game view: layout (§5.1 incl. ×2 wrap, stage + overlay), status line (chips, 16ch focus slot, Out, Saved meter, Time/overtime/⚠, Muted, Ready, Tick), minimap well slider, plates (pause/×3), toast, bubble, edge arrow, caption strip | e2b-hud-view | sonnet | `src/ui/screens/game.ts`, `src/ui/hud/status-bar.ts` + new `src/ui/hud/{status-line,chips,minimap-well,plates,captions}*.ts`, `src/ui/strings/status.ts`, `src/styles/{layout,status,overlays}.css` | E0,E1 | §5.1, §5.3, §7.2, §7.7 + mockup | VALIDATED | EV2 PASS after EF1 (status line, chips 32 in 44 row, minimap well slider 332×44) + EV1c camera/edge PASS |
| E3a1 | Title (logo, tagline, Start/Continue, menu, march strip, sound note) + Results (headline, meter + notch, verdictFor, new best, relaxed/beat-clock, buttons, hint on failure) | e3a1-title-results | sonnet | `src/ui/screens/{title,results}.ts`, new `src/ui/screens/march-strip.ts`, `src/ui/strings/screens.ts`, `src/styles/screens.css` | E0,E1 | §5.4, §9.2, §9.5 + menus.html | VALIDATED | EV2 PASS (landing focus, h1, results title/focus) + EV1a verdictFor PASS + EV3 PASS (title→levels nav) |
| E3a2 | Level select (tiers, cards, thumbnails, locked/new/completed/perfect/inTime/current, roving grid) + Briefing (screen + overlay mode) | e3a2-levels-briefing | sonnet | `src/ui/screens/{level-select,briefing}.ts` (+ `level-*.ts` helpers), new `src/ui/thumbnail.ts`, `src/ui/strings/levels.ts`, `src/styles/levels.css` | E0,E1 | §5.4, §7.2 + menus.html | VALIDATED | EV2 PASS after EF1 (locked-card names keep level identity; tiers h2; roving grid) + EV3 PASS |
| E3b1 | Settings (§7.11 all fields, overlay mode) + rebinding (pure `input/rebinding.ts`: ≤ 2 keys, reserved refused, clash Swap/Cancel, reset) | e3b1-settings | sonnet | `src/ui/screens/settings.ts` (+ `settings-*.ts`), new `src/input/rebinding.ts`, `src/ui/strings/settings.ts`, `src/styles/settings.css`, `tests/bindings.test.ts`, `tests/input-rebinding.test.ts` | E0,E1 | §7.11, §6.1.2, §5.4 | VALIDATED | EV1c rebinding PASS + EV2 PASS after EF1 (checkbox/radio 24×24, ranges 44, rows ≥ 44) |
| E3b2 | Help (from live bindings, §7.10) + generic dialog + pause menu (objective, restart confirm, cheat-sheet) + in-game overlays (B/H/settings) | e3b2-help-dialogs | sonnet | `src/ui/screens/help.ts` (+ `help-*.ts`), `src/ui/dialog.ts`, `src/ui/dialogs/**`, `src/ui/strings/help.ts`, `src/styles/dialogs.css` | E0,E1 | §7.10, §5.4, §6.2.6 | VALIDATED | EV2 PASS (native dialogs, aria-labelledby/describedby, Esc/B/H, focus return) + EV3 PASS |
| E4a | Input manager (Shift, key ownership incl. Home/End/PgUp/PgDn, pointer samples/modifiers, wheel non-passive, contextmenu) + pointer (press/release assign, walkers-only, empty ground) + camera (scroll keys, Home/End cycle, C, L follow, wheel, middle-drag, edge zones) + minimap control | e4a-input-camera | sonnet | `src/input/input-manager.ts` (+ pure `src/input/*` helpers), `src/app/game/{pointer,camera-control,minimap-control}.ts` (+ pure helpers), `src/ui/strings/camera.ts`, `tests/input-*.test.ts` (not rebinding/selection) | E0,E1 | §6.1.1, §6.1.3, §6.2.6, §7.2 | VALIDATED | EV1c key ownership/wheel/edge zones PASS + EV2 minimap keys/click/drag PASS + EV3 PASS |
| E4b | Selection (target model, cycling filter/view/group/fromX, picking snap/accepts, hover + predicted refusal, focus label, filter chip, exit/death, settle) + keyboard cursor (ramp, clamp, edge push) | e4b-selection-cursor | sonnet | `src/app/game/{selection,keyboard-cursor}.ts` (+ pure helpers), `src/ui/strings/selection.ts`, `tests/input-selection*.test.ts` | E0,E1 | §6.2.2–§6.2.5, §6.3 | VALIDATED | EV1c cursor/selection PASS + EV3 PASS (X/Z/] cycling; X anomaly = stale bindings, not a defect) |
| E5a1 | Skills (choice rules, Q/E, assign, refusal/accept feedback, pauseWhileChoosing, pending add) + release rate (hold, limits, #14) + Pop all/Restart arming | e5a1-skills-arming | sonnet | `src/app/game/{skills,release-rate,pop-restart,arming,rules}.ts`, `src/ui/strings/game.ts`, `tests/app-arming*.test.ts`, `tests/app-rules*.test.ts` | E0,E1 | §6.1.1, §6.4.4–§6.4.6, §6.5, §7.3 | VALIDATED | EV1c arming/RR/skill-step PASS + EV3 PASS |
| E5a2 | Flow (pause/pending/Ready, frame-step hold, FF, game speed, auto-pause, level end → progress → results) + undo + game dialogs + controller/routes/view-state | e5a2-flow-undo | sonnet | `src/app/game/{flow,undo,dialogs,controller,routes,view-state,play-context}.ts`, `src/app/game-loop.ts`, `src/ui/strings/flow.ts`, `tests/game-loop.test.ts`, `tests/app-flow*.test.ts` | E0,E1 | §6.4.1–§6.4.3, §6.4.7–§6.4.8, §7.9 | VALIDATED | EV1c loop/frame-step/results record/undo PASS + EV3 PASS |
| E5b | Announcer keyed queue (pure) + DOM wrapper + log; EventAnnouncer rows; audio wiring (music tick 55/variant, pause duck, stop, captions, mute) | e5b-announce-audio | sonnet | `src/ui/{announcer,announce-queue,event-announcements}.ts`, `src/app/game/{audio-wiring,audio-music,audio-captions}.ts`, `src/ui/strings/announce.ts`, `tests/{ui-announce-queue,ui-event-announcements,app-audio-music,app-audio-captions}.test.ts` | E0,E1 | §7.3, §7.7, §8.1, §8.6 | VALIDATED | EV1b PASS after fix (drainBurst), 27/27 |
| E5c | Shell: app.ts (scale rule + override, settings apply, cursor CSS, motion/contrast, audio unlock, title jingle), index.html (ARIA §7.2, favicon), router focus, screens composition, test hook (audioState/announcerLog/focus/playSolution) | e5c-shell | sonnet | `src/app/{app,router,screens,services,test-hook,config}.ts`, `src/main.ts`, `index.html`, `src/ui/strings/shell.ts`, `tests/app-shell*.test.ts` | E0,E1 | §5.1, §6.2.6, §7.2, CONTRACTS §9 | VALIDATED | EV1c scale PASS + EV2 PASS (ARIA §7.2, landing focus, 0 console errors every screen) |
| EV1a | Validate E1 (strings vs App. A/§6.5/§6.3.1/§7.3/§9.5, verdictFor, persistence v2 + unlock, tokens §5.2, no "Lemm-") against the SPEC; may add `tests/ui-spec-*.test.ts`, `tests/storage-spec.test.ts` | ev1a-copy | sonnet | new test files only | E1 | pass/fail + evidence | VALIDATED | PASS (100/100 spec tests) |
| EV1b | Unit validator: announcer queue rules 1–5, EventAnnouncer rows, captions, music variant (spec-derived tests) | ev1b-announce | sonnet | new `tests/ui-spec-*.test.ts`, `tests/app-spec-audio.test.ts` | E5b | pass/fail + evidence | VALIDATED | PASS after fix (drainBurst; 24 + 3 new tests, 27/27) |
| EV1c | Unit validator: arming, RR, skill step, frame-step/loop, results record, undo, rebinding, key ownership/wheel, edge zones/jumps, cursor/selection, scale | ev1c-logic | sonnet | new `tests/app-spec-*.test.ts`, `tests/input-spec-*.test.ts` | E3b1,E4a,E4b,E5a1,E5a2,E5c | pass/fail + evidence | VALIDATED | PASS all 11 items, 109/109 tests |
| EV2 | Browser a11y audit (tab order, focus ring at every stop, ARIA §7.2, ≥ 44 px, landing focus, dialogs, 0 console errors every screen) | ev-a11y | sonnet | read-only; port 5195 | phase 2 | pass/fail + screenshots | VALIDATED | PASS 12/12 on re-check by ui-lead-2 after EF1 (first run FAIL 3/12: locked-card name, minimap 32 px, settings control sizes). Evidence docs/development/smoke/e-a11y/ev2-recheck.md |
| EF1 | Fix EV2 findings (locked card name, minimap slider on the 332×44 well, settings control sizes) | ef1-a11y-fix | sonnet | level-select.ts, minimap-well.ts, status.css, settings*.ts, settings.css, strings/levels.ts | EV2 | EV2 re-check PASS | VALIDATED | EV2 re-check PASS (ui-lead-2, 12/12) |
| EV3 | Keyboard-only e2e: levels 1–3 via press_key only (A3) + playSolution hook | ev-keyboard | sonnet | read-only; port 5196 | phase 2 + A,B | pass/fail + evidence | VALIDATED (A3) | PASS: L1 10/10 (full keyboard nav from title), L2 7/12, L3 10/15, keys only; §6.2/§6.4.1 checks pass; 0 console errors. X-key anomaly RESOLVED (ui-lead-2): stale persisted bindings on origin :5196 (pause=KeyX, lemming-next=KeyK from E3b1's rebinding check); clean context X/] select and stay paused — harness artifact, no defect (smoke/e-keyboard/x-key-anomaly.md) |
| EF2 | Polish found during EV2 re-check: rule-1 join doubled sentence ends ('…help.. Spade Expectations'); results title 'Level complete!. …' → `joinUtterance()` | ui-lead-2 | opus | `src/ui/announce-queue.ts`, `src/ui/screens/results.ts`, `tests/ui-announce-queue.test.ts` | EV2 | no '..'/'!.' joins; check green | VALIDATED (I1c + I1-R: no `..`/`!.`/`?.` in any announcement) | self-verified in browser + 2 unit tests (check 1019/1019); no Agent tool in ui-lead-2's session → independent confirmation requested in I1 |

## Step 3 — Integration validation

| Id | Task | Owner | Model | Status |
|---|---|---|---|---|
| I1 | Cross-workstream validation round (browser, all screens, all skills, a11y, audio state, console) — split into I1a/I1b/I1c (task sizing) | dev-lead-2 | — | VALIDATED (I1a/b/c + I1-R + I1-R2 PASS after IF1–IF4) |
| I1a | Flow + screens + persistence + settings + help/briefing overlays + focus + no "Lemm" + console (snapshot :5197) | i1a-flow-validator | sonnet | VALIDATED — PASS 9/9 + 1 minor defect (router wedge on an invalid hook route) fixed by IF3/IF4 |
| I1b | Gameplay controls: 8 skills in play, RR limits, pause/assign-while-paused, frame-step, FF, Pop all + Restart arm/confirm, L5 time-up win, L9 trap (snapshot :5198) | i1b-play-validator | sonnet | VALIDATED — PASS 10/10 (L9 trap sink seen on the pre-IF2 snapshot; fixed by IF2, PASS in I1-R) |
| I1c | Audio state, captions, announcer (≤ 1 polite/s, §7.3 texts, EF2 punctuation), minimap slider keys §7.2, Pop-all hint a11y, title-announced-twice (snapshot :5199) | i1c-a11y-audio-validator | sonnet | VALIDATED — PASS 6/8 + 2 known FAILs (title twice, Pop-all hint in a11y tree), both fixed by IF1 and PASS in I1-R |
| IF1 | Known defects from ui-lead's final report: level title announced twice at level start; hidden Pop-all hint bubble exposed in the a11y tree while not armed | if1-ui-fix | sonnet | IMPL-DONE 12:40 (router `shouldAnnounceEntry` — game screen announces its own entry; Pop-all `popDesc` hidden unless armed; +3 tests, check 1022/1022) — VALIDATED (I1-R) |
| IF3 | Router hardening: an invalid route (bad `__game.navigate` arg) must not wedge navigation; `createScreen` exhaustive; hook validates | if3-router-fix | sonnet | VALIDATED (I1-R; its ordering regression fixed by IF4) — createScreen exhaustive + throws; hook `validateRoute`; +5 tests |
| I1-R | Independent re-check on a fresh snapshot: IF1 + IF2 + IF3 + pause-menu restart confirm + console/no-Lemm regression | i1r-validator | sonnet | FAIL 13:3x → resolved: IF1/IF2/IF3/pause-menu confirm all PASS; the new critical regression from IF3 was fixed by IF4 and PASS in I1-R2 |
| IF4 | Regression from IF3: `Router.go` now builds the new screen before destroying the old one; for game→game (Restart R/R, pause-menu Restart, two `loadLevel`s) the old `GameController.destroy()` calls `input.detach()` AFTER the new controller attached → all keyboard game input dead until leaving via a non-game screen. Restore destroy-before-build (one screen alive at a time) with a recovery path for a throwing factory; make `InputManager.detach` handler-aware | if4-router-fix | sonnet | VALIDATED (I1-R2 + F1-R) — IMPL-DONE 13:43 (pure `transition()` destroy-before-create + rebuild previous/title on a throwing factory, error rethrown after mounting; `InputManager.detach(handler?)` handler-aware; controller `detach(this)`; +9 tests, check 1036/1036) |
| I1-R2 | Independent re-check of IF4 (keys after every game→game path, IF3 behaviour, music/overlay after restart) + quick regression | i1r2-validator | sonnet | VALIDATED (PASS 5/5) — keys alive after R,R / pause-menu Restart / loadLevel×2 / Next level / R,R×3 (skill keys, X, Space, P, F, N+Esc, Esc menu, arrows); one game loop after restarts (17 ticks/s); router recovery (descriptive errors, app stays usable, no console errors); non-game transitions focus + document.title OK; 0 console messages |
| IF2 | Level 9 (and any other) trap rect extends below the floor → trap art sinks 4 px (DESIGN §4.6 anchor = rect bottom-centre); keep replays green, sync LEVELS.md + levels-data.js | if2-levels-fix | sonnet | IMPL-DONE 12:50 (L9 trap y 96→93, L12 trap y 148→145 — rect bottom = floor surface row + 1, same contact row as a mumble's foot; kills/saves unchanged; synced LEVELS.md + levels-data.js; pools untouched: uniform 4 px liquid convention; check 1022/1022) — VALIDATED (I1-R) |

I1 findings (dev-lead-2):
- I1c (12:5x): PASS audio unlock (locked→running on first gesture), volumes/mute persist + `M` + "Muted", captions (barks/all/off, shown when muted), announcer ≤ 1 polite/s + ≥ 8 §7.3 templates verbatim, **EF2 confirmed** (no `..`/`!.`/`?.` in any announcement incl. results "Level complete! …"), minimap slider §7.2 keys (±16, PgUp/PgDn ±400, Home/End) + focus ring, single polite/assertive live regions, 0 console errors/warnings. FAIL (known, fixed by IF1): title announced twice at level start ("… Press H for help. Spade Expectations"); Pop-all hint span in a11y tree while idle. Screenshots `docs/development/smoke/i1/i1c-*.png`.
- I1b (13:0x): PASS 10/10 — all 8 skills via real keys (count −1, correct state, terrain effect: dig/bash/mine/bomb crater remove, build adds; floater survives a lethal drop; blocker turns 7 walkers), refusal not consumed ("Already a climber"), RR ±1/±10 clamped [min, 99] with status text + aria-disabled, pause + assign-while-paused (plate, pending badge, "Starts when you resume."), frame-step 1/17 and pauses when running, FF ≈ 3.0× + aria-pressed, Pop all N/N + Esc cancel + toolbar clicks, Restart R/R + Esc + immediate after end, L5 time-up = won ("Level complete!", 7 of 12 · needed 6), L9 trap kills every 34 ticks (= 2 s cooldown), 0 console messages. Screenshots `smoke/i1/i1b-*.png`.
- I1a (13:1x): PASS 9/9 — 0 console errors via UI on every screen/overlay; no "Lemm" (text + aria/title/alt attrs + document.title) on title, level select, briefing, game, help, settings, pause menu, B/H/F1/settings overlays, results won + failed; title (landing focus Start, focus ring); level select 12 levels / 4 tiers, fresh save → only L1 unlocked, roving nav; full real flow title→levels→L1→briefing→game→auto results ("Level complete!", "You saved 10 of 10 · needed 5", New best, focus Next level)→L2 briefing; progress survives reload (L1 completed, L2 unlocked), failure results ("Not quite this time", Try again + Show hint); B/H/F1 overlays pause + restore prior pause state + focus back to canvas; relaxed timer → overtime, off → time-up; high-contrast view; reduced motion → `data-motion="reduce"`, explosion particles suppressed (pixel diff); settings persist. Screenshots `smoke/i1/i1a-*.png`.
  - Defect I1a-1 (minor, test-hook only): `__game.navigate('level-select')` (string, not a Route) → `createScreen` returns undefined, `Router.go` stores it, every later `go()` (incl. real clicks) throws until reload → **IF3**.
  - Note: validator reported the pause-menu "Restart level" as acting immediately; the code (`src/ui/dialogs/pause-menu.ts`) implements the §5.4 in-dialog confirm → re-check explicitly in I1-R.
- I1-R (13:3x, i1r-validator, snapshot :5190): PASS — title announced exactly once on UI entry / loadLevel / R,R / pause-menu restart; Pop-all hint hidden + absent from a11y tree while idle, exposed when armed; L9/L12 trap art bottom row flush on the floor surface (1 px contact), L9 still 31/40 with 9 trap deaths 34 ticks apart, L12 won 53/60; router hardening (descriptive errors, no wedge); pause-menu Restart in-dialog confirm (focus Resume → Cancel → Restart level); 0 console errors, no "Lemm", no bad punctuation. **FAIL — new critical regression caused by IF3**: after any game→game transition keyboard input is dead (InputManager detached by the OLD controller's destroy, which now runs after the new controller attached) → IF4. (F1 at 13:1x did not exercise a keyboard restart, so it missed this.)
- I1-R2 (14:0x): PASS 5/5 (see row). Informational only: a single `R` on a fresh level restarts immediately — per DESIGN §6.4.6 (immediate when no command issued and tick < 54, or level ended), not a defect.
- Known issues fixed during I1: IF1 (title announced twice; Pop-all hint in a11y tree), IF2 (L9 + L12 trap art sank 4 px), IF3 (router wedge on an invalid route), IF4 (IF3's build-before-destroy killed keyboard input after game→game transitions). Pause-menu Restart in-dialog confirm verified present in I1-R (the I1a note was a misread).
- Step 3 result: **I1 VALIDATED** (dev-lead-2, 14:0x). `npm run check` 1036/1036, `npm run build` OK.

## Step 4 — Final smoke

| Id | Task | Owner | Model | Status |
|---|---|---|---|---|
| F1 | 12 solutions in real page, keyboard-only L1, console, 3–5 screenshots → `docs/development/smoke/` | smoke-validator | sonnet | VALIDATED (PASS, 13:1x; re-run as F1-R after IF4) |
| F1-R | Final smoke re-run on the rebuilt production dist (code changed after F1) incl. keyboard Restart mid-level | smoke-validator-2 | sonnet | VALIDATED (PASS) — production dist/ after IF4: 12/12 `playSolution` wins with "Level complete!" + score line (identical numbers to F1; L5 time-up still a win), all 12 completed in level select + save; keyboard-only L1 incl. a mid-level `R`,`R` restart then Digger at x≈168 (tick 395) → auto results "Level complete!" "You saved 10 of 10 · needed 5"; 0 console messages; no "Lemm"; screenshots `smoke/f1-*.png` refreshed |

F1 evidence (smoke-validator, production `dist/` on :5181, isolated pages):
- 12/12 `playSolution` wins in the real page, results screen "Level complete!" + score line for every level (L1 10/5/10 · L2 7/6/12 · L3 12/8/15 · L4 12/6/12 · L5 7/6/12 by time-up, still a win · L6 14/9/15 · L7 20/14/20 · L8 19/15/20 · L9 31/28/40 · L10 39/32/40 · L11 30/25/30 · L12 53/48/60 — saved/required/total); level select then shows all 12 completed; save v2 has 12 completed entries.
- Keyboard-only L1 (press_key only): Enter (title → briefing) · Enter (start) · P · Shift+. ×6 + . ×8 · X ×4 (mumble 0 at x=160) · Space (Digger at tick 163) · P · F → auto results "Level complete!" "You saved 10 of 10 · needed 5".
- 0 console errors on every screen; no "Lemm" in document.title/innerText. Screenshots: `smoke/f1-{title,level-select,gameplay-hud,later-tier,results}.png`.
