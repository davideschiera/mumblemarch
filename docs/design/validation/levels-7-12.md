RESULT: PASS (2 issues)

# Validation — Levels 7–12 (`docs/design/LEVELS.md`)

Independent validator. Method: (1) rasterised `docs/design/mockups/levels-data.js` myself in Node
(own port of the compiler's paint rules — rect/ellipse/polygon/stamp, add/behind/erase) to get
column surface profiles, spawn/route drops, wall/gap widths, and 4 px-grid checks; (2) extracted
the mechanics simulator verbatim from `docs/design/mockups/levels-preview.html` (it matches the D7
constants given to me exactly: TPS 17, BASH_T 16/ADV 5, MINE_T 24, DIG_T 8, BRICK_T 16/12 bricks,
FUSE 79/OHNO 16, TRAP_CD 34) and ran it myself as an independent driver — not by reading the
author's PASS/FAIL table — for the no-skill baselines, the documented solutions, and probes that
sweep the skill-assignment x across the claimed "safe windows" one pixel at a time; (3) opened the
author's own preview page with chrome-devtools (`window.runChecks()`) as secondary confirmation —
it reproduced the same numbers, as expected since it's the same code; (4) diffed every `LevelDef`
code block in LEVELS.md against `levels-data.js` programmatically.

## Per-level table

| # | Level | Geometry | Solution | Zero-skill | Format | Data-match | Sim row |
|---|---|---|---|---|---|---|---|
| 7 | diagonally-yours | PASS (drops/walls confirmed) | PASS but **window claim wrong** (issue 1) | PASS (paced, no exit reachable) | PASS | PASS (byte-identical) | pass:true, 20/20, maxDrop 42/28, 101.1s/240s |
| 8 | one-pop-wonder | PASS | PASS (crater/floor/steel confirmed) | PASS (trapped in hopper) | PASS | PASS | pass:true, 19/20, maxDrop 48/32, 96.8s/240s |
| 9 | clam-before-the-storm | PASS | PASS (crowd-vs-trickle math confirmed) | PASS (penned) | PASS | PASS | pass:true, 32/40, maxDrop 40/32, 145.4s/300s |
| 10 | double-boiler | PASS | PASS (ABBA, gap, blocker/builder windows all confirmed exactly) | PASS (west paced, east burns) | PASS | PASS | pass:true, 39/40, maxDrop 48/32, 105.6s/240s |
| 11 | wrong-side-of-the-hedge | PASS | PASS (climb/dig/one-way-fallback all confirmed) | PASS (penned) | PASS | PASS | pass:true, 30/30, maxDrop 48/32, 118.1s/240s |
| 12 | last-shift-at-the-foundry | PASS | PASS but **window claim wrong** (issue 2) | PASS (penned on dock) | PASS | PASS | pass:true, 52/60, maxDrop 42/16, 156.4s/360s |

All six: no-skill saved = 0 at both the level's RR and RR 99 (confirmed by direct simulation, not
just asserted). All six: MD `LevelDef` block byte-identical (`JSON.stringify` equal) to its
`levels-data.js` entry. All six: width is a multiple of 8 in [400,1600], height 160, ≤4 entrances,
all steel/one-way/hazard rects fall on the 4 px grid, only `boulder`/`mushroom` stamps used, and
every exit has 36–152 px of clear air above it (rule: ≥24 px).

## Arithmetic per level

**7. Diagonally Yours** (640×160, 20 mumbles, save 14/20=70%, RR50→28-tick interval, 240s)
- Spawn drop: entrance (72,20) → surface y=48 ⇒ 28 px ≤ 40. ✓ (re-derived by rasterisation)
- Ice wall: 128−54 = 74 px ≥ 12. ✓
- Miner descent: 2 px down per 4 px across (contract: +4 across/+2 down per 24-tick stroke) ⇒ 40 px
  down needs 80 px across, matching the doc's "reaches y=88 after 80 px across."
- **Re-simulated miner start window** (own driver, 1 px steps): succeeds for x0 ∈ [24,195]
  (172 px), fails from x0=196 on (`ting` against the steel parapet at x=232..335) all the way past
  the claimed right edge of 222. Claimed window [72,222] (150 px) does not match re-derivation on
  either edge — see Issue 1. The shipped example (x=150) has real margin either way (126/45 px) so
  the level itself is unaffected.
- Tunnel-mouth → floor: 128−88 = 40 px ≤ 48. ✓
- Full solution (own driver): 20/20 saved, 0 deaths, maxWalkOff 42, maxSpawn 28, last home 101.1 s
  vs 240 s limit (2.37×). Matches LEVELS.md exactly.

**8. One-Pop Wonder** (480×160, 20, save 15/20=75%, RR50, 240s)
- Spawn drop 24→56 = 32 ≤ 40. Hopper floor (rect 104,56,44,6) = 6 px ≤ 6 (at the limit, still legal).
- Bomber crater (contract ellipse x−8..x+7, y−14..y+7): removes down to foot+7, i.e. rows
  56..63 — comfortably breaches a 6-row floor regardless of stand position; `removePx` in the
  reference sim explicitly skips `Material.Steel`, confirming steel walls (24 px tall ≥ 12, at
  x96–104/x148–156) are never touched.
- Drop through hole 56→104 = 48 ≤ 48 (at the limit). Slag wall 104−40=64 ≥ 12.
- Own driver: 19/20 saved, 1 explode (the bomber itself), maxWalkOff 48, maxSpawn 32, last home
  96.8 s vs 240 s (2.48×). Matches.

**9. Clam Before the Storm** (640×160, 40, save 28/40=70%, RR20→43-tick interval, 300s)
- Release interval formula `floor((99−RR)/2)+4`: RR20 ⇒ floor(79/2)+4 = 39+4 = **43 ticks** (matches
  doc). RR99 ⇒ 0+4 = **4 ticks** (matches contract). Trap cooldown 2 s×17 = **34 ticks**.
- 43 > 34 ⇒ a trickle at RR20 loses (almost) every mumble to the trap: independently re-simulated
  (bash the gate immediately at RR20) → **1/40 saved**, 39 trap kills, confirming "trickle fails."
- 4 < 34 ⇒ a rush at RR99 mostly slips past: independently re-simulated → **33/40 saved**, 7 trap
  kills — confirms the documented alternative.
- Primary solution (hold the pen, bash after ~103 s): own driver gives **32/40 saved, 8 trap kills**
  — exact match to LEVELS.md's "sim: 8." maxWalkOff 40, maxSpawn 32, last home 145.4 s vs 300 s
  (2.06×).
- Gate wall: 16 px wide (rect 160,32,16,32) ⇒ ≈3 basher strokes at 5 px/stroke, matches "16 px ≈ 3
  strokes."

**10. Double Boiler** (1200×160, 40, save 32/40=80%, RR50, 240s, two hatches ABBA)
- Own rasteriser confirms both spawn drops = 32 px, west steel tray at x40–87/y64 (digger refused
  there, forcing the route), east gap exactly **x888..899 = 12 px** (surface jumps 64→152 and back,
  confirming a true hole, not just a sketch artifact), builder-window sweep confirms **[900,915]**
  bridges it exactly as claimed (895 fails, 916+ fails to complete the bridge in time), blocker
  window sweep confirms **x≥916** holds the crowd (910 leaks, 916 onward is clean well past the
  claimed 1063 upper bound — the claim is conservative, not wrong, in this direction).
- ENTRANCE_ORDER for 2 hatches = `[0,1,1,0]` (ABBA), matching the ids called out ("2nd east
  mumble" = id 2).
- Own driver: 39/40 saved, 1 explode (the sacrificed blocker), maxWalkOff 48, maxSpawn 32, last
  home 105.6 s vs 240 s (2.27×), required-count-home at 92.0 s (matches "92 s" claim exactly).

**11. Wrong Side of the Hedge** (480×160, 30, save 25/30=83%, RR50, 240s, one-way stretch)
- Hedge climb 72−28=44 px ≥12, climb time 44/0.5=**88 ticks** (matches contract exactly).
- Pen floor is genuinely steel (painted after the earth rect, confirmed in the rasterised grid),
  forcing the west-side route; yard floor is 12 rows of plain earth (y72–83, confirmed by column
  scan) over an already-open 36-row cavity (y84–119) down to the base floor (y120) — so the digger
  only clears 12 rows (~96 ticks ≈ 5.6 s, matches "12 rows ≈ 6 s") before falling 84→120 = 36 px;
  once open, followers fall 72→120 = 48 px (at the limit, still ≤48).
- Digger x-window sweep: works for x∈[240,432] (matches claimed 252..432 closely, conservative on
  the low side), fails outside the yard floor.
- **One-way fallback, independently re-tested**: swapped `one-way-left` material to plain `earth`
  in my own copy of the level object and reran the identical solution — still **30/30 saved**,
  confirming the "stretch: one-way" requirement holds.
- Own driver: 30/30 saved, 0 deaths, maxWalkOff 48, maxSpawn 32, last home 118.1 s vs 240 s (2.03×).

**12. Last Shift at the Foundry** (1600×160, 60, save 48/60=80%, RR50→99, 360s)
- Spawn drop 20→36=16≤40. Slag wall 36−8=28≥12, climb time 28/0.5=56 ticks (matches "≈56 ticks").
- Channel gap 12 px ≤20; builder-window sweep confirms **[448,463]** exactly (440 and 465 both
  fail) — matches the doc precisely.
- Heap cliff 76→156=80 px ≥80 (lethal by definition) but fenced by the steel parapet+overhang —
  confirmed present in the rasterised grid at the stated location.
- **Re-simulated miner start window**: succeeds for x0 ∈ [1040,1083] (44 px), fails from x0=1084
  on (steel `ting`) all the way to the claimed right edge of 1119. Claimed window [1040,1119]
  (80 px) overstates the true margin by more than 2× on the right edge — see Issue 2. The shipped
  example (x=1060) still has ~20–23 px of real margin either side, so not pixel-precise, but
  tighter than documented.
- Trap re-arm 3 s×17=51 ticks; own driver: 52/60 saved, 8 trap kills (exact match to "sim: 8"),
  maxWalkOff 42, maxSpawn 16, last home 156.4 s vs 360 s (2.30×), required-count-home 154.1 s
  (matches "154 s" claim).

## Zero-skill unsolvability

All six confirmed by direct simulation (not assertion): `saved = 0` with an empty assignment list
at both the level's own release rate and at RR 99, for every level 7–12. Geometrically this is
because each level's pen/hopper is bounded by either steel (7,8,9,10-west), a wall ≥28 px
(9's coral gate is earth but the un-bashed wall is 32 px; 11's hedge is 44 px; 12's slag wall is
28 px), or fire (10-east, 12), none of which a skill-less walker can cross.

## Sim deviations (secondary check)

Read `levels-preview.html`'s simulator source directly (not just the summary table). Confirmed
deviations the author lists in Notes §12 — instant step-up "jumps," rectangular basher/miner
masks, climber "tops out when the wall column ends" — and assessed each against my 6 levels:
- **Instant jumps**: shifts timing by at most a few ticks; irrelevant here since every level's
  margin is ≥2.03× the limit (max solve time 156 s vs the 156 s number itself would need to double
  to matter).
- **Rectangular miner/basher masks**: this is the direct cause of Issues 1 and 2 below — the mine
  stroke's steel-lookahead (≈9 px ahead, ≈11 px above current depth) triggers well before the
  naïve diagonal-endpoint math the LEVELS.md verification text uses. Because the *real* engine's
  masks will differ again (not rectangular), L12's true in-engine margin around the steel plating
  could be tighter still than the 44 px the sim shows — this specific spot deserves manual
  re-verification in the real engine before ship, more so than other spots in this batch.
- **Climber tops out at wall-column end**: Levels 11 and 12 both depend on this exact overhang
  check (Notes §8); I confirmed the overhang geometry exists at the documented coordinates in both
  levels, but did not independently reimplement the real engine's climber to compare — flagged as
  a known, already-acknowledged dependency, not a new finding.

No deviation found that would make an unsolvable level look solvable — the miner-window errors
found are inside a level that remains solvable and fair; they only overstate *how* forgiving the
click is.

## Difficulty curve

Tiers match the overview table: 7–9 = tier 2 (Knotty), 10–11 = tier 3 (Gnarly), 12 = tier 4
(Stampede). Save %: 70/75/70 (Knotty) → 80/83 (Gnarly) → 80 (Stampede) — rises tier-to-tier,
plateaus rather than dips within a tier; 12's 80% sitting below 11's 83% is a mild non-monotonic
step but stays inside the stated "70–90%" band and the design brief explicitly targets 80% for the
finale, so not a defect. Time margins (own re-derivation): L7 2.37×, L8 2.48×, L9 2.06×
(Knotty avg 2.30×, matches the doc's "≈2.3×"), L10 2.27×, L11 2.03× (Gnarly avg 2.15×, matches
"≈2.1×"), L12 2.30×. All ≥2× per the fairness rule, all required-% ≤90%.

## IP check

Titles ("Diagonally Yours," "One-Pop Wonder," "Clam Before the Storm," "Double Boiler," "Wrong
Side of the Hedge," "Last Shift at the Foundry") and themes (observatory/foundry/reef/sugarworks/
mossgrove) do not match any level title or graphic set from *Lemmings* or *Oh No! More Lemmings*.
No layout reproduces a known original level. Clean.

## Issues

1. **[major] Wrong number — L7 `diagonally-yours` miner window.** LEVELS.md line (verification
   block) claims "any start x0 ∈ [72, 222] breaks into the undercroft ... = 150 px window." Running
   the documented mechanics myself (mine-stroke steel lookahead) shows the window is actually
   x0 ∈ [24,195] (172 px) — the claimed right edge (222) is wrong by 27 px; the level is only safe
   up to x0=195 before the miner hits the parapet steel and turns back. **Fix:** replace the
   diagonal-only arithmetic with the empirically re-verified bounds ([24,195]), or add a caveat
   that the plating clearance must subtract the mine check's ~9 px look-ahead / ~11 px
   look-above, not just the diagonal endpoint. Does not change the level's PASS status: the shipped
   example (x=150) has 45–126 px of real margin either side.

2. **[major] Wrong number — L12 `last-shift-at-the-foundry` miner window.** Same class of error:
   claimed "x0 ∈ [1040, 1119]" (80 px); re-simulated true window is x0 ∈ [1040,1083] (44 px) —
   fails from x0=1084 on, 35 px short of the claimed right edge. **Fix:** same as Issue 1. The
   shipped example (x=1060) still has ~20–23 px of real margin on each side (not pixel-precise),
   but the true margin is under half of what's documented, and — per the sim-vs-engine deviation
   note above — this is the one spot in this batch worth an extra manual pass once the real
   (non-rectangular) miner mask ships.

No blocker-level or minor issues found; both issues above are documentation/verification-arithmetic
defects that do not change any level's solvability, fairness, or PASS status.

## Resolution (W3)

All changes are made in the generator and regenerated, so the `LEVELS.md` code blocks and `mockups/levels-data.js` are still byte-identical (re-checked). The preview still reports 12/12 PASS and `levels-preview.png` has been re-taken.

- **Sim fidelity.**
  - Builder head-bump now tests (x0 + 2·dir, y − 9).
  - Basher uses the full 16×10 mask and miner the full 16×13 mask at the sprite box; steel and one-way are tested on each mask's forward half.
  - L7–L12 still pass with the same solutions (L12 saves 53/60).
- **Issue 1 (L7 miner window).** Re-swept: x0 ∈ **[72, 195]** (124 px). Starts left of 72 miss the undercroft and turn at the bedrock steel. Starts right of 195 touch the plating (x ≥ 232) within their first 7 cycles and ting. Steps and verification are updated. Your [24, 195] differs only on the left edge: in my sim, starts at x0 < 72 reach y = 88 before x = 152, then turn at the bedrock (recoverable, but not a first-try pass).
- **Issue 2 (L12 miner window).** Re-swept: x0 ∈ **[1040, 1083]** (44 px ≥ 32, so no geometry change). Text is updated with the plating explanation.
- **All other windows re-derived by 1 px sweeps** and quoted in LEVELS.md:

  | Level | Assignment | Window |
  |---|---|---|
  | L10 | digger | x ∈ [132, 287] |
  | L10 | blocker (walking left, after the builder mumble) | x ∈ [912, 1080] |
  | L10 | builder (facing left) | x0 ∈ [900, 915] |
  | L11 | scout basher | x ∈ [248, 258] (last ~11 px before the hedge) |
  | L11 | digger | x ∈ [240, 435] |
  | L12 | builder | x0 ∈ [448, 463] |
  | L12 | basher at the slag wall | x ∈ [269, 279] |

- **L11 time limit 240 → 300 s.** Digging near the far end of the yard leaves a longer walk home: the worst case in the window is 136 s, so 300 s ≥ 2× holds for every dig spot. With the documented spot (x = 320) the last mumble is home at 118 s.
- The note that the preview sim is not the real engine is updated in LEVELS.md → "Notes for architecture/dev" §12. A replay test per level in the real engine is still recommended, especially for L12's plating margin.
- **Recheck (V4) — L7 miner window corrected to x0 ∈ [24, 195]:** 0 tings anywhere in it. The left edge is the west wall where the crowd paces (x = 24); starts at x0 < 72 enter the undercroft through its west face, before the bedrock, which is only a backstop. The earlier [72, 195] came from my time check, not the mechanics: those starts only happen after the crowd paces back, and finish at up to 149 s. So the L7 limit is raised from 240 to 300 s (≥ 2 × 149). LEVELS.md and levels-data.js are regenerated and still identical; the preview still reports 12/12 PASS.
