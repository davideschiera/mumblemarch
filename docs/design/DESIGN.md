# Mumblemarch — Design rulebook

Phase 2 output (design lead, 2026-09-26). This is the **authoritative** visual, interaction, accessibility, audio and copy spec for the development phase. It builds on [`../research/RESEARCH.md`](../research/RESEARCH.md) (mechanics, spirit, IP) and fits the scaffold in [`../architecture/ARCHITECTURE.md`](../architecture/ARCHITECTURE.md). Where a change to the architecture is needed, it is listed in §11 and was **not** made by design.

## 0. How to use this document

| Need | Go to |
|---|---|
| What the game should *feel* like, and what we keep or change from 1991 | §1 |
| Pixels: resolution, the mumble, every sprite state, effects | §2–§3 (data: [`mockups/sprites.js`](mockups/sprites.js)) |
| Terrain themes, palettes, texture recipes, steel, hazards, contrast | §4 (rendered: [`mockups/sprites-themes.png`](mockups/sprites-themes.png)) |
| Screen layout, tokens, HUD states, menus | §5 (CSS: [`mockups/mockup.css`](mockups/mockup.css); renders: [`game-screen.png`](mockups/game-screen.png), [`menus.png`](mockups/menus.png)) |
| Controls, keyboard-only play, picking, pause/assign, pop all | §6 |
| Accessibility requirements with acceptance criteria, ARIA, announcements, settings | §7 |
| Sound recipes, mixing, music | §8 (code: [`mockups/audio-lab.html`](mockups/audio-lab.html)) |
| Tone of voice, strings, results verdicts, title style | §9 |
| The 12 levels | §10 → [`LEVELS.md`](LEVELS.md) (data: [`mockups/levels-data.js`](mockups/levels-data.js)) |
| Required architecture/dev changes | §11 |
| Deliverables and independent validation reports | §12 |

**Conventions**
- **MUST** = required for release. **SHOULD** = do it unless it costs the schedule. **Stretch** = only after everything else.
- **World px** = simulation pixels. **CSS px** = on screen at the default ×3 scale (1 world px = 3 CSS px). **Tick** = 1/17 s of game time.
- **Data wins over prose:** where a table here and `sprites.js` / `levels-data.js` / `audio-lab.html` disagree, the data file wins; report the mismatch.
- **Critters are "mumbles"** (D1). Code identifiers may stay `lemming*`, but no user-facing string, title, icon or metadata may contain "Lemm-".

**Locked decisions** (D1–D10, from [`DESIGN_TASKS.md`](DESIGN_TASKS.md)), in short:
- **Name:** *Mumblemarch*, critters are *mumbles*.
- **View:** 400×160 world px at ×3.
- **Themes:** `mossgrove`, `sugarworks`, `observatory`, `foundry`, `reef`.
- **Tiers:** Breezy, Knotty, Gnarly, Stampede.
- **Skills:** the classic 8 names, with our own props.
- **"Pop all"** is the nuke.
- **Mechanics:** the original's numbers, with our fixes (both side edges are walls, steel is never removed, assigning while paused is allowed).
- **Keys:** the D8 baseline; Tab is reserved for focus.
- **HUD:** DOM toolbar + status line + minimap.

---

## 1. Design pillars

Derived from RESEARCH §1 (P1–P10). **Every feature, level and string must serve at least one pillar and break none.**

| # | Pillar | Means (MUST) | Never |
|---|---|---|---|
| **1** | **Nudge, don't steer** | The only verbs are: *choose a skill → choose a mumble*, release rate, pause, fast-forward, pop all, restart. Everyone else marches on. | Direct movement, "go here" orders, auto-solvers. |
| **2** | **The march is the clock** | A steady stream from the hatch. The crowd is both what you protect and what you manage. Release rate is a real lever. | Spawning everyone at once; a timer that matters more than the flow. |
| **3** | **Every skill counts** | Scarce per-level counts. The available set is the hint. Zero is shown clearly. A refused assignment is never consumed. | Unlimited skills (except in a future sandbox). Silent refusals. |
| **4** | **Think first, click calmly** | Plan → execute. Dexterity is optional: **assign while paused**, frame-step, fast-forward, instant restart, relaxed timer. | Pixel-precise or frame-precise requirements. Punishing slow players. |
| **5** | **Tiny heroes, big hearts** | Charm comes from animation, chirps and sound, not walls of text. Deaths are cartoon pops and plops. Sacrifice is bittersweet, not grim. | Gore, mockery of the player, voice samples, long cutscenes. |
| **6** | **Fair and readable** | No hidden information. Terrain classes read by **pattern** (steel rivets, one-way chevrons, hazard waves). Deterministic rules. Alternative solutions are welcome. | Colour-only cues, invisible traps, "almost" drops or gaps, solutions by luck. |
| **7** | **Everyone can march** | Full keyboard play, screen-reader announcements, a visual twin for every sound, reduced motion, no forced time pressure, ≥ 24 px targets. | Mouse-only actions, sound-only information, flashes > 3/s. |

**Mood line:** *a cosy toybox of little worlds, where a column of cheerful, slightly clueless critters mumbles its way toward home, and you are the kind, busy foreman who keeps them alive.*

### 1.1 Keep from the original / change from the original

| Keep (spirit and rules) | Change (IP, usability, our fixes) |
|---|---|
| Indirect control; 8 skills with the original numbers (RESEARCH §2, D7) | **Name, critter, art, themes, sounds, music, texts and levels are all new** (RESEARCH §9) |
| Release rate 1–99, never below the level's value; interval `(99−RR) div 2 + 4` | **Assign while paused** (the original forbade it); frame-step; fast-forward ×3 |
| Save requirement as a count vs total; the clock (default on) | **Relaxed timer** option: the clock shows but never ends the level |
| 160 px tall world, horizontal scroll, minimap, dark backgrounds | View widened **320 → 400** world px (less scrolling at ×3 on a 1280 px screen) |
| Status line naming what's under the cursor + a count ("Walker ×3") | "IN %" shown as **"Saved 3 · need 8"** with a meter (absolute counts are easier) |
| Hover box on the target critter; picking priority (busy first, then last released) | Enlarged accessible hit area, snap-to-nearest, **keyboard selection** (Z/X, [ ]) and a keyboard cursor |
| Blockers are permanent; bombers count down 5→1 above the head | Blocker/bomber look is ours (STOP paddle, fuse from the tuft); countdown digits are bigger and outlined |
| Pop-all (nuke) as the emergency exit | **Two-step confirmation with no timing window** (was a double-click); labelled "Pop all" |
| Hazards: liquids/fire kill; triggered traps take one victim, then re-arm | Every hazard has an animation **plus** a static pattern; traps show an idle "tell" |
| Steel, one-way walls, pixel-destructible terrain | Steel is tested per pixel and **never** removed; one-way arrows are chevrons |
| One-verb tutorial levels whose title is the hint; 4 difficulty tiers | Our tiers: **Breezy · Knotty · Gnarly · Stampede**; 12 original levels |
| Level preview before play; graded, cheeky results one-liner | Hints hidden behind a button; our own copy and thresholds; autosave instead of access codes |
| Bouncy, march-like music; short comic barks | Original procedural chiptune; wordless chirps with captions; separate volumes, mute |
| — | Fixed quirks (RESEARCH §2.9): both side edges are walls, no direct-drop, no nuke-% bug, no pause-for-time, symmetric builder, dying mumbles accept no skills |

## 2. Art direction

**Source of truth:** `docs/design/mockups/sprites.js` (`window.MUMBLE_ART`) holds every pixel, colour, frame count and anchor.
**Rendered showcase:** `mockups/sprites-themes.html` and its screenshot `mockups/sprites-themes.png`.

If this document and `sprites.js` disagree, **`sprites.js` wins**. Every contrast ratio below can be recomputed from the hex values in `sprites.js` with the WCAG 2.2 relative-luminance formula; section 7 of the showcase page does this live.

### 2.1 Resolution and scaling
- The playfield MUST render at a **400×160 world-px** canvas backing store (D2).
- CSS MUST scale it by an **integer** factor: ×3 by default (1200×480), ×2 minimum, ×4 when it fits.
- Use `image-rendering: pixelated` and `imageSmoothingEnabled = false`.
- Never scale fractionally or blur, and never use sub-pixel positions: every draw call uses integer world coordinates.
- Overlays drawn in the canvas (digits, pips, brackets, sparks) MUST use the same world-px grid. There is no hi-res layer, so one pixel is always 3×3 CSS px at ×3.

### 2.2 Pixel-art rules
| Rule | Requirement |
|---|---|
| Palette discipline | Each theme MUST use **≤ 16 terrain colours** (theme palette indices 1–16). Object accents use indices 17–27 and MUST NOT be painted into the terrain bitmap. Mumbles and props use the shared 31-key palette (§3.1). No colour outside these lists. |
| Outlines | Mumbles, props, objects and icons MUST have a **1 px dark-plum outline** `#2a1433` (or the object's darkest colour) on their silhouette. Terrain is **not** outlined, except in the high-contrast view (§4.9). |
| Anti-aliasing | NONE: no alpha blending, no semi-transparent pixels, no gradients. Every pixel is fully opaque or fully transparent. |
| Dithering and noise | Only the seeded recipes in §4.2 may add noise. There is no per-frame random noise, so terrain never shimmers. Checker dithering is allowed only as the 50 % "ragged edge" row under a surface band. |
| Light | Light comes from the top-left: highlights sit on top and left edges, shade sits on bottom and right edges. This holds for the mumble, bricks, steel plates and objects. |
| Background | One flat, dark colour per theme, plus sparse 1 px decor dots (stars, fireflies, sparkles), at most 30 per 400 px. There is no parallax and no gradient. |
| Motion | Ambient animation (pools, exit glow, trap tells, decor twinkle) MUST freeze on frame 0 when reduced motion is on. Gameplay animation (mumble states) always plays, because it carries game information. |

### 2.3 Mood per theme (details in §4)
| id | Name | Mood in one line |
|---|---|---|
| `mossgrove` | Mossgrove | Twilight forest floor: sage stones under glowing moss, fireflies, a peat bog. |
| `sugarworks` | Sugarworks | A cosy sweet factory: gingerbread cliffs, pink frosting drips, chocolate walls, hot caramel. |
| `observatory` | Starfrost Observatory | A hushed midnight observatory: frosted periwinkle stone, brass plates, violet star-chart tiles. |
| `foundry` | Cogwork Foundry | A busy casting floor: ochre moulding sand, blued-iron plates, firebrick, molten brass. |
| `reef` | Tidepool Reef | A rock pool seen from below: violet reef rock, golden sand, a sunken ship hull, foamy tide. |

---

## 3. The mumble and its sprites

### 3.1 Silhouette and colour roles
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

### 3.2 Walk cycle: 8 frames × 1 tick, 1 px per tick (copied from `sprites.js`)
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

### 3.3 Prop style (key frames)

- **Props:** blocker = round red STOP paddle (faces the viewer, two eyes); builder = plank `l/L` whose bottom row lands on the brick cells; digger = spade blade 2 rows below the foot; floater = dandelion puff on a stem (not an umbrella); climber = pink suction cups `q`; basher = teal mitt `m`; miner = pick with a grey head; bomber = fuse sparks `f/F` on the tuft.
- Key frames for the blocker, builder, digger and floater are drawn in **App. B**. Every frame is in `sprites.js`.

### 3.4 Sprite spec (one row per `LemmingState`, all 18)

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
| exploding | 1 × 1 | 16×16 | (8,12) | "pop" star (white core, yellow rays) | one-shot | crater + `explosion` event on this tick; particles take over (§3.5) |
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

Overlay anchors are **foot-relative**. Pass the foot `y` (the game-screen mockup does this).

---

### 3.5 Effects (all in world px, seeded by the lemming id, deterministic)

| Event | Normal | Reduced motion (`reducedMotion`) | Visual twin of which sound |
|---|---|---|---|
| Explosion | The `exploding` pop star is drawn for **3 ticks**. Then **24 particles**, 1×1 px (25 % are 2×1), colours `t b c w T`. Initial vx ∈ [−2, 2] px/tick, vy ∈ [−5, −1] px/tick, gravity **+0.35 px/tick²**, lifetime **22–34 ticks**, no terrain collision, culled off-screen. **No screen flash, no shake.** | Pop star for 3 ticks, then a static 5×3 dust puff (`k`/`K`) for 6 ticks. No particles. | pop |
| Pop all | The hatch switches to its closed frame. Each mumble gets the fuse and digits (one per tick, like the core). Explosions cascade. Global cap: **256 live particles**; beyond that, new explosions spawn only 6 each. | Pop star + puff only. | nuke sound + cascading pops |
| Splat | The `splatting` sprite, plus 4 dust pixels (`k`) that drift 2 px up over 6 ticks. | Sprite only. | wet slap |
| Drown | The `drowning` sprite (bubbles included), plus a 1 px ripple line on the pool surface: 3 px, then 5 px wide, 2 frames × 3 ticks. | Sprite only. | gurgle |
| Burn | The `burning` sprite (smoke included). | Sprite only. | sizzle |
| Exit | The `exiting` sprite; the exit's glow `4` pixels switch to all-lit for 4 ticks. | Glow switch only. | "Wheee" |
| Trap trigger | Trap `trigger` frames (§4.6). One yellow tuft pixel pair `t` floats 8 px up over 12 ticks (the only "remains"). | Trigger frames; no leaf. | trap timbre |
| Steel hit / refused dig | `overlays.steelSpark` (2 frames × 2 ticks, 4 ticks total) centred at the contact point: basher (x+8·dir, y−5), miner (x+6·dir, y−2), digger (x, y). | Frame 0 for 4 ticks. | "chink" |
| Refusal (any skill) | `overlays.refusal` ✕ centred 4 px above the frame top for 12 ticks. The HUD shake belongs to the UI. | Same (static). | refusal click |
| Assignment | `overlays.assignRing` (2 frames × 2 ticks) centred on (x, y − 5). | Omitted. | assign thunk |
| Builder low bricks | On cycle tick 10 of each of the last 3 bricks, the pips are amber and `assignRing` frame 0 shows once above the plate. | Amber pips only. | builder "ting" |
| Oh-no | The `ohno` sprite (hands on cheeks) plus a big fuse spark. The caption "Uh-oh…" belongs to the UI. | Same. | "Oh no!" |
| Let's go / hatch | At tick 15 the hatch crest `+` pixels switch to the exit-glow colour ("ready" light). Hatch opening frames 1–3 play from tick 35 (3 ticks per frame). | Crest light only; hatch jumps to open. | "Let's go!" + creak |

**Flash rule:** nothing flashes more than 3 times per second, and no effect covers more than 16×16 world px. Pop-all flicker comes only from separate small pops.

---

## 4. Terrain themes

### 4.1 Palette layout (identical indices in every theme; `sprites.js` → `themes[id].palette`)
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

### 4.2 Procedural texture recipes (per `FillStyle`)
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

### 4.3 Steel (one shape language in every theme; only the tint changes)
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

### 4.4 One-way walls
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

### 4.5 Hazards (liquids and fire; `HazardDef` rect)
- **Surface:** the top 3 rows tile `objects[id].hazard.surface`, 8×3, 4 frames × 4 ticks, world-aligned.
  - **Water** (`water`): a rolling **crest** made of a foam bump moving right.
  - **Fire/caramel/brass** (`fire`): a flickering **zigzag** crest.
- **Body:** the rest tiles `hazard.deep`, 8×8, **static**.
  - Water: horizontal ripple dashes.
  - Fire: rising bubble clusters.
- The shape difference (waves vs zigzag and bubbles) is the non-colour cue. The pool MUST extend at least 1 px into the terrain on both sides so no gap shows.
- Reduced motion: surface frame 0 only.

### 4.6 Traps (16×16, anchor (8,16) = bottom-centre of the `HazardDef` rect)
| Theme | Trap | Idle "tell" (2 frames × 8 ticks) | Trigger (`trigger[0], [1], [1], [0]` × 3 ticks, then idle) |
|---|---|---|---|
| mossgrove | snapjaw flytrap | open red jaws with teeth sway 1 px | jaws snap shut, chew |
| sugarworks | cookie-cutter press | cutter hovers and jiggles 1 px | slams down; a crumb puff |
| observatory | brass pendulum | small ±1 px swing | full swing left, then right |
| foundry | piston hammer | steam wisps `+`/`k` puff | hammer slams to the floor; steam burst |
| reef | snapping giant clam | shell gapes with a pearl glint | snaps shut; bubbles |

- Each trap's tell MUST animate while armed. During cooldown the trap shows `trigger[1]` (closed or down), so "armed vs resting" is shown by **shape**.

### 4.7 Entrance hatch and exit (per theme: shared silhouette, theme colours + theme crest)
- **Hatch** (24×20, anchor (12,14) = the spawn point = bottom-centre of the box). A roof plus a dark box, with two flaps that swing down.
  - Frames: 0 closed; 1–3 opening, 3 ticks each from tick 35; then it stays on frame 3.
  - A 5–7 px **crest** sits on the roof: sprout (mossgrove), candy bow (sugarworks), star (observatory), cog (foundry), shell (reef).
  - Mumbles are drawn over the hatch.
- **Exit** (20×22, anchor (10,22) = the doorway floor pixel). A tall **arched doorway**: a 2 px rim, a black interior 14×13, a glowing threshold, and the theme crest as a beacon on top.
  - Idle: 4 frames × 4 ticks. Glow motes rise inside, and the beacon alternates between the crest colour and the glow colour.
  - The **arch silhouette is the same in every theme**, so the exit is recognised by shape, never by colour.

### 4.8 Builder bricks and minimap
- **Builder bricks:** the builder paints `builderBrick` (index 13), a pale plank tone at ≥ 11.5:1 on every background, so new stairs pop against the textured earth.
- **Minimap** (`themes[id].minimap`), following the §5.1:
  - terrain `earth[2]`, steel `steel[1]`, hazards `#ff7470`;
  - exit: a white doorway glyph;
  - mumbles: 2×2 `#ffc93c` dots;
  - viewport: a `#f7f3ff` rectangle.

---

### 4.9 High-contrast "clear physics" view (Settings → Display)
The renderer builds the terrain LUT from **Material**, not from colour, and outlines every terrain edge. Mumbles are unchanged. Ratios below are against the black background.

| Class | Fill | Pattern (shape cue) | Ratio vs `#000000` |
|---|---|---|---|
| background | `#000000` | — | — |
| earth | `#a0a0a0` | flat, **1 px white edge** on every pixel next to empty | 8.03 (edge 21.0) |
| steel | `#5f8fff` | **cross-hatch**: `#0a1a4a` where `(x+y) mod 4 = 0` or `(x−y) mod 4 = 0` | 6.86 (hatch vs fill 5.45) |
| one-way | `#c77dff` | black **chevrons** (the §4.4 tile) | 7.81 |
| water | `#00c8ff` | black **wave** lines: `(y − round(sin(x/2))) mod 4 = 0` | 10.71 |
| fire | `#ff7a00` | black **zigzag**: `(y + |x mod 6 − 3|) mod 4 = 0` | 8.04 |
| trap | `#ffd400` / `#000000` | 45° **warning stripes**, 3 px (`(x+y) mod 6 < 3`), over the trap's 16×16 box | 14.67 |
| exit | `#3cff6a` | 1 px **outline** of the doorway + a 3×5 door glyph | 15.70 |

- Mumble outline `#2a1433` vs HC earth: 6.44:1. Body `#ff8a65` vs black: 9.08:1.
- The edge outline is recomputed on the core's dirty rect grown by 1 px.

---

### 4.10 Contrast verification (WCAG 1.4.11, non-text ≥ 3:1)

Every pair below was computed from the hex values in `sprites.js` with the WCAG 2.2 relative-luminance formula. The full 20-pair × 5-theme table is in **App. D**. It was independently recomputed by validator V2: 100/100 values within ±0.1, all ≥ 3:1.

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

## 5. UI design

### 5.1 Screen geometry and scale

- **View:** 400×160 world px. **Canvas backing store = 400×160.** CSS scales it by an integer factor `s` (`image-rendering: pixelated`; never fractional).
- **Scale rule** (recomputed on `resize`):
  - `s = clamp(2, 4, min(floor((vw − 32) / 400), floor((vh − 196) / 160)))`.
  - 196 px is the HUD budget (164) plus the page padding (32).
  - The "Scale" setting can force ×2/×3/×4. Below ×2 the page scrolls; desktop only.

  | Viewport (CSS px) | s | Canvas | Total height |
  |---|---|---|---|
  | 1280×720 (a 1280×800 screen minus browser chrome) | 3 | 1200×480 | ≈ 676 |
  | 1440×800 | 3 | 1200×480 | ≈ 676 |
  | 1920×960 | 4 | 1600×640 | ≈ 836 |
  | 1024×640 | 2 | 800×320 | ≈ 516 |

- **Game-screen wireframe at ×3** (content column = canvas width, centred, 16 px page padding):

```
x:0                                                                                    1200
┌────────────────────────────────────────────────────────────────────────────────────────┐ y:0
│  PLAYFIELD  <canvas> 400×160 world px → 1200×480 CSS px                                │
│  DOM overlays, top-centre: [⏸ Paused — you can still assign skills]  [⏩ ×3]           │
│                 under them: refusal / info toast  [✕ Can't dig: steel below]           │
│  bottom-left caption strip: « Off we go! »                                             │
└────────────────────────────────────────────────────────────────────────────────────────┘ y:480
  8 px gap
┌ status line (sunken well, 18 px mono, flex 1 → 860 px) ─────────────┬ minimap well 332×44 ┐ y:488
│ [Pick: All][Follow] Walker ×3  │ Out 12 │ Saved 3 ▰▰▱▱ need 8 │ Time 4:12 │ ▒▒[▭▭]▒▒▒▒▒▒▒▒ │ h:44
└─────────────────────────────────────────────────────────────────────┴─────────────────────┘ y:532
  8 px gap
┌ toolbar role="toolbar" (one Tab stop, roving) ─────────────────────────────────────────┐ y:540
│[−][ 50 ][+] ║ [1][2][3][4][5][6][7][8] ║ [⏸ Pause][⏩ Fast][Pop all] ║ [☰]              │ h:88
│ 48/56/48    ║ 8 skill buttons 80×88    ║ 72 / 72 / 92                ║ 48               │
└────────────────────────────────────────────────────────────────────────────────────────┘ y:628
```
- **Toolbar width budget:**
  - RR group 48+56+48 = 152 px.
  - Group separators: 3 × 8 px.
  - Skills 8×80 + 7×4 = 668 px.
  - Controls 72+72+92 = 236 px.
  - Menu ☰ 48 px.
  - Gaps ≈ 40 px.
  - Total ≈ 1170 px ≤ 1200 ✓.
- **Measured in the mockup at 1280×720:**
  - canvas 1200×480;
  - status line 860×44 with no overflow;
  - minimap well 332×44 on the same row;
  - toolbar bottom at y = 644, so the page is ≈ 660 px tall and fits a 720 px viewport.
  - All controls are ≥ 44×44 (independent check: `validation/ui-contrast.md`).
- **At ×2 (800 px canvas):** the HUD keeps its own minimum width of 800 px. The toolbar wraps into 2 rows (skills on row 1; RR + controls on row 2) with `flex-wrap`, and the minimap drops under the status line. Nothing overlaps the canvas, so focus is never obscured (WCAG 2.4.11).
- **Minimap:**
  - 1 CSS px = **5** world px in both axes (level 1600 wide → 320×32; level 640 → 128×32, left-aligned in a 332×44 well).
  - It shows the terrain silhouette (theme `earth[2]`), steel (theme `steel[1]`), hazards (danger-coloured 2 px strip), the exit (4×6 white doorway glyph) and mumbles (2×2 `#ffc93c` dots).
  - The viewport is a 2 px `#f7f3ff` rectangle, ≥ 12:1 on the sunken well.
- **Top-of-page chrome:** none during play. The ☰ button at the end of the toolbar opens the pause menu, and so does Esc. Every other screen uses a 1200 px max-width column with a `<header>` (logo mark + screen `<h1>`).

### 5.2 Design tokens (replace the values in `src/styles/tokens.css`; names are kept)

All ratios were computed with the WCAG 2.2 relative-luminance formula.

| Token | Value | Use | Contrast (verified) |
|---|---|---|---|
| `--color-bg` | `#14112a` | page | — |
| `--color-surface` | `#1f1b3d` | panels, cards, dialogs | — |
| `--color-surface-raised` | `#2c2754` | buttons | — |
| `--color-surface-hover` *(new)* | `#3a3470` | button hover | text 10.1:1 |
| `--color-surface-sunken` *(new)* | `#0c0a1a` | status line, minimap well, RR value | — |
| `--color-border` | `#7a72b8` | control boundaries | 4.3:1 on bg, 3.8:1 surface, 3.2:1 raised |
| `--color-border-strong` *(new)* | `#a59de0` | hover border | 5.6:1 on raised |
| `--color-text` | `#f7f3ff` | body text | 16.8 bg · 15.0 surface · 12.6 raised · 17.9 sunken |
| `--color-text-muted` | `#c9c2e8` | secondary text | 10.8 bg · 9.6 surface · 8.1 raised |
| `--color-text-faint` *(new)* | `#b0a9d4` | key hints, "0 left" | 5.0 hover · 6.2 raised · 7.4 surface · 8.8 sunken |
| `--color-accent` | `#ffc93c` (tuft yellow) | selected skill, primary button, minimap dots | 12.0 bg · 9.0 raised |
| `--color-accent-contrast` | `#2a1433` (plum) | text on accent | 11.0:1 on accent |
| `--color-secondary` | `#ff8a65` (body coral) | decorative highlights, "New" badge | 7.1 surface; plum on coral 7.3 |
| `--color-success` | `#72e08e` | saved ✓, completed | 10.0 surface · 11.9 sunken |
| `--color-warning` | `#ffb44d` | time low, ≤ 3 bricks | 9.3 surface · 11.1 sunken |
| `--color-danger` | `#ff7470` | Pop all, failure | 6.2 surface · 5.2 raised; plum on danger 6.4 |
| `--color-info` *(new)* | `#8fb6ff` | hints, links | 8.0 surface |
| `--color-focus` | `#6fe3ff` (cyan) | focus ring only | 12.3 bg · 11.0 surface · 9.3 raised |

**Rules**
- **Focus ≠ selected:** focus is **cyan**, selection is **yellow + notch**. The focus ring is `outline: 3px solid var(--color-focus); outline-offset: 2px`, so the 2 px gap always shows bg or surface (≥ 11:1). It is never removed, and it coexists with the selected state.
- No information is carried by colour alone. Every coloured state also has an icon, text or shape (✓, ⚠, ✕, notch, hatch).

**Type** (no web-font fetches):

| Token | Value |
|---|---|
| `--font-ui` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (status line, counts; plus `font-variant-numeric: tabular-nums`) |
| `--font-display` *(new)* | `--font-ui` at weight 800–900, `letter-spacing: .02em`, with the "sticker" treatment: `paint-order: stroke fill; -webkit-text-stroke: 6px #2a1433` + `text-shadow: 0 4px 0 #2a1433` |

- **Scale:** `--text-xs .75rem` (12, badges only) · `--text-sm .875rem` (14) · `--text-md 1rem` (16) · `--text-lg 1.25rem` (20) · `--text-xl 1.5rem` (24) · `--text-2xl 2rem` (32) · `--text-hero clamp(3rem, 7vw, 5.5rem)`.
- **Minimums:** no running text below 14 px. The status line is 18 px mono. Skill names are 14 px/600. Counts are 20 px mono/700.
- **Line-height:** 1.5 for body, 1.1 for display.

**Spacing and shape**
- **Spacing:** 4 px grid (`--space-1` … `--space-8` as today) plus `--space-12: 3rem`.
- **Radius:**
  - `--radius-sm 6px` (badges, chips)
  - `--radius-md 10px` (buttons)
  - `--radius-lg 16px` (cards, dialogs)
  - `--radius-pill 999px`
- **Depth** ("chunky toy" buttons): `--shadow-raised: 0 3px 0 #0c0a1a`. When pressed: `translateY(2px)` with a 1 px shadow. With reduced motion there is no translate, only the colour change.
- **Motion:** `--duration-fast 120ms`, `--duration-normal 220ms`, both zeroed under `data-motion="reduce"` (already wired).

**Sizes**
- `--hud-button-h: 88px` (≥ 44 ✓ WCAG 2.5.5)
- `--skill-w: 80px`
- `--control-w: 72px` (Pop all 92px, ☰ 48px, RR ± 48px)
- `--min-target: 44px`: every clickable element in menus is ≥ 44×44. Nothing anywhere is < 24×24 (2.5.8).

### 5.3 HUD components and states

**Skill button** (80×88), content top to bottom:
- key hint `1` (top-left, 12 px faint);
- count badge (top-right, 20 px mono bold on a sunken pill);
- 16×16 pixel icon at ×3 = 48×48 (from `sprites.js` icons);
- name (14 px/600).

| State | Visual (never colour-only) | ARIA |
|---|---|---|
| default | raised fill, 2 px `--color-border`, 3 px bottom shadow | `aria-pressed="false"`, `aria-label="Digger, 3 left"` |
| hover | `--color-surface-hover` fill, `--color-border-strong` border | — |
| focus-visible | + cyan 3 px ring, 2 px offset | — |
| pressed (`:active`) | translateY(2px), 1 px shadow | — |
| **selected** | **3 px yellow border** + yellow 12% inner tint + **yellow ▲ notch** under the button + bold name | `aria-pressed="true"` |
| **0 left** (`aria-disabled="true"`) | count shows **"0"** in faint text; icon at 45% opacity; **diagonal hatch overlay** (`repeating-linear-gradient(45deg, #ffffff14 0 4px, transparent 4px 8px)`); still focusable and clickable (gives refusal feedback) | `aria-label="Digger, none left"` |
| selected **and** 0 left | selected styling + hatch; the status line shows "No diggers left" | — |
| refusal flash | 3 horizontal shakes of ±3 px over 240 ms (reduced motion: 2 blinks of the red ✕ badge in the top-right, total 400 ms; ≤ 3 flashes/s) | message via Announcer |
| count changed | count badge scales 1.0→1.25→1.0 over 160 ms (none with reduced motion) | label updated |

**Release-rate group** `role="group" aria-label="Release rate"`:
- The **−** and **+** buttons are 48×88 with glyphs 28 px bold.
- The value well (56×88, sunken) shows the RR number (24 px mono) plus a sub-label with the interval, e.g. **"1.6 s"** (12 px), computed as `((99−RR)>>1)+4` ticks ÷ 17.
- − is `aria-disabled` at the level minimum and shows a small padlock glyph with "min". + is `aria-disabled` at 99.

**Controls**
- **Pause** 72×88: two-bars icon + "Pause". When paused: yellow selected styling, and a DOM pill over the canvas top-centre reads **"⏸ Paused — you can still assign skills"** (16 px, surface-sunken at 90% opacity, 1 px border).
- **Fast** 72×88: double-chevron icon + "Fast". When active: selected styling, and a pill reads **"⏩ ×3"**.
- **Pop all** 92×88: danger border, plum-on-red "burst" icon.
  - **Armed** (after the first press): solid danger fill with plum text **"Press again"**, a 2 px dashed plum inner outline, and a bubble above reading "Press Pop all again (or N) to pop every mumble · Esc cancels".
  - The armed state persists with no timeout, until confirmed, Esc, or any other action.
  - In reduced motion there is no pulse; otherwise the border pulses at 1 Hz, which is below the flash threshold.

**Status line** (sunken well, 18 px mono, tabular numbers; plain text, not a live region, and not `aria-hidden`):
0. **Chips** (real buttons, 32 px high inside the 44 px row):
   - **Filter** `Pick: All` / `Walkers` / `Facing ←` / `Facing →` (`V`), with `aria-label="Selection filter: walkers only"`;
   - **Follow** (`L`), `aria-pressed`, yellow border when on.
1. **Focus label**, a fixed 16ch slot so nothing jumps: `Walker ×3` / `Builder · 4 bricks` / `Climber + Floater` / blank.
2. `Out 12`.
3. `Saved 3` + a mini meter (8 segments, filled ▰ vs ▱) + `need 8`. When the goal is met: success colour + ✓ glyph + "goal met".
4. `Time 4:12`:
   - under 30 s: warning colour + ⚠ glyph (no blinking in reduced motion; otherwise a 1 Hz blink);
   - relaxed timer: `Time 4:12 · relaxed`.

**Minimap** 320×32 max (1:5) in a 332×44 sunken well: 2 px border, cursor `pointer`, focusable (keyboard behaviour in §6). The hover state shows a ghost viewport rectangle at the pointer.

**Playfield cursor**
- A CSS custom cursor (a data-URL PNG generated at runtime from the pixel crosshair in `sprites.js`) in 3 sizes: **32 / 48 / 64 px** (Settings → Cursor size).
- Over a pickable mumble, the canvas draws the hover bracket (overlay art) around it, and the crosshair stays.
- The keyboard cursor is the same crosshair drawn in-canvas with a 1 px dark halo.

**Bark caption strip**: bottom-left inside the canvas box, DOM, max 2 lines visible, 16 px, 2.5 s each, `aria-hidden="true"` (the announcer covers speech).

**Toast** (refusals and one-line info): a DOM plate top-centre under the pause pill, 16 px, `✕` + danger border for refusals and `ℹ` + info border for info. It shows for 2.5 s, max 1 at a time (newest replaces), and is `aria-hidden` (the Announcer speaks it).

### 5.4 Screens

Every screen follows the same rules:
- one `<h1>`, landing focus per architecture;
- max-width 1200 px, centred;
- surface cards;
- ≥ 44 px targets;
- primary action first in DOM order;
- Esc = back.

| Screen | Layout & content | States |
|---|---|---|
| **Title** | **Logo:** "Mumblemarch" in the display style (hero size, yellow fill `#ffc93c`, plum stroke; each letter offset ±3 px vertically like a marching line). **Tagline** (from copy). **Menu column** (buttons 320×56): **Play** (primary; continues at the first unfinished level's briefing) · **Levels** · **How to play** · **Settings**. **Footer:** a canvas strip 1200×96 where 5–8 mumbles march across on a grassy ledge; with reduced motion it is a static frame. Small text: "Sound starts after your first click or key press." | first visit: Play reads "Start"; returning: "Continue — 4 · The Punch Line" |
| **Level select** | `<h1>Levels</h1>`, then one `<section>` per tier with an `<h2>`: **Breezy** · **Knotty** · **Gnarly** · **Stampede**. Each tier heading shows a shape-based difficulty mark (1–4 filled rounded pips) and a 1-line descriptor. **Card grid:** 4 per row at 1200, cards 282×176: a thumbnail (level scaled to fit 250×25 world→CSS, i.e. a mini minimap, over the theme background colour), then "3" (number badge), the title, then the state row. Cards are `<button>`s in a list; arrow keys move within the grid (roving tabindex), and Tab jumps to the next tier. | **locked:** padlock icon + "Finish level 2 to unlock", fill at 60% but text stays ≥ 4.5:1, `aria-disabled`. **New:** coral "New" badge. **Completed:** ✓ badge + "Best: saved 14 of 20". **Perfect** (100%): ✓ + star "Everyone home". **Current/last played:** yellow left border stripe. A Settings toggle "Unlock all levels" overrides locks. |
| **Briefing** | Header row: `Level 3 · Breezy` (muted) above `<h1>` title (2xl display). **Thumbnail:** the whole level at 1 CSS px = 1 world px, i.e. up to 1200 wide (≤ 1600-wide levels at 0.75), with entrance/exit markers. **Facts** `<dl>` in a 5-column row of stat tiles: *Mumbles* 20 · *Save* 10 (50%) · *Release rate* 50 · *Time* 5:00 · *Tier* Breezy. **Skills available:** icon chips with counts (only non-zero ones, in bar order). **Hint:** a collapsed "Show hint" disclosure button (spoiler-safe). **Buttons:** **Let's march!** (primary, Enter) · Back to levels (Esc). | relaxed timer on: the Time tile reads "5:00 · relaxed". Already completed: adds "Best: 14 saved". |
| **Pause menu** | A native `<dialog>` over the frozen game (backdrop 60% black; the game keeps rendering its paused frame). `<h2>Paused</h2>`, then an objective line "Saved 3 · need 8 of 20 · 4:12 left". Buttons: **Resume** (Esc/P) · Restart level · Show briefing · How to play · Settings · Quit to levels. A mini controls cheat-sheet sits at the bottom (5 most-used keys). | Restart asks for confirmation inside the dialog ("Restart? Your mumbles go back to the hatch." [Restart] [Cancel]). |
| **Results** | `<h1>` headline (success/fail copy), then the big line "You saved **14** of 20" and a meter with a notch at the requirement: "needed 10". Then the verdict one-liner (copy), a "New best!" badge when it applies, and buttons: **Next level** (primary on success) · **Try again** (primary on failure) · Levels. On failure only, a "Show hint" disclosure. Decor: saved mumbles hop (static with reduced motion). | Success: success colour + ✓ icon in the headline. Failure: warning colour + ↺ icon. Relaxed: the note "Played with the relaxed timer". |
| **How to play** | Two columns. Left: **Goal** (3 sentences) and a **Skills** glossary (8 cards: icon, name, key, one-line effect). Right: **Controls** tables (Mouse / Keyboard, generated from the live bindings) and **Tips** (pause-and-assign, filters, fall ruler). Reachable from title, pause and H/F1. | — |
| **Settings** | Sections as `<fieldset>`s with `<legend>`s: **Sound** (Mute toggle; Master / Effects / Voice chirps / Music `<input type=range>` 0–100 with `<output>`); **Display** (Scale: Auto/×2/×3/×4 radio; Motion: System/Reduced/Full; Clear physics view toggle; Cursor size radio; Captions toggle); **Play** (Relaxed timer; Fall-height ruler; Unlock all levels; Announcements Off/Essential/All); **Controls** (a list of actions with key chips and a "Change" button: press a key, Esc cancels, conflicts are highlighted with a text message; "Reset to defaults"). Changes apply and save immediately; a "Saved" status appears (role="status"). | Every control uses native form elements with visible labels; 44 px rows. |

## 6. Interaction design

Controls are defined once in `src/input/bindings.ts` (`ActionId` → key codes). Help and `aria-keyshortcuts` are generated from it. Every action below also has a pointer path (HUD button, chip or minimap), and every pointer action has a key.

### 6.1 Control map

#### 6.1.1 Keyboard (all single keys are remappable; `Esc` is fixed so there is always a way out)

| Action | ActionId | Default | Behaviour |
|---|---|---|---|
| Choose skill 1–8 | `skill-climber` … `skill-digger` | `1`–`8` | Selects that skill. A skill with **0 left cannot be newly chosen**: selection unchanged, `ui-empty`, refusal text. If the *selected* skill runs out it stays selected (hatched, "0"); we never auto-switch, so a quick second click can never assign a skill the player didn't pick. |
| Previous / next skill | `skill-prev` / `skill-next` | `Q` / `E` | Moves to the previous/next skill **with a count > 0**, wrapping. If none has a count: `ui-empty` + "No skills left". |
| Previous / next mumble | `lemming-prev` / `lemming-next` | `Z`,`[` / `X`,`]` | Keyboard selection (§6.2.3). `Shift` = jump to the next **group** (the first mumble > 8 world px away or in a different state). |
| Assign | `assign` | `Space`, `Enter` | Gives the chosen skill to the **target**: the selected mumble, else the mumble under the cursor (§6.2.2). On a focused HUD button, Space/Enter keep their native "press" meaning instead. |
| Keyboard cursor | `cursor-left/right/up/down` | `A` `D` `W` `S` | Moves the free crosshair (§6.2.4). `Shift` = ×2 speed. |
| Scroll camera | `scroll-left` / `scroll-right` | `←` / `→` | Tap = 8 world px (`SCROLL_STEP`); hold (after 150 ms) = 200 world px/s; `Shift` = 600 px/s. Turns Follow off. On the focused toolbar/minimap the arrows belong to that widget (§6.2.6). |
| Jump to hatch / exit (SHOULD) | **NEW** `camera-hatch` / `camera-exit` | `Home` / `End` | Centre the camera on the first hatch / nearest exit; pressing again cycles hatches/exits. Owned by the toolbar/minimap when they have focus. |
| Centre on target | **NEW** `camera-center` | `C` | Centres the camera on the target mumble (200 ms ease; instant cut in reduced motion). None: "No mumble selected". |
| Follow target | **NEW** `camera-follow` | `L` | Toggles Follow (persisted, chip "Follow"). While on, the camera keeps the selected mumble inside the middle 50 % of the view. In cursor mode, `L` first locks the cursor pick as the selection. Any manual scroll (keys, edge, wheel, minimap, Home/End) turns Follow off. |
| Selection filter | **NEW** `filter-cycle` | `V` | Cycles the chip **All → Walkers → Facing ← → Facing → → All** (§6.3.4). Resets to All at every level start. |
| Release rate − / + | `release-rate-down` / `-up` | `−`,`Num −` / `=`,`Num +` | ±1 per press, `Shift` ±10. Hold: first step on press, repeat after **400 ms** every **60 ms** (Shift: every 150 ms). Clamped to [level minimum, 99]; at a limit: `ui-deny` + status "Release rate can't go below 50 here". |
| Pause / resume | `pause` | `P` | Toggles pause. Assigning, scrolling, selecting, frame-step, RR, Pop all all work while paused (§6.4.1). |
| Frame-step | `frame-step` | `.` | Paused: advance exactly **1 tick**; `Shift+.` = **17 ticks** (1 game second). Hold: repeat after 300 ms at 10 steps/s (a slow-motion crawl). While running: pauses (no step). |
| Fast-forward | `fast-forward` | `F` | Toggles ×3 simulation speed (§6.4.3). |
| Pop all | `nuke` | `N` | Two-step arm/confirm, no timing window (§6.4.5). |
| Restart | `restart` | `R` | Two-step arm/confirm like Pop all (§6.4.6). Immediate if nothing has happened yet or the level has ended. |
| Undo last assignment (SHOULD/stretch) | **NEW** `undo` | `U` | Removes the most recent `assign-skill` or `nuke` command and rebuilds the run (§6.4.7). Repeatable. Leaves the game paused. |
| Mute | `mute` | `M` | Toggles `Settings.muted` (persisted). The status line shows a speaker-off glyph + "Muted" while muted. |
| Briefing | **NEW** `briefing` | `B` | Opens the level briefing as a modal dialog (pauses; restores the previous pause state on close). |
| Help | `help` | `H`, `F1` | Opens How to play as a modal overlay (pauses). |
| Pause menu | `menu` | `Esc` (fixed) | Priority: close an open dialog (native) → disarm an armed Pop all/Restart → end a minimap drag → open the pause menu. |

**Shift rule (one rule, everywhere):** Shift makes the step bigger: RR ±10, frame-step 1 s, cycle by group, scroll ×3, cursor ×2, Shift-click = walkers only. Shift never changes *which* action runs. The InputManager already ignores Ctrl/Meta/Alt. `Shift+=` produces the `+` character on US layouts, so a user who presses "+" with Shift gets +10; the help text therefore labels the keys **`−` / `=`** ("Shift for ×10") and the HUD buttons are the fallback.

#### 6.1.2 Key-conflict audit (MUST hold after any default change or remap)

| Key(s) | Status | Reason |
|---|---|---|
| `Tab`, `Shift+Tab` | **Reserved** (focus) | D8, WCAG 2.1.1. Never bindable. |
| `Esc` | **Fixed** to `menu` | Always a way out (it also leaves browser full-screen first; that is fine). |
| Ctrl/Meta/Alt + anything | Ignored by InputManager | Browser/OS shortcuts; Alt opens menus on Windows. |
| `F5`, `F11`, `F12`, `Ctrl+R`… | Not bindable | Reload, full-screen, devtools. |
| `/`, `'` | Not bindable | Firefox Quick Find opens on them when focus is not in a field. |
| `Backspace` | Not bindable | Historic "back" navigation; also rebinding UI uses it to clear a key. |
| `F1` | Default for `help`, `preventDefault` on keydown | Chrome/Edge/Firefox let pages cancel it; `H` is the primary key. |
| `Space`, `Enter`, arrows, `Home`, `End`, `PageUp/Down` | Owned by the focused control (`ownsKey`) | Native button press; roving toolbar; minimap slider. |
| `1`–`8`, letters | Screen-reader browse mode may swallow them | The canvas is `role="application"`, so NVDA/JAWS switch to focus mode on it; Help tells SR users to press NVDA+Space if keys stop working elsewhere. |

The default table has **no duplicate codes** (verified against `src/input/bindings.ts` + the 7 NEW actions: `KeyC`, `KeyL`, `KeyV`, `KeyU`, `KeyB`, `Home`, `End` are all unused). The rebinding UI (Settings → Controls) accepts at most 2 keys per action, refuses reserved keys with a message, and on a clash offers **"Swap"** / **"Cancel"** ("X is already *Select next mumble*"). Architecture already removes a rebound key from every other action.

#### 6.1.3 Mouse & trackpad

| Input | Where | Behaviour |
|---|---|---|
| Hover | Playfield | Hover bracket around the pick (§6.3.1); status-line label; predictive refusal cue (dashed bracket + ✕) when the chosen skill would be refused. |
| Left press | On a mumble | Selects it **and** assigns the chosen skill (if any) on **pointerdown** (timing precision, like the original). Setting *Assign on release* switches to pointerup: the target is locked at pointerdown and the assignment is cancelled if the pointer leaves the target's snap area first (WCAG 2.5.2). |
| Left press | Empty ground | Nothing is assigned, nothing is deselected, no sound; status "No mumble here" for 1.5 s. |
| Shift + left press | Playfield | Walkers-only for this click (combined with the chip filter). |
| Right button held + left press | Playfield | Same as Shift (veteran habit from the 1991 DOS manual). Right click alone: no-op; the context menu is suppressed on the canvas only. |
| Middle-drag (SHOULD) | Playfield | Pans the camera 1:1; turns Follow off. |
| Wheel / trackpad | Playfield | `deltaX + deltaY` (lines ×16, pages ×400) ÷ scale → camera x; `preventDefault` (non-passive). **Ctrl+wheel / pinch is passed through** (browser zoom). |
| Edge zones | Inner **32 CSS px** at the left/right canvas edges | After a **120 ms** dwell: scroll 150 world px/s, ramping linearly to 400 px/s over 1 s. Works while paused. Turns Follow off. Setting *Edge scrolling* (default on). |
| Press / drag | Minimap | Centres the camera on that x on pointerdown; drag continues (pointer capture). Not destructive, so pointerdown is fine. |
| Click | HUD buttons | Activate on `click` (pointer-up; dragging off cancels). `mousedown.preventDefault()` keeps focus on the canvas (architecture already does this). RR ± also repeat while held (400 ms / 60 ms). |
| Double-click | Anywhere | No meaning. Pop all is never a double-click. |

**Cursor styles:** the playfield uses the CSS pixel crosshair (§5.3) (32/48/64 px from *Cursor size*); an arrow chevron is drawn at the active edge while edge-scrolling; minimap `pointer` (while dragging `grabbing`); HUD `default`. There is never a busy or wait cursor.

---

### 6.2 Keyboard-only play

#### 6.2.1 The flow (what Help teaches, in this order)
1. **Choose a skill:** `1`–`8`, or `Q`/`E`. You hear `ui-select` and "Digger, 3 left" is announced.
2. **Pick a mumble:** `X`/`]` = next, `Z`/`[` = previous, left→right with wrap. The camera follows. Or move the cursor with `W A S D` onto a mumble.
3. **Assign:** `Space` or `Enter`. Press `P` first if you want time to think: assigning works while paused.
4. **Watch:** `L` follows the selected mumble, `C` re-centres on it, `.` steps while paused.

#### 6.2.2 Selection model (one "target" for Space, C and L)
- `selectedId` is the **lock-on selection**, stored by mumble id. It is set by `Z/X/[ ]`, by a mouse click on a mumble, or by `L` in cursor mode. Every frame the bracket and the status label look the mumble up by id, so the selection **moves with it**.
- The **cursor pick** is the mumble picked (§6.3.2) at the shared cursor, which the mouse or `W A S D` moves.
- **Target** = the selected mumble if it is still selectable, else the cursor pick, else none. `W A S D` **clears** `selectedId` (you are now aiming freely). Mouse hover does not clear it.
- If the selected mumble walks out of view with Follow off, a small edge arrow with its label ("▸ Walker") sits at that view edge. `C` brings it back.

#### 6.2.3 Cycling rules
- Order: selectable mumbles (not dying/exiting) passing the chip filter, sorted by `x`, then `id`, **at the moment of the key press** (`cycleLemming`).
- With a current selection, step ±1 in that order, wrapping. With **no** selection: `X` starts at the leftmost mumble **in view**, `Z` at the rightmost in view. If none is in view, start from the one nearest the view centre. After the selection died, continue from its last x (`fromX`).
- If the new selection is off-screen or within 40 world px of a view edge, the camera centres on it (200 ms ease, instant cut in reduced motion).
- Announce: `"{label}, facing {left|right}, {i} of {n}"` (§7.3 #4). With no candidates: `ui-deny` + "No mumbles to select" (or "No walkers to select" when filtered).

#### 6.2.4 Keyboard cursor (`W A S D`)
- It starts at the target mumble, else at the view centre, and is drawn in-canvas (crosshair + 1 px dark halo, §5.3).
- Movement: a tap moves 2 world px. Held keys, after 150 ms, move at 60 world px/s, ramping linearly to 180 px/s over 600 ms. `Shift` doubles the speed. Diagonals are normalised.
- The cursor stays inside the view. Pushing against a side edge scrolls the camera at the cursor's speed.
- **Snap:** the pick uses the same rules and snap radius as the mouse (§6.3.3). When the cursor has been still for 150 ms over a pick, the pick is announced ("Builder · 4 bricks under cursor").
- `Space` in cursor mode acts exactly like a mouse press at the cursor.

#### 6.2.5 When the selected mumble exits or dies
- The selection **clears at once** (a dying mumble accepts no skills, D7). We **never** move the selection to another mumble automatically, so a repeated `Space` can't hit someone the player didn't choose.
- The bracket plays a 250 ms "poof" (none in reduced motion). Announce "Your selected mumble got home" or "Your selected mumble {death}". `fromX` = its last x, so the next `X`/`Z` continues from there. Follow stays switched on but idles.

#### 6.2.6 Focus rules
- **Game keys work** when focus is on the canvas, on `<body>`, or on any HUD control (toolbar, chips, minimap, ☰). They **don't work** inside `<dialog>`s or text fields (InputManager `isInDialog`/`isTextEntry`).
- **Native wins on controls:** `Space`/`Enter` activate the focused button, and arrows/Home/End/PageUp/PageDown belong to the toolbar (roving) and the minimap (slider) (`data-arrow-keys`).
- **Playfield actions pull focus back:** `lemming-*`, `cursor-*`, `camera-center`, `camera-follow` pressed while a HUD control has focus move focus to the canvas first, so the next `Space` assigns instead of re-pressing a button.
- **Mouse never parks focus on the HUD:** HUD buttons `preventDefault()` on `mousedown` (architecture §11). Test: after clicking Digger, `document.activeElement === canvas`.
- **Toolbar = ARIA toolbar pattern:** one Tab stop, roving `tabindex`. `←`/`→` move between RR−, RR+, 8 skills, Pause, Fast, Pop all and ☰ Menu, with wrap; `Home`/`End` go to the first/last item. Buttons with `aria-disabled` (0 left) stay focusable. When focus enters, it lands on the last-focused item (initially the selected skill). **Arrow conflict resolved:** arrows scroll the camera only when focus is on the canvas or the body. Inside the toolbar they move focus, which the toolbar signals with `data-arrow-keys`. Shift+Tab (or any playfield action above) returns to the canvas.
- **Tab order** (= DOM order = visual order, WCAG 2.4.3): ① playfield canvas → ② Filter chip → ③ Follow chip → ④ minimap → ⑤ toolbar (one stop; its last item is ☰ Menu, which `End` reaches and `Esc` duplicates). The status text is not focusable. Nothing overlaps the canvas, so focus is never obscured (2.4.11).
- **Screen changes:** the game screen focuses the **canvas** (so keys work at once). The results screen focuses the **primary button** (Next level / Try again); the headline + verdict are announced as the screen title. Every other screen focuses its `<h1>` or its primary button (router).
- **Dialogs** (pause menu, briefing, help, restart confirm in the pause menu): the least destructive button gets initial focus (Resume / Close / Cancel). Esc closes. Focus returns to the invoker, which is the canvas when a key opened the dialog. The game auto-pauses while any dialog is open and restores the previous pause state on close.

---

### 6.3 Mouse behaviour

#### 6.3.1 Hover highlight & status label
- **Hover bracket:** four 3×3 world-px corner brackets around a 12×14 box on the pick (1 world px lines, cream with a plum outline). **Selected** = the same brackets 2 px thick + a ▼ pip above the tuft. **Would refuse** = dashed brackets + a small ✕. Shape differs in every case, never colour alone.
- **Status focus label** (the fixed 16ch slot, §5.3): hover wins over selection. Selection shows as `Selected: {label}`.
  - `{label}` for walking/falling/jumping mumbles with permanent skills: `Climber + Floater` / `Climber` / `Floater`.
  - Otherwise: `Walker`, `Faller`, `Climber` (climbing, hoisting), `Floater`, `Blocker`, `Builder · {n} bricks`, `Builder · out of bricks` (shrugging), `Basher`, `Miner`, `Digger`, `Bomber · uh-oh`.
  - Lit fuse suffix: ` · pops in {5…1}`.
  - `×{N}` is appended when N ≥ 2, where N = selectable, filter-passing mumbles whose hit box contains the pointer. Examples: `Walker ×3`, `Climber + Floater`, `Builder · 4 bricks`.
  - Filtered out: `No walkers here`.
  - Predicted refusal: the status line appends `— can't dig: steel below` (refusal text, §6.5).

#### 6.3.2 Picking priority (`pickLemmingAt(lemmings, p, skill, {filter, scale})`, MUST)
1. **Candidates** = selectable mumbles passing the filter (chip AND click modifier) whose `LEMMING_HITBOX` (x−6..x+6, y−11..y+1) contains `p`.
2. If there are none: the single nearest selectable, filter-passing mumble whose body centre `(x, y−5)` lies within the snap radius `R`. Ties go to the later released.
3. If a skill is chosen and at least one candidate would **accept** it (`checkAssign`), drop the ones that would refuse. This generalises the original builder/basher/miner/digger fallback (RESEARCH §2.2) to every skill.
4. Prefer **busy** mumbles (blocking, building, shrugging, bashing, mining, digging, ohno), as in the original.
5. Then the **last released** (highest id), as in the original.

#### 6.3.3 Hit area & snap
- The hit box stays 13×13 world px = **39×39 CSS px at ×3 and 26×26 at ×2**, which is ≥ 24×24 (WCAG 2.5.8) at every allowed scale.
- **Snap radius R = ceil(24 CSS px ÷ scale)** world px (×2: 12, ×3: 8, ×4: 6), measured from the body centre. It applies only when no hit box contains the pointer.

#### 6.3.4 Filters (replacing the "hold right button" of the original)
| Chip value | Passes | Chip label | Icon |
|---|---|---|---|
| All | every selectable mumble | `Pick: All` | four dots |
| Walkers | state `walking` or `jumping` (flags allowed) | `Pick: Walkers` | boot |
| Facing ← | `dir === −1` | `Pick: Facing ←` | left arrow |
| Facing → | `dir === +1` | `Pick: Facing →` | right arrow |

The filter applies to hover, click, cursor snap and cycling. Shift-click or right-held adds "walkers" for that single press. Changing the filter never drops an existing selection. Announce "Filter: walkers only. 5 in view."

---

### 6.4 Game-flow controls

#### 6.4.1 Pause & assigning while paused (precise definition, MUST)
- While paused, an `assign-skill` (and `adjust-release-rate`, `nuke`) is **applied immediately** through the same code path the start of a tick uses, and recorded with `tick = session.tick` (the next tick to run). In the normal flow that command would apply at the start of that tick before anything moves, and nothing moves while paused, so this is deterministic and replays identically (N10, preferred variant).
- The core emits `skill-assigned` / `skill-rejected` from that call, and the controller passes them to the sinks **now**. Sound, count −1, the new pose (fuse, STOP paddle, first builder frame) and the announcement are all immediate.
- **Pending badge:** every mumble assigned during the current pause shows a 5×5 world-px "paused clock" pip beside its skill pop-icon. The status line shows `Ready: 2 jobs start when you resume`. Both disappear when the next tick runs (resume or frame-step). The badge carries no rule; it only tells the player that time is frozen.
- Several assignments in one pause are allowed and apply in press order. Each one is checked against the state *after* the earlier ones, so a second Climber on the same mumble is refused ("Already a climber"), while Climber then Floater stacks.
- While running, commands queue for the next tick (≤ 59 ms). Feedback comes from the events of that tick.
- The pause plate (§5.3): "⏸ Paused — you can still assign skills". The music ducks −10 dB with a 900 Hz low-pass. UI sounds keep playing.

#### 6.4.2 Frame-step
Exactly 1 tick per press (`Shift` 17). It runs `session.step()` through the normal sink path, so sounds, events and announcements behave as in real time. Pending commands apply on that tick. The status line shows `Tick 312 (+1)` for 1.5 s.

#### 6.4.3 Fast-forward
- ×3 (`FAST_FORWARD_SPEED`). The **clock runs in game time**: 17 ticks = 1 clock second, so real time runs 3× faster too. This is fair and deterministic.
- FF stays on across pause/resume and turns off at level end and on restart.
- Music tempo is unchanged.
- The optional *Game speed* setting (100 / 75 / 50 %) scales normal speed the same way and never costs clock time.

#### 6.4.4 Release rate
- Steps are sent as `adjust-release-rate` commands, clamped by the core to [level minimum, 99]. The value well shows the rate and the interval `((99−RR)>>1)+4` ticks ÷ 17, one decimal ("1.6 s").
- At a limit the button gets `aria-disabled="true"` (still focusable). Pressing it plays `ui-deny` and shows the status "Release rate can't go below {min} here".
- The rate is announced 500 ms after the last step (coalesced).

#### 6.4.5 "Pop all" (two-step, no timing window, MUST)
- **Idle → Armed:** a press of `N` or a click (on `click`, i.e. pointer-up) arms it. The button turns armed (§5.3: solid danger fill, "Press again", a dashed inner outline and a bubble). It plays `ui-arm` and makes an **assertive** announcement (§7.3 #22).
- **Armed → Confirmed:** the next `N` keydown (a *new* keydown; auto-repeat is ignored) or the next click on the button. Enqueues `nuke` (applied at once if paused). The button becomes "Popping…" with `aria-disabled`.
- **Armed → Idle:** `Esc`, or **any other** action or pointer press (a skill key, a playfield click, P…). It says "Pop all cancelled". There is **no timeout**: the armed state waits forever.

#### 6.4.6 Restart
- `R` arms with the same pattern: status + bubble "Press R again to restart · Esc cancels", `ui-arm`, assertive announcement.
- The pause-menu **Restart level** uses the in-dialog confirmation (§5.4).
- Restart is **immediate** when no command has been issued and the tick is < 54, or when the level has ended.

#### 6.4.7 Undo last assignment (SHOULD; stretch if time is short)
- `U` removes the last `assign-skill`/`nuke` from `CommandQueue.history()`, rebuilds a session from `(level, seed, relaxedTimer, remaining commands)`, and runs it headless to the current tick with the sinks muted. It then pauses.
- Budget: 300 s × 17 = 5100 ticks, target < 150 ms. Show "Rewinding…" if it takes longer than 100 ms.
- RR commands are kept. It plays `undo`, and announces "Undid Digger. Paused." Nothing to undo: `ui-deny`, "Nothing to undo".

#### 6.4.8 Auto-pause
The game pauses (and says "Paused") when the tab is hidden, when the window loses focus (setting *Pause when the window loses focus*, default on), and while any dialog is open. It **never auto-resumes**, except that closing a dialog restores the state it had before.

---

### 6.5 Invalid-assignment feedback (a refused skill is **never** consumed)

Every refusal shows: a ✕ badge (7×7 world px, white ✕ on plum) over the mumble for 600 ms, the skill-button refusal animation (§5.3) (3 shakes of ±3 px over 240 ms; in reduced motion, 2 blinks of the ✕ badge over 400 ms), the status text for 2.5 s, and the announcement (same words, polite, key `refusal`). **Exception:** `level-ended` refusals show status text only, with no sound and no announcement, because the result was already announced assertively (§7.3 #34) and later input must not talk over it.

| `SkillRejectReason` | Concrete cause (core detail, see notes) | Sound | Status / announcement text |
|---|---|---|---|
| `none-left` | count is 0 | `ui-empty` | "No {skill plural} left" (e.g. "No diggers left") |
| `not-applicable` | `already-climber` / `already-floater` | `ui-deny` | "Already a climber" / "Already a floater" |
| `not-applicable` | `fuse-lit` | `ui-deny` | "That fuse is already lit" |
| `not-applicable` | `airborne` (falling, floating, climbing, hoisting, jumping + a job skill) | `ui-deny` | "Needs solid ground to {verb}" (dig, build, bash, mine, block) |
| `not-applicable` | `is-blocker` (anything except Bomber) | `ui-deny` | "Blockers only take a Bomber" |
| `not-applicable` | `same-job` (e.g. Digger on a digger) | `ui-deny` | "Already digging" |
| `not-applicable` | `busy-dying` (drowning, burning, splatting, exploding, ohno, exiting) | `ui-deny` | "Too late for that one" |
| `steel` | steel ahead / below | `steel` | "Can't {verb}: steel {ahead / below}" |
| `one-way` | arrow wall against the direction | `steel` | "Can't {verb} against the arrows" |
| `blocker-overlap` | field would overlap another blocker | `ui-deny` | "Too close to another blocker" |
| `too-high` | builder head near the level top | `ui-deny` | "No room to build up here" |
| `no-lemming` | the id is gone (race) or `Space` with no target | `ui-deny` | "No mumble selected — press X to pick one" |
| `level-ended` | input after the end | none | "The level is over" (status only) |
| *(UI, no command)* | click on empty ground | none | "No mumble here" (status only) |

---

## 7. Accessibility

Accessibility is pillar 7, not an add-on. Each gap A1–A16 from RESEARCH §7 has a requirement **and** a test (§7.1), so the testing phase can check it. The UI-level rules are in §5:
- **Contrast:** tokens (§5.2) with verified ratios.
- **Targets:** at least 44 px (§5.3).
- **Focus:** ring distinct from selection.

### 7.1 RESEARCH §7 A1–A16 → requirements & testable acceptance criteria

| # | Requirement | Acceptance criterion (how to test) |
|---|---|---|
| A1 Targets | 13×13 world hit box + snap R (§6.3.3); HUD ≥ 44×44; nothing < 24×24 | E2E: every `button, [role=slider]` on game/menus has `getBoundingClientRect()` ≥ 44×44 (chips ≥ 32 high inside a 44 row count as ≥ 24 + spacing). Unit: a press 7 world px from a lone mumble's body centre at ×3 selects it; 9 px does not. |
| A2 Timing | Assign while paused, frame-step, FF, game speed, undo (SHOULD), instant restart | Unit: while paused, `assign` changes the skill count before any tick. `frame-step` advances `snapshot().tick` by exactly 1 (17 with Shift). E2E: every Tier-1 level is solvable with all assignments made while paused. |
| A3 Keyboard | Full keyboard play (§6.2) | **With the mouse unplugged, levels 1–3 can be completed using only the keys listed in Help.** Every control is reachable with Tab, and the focus ring is visible (cyan 3 px, ≥ 3:1) at every stop. |
| A4 Crowds | Filter chip, Shift-click, busy/accept priority, persistent selection | Unit: 10 overlapping walkers + 1 digger, Bomber chosen → the digger is picked. Filter "Walkers" → the digger is never picked. "Facing ←" cycles only left-facing mumbles. |
| A5 No holds | Every hold has a press alternative | Checklist: RR by single presses; filter is a toggle; minimap reachable by keys; scrolling by taps or minimap keys. No action *requires* a held key or drag. |
| A6 Colour | Pattern/shape cues (§7.5); clear physics view | In a greyscale screenshot of each theme, steel, earth, one-way, hazards, exit, the selected skill, a 0-left skill and a selected mumble are all distinguishable. Text ≥ 4.5:1, UI parts ≥ 3:1 (§5.2 tokens). |
| A7 Sound-only | A visual twin for every SFX (§7.6) | With `muted: true`, every row of §7.6 is observed during an E2E run of a level that uses all skills. |
| A8 Status output | Live regions via `Announcer` (§7.3); real buttons with names/states | VoiceOver + Chrome: announces skill choice, selection, refusal, batches, time warnings and the result. The instrumented Announcer log shows **≤ 1 polite message per 1000 ms** and no identical text repeated within 3 s (except direct key presses). |
| A9 Audio control | master/sfx/voice/music + mute, persisted; nothing before a gesture | Before any user gesture `AudioContext` is not created (hook: `__game.audioState() === 'locked'`). `M` toggles and survives a reload. Each slider changes only its bus. |
| A10 Flash/motion | §7.4 reduced motion; §7.8 flash limits | With `prefers-reduced-motion: reduce`, `data-motion="reduce"` is set and no particle, shake or eased camera move occurs. A frame capture of a 20-mumble Pop all shows ≤ 3 burst sprites started per second and no full-screen luminance change. |
| A11 Time | Relaxed timer (§7.9) | With the relaxed timer on, the level keeps running past 0:00, overtime is shown, and the results show the relaxed note. The level still counts as completed. |
| A12 Destructive | Two-step Pop all / Restart, no timing window, pointer-up | Unit/E2E: one `N` never pops. Arm, wait 60 s, then `N` still confirms. Arm then `Esc` or `1` disarms. Press on the button, drag off, release: nothing happens. |
| A13 Remap | Settings → Controls (§7.11) | Every non-reserved action can be rebound. Reserved keys are refused with a message. Clashes offer Swap/Cancel. The binding survives a reload, and Help plus `aria-keyshortcuts` update (both generated). |
| A14 Objective | Status "Saved 3 ▰▱ need 8"; `B` briefing; fall ruler; hints | `B` opens the briefing at any time and returns focus to the canvas on close. The status line always shows saved/needed. The fall ruler (§7.11) shows safe (≤ 63 px) vs deadly (≥ 64 px) with an icon + line style. |
| A15 Autosave | Progress saved at every level end; "Unlock all levels" | After a win, a reload shows the level as completed. With *Unlock all levels* on, every card is enabled. |
| A16 Tutorials | One-verb Tier-1 levels; level 1's hint names the keys | Level 1's briefing hint includes "1–8, X, Space" (keyboard) and "click a mumble" (mouse). |

### 7.2 ARIA & semantics (MUST)

| Element | Markup |
|---|---|
| Playfield `<canvas>` | `tabindex="0"`, `role="application"`, `aria-roledescription="playfield"`, `aria-label="Playfield: {level title}"`, `aria-describedby="stage-help"`. The help text reads: "Choose a skill with 1 to 8. Pick a mumble with X and Z, or move the cursor with W A S D. Press Space to assign. P pauses, H opens help." |
| Toolbar | `role="toolbar" aria-label="Skills and controls"`, `data-arrow-keys`, roving tabindex |
| Skill button | `<button aria-pressed>`; `aria-label="Digger, 3 left"`; at 0: `aria-disabled="true"` + `aria-label="Digger, none left"`; `aria-keyshortcuts="8"` (generated). The key-hint digit and count badge are a decorative `aria-hidden` overlay sibling of the `<button>` (outside its subtree, not inside it), so the label stays a clean superset of the button's own rendered text (VIS-1, WCAG 2.5.3) |
| RR group | `role="group" aria-label="Release rate"`; buttons `aria-label="Slower release"` / `"Faster release"`; at the level minimum/maximum, `aria-disabled="true"` + `aria-label="Slower release, min"` / `"Faster release, max"` (CMP-1: "+" at 99 used to also say "min"). Value well: `aria-hidden` on the digits, with a visually hidden `<span>` "Release rate 50, one every 1.6 seconds" linked via `aria-describedby` on both buttons |
| Pause / Fast | `aria-pressed`; labels "Pause" / "Fast forward"; `aria-keyshortcuts` |
| Pop all | `aria-label="Pop all"`. Armed: `aria-label="Confirm pop all"` + `aria-describedby` → the bubble text. Confirmed: `aria-disabled="true"` |
| Filter / Follow chips | `<button>`; filter `aria-label="Selection filter: walkers only"` (cycles on press); follow `aria-pressed` + `aria-label="Follow selected mumble"` |
| Status line | `<p>` plain text, **not** a live region (D9); the meter glyphs are `aria-hidden`, with the text "Saved 3, need 8" |
| Minimap | `<canvas tabindex="0" role="slider" data-arrow-keys aria-label="Level map" aria-valuemin="0" aria-valuemax="{w−400}" aria-valuenow="{camera.x}" aria-valuetext="Showing {x0} to {x1} of {w}. {n} mumbles in view.">`; `←/→` ±16 world px (hold repeats), `PageUp/PageDown` ±400, `Home/End` start/end |
| Dialogs | native `<dialog>` + `aria-labelledby` (`<h2>`) + `aria-describedby` |
| Level select | `<h2>` per tier; `<ol>` of `<button>`s; unlocked name "Level 3: {title}, {state}. {Tier}." — state moved in front of the tier name and comma-separated from the title so it stays contiguous with the rendered "{title} {state}" run (VIS-1 order + A11Y-4 comma, WCAG 2.5.3); no state → "Level 3: {title}. {Tier}." Locked: `aria-disabled="true"` + name "Locked. Level 3: {title} Finish level 2 to unlock. {Tier}." grid roving per §5.4 |
| Caption strip | `aria-hidden="true"` (the Announcer covers speech) |

### 7.3 Live-region announcement catalogue (exact templates; `{Skill}` capitalised, `{skill}` lower case)

| # | Event / trigger | Message template | Pol. | Level | Throttle / coalesce key |
|---|---|---|---|---|---|
| 1 | Game screen ready | `{title}. Save {required} of {total}. Skills: {Skill} {n}, …. {Skill} chosen. Press H for help.` | polite | essential | once |
| 2 | Skill chosen | `{Skill}, {n} left` | polite | essential | `skill` |
| 3 | 0-left skill pressed | `No {skill plural} left` | polite | essential | `skill` |
| 4 | Keyboard/click selection | `{label}, facing {left\|right}, {i} of {n}` + `, {filter}` if not All | polite | essential | `selection` |
| 5 | Cursor settles 150 ms on a pick | `{label} under cursor` | polite | essential | `selection` |
| 6 | Assignment accepted (keyboard) | `{Skill} assigned` (paused: `{Skill} assigned. Starts when you resume.`) | polite | essential (mouse: all) | `assign` |
| 7 | Refusal | the §6.5 text | polite | essential | `refusal` |
| 8 | Selected mumble exits | `Your selected mumble got home` | polite | essential | `selection` |
| 9 | Selected mumble dies | `Your selected mumble {death}` (strings `DEATH_TEXT`) | polite | essential | `selection` |
| 10 | Saves/losses batch | `{s} saved, {l} lost. {saved} of {required} home.` (omit the zero part) | polite | essential | batch ≥ 2 s apart |
| 11 | Goal reached (first time) | `Goal reached: {saved} of {required} home!` | polite | essential | once |
| 12 | Goal now impossible | `Not enough mumbles left to reach {required}. Press R to try again.` | polite | essential | once |
| 13 | Only blockers left | `Only blockers are left. Use Pop all to finish.` | polite | essential | once |
| 14 | Release rate settled (500 ms) | `Release rate {rr}, one every {s} seconds` (at the min: `…, the lowest for this level`) | polite | essential | `rr` debounce |
| 15 | Pause / resume | `Paused` / `Resumed` | polite | essential | `pause` |
| 16 | Frame-step | `Stepped 1 tick` / `Stepped 1 second` | polite | all | `step` debounce 300 ms |
| 17 | Fast-forward | `Fast forward on` / `Fast forward off` | polite | essential | `speed` |
| 18 | Filter | `Filter: {All mumbles\|Walkers only\|Facing left\|Facing right}. {n} in view.` | polite | essential | `filter` |
| 19 | Follow | `Following your selected mumble` / `Follow on. Select a mumble to follow.` / `Follow off` | polite | essential | `follow` |
| 20 | Mute | `Sound off` / `Sound on` | polite | essential | `mute` |
| 21 | Briefing/help opened | (dialog title is read natively) | — | — | — |
| 22 | Pop all armed | `Pop all is ready. Press N again to pop every mumble, or Escape to cancel.` | **assertive** | essential | — |
| 23 | Pop all / restart disarmed | `Pop all cancelled` / `Restart cancelled` | polite | essential | `arm` |
| 24 | `nuke-started` | `Popping all mumbles!` | **assertive** | essential | — |
| 25 | Restart armed | `Press R again to restart the level, or Escape to cancel.` | **assertive** | essential | — |
| 26 | `time-low` 60/30/10 | `1 minute left` / `30 seconds left` / `10 seconds left` | polite | essential | `time` |
| 27 | Relaxed clock hits 0 | `Time's up, but the relaxed timer lets you keep going.` | polite | essential | once |
| 28 | Undo | `Undid {Skill}. Paused.` / `Nothing to undo` | polite | essential | `undo` |
| 29 | `builder-low-bricks` | `Builder: {n} bricks left` | polite | all | `builder` |
| 30 | `builder-finished` | `A builder ran out of planks` | polite | all | `builder` |
| 31 | `hit-steel` | `{label} hit steel` | polite | all | `steel` |
| 32 | `lets-go` / `entrance-opened` / `all-released` | `Off we go!` / `Hatch open` / `All mumbles are out` | polite | all | own key |
| 33 | `lemming-ohno` (not nuking) | `A bomber is about to pop` | polite | all | `bomber` |
| 34 | `level-ended` | won `Level complete! {saved} of {total} saved, {required} needed.`; lost `Not quite. {saved} of {total} saved, {required} needed.`; time-up `Time's up! {saved} of {total} saved, {required} needed.` | **assertive** | essential | — |
| 35 | Results screen | router title = `{headline}. {verdict}` (§9.5) | polite | essential | — |

**Throttle rules (Announcer, MUST):**
1. Messages said within 50 ms join with ". " (architecture).
2. Polite messages go through a queue with **≥ 1000 ms between messages**. A new message whose key is already queued **replaces** it in place. The queue holds at most 4 messages; on overflow the oldest `all`-level one is dropped first.
3. The same text within 3 s is dropped unless a direct key/click caused it.
4. Assertive messages speak at once, remove any queued polite message with the same key, and are limited to 1 per 1000 ms.
5. Level `off` = nothing; `essential` = rows marked essential; `all` = every row.

### 7.4 Reduced motion (`motion: 'system'` follows `prefers-reduced-motion`; `'reduce'` / `'full'` override)

| Element | Full | Reduced |
|---|---|---|
| Explosion confetti / sparks | 24 particles, 0.8 s | none; a static 2-frame pop star for 250 ms |
| Camera shake | 1 world px, 150 ms on a nearby explosion (never during Pop all) | none |
| Camera jumps (C, cycling, Home/End, minimap, undo) | 200 ms ease-out | instant cut |
| Follow camera | dead-zone + easing | dead-zone, integer steps, no easing |
| Water/caramel/brass shimmer, star twinkle, exit glow | animated | static frame (the pattern stays) |
| Trap idle "tell" | looping animation | static armed/cooling icon (the information is kept) |
| Idle anims (tuft sway, blinking) | on | off |
| "+1" / "−1" markers | rise 12 px over 600 ms | static for 600 ms |
| UI transitions, press translate, count-badge pop, skill shake | on | 0 ms; the shake becomes 2 ✕ blinks (§5.3) |
| Pop-all button pulse, 30 s timer blink | 1 Hz | static |
| Title-screen marching strip | animated | static frame |
| Kept in both | walk cycles, job animations, bomber digits, hatch opening (gameplay information) | — |

### 7.5 Non-colour cues (colour-blind safe, MUST)
- **Terrain:** steel = rivets; one-way = chevrons; hazards = waves, bubbles or flame tips + an icon at each end; traps = an idle tell + hazard stripes on the base; exit = door silhouette + beacon.
- **Mumbles:** selected = thick bracket + ▼ pip; hover = thin bracket; "would refuse" = dashed + ✕; pending = clock pip; bomber = digits; builder low = pips (hollow when ≤ 3) + number.
- **HUD:** selected skill = yellow border **+ notch + bold**; 0 left = hatch + "0"; armed = dashed outline + text; paused = plate text; FF = "×3" text; time low = ⚠ + plate; goal met = ✓ + "goal met"; muted = speaker-off glyph + "Muted".
- **Feedback:** saved = "+1" with ✓; lost = "−1" with ✕.
- **Clear physics view** (`highContrast`): flat classes, each with its own pattern and ≥ 3:1 against the others.

### 7.6 Visual equivalent for every sound (MUST; captions per §7.7)

| SfxId | Visual twin | SfxId | Visual twin |
|---|---|---|---|
| `ui-move` | focus ring / bracket moves | `lets-go` | caption "Off we go!" + hatch wiggle |
| `ui-select` | skill selected styling | `entrance-open` | hatch doors open |
| `ui-back` | screen/dialog closes | `ohno` | hands-on-head pose + "!" |
| `ui-deny` | ✕ badge + shake/blink + status | `exit` | hop into door + "+1 ✓" |
| `ui-empty` | hatched "0" + status | `splat`/`drown`/`burn` | flatten / sink + bubbles / scorch puff, "−1 ✕" |
| `ui-arm` | armed button + bubble | `trap`, `trap-*` | trap animation + "−1 ✕" |
| `pause`/`unpause` | plate + pressed Pause | `explosion` | pop star + crater |
| `ff-on`/`ff-off` | "×3" plate + pressed Fast | `nuke` | fuses on all + "Popping…" |
| `rr-up`/`rr-down` | value + interval update | `builder-low` | amber hollow pips 3/2/1 |
| `undo` | count +1 + "Undone" toast | `builder-shrug` | shrug pose + empty-plank icon |
| `assign` | skill icon pops over the mumble, count −1 | `steel` | spark + rivet icon at contact |
| `fuse` | tuft spark + digit 5 | `time-low` | ⚠ plate on the clock |
| `level-won`/`level-lost` | results headline | music | none needed (ambience) |

### 7.7 Captions (bark strip)
- The strip is DOM, sits bottom-left inside the canvas box (inset 8 px), and is `aria-hidden`.
- It shows at most **2 lines**, 16 px, each for **2.5 s**. The newest line is at the bottom, with a 150 ms fade (none in reduced motion). Text sits on a sunken plate at 90 % opacity (≥ 4.5:1).
- The same text within 1 s coalesces into one line: "Wheee! ×3".
- The strip moves to the top-left while the cursor or the selected mumble is inside its box.
- Setting *Captions*:
  - `barks` (default): voice chirps only.
  - `all`: adds the bracketed sound captions ("[pop!]", "[tink]").
  - `off`.

### 7.8 Targets, flashing, pause
- **Targets:** HUD buttons 44–88 px high (§5.3). Chips 32 px high in a 44 px row with ≥ 8 px spacing. The minimap is ≥ 160×40. Nothing is < 24×24.
- **Flashing (MUST):**
  - never a full-screen or background colour change, including during Pop all;
  - a burst sprite is ≤ 16×16 world px;
  - **at most 3 bursts may start per rolling second in the view** (extra explosions draw only crater + confetti);
  - no element blinks faster than 1 Hz.
- **Pause** is always available (P, button, Esc menu), including during the start timeline and during Pop all.

### 7.9 Relaxed timer (`relaxedTimer`)
- The clock counts down as normal. At 0:00 it switches to **overtime**: `Time +0:12 · relaxed`, neutral colour, hourglass-off glyph. The level does **not** end (`SessionOptions.relaxedTimer`), and message #27 is announced once.
- The results show the relaxed note (§9.5). The level counts as **completed** if saved ≥ required. `LevelProgress.inTime` is set only when completed within the clock with the timer on standard; the level card shows a small clock badge for it.
- Toggling mid-level applies from the next restart (the flag is part of the replay).

### 7.10 Help / controls screen (and the H overlay)
1. **Goal:** "Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs."
2. **Quick start:** keyboard (the 4 steps of §6.2.1) and mouse ("pick a skill below, click a mumble") side by side.
3. **Skills:** 8 cards: icon, name, key, one line (strings `SKILL_DESCRIPTIONS`).
4. **Controls:** tables *generated from the live bindings* and grouped: Skills · Choosing mumbles · Camera · Game flow · Sound & info. Use `ACTION_LABELS`, never raw ids. The mouse table is static (§6.1.3).
5. **Assists:** pause-to-assign, filter chip, Follow, fall ruler, relaxed timer, game speed, with links to Settings.
6. **Screen-reader tips:** "The playfield is an application: keys go straight to the game. If a key doesn't work, press NVDA+Space or use the toolbar. Announcements can be set to Off, Essential or All."

---

### 7.11 Settings (all in `SaveData.settings`, `localStorage['mumblemarch.save']`; apply at once, persist on change)

| Field | Type | Default | Range / values | UI |
|---|---|---|---|---|
| `masterVolume` | number | 0.7 | 0–1, step 0.05 | Sound · slider |
| `sfxVolume` | number | 0.8 | 0–1 | slider "Effects" |
| `voiceVolume` | number | 0.8 | 0–1 | slider "Mumble chirps" |
| `musicVolume` | number | **0.35** (was 0.4) | 0–1 | slider "Music" |
| `muted` | boolean | false | — | toggle + `M` |
| `musicEnabled` | boolean | true | — | toggle "Play music" |
| `motion` | enum | `'system'` | system / reduce / full | Display · radio |
| `highContrast` | boolean | false | — | "Clear physics view" |
| `scale` | number | 0 (auto) | 0, 2, 3, 4 | radio |
| `announcements` | enum | `'essential'` | off / essential / all | Play · radio |
| `relaxedTimer` | boolean | false | — | "Relaxed timer" |
| `bindings` | partial map | {} | ≤ 2 codes/action, no reserved keys | Controls · rebinding list |
| **NEW** `captions` | enum | `'barks'` | off / barks / all | Display |
| **NEW** `cursorSize` | number | 32 | 32 / 48 / 64 (CSS px) | Display · radio |
| **NEW** `fallRuler` | boolean | false | — | Play |
| **NEW** `edgeScroll` | boolean | true | — | Play |
| **NEW** `cameraFollow` | boolean | false | — | chip + `L` (persisted) |
| **NEW** `assignOn` | enum | `'press'` | press / release | Play "Assign on release" |
| **NEW** `pauseOnBlur` | boolean | true | — | Play |
| **NEW** `pauseWhileChoosing` | boolean | false | — | Play: choosing a skill pauses; the next accepted assignment resumes (unless you paused yourself) |
| **NEW** `gameSpeed` | number | 1 | 1 / 0.75 / 0.5 | Play "Game speed" |
| **NEW** `showKeyHints` | boolean | true | — | Display (key digits on the buttons) |
| **NEW** `unlockAll` | boolean | false | — | Play "Unlock all levels" |

**Decision on pause-on-assign:** offered as `pauseWhileChoosing`, **default off**. This keeps the original's real-time spirit (pillars 2 and 4), while players who need it get a turn-based flow with one toggle.

---

## 8. Audio design

Every recipe below is implemented and measured in [`mockups/audio-lab.html`](mockups/audio-lab.html) (screenshot `audio-lab.png`). Port the helpers (`noiseBuffer`, `pulseWave`, `envAD`, `mkFilter`, `tone`, `noise`, `bell`, `voice`) and the `SFX` object 1:1 into `src/audio/synth.ts` + `sfx.ts`. They already match `SfxRecipe = (ctx, out, when, pitch) => void`: only voice chirps and `builder-low` read `pitch`. All sound is synthesized; there are no samples, no speech and nothing modelled on the 1991 sounds (RESEARCH §9, D10).

### 8.1 Graph, defaults and the "no sound before a gesture" rule
- **Graph:** `master (0.7) → limiter → destination`; `master ← sfx (0.8)`, `voice (0.8)`, `music (0.35)`.
  - **Limiter:** `DynamicsCompressorNode` with threshold −8 dB, knee 6, ratio 12, attack 3 ms, release 150 ms. It is a safety net only; calibrated sounds never reach it alone.
  - Gains are linear, set with `setTargetAtTime(v, t, 0.02)`.
- **Defaults:** masterVolume 0.7 · sfxVolume 0.8 · voiceVolume 0.8 · **musicVolume 0.35** · musicEnabled **true** · muted false.
  - Effective sfx gain is 0.56 (−5 dB). Effective music gain is 0.245 (−12.2 dB).
- **Music decision: ON by default, low.**
  - It carries pillar 5 (charm) and pillar 6 of the research (calm, then chaos).
  - It sits ≈ 12 dB under event sounds, so it never masks cues.
  - It starts only after a gesture and only inside a level. Menus are quiet, which helps screen-reader users and people adjusting settings.
  - One key (`M`), a Settings toggle and a separate slider turn it off (WCAG 1.4.2).
- **Before a gesture:** `AudioEngine.unlock()` creates the `AudioContext` on the first `pointerdown` or non-Escape `keydown`; `play()` is a no-op until then. The title screen says "Sound starts after your first click or key press."
- **Mute (`M`, Settings, pause menu):**
  - Ramps master to 0 in 20 ms.
  - Persisted in `Settings.muted`.
  - The status line shows a speaker-off glyph and "Muted".
  - While muted the music scheduler keeps its position, so unmuting resumes in time.
  - `musicEnabled: false` stops the scheduler instead.

### 8.2 Loudness targets (measured offline at unity bus gain, 44.1 kHz, 2 s render)
- **Peak ≤ −6 dBFS** for every recipe. At the default mix that is ≤ −11 dBFS at the output.
- **Loudness** = the loudest 50 ms window (short-term RMS), by tier:
  - **UI −27 ± 3 dBFS**: frequent HUD/menu feedback.
  - **Cue −22 ± 3**: gameplay feedback.
  - **Event −18 ± 3**: barks, deaths, traps, stingers.
- **Measured result: 36/36 in range.**
  - Peaks span −17.4 … −6.5 dBFS.
  - Short-term loudness: UI −27.0, Cue −22.0, Event −19.4 … −18.0.
  - Active RMS (start → −60 dB tail): −32.2 … −20.5 dBFS.
- **Re-run:** open the lab and call `await measureAll()` in the console (returns JSON). Measuring needs no gesture.

### 8.3 Sound-event catalogue (recipes, levels and measurements)
Notation: `tri`/`sq`/`saw`/`sin`, `pulse25` (25 % duty); `f→f1` = exponential glide; `a/d` = linear attack / exponential decay to −60 dB (s); `LP/HP/BP` = biquad (Q); `G` = the recipe's level (every part is relative to G). **Dur** = time to −60 dBFS; **Loud** = short-term max RMS.

| SfxId (bus) | Trigger (GameEvent / UI) | Recipe | G | Dur ms | Peak | RMS act. | Loud |
|---|---|---|---|---|---|---|---|
| `ui-move` | menu focus move; selection change (Z/X, snap) | sin 1200 Hz, a .003 d .04 | .2251 | 34 | −13.2 | −25.4 | −27.0 |
| `ui-select` | button press; skill chosen | tri 880 then 1320 (+45 ms), d .05/.07 | .2030 | 101 | −14.2 | −28.4 | −27.0 |
| **NEW** `ui-back` | back, cancel, dialog closed | tri 1320 then 880 | .2033 | 101 | −14.3 | −28.4 | −27.0 |
| `ui-deny` | refusal; Space with no target | 2× sq 185/175 Hz LP 1100, d .06/.08, 90 ms apart | .1387 | 151 | −17.3 | −29.2 | −27.0 |
| **NEW** `ui-empty` | `none-left`; 0-left skill pressed | sin 330→190 d .1 + BP 650 (1.5) noise puff ×.35 | .1518 | 77 | −16.6 | −28.9 | −27.0 |
| **NEW** `ui-arm` | Pop all / Restart armed | tri 660, then tri 880 with 9 Hz ±25 ct vibrato + pulse25 1760 ×.25 ("huh?") | .1368 | 256 | −16.9 | −32.2 | −27.0 |
| **NEW** `pause` / `unpause` | P, button | tri 880→587 / 587→880, two notes 70 ms apart | .174 | 163 | −15.4 | −29.9 | −27.0 |
| **NEW** `ff-on` / `ff-off` | F, button | 2× tri glide 500→1400 / 1400→500 in 60 ms ("zip-zip") | .2225 | 127 | −13.5 | −28.0 | −27.0 |
| **NEW** `rr-up` / `rr-down` | each RR step (input time) | tri 1046 / 784 Hz d .03 + HP 4 k click ×.3 | .3209 | 27 | −9.9 | −24.3 | −27.0 |
| **NEW** `undo` | U | sin 1600→380 (140 ms) + sin 1200→300 ×.5 at +50 ms ("rewind") | .1348 | 127 | −17.4 | −30.1 | −27.0 |
| `assign` | `skill-assigned` (non-bomber) | tri 260→150 d .07 + LP 2.2 k click ×.25 ("thunk-pop") | .4105 | 62 | −8.8 | −22.9 | −22.0 |
| **NEW** `fuse` | `skill-assigned` bomber | HP 4.5 k noise hiss d .35 ×.5 + 5 BP 3.2 k crackle ticks + sin 1800→2700 ×.3 | .3839 | 297 | −11.1 | −28.8 | −22.0 |
| `builder-low` | `builder-low-bricks` (pitch 1 / 7⁄6 / 4⁄3 for 3/2/1 left) | tri 1800·p d .12 + sin 3600·p ×.25 ("plink") | .3124 | 101 | −10.4 | −25.0 | −22.0 |
| **NEW** `builder-shrug` (voice) | `builder-finished` | voice "hmm?": 330 Hz then 300→400 rising, F1 300 / F2 1000–1100 | .2339 | 299 | −17.5 | −25.9 | −22.0 |
| `steel` | `hit-steel`; `steel`/`one-way` refusal | FM bell 1760 Hz, ratio 1.41, index 3, d .16 + BP 5 k tick ("tink") | .2288 | 128 | −12.3 | −26.0 | −22.0 |
| `time-low` | `time-low` 60/30/10 s | woodblock: sin 820 + BP 1.6 k click, then sin 620 + BP 1.3 k at +250 ms ("tick-tock") | .3995 | 301 | −8.3 | −27.3 | −22.0 |
| `lets-go` (voice) | `lets-go` (tick 15) | **"Off we go!"**: 3 rising syllables 500→540, 600→660, 760→900 Hz; formants o(520/900) · e(380/2100) · o(480/900→800); 7 Hz ±20 ct | .3279 | 429 | −13.5 | −24.3 | −18.0 |
| `ohno` (voice) | `lemming-ohno` (silent if `nuking`) | **"Uh-oh…"**: 700→690 Hz "uh" (620/1150), then 560→420 Hz "oh" (470/820→760), 6 Hz ±45 ct wobble | .3224 | 470 | −13.7 | −21.5 | −18.0 |
| `exit` (voice) | `lemming-exited` | **"Wheee!"**: glide 600→1400 Hz over 300 ms on "ee" (320/2300→2600) + sparkle sin 2637/3136/3951 at +180/240/300 ms ×.05 | 1.4388 | 351 | −11.2 | −21.8 | −18.0 |
| `entrance-open` | `entrance-opened` (tick 35) | creak: saw 92 Hz, 11 Hz ±120 ct wobble, BP 950→600 (Q 7), a .06 d .42; clunk at +500 ms: sin 120→55 ×1.4 + LP 450 noise ×.8 | .2555 | 654 | −9.7 | −28.9 | −18.0 |
| `splat` | `lemming-died` splat | sin 150→45 d .14 + LP 900→200 noise ×.6 + tri 240→120 "flop" ×.4 | .3748 | 120 | −8.2 | −21.8 | −18.0 |
| `drown` | `lemming-died` drown | 6 bubbles: sin f→2.4f in 40 ms (260/340/300/420/380/480 Hz at 0/60/110/190/240/330 ms) + LP 500 noise ×.25 | .4775 | 378 | −6.5 | −20.5 | −19.4 |
| `burn` | `lemming-died` burn | HP 2.5 k noise a .03 d .4 + BP 1200→500 (Q 3) ×.6 + sin 420→150 ×.4 ("tsss") | .2825 | 373 | −7.5 | −25.3 | −18.0 |
| `trap` | fallback (unknown theme) | BP 2.5 k snap + sq 190→80 LP 800 ×.6 | .5554 | 117 | −8.8 | −21.6 | −18.0 |
| **NEW** `trap-flytrap` | `trap-triggered`, mossgrove | snap BP 2.2 k; chomps sq 210→95 (+50 ms), 185→85 (+160 ms) LP 700; gulp sin 320→120 (+280 ms) | .4577 | 403 | −8.5 | −23.4 | −18.0 |
| **NEW** `trap-press` | sugarworks cookie-cutter | click BP 3.2 k; thud sin 110→50 ×1.2 (+80 ms) + LP 500 noise; boing sin 290 Hz, 14 Hz ±180 ct, d .35 ×.35 | .2766 | 361 | −10.3 | −25.9 | −18.0 |
| **NEW** `trap-pendulum` | observatory brass pendulum | swish: noise BP 400→2200→500 (Q 2.5), a .14 d .26; clang at +340 ms: FM bell 1400, ratio 1.41, index 2, d .45 ×.3 | .8237 | 701 | −11.6 | −26.6 | −18.0 |
| **NEW** `trap-piston` | foundry piston hammer | HP 3 k hiss ×.4; at +200 ms: sin 90→40 ×1.2 + LP 1.2 k noise + FM ring 620 Hz, ratio 2.76 ×.3 | .2490 | 451 | −8.1 | −27.1 | −18.0 |
| **NEW** `trap-clam` | reef giant clam | 2× BP 1.3 k (Q 4) clacks 70 ms apart; gloop sin 520→180 ×.8; 2 bubbles | .4760 | 403 | −8.6 | −25.7 | −18.0 |
| `explosion` | `explosion` | sq 900→150 click ×.5 + LP 5 k→250 noise d .3 + sin 120→40 d .22 ("pop!") | .2455 | 190 | −6.5 | −24.3 | −18.7 |
| `nuke` | `nuke-started` (Pop all) | saw 180→720 over 700 ms, LP 1400 (Q 3), 12 Hz ±40 ct + sin 1500→3000 "fwip" at +660 ms ×.5 | .2821 | 742 | −9.0 | −26.4 | −18.0 |
| `level-won` | `level-ended` won | pulse25 C5-E5-G5 (90 ms steps) → C6 pulse25 + C5 tri d .6 + 3 sparkle pings | .2122 | 761 | −11.4 | −26.8 | −18.0 |
| `level-lost` | `level-ended` lost | tri E5 · C5 · D5 (last one held, 5 Hz vibrato): a hopeful "try again", never a sad trombone | .2764 | 996 | −11.3 | −26.8 | −18.0 |

**Not sounded:**
- `lemming-spawned`, `all-released`: too frequent or no value.
- `release-rate-changed`: the UI plays `rr-*` at input time.
- `lemming-died` with `explode` or `out-of-bounds`: the explosion already sounds; falling out is silent.
- `lemming-died` with `trap`: `trap-triggered` plays the variant instead.

### 8.4 Voice: per-mumble pitch
- `pitchSemitones(id) = ((id × 5 + 3) mod 7) − 3` gives **−3 … +3 semitones**, and 7 consecutive ids never repeat. `pitch = 2^(st/12)`.
- Applied to `ohno`, `exit` and `builder-shrug`. `lets-go` is level-wide (pitch 1).
- Only the glottal pitch moves; the formants stay put, so high mumbles sound smaller, not chipmunked.

### 8.5 Mixing rules
- **Rate limits and polyphony** (engine default: 1 trigger per id per 60 ms). Overrides:

| Id(s) | Min gap | Max concurrent |
|---|---|---|
| `explosion` | 80 ms | 6 |
| `exit` | 120 ms | 3 |
| `splat` | 100 ms | 3 |
| `drown` | 150 ms | 3 |
| `burn`, `trap-*` | 150 ms | 2 |
| `steel` | 90 ms | — |
| `ohno` | 150 ms | — |
| `ui-move` | 40 ms | — |
| `rr-*` | 50 ms | — |
| `lets-go`, `entrance-open`, `nuke`, `level-*` | once per level | — |

  Concurrency is tracked as id → end times (end = when + measured Dur). Over the cap, the trigger is dropped. During Pop all this gives a staggered cascade of pops, never a roar.
- **Ducking** (music bus only, `setTargetAtTime`):
  - voice chirp: −6 dB (attack 20 ms, release 300 ms);
  - `explosion`/`nuke`: −3 dB;
  - **pause**: −10 dB + a 900 Hz low-pass;
  - level end: music fades out over 400 ms, then the stinger plays.
  - SFX are never ducked.
- **Pitch arg** for `builder-low`: `{3: 1, 2: 7/6, 1: 4/3}[bricksLeft]` (≈ 1.8 / 2.1 / 2.4 kHz, rising urgency).

### 8.6 Music: original procedural chiptune (validated in the lab: all 6 parse with 0 errors)
- **Concept:** one short loop per theme, march-like and bouncy. The lab's sequencer:
  - **lead:** pulse or triangle, 5 ms attack, falls to 55 % in 80 ms, 90 % legato;
  - **bass:** triangle, staccato 55 % of a beat;
  - **drums:** noise/sine — kick = sin 150→45 Hz over 150 ms, snare = BP 1.8 k noise + tri 190 Hz, hat = HP 7 k noise over 30 ms;
  - **arp:** pulse 50 %, 16ths.
  - Mix at unity: lead .07 (triangle ×1.6), bass .164, arp .029, kick .246, snare .082, hat .029.
- **Scheduling:** 100 ms look-ahead on a 25 ms timer. The theme loop **starts at tick 55** (after the first mumble drops) with a 1.5 s fade-in and loops seamlessly. FF does not change the tempo. It stops at `level-ended`.
- **Per-level variety:** the variant is the level's index within its theme, mod 3. It transposes by +0 / +2 / −3 semitones and shifts the tempo by 0 / +4 / −4 BPM.
- **Title jingle:** plays once per session on the first gesture on the title screen (if music is enabled). There is no menu loop.
- **Results:** the `level-won` / `level-lost` stingers.

| Theme | Title | BPM | Key | Lead | Bass / drums | Loop | Peak / RMS (dBFS, unity) |
|---|---|---|---|---|---|---|---|
| title | Doorstep Fanfare | 124 | C major | pulse 25 % | root–fifth / k-s + 8th hats | 4 bars, one-shot 7.7 s | −7.5 / −25.8 |
| mossgrove | Bog Hop | 116 | G major | pulse 25 % | walking arpeggio / off-beat hats | 8 bars 16.6 s | −7.5 / −26.1 |
| sugarworks | Taffy Pull | 132 | F major | pulse 12.5 % (thin, candy) | oom-pah / 8th hats | 8 bars 14.5 s | −7.8 / −26.1 |
| observatory | Clockwork Stars | 100 | D dorian | triangle + pulse-50 arp | half notes / soft quarter ticks, no kick | 8 bars 19.2 s | −10.6 / −24.5 |
| foundry | Piston Polka | 150 | A harmonic minor | pulse 50 % | root–fifth / four-on-floor | 8 bars 12.8 s | −7.5 / −24.7 |
| reef | Tide Tumble | 108 | B♭ major | triangle + echo (3⁄16, fb .3) | root–fifth–third / syncopated | 8 bars 17.8 s | −7.2 / −24.5 |

**Music target:** peak ≤ −6 dBFS, loop RMS −25 ± 2 at unity. At the default mix that is ≈ −37 dBFS RMS.

**Note data:** App. C, and the lab's `MUSIC` object, which is authoritative.
All melodies were written for this game from chord tones over simple progressions. None quotes the 1991 tune list or its arrangements (RESEARCH §5.2).

---

## 9. Copywriting voice

### 9.1 Tone rules (MUST)
1. **Warm and on the player's side.** Cheer the mumbles and the player; never mock (no sarcastic put-downs, and no wording borrowed from the original's results screen).
2. **Short and plain.**
   - Status/HUD ≤ 28 characters.
   - Announcements ≤ 90 characters.
   - Verdicts ≤ 70 characters.
   - Aim for a reading age of about 9. One idea per line.
3. **Sentence case, no ALL CAPS** (screen readers spell caps out). At most one "!" per line. Digits for numbers.
4. **"mumble / mumbles"**, lower case except at the start of a sentence (D1). Never "Lemm-".
5. **Functional text is literal; flavour text may play.**
   - Refusals, settings and help say exactly what happened and what to do.
   - Puns live only in titles, barks and verdicts.
6. **Cartoon, not grim.** Mumbles "go splat", "go pop", "take an unplanned swim". Never gore, never blame words ("failed", "wrong", "stupid").
7. **Next step included.** Failure copy always offers a way forward (try again, hint, different job).

### 9.2 Title & tagline
**Mumblemarch**. Tagline (recommended first):
- "Little feet, big plans."
- "Every mumble matters."
- "They march. You make the plan."

### 9.3 Sample strings

| Context | Strings |
|---|---|
| Title menu | Start · Continue — {n} · {title} · Levels · How to play · Settings · "Sound starts after your first click or key press." |
| Tier blurbs | **Breezy** "Gentle first steps" · **Knotty** "A few tangles" · **Gnarly** "Think it through" · **Stampede** "Everything at once" |
| Level card | "Level {n}" · "Completed · best {s} of {t}" · "Everyone home" (100 %) · "Locked · finish level {n−1} first" · "New" |
| Briefing | "Level 3 · Breezy" · **Mumbles: 20 · Save: 10 · Release rate: 50 · Time: 5:00 · Tier: Breezy** · "Skills" · "Show hint" · "Let's march!" · "Back to levels" · relaxed: "Time: 5:00 · relaxed" |
| HUD | Slower / Faster (RR aria) · "1.6 s" · skill names · Pause · Fast · Pop all · Press again · Popping… · Pick: All / Walkers / Facing ← / Facing → · Follow |
| Status line | `Walker ×3` · `Builder · 4 bricks` · `Climber + Floater` · `Selected: Digger` · `Out 12` · `Saved 3 ▰▰▱▱ need 8` · `goal met ✓` · `Time 4:12` · `Time +0:12 · relaxed` · `Muted` · `Ready: 2 jobs start when you resume` · `No mumble here` |
| Plates | "⏸ Paused — you can still assign skills" · "⏩ ×3" · "Press Pop all again (or N) to pop every mumble · Esc cancels" · "Press R again to restart · Esc cancels" |
| Pause menu | "Paused" · "Saved 3 · need 8 of 20 · 4:12 left" · Resume · Restart level · Show briefing · How to play · Settings · Quit to levels · "Restart? Your mumbles go back to the hatch." [Restart] [Cancel] |
| Help intro | "Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs. Pick a skill, then pick a mumble. Pause any time — you can still give jobs while paused." |
| Contextual tips (SHOULD, once each) | "Tip: press P to pause. You can still give jobs." · "Tip: X and Z pick mumbles one by one." · "Tip: V picks only walkers in a crowd." |
| Refusals | exactly as §6.5 (e.g. "Can't dig: steel below", "Already a climber", "No diggers left") |

### 9.4 Bark & sound captions (strip; `barks` = quoted lines, `all` adds bracketed ones)
| SfxId | Caption | SfxId | Caption |
|---|---|---|---|
| `lets-go` | Off we go! | `splat` / `drown` / `burn` | [splat] / [glug glug] / [tsss!] |
| `ohno` | Uh-oh… | `trap-flytrap` / `-press` | [snap! chomp chomp] / [ka-chunk!] |
| `exit` | Wheee! (×n when coalesced) | `trap-pendulum` / `-piston` / `-clam` | [swish… clang] / [hiss… bang!] / [clack-gloop] |
| `builder-shrug` | Out of planks! | `explosion` / `nuke` | [pop!] / [fizz… pop all!] |
| `entrance-open` | [creak… clunk] | `steel` / `builder-low` / `fuse` / `time-low` | [tink] / [plink] / [fizz] / [tick-tock] |

### 9.5 Results: headline, score line, graded verdict
- **Headline:**
  - won: **"Level complete!"**;
  - lost, all resolved: **"Not quite this time"**;
  - lost at time-up: **"Time's up!"**.
- **Score line:** "You saved **{S}** of {T} · needed {R}".
- **Verdict:**
  - Symbols: S saved, R required, T total, `m = max(1, round(T × 0.05))`.
  - Rules are checked top to bottom, **counted in mumbles, not % points**, so small levels can reach every line.
  - Variant = attempt count mod 2 (deterministic).

| # | Condition | Variant A | Variant B |
|---|---|---|---|
| 1 | S = T | "Every single mumble made it home. Take a bow!" | "A full house! Nobody left behind." |
| 2 | S = 0 | "Nobody made it home this time. Fancy another go?" | "Not one through yet. The hatch is ready when you are." |
| 3 | S < ⌈R/2⌉ (far below) | "That route needs a rethink. Try a different first job?" | "Plenty to figure out here. Peek at the hint if you like." |
| 4 | S < R − m (below) | "Getting there! A couple of tweaks and they're home." | "Good progress. A few more mumbles and it's yours." |
| 5 | S < R (just below) | "So close! Just {R−S} more needed." | "A whisker short: {R−S} more and it's done." |
| 6 | S = R (exactly) | "Bang on the number. Every mumble counted!" | "Exactly enough. Phew!" |
| 7 | S ≥ R + max(2, ⌈(T−R)/2⌉) (way above) | "Brilliant! You marched right past the target." | "What a crowd at the exit. Nicely marched!" |
| 8 | otherwise (comfortably above) | "Nicely done. That went smoothly." | "Tidy work. On to the next one?" |

- **Relaxed-timer note** (under the verdict, muted text):
  - overtime: "Played with the relaxed timer · finished {m:ss} into overtime.";
  - otherwise: "Played with the relaxed timer.".
- **Extra line when won in time:** "Beat the clock ✓" (standard timer only).
- **Badge:** "New best!".

### 9.6 Level-title style guide
- **Length and form:** ≤ 28 characters, sentence case, no numbering in the title.
- **Breezy (hint titles):**
  - name the verb or the prop, never the answer's location;
  - one skill per title, spoken like a friendly foreman.
- **Knotty and up:** theme flavour plus a gentle nudge; puns allowed.
- **Never** reuse or paraphrase any title from the original games (RESEARCH §9). LEVELS.md follows this rule; check every new title against it.
- **Examples** (all new):
  - "Spade first, questions later" (digger)
  - "Puff up, drift down" (floater)
  - "Paddles up, everyone wait" (blocker)
  - "Plank by plank" (builder)
  - "Mitts through the middle" (basher)
  - "Pick a slant" (miner)
  - "Suction cups, go!" (climber)
  - "One pop opens the door" (bomber)
  - "Caramel is not a bath"
  - "Tick, tock, pendulum"
  - "Two jobs, one crowd"
  - "The long way is shorter"
  - "The clam is not hungry. Yet."
  - "Stampede o'clock"

### 9.7 `ui/strings.ts`-ready table

The complete `ui/strings.ts`-ready table (title, tiers, skill descriptions, plurals and verbs, death texts, captions, refusal messages, HUD, briefing and results strings) is in **App. A**. Dev MUST take user-facing text from there, never inline it.

## 10. Levels (summary; full spec in [`LEVELS.md`](LEVELS.md))

The table is generated from `mockups/levels-data.js`; if the two differ, the data wins.

| # | id | Title | Tier | Theme | New skill / idea | Skills | Save / total | Width | Time |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `spade-expectations` | Spade Expectations | Breezy | mossgrove | **Digger** | Digger 5 | 5/10 | 400 | 5:00 |
| 2 | `gently-down-the-dome` | Gently Down the Dome | Breezy | observatory | **Floater** | Floater 11 | 6/12 | 400 | 5:00 |
| 3 | `bridge-over-troubled-toffee` | Bridge Over Troubled Toffee | Breezy | sugarworks | **Builder** | Builder 5 | 8/15 | 480 | 5:00 |
| 4 | `the-punch-line` | The Punch Line | Breezy | reef | **Basher** | Basher 5 | 6/12 | 480 | 5:00 |
| 5 | `suction-cup-final` | Suction Cup Final | Breezy | foundry | **Climber** | Climber 10 | 6/12 | 400 | 5:00 |
| 6 | `not-one-step-bogward` | Not One Step Bogward | Breezy | mossgrove | **Blocker** | Blocker 4 | 9/15 | 480 | 5:00 |
| 7 | `diagonally-yours` | Diagonally Yours | Knotty | observatory | **Miner** | Miner 2, Basher 2 | 14/20 | 640 | 5:00 |
| 8 | `one-pop-wonder` | One-Pop Wonder | Knotty | foundry | **Bomber** (sacrifice) | Bomber 2, Basher 2 | 15/20 | 480 | 4:00 |
| 9 | `clam-before-the-storm` | Clam Before the Storm | Knotty | reef | crowd + release rate vs a trap | Basher 2 | 28/40 | 640 | 5:00 |
| 10 | `double-boiler` | Double Boiler | Gnarly | sugarworks | two sites, two hatches | Digger 2, Basher 2, Builder 2, Blocker 2, Bomber 2 | 32/40 | 1200 | 4:00 |
| 11 | `wrong-side-of-the-hedge` | Wrong Side of the Hedge | Gnarly | mossgrove | scout; one-way walls (*stretch*) | Climber 2, Basher 2, Digger 2 | 25/30 | 480 | 5:00 |
| 12 | `last-shift-at-the-foundry` | Last Shift at the Foundry | Stampede | foundry | finale: everything | Climber 2, Builder 2, Basher 2, Miner 2 | 45/60 | 1600 | 6:00 |

**Rules for adding or changing levels** (MUST; they are what the level book follows):
- **One new verb per Breezy level**, and the title + hint + skill set make it obvious (RESEARCH §6.1). The hint is behind "Show hint" (§5.4).
- **Fairness margins:**
  - Route drops ≤ 48 px and spawn drops ≤ 40 px; lethal drops ≥ 80 px; nothing survivable sits in 49–79 px where survival matters.
  - One-builder gaps ≤ 20 px.
  - Walls meant to stop walkers ≥ 12 px high.
  - Dig floors ≥ 8 px thick; bomber floors ≤ 6 px.
  - No pixel-precise clicks.
- **Unsolvable with zero skills.** The time limit is ≥ 2× the intended run. Breezy saves ≤ 60% with ≥ 3 spare skills.
- **Grid and size:** steel and hazard rects on the 4 px grid; width a multiple of 8 (400–1600); height 160.
- **Titles** are original hint-puns (§9.6) and must never reuse an original title.
- **Regression check:** every level ships with a replay test built from its "Sim solution data" block (LEVELS.md), and must pass in the real engine (App. E.5 L12).

## 11. Notes for architecture / dev

Changes design needs from the scaffold. Architecture files were **not** edited by design. The full tables (N = lead, V = visual, I = interaction/a11y, S = audio/copy, L = levels) are in **App. E**; ids below refer to them.

**Must-do before or while building gameplay (in priority order)**

| # | Change | Ids |
|---|---|---|
| 1 | Scale rule from §5.1 (`VIEW_WIDTH` 400 is already done) | N11 (N1/V10/L10 ✅) |
| 2 | IP hygiene still open: `package.json` name, favicon art, the `SPRITE_COLORS` comment (title, description, `GAME_TITLE` and storage key are already done) | N2, N4 |
| 3 | Per-state animation data (`ticksPerFrame`, `footX/footY`, `loop/loopFrom`, 18 states) and the corrected mirror origin; overlay drawing | V1–V3 |
| 4 | 5 themes + extended `Theme` roles; two-pass compiler with hashed texture recipes; `metal` only on steel | N9, V4, V5 |
| 5 | Behaviour phase hooks (brick at cycle tick 9, bash carve ticks 2–5, mine ticks 1–2, dig every 8) + new `SPLAT/DROWN/BURN/EXIT_TICKS` | V6 |
| 6 | Assign while paused: `checkAssign` + `applyNow` (applied immediately, recorded at `session.tick`); pending badge | N10, I3 |
| 7 | New actions/keys (`C L V B U Home End`, `frame-step`, `mute`), Shift rule, `RESERVED_CODES`, focus ownership for arrows/Home/End | I1, I2 |
| 8 | Picking rewrite (filter, snap radius, accept-aware, busy, last released) + keyboard cycling rules | I5 |
| 9 | Pop all / Restart arm–confirm state (replaces `confirmDialog` for Pop all) | I6 |
| 10 | Announcer keyed queue (≥ 1 s polite gap, replace-by-key, de-dup, assertive 1/s) + the §7.3 catalogue | I7 |
| 11 | Settings schema v2 (11 new fields, `musicVolume` 0.35) + `LevelProgress.inTime`, `LevelOutcome.overtimeTicks`, `SessionOptions.relaxedTimer` | I8, I9, S5 |
| 12 | `skill-rejected.detail` (+ `ahead`/`below` for steel) so refusal texts are exact | I4 |
| 13 | Audio: 17 new SfxIds, synth helpers ported from the lab, master limiter, per-id rate/polyphony table, ducking, theme trap sounds, music sequencer | S1–S4, S6 |
| 14 | Strings from App. A; `verdictFor()` with a unit test | S7, I10 |
| 15 | HUD rebuild per §5.3 (icons, counts, notch, RR interval, Pop all, ☰, chips) + status line format | N5–N7 |
| 16 | Canvas `role="application"` + stage help text; test-hook additions (`audioState`, `announcerLog`, `focus`) | I11, I12 |
| 17 | Level engine needs: deterministic trap cooldown, ABBA hatch order, `cameraX`, symmetric builder, climber overhang check; **one replay test per level** | L2–L12 |
| 18 | High-contrast terrain mode (Material-based LUT + edge outline) | V8 |

**Resolved already** (by the architecture phase):
- the exit trigger rows (V9 = L1): `EXIT_TRIGGER` is `{dx:-4, dy:-7, w:8, h:8}`, which covers the anchor row;
- `VIEW_WIDTH` = 400 (N1);
- `STORAGE_KEY` = `mumblemarch.save` (N3);
- `<title>`, meta description and `GAME_TITLE` = Mumblemarch (most of N2).

## 12. Deliverables and validation

| File | What |
|---|---|
| `DESIGN.md` | This rulebook |
| [`DESIGN-APPENDIX.md`](DESIGN-APPENDIX.md) | Reference data: strings table (A), prop key frames (B), music note data (C), full contrast table (D), full dev change list (E) |
| [`LEVELS.md`](LEVELS.md) | 12 levels: sketches, solutions, verification arithmetic, draft `LevelDef`s |
| [`mockups/sprites.js`](mockups/sprites.js) | All pixel art as data (`window.MUMBLE_ART`): palette, 18 states, objects, icons, overlays, 5 themes |
| [`mockups/sprites-themes.html`](mockups/sprites-themes.html) / `.png` | Every sprite, icon and overlay; the 5 theme scenes; the high-contrast view; the live contrast table |
| [`mockups/game-screen.html`](mockups/game-screen.html) / `.png` | Game screen at ×3 with the real HUD, the real art and a HUD state gallery |
| [`mockups/menus.html`](mockups/menus.html) / `.png` | Title, level select, briefing, pause menu, results |
| [`mockups/mockup.css`](mockups/mockup.css) | Reference CSS; token names match `src/styles/tokens.css` |
| [`mockups/audio-lab.html`](mockups/audio-lab.html) / `.png` | Every SFX recipe (port 1:1), music loops, `measureAll()` / `checkMusic()` |
| [`mockups/levels-data.js`](mockups/levels-data.js), [`levels-preview.html`](mockups/levels-preview.html) / `.png` | Level data, a rasterised preview, and a walker simulation with `runChecks()` |
| [`validation/`](validation/) | Independent validator reports (the author never signs off on its own work) |

**Validation summary** (details in each report):

| Report | Validator (model) | Scope | Initial result | After fixes |
|---|---|---|---|---|
| [`ui-contrast.md`](validation/ui-contrast.md) | V0 (haiku) | UI tokens (31 ratios), mockup geometry, targets | FAIL (1): faint text on hover 4.27:1 | Fixed: `#b0a9d4` → 4.97:1 (lead) |
| [`visual.md`](validation/visual.md) | V2 (sonnet) | sprites.js completeness and timings, themes, 100 contrast values, IP | FAIL (1 blocker): no `jumping` sprite | Fixed by W1: 18/18 states |
| [`spec.md`](validation/spec.md) | V3 (sonnet) | A1–A16 coverage, keys, picking, announcements, sound twins, audio re-measure | FAIL (2 major copy/IP echoes, 1 minor) | Fixed by W2 |
| [`levels-1-6.md`](validation/levels-1-6.md) | V1a (sonnet, own rasteriser + sim) | Levels 1–6: geometry, solutions, zero-skill, format, data | PASS (3 minor) | Fixed by W3 |
| [`levels-7-12.md`](validation/levels-7-12.md) | V1b (sonnet) | Levels 7–12 | PASS (2 major: documented miner windows) | Fixed by W3 |
| [`levels-recheck.md`](validation/levels-recheck.md) | V4 (sonnet) | Re-check of all level fixes + sim fidelity | PASS (1 minor: L7 window rationale) | Fixed by W3 |
| [`design-review.md`](validation/design-review.md) | V6 (sonnet) | Final review: coverage of the brief, consistency, 147 contrast values recomputed, links, IP | FAIL (1 major: status-line size mismatch; 1 minor: stale N1/N3 rows) | Fixed (lead) |
| [`screenshots.md`](validation/screenshots.md) | V5 (haiku) | Re-render of all 5 mockups after fixes, console check | PASS | — |

Screenshots were re-taken after all fixes by an independent runner (V5, haiku) with a console-error check.
