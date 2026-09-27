# Mumblemarch — Level book

Design phase · level worker · 2026-09-26. **12 original levels** across the four tiers (6 Breezy · 3 Knotty · 2 Gnarly · 1 Stampede), designed against the D7 mechanics contract in [`DESIGN_TASKS.md`](DESIGN_TASKS.md) and RESEARCH §2/§6.

- **Single source.** Every `LevelDef` block below and [`mockups/levels-data.js`](mockups/levels-data.js) are generated from one script, so they cannot drift. Dev pastes each block into `src/levels/data/<id>.ts` and registers it in `registry.ts` in this order.
- **Checked.** [`mockups/levels-preview.html`](mockups/levels-preview.html) rasterises every level with the compiler's paint rules and runs a D7 simulation. It checks that no skills → fail and that the intended solution passes; `window.runChecks()` returns the table as JSON. Screenshot: [`mockups/levels-preview.png`](mockups/levels-preview.png). **Result: all 12 PASS.**
- **Conventions.** World px, origin top-left, y down. Foot = the top solid pixel a mumble stands on. Drop = landing surface y − ledge surface y. Entrances are spawn points (hatch art sits 16 px above). Exits are foot anchors (the floor row under the doorway). Steel and hazard rects sit on the 4 px grid.
- **Windows are measured.** Every assignment window in this book was re-derived by sweeping the assignment x in 1 px steps through the preview sim (validation round 1, see `validation/levels-1-6.md` and `levels-7-12.md`). Basher windows are inherently the last ~11 px before a face (the basher stops at once if nothing is 8–11 px ahead).
- **Fairness rules used everywhere.** Route drops ≤ 48 px (spawn ≤ 40). Lethal drops ≥ 80 px. Nothing survivable in 49–79. One-builder gaps ≤ 20 px (all are 12). Walls that stop walkers ≥ 12 px. Dig floors ≥ 8 px. Bomber floors ≤ 6 px. No pixel-precise clicks: every non-basher assignment window is ≥ 16 px wide or position-independent, and pausing to assign is always allowed.

## Overview

| # | id | Title | Tier | Theme | New skill | Skills available | Save / total | Size | RR | Time |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `spade-expectations` | Spade Expectations | 1 Breezy | mossgrove | Digger | Digger 5 | 5/10 (50%) | 400 | 50 | 300 s |
| 2 | `gently-down-the-dome` | Gently Down the Dome | 1 Breezy | observatory | Floater | Floater 11 | 6/12 (50%) | 400 | 50 | 300 s |
| 3 | `bridge-over-troubled-toffee` | Bridge Over Troubled Toffee | 1 Breezy | sugarworks | Builder | Builder 5 | 8/15 (53%) | 480 | 50 | 300 s |
| 4 | `the-punch-line` | The Punch Line | 1 Breezy | reef | Basher | Basher 5 | 6/12 (50%) | 480 | 50 | 300 s |
| 5 | `suction-cup-final` | Suction Cup Final | 1 Breezy | foundry | Climber | Climber 10 | 6/12 (50%) | 400 | 50 | 300 s |
| 6 | `not-one-step-bogward` | Not One Step Bogward | 1 Breezy | mossgrove | Blocker | Blocker 4 | 9/15 (60%) | 480 | 50 | 300 s |
| 7 | `diagonally-yours` | Diagonally Yours | 2 Knotty | observatory | Miner | Basher 2, Miner 2 | 14/20 (70%) | 640 | 50 | 300 s |
| 8 | `one-pop-wonder` | One-Pop Wonder | 2 Knotty | foundry | Bomber | Bomber 2, Basher 2 | 15/20 (75%) | 480 | 50 | 240 s |
| 9 | `clam-before-the-storm` | Clam Before the Storm | 2 Knotty | reef | — (crowd & release rate) | Basher 2 | 28/40 (70%) | 640 | 20 | 300 s |
| 10 | `double-boiler` | Double Boiler | 3 Gnarly | sugarworks | — (multi-site) | Bomber 2, Blocker 2, Builder 2, Basher 2, Digger 2 | 32/40 (80%) | 1200 | 50 | 240 s |
| 11 | `wrong-side-of-the-hedge` | Wrong Side of the Hedge | 3 Gnarly | mossgrove | — (scout; one-way walls) · *stretch: one-way* | Climber 2, Basher 2, Digger 2 | 25/30 (83%) | 480 | 50 | 300 s |
| 12 | `last-shift-at-the-foundry` | Last Shift at the Foundry | 4 Stampede | foundry | — (finale) | Climber 2, Builder 2, Basher 2, Miner 2 | 45/60 (75%) | 1600 | 50 | 360 s |

### Difficulty curve

- **Breezy 1–6: one new verb each** (dig → float → build → bash → climb → block). All levels fit one or 1.2 screens (400–480 px). Save 50–60% with ≥ 3 spare skills, 5-minute clocks, and no timing pressure. Every hazard is either absent or sits beyond the lesson.
- **Knotty 7–9:** the last two verbs arrive in combination: miner (+ basher) and bomber sacrifice (+ basher). Then the first **crowd / release-rate** puzzle (a one-at-a-time trap beaten by packing the crowd). Save 70–75%; 1–2 spare skills; limits ≈ 2.3× the intended run.
- **Gnarly 10–11:** a **1200 px multi-site** level (two hatches, blocker + builder + bomber on one side while a digger + basher run the other). Then a **scout** level with one-way walls (*stretch: one-way*, plain-earth safe). Save 80–83%; limits ≈ 2.1×.
- **Stampede 12:** a **1600 px** finale with 60 mumbles, 75% to save (a fair margin around the crowd-timing trap) and one spare of each skill. It chains a climber scout, a bridge, a held crowd released in one rush past a trap, and a mined descent.

### Coverage checklist

| Requirement | Where |
|---|---|
| All 8 skills introduced by level 8 | Digger 1 · Floater 2 · Builder 3 · Basher 4 · Climber 5 · Blocker 6 · Miner 7 · Bomber 8 |
| Every theme ≥ 2× | mossgrove 1, 6, 11 · observatory 2, 7 · sugarworks 3, 10 · reef 4, 9 · foundry 5, 8, 12 |
| Hazards | water 2, 6 · fire 3, 10, 12 · trap 9 (clam), 12 (piston hammer) |
| Steel used meaningfully (≥ 3) | 1 (a small landing pad stops a shaft under the hatch) · 7 (the plating sets the right edge of the miner window; the bedrock is a backstop) · 8 (hopper walls, plus a patch under the hatch so a pop can never open the one spot a fresh spawn falls through) · 10 (steel tray: no lazy dig under the hatch) · 11 (steel pen floor + end wall with overhang) · 12 (bedrock, plating, parapet) |
| One-way walls (stretch) | 11 — intended solution verified with one-way painted as plain earth |
| Sacrifice level | 6 (blocker), 8 (bomber), 10 (blocker then bomber) |
| Release-rate / crowd level (Knotty+) | 9 (and again 12) |
| Multi-site, camera must move (Gnarly+) | 10 (sites ≈ 750 px apart), 12 |
| Widths | Breezy 400–480 · Knotty 480–640 · Gnarly 1200 / 480 · one level at 1600 (12) |

### How to read the sketches

One character is 8×8 px. Columns are labelled in px every 64 (`|`, with `:` every 32); rows are labelled with their y in px. `#` terrain · `S` steel · `<` `>` one-way (arrow = allowed bash direction) · `~` water · `^` fire · `T` trap · `H` hatch (spawn point in that cell) · `E` exit door (anchor under it) · `.` air. Thin features (< 12 of 64 px) may not show; exact coordinates are in the verification and the `LevelDef`.

---

## 1. Spade Expectations — `spade-expectations`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | mossgrove | 400×160 | 10 | 5 (50%) | 50 (every 28 ticks) | 300 s | Digger 5 |

**Hint:** *The burrow is right under your feet. Click a mumble, or use 1–8, X, Space — one spade is all it takes.*

**Lesson (new: Digger):** A digger goes straight down and stops by itself when it breaks through. Everyone follows into the hole.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384
     |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ..................................................
  8  ..................................................
 16  ..................................................
 24  ..................................................
 32  .#......H.......................................#.
 40  ####...........................................###
 48  ####..........................................####
 56  ####..........................................####
 64  ####..........................................####
 72  ######SSSS########################################
 80  ######SSSS########################################
 88  ##################################################
 96  ####..........................................####
104  ####..........................................####
112  #####..................................E....#.####
120  ##################################################
128  ##################################################
136  ##################################################
144  ##################################################
152  ##################################################
```

**Intended solution**

1. First mumble lands at x≈64 (spawn drop 36 px) and walks right.
2. Give it the **Digger** anywhere on the grass (x 31..47 or 80..368, e.g. x≈160, ~6 s). The stone pad under the hatch (x 52..75) will not take a spade.
3. It digs 16 rows (≈128 ticks ≈ 7.5 s) and drops into the burrow; the others wait in the shaft and fall in after it.
4. Everyone walks to the burrow door at x=312.

**Verification — `spade-expectations`**

```text
• spawn drop 40→76 = 36 px ≤ 40 ✓
• shelf 76..91 = 16 px thick ≥ 8 ✓ → 16 rows × 8 ticks = 128 ticks ≈ 7.5 s
• digger falls 92→120 = 28 px; followers fall 76→120 = 44 px ≤ 48 ✓
• banks: 76−40 = 36 px and 76−44 = 32 px walls ≥ 12 ✓ → with no skills they pace the shelf forever ✓ unsolvable
• dig window (sim sweep, 1 px steps): x ∈ [31, 47] ∪ [80, 368] = 306 px (no precise click); the steel pad stops a shaft under the hatch, where newcomers would fall 40→120 = 80 px
• 5 diggers − 1 = 4 spare ✓
• route ≈ 100 + 150 px ≈ 15 s walking + 7.5 s digging; limit 300 s ✓
• SIM no skills: 0/10 saved at RR 50, 0/10 at RR 99 (need 5) → unsolvable ✓
• SIM solution: 10/10 saved ≥ 5 ✓; losses: none; skills used 1 of 5
• SIM landings on the route: max walk-off drop 44 px ≤ 48 ✓, max spawn drop 36 px ≤ 40 ✓
• SIM time: required count home at 31 s, last mumble home at 60 s; limit 300 s ≥ 2 × 60 = 120 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'digger', idx: 0, x: 160 }] }
```
</details>

**Alternatives**

- Two diggers side by side: harmless, just wider hole.
- Digging at the far right is fine too (burrow spans the whole shelf).

**Decor / art notes:** Toadstools (`mushroom`, behind) on both bank tops (unreachable); pebbles half-buried in the burrow corners (≤ 6 px bump, jumpable); three root tips hang from the shelf.

**Draft `LevelDef`** → `src/levels/data/spade-expectations.ts`

```ts
import type { LevelDef } from '../format.ts';

export const spadeExpectationsLevel: LevelDef = {
  id: 'spade-expectations',
  title: 'Spade Expectations',
  tier: 1,
  hint: 'The burrow is right under your feet. Click a mumble, or use 1–8, X, Space — one spade is all it takes.',
  theme: 'mossgrove',
  width: 400,
  height: 160,
  lemmings: 10,
  saveRequired: 5,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { digger: 5 },
  entrances: [{ x: 64, y: 40 }],
  exits: [{ x: 312, y: 120 }],
  terrain: [
    { kind: 'rect', x: 0, y: 120, w: 400, h: 40, fill: 'strata' },
    { kind: 'polygon', points: [[0, 40], [24, 40], [30, 52], [32, 76], [32, 160], [0, 160]] },
    { kind: 'polygon', points: [[400, 44], [376, 44], [370, 56], [368, 76], [368, 160], [400, 160]] },
    { kind: 'rect', x: 24, y: 76, w: 352, h: 16 },
    { kind: 'rect', x: 52, y: 76, w: 24, h: 8, material: 'steel' },
    { kind: 'polygon', points: [[96, 92], [104, 92], [100, 99]] },
    { kind: 'polygon', points: [[180, 92], [186, 92], [183, 97]] },
    { kind: 'polygon', points: [[262, 92], [270, 92], [266, 100]] },
    { kind: 'stamp', stamp: 'boulder', x: 34, y: 116 },
    { kind: 'stamp', stamp: 'boulder', x: 352, y: 115, flipX: true },
    { kind: 'stamp', stamp: 'mushroom', x: 380, y: 37, op: 'behind' },
    { kind: 'stamp', stamp: 'mushroom', x: 4, y: 33, op: 'behind' },
  ],
};
```

---

## 2. Gently Down the Dome — `gently-down-the-dome`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | observatory | 400×160 | 12 | 6 (50%) | 50 (every 28 ticks) | 300 s | Floater 11 |

**Hint:** *It is a long way down to the observatory floor. Pack a puff for everyone.*

**Lesson (new: Floater):** A floater is permanent and survives any fall; give it before (or during) the drop.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384
     |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ..................................................
  8  ...............................##########.........
 16  ...H........................#####......#####......
 24  ...........................##..............###....
 32  .............................................##...
 40  ..............................................###.
 48  ######################..........................##
 56  ########.........................................#
 64  ######..........................................##
 72  #####...........................................##
 80  #####..........................................##.
 88  #####.........................................##..
 96  #####........................................###..
104  #####.......................................###...
112  #####.......................................####..
120  #####.......................................####..
128  #####.......................................####..
136  #####.................................E.....####..
144  #######~~~~~~~~~~~~###############################
152  ##################################################
```

**Intended solution**

1. Mumbles land on the tower top (y=48) and walk right along the gantry.
2. Give each one a **Floater** — at the hatch, on the gantry, or even while falling.
3. They step off the gantry end (x=176), open the puff after ≈19 px and drift to the floor (y=144).
4. Walk right to the exit at x=304.

**Verification — `gently-down-the-dome`**

```text
• spawn drop 20→48 = 28 px ≤ 40 ✓
• gantry 48 → floor 144 = 96 px ≥ 80 ✓ clearly lethal without a puff (splat) → unsolvable with no skills ✓
• floater: 19 px falling + 13 px opening + (96−32)/2 = 32 ticks ≈ 2.7 s descent
• fall column x=176 is clear of the pool (x 56..151) and pedestal (x 352..383) ✓
• 11 floaters − 6 needed = 5 spare ✓ (the sim gives 7)
• route 176 + 128 px ≈ 18 s per mumble; 12 released in 11×28 = 308 ticks ≈ 18 s; limit 300 s ✓
• SIM no skills: 0/12 saved at RR 50, 0/12 at RR 99 (need 6) → unsolvable ✓
• SIM solution: 7/12 saved ≥ 6 ✓; losses: 5 splat; skills used 7 of 11
• SIM landings on the route: max walk-off drop 0 px ≤ 48 ✓, max spawn drop 28 px ≤ 40 ✓
• SIM time: required count home at 31 s, last mumble home at 33 s; limit 300 s ≥ 2 × 33 = 66 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'floater', count: 7, minIdx: 0 }] }
```
</details>

**Alternatives**

- Floaters given mid-fall still work (they survive any landing once flagged).

**Decor / art notes:** Brick dome arc (ring of two ellipses trimmed by erase rects), telescope on a pedestal right of the exit, meltwater pool under the gantry (never on the route).

**Draft `LevelDef`** → `src/levels/data/gently-down-the-dome.ts`

```ts
import type { LevelDef } from '../format.ts';

export const gentlyDownTheDomeLevel: LevelDef = {
  id: 'gently-down-the-dome',
  title: 'Gently Down the Dome',
  tier: 1,
  hint: 'It is a long way down to the observatory floor. Pack a puff for everyone.',
  theme: 'observatory',
  width: 400,
  height: 160,
  lemmings: 12,
  saveRequired: 6,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { floater: 11 },
  entrances: [{ x: 24, y: 20 }],
  exits: [{ x: 304, y: 144 }],
  terrain: [
    { kind: 'ellipse', cx: 288, cy: 160, rx: 150, ry: 152, fill: 'bricks' },
    { kind: 'ellipse', cx: 288, cy: 160, rx: 143, ry: 145, op: 'erase' },
    { kind: 'rect', x: 0, y: 96, w: 400, h: 64, op: 'erase' },
    { kind: 'rect', x: 0, y: 0, w: 216, h: 96, op: 'erase' },
    { kind: 'rect', x: 0, y: 48, w: 40, h: 112, fill: 'bricks' },
    { kind: 'rect', x: 40, y: 48, w: 136, h: 6, fill: 'bricks' },
    { kind: 'polygon', points: [[40, 54], [40, 72], [68, 54]], fill: 'bricks' },
    { kind: 'rect', x: 40, y: 144, w: 360, h: 16, fill: 'solid' },
    { kind: 'rect', x: 56, y: 144, w: 96, h: 12, op: 'erase' },
    { kind: 'rect', x: 352, y: 112, w: 32, h: 32, fill: 'bricks' },
    { kind: 'polygon', points: [[358, 112], [368, 112], [398, 74], [390, 68]], fill: 'solid' },
    { kind: 'ellipse', cx: 362, cy: 112, rx: 6, ry: 5, op: 'behind', fill: 'solid' },
  ],
  hazards: [
    { kind: 'water', x: 56, y: 148, w: 96, h: 12 },
  ],
};
```

---

## 3. Bridge Over Troubled Toffee — `bridge-over-troubled-toffee`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | sugarworks | 480×160 | 15 | 8 (53%) | 50 (every 28 ticks) | 300 s | Builder 5 |

**Hint:** *Hot caramel below, sweet home beyond. Lay a staircase across the gap.*

**Lesson (new: Builder):** A builder lays 12 bricks, rising 1 px per 2 px, then shrugs. A short stair is enough to cross a narrow gap.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ............................................................
  8  ............................................................
 16  ........................................................#...
 24  ........H..............................................###..
 32  ........................................................##..
 40  ........................................................#...
 48  ####....................................................#...
 56  .##.............................................E.......#...
 64  ############################.###############################
 72  ############################.###############################
 80  #####...................##.....##...#..................#####
 88  #####..................................................#####
 96  #####..................................................#####
104  #####..............#....................#..............#####
112  #####..............#....................#..............#####
120  #####..............#....................#..............#####
128  #####..............#^^^^^^^^^^^^^^^^^^^^#..............#####
136  #####..............#^^^^^^^^^^^^^^^^^^^^#..............#####
144  #####..............#^^^^^^^^^^^^^^^^^^^^#..............#####
152  #####..............######################..............#####
```

**Intended solution**

1. First mumble lands at x≈64 and walks right (~9 s to the gap).
2. Give it the **Builder** when it is within ~16 px of the edge (x 208..223).
3. After ~7 bricks (≈ 7 s) the stair reaches over the right slab; followers that arrive earlier fall into the caramel (expect 2–3 losses).
4. Everyone walks up the stair, drops 12 px onto the right slab and exits at x=384.

**Verification — `bridge-over-troubled-toffee`**

```text
• spawn drop 32→64 = 32 px ≤ 40 ✓
• gap x 224..235 = 12 px ≤ 20 ✓ (one builder)
• builder window: stair end x0+27 must reach x ≥ 235 → x0 ∈ [208, 223] = 16 px wide (≈ 1 s at 1 px/tick, and pausing is allowed); sim sweep confirms [208, 223] ✓
• drop from stair top (y≈52) to right slab (64) = 12 px ✓
• no skills: they walk off the edge into caramel (fire at y ≥ 128) ✓ unsolvable
• 15 − 8 = 7 losses allowed; 5 builders − 1 = 4 spare ✓
• route ≈ 330 px ≈ 20 s + 12 s building; limit 300 s ✓
• SIM no skills: 0/15 saved at RR 50, 0/15 at RR 99 (need 8) → unsolvable ✓
• SIM solution: 12/15 saved ≥ 8 ✓; losses: 3 burn; skills used 1 of 5
• SIM landings on the route: max walk-off drop 12 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 39 s, last mumble home at 46 s; limit 300 s ≥ 2 × 46 = 92 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'builder', idx: 0, x: 216 }] }
```
</details>

**Alternatives**

- A second builder from the top of the first stair is harmless.
- Starting the stair further back (x < 208) leaves it short: its walkers drop into the caramel — use a spare builder on the stair tip.

**Decor / art notes:** Candy-striped slabs (`strata`), caramel drips under the slabs, a lollipop past the exit, gumdrop boulders on the vat rim, a cupcake (`mushroom` ×2) at the far left.

**Draft `LevelDef`** → `src/levels/data/bridge-over-troubled-toffee.ts`

```ts
import type { LevelDef } from '../format.ts';

export const bridgeOverTroubledToffeeLevel: LevelDef = {
  id: 'bridge-over-troubled-toffee',
  title: 'Bridge Over Troubled Toffee',
  tier: 1,
  hint: 'Hot caramel below, sweet home beyond. Lay a staircase across the gap.',
  theme: 'sugarworks',
  width: 480,
  height: 160,
  lemmings: 15,
  saveRequired: 8,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { builder: 5 },
  entrances: [{ x: 64, y: 32 }],
  exits: [{ x: 384, y: 64 }],
  terrain: [
    { kind: 'rect', x: 0, y: 64, w: 224, h: 16, fill: 'strata' },
    { kind: 'rect', x: 0, y: 80, w: 40, h: 80, fill: 'strata' },
    { kind: 'rect', x: 236, y: 64, w: 244, h: 16, fill: 'strata' },
    { kind: 'rect', x: 440, y: 80, w: 40, h: 80, fill: 'strata' },
    { kind: 'rect', x: 152, y: 112, w: 8, h: 48, fill: 'bricks' },
    { kind: 'rect', x: 320, y: 112, w: 8, h: 48, fill: 'bricks' },
    { kind: 'rect', x: 152, y: 152, w: 176, h: 8, fill: 'bricks' },
    { kind: 'polygon', points: [[196, 80], [204, 80], [200, 90]] },
    { kind: 'polygon', points: [[252, 80], [262, 80], [257, 92]] },
    { kind: 'polygon', points: [[290, 80], [296, 80], [293, 86]] },
    { kind: 'stamp', stamp: 'mushroom', x: 4, y: 50, scale: 2 },
    { kind: 'rect', x: 452, y: 38, w: 3, h: 26, fill: 'solid' },
    { kind: 'ellipse', cx: 453.5, cy: 30, rx: 9, ry: 9, fill: 'strata' },
    { kind: 'stamp', stamp: 'boulder', x: 150, y: 106 },
    { kind: 'stamp', stamp: 'boulder', x: 318, y: 106 },
  ],
  hazards: [
    { kind: 'fire', x: 160, y: 128, w: 160, h: 28 },
  ],
};
```

---

## 4. The Punch Line — `the-punch-line`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | reef | 480×160 | 12 | 6 (50%) | 50 (every 28 ticks) | 300 s | Basher 5 |

**Hint:** *Coral in the way? Punch straight through it — twice.*

**Lesson (new: Basher):** A basher tunnels sideways and stops by itself when it breaks through. Followers wait at the tunnel face.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ....................................#########...............
  8  ....................................#########...............
 16  ....................................#########...............
 24  ....................................#########...............
 32  ....................................#########...............
 40  .....................##.............#########...............
 48  ...................####.............#########...............
 56  ...................####.............#########...............
 64  ...................####.............#########...............
 72  .......H..........######............#########...............
 80  ..................######.............#######................
 88  ..................######.............#######................
 96  ..................######.............#######................
104  #.................######.............#######.........E...#..
112  ############################################################
120  ############################################################
128  ############################################################
136  ############################################################
144  ############################################################
152  ############################################################
```

**Intended solution**

1. Mumbles land at x≈56 and walk right to the coral mound (x≈150).
2. Give the first one a **Basher** as it reaches the mound (x 139..149, ~5 s): ≈ 38 px ≈ 8–9 strokes ≈ 8 s.
3. It walks on to the reef rock; give it (or anyone) a second **Basher** at the rock face (x 285..295): ≈ 52 px ≈ 11 strokes ≈ 11 s.
4. All walk out to the exit at x=424.

**Verification — `the-punch-line`**

```text
• spawn drop 76→112 = 36 px ≤ 40 ✓
• coral mound rises 112−50 = 62 px, reef rock is full height: both ≥ 12 ✓ walls
• tunnels are 10 px tall on a flat floor: no drops at all on the route ✓
• basher windows (sim sweep): mound x ∈ [139, 149], rock x ∈ [285, 295] — the last ~11 px before each face (a basher given earlier finds nothing 8–11 px ahead and stops after one stroke, costing a skill but nothing else; pause-and-assign makes it easy)
• no skills: they pace between the left edge and the mound ✓ unsolvable
• 5 bashers − 2 = 3 spare ✓
• route 370 px ≈ 22 s + ~18 s bashing; limit 300 s ✓
• SIM no skills: 0/12 saved at RR 50, 0/12 at RR 99 (need 6) → unsolvable ✓
• SIM solution: 12/12 saved ≥ 6 ✓; losses: none; skills used 2 of 5
• SIM landings on the route: max walk-off drop 4 px ≤ 48 ✓, max spawn drop 36 px ≤ 40 ✓
• SIM time: required count home at 42 s, last mumble home at 74 s; limit 300 s ≥ 2 × 74 = 148 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'basher', idx: 0, x: 146, dir: 1 }, { skill: 'basher', idx: 0, x: 292, dir: 1 }] }
```
</details>

**Alternatives**

- Any mumble can do either bash; a basher given in open water just stops again after one stroke (wasted, not harmful).

**Decor / art notes:** Coral knobs (ellipses), a crack carved into the reef rock, an anemone (`mushroom`) past the exit, a shell (`boulder`) at the far left.

**Draft `LevelDef`** → `src/levels/data/the-punch-line.ts`

```ts
import type { LevelDef } from '../format.ts';

export const thePunchLineLevel: LevelDef = {
  id: 'the-punch-line',
  title: 'The Punch Line',
  tier: 1,
  hint: 'Coral in the way? Punch straight through it — twice.',
  theme: 'reef',
  width: 480,
  height: 160,
  lemmings: 12,
  saveRequired: 6,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { basher: 5 },
  entrances: [{ x: 56, y: 76 }],
  exits: [{ x: 424, y: 112 }],
  terrain: [
    { kind: 'rect', x: 0, y: 112, w: 480, h: 48, fill: 'strata' },
    { kind: 'polygon', points: [[150, 112], [148, 84], [156, 60], [168, 50], [180, 58], [188, 84], [186, 112]] },
    { kind: 'ellipse', cx: 160, cy: 52, rx: 8, ry: 6 },
    { kind: 'ellipse', cx: 178, cy: 50, rx: 6, ry: 8 },
    { kind: 'polygon', points: [[292, 0], [356, 0], [360, 40], [348, 112], [296, 112], [296, 80], [288, 60]], fill: 'strata' },
    { kind: 'polygon', points: [[312, 0], [316, 0], [320, 30], [314, 26]], op: 'erase' },
    { kind: 'stamp', stamp: 'mushroom', x: 452, y: 105, op: 'behind' },
    { kind: 'stamp', stamp: 'boulder', x: 2, y: 106 },
  ],
};
```

---

## 5. Suction Cup Final — `suction-cup-final`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | foundry | 400×160 | 12 | 6 (50%) | 50 (every 28 ticks) | 300 s | Climber 10 |

**Hint:** *The chimney is tall but grippy. Stick with it!*

**Lesson (new: Climber):** A climber is permanent: it scales any wall of 7 px or more and hoists over the top.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384
     |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ..................................................
  8  ##################################################
 16  ............#........................#............
 24  ............#........................#............
 32  .....................................#............
 40  ....................................##............
 48  .....................................#............
 56  ..................................................
 64  .............................###########........#.
 72  .............................###########.......###
 80  ........H....................###########.......###
 88  .............................###########.....E..#.
 96  .............................#####################
104  .............................#####################
112  .............................#####################
120  ##################################################
128  ##################################################
136  ##################################################
144  ##################################################
152  ##################################################
```

**Intended solution**

1. Mumbles land at x≈64 and walk right to the chimney face (x=232).
2. Give each one a **Climber** (at the hatch or on the floor).
3. They climb 56 px (≈ 112 ticks ≈ 6.6 s), hoist, walk the top and drop 32 px to the exit ledge.

**Verification — `suction-cup-final`**

```text
• spawn drop 88→120 = 32 px ≤ 40 ✓
• chimney face 120−64 = 56 px ≥ 12 ✓ wall
• drop from chimney top 64 to ledge 96 = 32 px ≤ 48 ✓
• nothing stands on the chimney top, so a hoisted climber never turns back towards the 56 px face ✓
• no skills: pace between the left edge and the chimney ✓ unsolvable
• 10 climbers − 6 needed = 4 spare ✓ (the sim gives 7); route ≈ 330 px ≈ 20 s + 7 s climb; limit 300 s ✓
• SIM no skills: 0/12 saved at RR 50, 0/12 at RR 99 (need 6) → unsolvable ✓
• SIM solution: 7/12 saved ≥ 6 ✓; losses: none; skills used 7 of 10
• SIM landings on the route: max walk-off drop 32 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 37 s, last mumble home at 38 s; limit 300 s ≥ 2 × 38 = 76 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'climber', count: 7, minIdx: 0 }] }
```
</details>

**Alternatives**

- None needed; extra climbers are harmless.

**Decor / art notes:** Ceiling pipes and a pipe elbow (all ≥ 12 px above any walkway), a cog past the exit.

**Draft `LevelDef`** → `src/levels/data/suction-cup-final.ts`

```ts
import type { LevelDef } from '../format.ts';

export const suctionCupFinalLevel: LevelDef = {
  id: 'suction-cup-final',
  title: 'Suction Cup Final',
  tier: 1,
  hint: 'The chimney is tall but grippy. Stick with it!',
  theme: 'foundry',
  width: 400,
  height: 160,
  lemmings: 12,
  saveRequired: 6,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { climber: 10 },
  entrances: [{ x: 64, y: 88 }],
  exits: [{ x: 360, y: 96 }],
  terrain: [
    { kind: 'rect', x: 0, y: 120, w: 232, h: 40, fill: 'bricks' },
    { kind: 'rect', x: 232, y: 64, w: 88, h: 96, fill: 'bricks' },
    { kind: 'rect', x: 320, y: 96, w: 80, h: 64, fill: 'bricks' },
    { kind: 'rect', x: 0, y: 8, w: 400, h: 4, fill: 'solid' },
    { kind: 'rect', x: 96, y: 12, w: 4, h: 20, fill: 'solid' },
    { kind: 'rect', x: 300, y: 12, w: 4, h: 28, fill: 'solid' },
    { kind: 'ellipse', cx: 390, cy: 80, rx: 10, ry: 10, fill: 'solid' },
    { kind: 'ellipse', cx: 390, cy: 80, rx: 4, ry: 4, op: 'erase' },
    { kind: 'rect', x: 300, y: 40, w: 4, h: 12, fill: 'solid' },
    { kind: 'rect', x: 292, y: 40, w: 12, h: 4, fill: 'solid' },
  ],
};
```

---

## 6. Not One Step Bogward — `not-one-step-bogward`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 1 Breezy | mossgrove | 480×160 | 15 | 9 (60%) | 50 (every 28 ticks) | 300 s | Blocker 4 |

**Hint:** *Everyone marches towards the bog. Somebody has to hold up a paddle.*

**Lesson (new: Blocker):** A blocker stands still and turns everyone around. It never leaves, so it costs one mumble.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ............................................................
  8  ............................................................
 16  ............................................................
 24  ............................................................
 32  ............................................................
 40  ........................................................###.
 48  .......................................................#####
 56  ....................H..................................#####
 64  ........................................................###.
 72  .........................................................#..
 80  .........................................................#..
 88  .........................................................#..
 96  ##...E...........######..........................#.......#..
104  ########################################.....#...#..#..#####
112  ########################################~~~~~#~~~#~~~~~#####
120  ########################################~~~~~~~~~~~~~~~#####
128  ########################################~~~~~~~~~~~~~~~#####
136  ########################################~~~~~~~~~~~~~~~#####
144  ############################################################
152  ############################################################
```

**Intended solution**

1. Mumbles land on the hillock at x≈160 and walk right towards the bog (edge x=320, ~9 s).
2. Give the first one a **Blocker** anywhere between x≈161 and x≈319 (e.g. x≈240).
3. Everyone else turns at the paddle and walks left to the exit at x=40.
4. When all others are home, press **Pop all** to finish (the blocker stays).

**Verification — `not-one-step-bogward`**

```text
• spawn drop 64→100 = 36 px ≤ 40 ✓
• no skills: the whole stream walks off x=320 into the bog (water y ≥ 116) ✓ unsolvable
• blocker window (sim sweep) x ∈ [161, 319] = 159 px wide: anywhere right of the landing spot (x=160) up to the bank edge ✓
• route back to the exit ≈ 120 px ≈ 7 s; limit 300 s ✓
• max 14 of 15 saved; need 9 → 5 spare losses; 4 blockers − 1 = 3 spare ✓
• SIM no skills: 0/15 saved at RR 50, 0/15 at RR 99 (need 9) → unsolvable ✓
• SIM solution: 14/15 saved ≥ 9 ✓; losses: none; skills used 1 of 4
• SIM landings on the route: max walk-off drop 0 px ≤ 48 ✓, max spawn drop 36 px ≤ 40 ✓
• SIM time: required count home at 34 s, last mumble home at 42 s; limit 300 s ≥ 2 × 42 = 84 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'blocker', idx: 0, x: 240 }] }
```
</details>

**Alternatives**

- A blocker at or left of the landing spot (x ≤ 160) fails: fallers land in its neutral middle or right arm and walk on to the bog. The hint says "between the landing spot and the bog".

**Decor / art notes:** Reeds stand in the bog away from the bank (fallers enter at x≈320), a willow on the far bank, a toadstool at the far left.

**Draft `LevelDef`** → `src/levels/data/not-one-step-bogward.ts`

```ts
import type { LevelDef } from '../format.ts';

export const notOneStepBogwardLevel: LevelDef = {
  id: 'not-one-step-bogward',
  title: 'Not One Step Bogward',
  tier: 1,
  hint: 'Everyone marches towards the bog. Somebody has to hold up a paddle.',
  theme: 'mossgrove',
  width: 480,
  height: 160,
  lemmings: 15,
  saveRequired: 9,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { blocker: 4 },
  entrances: [{ x: 160, y: 64 }],
  exits: [{ x: 40, y: 104 }],
  terrain: [
    { kind: 'rect', x: 0, y: 104, w: 320, h: 56 },
    { kind: 'ellipse', cx: 160, cy: 112, rx: 40, ry: 12 },
    { kind: 'rect', x: 320, y: 148, w: 120, h: 12, fill: 'strata' },
    { kind: 'rect', x: 440, y: 104, w: 40, h: 56 },
    { kind: 'polygon', points: [[364, 116], [366, 94], [369, 116]] },
    { kind: 'polygon', points: [[392, 116], [395, 90], [397, 116]] },
    { kind: 'polygon', points: [[414, 116], [416, 98], [419, 116]] },
    { kind: 'rect', x: 456, y: 60, w: 6, h: 44, fill: 'solid' },
    { kind: 'ellipse', cx: 459, cy: 56, rx: 18, ry: 14 },
    { kind: 'stamp', stamp: 'mushroom', x: 2, y: 97, op: 'behind' },
  ],
  hazards: [
    { kind: 'water', x: 320, y: 116, w: 120, h: 36 },
  ],
};
```

---

## 7. Diagonally Yours — `diagonally-yours`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 2 Knotty | observatory | 640×160 | 20 | 14 (70%) | 50 (every 28 ticks) | 300 s | Basher 2, Miner 2 |

**Hint:** *Straight down is too steep and the steel will not budge. Take the slanted way into the undercroft.*

**Lesson (new: Miner):** A miner digs down at 1:2, so the crowd walks down a gentle slope instead of falling. Steel stops it with a "ting".

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448     512     576
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :
  0  ###.............................................................................
  8  ###.............................................................................
 16  ###......H..............................SS......................................
 24  ###.....................................SS......................................
 32  ###.....................................SS......................................
 40  ###..........................SSSSSSSSSSSSS......................................
 48  #############################SSSSSSSSSSSSS######################.......#########
 56  ############################################................####........########
 64  ############################################................####................
 72  ############################################................####................
 80  ############################################................####................
 88  ###################.........................................####................
 96  ###################.........................................####................
104  ###################.........................................####................
112  ###################.........................................####................
120  SSSSSSSSSSSSSSSSSSS.........................................####.........E......
128  ################################################################################
136  ################################################################################
144  ################################################################################
152  ################################################################################
```

**Intended solution**

1. Mumbles land on the hill (y=48) at x≈72; a steel parapet at x=320 turns them back, so nobody is in danger.
2. Give the first mumble a **Miner** on bare earth between x≈24 and x≈195 (e.g. x≈150, ~5 s).
3. It tunnels 40 px down (≈ 20 cycles ≈ 28 s) and breaks into the undercroft ceiling; everyone follows down the slope and drops ≤ 40 px.
4. On the undercroft floor they walk right to the ice wall (x=480): **Basher** (32 px ≈ 7 strokes ≈ 7 s).
5. Exit at x=584.

**Verification — `diagonally-yours`**

```text
• spawn drop 20→48 = 28 px ≤ 40 ✓
• miner descends 2 px per 4 px: from the hilltop (y=48) the tunnel always reaches the undercroft (x 152..335, y 88..127) before the bedrock (y=120): through its roof for x0 ≥ 72, through its west face for x0 < 72 (e.g. x0=24 enters at x=152, y≈112). The left edge is simply the west wall where the crowd paces (x=24). Starts right of x=195 touch the plating (x ≥ 232) within their first 7 cycles and turn with a ting (the miner mask reaches 8 px ahead and ~11 px above its foot) → window (sim sweep, 0 tings) x0 ∈ [24, 195] = 172 px ✓; the bedrock plate is only a backstop
• drop from tunnel mouth (y≈88..112) to floor 128 = 16..40 px ≤ 48 ✓
• ice wall 128−54 = 74 px ≥ 12 ✓
• no skills: they pace between the left wall and the parapet ✓ unsolvable
• intended run (x0≈150): last mumble home ≈ 101 s (sim); worst start in the window (x0=24, only reachable after the crowd paces back from the parapet) ≈ 149 s → limit 300 s ≥ 2 × 149 ✓
• SIM no skills: 0/20 saved at RR 50, 0/20 at RR 99 (need 14) → unsolvable ✓
• SIM solution: 20/20 saved ≥ 14 ✓; losses: none; skills used 2 of 4
• SIM landings on the route: max walk-off drop 42 px ≤ 48 ✓, max spawn drop 28 px ≤ 40 ✓
• SIM time: required count home at 78 s, last mumble home at 101 s; limit 300 s ≥ 2 × 101 = 202 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'miner', idx: 0, x: 150, dir: 1 }, { skill: 'basher', x: 476, dir: 1, ymin: 120 }] }
```
</details>

**Alternatives**

- Starting left of the landing spot (x 24..71, once mumbles pace back from the parapet) also works; the tunnel enters the undercroft through its west face and the run just takes longer.
- Bashing the ice wall first is impossible (it is below the hill).

**Decor / art notes:** Striped hill (`strata`), brick hall roof, a dome eave over the exit. Steel plates double as the observatory's rivetted parapet.

**Draft `LevelDef`** → `src/levels/data/diagonally-yours.ts`

```ts
import type { LevelDef } from '../format.ts';

export const diagonallyYoursLevel: LevelDef = {
  id: 'diagonally-yours',
  title: 'Diagonally Yours',
  tier: 2,
  hint: 'Straight down is too steep and the steel will not budge. Take the slanted way into the undercroft.',
  theme: 'observatory',
  width: 640,
  height: 160,
  lemmings: 20,
  saveRequired: 14,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { miner: 2, basher: 2 },
  entrances: [{ x: 72, y: 20 }],
  exits: [{ x: 584, y: 128 }],
  terrain: [
    { kind: 'rect', x: 0, y: 128, w: 640, h: 32, fill: 'solid' },
    { kind: 'rect', x: 0, y: 48, w: 336, h: 80, fill: 'strata' },
    { kind: 'rect', x: 152, y: 88, w: 184, h: 40, op: 'erase' },
    { kind: 'rect', x: 336, y: 88, w: 304, h: 40, op: 'erase' },
    { kind: 'rect', x: 0, y: 120, w: 152, h: 8, material: 'steel' },
    { kind: 'rect', x: 232, y: 44, w: 104, h: 8, material: 'steel' },
    { kind: 'rect', x: 320, y: 16, w: 16, h: 32, material: 'steel' },
    { kind: 'rect', x: 336, y: 48, w: 16, h: 40, fill: 'strata' },
    { kind: 'rect', x: 336, y: 48, w: 160, h: 6, fill: 'bricks' },
    { kind: 'rect', x: 480, y: 54, w: 32, h: 74, fill: 'solid' },
    { kind: 'rect', x: 0, y: 0, w: 24, h: 48, fill: 'bricks' },
    { kind: 'polygon', points: [[560, 54], [640, 54], [640, 60], [600, 64]], fill: 'bricks' },
  ],
};
```

---

## 8. One-Pop Wonder — `one-pop-wonder`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 2 Knotty | foundry | 480×160 | 20 | 15 (75%) | 50 (every 28 ticks) | 240 s | Bomber 2, Basher 2 |

**Hint:** *Steel walls, a brick floor, and one brave volunteer.*

**Lesson (new: Bomber):** A bomber counts down 5 s, says "uh-oh" and pops a 16×22 crater. It costs one mumble, never hurts the others and never dents steel.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ............................................................
  8  ............................................................
 16  ...............H............................................
 24  ............................................................
 32  ............S.....SS........................................
 40  ####........S.....SS....................####................
 48  ####........S.....SS....................####.........####...
 56  ####........S##S##SS....................####.........####...
 64  ####........S.....SS....................####.........####...
 72  ############S.....SS########################..........##....
 80  ####....................................####..........##....
 88  ####....................................####..........##....
 96  ####....................................####.........E##....
104  ############################################################
112  ############################################################
120  ############################################################
128  ############################################################
136  ############################################################
144  ############################################################
152  ############################################################
```

**Intended solution**

1. Mumbles land in the steel hopper (floor y=56) and pace between its walls.
2. Give any one a **Bomber** (e.g. after ~20 s when most have landed). It pops wherever it stands: the hopper is only 44 px wide, so the crater always breaches the floor somewhere. A steel patch (x 120–128) is set into the floor right under the hatch's drop column: steel is never removed by an explosion, so whatever else the crater opens, a fresh spawn always lands on that patch (32 px, safe) instead of free-falling to the works floor below (PLAY-A1).
3. The crowd drops 48 px to the works floor and walks right to the slag wall (x=320): **Basher** (32 px ≈ 7 strokes).
4. Exit at x=424.

**Verification — `one-pop-wonder`**

```text
• spawn drop 24→56 = 32 px ≤ 40 ✓
• hopper floor 6 px thick ≤ 6 ✓; crater reaches foot+7 → rows 56..61 gone for ≈ 10 px width, except the steel patch x 120–128 (never removed) ✓
• steel walls 56−32 = 24 px above the floor ≥ 12 ✓; steel is never removed, so the hopper can only open downwards
• hatch drop column (x=124) always lands on the steel patch: spawn drop stays 24→56 = 32 px ≤ 40 no matter where or when the bomber pops (swept x 104..147 every 3 px × 11 pop times, incl. the very first mumble — see `tests/levels-l8-pop-anywhere.test.ts`) ✓
• drop through the hole 56→104 = 48 px ≤ 48 ✓
• slag wall 104−40 = 64 px ≥ 12 ✓
• no skills: trapped in the hopper ✓ unsolvable
• max 19 of 20 (1 bomber); need 15 = 75% → 4 spare; last mumble home ≈ 99 s (sim) → limit 240 s ≥ 2 × 99 ✓
• SIM no skills: 0/20 saved at RR 50, 0/20 at RR 99 (need 15) → unsolvable ✓
• SIM solution: 19/20 saved ≥ 15 ✓; losses: 1 explode; skills used 2 of 4
• SIM landings on the route: max walk-off drop 48 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 96 s, last mumble home at 99 s; limit 240 s ≥ 2 × 99 = 198 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'bomber', idx: 0, after: 400 }, { skill: 'basher', x: 316, dir: 1, ymin: 100 }] }
```
</details>

**Alternatives**

- Popping at the very first mumble works too, right at the hatch: the steel patch keeps every later spawn's landing safe, so it simply falls through the hole one by one from then on.
- Two bombers on the slag wall instead of the basher: each crater is 16 px, the wall is 32 px — needs both and still leaves a lip; the basher is the sane way.

**Decor / art notes:** Steam pipes run behind the hall above head height, a cog on a stand past the exit; hopper walls are riveted steel, and the floor's steel patch under the hatch reads as the same riveted metal.

**Draft `LevelDef`** → `src/levels/data/one-pop-wonder.ts`

```ts
import type { LevelDef } from '../format.ts';

export const onePopWonderLevel: LevelDef = {
  id: 'one-pop-wonder',
  title: 'One-Pop Wonder',
  tier: 2,
  hint: 'Steel walls, a brick floor, and one brave volunteer.',
  theme: 'foundry',
  width: 480,
  height: 160,
  lemmings: 20,
  saveRequired: 15,
  releaseRate: 50,
  timeLimitSeconds: 240,
  skills: { bomber: 2, basher: 2 },
  entrances: [{ x: 124, y: 24 }],
  exits: [{ x: 424, y: 104 }],
  terrain: [
    { kind: 'rect', x: 96, y: 32, w: 8, h: 48, material: 'steel' },
    { kind: 'rect', x: 148, y: 32, w: 8, h: 48, material: 'steel' },
    { kind: 'rect', x: 104, y: 56, w: 44, h: 6, fill: 'bricks' },
    { kind: 'rect', x: 120, y: 56, w: 8, h: 6, material: 'steel' },
    { kind: 'rect', x: 0, y: 104, w: 480, h: 56, fill: 'bricks' },
    { kind: 'rect', x: 0, y: 40, w: 32, h: 64, fill: 'bricks' },
    { kind: 'rect', x: 320, y: 40, w: 32, h: 64, fill: 'solid' },
    { kind: 'rect', x: 32, y: 72, w: 64, h: 4, fill: 'solid' },
    { kind: 'rect', x: 156, y: 72, w: 164, h: 4, fill: 'solid' },
    { kind: 'ellipse', cx: 440, cy: 60, rx: 14, ry: 14, fill: 'solid' },
    { kind: 'ellipse', cx: 440, cy: 60, rx: 6, ry: 6, op: 'erase' },
    { kind: 'rect', x: 436, y: 74, w: 8, h: 30, fill: 'solid' },
  ],
};
```

---

## 9. Clam Before the Storm — `clam-before-the-storm`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 2 Knotty | reef | 640×160 | 40 | 28 (70%) | 20 (every 43 ticks) | 300 s | Basher 2 |

**Hint:** *The giant clam naps after every snack. Send everyone past in one big rush.*

**Lesson:** Traps take one mumble, then need 2 s to re-arm. A packed crowd sneaks past; a trickle gets eaten one by one.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448     512     576
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :
  0  ..............................##################################################
  8  ................................#...................#...........................
 16  ......................###.......#...................#...........................
 24  #####.......H.........###.......................................................
 32  #####...............##..........................................................
 40  #####...............##..........................................................
 48  #####...............##..........................................................
 56  #####...............##..........................................................
 64  ############################....................................................
 72  ############################....................................................
 80  ############################....................................................
 88  ############################....................................................
 96  ############################............TT.......................#......E....#..
104  ########################################TT######################################
112  ################################################################################
120  ################################################################################
128  ################################################################################
136  ################################################################################
144  ################################################################################
152  ################################################################################
```

**Intended solution**

1. Mumbles land in the coral pen (floor y=64) and pace safely. RR starts at 20 (one every 43 ticks ≈ 2.5 s, slower than the clam's 2 s nap).
2. Wait until all 40 are in the pen (~102 s) — or raise the release rate to fill it faster.
3. Give a **Basher** to one walking right at the coral gate (x≈156): 16 px ≈ 3 strokes.
4. The crowd pours out, drops 40 px to the lagoon and rushes past the clam at x=320; it snaps one mumble per 2 s — about 1 in 8 of the packed crowd.
5. Exit at x=576.

**Verification — `clam-before-the-storm`**

```text
• spawn drop 32→64 = 32 px ≤ 40 ✓
• gate 64−32 = 32 px ≥ 12 ✓; pen left wall 40 px ✓
• drop off the ledge 64→104 = 40 px ≤ 48 ✓
• trap cooldown 2 s = 34 ticks; RR 20 interval = (99−20) div 2 + 4 = 43 ticks > 34 → a trickle loses every mumble; the pen (120 px) empties over ≈ 2 × 120 = 240 ticks → ≈ 240/34 ≈ 7–8 bites (sim: 8)
• no skills: penned forever (also at RR 99) ✓ unsolvable
• need 28/40 = 70% (sim saves 32); last mumble home ≈ 145 s → limit 300 s ≥ 2 × 145 ✓
• SIM no skills: 0/40 saved at RR 20, 0/40 at RR 99 (need 28) → unsolvable ✓
• SIM solution: 32/40 saved ≥ 28 ✓; losses: 8 trap; skills used 1 of 2 (engine replay: 31/40, 9 trap — see note 12)
• SIM landings on the route: max walk-off drop 40 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 142 s, last mumble home at 145 s; limit 300 s ≥ 2 × 145 = 290 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'basher', x: 156, dir: 1, after: 1760 }] }
```
</details>

**Alternatives**

- Raise RR to 99 right away and bash early: the stream arrives every 4 ticks and mostly slips past — also fine (same lesson).
- Bashing at once at RR 20: nearly everyone is eaten → fail, retry. That failure is the lesson.

**Decor / art notes:** Coral fan on the gate, a cave roof with drips over the lagoon, an anemone at the far end, a shell (5 px, jumpable) before the exit.

**Draft `LevelDef`** → `src/levels/data/clam-before-the-storm.ts`

```ts
import type { LevelDef } from '../format.ts';

export const clamBeforeTheStormLevel: LevelDef = {
  id: 'clam-before-the-storm',
  title: 'Clam Before the Storm',
  tier: 2,
  hint: 'The giant clam naps after every snack. Send everyone past in one big rush.',
  theme: 'reef',
  width: 640,
  height: 160,
  lemmings: 40,
  saveRequired: 28,
  releaseRate: 20,
  timeLimitSeconds: 300,
  skills: { basher: 2 },
  entrances: [{ x: 96, y: 32 }],
  exits: [{ x: 576, y: 104 }],
  terrain: [
    { kind: 'rect', x: 0, y: 64, w: 176, h: 16, fill: 'strata' },
    { kind: 'rect', x: 0, y: 24, w: 40, h: 40, fill: 'strata' },
    { kind: 'rect', x: 160, y: 32, w: 16, h: 32 },
    { kind: 'rect', x: 176, y: 64, w: 48, h: 16, fill: 'strata' },
    { kind: 'rect', x: 0, y: 104, w: 640, h: 56, fill: 'strata' },
    { kind: 'rect', x: 0, y: 80, w: 224, h: 24, fill: 'strata' },
    { kind: 'polygon', points: [[176, 32], [184, 16], [196, 20], [200, 32]], op: 'behind' },
    { kind: 'rect', x: 240, y: 0, w: 400, h: 8, fill: 'strata' },
    { kind: 'polygon', points: [[260, 8], [264, 8], [262, 30]] },
    { kind: 'polygon', points: [[420, 8], [425, 8], [422, 26]] },
    { kind: 'stamp', stamp: 'mushroom', x: 612, y: 97, op: 'behind' },
    { kind: 'stamp', stamp: 'boulder', x: 520, y: 99 },
  ],
  hazards: [
    { kind: 'trap', x: 320, y: 93, w: 12, h: 12, cooldownSeconds: 2 },
  ],
};
```

---

## 10. Double Boiler — `double-boiler`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 3 Gnarly | sugarworks | 1200×160 | 40 | 32 (80%) | 50 (every 28 ticks) | 240 s | Bomber 2, Blocker 2, Builder 2, Basher 2, Digger 2 |

**Hint:** *Two hatches, two kitchens, one exit in the middle. Keep both pots stirred.*

**Lesson:** Two groups need help at the same time, 800 px apart. Plan the camera: the west side is safe to leave, the east side is not.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448     512     576
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ##.........................................................................
  8  .#.........................................................................
 16  .#.........................................................................
 24  #####.......H.......................##.....................................
 32  #####...............................##.....................................
 40  #####...............................##.....................................
 48  #####...............................##.....................................
 56  #####...............................##.....................................
 64  #####SSSSSSSSSSS###############################################............
 72  ###############################################################............
 80  #####.............................................###......................
 88  #####.............................................###......................
 96  #####.............................................###......................
104  #####.............................................###......................
112  ############################################################.........#.....
120  ############################################################...............
128  ###########################################################################
136  ###########################################################################
144  ###########################################################################
152  ###########################################################################

          640     704     768     832     896     960     1024    1088    1152
      :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :
  0  ........................................................................##.
  8  ........................................................................#..
 16  ........................................................................#..
 24  ...........................................................H..........#####
 32  ......................................................................#####
 40  ......................................................................#####
 48  ......................................................................#####
 56  ......................................................................#####
 64  ...............#####################.######################################
 72  ...............#####################.######################################
 80  ...............###############........................................#####
 88  ...............###############........................................#####
 96  ..........#####################............#..........................#####
104  ..........#####################............#..........................#####
112  .....#....#####################............#..........................#####
120  E.........#####################^^^^^^^^^^^^#..........................#####
128  ###############################^^^^^^^^^^^^#..........................#####
136  ###############################^^^^^^^^^^^^#..........................#####
144  ###############################^^^^^^^^^^^^#..........................#####
152  ############################################..........................#####
```

**Intended solution**

1. Hatches alternate west/east/east/west (ABBA). West mumbles land on the slab at x≈96 (steel tray: no digging there).
2. West, ~7 s: **Digger** on the first west mumble on bare earth (x 132..287). The west crowd waits in the shaft and drops into the corridor.
3. East: mumbles land at x≈1072, walk right, turn at the east wall and come back left. At ~21 s give the 2nd east mumble a **Blocker** at x≈1000 (after the first one has passed it).
4. East, ~25 s: the first east mumble reaches the gap (x 900..915): **Builder** (facing left).
5. West, ~30 s: the ex-digger reaches the toffee door (x=400): **Basher** (24 px ≈ 5 strokes); the west crowd walks on to the exit.
6. East, ~33 s: bridge done → **Bomber** on the blocker. Its crater leaves a walkable bowl in the 16 px shelf; the east crowd crosses the bridge and steps down to the exit.

**Verification — `double-boiler`**

```text
• spawn drops: west 32→64 = 32 ✓, east 32→64 = 32 ✓
• west slab 16 px thick ≥ 8 ✓; digger falls 80→112 = 32 ✓; followers 64→112 = 48 ≤ 48 ✓
• west corridor → cooling floor 112→128 = 16 ✓
• east gap x 888..899 = 12 px ≤ 20 ✓; builder (facing left) window x0 ∈ [900, 915]; stair tip → plateau drop 12 ✓
• east plateau 64 → step 96 → floor 128: two 32 px drops ✓
• sim sweeps: digger x ∈ [132, 287]; blocker (walking left, after the builder mumble has passed) x ∈ [912, 1080]; builder (facing left) x0 ∈ [900, 915] ✓
• bomber on a 16 px shelf: crater bowl ≤ 8 px deep with ≤ 2 px steps → walkable ✓ (sim)
• no skills: west paces the slab; east walks into the caramel (fire y ≥ 120) ✓ unsolvable
• sacrifice 1 (blocker+bomber); need 32/40 = 80% (sim saves 39); last mumble home ≈ 106 s → limit 240 s ≥ 2 × 106 ✓
• SIM no skills: 0/40 saved at RR 50, 0/40 at RR 99 (need 32) → unsolvable ✓
• SIM solution: 39/40 saved ≥ 32 ✓; losses: 1 explode; skills used 5 of 10
• SIM landings on the route: max walk-off drop 48 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 92 s, last mumble home at 106 s; limit 240 s ≥ 2 × 106 = 212 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'digger', x: 150, dir: 1, ymax: 64 }, { skill: 'blocker', x: 1000, dir: -1, minIdx: 2 }, { skill: 'builder', x: 908, dir: -1 }, { skill: 'basher', x: 396, dir: 1, ymin: 100 }, { skill: 'bomber', target: 1, after: 500 }] }
```
</details>

**Alternatives**

- Builder first, blocker second: works if the blocker goes on before the 3rd east mumble reaches the gap.
- Skipping the blocker: east followers fall into the caramel while the stair grows — costs ~3–6 and may still pass.
- West bash before the dig is impossible (the door is below the slab).

**Decor / art notes:** Lollipops on both outer walls, cupcakes (`mushroom`) flanking the exit, gumdrops on the vat rim; candy-striped slabs.

**Draft `LevelDef`** → `src/levels/data/double-boiler.ts`

```ts
import type { LevelDef } from '../format.ts';

export const doubleBoilerLevel: LevelDef = {
  id: 'double-boiler',
  title: 'Double Boiler',
  tier: 3,
  hint: 'Two hatches, two kitchens, one exit in the middle. Keep both pots stirred.',
  theme: 'sugarworks',
  width: 1200,
  height: 160,
  lemmings: 40,
  saveRequired: 32,
  releaseRate: 50,
  timeLimitSeconds: 240,
  skills: { digger: 2, basher: 2, builder: 2, blocker: 2, bomber: 2 },
  entrances: [{ x: 96, y: 32 }, { x: 1072, y: 32 }],
  exits: [{ x: 600, y: 128 }],
  cameraX: 600,
  terrain: [
    { kind: 'rect', x: 0, y: 24, w: 40, h: 136, fill: 'strata' },
    { kind: 'rect', x: 40, y: 64, w: 248, h: 16, fill: 'strata' },
    { kind: 'rect', x: 40, y: 64, w: 88, h: 8, material: 'steel' },
    { kind: 'rect', x: 288, y: 24, w: 16, h: 56, fill: 'strata' },
    { kind: 'rect', x: 40, y: 112, w: 440, h: 48, fill: 'strata' },
    { kind: 'rect', x: 304, y: 64, w: 200, h: 16, fill: 'strata' },
    { kind: 'rect', x: 400, y: 80, w: 24, h: 32, fill: 'bricks' },
    { kind: 'rect', x: 480, y: 128, w: 240, h: 32, fill: 'solid' },
    { kind: 'rect', x: 680, y: 96, w: 40, h: 64, fill: 'strata' },
    { kind: 'rect', x: 720, y: 64, w: 168, h: 16, fill: 'strata' },
    { kind: 'rect', x: 720, y: 80, w: 120, h: 80, fill: 'strata' },
    { kind: 'rect', x: 840, y: 104, w: 8, h: 56, fill: 'bricks' },
    { kind: 'rect', x: 944, y: 104, w: 8, h: 56, fill: 'bricks' },
    { kind: 'rect', x: 840, y: 152, w: 112, h: 8, fill: 'bricks' },
    { kind: 'rect', x: 900, y: 64, w: 260, h: 16, fill: 'strata' },
    { kind: 'rect', x: 1160, y: 24, w: 40, h: 136, fill: 'strata' },
    { kind: 'rect', x: 8, y: 8, w: 3, h: 16, fill: 'solid' },
    { kind: 'ellipse', cx: 9.5, cy: 6, rx: 6, ry: 6, fill: 'strata' },
    { kind: 'rect', x: 1180, y: 8, w: 3, h: 16, fill: 'solid' },
    { kind: 'ellipse', cx: 1181.5, cy: 6, rx: 6, ry: 6, fill: 'strata' },
    { kind: 'stamp', stamp: 'mushroom', x: 548, y: 114, op: 'behind' },
    { kind: 'stamp', stamp: 'mushroom', x: 640, y: 114, op: 'behind', flipX: true },
    { kind: 'stamp', stamp: 'boulder', x: 838, y: 98 },
    { kind: 'stamp', stamp: 'boulder', x: 946, y: 98 },
  ],
  hazards: [
    { kind: 'fire', x: 848, y: 120, w: 96, h: 36 },
  ],
};
```

---

## 11. Wrong Side of the Hedge — `wrong-side-of-the-hedge`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 3 Gnarly | mossgrove | 480×160 | 30 | 25 (83%) | 50 (every 28 ticks) | 300 s | Climber 2, Basher 2, Digger 2 |

**Hint:** *The hedge only lets you cut it from the far side. Send a scout over the top.*

**Lesson:** One-way walls can only be bashed along their arrows. A lone climber gets to the right side and opens the way for everyone.

> **stretch: one-way.** This level uses `one-way-left` terrain. The intended solution only bashes *along* the arrows, so it still works if one-way walls ship as plain earth (verified by the sim with the material swapped to earth).

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ........................................................###.
  8  .......................................................#####
 16  ########................................................###.
 24  ###.........................<<<..........................#..
 32  ###.........H...............<<<..........................#..
 40  ###.........................<<<......................SSS####
 48  ###.........................<<<........................S####
 56  ###.........................<<<........................S####
 64  ###.........................<<<........................S####
 72  ###SSSSSSSSSSSSSSSSSSSSSSSSS<<<########################S####
 80  ############################<<<########################S####
 88  ###....................................................S####
 96  ###....................................................S####
104  ###....................................................S####
112  #####.E..................#.............................S####
120  ############################################################
128  ############################################################
136  ############################################################
144  ############################################################
152  ############################################################
```

**Intended solution**

1. Mumbles land in the pen (steel floor, y=72) at x≈96 and pace between the west wall and the hedge.
2. Give the first mumble a **Climber**. It climbs the hedge (44 px, ≈ 5 s), crosses the top and drops 44 px into the yard.
3. It walks right, climbs the steel end wall, bumps the overhang and falls back ≈ 17 px — now facing left.
4. At the hedge's right face (x 248..258): **Basher** — allowed, because it moves left along the arrows. The tunnel opens into the pen.
5. When most of the crowd is in the yard (~60 s), **Digger** anywhere on the yard floor (x 240..435): 12 rows ≈ 6 s.
6. The crowd drops into the tunnel, walks left under the pen and exits at x=48.

**Verification — `wrong-side-of-the-hedge`**

```text
• spawn drop 40→72 = 32 px ≤ 40 ✓
• hedge 72−28 = 44 px ≥ 12 ✓ (climb ≈ 88 ticks); drop off the hedge top 28→72 = 44 ≤ 48 ✓
• overhang at y 40..47 over x 424..447: climber falls off at y≈55 → drop ≈ 17 ✓; eave over the pen: fall ≈ 41 ✓
• yard floor 12 px ≥ 8 ✓; digger 84→120 = 36 ✓; followers 72→120 = 48 ≤ 48 ✓
• pen floor is steel → digger refused ✓ (steel forces the route)
• no skills: penned (hedge + west wall) ✓ unsolvable
• need 25/30 = 83% (sim saves 30); last mumble home ≈ 118 s with the dig at x=320, ≤ 136 s anywhere in the dig window → limit 300 s ≥ 2 × 136 ✓
• sim sweeps: basher (scout facing left) x ∈ [248, 258] — the last ~11 px before the hedge face; digger x ∈ [240, 435]
• Plain-earth fallback: if one-way walls are not built, the hedge is ordinary earth; the intended leftward bash still works ✓ (the crowd could also bash it rightwards — an easier alternative, acceptable).
• SIM no skills: 0/30 saved at RR 50, 0/30 at RR 99 (need 25) → unsolvable ✓
• SIM solution: 30/30 saved ≥ 25 ✓; losses: none; skills used 3 of 6
• SIM landings on the route: max walk-off drop 48 px ≤ 48 ✓, max spawn drop 32 px ≤ 40 ✓
• SIM time: required count home at 104 s, last mumble home at 118 s; limit 300 s ≥ 2 × 118 = 236 s ✓
• SIM one-way painted as earth: 30/30 saved with the same solution ✓
```

<details><summary>Sim solution data</summary>

```js
{ assignments: [{ skill: 'climber', idx: 0 }, { skill: 'basher', idx: 0, x: 250, dir: -1, ymin: 72, ymax: 72 }, { skill: 'digger', x: 320, dir: 1, ymin: 72, ymax: 72, after: 1000 }] }
```
</details>

**Alternatives**

- Second climber as a spare scout.
- Digging early is fine: late arrivals simply find the hole.

**Decor / art notes:** Willow on the east bank, mossy eave over the pen, toadstool beside the exit door, pebble in the tunnel (6 px, jumpable). A snapjaw flytrap was tried in the tunnel and removed: the 400 px pen+yard loop spreads the crowd too thin for a one-at-a-time trap.

**Draft `LevelDef`** → `src/levels/data/wrong-side-of-the-hedge.ts`

```ts
import type { LevelDef } from '../format.ts';

export const wrongSideOfTheHedgeLevel: LevelDef = {
  id: 'wrong-side-of-the-hedge',
  title: 'Wrong Side of the Hedge',
  tier: 3,
  hint: 'The hedge only lets you cut it from the far side. Send a scout over the top.',
  theme: 'mossgrove',
  width: 480,
  height: 160,
  lemmings: 30,
  saveRequired: 25,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { climber: 2, basher: 2, digger: 2 },
  entrances: [{ x: 96, y: 40 }],
  exits: [{ x: 48, y: 120 }],
  terrain: [
    { kind: 'rect', x: 0, y: 120, w: 480, h: 40, fill: 'strata' },
    { kind: 'rect', x: 0, y: 16, w: 24, h: 104 },
    { kind: 'rect', x: 0, y: 16, w: 64, h: 6 },
    { kind: 'rect', x: 24, y: 72, w: 200, h: 12 },
    { kind: 'rect', x: 24, y: 72, w: 200, h: 8, material: 'steel' },
    { kind: 'rect', x: 224, y: 28, w: 24, h: 56, material: 'one-way-left' },
    { kind: 'rect', x: 248, y: 72, w: 192, h: 12 },
    { kind: 'rect', x: 440, y: 40, w: 8, h: 80, material: 'steel' },
    { kind: 'rect', x: 424, y: 40, w: 24, h: 8, material: 'steel' },
    { kind: 'rect', x: 448, y: 40, w: 32, h: 80 },
    { kind: 'rect', x: 460, y: 12, w: 5, h: 28, fill: 'solid' },
    { kind: 'ellipse', cx: 462, cy: 12, rx: 16, ry: 10 },
    { kind: 'stamp', stamp: 'mushroom', x: 26, y: 113, op: 'behind' },
    { kind: 'stamp', stamp: 'boulder', x: 200, y: 115 },
  ],
};
```

---

## 12. Last Shift at the Foundry — `last-shift-at-the-foundry`

| Tier | Theme | Size | Mumbles | Save | Release rate | Time | Skills |
|---|---|---|---|---|---|---|---|
| 4 Stampede | foundry | 1600×160 | 60 | 45 (75%) | 50 (every 28 ticks) | 360 s | Climber 2, Builder 2, Basher 2, Miner 2 |

**Hint:** *Scout ahead, bridge the brass, and have the whole shift bunched up before the tunnel opens.*

**Lesson:** Everything at once: a scout, a bridge, a held crowd released in one rush past a trap, and a mined descent.

**Layout** (1 char = 8×8 px):

```text
     0       64      128     192     256     320     384     448     512     576     640     704     768
     |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |
  0  ........................................############################################################
  8  ######.............................####................................................#............
 16  ###.......H........................####................................................#............
 24  ###................................####................................................#............
 32  ##########################################################.#####....................................
 40  ##########################################################.#####....................................
 48  ##########################################################.#####....................................
 56  ##########################################################.#########################################
 64  ##########################################################.#########################################
 72  ##########################################################.#########################################
 80  ##########################################################.#########################################
 88  ##########......#######......#################.....####.......##############........################
 96  ########..........###..........#############.........##.......##########................############
104  ########....##....###....##....############...........#.......#########..................##########.
112  ########...####...###...####...############...........#^^^^^^^############............##############
120  ########...####...###...####...#############.........##^^^^^^^######################################
128  ##########..##..#######..##..#################.....####^^^^SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS
136  #######################################################^^^^^^^######################################
144  #######################################################^^^^^^^######################################
152  ####################################################################################################

         832     896     960     1024    1088    1152    1216    1280    1344    1408    1472    1536
     :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :   |   :
  0  ####################################################################################################
  8  ...........................................................................#........................
 16  ...........................................................................#........................
 24  ...........................................................................#........................
 32  ...........................................................................#........................
 40  ..............................................SSSS.........................#........................
 48  ..............................................SSSS.........................#........................
 56  ##############################..................SS.........................#........................
 64  ##############################..................SS........................##........................
 72  ########################################SSSSSSSSSS..................................................
 80  ##################################################..................................................
 88  ####.......#######################################..................................................
 96  ...............###################################..................................................
104  ................##################################...............................................#..
112  #.............####################################..............................................###.
120  ######################################.........................................................##.##
128  SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS..........................................................###.
136  ######################################...........................................................#..
144  ######################################................................TT.........................#..
152  ######################################################################TT###################E########
```

**Intended solution**

1. First mumble: **Climber** (at the hatch). It climbs the slag wall (28 px), drops 28 px onto the conveyor and walks to the brass channel.
2. At the channel edge (x 448..463): **Builder**. Meanwhile the crowd is safely penned on the dock by the slag wall.
3. Raise the release rate (e.g. to 99) so the whole shift is on the dock quickly.
4. When the stair reaches over the channel (~40 s): **Basher** on a crowd mumble at the slag wall (x 269..279, 32 px ≈ 7 strokes).
5. The shift rushes over the bridge, drops 20 px into the press hall and 20 px again onto the slag heap (both steps are walls on the way back, so nobody wanders back to the channel). First to reach the heap (usually the scout): **Miner** on the heap (x 1040..1083). The steel parapet (with an overhang, so even the climber scout bounces back) keeps everyone off the 80 px cliff.
6. Tunnel breaks into the undercroft; everyone drops 40 px, rushes the piston hammer (x=1360, 3 s re-arm) in a bunch and exits at x=1528.

**Verification — `last-shift-at-the-foundry`**

```text
• spawn drop 20→36 = 16 px ≤ 40 ✓
• slag wall 36−8 = 28 px ≥ 12 ✓ (climb ≈ 56 ticks); scout drop off its top 8→36 = 28 ✓
• channel gap x 464..475 = 12 px ≤ 20 ✓; builder window x0 ∈ [448, 463]; stair tip → lip drop 12 ✓
• lip 36 → hall 56 → heap 76: two 20 px drops ✓, and 20 px ≥ 12 walls on the way back ✓
• heap cliff at x=1200: 76→156 = 80 px ≥ 80 ✓ lethal, but fenced by the parapet (32 px + overhang)
• miner: 40 px down per 80 px across → from the heap top it breaks into the undercroft (x 1100..1199); its mask reaches 8 px ahead and ~11 px above the foot, so starts right of x=1083 touch the plating (x ≥ 1120) and turn with a ting → window (sim sweep) x0 ∈ [1040, 1083] = 44 px ✓ (≥ 32); bedrock steel (y=128) stops a miner started far back in the hall
• sim sweeps: builder x0 ∈ [448, 463]; basher at the slag wall x ∈ [269, 279] (last ~11 px before the face)
• undercroft drop 116→156 = 40 px ≤ 48 ✓
• no skills: penned on the dock ✓ unsolvable (also at RR 99)
• piston re-arms after 3 s = 51 ticks; the heap loop (144 px) empties over ≈ 290 ticks → ≈ 6–8 bites (sim: 8)
• need 45/60 = 75% ≤ 90 ✓ (sim saves 53), a 8-mumble margin over the piston toll so a slightly-spread (not perfectly bunched) release still wins — see PLAY-B1: a hint-following run that released the crowd only after the tunnel was already open (no bunching) still saved 48 ≥ 45 ✓; last mumble home ≈ 158 s → limit 360 s ≥ 2 × 158 ✓
• SIM no skills: 0/60 saved at RR 50, 0/60 at RR 99 (need 45) → unsolvable ✓
• SIM solution (RR raised to 99): 53/60 saved ≥ 45 ✓; losses: 7 trap; skills used 4 of 8
• SIM landings on the route: max walk-off drop 42 px ≤ 48 ✓, max spawn drop 16 px ≤ 40 ✓
• SIM time: required count home at 154 s, last mumble home at 158 s; limit 360 s ≥ 2 × 158 = 316 s ✓
```

<details><summary>Sim solution data</summary>

```js
{ releaseRate: 99, assignments: [{ skill: 'climber', idx: 0 }, { skill: 'builder', idx: 0, x: 456, dir: 1, ymin: 36, ymax: 36 }, { skill: 'basher', x: 276, dir: 1, ymin: 36, ymax: 36, after: 700 }, { skill: 'miner', x: 1060, dir: 1, ymin: 76, ymax: 76 }] }
```
</details>

**Alternatives**

- Waiting at RR 50 instead of raising it: the last mumble lands at ~99 s; still inside the time limit but the trickle behind the crowd feeds the hammer.
- Bashing the slag wall before the bridge is done drops the crowd into the brass — the hint says scout first.
- Bashing the slag wall *after* the tunnel has already broken through (PLAY-B1): the crowd meets no bottleneck and strings out along the 500 px hall, so it trickles past the hammer one at a time instead of bunching — still ≈ 48/60, hence the 45/60 requirement's margin. The hint's "before the tunnel breaks" now points players away from this.

**Decor / art notes:** Enclosed furnace arches carved under the dock, deck and hall (unreachable, ≥ 30 px of floor above each), little furnaces inside the dock arches, a gantry rail with hook chains and a crane hook high above the hall, a cog past the exit. The slag wall uses `solid` fill so it reads as a different material from the brick decks.

**Draft `LevelDef`** → `src/levels/data/last-shift-at-the-foundry.ts`

```ts
import type { LevelDef } from '../format.ts';

export const lastShiftAtTheFoundryLevel: LevelDef = {
  id: 'last-shift-at-the-foundry',
  title: 'Last Shift at the Foundry',
  tier: 4,
  hint: 'Scout ahead, bridge the brass, and have the whole shift bunched up before the tunnel opens.',
  theme: 'foundry',
  width: 1600,
  height: 160,
  lemmings: 60,
  saveRequired: 45,
  releaseRate: 50,
  timeLimitSeconds: 360,
  skills: { climber: 2, builder: 2, basher: 2, miner: 2 },
  entrances: [{ x: 80, y: 20 }],
  exits: [{ x: 1528, y: 156 }],
  terrain: [
    { kind: 'rect', x: 0, y: 156, w: 1600, h: 4, fill: 'bricks' },
    { kind: 'rect', x: 0, y: 8, w: 24, h: 148, fill: 'bricks' },
    { kind: 'rect', x: 0, y: 8, w: 48, h: 6, fill: 'solid' },
    { kind: 'rect', x: 24, y: 36, w: 256, h: 120, fill: 'bricks' },
    { kind: 'rect', x: 280, y: 8, w: 32, h: 148, fill: 'solid' },
    { kind: 'rect', x: 312, y: 36, w: 152, h: 120, fill: 'bricks' },
    { kind: 'rect', x: 476, y: 36, w: 32, h: 120, fill: 'bricks' },
    { kind: 'rect', x: 508, y: 56, w: 532, h: 100, fill: 'bricks' },
    { kind: 'rect', x: 1040, y: 76, w: 160, h: 80, fill: 'strata' },
    { kind: 'rect', x: 440, y: 88, w: 60, h: 68, op: 'erase' },
    { kind: 'rect', x: 476, y: 128, w: 624, h: 8, material: 'steel' },
    { kind: 'rect', x: 1100, y: 116, w: 100, h: 40, op: 'erase' },
    { kind: 'ellipse', cx: 104, cy: 112, rx: 44, ry: 28, op: 'erase' },
    { kind: 'ellipse', cx: 208, cy: 112, rx: 44, ry: 28, op: 'erase' },
    { kind: 'ellipse', cx: 388, cy: 112, rx: 44, ry: 26, op: 'erase' },
    { kind: 'ellipse', cx: 640, cy: 106, rx: 72, ry: 18, op: 'erase' },
    { kind: 'ellipse', cx: 860, cy: 106, rx: 72, ry: 18, op: 'erase' },
    { kind: 'ellipse', cx: 104, cy: 120, rx: 16, ry: 10, fill: 'solid' },
    { kind: 'ellipse', cx: 208, cy: 120, rx: 16, ry: 10, fill: 'solid' },
    { kind: 'rect', x: 96, y: 132, w: 16, h: 8, fill: 'solid' },
    { kind: 'rect', x: 200, y: 132, w: 16, h: 8, fill: 'solid' },
    { kind: 'rect', x: 1120, y: 72, w: 64, h: 8, material: 'steel' },
    { kind: 'rect', x: 1184, y: 44, w: 16, h: 32, material: 'steel' },
    { kind: 'rect', x: 1172, y: 44, w: 28, h: 8, material: 'steel' },
    { kind: 'rect', x: 320, y: 0, w: 1280, h: 4, fill: 'solid' },
    { kind: 'rect', x: 700, y: 4, w: 4, h: 26, fill: 'solid' },
    { kind: 'rect', x: 1400, y: 4, w: 4, h: 60, fill: 'solid' },
    { kind: 'ellipse', cx: 1402, cy: 68, rx: 6, ry: 5, fill: 'solid' },
    { kind: 'ellipse', cx: 1402, cy: 68, rx: 3, ry: 2, op: 'erase' },
    { kind: 'ellipse', cx: 1580, cy: 124, rx: 14, ry: 14, fill: 'solid' },
    { kind: 'ellipse', cx: 1580, cy: 124, rx: 6, ry: 6, op: 'erase' },
    { kind: 'rect', x: 1576, y: 138, w: 8, h: 18, fill: 'solid' },
  ],
  hazards: [
    { kind: 'fire', x: 440, y: 112, w: 60, h: 48 },
    { kind: 'trap', x: 1360, y: 145, w: 12, h: 12, cooldownSeconds: 3 },
  ],
};
```

---

## Proposed stamps

Only `boulder` and `mushroom` are used in the data above. These would add theme charm; `#` = solid, `.` = empty, same format as `src/levels/stamps.ts`. They are decor and belong on terrain tops or in unreachable spots (see the decor-layer note below).

```text
fern (mossgrove, 9×8)   cog (foundry, 10×10)   gumdrop (sugarworks, 8×6)   crystal (observatory, 7×10)   coral (reef, 10×8)
....#....               ...####...            ..####..                    ...#...                        .#..#...#.
.#..#..#.               .##.##.##.            .######.                    ..###..                        .##.#..##.
..#.#.#..               .#########            ########                    ..###..                        ..###.##..
#..###..#               ###....###            ########                    .#####.                        #..####..#
.#..#..#.               ##......##            ########                    .#####.                        .#######..
..#.#.#..               ##......##            ########                    #######                        ...####...
...###...               ###....###                                        #######                        ....##....
....#....               .#########                                        .#####.                        ....##....
                        .##.##.##.                                        ..###..
                        ...####...                                        ...#...
```

## Notes for architecture/dev

1. **Exit trigger vs foot row.** `EXIT_TRIGGER = { dx: -4, dy: -8, w: 8, h: 8 }` covers rows `y−8 … y−1` of the anchor. With the foot = the top solid pixel (`isSupported = isSolid(x, y)`), a mumble on the exit floor has foot y = anchor y, which is **outside** that box. Use `dy: -7, h: 8` (rows y−7…y), or define anchors one row higher. The sim uses x−4…x+3 × y−8…y.
2. **`op: 'behind'` paints solid terrain.** Decor stamps collide like any other terrain; a 7 px mushroom on a walkway is a wall. All decor here sits on bank tops, past exits, in ceilings or at level ends (the sim confirms none changes a route). A future non-colliding **decor layer** (`LevelDef.decor?: TerrainPrimitive[]`, drawn but not simulated) would allow flowers and signs on walkways.
3. **Trap orientation / art anchor.** `HazardDef` trap rects only give the trigger area. Traps need a visual anchor and a facing (clam opens left/right, piston hammer hangs from above), e.g. `art?: { x, y, flipX? }`. Until then, draw the trap sprite centred on the rect's bottom edge.
4. **Per-trap cooldown is used.** Level 12 sets `cooldownSeconds: 3` (heavy piston); levels 9 and 12 depend on the one-at-a-time rule (kill, then ignore everyone until re-armed). Please keep "a trap only fires when armed" deterministic, and apply it to walkers and fallers.
5. **Camera start.** `cameraX` exists; level 10 uses `cameraX: 600` (both kitchens are off-screen at start, the exit is centred). Everything else defaults to the first entrance.
6. **Two-hatch order.** Level 10 relies on ABBA (`ENTRANCE_ORDER[1] = [0,1,1,0]`); its solution text refers to "the 2nd east mumble".
7. **Blocker + bomber on a 16 px floor** (level 10) must leave a walkable bowl: the crater mask profile (≈ 2–8 px deep, ≤ 2 px per column step) matters. If the real mask has steeper walls, raise the east shelf by making it ≤ 6 px thick with a floor 32 px below.
8. **Climbers and walls.** Levels 11 and 12 use overhangs as "climber bouncers" (a climber hits the ceiling check at (x−dir, y−8), turns and falls a short, safe distance). Please keep that check exactly, or the scout escapes onto a ledge.
9. **Builder facing left.** Level 10 builds leftwards. The D7 contract is symmetric (our fix of the DOS asymmetry), so a left stair must also start at the foot and extend 27 px ahead.
10. **`VIEW_WIDTH` is still 320** in `src/render/camera.ts`. The Breezy 400 px levels assume the D2 400 px view (see lead note N1).
11. **Level end with a live blocker** (levels 6, 10): the level keeps running until the clock ends or "Pop all". Consider auto-ending when only blockers remain and nothing else can change (optional; the sim does this).
12. **Sim ≠ engine.** The preview sim is a design aid: jumps are instant (not 2 px/tick), basher (16×10) and miner (16×13) masks are full rectangles at the sprite box (steel/one-way tested on the forward half), the builder head-bump tests (x0 + 2·dir, y − 9), and the climber tops out when the wall column ends. Every assignment window quoted above was re-derived by sweeping x in 1 px steps with this sim. Dev should re-verify every level in the real engine, e.g. with a replay test per level built from the "Sim solution data" blocks.
    **Engine re-verification (Phase 4, 2026-09-26):** `tests/levels-replay.test.ts` runs every "Sim solution data" script through `SolutionDriver` + `GameSession`, and all 12 levels pass **unchanged** (no geometry or solution tweaks were needed). In every level the intended solution wins, every scripted step fires, and the last mumble is home by ≤ 49 % of the limit. Doing nothing saves 0 at the level's RR and at RR 99. `tests/levels-replay-spec.test.ts` re-checks the fairness drops in the engine: surviving route drops are ≤ 48 px (spawn ≤ 40), and every splat is from ≥ 80 px. The engine results differ from the SIM lines above only in: L9 (31/40 saved, 9 trap losses, vs 32/8) and L7/L12 (max route drop 41 px vs 42 px). The quoted assignment windows still win at their endpoints in the engine.
