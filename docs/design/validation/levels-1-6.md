RESULT: PASS

# Validation — Levels 1–6 (`docs/design/LEVELS.md`)

Independent validator. Did not use the author's simulator as ground truth; all geometry below was
re-derived from `docs/design/mockups/levels-data.js` with a from-scratch Node rasteriser
(scanline rect/ellipse/polygon fill matching `compiler.ts`'s `add`/`behind`/`erase` semantics) and a
from-scratch walker/faller/climber/builder step simulator built directly from the D7 mechanics
contract and RESEARCH/notes-mechanics §B–C (not from the preview's `simulate()`). The author's
`window.runChecks()` output was then read as secondary/corroborating evidence, and its source was
read line-by-line for mechanics drift.

## Per-level summary

| # | Level | Geometry | Solution | Zero-skill | Format | Data-match | Sim row |
|---|---|---|---|---|---|---|---|
| 1 | spade-expectations | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 10/10 saved (need 5), digger 1/4 |
| 2 | gently-down-the-dome | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 7/12 saved (need 6), floater 7/10, 5 splat |
| 3 | bridge-over-troubled-toffee | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 12/15 saved (need 8), builder 1/4, 3 burn |
| 4 | the-punch-line | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 12/12 saved (need 6), basher 2/5, 0 dead |
| 5 | suction-cup-final | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 7/12 saved (need 6), climber 7/10 |
| 6 | not-one-step-bogward | ✓ | ✓ | ✓ | ✓ | ✓ | pass, 14/15 saved (need 9), blocker 1/4 |

`levels-data.js` object literals are byte-for-byte structurally identical (deep-equal, key-by-key)
to the `LevelDef` blocks in LEVELS.md for all 6 ids — no drift found.

## Arithmetic per level

**1. spade-expectations** — entrance (64,40) falls straight down to first solid pixel y=76 →
spawn drop **36 px** (≤40 ✓). Shelf at x=160 spans y=76..91, thickness **16 px** (≥8 ✓; 16 rows ×
8 ticks/row = 128 ticks ≈ 7.5 s, matches doc). Left bank: shelf(76) − bank-top(40) = **36 px** wall;
right bank: shelf(76) − bank-top(44) = **32 px** wall — both ≥7 px (=wall) and ≥12 px, so unclimbable
without a skill; walkable shelf runs x=32..367 (matches "burrow spans the whole walkable shelf").
After digging through (16 rows), digger falls 92→120 = 28 px; followers fall straight from the
shelf-top 76→120 = **44 px** (≤48 ✓). Exit (312,120) is solid with 28 px of clear air above (≥24 ✓).
No-skill: banks are walls both sides → pacing forever, exit unreachable → unsolvable.

**2. gently-down-the-dome** — entrance (24,20) lands at y=48, drop **28 px** (≤40 ✓). Gantry
(rect 40,48,136,6) covers x=40..175; walker steps off exactly at **x=176**, matching the doc. Straight
down from x=176 the next solid pixel is the floor at y=144 → drop **96 px** (≥80, clearly lethal
without floater ✓). Fall column x=176 is clear of the pool (x56..151) and the dome pedestal (rises
only past x≈340). Exit (304,144) solid, 128 px clear air above (≥24 ✓). Floater 10 supplied, sim uses
7 → 3 spare (≥3 ✓).

**3. bridge-over-troubled-toffee** — entrance (64,32) lands at y=64, drop **32 px** (≤40 ✓). Left
slab is solid x=0..223 (last walkable column 223); gap is x=224..235 = **12 px** (≤20, one builder
✓); right slab resumes at x=236. A 12-brick stair (6 px/brick, +2 px across / −1 px up, per D7) started
at x0 reaches its last brick over columns x0+22..x0+27; requiring that span to cover the last gap
column (235) gives x0 ≥ 208. The upper bound is set by the left slab's last walkable column (223) —
past that the mumble is already a faller and can't accept Builder. Window = **[208,223] = 16 px**,
matching "no pixel-precise clicks" (≥16 px). At x0=208 the stair ends at (232,52); stepping from
column 235 (brick, y≈52) to column 236 (natural slab, y=64) is a step-down of >3 px, so the walker
becomes a faller and drops **12 px** onto solid ground (≤48, safe) — exactly the "12 px" the doc
claims, and there is no unsupported column in between (safe by continuity, not by luck). Exit
(384,64) solid, 64 px clear air above. No-skill: everyone walks off x=224 into the fire pit below
(hazard y=128..155) → unsolvable.

**4. the-punch-line** — entrance (56,76) lands at y=112, drop **36 px** (≤40 ✓). Coral mound: solid
from x≈148 to x≈187, height from floor up to its peak (~y=42) is 70 px, i.e. a proper wall (≥7 px,
≥12 px). At the basher's cutting band (~y=100–110, near the floor) its width is 36–40 px — the doc's
"≈38 px" is accurate. Reef rock: solid from x≈289 to x≈358 near its base, full height to y=0
(112 px wall). At the basher's cutting band near the floor its width is **~52–54 px**, not the "≈48 px"
the doc states (see Issue #1 — minor, non-blocking: 10–11 strokes × 5 px = 50–55 px still clears it,
and the sim confirms 2 baskers/12 saved/0 losses). Exit (424,112) solid, 112 px clear air above.
No-skill: both obstructions are walls ≥7 px → pacing forever → unsolvable.

**5. suction-cup-final** — entrance (64,88) lands at y=120, drop **32 px** (≤40 ✓). Chimney face at
x=232 is solid continuously from y=64 down past the floor; from the floor foot (120) that's a
**56 px** wall (≥7, ≥12 ✓). Climbing 56 px at 0.5 px/tick (4 px/8 ticks per D7) = **112 ticks ≈ 6.6 s**,
matches the doc exactly. Above the climb column (x=232, y=13..63) is clear air — no overhang, so the
hoist onto the chimney top (y=64) always succeeds; nothing there turns a hoisted climber back into
the 56 px face. Walking off the chimney top (x=319→320) drops to the ledge at y=96, a **32 px** drop
(≤48 ✓). Exit (360,96) solid, ≥24 px clear air above. No-skill: 56 px wall, unclimbable → unsolvable.

**6. not-one-step-bogward** — entrance (160,64) lands at y=100 (hillock peak, right under the
hatch), drop **36 px** (≤40 ✓). Ground is solid x=0..319; at x=320 it drops straight to y=148 (a
buried floor under the water), but the water hazard (y=116..151) fills the intervening space, so
anyone who reaches x=320 drowns immediately, well before any fall-distance issue matters →
unsolvable with no skills. Blocker window: the field turns a mumble whose foot is 1–8 px from the
blocker's x, so the blocker must sit > 8 px right of the landing spot (x=160) → x ≥ 169; its own
right-hand field must stay on solid ground → x ≤ 311 (319 − 8). Window = **[169,311] = 143 px**
(doc says "≈140 px", consistent). Exit (40,104) solid, ≥24 px clear air above. Blocker 4 supplied,
1 used → 3 spare (≥3 ✓).

## Format checks (all 6)

- All `LevelDef` fields match `src/levels/format.ts`; no extraneous/missing keys.
- Width ∈ {400,400,480,480,400,480}, all multiples of 8; height = 160 for all.
- Hazard rects: `gently-down-the-dome` (56,148,96,12), `bridge-over-troubled-toffee`
  (160,128,160,28), `not-one-step-bogward` (320,116,120,36) — all four numbers on the 4 px grid.
  No steel used in levels 1–6 (first appears in level 7, out of scope).
- Stamps `boulder` and `mushroom` both exist in `src/levels/stamps.ts`.
- Every exit anchor is solid terrain with ≥24 px of clear air above it (checked: 28, 128, 64, 112,
  ≥24, ≥24 px respectively).
- Every entrance point is empty space (spawns falling), confirmed for all 6.
- Save/lemmings ratios (50%, 50%, 53.3%, 50%, 50%, 60%) match the Overview table and are all ≤60%
  (Breezy fairness ceiling; level 6 sits exactly on it, which is allowed).
- Introduced-skill spare count is exactly 3 in every level (digger 4−1, floater 10−7, builder 4−1,
  basher 5−2, climber 10−7, blocker 4−1) — meets the "≥3 spare" floor with no margin to spare, worth
  noting but not a violation.
- Time limit 300 s for all 6 (within the 4–5 min Breezy band) and ≥2× the sim's actual finish time
  in every case (ratios 4.1×–9.1×, well above the 2× floor).

## Zero-skill unsolvability

All 6 confirmed geometrically unsolvable with no skills, and independently corroborated by the
author's sim (`noSkills.saved: 0` at both RR 50 and RR 99, need ≥5/6/8/6/6/9): a hard wall/wall pair
(1, 4, 5), a ≥80 px lethal drop (2), a fire-pit gap (3), or an unavoidable water hazard beyond the
last walkable ground (6).

## IP check

Titles and hints for all 6 (Spade Expectations / Gently Down the Dome / Bridge Over Troubled Toffee
/ The Punch Line / Suction Cup Final / Not One Step Bogward) do not match any of the original
hint-titles listed in RESEARCH §6.1 ("Just dig!", "Only floaters can survive this", "Tailor-made for
blockers", "Now use miners and climbers", "You need bashers this time", "A task for blockers and
bombers", "Builders will help you here") or any other Lemmings/Oh No! title recognised. Layouts
(burrow-in-a-shelf, dome-and-gantry, toffee-gap, coral-and-reef, chimney climb, hillock-and-bog) read
as original compositions, not recreations of specific classic levels.

## Author's sim: mechanics-fidelity notes (secondary evidence, read from
`docs/design/mockups/levels-preview.html`)

The sim's core numbers match the D7 contract precisely where it matters for levels 1–6: splat
threshold (fc > 60 ⇒ drop ≥ 64 px splats, ≤63 safe — reproduced exactly via the fc/FC_STEP/WALK_OFF
constants), floater open point (fc > 16, ≈19 px, per-tick table `[3,3,3,3,-1,0,1,1]` then 2 px/tick),
digger (9 px wide, 1 row/8 ticks), builder brick cadence (16 ticks/brick, 12 bricks, +2/−1),
blocker field (12×12 px, turns feet 1–8 px away) and release interval formula all match. Two
deviations found, neither affecting levels 1–6:

1. **Minor (tool).** Builder head-bump check: in `build()`'s `f===0` branch, after advancing `m.x`
   by `dir` twice, the code checks `solid(m.x + 2*m.dir, m.y-9)` — that's 4·dir ahead of the
   pre-step x, not the contract's "x+2·dir" (D7/notes B: "terrain at (x+2dir, y−9) → head bump").
   No level 1–6 builder is near a ceiling, so this doesn't change any result here, but it should be
   fixed before it's relied on for a tighter level.
2. **Minor (tool).** Basher/miner terrain-removal width: the sim clears an 8 px-wide swath ahead of
   the sprite (`bash()`/`mine()`), vs. the contract's 16×10 / 16×13 masks (which extend behind the
   sprite too). The stopping checks (4 px clear 8–11 px ahead at y−6 for basher, checked every 2
   strokes; steel/one-way checks) are implemented faithfully. This narrower width doesn't change
   pass/fail for `the-punch-line` (confirmed independently by hand-rasterising the true 16-wide
   mask), but should be widened before validating basher/miner-heavy Knotty+ levels.

## Issues

1. **Minor — documentation accuracy.** `docs/design/LEVELS.md` §4 "the-punch-line", intended-solution
   step 3 and the Verification block, states the reef-rock obstruction is "≈48 px ≈ 10–11 strokes".
   Independent rasterisation of the reef-rock polygon at the basher's cutting height (y≈100–111, near
   the floor) gives **~52–54 px**, not 48. The stated stroke estimate still covers it (11 × 5 = 55 px
   ≥ 54 px) and the sim confirms the level passes (2 baskers used, 12/12 saved, 0 losses), so this is
   a wording nit, not a functional defect. Fix: change "≈48 px" to "≈52 px" in the hint text (no data
   change needed).
2. **Minor — spare-skill margin is exactly at the floor.** All 6 levels supply exactly 3 spare copies
   of their introduced skill (the design's own "≥3 spare" rule), with zero slack above that floor.
   Not a violation, just worth flagging if the "≥3" rule was meant to be a comfortable minimum rather
   than a target.
3. **Minor — sim tool deviations** (see above): builder head-bump offset and basher/miner mask width
   in `docs/design/mockups/levels-preview.html`. Cosmetic to levels 1–6; relevant to whoever tunes
   Knotty/Gnarly basher/miner/builder puzzles next.

No blocker or major issues found in levels 1–6.

## Resolution (W3)

All changes are made in the generator and regenerated, so the `LEVELS.md` code blocks and `mockups/levels-data.js` are still byte-identical (re-checked). The preview still reports 12/12 PASS and `levels-preview.png` has been re-taken.

- **Sim fidelity (issue 3, tool).**
  - Builder head-bump now tests (x0 + 2·dir, y − 9), where x0 is the builder's x before the step.
  - Basher removes the full 16×10 mask at the sprite box (x−8…x+7, y−10…y−1, mirrored when facing left).
  - Miner removes the full 16×13 mask (x−7…x+8, y−11…y+1, mirrored).
  - Steel and one-way are tested per pixel on each mask's forward half.
  - All 12 levels still pass with no geometry change needed.
- **Windows re-derived by 1 px sweeps** (the docs now quote these):

  | Level | Assignment | Window |
  |---|---|---|
  | L1 | digger | x ∈ [31, 47] ∪ [80, 368] |
  | L3 | builder | x0 ∈ [208, 223] (unchanged) |
  | L4 | basher, mound | x ∈ [139, 149] |
  | L4 | basher, rock | x ∈ [285, 295] |
  | L6 | blocker | x ∈ [161, 319] (was quoted as [169, 311]) |

  Basher windows are inherently the last ~11 px before a face (the stop scan at 8–11 px ahead); LEVELS.md says so explicitly.
- **L1 geometry fix found by the sweep.** Digging right under the hatch (x 64–68) let newcomers fall 40→120 = 80 px. A 24×8 steel landing pad now sits under the hatch (x 52..75, y 76..83), so a spade is refused there.
- **L4 wording (issue 1).** The reef rock is now "≈ 52 px ≈ 11 strokes ≈ 11 s" (the terrain comment says ~52–54 px at the base).
- **Spare skills (issue 2).** The introduced skill gets +1 in L1–L3: digger 5, floater 11, builder 5, i.e. 4 or 5 spare. This opens no new shortcut: each level's only route is still the taught skill.
