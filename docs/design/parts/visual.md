> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

# Visual design (visual worker draft, for DESIGN.md)

**Source of truth:** `docs/design/mockups/sprites.js` (`window.MUMBLE_ART`) holds every pixel, colour, frame count and anchor.
**Rendered showcase:** `mockups/sprites-themes.html` and its screenshot `mockups/sprites-themes.png`.

If this document and `sprites.js` disagree, **`sprites.js` wins**. Every contrast ratio below can be recomputed from the hex values in `sprites.js` with the WCAG 2.2 relative-luminance formula; §7 of the showcase page does this live.

---

## 1. Art direction

### 1.1 Resolution and scaling
- The playfield MUST render at a **400×160 world-px** canvas backing store (D2).
- CSS MUST scale it by an **integer** factor: ×3 by default (1200×480), ×2 minimum, ×4 when it fits.
- Use `image-rendering: pixelated` and `imageSmoothingEnabled = false`.
- Never scale fractionally or blur, and never use sub-pixel positions: every draw call uses integer world coordinates.
- Overlays drawn in the canvas (digits, pips, brackets, sparks) MUST use the same world-px grid. There is no hi-res layer, so one pixel is always 3×3 CSS px at ×3.

### 1.2 Pixel-art rules
| Rule | Requirement |
|---|---|
| Palette discipline | Each theme MUST use **≤ 16 terrain colours** (theme palette indices 1–16). Object accents use indices 17–27 and MUST NOT be painted into the terrain bitmap. Mumbles and props use the shared 31-key palette (§2.1). No colour outside these lists. |
| Outlines | Mumbles, props, objects and icons MUST have a **1 px dark-plum outline** `#2a1433` (or the object's darkest colour) on their silhouette. Terrain is **not** outlined, except in the high-contrast view (§6). |
| Anti-aliasing | NONE: no alpha blending, no semi-transparent pixels, no gradients. Every pixel is fully opaque or fully transparent. |
| Dithering and noise | Only the seeded recipes in §5.2 may add noise. There is no per-frame random noise, so terrain never shimmers. Checker dithering is allowed only as the 50 % "ragged edge" row under a surface band. |
| Light | Light comes from the top-left: highlights sit on top and left edges, shade sits on bottom and right edges. This holds for the mumble, bricks, steel plates and objects. |
| Background | One flat, dark colour per theme, plus sparse 1 px decor dots (stars, fireflies, sparkles), at most 30 per 400 px. There is no parallax and no gradient. |
| Motion | Ambient animation (pools, exit glow, trap tells, decor twinkle) MUST freeze on frame 0 when reduced motion is on. Gameplay animation (mumble states) always plays, because it carries game information. |

### 1.3 Mood per theme (details in §5)
| id | Name | Mood in one line |
|---|---|---|
| `mossgrove` | Mossgrove | Twilight forest floor: sage stones under glowing moss, fireflies, a peat bog. |
| `sugarworks` | Sugarworks | A cosy sweet factory: gingerbread cliffs, pink frosting drips, chocolate walls, hot caramel. |
| `observatory` | Starfrost Observatory | A hushed midnight observatory: frosted periwinkle stone, brass plates, violet star-chart tiles. |
| `foundry` | Cogwork Foundry | A busy casting floor: ochre moulding sand, blued-iron plates, firebrick, molten brass. |
| `reef` | Tidepool Reef | A rock pool seen from below: violet reef rock, golden sand, a sunken ship hull, foamy tide. |

---

## 2. The mumble

### 2.1 Silhouette and colour roles
- **Silhouette:** a round **bean** 8 px wide × 6 px tall, with a **3-row sunflower sprout tuft** leaning *back*, away from the facing direction. It has two stubby plum feet and no robe, no hair and no nose.
- **Facing direction** reads from three cues:
  1. the white eye with the pupil on its *front* side;
  2. the cream face and belly on the front half;
  3. the tuft leaning back.
- **Walk frame:** 8×10 px including the tuft, which meets the D3 limit of ≤ 8×10.

| Key | Role | Hex | Notes |
|---|---|---|---|
| `o` | outline plum | `#2a1433` | = UI `--color-accent-contrast` |
| `b` | body coral | `#ff8a65` | = UI `--color-secondary` |
| `B` | body shade | `#d9573f` | bottom and back |
| `h` | body highlight | `#ffc4a3` | 1 px top-left sheen |
| `c` | cream face and belly | `#fff1d6` | front half |
| `t` | tuft sunflower | `#ffc93c` | = UI `--color-accent` |
| `T` | tuft shade and stem | `#d98e0f` | |
| `w` | eye white | `#ffffff` | |
| `p` | pupil | `#140a1a` | always on the front side of `w` |

The prop keys are `r R` paddle, `s` wood, `l L` plank, `m M` mitt, `g G` metal, `d D e` dandelion, `q` suction cup, `f F` spark, `y` bubble, `a A` char and ember, `k K` smoke and dust, `x` dizzy star, and `n` doorway black. `sprites.js` → `palette` lists every hex.

**IP check:** there is no green anywhere on the mumble and no blue robe. The only greens on screen are terrain and objects.

### 2.2 Walk cycle: 8 frames × 1 tick, 1 px per tick (copied from `sprites.js`)
The walk bobs 1 px down on frames 1 and 5. The feet step through stride → down → pass → reach. The tuft sways back ↔ upright over the full 8 frames.
```
 f0        f1        f2        f3        f4        f5        f6        f7
.oo.....  ........  ..oo....  ..oo....  ..oo....  ........  .oo.....  .oo.....
otto....  .oo.....  .otto...  .otto...  .otto...  ..oo....  otto....  otto....
.otTo...  otto....  ..oTo...  ..oTo...  ..oTo...  .otto...  .otTo...  .otTo...
.ooTooo.  .otTo...  .ooTooo.  .ooTooo.  .ooTooo.  ..oTo...  .ooTooo.  .ooTooo.
obhbbcco  .ooTooo.  obhbbcco  obhbbcco  obhbbcco  .ooTooo.  obhbbcco  obhbbcco
obbbwpco  obhbbcco  obbbwpco  obbbwpco  obbbwpco  obhbbcco  obbbwpco  obbbwpco
obbbccco  obbbwpco  obbbccco  obbbccco  obbbccco  obbbwpco  obbbccco  obbbccco
oBBbccco  obbbccco  oBBbccco  oBBbccco  oBBbccco  obbbccco  oBBbccco  oBBbccco
.oooooo.  oBBbccco  .oooooo.  .oooooo.  .oooooo.  oBBbccco  .oooooo.  .oooooo.
.oo..oo.  .oooooo.  ...oo...  ..oo..oo  .oo..oo.  .oooooo.  ...oo...  ..oo..oo
```
Foot anchor (4,10): the floor pixel sits one row below the frame, under column 4.

### 2.3 Prop style (key frames)
```
blocking f0 (12×14)   building f4 (10×10)   digging f0 (10×12)   floating f6 (10×16)
.......ooo..          ..........            ..........           ..d..dd..d
......orrro.          ..oo......            ..oo......           ..dddddd..
.....orrrrro          .otto.....            .otto.....           .ddddedddd
.....owwwwwo          ..oTo.....            ..oTo.....           .dDdddddDd
..o..orRRRro          .ooTooo...            .ooTooo...           ..DDdddDD.
.oto.ooRRRo.          obhbbcco..            obhbbccss.           ...DDDDD..
..otTo.ooo..          obbbwpco..            obbbwpcbs.           .oo.ee....
.ooTToo.s...          obbbccco..            obbbcccos.           ottobe....
obccccbos...          oBBbcccob.            oBBbcccos.           .otTb.....
bbwccwbbb...          .ooollllll  ← brick   .oooooogg.  ← blade  ..oToooo..
obpccpbo....                                .......gG.  (2 rows  .obhbbcco.
oBbccbBo....                                ........g.  below    ... (body)
.oooooo.....                                             foot)
.oo..oo.....
```
- **Blocker:** faces the viewer (two eyes) and holds a round red **STOP paddle** with a white bar.
- **Builder:** plank (`l`/`L`) whose bottom row lands exactly on the brick's cells.
- **Digger:** spade blade 2 rows below the foot.
- **Floater:** a dandelion puff on a stem, not an umbrella.
- **Climber:** pink suction cups `q`.
- **Basher:** teal mitt `m`.
- **Miner:** pick with a grey head.
- **Bomber:** fuse sparks `f`/`F` on the tuft.

---

## 3. Sprite spec (one row per `LemmingState`, all 18)

**Frame index** (MUST be identical everywhere):
```
i = floor(stateTicks / ticksPerFrame)
loop:     frame = i < n ? i : loopFrom + (i − loopFrom) % (n − loopFrom)   // loopFrom defaults to 0 → i % n
one-shot: frame = min(i, n − 1)
draw origin, facing right: (x − footX, y − footY)
draw origin, facing left (mirrored): (x − (w − 1 − footX), y − footY)
```

| State | Frames × tpf (= ticks) | Size w×h | Foot (footX,footY) | Pose / prop | Loop | Mechanics hook (core MUST match) |
|---|---|---|---|---|---|---|
| walking | 8 × 1 (8) | 8×10 | (4,10) | waddle, 1 px bob, tuft sway | loop | 1 px per tick; frame advances with each step |
| jumping | 2 × 1 (2) | 8×10 | (4,10) | crouch (1 px down) → spring (tuft up, feet apart) | loop | rises 2 px/tick up a 3–6 px ledge (1–3 ticks), then walking; only climber, floater and bomber can be assigned |
| falling | 4 × 2 (8) | 10×10 | (5,10) | arms up, wide eye, tuft streams up | loop | — |
| climbing | 4 × 2 (8) | 8×12 | (7,12) | vertical bean on the wall, pink suction cups at column 7 (= wall face x) | loop | cycle 8: ticks 0–3 top check (frames 0–1 reach/grip), ticks 4–7 rise 1 px each (frames 2–3 pull) |
| hoisting | 4 × 2 (8) | 11×12 | (7,12) | pulls over the lip; ends in the walker pose centred on x | one-shot | y −2 on ticks 1–4 → walking at tick 8 |
| floating | 4 opening + 8 loop × 1 | 10×16 | (5,16) | puff bud → half → full; loop = 4 sway poses × 2 entries | loop, `loopFrom: 4` | opening frames 0–3 = ticks with dy 3,3,3,3; then 2 px/tick |
| splatting | 8 × 2 (16) | 10×10 | (5,10) | squash → pancake → dizzy stars → dust puff (no gore) | one-shot | removed at tick 16 (`SPLAT_TICKS`, new) |
| blocking | 4 × 4 (16) | 12×14 | (4,14) | faces the viewer, STOP paddle waggles, blink on frame 3 | loop | — |
| building | 8 × 2 (16) | 10×10 | (4,10) | plank from back → front → laid at feet → pat → step | loop | **cycle 16: brick laid at `stateTicks % 16 === 9` (visual frame 4); low-brick warning at 10; step +2 x / −1 y at `% 16 === 0` (for stateTicks > 0)** |
| shrugging | 4 × 2 (8) | 10×10 | (5,10) | arms up, eye shut, tuft wilts | one-shot | `SHRUG_TICKS` 8 → walking |
| bashing | 8 × 2 (16) | 12×10 | (4,10) | teal mitt: wind-up, punch, hold, shuffle | loop | stroke 16: **carve on ticks 2–5 (frames 1–2)**; move 1 px/tick on ticks 11–15 (frames 5–7) |
| mining | 8 × 3 (24) | 12×13 | (4,12) | pick down ahead (1 row below the foot), raise overhead, swing | loop | cycle 24: **carve on ticks 1–2 (frame 0 = impact)**; x += 2 on ticks 3 and 15; y += 1 on ticks 0 and 3 |
| digging | 4 × 2 (8) | 10×12 | (4,10) | spade pushed in (2 rows below the foot), lever, flick, raise | loop | **row cleared at `stateTicks % 8 === 0` (frame 0)** |
| ohno | 4 × 4 (16) | 10×10 | (5,10) | hands on cheeks, wide eye, big fuse spark on the tuft | one-shot | `OHNO_TICKS` 16 → exploding |
| exploding | 1 × 1 | 16×16 | (8,12) | "pop" star (white core, yellow rays) | one-shot | crater + `explosion` event on this tick; particles take over (§4) |
| drowning | 8 × 2 (16) | 10×10 | (5,10) | sinks 1 px per frame (rows under the waterline are not drawn), arms wave, bubbles | one-shot | removed at tick 16 (`DROWN_TICKS`, new); drifts 1 px/tick |
| burning | 7 × 2 (14) | 8×12 | (4,12) | ember flash → charcoal → smoke → ash (cartoon) | one-shot | removed at tick 14 (`BURN_TICKS`, new) |
| exiting | 4 × 2 (8) | 10×13 | (5,13) | hop with arms up → happy squint → shrink → sparkle | one-shot | saved at tick 8 (`EXIT_TICKS`, new) |

**Overlay placement** (world px). `x, y` is the foot pixel and `footY` belongs to the current state.

| Overlay | Size | Top-left | Rule |
|---|---|---|---|
| Bomber digit | 5×7 (3×5 white glyph + plum outline) | `(x − 2, y − footY − 9)` | digit = `ceil(fuseTicks / 16)` → 5,4,3,2,1. Shown in every state while the fuse is lit. At ×3 the glyph is 15×21 CSS px. |
| Fuse spark | 3×3, 2 frames × 2 ticks | `(x − 1, y − footY − 2)` | Sits on the tuft tip, between the tuft and the digit. |
| Brick pips | 13×5 plum plate, 2 rows × 6 pips (1 px, 1 px gap) | `(x − 6, y − footY − 7)` | Shown while building or shrugging. Pips `c` = left, `K` = used. When ≤ 3 are left, the remaining pips turn amber `F`. If a digit is also shown, the digit moves up 7 px. |
| Hover bracket | 13×15 corners (white) | anchor (6,13) → box x−6..x+6, y−13..y+1 | Pointer hover only. |
| Keyboard selection | 14×20 thick yellow bracket + plum inner line + ▼ arrow above | anchor (6,17) | Shape differs from hover (arrow, thicker corners, inner line), not colour alone. |
| Pending badge | 9×11 white bubble with plum hourglass | anchor (4,10) at `(x, y − footY − 2)` | A skill was assigned while paused. Cleared on the next tick. |

Overlay anchors are **foot-relative**. The lead's `game-screen.html` currently passes `y − 6`, so it should pass the foot `y` instead.

---

## 4. Effects (all in world px, seeded by the lemming id, deterministic)

| Event | Normal | Reduced motion (`reducedMotion`) | Visual twin of which sound |
|---|---|---|---|
| Explosion | The `exploding` pop star is drawn for **3 ticks**. Then **24 particles**, 1×1 px (25 % are 2×1), colours `t b c w T`. Initial vx ∈ [−2, 2] px/tick, vy ∈ [−5, −1] px/tick, gravity **+0.35 px/tick²**, lifetime **22–34 ticks**, no terrain collision, culled off-screen. **No screen flash, no shake.** | Pop star for 3 ticks, then a static 5×3 dust puff (`k`/`K`) for 6 ticks. No particles. | pop |
| Pop all | The hatch switches to its closed frame. Each mumble gets the fuse and digits (one per tick, like the core). Explosions cascade. Global cap: **256 live particles**; beyond that, new explosions spawn only 6 each. | Pop star + puff only. | nuke sound + cascading pops |
| Splat | The `splatting` sprite, plus 4 dust pixels (`k`) that drift 2 px up over 6 ticks. | Sprite only. | wet slap |
| Drown | The `drowning` sprite (bubbles included), plus a 1 px ripple line on the pool surface: 3 px, then 5 px wide, 2 frames × 3 ticks. | Sprite only. | gurgle |
| Burn | The `burning` sprite (smoke included). | Sprite only. | sizzle |
| Exit | The `exiting` sprite; the exit's glow `4` pixels switch to all-lit for 4 ticks. | Glow switch only. | "Wheee" |
| Trap trigger | Trap `trigger` frames (§5.6). One yellow tuft pixel pair `t` floats 8 px up over 12 ticks (the only "remains"). | Trigger frames; no leaf. | trap timbre |
| Steel hit / refused dig | `overlays.steelSpark` (2 frames × 2 ticks, 4 ticks total) centred at the contact point: basher (x+8·dir, y−5), miner (x+6·dir, y−2), digger (x, y). | Frame 0 for 4 ticks. | "chink" |
| Refusal (any skill) | `overlays.refusal` ✕ centred 4 px above the frame top for 12 ticks. The HUD shake belongs to the UI. | Same (static). | refusal click |
| Assignment | `overlays.assignRing` (2 frames × 2 ticks) centred on (x, y − 5). | Omitted. | assign thunk |
| Builder low bricks | On cycle tick 10 of each of the last 3 bricks, the pips are amber and `assignRing` frame 0 shows once above the plate. | Amber pips only. | builder "ting" |
| Oh-no | The `ohno` sprite (hands on cheeks) plus a big fuse spark. The caption "Uh-oh…" belongs to the UI. | Same. | "Oh no!" |
| Let's go / hatch | At tick 15 the hatch crest `+` pixels switch to the exit-glow colour ("ready" light). Hatch opening frames 1–3 play from tick 35 (3 ticks per frame). | Crest light only; hatch jumps to open. | "Let's go!" + creak |

**Flash rule:** nothing flashes more than 3 times per second, and no effect covers more than 16×16 world px. Pop-all flicker comes only from separate small pops.

---

## 5. Terrain themes

### 5.1 Palette layout (identical indices in every theme; `sprites.js` → `themes[id].palette`)
| Idx | Role | mossgrove | sugarworks | observatory | foundry | reef |
|---|---|---|---|---|---|---|
| — | **background** | `#16122c` | `#2a1024` | `#0b0f2e` | `#181114` | `#04202c` |
| 1–4 | earth (dark → light) | `#557a63 #6a9274 #84ab86 #a3c79b` | `#a8653a #c47d48 #dc9a5c #efbb7c` | `#5d6fa8 #7385bf #8fa0d4 #b2c0ea` | `#8f6a3c #a9804a #c49a5c #dcb574` | `#7d6bb4 #9180c8 #a898d8 #c4b8e8` |
| 5 | surface | `#b8e04a` moss | `#ff9fd0` frosting | `#e6f6ff` rime | `#f3dc9c` slag crust | `#f2d99a` sand |
| 6 | surfaceHi | `#e9ff9a` dew | `#fff2fa` sprinkles | `#ffffff` glints | `#ff9a4a` hot sparks | `#fff6de` shells |
| 7–9 | steel (seam, plate, bevel) | `#5a6886 #8494b4 #b5c4de` slate iron | `#3f6e70 #6ea3a1 #b3e0d8` mint tins | `#86652a #bd9242 #ecc870` brass | `#44648a #6a8fb8 #9ec0e4` blued iron | `#357a73 #55a89d #8fd8c8` verdigris hull |
| 10–12 | brick, mortar, brickHi | `#a0664f #5e3a35 #c98a68` garden wall | `#a86443 #5c2c1e #cf8a60` milk chocolate | `#8a70c8 #3d2f78 #b39ef0` star tiles | `#b8583c #6a2c20 #dc7c5c` firebrick | `#b58f6c #5e4636 #d4b08c` ruin blocks |
| 13 | builderBrick | `#f0dfb4` birch | `#f8dc98` wafer | `#ffe3a3` brass-gold | `#f4e2b8` pale oak | `#ecd3a2` driftwood |
| 14–15 | oneWay, oneWayEdge | `#ffe27a #2a1433` | `#ffffff #b0184f` candy-cane | `#ffd966 #1a1f4d` | `#7ff0ff #0f2233` | `#ffffff #0a2a3a` |
| 16 | accent (strata vein) | `#c79a5a` root amber | `#fff0d8` cream filling | `#f2cd63` gold vein | `#e08a4a` copper seam | `#ff9cc4` coralline |
| 17–19 | hazard surface, deep, foam | `#7fcf9a #3f7f68 #d8f5c8` bog | `#ffb53d #d8731a #fff0a8` caramel | `#8fe3ff #3f9fd0 #ffffff` meltwater | `#ffd24a #ff8a1c #fff4b0` molten brass | `#5fdcef #1f8fb0 #f0ffff` tide |
| 20–22 | trap main, dark, accent | `#6fb83f #2f6a2a #e8475f` | `#d6dde6 #7c8898 #ef3e55` | `#d9a441 #6e4f1d #e8eef8` | `#8ea6c4 #34506f #ffd24a` | `#b58ad6 #6a4a8e #ffd1e8` |
| 23–24 | hatch main, dark | `#a8764a #6e4a30` log | `#ef3e55 #fff2fa` striped | `#b88c3c #6e4f1d` brass capsule | `#8a929c #3c3c44` hopper | `#c49a64 #6e4e34` crate |
| 25–26 | exit rim, glow | `#c9a36a #ffe98a` | `#fff2fa #ffd46a` | `#ecc870 #b8e6ff` | `#c8d0da #7dff9a` | `#e0b85a #9ff6ff` |
| 27 | decor dots | `#ffe98a` fireflies | `#ff9fd0` sparkle | `#ffffff` stars | `#ff9a4a` sparks | `#9ff6ff` bubbles |

**Novelty:** none of the themes is dirt/grass-on-navy, hell-fire, marble, pillar, crystal, brick, bubble or snow as the original drew them. The only shared ideas are "rock with a lit top" and "bricks", and those are generic.

### 5.2 Procedural texture recipes (per `FillStyle`)
All recipes are **pure functions of (x, y, levelSeed)**, so they are independent of paint order and the result is identical in Node tests.

**Hash:** `h2(x, y, s)` = one mulberry32 step on the mixed seed `(s ^ imul(x, 374761393) ^ imul(y, 668265263)) >>> 0`. It returns a value in [0, 1).

**Value noise:** `vnoise(x, y, cx, cy, s)` interpolates bilinearly (smoothstep) between the `h2` lattice values at cell size cx×cy.

**`depth`:** the number of solid pixels directly above (capped at 8). It is computed **after all primitives are painted**, so stacked shapes don't grow grass inside.

**`edge`:** an empty neighbour to the left, right or below.

| FillStyle | Recipe (implementation in `sprites-themes.html` → `buildTerrain`) |
|---|---|
| **natural** | `drip = floor(h2(x,0,seed^0xd1)² × (dripMax+1))`. The top rows depend on `depth`: <br>• depth 0 → `surfaceHi` if `h2(x,y,seed^0x5a) < 0.18`, else `surface`; <br>• depth 1…1+drip → `surface` (moss, frosting or rime **drips**); <br>• depth 2+drip → 50 % `surface` / `earth[3]` (ragged edge, `h2(…^0x5b)`); <br>• deeper → `v = 0.6·vnoise(x,y,6,4,seed) + 0.4·h2(x,y,seed^0xb0d)` → `earth[v<.30?0 : v<.50?1 : v<.72?2 : 3]`. <br>**Edge rule:** `edge` pixels use at least `earth[1]`. |
| **strata** | `yy = y + round(1.5·sin((x + seed%97)/9))` → `strataBands[yy mod len]` (12 palette indices per theme). 8 % speckle to `earth[1]` (`h2(…^0x5eed)`). depth 0 → `surface`. |
| **bricks** | Brick size `[bw,bh]` per theme includes 1 px of mortar, with running bond: `off = (row odd) ? bw/2 : 0`. In brick-local coordinates `(bx, by)`: <br>• `bx = bw−1` or `by = bh−1` → mortar; <br>• `bx = 0` or `by = 0` → `brickHi` (bevel); <br>• otherwise → `brick`, except "worn" bricks (`h2(brickCol,row,seed^0xb1c) < .3`), which take `brickHi` speckles on 35 % of their pixels. <br>Mossgrove only: depth 0 → `surface` (moss on the wall top). |
| **solid** | depth 0 → `surface`, bottom edge → `earth[1]`, otherwise `earth[2]`. Use it for clean man-made platforms. |
| **metal** | The **8×8 plate** tile below, world-aligned (`x mod 8`, `y mod 8`). Region edges: top and left → bevel `steel[2]`; bottom and right → seam `steel[0]`. |

Per-theme parameters (`themes[id].texture`):

| Parameter | mossgrove | sugarworks | observatory | foundry | reef |
|---|---|---|---|---|---|
| `dripMax` | 3 | 5 | 2 | 2 | 3 |
| `brick` | 8×4 | 6×5 (chocolate squares) | 8×8 (tiles) | 8×4 | 8×6 |
| strata look | sediment + root vein | layer cake + cream | ice layers + gold vein | casting-sand layers | sandstone + coralline |

### 5.3 Steel (one shape language in every theme; only the tint changes)
```
LLLLLLLD    L = steel[2] bevel, M = steel[1] plate, D = steel[0] seam
LrMMMMrD    r = rivet (steel[2]) with a d = steel[0] shadow pixel under it
LdMMMMdD
LMMMMMMD    → square bevelled plates, 4 corner rivets, dark seams on an 8 px grid
LMMMMMMD
LrMMMMrD
LdMMMMdD
DDDDDDDD
```
- Steel MUST use `fill: 'metal'`, and `metal` MUST NOT be used on any other material. The compiler should reject it: diggable terrain must never look like steel (RESEARCH §6.3 "no hidden information").
- Steel is told apart from bricks by **square** plates, **rivets** and **bevels**. Bricks are 2:1 running bond without rivets.

### 5.4 One-way walls
- Chevrons are **baked into the terrain** at compile time as an 8×8 world-aligned tile, over the wall's normal fill:
  ```
  ........
  AAE.....    A = oneWay, E = oneWayEdge; points right for one-way-right
  .AAE....    tile rows alternate with a 4 px x offset (staggered)
  ..AAE...    one-way-left = the tile mirrored
  .AAE....
  AAE.....
  ........
  ........
  ```
- They are **static**, so reduced motion needs no variant. Because they are part of the bitmap, digging removes them together with the terrain, and the arrows always tell the truth. This is a deliberate change from the original's animated arrows: an animated overlay would drift out of sync with the carved terrain.

### 5.5 Hazards (liquids and fire; `HazardDef` rect)
- **Surface:** the top 3 rows tile `objects[id].hazard.surface`, 8×3, 4 frames × 4 ticks, world-aligned.
  - **Water** (`water`): a rolling **crest** made of a foam bump moving right.
  - **Fire/caramel/brass** (`fire`): a flickering **zigzag** crest.
- **Body:** the rest tiles `hazard.deep`, 8×8, **static**.
  - Water: horizontal ripple dashes.
  - Fire: rising bubble clusters.
- The shape difference (waves vs zigzag and bubbles) is the non-colour cue. The pool MUST extend at least 1 px into the terrain on both sides so no gap shows.
- Reduced motion: surface frame 0 only.

### 5.6 Traps (16×16, anchor (8,16) = bottom-centre of the `HazardDef` rect)
| Theme | Trap | Idle "tell" (2 frames × 8 ticks) | Trigger (`trigger[0], [1], [1], [0]` × 3 ticks, then idle) |
|---|---|---|---|
| mossgrove | snapjaw flytrap | open red jaws with teeth sway 1 px | jaws snap shut, chew |
| sugarworks | cookie-cutter press | cutter hovers and jiggles 1 px | slams down; a crumb puff |
| observatory | brass pendulum | small ±1 px swing | full swing left, then right |
| foundry | piston hammer | steam wisps `+`/`k` puff | hammer slams to the floor; steam burst |
| reef | snapping giant clam | shell gapes with a pearl glint | snaps shut; bubbles |

- Each trap's tell MUST animate while armed. During cooldown the trap shows `trigger[1]` (closed or down), so "armed vs resting" is shown by **shape**.

### 5.7 Entrance hatch and exit (per theme: shared silhouette, theme colours + theme crest)
- **Hatch** (24×20, anchor (12,14) = the spawn point = bottom-centre of the box). A roof plus a dark box, with two flaps that swing down.
  - Frames: 0 closed; 1–3 opening, 3 ticks each from tick 35; then it stays on frame 3.
  - A 5–7 px **crest** sits on the roof: sprout (mossgrove), candy bow (sugarworks), star (observatory), cog (foundry), shell (reef).
  - Mumbles are drawn over the hatch.
- **Exit** (20×22, anchor (10,22) = the doorway floor pixel). A tall **arched doorway**: a 2 px rim, a black interior 14×13, a glowing threshold, and the theme crest as a beacon on top.
  - Idle: 4 frames × 4 ticks. Glow motes rise inside, and the beacon alternates between the crest colour and the glow colour.
  - The **arch silhouette is the same in every theme**, so the exit is recognised by shape, never by colour.

### 5.8 Builder bricks and minimap
- **Builder bricks:** the builder paints `builderBrick` (index 13), a pale plank tone at ≥ 11.5:1 on every background, so new stairs pop against the textured earth.
- **Minimap** (`themes[id].minimap`), following the lead's §5.1:
  - terrain `earth[2]`, steel `steel[1]`, hazards `#ff7470`;
  - exit: a white doorway glyph;
  - mumbles: 2×2 `#ffc93c` dots;
  - viewport: a `#f7f3ff` rectangle.

---

## 6. High-contrast "clear physics" view (Settings → Display)
The renderer builds the terrain LUT from **Material**, not from colour, and outlines every terrain edge. Mumbles are unchanged. Ratios below are against the black background.

| Class | Fill | Pattern (shape cue) | Ratio vs `#000000` |
|---|---|---|---|
| background | `#000000` | — | — |
| earth | `#a0a0a0` | flat, **1 px white edge** on every pixel next to empty | 8.03 (edge 21.0) |
| steel | `#5f8fff` | **cross-hatch**: `#0a1a4a` where `(x+y) mod 4 = 0` or `(x−y) mod 4 = 0` | 6.86 (hatch vs fill 5.45) |
| one-way | `#c77dff` | black **chevrons** (the §5.4 tile) | 7.81 |
| water | `#00c8ff` | black **wave** lines: `(y − round(sin(x/2))) mod 4 = 0` | 10.71 |
| fire | `#ff7a00` | black **zigzag**: `(y + |x mod 6 − 3|) mod 4 = 0` | 8.04 |
| trap | `#ffd400` / `#000000` | 45° **warning stripes**, 3 px (`(x+y) mod 6 < 3`), over the trap's 16×16 box | 14.67 |
| exit | `#3cff6a` | 1 px **outline** of the doorway + a 3×5 door glyph | 15.70 |

- Mumble outline `#2a1433` vs HC earth: 6.44:1. Body `#ff8a65` vs black: 9.08:1.
- The edge outline is recomputed on the core's dirty rect grown by 1 px.

---

## 7. Contrast verification (WCAG 1.4.11, non-text ≥ 3:1)
Computed by `contrast.mjs` (scratchpad) from `sprites.js`, and live on the showcase page. **All pairs pass.**

| Pair | mossgrove | sugarworks | observatory | foundry | reef |
|---|---:|---:|---:|---:|---:|
| Mumble body `b` vs background | 7.84 | 7.58 | 8.09 | 8.04 | 7.27 |
| Mumble outline `o` vs lightest earth `earth[3]` | 8.99 | 9.68 | 9.32 | 8.75 | 9.12 |
| Mumble outline `o` vs surface | 11.07 | 8.92 | 15.24 | 12.46 | 12.17 |
| Mumble outline `o` vs surfaceHi | 15.43 | 15.51 | 16.85 | 8.00 | 15.64 |
| Tuft `t` vs background | 11.82 | 11.41 | 12.19 | 12.11 | 10.95 |
| Darkest earth `earth[0]` vs background | 3.76 | 3.83 | 3.84 | 3.80 | 3.71 |
| Mid earth `earth[1]` vs background | 5.17 | 5.32 | 5.20 | 5.20 | 4.91 |
| Surface vs background | 11.93 | 9.28 | 16.93 | 13.75 | 12.15 |
| Steel plate `steel[1]` vs background | 5.94 | 6.19 | 6.55 | 5.52 | 5.99 |
| Steel seam `steel[0]` vs background | 3.25 | 3.07 | 3.48 | 3.04 | 3.35 |
| Brick vs background | 3.90 | 3.81 | 4.66 | 3.98 | 5.70 |
| Builder brick vs background | 13.76 | 13.09 | 14.95 | 14.54 | 11.54 |
| One-way arrow vs its edge | 13.17 | 6.80 | 11.41 | 12.19 | 14.94 |
| One-way edge vs lightest earth | 8.99 | 3.91 | 8.63 | 8.41 | 8.09 |
| Hazard surface vs background | 9.76 | 9.96 | 13.01 | 12.90 | 10.39 |
| Hazard deep vs background | 3.84 | 5.33 | 6.31 | 7.89 | 4.50 |
| Exit rim vs background | 7.72 | 16.14 | 11.64 | 11.95 | 8.95 |
| Exit glow vs doorway `n` `#0c0816` | 16.27 | 14.01 | 14.88 | 15.67 | 16.10 |
| Trap main vs background | 7.44 | 12.81 | 8.32 | 7.44 | 6.07 |
| Hatch main vs background | 4.63 | 4.58 | 6.11 | 5.91 | 6.53 |

**Worst pair per theme:**

| Theme | Worst pair | Ratio |
|---|---|---:|
| mossgrove | steel seam | 3.25 |
| sugarworks | steel seam | 3.07 |
| observatory | steel seam | 3.48 |
| foundry | steel seam | 3.04 |
| reef | steel seam | 3.35 |

**Overlays on the plum `#2a1433` plate or outline:**
- digits and eye white `#ffffff`: 16.85
- cream pips `#fff1d6`: 15.09
- amber pips `#ff8a1f`: 7.15
- tuft `#ffc93c`: 10.97
- refusal red `#ef3e55`: 4.41
- used pips `#7d7084`: 3.63 (dim on purpose; the *count* of lit pips carries the information)

**Rules:**
- Every new colour pair MUST be ≥ 3:1.
- Where a mumble stands on a light surface, its **outline** carries the contrast. Where it stands on a dark background, its **body** does.
- Never lighten the outline or darken the body.

---

## 8. Notes for architecture/dev

| # | Where | Change |
|---|---|---|
| V1 | `render/sprites.ts` | `SPRITE_COLORS` ← `MUMBLE_ART.palette` (all 31 keys). Replace `LEMMING_FRAMES` with `LEMMING_ANIMS: Record<LemmingState, { frames; ticksPerFrame; footX; footY; loop; loopFrom? }>`, copied from `sprites.js` → `sprites`. |
| V2 | `SpriteAtlas.drawLemming` | Use the §3 frame-index rule (today: `tick % frames`). Draw origin `(x − footX, y − footY)`, mirrored `(x − (w − 1 − footX), y − footY)` (today: `x − floor(w/2)` for both directions, which shifts left-facing sprites by 1 px). Cache key `state:frame:dir`. |
| V3 | `render/sprites.ts` (new) | `drawOverlay(name, x, y, frame)` for the digits, pips, hover, selection, crosshair, steel spark, refusal, pending and assign ring, with the §3 placement. The renderer draws them after all mumbles. The CSS cursor PNG comes from `overlays.crosshair`. |
| V4 | `levels/themes.ts` | Replace `meadow` with the 5 themes (ids as D4). **Extend `Theme`:** `surfaceHi`, `brickHi`, `oneWayEdge`, `accent`, `hazard: [surface, deep, foam]`, `trap: [main, dark, accent]`, `hatch: [main, dark]`, `exit: [rim, glow]`, `decor`, `hazardKind`, `texture: { dripMax, strataBands: number[12], brick: [w, h], mossOnBricks }`, `minimap`. `bricks` stays `[brick, mortar]`. Palette entries 17–27 are never written into terrain. |
| V5 | `levels/compiler.ts` | Paint in **two passes**: (1) primitives write material + fill style per pixel (a `Uint8Array` fill map); (2) colour every pixel with the §5.2 recipes, using post-paint `depth`/`edge`, and bake one-way chevrons (§5.4). Recipes use `h2(x, y, seed)`, so the sequential `rng` argument is no longer needed. `validateLevel`: reject `fill: 'metal'` on non-steel materials and any non-`metal` fill on steel. |
| V6 | `core/constants.ts` | Add `SPLAT_TICKS = 16`, `DROWN_TICKS = 16`, `BURN_TICKS = 14`, `EXIT_TICKS = 8`. Builder, basher, miner and digger MUST use the §3 phase hooks, so that the art and the physics line up. |
| V7 | `render/renderer.ts` | Draw order: background → decor dots → terrain → hazard pools → traps → hatches → exits → mumbles → overlays → particles. Anchors: hatch = `LevelDef.entrances[i]`; exit = `LevelDef.exits[i]`; trap = `(x + w/2, y + h)` of its `HazardDef`. Ambient frame = `floor(timeMs / (1000/17) / ticksPerFrame)`, frozen at 0 when `reducedMotion`. Particles use a fixed pool of 256. |
| V8 | `render/terrain-layer.ts` | Add a high-contrast mode: a second path colouring by `Material` with the §6 patterns + edge outline. Recompute it on the dirty rect grown by 1 px. |
| V9 | `core/constants.ts` `EXIT_TRIGGER` | `dy −8, h 8` covers y−8..y−1, but a mumble standing in the doorway has its foot **on** the anchor row y (the floor). Suggest `dy −7, h 8` (y−7..y), or define the anchor as the row above the floor. Needs a mechanics decision (flagged, not changed). |
| V10 | `render/camera.ts` | `VIEW_WIDTH = 400` (D2; same as the lead's N1). |

**Open questions / deviations**
- One-way arrows are **static** and baked into the terrain (§5.4), where the original's arrows were animated.
- Themes use palette indices 17–27 for object accents. That goes beyond the "16 colours" rule, but terrain itself stays ≤ 16.
- Climbing and hoisting anchor at column 7, so the body hugs the wall. At the walk↔climb transition the sprite shifts ≤ 3 px, which is not noticeable at 17 ticks/s.
