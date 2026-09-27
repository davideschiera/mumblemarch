RESULT: PASS

# Re-check — W3 fixes to `docs/design/LEVELS.md` / `docs/design/mockups/levels-preview.html`

Independent re-validator. Did not re-derive geometry from scratch; scope is limited to verifying
the author's W3 fixes and any collateral changes against the two "Resolution (W3)" sections in
`docs/design/validation/levels-1-6.md` and `levels-7-12.md`. Evidence: read the sim source, ran
`window.runChecks()` in a live Chrome page, wrote a Node script to diff every `LevelDef` block, and
wrote my own 1‑px sweeps against the exact `window.MumbleSim.simulate()` function the page uses
(not a reimplementation).

## Checks table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Sim fidelity fixes (builder head-bump, basher 16×10, miner 16×13) | PASS | Code quoted below |
| 2 | All 12 levels pass in `window.runChecks()` | PASS | All 12 rows `"pass":true`; only the generic ignorable file: console notice |
| 3a | L7 miner window `[72,195]` | **MISMATCH** (minor) | True sim window is `[24,195]`; left-edge rationale in the doc does not reproduce |
| 3b | L12 miner window `[1040,1083]`, ≥32 px | PASS | Sweep: 1083 succeeds, 1084 tings; window is 44 px; left edge = physical start of the heap |
| 3c | Spot-check: L3 builder `[208,223]` | PASS | Sweep matches exactly |
| 3d | Spot-check: L4 basher `[139,149]` / `[285,295]` | PASS | Sweep matches on left edge exactly; right edge consistent (methodology-limited) |
| 4 | Collateral changes (L1 steel pad, L11 time→300s, +1 spare L1–L3) | PASS | See below |
| 5 | Data consistency, all 12 `LevelDef` blocks vs `levels-data.js` | PASS | Node script, deep-equal, `RESULT: ALL MATCH` |
| 6 | Fairness spot-check on changed levels | PASS | drops/grid/width all satisfied (see below) |

## 1. Sim fidelity fixes

`docs/design/mockups/levels-preview.html`:

- **Builder head-bump**, line 203 (inside `build()`'s `f===0` branch, after `m.x` has been
  advanced by `dir` twice from the pre-step x0):
  ```js
  if (solid(m.x, m.y - 9)) { turn(m); toWalk(m); return; }   // m.x = x0 + 2·dir here: head bump at (x0 + 2·dir, y − 9)
  ```
  Matches the Resolution's claim and D7/notes-mechanics §C ("Terrain at (x+2dx, y−9) → head bump").

- **Basher mask**, lines 212-216:
  ```js
  var mx0 = m.dir > 0 ? m.x - 8 : m.x - 7, mx1 = m.dir > 0 ? m.x + 7 : m.x + 8;   // full 16×10 mask at the sprite box
  ...
  for (var y = m.y - 10; y <= m.y - 1; y++) for (var x = mx0; x <= mx1; x++) removePx(x, y);
  ```
  Facing right: x ∈ [x−8, x+7], y ∈ [y−10, y−1] — exactly the claimed 16×10 mask; mirrored for
  facing left. The narrower "forward half" (x0/x1, 8 px wide) is a separate steel/one-way test, not
  the removal mask.

- **Miner mask**, lines 235-239:
  ```js
  var mx0 = m.dir > 0 ? m.x - 7 : m.x - 8, mx1 = m.dir > 0 ? m.x + 8 : m.x + 7;   // full 16×13 mask (sprite box, +dir/+1 offset)
  ...
  for (var y = m.y - 11; y <= m.y + 1; y++) for (var x = mx0; x <= mx1; x++) removePx(x, y);
  ```
  Facing right: x ∈ [x−7, x+8], y ∈ [y−11, y+1] — 16×13, matches the claim exactly; mirrored for
  facing left. Consistent with D7 ("basher 16×10 mask") and notes-mechanics §C ("mask 0 (16×13)").

## 2. All 12 levels

Opened `levels-preview.html` in a background Chrome page and ran `window.runChecks()`:
all 12 entries return `"pass":true` (no-skill saved=0 at RR and RR99 for all; solution saved ≥
required; drops ok; time ok). `list_console_messages` shows only the generic, ignorable
`Unsafe attempt to load URL ... file:` notice — no real errors.

## 3. Documented windows

**L7 `diagonally-yours`, miner start — MISMATCH.** LEVELS.md and the Resolution both state
`x0 ∈ [72, 195]`, with the stated reason "a miner started left of x≈72 meets the bedrock steel
(y=120) and turns back." I swept x0 pixel-by-pixel using `window.MumbleSim.rasterize` +
`window.MumbleSim.simulate` directly (the exact functions `runChecks` uses, not a re-implementation):
for every x0 from 24 to 195 the miner mines through cleanly with **no** `ting` mark and lands safely
in the undercroft (drop 16–42 px); x0 = 196 is the first to `ting` against the parapet steel. So the
*true* sim window is **[24, 195]**, matching the original (pre-fix) validator's finding almost
exactly, not the currently-documented [72, 195]. Tracing the geometry: for x0 ≥ 24 the mining
diagonal always reaches the pre-carved undercroft cavity (x ≥ 152, y ≥ 88) before its y ever reaches
the bedrock steel band (y 120–127, which only exists for x ≤ 151) — the "turns back at the bedrock"
claim does not occur for any tested x0 ≥ 24. Further, LEVELS.md's *own* zero-skill section for this
level says "no skills: they pace between the left wall and the parapet" — i.e. the doc already
documents that a mumble's foot does reach the left wall (~x=24) during ordinary play, which
undercuts the idea that x < 72 is unreachable. **Net effect: not a solvability/fairness problem**
(72 ≤ 24, so the shipped window is only narrower than reality, and the shipped example x=150 is
unaffected either way) but the stated left-edge rationale is factually wrong per the same simulator
the doc cites. Graded **minor** — see Issues.

**L12 `last-shift-at-the-foundry`, miner start — confirmed.** Same sweep method: x0 = 1083
succeeds, x0 = 1084 tings against the plating — exact match to the documented `[1040, 1083]`
(44 px, ≥ 32 px so no pixel-precise click). The left edge (1040) is not an artifact: rasterizing the
level shows the surface height changes from y=56 (press-hall floor) to y=76 (heap top) exactly at
x=1040 — i.e. 1040 is the physical first pixel of the heap, a legitimate documented constraint
("from the heap top"), unlike L7's ungrounded left edge.

**Spot-check 1 — L3 `bridge-over-troubled-toffee`, builder window.** Swept x0 from 195–235 with a
synthetic single-mumble entrance and the real `simulate()`: x0 = 208–223 all reach the exit with no
burn death; 207 and below burn, 224 and above are already inside/past the gap. Exact match to the
documented `[208, 223]`.

**Spot-check 2 — L4 `the-punch-line`, basher windows.** Swept the mound (x100–148) and rock
(x240–289) approaches along the floor (y=112): mound succeeds from x=139 (138 and below give up
after one stroke without punching through, matching the doc's "a basher given earlier finds nothing
8–11 px ahead and stops after one stroke"); rock succeeds from x=285. Both left edges match the
documented `[139,149]` / `[285,295]` exactly; right edges are consistent (my harness can't spawn a
mumble past the physical rock/mound face, so 148/289 is as far right as directly testable, and no
contradiction was found).

## 4. Collateral changes

- **L1 steel pad under the hatch.** `{ kind: 'rect', x: 52, y: 76, w: 24, h: 8, material: 'steel' }`
  sits inside the existing shelf, directly under the hatch (entrance x=64). It is explained in both
  the hint text ("The stone pad under the hatch ... will not take a spade") and the verification
  block (blocks a digger from creating an 80 px fall for followers spawning at the hatch). It does
  **not** change the spawn drop: entrance (64,40) → shelf surface y=76 is still 36 px ≤ 40 (confirmed
  live: `runChecks()` reports `maxSpawn: 36` for `spade-expectations`). It removes a narrow strip
  (x 48–79, once the digger's ±4 px clearance is added) from the dig window but leaves 306 of 352
  shelf px open (`[31,47] ∪ [80,368]`, confirmed by my own sweep: `[20,47] ∪ [80,380]`, small edge
  differences from bank-slope artifacts in my synthetic-entrance harness, not a contradiction) — no
  pixel-precise click required.
- **+1 spare skill, L1–L3** (digger 4→5, floater 10→11, builder 4→5; L4's basher, already 5,
  unchanged). No zero-thought/degenerate solve appears: `runChecks()` still shows `noSkills.saved: 0`
  at both RR and RR99 for all three levels, and the intended-skill windows are unchanged and still
  wide (not narrowed to compensate) — the extra spare only raises the margin above the "≥3 spare"
  floor the original validator flagged as tight, it does not open a new route.
- **L11 time limit 240 → 300 s.** `timeLimitSeconds: 300` in the `LevelDef`, matches the table.
  Rationale given (digging near the far end of the window leaves a 136 s worst-case walk home,
  300 ≥ 2×136) checks out against the documented digger window `[240,435]`; `runChecks()` shows the
  documented example still finishes at 118.1 s, well inside 300 s (2.54×).

## 5. Data consistency

Wrote `compare-levels.js` (scratchpad) to extract all 12 ` ```ts ` `LevelDef` blocks from
LEVELS.md, strip the `import type` line and the `: LevelDef` type annotation, `vm.runInContext`
each as a plain object literal, and deep-equal it (recursively, key-by-key) against the matching
entry in `window.MUMBLE_LEVELS` loaded from `levels-data.js`. Output:

```
Extracted 12 LevelDef blocks from LEVELS.md
Loaded 12 levels from levels-data.js
OK   spade-expectations
OK   gently-down-the-dome
OK   bridge-over-troubled-toffee
OK   the-punch-line
OK   suction-cup-final
OK   not-one-step-bogward
OK   diagonally-yours
OK   one-pop-wonder
OK   clam-before-the-storm
OK   double-boiler
OK   wrong-side-of-the-hedge
OK   last-shift-at-the-foundry

RESULT: ALL MATCH
```

## 6. Fairness spot-check on changed levels (1, 2, 3, 4, 7, 11, 12)

- Route/walk-off drops ≤ 48 and spawn drops ≤ 40: confirmed live via `runChecks()` — every one of
  the 12 `drops.ok` fields is `true` (e.g. L1 44/36, L4 4/36, L7 42/28, L11 48/32, L12 42/16).
- Lethal drops ≥ 80 where used (L2 gantry→floor 96 px, L12 heap cliff exactly 80 px, both fenced or
  covered by a taught skill): unchanged by this round's fixes, already re-confirmed present in the
  rasterised grid.
- 4 px grid for steel/hazards on the changed geometry: L1's new steel pad (52,76,24,8) — all
  multiples of 4. L7/L11/L12 steel and hazard rects (unchanged by this round) remain all-multiples-
  of-4 by inspection of the `LevelDef` blocks.
- Width a multiple of 8: L1 400, L2 400, L3 480, L4 480, L7 640, L11 480, L12 1600 — all multiples
  of 8.

## Issues

1. **Minor — documentation accuracy, L7 `diagonally-yours` miner window.** LEVELS.md (and the W3
   Resolution) claim `x0 ∈ [72, 195]` with the reason "starts left of 72 ... turn at the bedrock."
   A 1‑px sweep using the page's own `window.MumbleSim.simulate()` shows no `ting` for any x0 from
   24 through 195 — the true safe window is `[24, 195]`, and the level's own zero-skill note ("they
   pace between the left wall and the parapet") already implies mumbles do reach ~x=24 in ordinary
   play. Not a solvability, fairness, or PASS-status defect (72 is inside the true safe range, and
   the shipped example x=150 has ample margin either way) — the window is merely narrower than
   necessary, in the safe direction, with an inaccurate stated reason.
   **Fix:** either widen the documented window to `[24, 195]` to match the simulator ground truth,
   or keep `[72, 195]` but replace the bedrock-steel justification with the correct one ("x < 72 is
   left of the entrance, so no mumble is ever there to assign a skill to").

No blocker or major issues found. All fixes described in the W3 Resolution sections reproduce as
described in the current `levels-preview.html` / `LEVELS.md` / `levels-data.js`, all 12 levels still
pass, and the collateral changes (L1 steel pad, +1 spare skill in L1–L3, L11 time limit) are sound
and introduce no unintended shortcuts.
