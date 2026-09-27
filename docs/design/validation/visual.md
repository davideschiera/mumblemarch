RESULT: FAIL (2 issues)

Validator: independent V2 pass over `docs/design/mockups/sprites.js` (`window.MUMBLE_ART`), `docs/design/parts/visual.md`, and `docs/design/mockups/sprites-themes.html`/`.png`, against `docs/design/DESIGN_TASKS.md` (D1–D10), `src/core/types.ts` (`LEMMING_STATES`), and `src/levels/themes.ts` (`Theme`). All analysis was done read-only with Node scripts (`vm.runInNewContext`) in the scratchpad; no checked files were edited.

## Checks table

| # | Check | Result | Notes |
|---|---|---|---|
| 1 | Completeness | **FAIL** | `jumping` (one of 18 `LEMMING_STATES`) has no sprite entry anywhere in `sprites.js` or `visual.md` §3. Every other state/icon/overlay/object requirement is met — see detail below. |
| 2 | Size rules (walk ≤ 8×10) | PASS | `walking` = 8×10 exactly, `footX/footY` = (4,10). Full per-state max w×h table below. |
| 3 | Timing vs D7 mechanics | PASS | All 9 required cycles (walk 8, build 16, bash 16, mine 24, dig 8, climb 8, hoist 8, shrug 8, ohno 16 ticks) match `frames × ticksPerFrame` exactly. |
| 4 | Themes (ids, roles, ranges, ordering) | PASS | All 5 ids present; every `Theme` role present (plus the extended roles `visual.md` §8/V4 already flags as a pending `themes.ts` update); all palette indices in range; `palette[0] = '#000000'` in every theme; terrain colours (earth+surface+steel+bricks+builderBrick+oneWay) = 12 ≤ 16 in every theme; `earth[]`/`steel[]` are dark→light by WCAG luminance in every theme (0 ordering violations). |
| 5 | Contrast (WCAG recompute) | PASS | All recomputed pairs ≥ 3:1 (worst is steel seam vs background, 3.04–3.48 across themes). Recomputation vs `visual.md` §7's stated table: **0 discrepancies > ±0.1** across all 100 values (20 metrics × 5 themes) — the doc's numbers are correct. |
| 6 | Steel vs earth by pattern | PASS | Confirmed visually in `sprites-themes.png` (cropped close-up): steel renders as a square bevelled-plate/rivet grid, clearly distinct in shape from the 2:1 running-bond brick wall and the noisy/dithered earth fill next to it. |
| 7 | Render check | PASS (1 minor) | Page loads; `window.MUMBLE_ART` present; no visible error text in DOM. One console error logged (see issue #2) — looks like a devtools-automation artifact, not a page bug (no `<iframe>` in the source). |
| 8 | IP | PASS | No green or blue anywhere in the mumble's own 9 body/face keys (`o b B h c t T w p`); pause icon = two bars, not paw prints; "Pop all" icon = a radial starburst, not a mushroom cloud; the only "Lemm-" hits are `LemmingState`/`LEMMING_FRAMES`/"lemming id" code-identifier references in `visual.md` §8, permitted under D1's explicit code-identifier carve-out — no user-facing "Lemm-" string exists. |
| 9 | Visual twins | PASS | `visual.md` §4 names a visual twin for all 9 required cues: builder low bricks → amber pips + ring flash; steel hit/refused → `steelSpark`; oh-no → `ohno` sprite; exit → glow switch; explosion → pop star + particles; splat → `splatting` sprite + dust; drown → `drowning` sprite + ripple; burn → `burning` sprite; trap → trigger frames + floating tuft leaf. |

## Detail: check 1, completeness

- 17/18 `LEMMING_STATES` have a complete sprite entry (`frames`, `ticksPerFrame`, `footX`, `footY`): `falling, walking, climbing, hoisting, floating, splatting, blocking, building, shrugging, bashing, mining, digging, ohno, exploding, drowning, burning, exiting`. **`jumping` is missing** — no entry in `ART.sprites`, no row in `visual.md` §3, no mention of "jump" anywhere in `visual.md`/`DESIGN_TASKS.md`. `jumping` is the state used for the 2 px/tick rise over a 3–6 px ledge (`src/core/types.ts` comment, D7 "step-up ≤ 6 px").
- Every frame row within every state has a consistent width (0 mismatches across all 17 present states, checked programmatically row-by-row).
- Every character used in every sprite/icon/object frame exists in the palette or is `.`/space (0 bad characters found across sprites, icons, and all 5 themes' objects).
- 13 icons confirmed, all 16×16: `climber, floater, bomber, blocker, builder, basher, miner, digger, rrMinus, rrPlus, pause, fastForward, popAll` (a 14th key, `meta`, is icon metadata — order/labels — not a 14th icon).
- Overlays: `font3x5` (10 digits, 3×5 each), `digits` (5×7 outlined glyph), `pips` (13×5, 2×6), `hover` (13×15), `selected` (14×20), `steelSpark`, `refusal` (9×9 ✕), `pending` (9×11) — all present and dimensionally match `visual.md` §3's overlay table exactly.
- Objects: every one of the 5 themes has `entrance` (hatch: frame 0 closed, frames 1–3 opening, 24×20, ticksPerFrame 3, one-shot), `exit` (20×22, 4 frames × 4 ticks, loop), `trap` (idle 2×8 ticks, trigger 2×3 ticks, 16×16), `hazard` (surface 4×4 ticks + static deep, `kind` matching D4 exactly: mossgrove/observatory/reef = water, sugarworks/foundry = fire). Trap names match D4 (`snapjaw flytrap`, `cookie-cutter press`, `brass pendulum`, `piston hammer`, `snapping giant clam`).

## Detail: check 2, per-state max size (world px)

| State | w×h | State | w×h |
|---|---|---|---|
| falling | 10×10 | mining | 12×13 |
| walking | **8×10** | digging | 10×12 |
| climbing | 8×12 | ohno | 10×10 |
| hoisting | 11×12 | exploding | 16×16 |
| floating | 10×16 | drowning | 10×10 |
| splatting | 10×10 | burning | 8×12 |
| blocking | 12×14 | exiting | 10×13 |
| building | 10×10 | jumping | **missing** |
| shrugging | 10×10 | | |
| bashing | 12×10 | | |

Only `walking` is constrained by D3 (≤ 8×10); it sits exactly at the limit. All other states' larger footprints (props, splayed limbs) are consistent with `visual.md`'s own size column.

## Full recomputed contrast table (WCAG 1.4.11, ≥ 3:1)

All values below were recomputed independently from `sprites.js` hex values using sRGB-linearised relative luminance; every value matched `visual.md` §7's published table within ±0.1 (many to 3+ decimal places), so `visual.md`'s table is verified correct.

| Pair | mossgrove | sugarworks | observatory | foundry | reef |
|---|---:|---:|---:|---:|---:|
| Mumble body vs background | 7.84 | 7.58 | 8.09 | 8.04 | 7.27 |
| Mumble outline vs lightest earth | 8.99 | 9.68 | 9.32 | 8.75 | 9.12 |
| Mumble outline vs surface | 11.07 | 8.92 | 15.24 | 12.46 | 12.17 |
| Mumble outline vs surfaceHi | 15.43 | 15.51 | 16.85 | 8.00 | 15.64 |
| Tuft vs background | 11.82 | 11.41 | 12.19 | 12.11 | 10.95 |
| Darkest earth vs background | 3.76 | 3.83 | 3.84 | 3.80 | 3.71 |
| Mid earth (earth[1]) vs background | 5.17 | 5.32 | 5.20 | 5.20 | 4.91 |
| Surface vs background | 11.93 | 9.28 | 16.93 | 13.75 | 12.15 |
| Steel seam (steel[0]) vs background | 3.25 | 3.07 | 3.48 | 3.04 | 3.35 |
| Steel plate (steel[1]) vs background | 5.94 | 6.19 | 6.55 | 5.52 | 5.99 |
| Steel bevel (steel[2]) vs background | 10.30 | 12.16 | 11.64 | 9.84 | 10.27 |
| Brick vs background | 3.90 | 3.81 | 4.66 | 3.98 | 5.70 |
| Builder brick vs background | 13.76 | 13.09 | 14.95 | 14.54 | 11.54 |
| One-way arrow vs its edge | 13.17 | 6.80 | 11.41 | 12.19 | 14.94 |
| One-way edge vs lightest earth | 8.99 | 3.91 | 8.63 | 8.41 | 8.09 |
| Hazard surface vs background | 9.76 | 9.96 | 13.01 | 12.90 | 10.39 |
| Hazard deep vs background | 3.84 | 5.33 | 6.31 | 7.89 | 4.50 |
| Exit rim vs background | 7.72 | 16.14 | 11.64 | 11.95 | 8.95 |
| Exit glow vs doorway `n` | 16.27 | 14.01 | 14.88 | 15.67 | 16.10 |
| Trap main vs background | 7.44 | 12.81 | 8.32 | 7.44 | 6.07 |
| Hatch main vs background | 4.63 | 4.58 | 6.11 | 5.91 | 6.53 |

**Minimum observed ratio:** 3.04:1 (foundry, steel seam vs background) — still ≥ 3:1. No pair requires a non-colour fallback cue; all pass on colour alone. `earth[]` and `steel[]` luminance ordering: 0 violations across all 5 themes.

## Issue list

1. **Blocker** — `LEMMING_STATES` (`src/core/types.ts`, 18 entries) includes `jumping`, but `sprites.js` (`ART.sprites`) and `visual.md` §3's sprite table only cover the other 17 states. There is no sprite, no frame data, and no mention of `jumping` anywhere in the design docs — not even a note that it reuses another state's frames.
   **Fix:** add a `jumping` entry to `ART.sprites` in `docs/design/mockups/sprites.js` (short one-shot or loop cycle consistent with D7's "rising 2 px/tick up a 3–6 px ledge", e.g. 2–3 frames covering the ≤3-tick rise) and a corresponding row in `docs/design/parts/visual.md` §3's table (between `hoisting` and `floating`, or wherever the design lead prefers). If the intent is instead to reuse an existing pose (e.g. a `hoisting`-like frame) for `jumping`, that must be stated explicitly in `visual.md`, since silent reuse can't be told apart from an oversight.

2. **Minor** — Opening `docs/design/mockups/sprites-themes.html` via chrome-devtools logged one console error: `Unsafe attempt to load URL file:///…/sprites-themes.html from frame with URL file:///…/sprites-themes.html. 'file:' URLs are treated as unique security origins.` The page's HTML source contains no `<iframe>`/`window.open`/`location.href` (only `<script src="sprites.js">`), `window.MUMBLE_ART` loaded successfully, and the DOM shows no visible error text, so this looks like a devtools-automation artifact (the tooling attempting to frame/preview the same `file://` URL) rather than a real bug in the page.
   **Fix (verification only, no code change expected):** re-open the file directly in an ordinary browser tab (not through automated devtools) and confirm the console is clean there; if the error reproduces outside automation, investigate further.

## Non-issues worth noting (not counted above)

- `src/levels/themes.ts` still only defines the placeholder `meadow` theme; the 5 D4 themes from `sprites.js` haven't been ported into it yet. This is already tracked by `visual.md` §8 item **V4** as pending architecture work, not a defect in the checked design files — `sprites.js`'s theme objects already contain every field the current `Theme` interface requires (`background`, `palette[]` with index 0 transparent, `earth[]`, `surface`, `steel[]`, `bricks: [brick, mortar]`, `builderBrick`, `oneWay`), plus the extended fields V4 calls for.

## Resolution (W1)

- **Blocker 1 fixed.** `sprites.js` now has `sprites.jumping`: 2 frames (crouch → spring), 8×10, `ticksPerFrame` 1, foot (4,10) as for walking, `loop: true`.
  - It sits right after `walking`, so all 18 `LEMMING_STATES` are covered.
  - `parts/visual.md` §3 has a `jumping` row and its heading now says "all 18".
  - `sprites-themes.html` renders every `sprites` entry, so the new card appears automatically. `sprites-themes.png` was re-taken.
- **Minor 2:** no change. The "Unsafe attempt to load URL" message comes from devtools on `file://` pages and appears on every mockup.
