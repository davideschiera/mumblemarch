# V3 — Verification of VIS-5, PLAY-A4, VIS-1, VIS-2, VIS-3, CMP-1, CMP-2

Snapshot: `node scripts/snapshot.mjs 5253 …/snap-5253` (isolated Chrome page, isolatedContext `V3`).
Spec refs: DESIGN §5.1 (integer scaling), §5.2–§5.4 (title/level-select/results/settings), §7.2 (ARIA names).
Method: fresh save injected into `localStorage['mumblemarch.save']` (per `src/persistence/schema.ts` shape) to get
completed/perfect/current/new/locked level cards without playing through; `__game.loadLevel`/`navigate`/`step` to
reach each screen; real `press_key`/`click` for input paths; Lighthouse `snapshot` mode for every screen except
Title (navigation mode, since it's the app's actual load URL).

## Case results

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| VIS-5 — thumbnail fill | canvas backing fixed-width, CSS `width:100%` pixelated over theme bg; card size/grid unchanged at 1440/1280/1024 (§5.4) | **PASS** — thumb CSS width = card content width at all 3 sizes (235/271, 235/271, 195/231); canvas backing 250×25 unchanged; `getImageData` shows the theme bg colour flat across left/mid/right of the thumbnail; card box stays 176px tall (271/271/231 wide) at 1440/1280/1024; no overflow | level-select-{1440,1280,1024}.png |
| PLAY-A4 — card description | "Finished within the time limit. This is the level you played last." (space after period) | **PASS** — `aria-describedby` text read back verbatim, exact string incl. the space | DOM read (script output above) |
| VIS-1 — accessible names | visible text contained in accessible name (WCAG 2.5.3); visuals/interactions intact | **PASS** — Lighthouse `label-content-name-mismatch`: 0 fails on level-select and on the game screen at RR floor, RR ceiling and skills-all-0. Names read cleanly: skill buttons "Climber, none left" / "Digger, 5 left" (visible text = just the name, no digit-run); RR "Slower release, min" / "Faster release, max"; filter chip "Pick: All. Selection filter: all mumbles."; level card "Level 1: Spade Expectations Everyone home. Breezy." Toolbar screenshot: key-hint digits (1–8), count badges and diagonal hatch on 0-left skills all present and correctly positioned; selected Digger shows yellow border + notch. Clicking a disabled (0-left) skill button via its uid still reaches the button (announced "No climbers left", selection unchanged) — overlay `pointer-events:none` doesn't block it. Real key `2` selected Floater on a level where only Floater > 0. | toolbar.png; Lighthouse JSON (level-select, game×3 configs) |
| VIS-2 — headline contrast | stroke/shadow ≥3:1 on results bg (§4.10) | **PASS** — stroke/shadow now `rgb(165,157,224)` (`--color-border-strong`) vs bg `rgb(20,17,42)` (`--color-bg`): computed contrast **7.44:1**. Lighthouse Accessibility 100 on win and loss (was 95). Screenshot: headline still reads as a sticker (green fill, lavender outline, checkmark). | results-win.png |
| VIS-3 — heading order | no skipped levels (§5.4 one h1 per screen) | **PASS** — Settings: H1 Settings → H2 Skills → H2 Choosing mumbles → H2 Camera → H2 Game flow → H2 Sound & info. Lighthouse Accessibility 100 (was 98), 0 `heading-order` fails. | DOM heading dump; Lighthouse JSON |
| CMP-1 — RR ceiling label | "+" never shows "min"; shows max-lock at 99 (§5.3) | **PASS** — raised RR to 99 via real `Shift+=` presses (50→60→70→80→90→99, clamped): "+" → `aria-label="Faster release, max"`, visible "🔒 max", `aria-disabled=true`; "−" enabled, plain "Slower release". At the level minimum (50): "−" → "Slower release, min" (visible "🔒 min"), "+" enabled. | script output above |
| CMP-2 — title strip/note | integer scale, note below strip, ≥4.5:1, static under reduced motion (§5.1/§5.4/§7.4) | **PASS** — strip CSS size 800×64 = ×2 of the 400×32 backing store at 1440, 1280 **and** 1024 (always an exact integer multiple). Note top ≥ strip bottom by 8px (no overlap) at all 3 widths. Note colour `rgb(176,169,212)` vs page bg `rgb(20,17,42)`: computed contrast **8.29:1**. Under `Settings.motion='reduce'` (injected via save + reload) the strip canvas's `toDataURL()` is bit-identical over 500ms; under the default it changes every frame. | title-{1440,1280,1024}.png |

## Lighthouse scores (desktop, `snapshot` mode unless noted)

| Screen | State | A11y | Best Practices | SEO | Passed/Total | Failing audits |
|---|---|---|---|---|---|---|
| Title | fresh load | 100 | 100 | 100 | 44/44 (navigation mode) | none |
| Level select | save w/ completed(perfect+inTime)/completed/current/new/locked cards | 100 | 100 | 100 | 31/31 | none |
| Briefing | Spade Expectations | 100 | 100 | 100 | 32/32 | none |
| Game | paused, mid-level, RR=50(floor), skills mostly 0 | 100 | 100 | 100 | 30/30 | none |
| Game | paused, RR=99(ceiling), skills mostly 0 | 100 | 100 | 100 | 30/30 | none |
| Results (win) | saved 10/10, needed 5 | 100 | 100 | 100 | 28/28 | none |
| Results (loss) | saved 2/10, needed 5 | 100 | 100 | 100 | 28/28 | none |
| Settings | default | 100 | 100 | 100 | 29/29 | none |
| Help | default | 100 | 100 | 100 | 31/31 | none |

All previously-failing audit ids from T3b (`label-content-name-mismatch`, `color-contrast`, `heading-order`) are gone from every report above (0 failing audits everywhere Lighthouse was run).

## Regression checks

- **Console**: `list_console_messages` returned 0 messages (no errors, no warnings) across the entire session — title, level-select (3 widths), briefing, game (multiple states, real key presses, real clicks), results (win/loss), settings, help.
- **No "Lemm"**: `document.body.innerText` and `document.title` checked clean (no match for `/Lemm/`) on title, level-select, briefing, game, results (win), results (loss), settings, help.
- Card sizes/grid unaffected by the VIS-5 thumbnail change: 271×176 @1440/1280 max-width column, 231×176 @1024 — matches the T3b baseline's card measurements.

## Not independently re-verified

- VIS-4 (high-contrast exit colour) and other T3b bugs outside this batch — out of scope for V3, not touched.
- Reduced-motion for the camera jump / explosion confetti — out of scope (already covered by T3b/E-workstream); only the title strip's reduced-motion behaviour was re-checked here since it's the CMP-2 fix area.
