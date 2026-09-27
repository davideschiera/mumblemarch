# Mumblemarch — Test report (Phase 5)

Lead: **test-lead** · Date: 2026-09-26 · Build under final test: production `dist/` (`npm run build`, served by
`npm run preview` on :5181) after all fixes · Browser: Chrome (chrome-devtools MCP) only.
Plan and matrix: [`TEST_PLAN.md`](TEST_PLAN.md) · Bugs: [`BUGS.md`](BUGS.md) · Per-area results: [`results/`](results/)
· Evidence: [`evidence/`](evidence/) · Final screenshots: [`../screenshots/`](../screenshots/README.md).

## Verdict

**All 8 acceptance criteria PASS.** 20 bugs found (1 major, 19 minor, 0 critical); **20 fixed and verified**
by agents other than the fixers; 0 deferred. `npm run check` 1070/1070 (1036 at the start of Phase 5; +34 tests from the fixes).
Lighthouse accessibility, best practices and SEO are 100 on every screen after the fixes. The console showed
0 errors and 0 warnings across every screen and all 12 levels.

| # | Acceptance criterion (docs/PLAN.md) | Verdict | Evidence |
|---|---|---|---|
| 1 | `npm install && npm run dev` serves the game; `npm run build` → static `dist/`; `npm test` passes | **PASS** | test-lead: `npm install` OK; `npm run dev` → :5180 returns the page (`<title>Mumblemarch</title>`) and `main.js` (200); `npm run build` → `dist/`; `npm run check` (typecheck + architecture lint + tests) 1070/1070 |
| 2 | 8 skills; release rate −/+, pause, fast-forward, nuke with confirmation, restart | **PASS** | [T1a](results/T1a-skills.md): all 8 skills assigned by mouse (toolbar + canvas pointer events) **and** keyboard (1–8, Z/X, Space), behaviour tick-exact vs RESEARCH §2.4 (e.g. 12 bricks, 79-tick fuse, 5→1 digits), 7 refusal reasons never consume the skill. [T1b](results/T1b-flow.md): RR hold-to-repeat + ±10 + clamps, pause/frame-step, FF 3.02×, Pop all arm → confirm / Esc cancel, Restart arm/confirm + immediate cases, undo |
| 3 | Destructible terrain, steel, hazards (water/lava/traps), one-way walls | **PASS** | [T1a](results/T1a-skills.md): dig/bash/mine/bomb remove terrain, builder adds it, steel refuses and survives craters. [T2a](results/T2a-play.md)–[T2c](results/T2c-play.md): bog water (L6), clam trap with 2 s re-arm (L9), molten pools + piston (L12); one-way hedge refuses a wrong-way bash (L11). High-contrast view shows every material class ([T3b](results/T3b-a11y-visual.md), VIS-4 fixed) |
| 4 | ≥ 8 novel levels in ≥ 3 tiers, level select, progress in `localStorage` | **PASS** | 12 levels in 4 tiers (Breezy/Knotty/Gnarly/Stampede). Fresh-eyes testers solved all 11 of L2–L12 from the briefing and the view alone (L1 keyboard-only in T3a/FR). [T1b](results/T1b-flow.md) case 9: completion, unlocks, best score (never lowered), settings and rebinding survive reload; a corrupt save degrades gracefully |
| 5 | Synthesized SFX + optional music, mute/volume, respects user preference | **PASS** (measurable parts) | [T4](results/T4-audio.md): no AudioContext before a gesture; 36/36 recipes rendered offline from the shipped code: peaks ≤ −6.5 dBFS, within 0.8 dB of DESIGN §8.3; limiter/rate caps hold under a 10-bomb Pop all; volume/mute apply live and persist; music on at a low default (0.35 × master 0.7) and can be switched off; every sound has a visual twin/caption |
| 6 | Accessibility: keyboard play, visible focus, live announcements, reduced motion, contrast, non-colour cues, pause anytime, help | **PASS** | [T3a](results/T3a-a11y-keys.md): full flow keys-only incl. choosing mumbles, 3 px focus ring at every stop, dialogs trap/restore focus, single polite + assertive region, §7.3 templates verbatim, Help follows rebinding. [T3b](results/T3b-a11y-visual.md): text ≥ 6.2:1, targets ≥ 24 px, reduced motion, high contrast, layouts 1024–1440 px. Lighthouse a11y 100 everywhere after fixes ([V3](results/V3-verify.md), FR) |
| 7 | No console errors during play; tested in the browser by agents | **PASS** | [T5](results/T5-robust.md): every screen + 12 levels × (solution + 600 real-time ticks at ×3): 0 errors, 0 warnings, 0 failed requests; every tester and verifier also reported 0. Final regression on the production build: see [FR](results/FR-final-regression.md) |
| 8 | 3 screenshots in `docs/screenshots/` + comparison notes vs the original | **PASS** | [`docs/screenshots/`](../screenshots/README.md) (3 PNGs, independent agent, production build); comparison below and in [T6](results/T6-compare.md) |

## How it was tested

- **Isolation.** Every tester built its own production snapshot (`node scripts/snapshot.mjs <port>`) on its own port
  and used its own Chrome page in its own browser context, so fixers editing `src/` never changed a running test and
  saves never mixed. The final regression and screenshots used the real `npm run build` + `npm run preview`.
- **Input.** Keyboard input was real CDP key input (`press_key`). Buttons were clicked through the accessibility tree.
  Canvas clicks were synthetic `PointerEvent`s at computed client coordinates, because the MCP `click` only targets
  a11y nodes. They run the game's real handlers, but they are not OS-level mouse input.
- **`window.__game`** was used to inspect state and to step time. In the play-throughs the testers chose every skill
  and target themselves through real controls (never `assignSkill`/`playSolution`).
- **Independence.** 12 test agents (including the final regression and screenshots), 8 fixer agents and 5 verifier
  agents, coordinated by the test lead and a fix sub-coordinator. No agent verified its own fix (details in
  [`BUGS.md`](BUGS.md), [V1](results/V1-verify.md), [V2](results/V2-verify.md), [V3](results/V3-verify.md) and
  [V5](results/V5-verify.md); V4's A11Y-4 evidence is in the bug entry).
- **Final build.** [FR](results/FR-final-regression.md) ran the full regression on the production build. VIS-6/VIS-7
  (CSS/layout and thumbnail only) landed after it, so [V5](results/V5-verify.md) re-ran on the rebuilt `dist/`:
  12/12 solutions with identical numbers, Lighthouse on level select and game, 0 console messages and
  `npm run check`. The final screenshots are from that rebuilt `dist/`.

## Test matrix results

| Area | Owner | Cases | Result | Bugs found | Results |
|---|---|---|---|---|---|
| T1a Skills by real input | t1a-skills | ~30 (8 skills × mouse + keyboard, 7 refusals, pause-assign, picking, hover) | all PASS | — | [T1a](results/T1a-skills.md) |
| T1b Game-flow controls + persistence | t1b-flow | 10 (RR, pause, FF, Pop all, restart, undo, camera, win/lose/time-up/relaxed, persistence, console) | 10/10 PASS | — | [T1b](results/T1b-flow.md) |
| T2a Fresh-eyes L7–L9 | t2a-play | 3 levels + softlocks | 3/3 solved first try | PLAY-A1 (major), A2, A3, A4 | [T2a](results/T2a-play.md) |
| T2b Fresh-eyes L10–L12 | t2b-play | 3 levels + one-way + softlocks | 3/3 solved first try (L12 with zero margin → fixed) | PLAY-B1, B2 | [T2b](results/T2b-play.md) |
| T2c Fresh-eyes L2–L6 | t2c-play | 5 levels + curve | 5/5 solved first try | — | [T2c](results/T2c-play.md) |
| T3a Keyboard, focus, ARIA, announcements | t3a-a11y-keys | 9 | 8 PASS, 1 with issues | A11Y-1, 2, 3 | [T3a](results/T3a-a11y-keys.md) |
| T3b Visual a11y, layout, Lighthouse | t3b-a11y-visual | 9 (7 Lighthouse screens) | PASS except 5 minor | VIS-1 … VIS-5 | [T3b](results/T3b-a11y-visual.md) |
| T4 Audio (measurable) | t4-audio | 7 | 7/7 PASS | AUD-1 | [T4](results/T4-audio.md) |
| T5 Robustness + performance | t5-robust | 7 | 7/7 PASS | — | [T5](results/T5-robust.md) |
| T6 Spirit + visual comparison | t6-compare | 6 pairs + assessment | done | CMP-1, CMP-2 | [T6](results/T6-compare.md) |
| TF Fix loop + verification | fix-lead, fx1–fx7, v1–v5 | 20 bugs | 20/20 VERIFIED | A11Y-4 (found by V2), VIS-6/VIS-7 (test-lead's screenshot review) | [V1](results/V1-verify.md), [V2](results/V2-verify.md), [V3](results/V3-verify.md), [V5](results/V5-verify.md) |
| FR Final regression (production build) | fr-regression | 8 (12/12 solutions, keyboard-only L1, console/network/no-Lemm sweep, Lighthouse, reduced motion, perf, 6 fix spot-checks) | 8/8 PASS | — | [FR](results/FR-final-regression.md) |
| T7 Final screenshots | t7-shots | 3 shots + README (retaken after VIS-6/VIS-7) | done | — | [screenshots](../screenshots/README.md) |

## Bugs

| | Found | Fixed | Verified | Deferred |
|---|---|---|---|---|
| Critical | 0 | — | — | — |
| Major | 1 | 1 | 1 | 0 |
| Minor | 19 | 19 | 19 | 0 |
| **Total** | **20** | **20** | **20** | **0** |

Two fixes needed a second round: the first VIS-1 fix produced run-together accessible names (rejected by fix-lead
before verification), and A11Y-4 was reopened once by test-lead after the fixer's own browser check still showed two
totals in one utterance. A11Y-4 was then verified by v4-verifier: a real `AnnounceQueue` race test, plus two live
runs in which the totals in every utterance never decreased.

Highlights (full entries in [`BUGS.md`](BUGS.md)):
- **PLAY-A1 (major)** — L8 "One-Pop Wonder": a bomber popping under the hatch opened a hole in the spawn column, so every
  later mumble fell 80 px and splatted and the run became unwinnable. Fixed with a small steel patch under the hatch;
  a new test pops the bomber at every hopper position; LEVELS.md now tells the truth.
- **PLAY-B1** — L12 finale: the natural, hint-following order saved exactly 48/48. Requirement lowered to 45 and the
  hint reworded; LEVELS.md, `levels-data.js` and DESIGN §10 synced.
- **A11Y-1** — level 1's hint now names "1–8, X, Space" and "click a mumble" (DESIGN §7.1 A16).
- **A11Y-2 / A11Y-4 / PLAY-B2** — live-region correctness: batch counts summed, no two different totals in one
  utterance, no stale results text left in the assertive region.
- **VIS-1/2/3** — Lighthouse/axe findings (label-in-name, headline stroke contrast, heading order) → 100 everywhere.
- **VIS-5 → VIS-6** (orchestrator's observation) — level-select thumbnails first spanned the card width (VIS-5), but
  the test lead's review of the final screenshot showed a thin 25 px strip still leaving the cards mostly empty. They
  are now a 72 px box with the whole level contain-fitted and centred over the theme background, crisp at the
  device pixel ratio and redrawn on resize.
- **VIS-7** — the game block is vertically centred in spare height (it used to hug the top and leave about 300 px
  empty at 1440×900). It stays top-aligned with scroll when it doesn't fit; overlays and pointer mapping still line
  up exactly.
- **VIS-4, AUD-1, CMP-1, CMP-2, PLAY-A2/A3/A4, A11Y-3** — high-contrast exit colour, caption strip dodges the
  cursor/selection, RR "+" shows "max" at 99, title strip at an integer scale without overlapping the sound note,
  L8 hint matches the art, hint disclosure chevron, sentence spacing, test-hook route default.

## Lighthouse

| Screen | Before fixes (T3b) a11y / BP | After fixes (V3, snapshot) a11y / BP / SEO | Final build (FR) a11y / BP |
|---|---|---|---|
| Title (navigation mode) | 100 / 100 | 100 / 100 / 100 | 100 / 100 |
| Level select | 100 / 100 (1 non-scoring fail: label-content-name-mismatch) | 100 / 100 / 100 | 100 / 100 (V5 after VIS-6: 100 / 100) |
| Briefing | 100 / 100 | 100 / 100 / 100 | 100 / 100 |
| Game (paused, mid-level) | 100 / 100 (1 non-scoring fail) | 100 / 100 / 100 | 100 / 100 (V5 after VIS-7: 100 / 100) |
| Results (win / loss) | **95** / 100 (color-contrast) | 100 / 100 / 100 | 100 / 100 |
| Settings | **98** / 100 (heading-order) | 100 / 100 / 100 | 100 / 100 |
| Help | 100 / 100 | 100 / 100 / 100 | 100 / 100 |

## Performance and robustness ([T5](results/T5-robust.md), [FR](results/FR-final-regression.md))

| Measure | Result |
|---|---|
| Crowd (L12, 60 mumbles, RR 99), normal speed | 120 fps (display refresh), 17.0 ticks/s exact, 0 long tasks > 50 ms, INP 31 ms |
| Same, fast-forward ×3 | 120 fps, 50.9 ticks/s, 0 long tasks, INP 34 ms |
| Final build re-measure (FR) | 100 / 100 |
| Tab hidden / window blur | pauses at once, never resumes by itself, no catch-up burst |
| Resize 1920×1080 → 800×600 | integer canvas scale (4/3/3/2/2), pointer mapping correct |
| Input spam (200 keys, 60 clicks, rapid navigation, double "Next level") | one game loop, responsive, 0 errors |
| Memory (20 load/restart cycles) | heap after forced GC flat (8.09 MB → 8.09 MB) |
| Long run (L8 at ×3 to time-up) | ends at tick 4080, "Time's up" flow, 0 errors |

Note: the most mumbles any level has is 60, so the "80+" crowd in the brief couldn't be reached without editing data.
One CLS reading of 0.19 appeared in a single trace around a mid-FF Pop all of 60 mumbles (level-end DOM updates); no
visible jank, not reproduced.

## Play-testing: fairness and difficulty curve

- All 11 levels L2–L12 were solved on the first attempt by fresh-eyes testers who used only the briefing, the view and
  real controls, and L1 was won keyboard-only. No softlocks: every run ended on its own. Timers are generous.
- Each tier-1 level teaches one verb with a legible obstacle, as intended. L10 and L11 were solved exactly as designed
  from the view alone. The one-way hedge refusal message ("Can't bash against the arrows") teaches the rule.
- **Curve observation (not a bug):** the testers rated L7–L9 closer to Breezy than Knotty (1.5–2/5), and L11 slightly
  easier than L10. Agents play with perfect pause-and-step, which removes the timing pressure a human feels, so the
  levels will feel harder to people. Still, veterans may find the campaign gentle. The L9 and L11 hints come close to
  giving away the solution.
- The two real fairness problems (L8 hatch-column crater, L12 zero margin) were fixed and re-verified with real input.

## Comparison with the original (criterion 8)

Six reference screenshots of the 1991 original (`docs/research/reference/`, comparison only, never shipped) were paired
with matching Mumblemarch captures. They are on a local side-by-side page, [`compare/index.html`](compare/index.html),
and in the images below. They were captured on the pre-fix build; the fixes since then change only the level-select
thumbnails, the title strip scale and the RR "+" label. Full per-pair tables: [T6](results/T6-compare.md).

| Gameplay panel | Blocker crowd + builders |
|---|---|
| ![01](compare/01-gameplay-panel-compare.png) | ![02](compare/02-busy-builders-compare.png) |
| **Briefing** | **Title** |
| ![03](compare/03-level-preview-compare.png) | ![04](compare/04-title-menu-compare.png) |
| **Results** | **Dark theme crowd + hover** |
| ![05](compare/05-results-compare.png) | ![06](compare/06-dos-vga-busy-hover-compare.png) |

**What matches the spirit**
- **Skill panel.** RR − / value / + then the 8 skills Climber → Digger in the classic order, then Pause and the nuke
  ("Pop all"), with the minimap on the status row. Keys 1–8 follow the same order.
- **Tiny but readable critters.** Mumbles are about 1/16 of the 160 px playfield, like the original. The strong outline,
  the facing eye and job props (STOP paddle, planks, fuse digit) keep them readable in every theme.
- **Hover box and "what's under the cursor" label.** The label counts everything under the cursor ("Walker ×6"), like
  `WALKER 6`.
- **Calm, then chaos.** An empty level, the hatch, a trickle, then bunching at blockers and hazards. The L12 crowd of 60
  at RR 99 brings back the pressure.
- **Humour.** Pun titles that double as hints (Spade Expectations, Bridge Over Troubled Toffee, Clam Before the Storm),
  captioned barks, and results lines graded by margin.
- **Flow.** Briefing → play → results in the original's information order, with autosave instead of access codes.

**Intentional differences**
- For IP, everything is our own: name, logo, critter, icons, themes, sounds, music and copy.
- Accessibility and usability additions: full keyboard play, pause-and-assign (the original forbade it), frame-step,
  fast-forward, relaxed timer, captions, high-contrast view, reduced motion, counts instead of percentages, and a
  two-step Pop all instead of a double-click.

**Gaps (candid)**
- **Menu charm.** Title, briefing and results are clean web screens. They lack the original's sign-holding critters
  and textured title cards. In play it feels like *Lemmings*; outside play it feels like a well-made web app.
- **Content scale.** 12 levels instead of 120, crowds of 10–60 instead of up to 80–100, and no 2-player mode.
- **HUD weight.** The toolbar takes about 25% of the game block (the original's panel takes 20%) and looks like a web
  toolbar. At 1440×900 the page leaves unused space below the game, because the scale is capped by width.
- **Crowd texture.** At RR 99 the walkers look like an even row rather than a jostling crowd.

## Final screenshots (criterion 8)

Taken by an agent independent of the fixers (t7-shots) from the production build (`npm run build` + `npm run preview`)
at 1440×900, after all fixes, and reviewed by the test lead. The first set was retaken: the pause pill was showing,
the hazard wasn't readable, and the review led to VIS-6/VIS-7. Captions: [`docs/screenshots/README.md`](../screenshots/README.md).

| | |
|---|---|
| ![01](../screenshots/01-gameplay-crowd.png) | **01-gameplay-crowd.png** — *Double Boiler* (sugarworks, Gnarly) at RR 99. Builder stairs across the toffee gap, a digger mid-hole, a blocker holding the queue and a bomber counting down, all at once. The full HUD, status line, minimap and a bark caption are visible. |
| ![02](../screenshots/02-foundry-gameplay.png) | **02-foundry-gameplay.png** — *Last Shift at the Foundry* (foundry, Stampede) late in the run. The steel parapet, the piston-trap floor and the exit, with a keyboard-selected mumble (X): selection bracket plus "Selected: Walker". Saved meter 40 / need 45. |
| ![03](../screenshots/03-flow.png) | **03-flow.png** — Level select with tiers and real progress. Perfect, completed + current (focus ring), new and locked cards, each with its contain-fit level thumbnail. |

## Limitations

- **No human listening.** Audio was verified only by measurement (offline renders, gain nodes, node counts, captions).
  Nobody judged how the sounds or music actually sound.
- **No real screen reader.** The accessibility tree, ARIA state and live-region text were verified. Nobody heard NVDA,
  JAWS or VoiceOver speak them.
- **Chrome only**, desktop only (per the plan). No Firefox or Safari runs.
- **Synthetic canvas clicks.** Canvas clicks were synthetic `PointerEvent`s through the real handlers, not OS mouse
  input. Keyboard input was real CDP input.
- **Agent play-testers** can pause and step at will, so their difficulty ratings underestimate the real-time pressure a
  person feels.
- **OS-level `prefers-reduced-motion`** couldn't be emulated: the chrome-devtools MCP `emulate` tool has no
  media-feature option. Reduced motion was verified live through the app's own Motion setting, which sets the same
  `data-motion` attribute the renderer and CSS key off: static title strip, instant camera cuts and a different
  explosion render (FR, T3b). The `system` mode's `matchMedia('(prefers-reduced-motion: reduce)')` read and its
  change listener (`src/app/app.ts`) were checked by code review only.
- **Tab switching** was simulated (`document.hidden` + `visibilitychange`, window blur). Chrome's automation didn't flip
  visibility between tabs.
- **Known behaviours kept per spec** (from the development phase): L5 ends on time-up while non-climbers pace (still a
  win); water/lava pools sit 4 px below the floor surface by convention; the relaxed-timer setting applies from the next
  level load.
