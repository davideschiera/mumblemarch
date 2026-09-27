# Research: *Lemmings* (DMA Design / Psygnosis, 1991), the foundation for our remake

Phase 1 output · 2026-09-26 · research lead.

**What this is:** a consolidated summary of three worker note files. Each has fuller detail and citations:
- [`notes-mechanics.md`](notes-mechanics.md): exact DOS mechanics, derived from ccexplore's disassembly plus the Lemmix source.
- [`notes-design-ui-audio-a11y.md`](notes-design-ui-audio-a11y.md): spirit, UI texts, audio, level design, accessibility, IP.
- [`notes-screenshots.md`](notes-screenshots.md): reference images, pixel measurements, palette.

**Conventions:**
- **tick** = one logic frame of the original game.
- **approx.** = derived or estimated; **unverified** = not confirmed by a primary source.
- Numbers are from the **DOS** version unless marked Amiga.

**Source reliability:**
- **Most reliable:** ccexplore's pseudocode reconstructed from the DOS executable, [`Lemmings_mechanics015.txt`](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), and the DOS-exact clone Lemmix, [`Game.pas`](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas). The lead spot-checked `MAX_FALLDISTANCE = 60`, `ExplosionTimer := 79`, `NumberOfBricksLeft := 12`, the ≤3-brick warning and the release formula directly in that source.
- **Also used:** the 1991 manuals ([DOS](https://www.lakora.us/lemmings/dox/), [Amiga](https://www.goodolddays.net/files/games/Lemmings/Files/Amiga-OCS/Lemmings-Manual.htm)), Mike Dailly's history ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)), the [Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings) and [Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game)).

---

## 0. TL;DR: the numbers and decisions that matter most

| Topic | Original value | Recommendation for our remake |
|---|---|---|
| Simulation rate | **17 ticks per game-second** (≈58.8 ms per tick). Amiga logic ≈16.7 Hz. | A fixed 17 Hz deterministic tick, rendered at display rate. Fast-forward = N ticks per frame. |
| World / view | Level **1600×160 px** on a **320×200** screen: a 320×160 view plus a 40 px panel. | Keep 160 px level height and 320 px view width as the logical resolution. Scale up by an integer (×3 or ×4). |
| Lemming | **16×10 px** sprite frame (visual ≈4–6 px wide); 13×13 px hit box | Draw our own ≈8×10 px critter. Use a larger hit area (≥24 CSS px) for accessibility. |
| Walk | **1 px/tick**; steps up ≤6 px (a 3–6 px rise is a small "jump"); ≥7 px is a wall; walks down ≤3 px | Same values. |
| Fall | **3 px/tick**; **≥64 px drop kills** (≤63 px is safe) | Same values, plus an optional fall-height ruler. |
| Skills | 8 skills; Climber and Floater are permanent; Builder lays **12 bricks**; Bomber has a **79-tick (~5 s) countdown** | Same core rules. Fix the known glitches (§2.9). |
| Release rate | 1–99, never below the level's value; interval `(99 − RR) div 2 + 4` ticks | Same formula. Show the interval visually. |
| Win rule | Save ≥ N% before the clock runs out | Same, plus an optional relaxed timer. |
| Spirit | Indirect control, a stream of critters, a scarce skill budget, slapstick charm | See §1. |
| Accessibility | The original is mouse-precision-heavy, with sound-only cues | Pause-and-assign, keyboard cycling through critters, visual equivalents for every sound, reduced motion (§7). |
| IP | "LEMMINGS" is a live US trademark owned by Sony Interactive Entertainment Europe | Working title **"Mumblemarch"**, with our own critter design (§9). |

---

## 1. Design spirit and pillars

**Origin**
- It began in 1989 as a lunchtime Deluxe Paint test: Mike Dailly squeezed little men into **8×8 px** to show it could be done. The walk cycle was fixed by Gary Timmons. Russell Kay: "There's a game in that!" ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)).
- Dave Jones: "It was so damn addictive and also made people laugh when they played it; a rare combination in games." ([Game Developer](https://www.gamedeveloper.com/game-platforms/playing-catch-up-i-gta-lemmings-i-dave-jones)).
- *Amiga Power* called it "the first major game to introduce the 'indirect-control' concept" ([Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game))).

| # | Pillar | What it means in play | What we must preserve |
|---|---|---|---|
| P1 | **Indirect control** | You never steer. You *promote* a critter to a job. Everyone else walks on mindlessly. | Input is only *choose skill → choose critter* (plus release rate, pause, nuke). No direct movement. |
| P2 | **The stream is the resource** | A steady flow from the hatch. The crowd is both what you protect and the problem to manage. | The release rate is a real lever. Crowds bunch and press on hazards. |
| P3 | **A scarce skill budget is the puzzle** | Per-level counts, e.g. "2 builders, 1 blocker". The available set itself hints at the solution. | Per-skill counts in level data; zero shown clearly. |
| P4 | **Puzzle + time pressure + dexterity** | Plan the route, then execute with timely clicks while the crowd moves. | Keep the "plan, then execute" loop. Make dexterity optional (pause-assign), not a gate. |
| P5 | **Humour and charm** | Tiny sprites with big personality. "Let's go!", "Oh no!", "Yippee!". Slapstick splats and pops. The builder shrugs. | Charm comes through animation and sound, not text. Deaths are cartoonish, not gory. |
| P6 | **Calm, then chaos** | Briefing → "Let's go!" → hatch creak → a trickle that turns into a crowd → crisis → rescue or nuke. | Quiet level openings. Tension comes from the flow; nothing is scripted. |
| P7 | **Sacrifice** | Blockers stand forever; bombers die to open a path. "The needs of the many outweigh the needs of the few." | A save % below 100 leaves room for deliberate sacrifice. |
| P8 | **Multiple solutions** | Dailly: "there were so many ways of completing a level." | Accept creative alternative solutions. Deterministic rules make them discoverable. |
| P9 | **A gentle learning curve** | Early levels are "so simple, that some under 5's managed to play the first few levels unaided." One verb per level; the level title is the hint. | A tutorial arc that teaches one skill per level. |
| P10 | **Readable at tiny scale** | 10 px critters with a strong silhouette and high-contrast colours on dark backgrounds. | A strong outline and a clear direction of facing. Terrain is readable against the background. |

---

## 2. Core mechanics with concrete numbers

Full derivations and line-level citations are in [`notes-mechanics.md`](notes-mechanics.md). Speeds at 17 Hz: walker ≈17 px/s, faller ≈51 px/s, floater ≈34 px/s, climber ≈8.5 px/s. Crossing the full 1600 px level on foot takes ≈93 s.

### 2.1 Timing and world
- **Tick rate: 17 ticks per game-second.** The clock drops 1 s every 17 ticks. Lemmix uses 58 ms per tick; the Amiga updates on every 3rd PAL frame (≈16.7 Hz). ([ccx note 004](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics004.txt), [Dos.Consts](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L39), [Dailly](https://lemmings.info/making-next-lemmings-part-2/))
- **Fast-forward:** not in the 1991 original; later ports added it.
- **Order of each tick:**
  1. Process the pending skill assignment.
  2. Spawn a lemming.
  3. Update each lemming in release order: bomb timer, then its action, then object triggers.
  4. Nuke step.
  5. Animate objects.
- **Level:** 1600×160 px (DOS shows x 0..1583). Screen 320×200, made of a **320×160 playfield + 320×40 panel**.
- **Object map:** a separate **4×4 px grid** for steel, triggers and blocker fields. This is why steel and triggers snap to multiples of 4.
- **Lemming position:** the "foot" pixel, the floor pixel directly under the centre of the sprite. Triggers (exit, water, traps) are tested **only at the foot pixel**.

### 2.2 Sprite sizes and selection
| Action | Frames | Height (px, all frames 16 wide) |
|---|---|---|
| walk | 8 | 10 |
| fall | 4 | 10 |
| climb / hoist | 8 / 8 | 12 |
| floater (umbrella: 4 frames opening + 4 frames floating) | 8 | 16 |
| build | 16 | 13 |
| bash | 32 (= 2 strokes) | 10 |
| mine | 24 | 13 |
| dig | 16 | 14 |
| block | 16 | 10 |
| shrug | 8 | 10 |
| oh-no | 16 | 10 |
| splat | 16 | 10 |
| drown | 16 | 10 |
| fried | 14 | 14 |
| exit | 8 | 13 |
| explosion | 1 frame | 32×32 |

- **Hit box:** 13×13 px around the lemming (for a walker: x−8..x+4, y−10..y+2).
- **Status line:** shows the action name of the lemming under the cursor plus how many lemmings are under it, e.g. "WALKER 6". A climber-and-floater shows as "ATHLETE".
- **Overlap priority:**
  - *Busy* lemmings (blocking, building, bashing, mining, digging, shrugging, oh-no) are preferred.
  - Otherwise the **last-released** lemming wins.
  - **Holding the right mouse button** means walkers only (DOS manual).
  - For builder, basher, miner and digger, if the busy lemming can't take the skill, it falls back to a non-busy one.

### 2.3 Movement
| Behaviour | Rule |
|---|---|
| **Walker** | Moves 1 px/tick in its facing direction, 8-frame cycle. At the new x it counts solid pixels above the foot: **0** = flat; **1–2** = step up; **3–6** = "jump" (rises 2 px/tick until clear); **≥7** = wall (turns around, or starts climbing if a climber). If there is no floor, it looks down up to **3 px** and steps down; otherwise it moves y += 4 and becomes a **faller**. |
| **Faller** | Up to **3 px/tick**, checking each pixel. The fall counter starts at 3 and rises by 3 per tick. If it is **>60 on landing, the lemming splats**. That means a walk-off drop of **≤63 px is safe and ≥64 px kills**. From a hatch, ≈59 px below the spawn point is safe. The manual loosely says "about 80 pixels"; ignore that. |
| **Floater** | The umbrella opens once the fall counter is >16 (≈19 px fallen). The per-tick dy is 3,3,3,3,−1,0,1,1, then **2 px/tick**. A floater survives any height. |
| **Climber** | On a wall of 7 px or more, it climbs **4 px per 8 ticks** (0.5 px/tick). If terrain is overhead (ceiling or overhang), it turns around, drops away 2 px and falls. Climbing over the top triggers a hoist: 8 ticks, then it walks. |
| **Left edge** | Acts as a wall (turns around). |
| **Right edge** | DOS: the lemming walks off and falls to its death (an inconsistency). **We choose one rule: both edges are walls** (or visibly marked kill zones). |
| **Top** | Head clamped at y ≈ −5. **Bottom:** y > 163 → removed silently and counted as lost. |

### 2.4 Skills
| Skill | Type | What it does (original numbers) | How it ends |
|---|---|---|---|
| **Climber** | permanent flag | Climbs vertical walls (≥7 px) at 0.5 px/tick; hoists over the top | Never removed. Falls off when blocked by an overhang. |
| **Floater** | permanent flag | Opens an umbrella after ≈19 px of fall; descends 2 px/tick; survives any fall | Never removed |
| **Climber + Floater** | "Athlete" | Both behaviours | — |
| **Bomber** | one-shot, fatal | Countdown **79 ticks (≈4.6 s)**, shown as 5 → 1 above the head (≈16 ticks per digit). At 0 it plays **"Oh no!" for 16 ticks** (≈0.94 s; it still falls meanwhile), then explodes. If it was falling, floating or drowning, it explodes immediately. **Crater: an elliptical mask 16 px wide × 22 px tall**, at x−8..x+7, y−14..y+7. **Does not harm other lemmings.** In DOS it removes steel (a bug) unless standing on steel or water. | Lemming dies |
| **Blocker** | state | Stands still with arms out. Its field is 3×3 cells of 4 px (**12×12 px**): the left column turns lemmings left, the right column turns them right, the middle is neutral. Others turn once their foot is 1–8 px from its x. It also turns builders, bashers and miners. | Only if the ground under it is removed (reverts to walker) or it explodes (bomber or nuke). Otherwise it stands until the level ends. |
| **Builder** | state | **12 bricks**, each **6×1 px**, laid in the row above the foot. Per brick: **16 ticks**, net **+2 px across and 1 px up**. The finished stair is ≈28 px long × 12 px high and takes 192 ticks (≈11.3 s). A **warning sound plays on each of the last 3 bricks**. After the 12th brick the builder shrugs for 8 ticks, then walks. Assigning a builder to a shrugger extends the bridge. | Stops (turns around) when its head or body hits terrain; shrugs when out of bricks |
| **Basher** | state | Digs a horizontal tunnel with a **16×10 mask**. Each 16-tick stroke advances **5 px** (≈5.3 px/s). While moving it follows the floor down ≤2 px. | Becomes a walker when it scans **4 px of empty space 8–11 px ahead** (checked once per 2 strokes). Hitting steel ("ting") or a wrong-way one-way wall turns it around. |
| **Miner** | state | Digs diagonally down with a **16×13 mask**. Per 24-tick cycle: **+4 px across, +2 px down** (slope 1:2). | Floor gone → falls. Steel → "ting", turns back. Wrong-way one-way wall → turns back. |
| **Digger** | state | Digs vertically, **9 px wide** (x−4..x+4), **1 px per 8 ticks**. Ignores one-way walls. | Falls through when a row has no terrain. Steel below → "ting", becomes a walker. |

### 2.5 Assignment rules
A refused assignment **does not consume** the skill.

| Skill | Can be given to | Refused when |
|---|---|---|
| Climber | any living state except blocker, splatting, exploding (**fallers and floaters OK**) | already a climber |
| Floater | same as Climber | already a floater |
| Bomber | any state except oh-no, exploding, fried, splatting (DOS even accepts drowning lemmings) | timer already running |
| Blocker | walker, shrugger, builder, basher, miner, digger | its field would overlap another blocker's |
| Builder | walker, shrugger, basher, miner, digger (not a current builder) | head near the top of the level |
| Basher | walker, shrugger, builder, miner, digger | steel directly ahead; one-way wall against it |
| Miner | walker, shrugger, builder, basher, digger | steel ahead or below; one-way wall against it |
| Digger | walker, shrugger, builder, basher, miner | steel below |

- **Fallers, jumpers, climbers and floaters can only receive Climber, Floater or Bomber.**
- **Recommendation for us:** lemmings that are dying (drowning, fried, splatting, exploding, exiting) accept no skills at all. This is cleaner than DOS.
- A "ting"/"chink" sound plays for a refused basher or miner, and whenever a basher, miner or digger hits steel.

### 2.6 Release rate, spawning, hatches
- **Release rate (RR)** runs 1–99. The player can raise it or lower it, but **never below the level's starting RR**. Holding − / + slides the value (Lemmix: ±1 per tick; the DOS rate is unverified).
- **Spawn interval = `(99 − RR) div 2 + 4` ticks.** Examples: RR 99 → 4 ticks (0.24 s); RR 50 → 28 ticks (1.6 s); RR 1 → 53 ticks (3.1 s).
- **Level-start timeline** (ticks):

| Tick | Event |
|---|---|
| 15 | "Let's go!" |
| 35 | Hatch starts opening (creak) |
| 54 | First lemming |
| 55 | Music starts |

- **Spawn:** at hatch (x+24, y+14), as a **faller facing right**.
- **Multiple hatches** (maximum 4 used) cycle in the order AAAA / **ABBA** / ABCB / ABCD for 1–4 hatches.
- **Lemmings per level:** at most **80 in DOS** (the Amiga allowed 100). Skill counts range 0–99.

### 2.7 Nuke, time, save requirement
- **Nuke:**
  - It is a **double-click** on the icon (both manuals).
  - It stops spawning immediately, then gives **one lemming per tick** (in release order) a 79-tick bomb timer.
  - A single nuke sound plays; the individual "Oh no!" sounds are suppressed.
  - The level ends when no lemmings remain (after the particles settle).
- **Time limit:**
  - Set in minutes per level (1–9 in practice), displayed `M-SS`, e.g. `4-32`.
  - **At 0-00 the level ends immediately.** Lemmings still out count as lost.
  - Wikipedia says they explode; DOS code just ends the level. Some ports may differ.
- **Level also ends** when every lemming has been released and is either saved or dead, or when none are left after a nuke. A surviving blocker keeps the level running until the timer runs out or the player nukes.
- **Save requirement:**
  - Stored as a count and shown as %.
  - **Win if `saved·100 div total ≥ required·100 div total`**.
  - The in-game "IN" figure is a % of the level total.
  - DOS nuke bug: the % is computed against the number released. Don't copy this.

### 2.8 Interactions with the world
| Element | Rule |
|---|---|
| **Exit** | Triggers when the foot is inside the exit area and the lemming is not falling. An 8-frame exit animation plus "Yippee!" plays, then it counts as **IN**. |
| **Water / acid / lava** | Instant **drowning** (16 frames; drifts 1 px/tick) → lost |
| **Fire / continuous traps** | Instant **"fried"** (14 frames) → lost |
| **Triggered traps** (crushers, weights, bear traps, …) | Kill **one lemming at a time**: the lemming is removed and the trap animation plays. The trap ignores everyone else until the animation finishes, then re-arms. Bunched crowds mostly walk past. |
| **Steel** | Can't be bashed, mined or dug. Assigning into it is refused with a "ting". DOS only checks steel at a few points, so masks can shave steel edges, and bombers destroy it (bugs). |
| **One-way walls** (arrows) | Only **bashers and miners** are restricted: they can't dig against the arrows. Diggers, builders and bombers ignore them. |
| **Blocker field** | Turns walkers and working lemmings. Fallers landing in the neutral middle column walk through. |
| **Other lemmings** | Lemmings pass through each other; only blockers affect others. Explosions don't hurt neighbours. |

### 2.9 Original quirks to **fix**, not copy
- Bombers, bashers, miners and diggers eating steel.
- Blocker fields erasing steel and triggers.
- "Direct drop": a lethal fall onto an exit counts as saved.
- The miner blocked by right-pointing one-way walls in *both* directions.
- The nuke-% bug.
- "Pause for time" (the start timeline keeps running while paused).
- Left/right builder asymmetry.
- The builder passing through 1 px overhangs.
- The right edge being lethal while the left edge is a wall.
- The continuous shrugger.
- Source: [Viglietta glitch list](https://giovanniviglietta.com/files/lemmings/Glitches.html).

**Our rule set:**
- Steel is tested **per pixel** of every mask and is **never removed**.
- Every trigger is tested at the foot pixel.
- Behaviour is left/right symmetric.
- Both level sides act the same way.

---

## 3. Level elements

### 3.1 Objects
| Element | Original behaviour and look | Notes for us |
|---|---|---|
| **Entrance hatch** | A trapdoor near the top. It opens with a creak at tick 35 (animation ≈10 frames, **unverified**). Lemmings drop out as fallers facing right. Up to 4 per level. | Our own hatch design. Keep the "doors swing open, then critters drop" beat. |
| **Exit** | Each tileset has its own look: an arched doorway, often with flames or glow. It has an animated idle loop and a trigger just under its floor. | Needs a clear, distinct silhouette and an idle animation, so it isn't recognised by colour alone. |
| **Liquids** | Water (dirt, marble), lava (hell) and a coloured "acid/water" in other sets (**approx.**). Animated surface; instant drowning. | An animated surface plus a hazard pattern. |
| **Triggered traps** | One victim at a time, then re-arm. Examples: *10-ton weight*, *rock crusher* (dirt); *bear trap*, *snare/rope*, *pin trap* (pillar/Egyptian); *thumper* (marble); *antimatter beam*, *ball zapper*, *crystal slicer* (crystal) ([Wiki: Trap](https://lemmings.fandom.com/wiki/Trap), [Tileset](https://lemmings.fandom.com/wiki/Tileset)). | Novel trap designs. Each has an idle "tell" animation and its own sound. |
| **Continuous traps** | Kill everyone who enters: *fire pit*, *flamethrower* (hell), *spinner* (marble). | Treat these like liquids. |
| **Steel** | "Dull grey rusty plates", or a tileset-coloured metal. Rectangles aligned to 4 px. | Needs a rivet or hatch **pattern**, not just colour. |
| **One-way walls** | Diggable terrain overlaid with animated **arrows** pointing the allowed dig direction. | Keep the arrows (shape cue). Stretch goal. |
| **Background** | A plain dark colour: navy `#000031` on Amiga, black on DOS. No parallax. | A dark, low-detail background keeps critters readable. |

### 3.2 Tilesets (terrain themes)
| Game | Themes |
|---|---|
| Original (5 sets) | **Dirt** (red-orange earth, grass, wooden bridges, mossy steel) · **Hell/Fire** (grey stone, glowing red rock, dark blue bricks) · **Marble** (pink-purple mosaic blocks, striped poles) · **Pillar**, a.k.a. "Egyptian" (gold sandstone blocks, yellow pillars) · **Crystal** (pointy crystals, black pipes, blue lattice, webs) |
| *Oh No! More Lemmings* (4 more) | Brick/Construction · Bubble · Rock · Snow |
| Special crossover levels | 4 levels with full-image backgrounds (Psygnosis game art); not relevant to us |

Sources: [Wiki: Tileset](https://lemmings.fandom.com/wiki/Tileset); reference images `01` (dirt), `02` (pillar), `06` (crystal).

- The **look**: saturated, dithered or noisy textures and about 16 colours per level, with high contrast against a dark background.
- Terrain is **pixel-destructible**. Levels are built from up to 400 terrain pieces, which are **stamped** (possibly flipped, or drawn behind/erasing) into one bitmap, plus up to 32 steel rectangles and 32 objects.
- **For us:** build 3–4 original themes the same way, by stamping procedural pieces into a terrain bitmap. Candidate themes: earthy "meadow", "ember" caverns, "ice/crystal", "machine/brick".

### 3.3 Level size and camera
- Levels are 1600×160 and the view is 320×160, so a level is 5 screens wide. A level stores its **starting camera x** (a multiple of 8).
- **Scrolling:**
  - Push the cursor against the left or right screen edge to scroll.
  - Holding the right mouse button scrolls faster.
  - Clicking or dragging on the **minimap** jumps there.
  - The DOS scroll speed is unverified; Lemmix uses 8 px per tick (≈138 px/s).
- **No vertical scrolling:** the whole 160 px height is always visible.
- **For us:** fixed height, horizontal scrolling by arrow keys, edge-scroll and minimap click, plus an optional "follow selected critter" camera.

---

## 4. UI / HUD of the original

### 4.1 Screen geometry (320×200 logical)
```
y 0–159   PLAYFIELD 320×160 (scrolls horizontally over the 1600-wide level)
y 160–175 STATUS LINE (16 px): "WALKER 6   OUT 78   IN 00%   TIME 4-17"  (green, ~16 px tall font)
y 176–199 BUTTON ROW (24 px): 12 buttons × 16 px wide = 192 px  |  MINIMAP ≈104×20 at x≈208
```
- The panel is **20% of the screen height**; playfield to panel is 4:1.
- The minimap scales the level by 1/16 horizontally and 1/8 vertically. It shows the terrain as a silhouette, lemmings as **yellow dots**, and a light rectangle for the viewport.
- Sources: [camanis main.dat](https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt), [Lemmix SkillPanel](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.SkillPanel.pas), our pixel measurements on `01`/`02`/`06`.

### 4.2 Skill panel, left to right
| # | Button | Number shown above the icon | DOS key |
|---|---|---|---|
| 1 | Release rate − | the level's minimum RR | F1 |
| 2 | Release rate + | the current RR | F2 |
| 3–10 | Climber · Floater · Bomber · Blocker · Builder · Basher · Miner · Digger | uses remaining (blank = none left) | F3–F10 |
| 11 | Pause, the "Paws" paw-print icon | — | F11 |
| 12 | Nuke, a mushroom cloud (**double-click**) | — | F12 |
| — | Minimap | — | — |

- **Selected skill:** highlighted by a frame (yellow on Amiga, white on DOS).
- **Skill counts:** tiny two-digit numerals in a light box at the top of each button.
- **Later ports** added **fast-forward** between Pause and Nuke.
- **Other controls:**
  - Amiga: `P` pauses; `Z`/`X` cycle icons.
  - DOS keyboard mode: `Q`/`A`/`O`/`P` move the cursor; `Space` = left click, `Return` = right click; `Esc` quits the level.
- While paused you can scroll and look around, but you **cannot assign skills** in the original.

### 4.3 Status line and cursor
- **Status line format:** `[ACTION N]  OUT n  IN n%  TIME m-ss`.
  - `ACTION N` shows only while the cursor covers at least one lemming, e.g. `WALKER 1`, `DIGGER 6`. N counts all lemmings under the cursor.
  - **OUT** = lemmings currently in play. **IN** = % of the level total saved.
  - Amiga pads IN to `00%`; DOS shows `0%`.
- **Cursor in the level:** a small crosshair that **changes to a square bracket box framing the lemming** when one is under it.
- **Cursors in menus:** Amiga uses a hand pointer and, while busy, a sleeping-lemming "zzz" pointer.
- **Right mouse held while clicking** = assign to walkers only (DOS manual, 1991).

### 4.4 Level preview ("Objective screen"). Wording shown for reference only
- **Layout:**
  - A **thumbnail of the whole level** at the top.
  - Then `Level 1` with the level title (e.g. "Just dig!").
  - Then five lines: `Number of Lemmings 10`, `10% To Be Saved`, `Release Rate 50`, `Time 5 Minutes`, `Rating Fun`.
  - Then the prompt `Press mouse button to continue`.
- **Colours:**
  - Amiga colours each line differently (red, blue, green, orange, cyan, magenta) on a dark-green mottled texture (image `03`).
  - DOS uses one blue-violet colour on a red-brown rock texture.

### 4.5 Results ("Completion screen"). Reference only; do not ship
- **Header:** `All lemmings accounted for.` or `Your time is up!`, then `You rescued X%` and `You needed Y%` (Amiga lists "needed" first).
- **Flavour line** (thresholds in percentage points, checked in this order):

| Condition | Tone of the original line |
|---|---|
| saved = 100% | "Superb! …every lemming…" |
| saved = 0 | "ROCK BOTTOM!" (sarcastic) |
| < needed ÷ 2 | "Better rethink your strategy…" |
| < needed − 5 | "A little more practice… recommended." |
| < needed − 1 | "You got pretty close…" |
| = needed − 1 | "OH NO, So near and yet so far (teehee)…" |
| = needed | "RIGHT ON. You can't get much closer…" |
| < needed + 20 | "That level seemed no problem…" |
| ≥ needed + 20 | "You totally stormed that level!" |

- **Footer:** `Your Access Code for Level N is XXXXXXXXXX`, then *left button = next level / retry*, *right button = menu*.
- **For us:** keep the idea of a graded, cheeky one-liner with our own wording and thresholds. Replace access codes with autosave.

### 4.6 Menus, ratings, structure
- **Structure:** 4 ratings, **Fun · Tricky · Taxing · Mayhem**, × 30 levels = 120 levels. Finishing level 30 moves you to the next rating.
- **What drives the rating:** the number of obstacles, the variety of skills allowed, the time limit, the minimum release rate and the required %. Most levels took testers about 3–6 minutes.
- **Main menu** (image `04`): a logo, then signs held by lemmings for `1 PLAYER`, `2 PLAYER` (Amiga), `NEW LEVEL` (password entry), a music/FX toggle, and the rating selector with ▲/▼. Below them, a scrolling credits ticker. DOS adds `EXIT TO DOS`.
- **Passwords:** 10 letters, generated per level.
- **2-player (Amiga/ST):** split screen, blue team vs green team, 20 levels.
- **For us:**
  - Level select grouped into ≥3 tiers.
  - Progress saved in `localStorage`.
  - No passwords.
  - Settings for sound, music, motion, contrast, timer and controls.

---

## 5. Audio

We synthesize everything with Web Audio. The descriptions below cover character only; no original samples are used.

### 5.1 Sound events
| Event | When (original) | Original character | Our synthesized analogue (suggestion) |
|---|---|---|---|
| **Level start** | Tick 15, before the hatch opens | "Let's go!": a sped-up, squeaky female voice | Rising 2–3 syllable chirp: pulse/saw through a swept band-pass ("formant") |
| **Hatch opens** | Tick 35 | Wooden creak, then clunk | Filtered noise burst plus a descending squeak |
| **Skill selected** | Clicking a panel icon | Short tick | 2 ms click plus a 30 ms sine blip ≈1.2 kHz |
| **Skill assigned** | Clicking a lemming | Soft thunk/click (exact sample unverified) | 150–250 Hz triangle blip, 40 ms |
| **Builder low on bricks** | Each of the last 3 bricks | "Ting". The manual says: "Listen carefully!" | Rising high ping (≈1.8, 2.1, 2.4 kHz), **always paired with a visual brick counter** |
| **Hits steel / refused** | Basher, miner or digger meets steel | Metallic "chink" | Short FM bell with an inharmonic ratio (1:1.41), ≈120 ms |
| **Bomber countdown ends** | Timer reaches 0 | "Oh no!", with the lemming clutching its head | Falling two-note squeak (≈900 → 600 Hz) |
| **Explosion** | After the oh-no | A "pop" plus confetti particles | Noise burst with fast decay and a downward sweep |
| **Splat** | Fall ≥64 px | Wet slap | Low-passed noise plus a sine thump |
| **Drowning** | Enters a liquid | Gurgle/splash | Rising random sine "bubbles" |
| **Fire** | Fire trap or lava | Sizzle/whoosh | High-passed noise swell |
| **Trap fires** | One victim | Mechanical and specific to each trap (thunk, chain, 10-ton thud, electric zap) | A distinct timbre per trap type |
| **Exit** | Lemming saved | "Yippee!" | Upward "whee" glide plus a sparkle |
| **Nuke** | Double-click | A nuke sound, then cascading pops | Staggered pops with a **polyphony cap** (e.g. ≤6 at once) |
| **Time low** | *Not in the original* | — | Optional soft tick in the last 30 s, always paired with a visual blink |

- **Voice pitch:** later remakes varied the voice pitch slightly for each lemming. Do the same, so barks don't become monotonous.
- **Sound options in the original:** the Amiga had "music + limited FX **or** no music + full FX" (4 hardware channels). On DOS, F3 cycled *music + FX → FX only → silent*.

### 5.2 Music character
- **Composers:** Brian Johnston and Tim Wright. They wrote bright, bouncy, comic, march-like arrangements of classical and traditional tunes in the Amiga **4-channel MOD tracker** style: Can-Can, Dance of the Little Swans, Dance of the Reed Flutes, Rondo alla Turca, London Bridge, Ten Green Bottles, She'll Be Coming 'Round the Mountain, and more.
- **Instrumentation:** pizzicato, piccolo, harpsichord, glockenspiel, orchestra hits, slap bass. Tempo is roughly 120–175 BPM.
- **Playback:** tracks loop, and the playlist advances one track per level.
- **For us:**
  - Write **original** chiptune loops (pulse, triangle and noise drums) at 110–170 BPM, with a staccato "walking" bass line.
  - Do **not** reuse the same tune list, its order, or those arrangements. Tim Wright's arrangements are commercially released.
  - Keep separate music, effects and voice volume controls.

---

## 6. Level design principles

### 6.1 The original's difficulty ramp and tutorials
- The team made the hard levels first, then easy versions of the same maps with more skills: "Most levels were used at least twice". **Same map, fewer skills = a harder level.**
- **Fun 1–7 teach one verb each, and the title is the hint** (titles listed for reference only; do not reuse):

| Level | Title | Teaches |
|---|---|---|
| 1 | "Just dig!" | Digger. 10 lemmings, 10% needed, RR 50, 5 minutes. |
| 2 | "Only floaters can survive this" | Floater |
| 3 | "Tailor-made for blockers" | Blocker |
| 4 | "Now use miners and climbers" | Miner + Climber |
| 5 | "You need bashers this time" | Basher |
| 6 | "A task for blockers and bombers" | Blocker + Bomber (sacrifice) |
| 7 | "Builders will help you here" | Builder |
| 8–10 | — | Combinations |

- **Across the ratings:** the required % rises, skill counts shrink, time gets tighter, and several tasks must be juggled at once.
- **Fairness rule:** Dave Jones "refused to put in any level that could *only* be solved by chance."

### 6.2 Puzzle archetypes (ideas are free to reuse)
| Archetype | Core skill(s) | Design notes |
|---|---|---|
| Bridge a gap | Builder | 12-brick stairs are ≈28 px long, so gaps wider than ≈24 px need chained builders. Assigning a builder to a shrugger extends the bridge. |
| Hold the crowd | Blocker (+ Bomber or Nuke to release) | One worker clears the path while the rest wait. Two blockers make a pen. A dug pit can also trap the crowd. |
| Go down | Digger / Miner | The miner's diagonal avoids a lethal vertical drop. The digger falls through at the bottom, so check the height. |
| Go through | Basher | Stops by itself when it breaks through. Wasted if nothing is in front. |
| Up and over, then down | Climber + Floater | Walls ≥7 px, then a drop ≥64 px. |
| Blast a thin barrier | Bomber | Removes a 16×22 crater. Costs one critter. Useless against steel. |
| Route forcing | Steel, one-way walls | Steel closes shortcuts. Arrows fix the digging direction. |
| Flow control | Release rate | A low RR spaces critters out so there is time to act. A high RR bunches them, e.g. to walk a crowd past a triggered trap. |
| Hazard dodge | — | Water, fire, traps, drops that are too high. |
| Sacrifice | Bomber / Blocker | Only possible because the required % is below 100%. |
| Multitask | Several | Two work sites far apart, so the camera must move between them. Harder tiers only. |
| Time pressure | — | A long route plus a tight clock. Use rarely, and never with a relaxed timer. |

### 6.3 What makes a level feel fair (community consensus, [lemmingsforums t=6437](https://www.lemmingsforums.net/index.php?topic=6437.0) and related)
1. **No hidden information.** Hazards are visible and animated; steel, one-way walls and terrain are distinguishable by **pattern**.
2. **Easy to execute, hard to figure out.** Avoid pixel-precise clicks, "almost deadly" drops and "almost bridgeable" gaps.
3. **The skill set is a hint.** Give only what the idea needs, plus planned slack.
4. **Keep levels only as big as the idea needs.** Terrain must read clearly against the background.
5. **Early levels are generous:** low required %, extra skills, long timer. Tighten these gradually.
6. **Deterministic rules,** so a failed attempt teaches something. Offer an instant restart.
7. **Hunt for unintended solutions:** test, test more, get others to test. Builder-heavy levels are the most prone. Keep the unintended solutions that are fun.
8. **Use descriptive titles** that hint at the solution in early levels and add flavour in later ones.

---

## 7. Accessibility and usability: gaps in the original, and our remedies

References:
- **GAG** = [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/)
- **WCAG** = [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- **XAG** = [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines)

The full 16-row mapping is in the design notes, §5.

| # | Gap in the original | Remedy (for design and dev) | Guidelines |
|---|---|---|---|
| A1 | **Tiny, overlapping targets** (10 px sprites; the manual admits it is "very difficult to select a particular Lemming") | Snap to the nearest critter within a radius. Effective hit area ≥24×24 CSS px. Hover outline plus a label. Integer zoom. Panel buttons ≥44 px. | WCAG **2.5.8** Target Size (Min, AA), 2.5.5 (AAA); GAG "large and well spaced" controls |
| A2 | **Assigning only in real time; frame-precise timing** | **Pause-and-assign** (always allowed), frame-step, slow motion (0.5×), fast-forward, undo last assignment, instant restart | GAG "Do not make precise timing essential", "Include an option to adjust the game speed"; WCAG **2.2.1** Timing Adjustable |
| A3 | **No way to select lemmings from the keyboard** | Full keyboard play: `1`–`8` pick a skill, `Tab`/`Shift+Tab` (or `[`/`]`) cycle critters left to right within view, `Enter`/`Space` assign, arrow keys scroll, `P` pause, `F` fast-forward, `R` restart. Optional "lock-on" camera follow (an idea from the ZX/PSP ports). | WCAG **2.1.1** Keyboard, **2.4.7** Focus Visible, **2.4.11** Focus Not Obscured, 2.1.4 Character Key Shortcuts; GAG "all key actions by digital controls" |
| A4 | **Crowd disambiguation** | Filters shown as HUD chips (walkers only, facing left or right; DOS had a right-click walker filter). Persistent highlight on the selected critter. | GAG "simple controls / simpler alternative" |
| A5 | **Held buttons** (release-rate slider, right-button filter) | One step per press (Shift = ±10). Toggles instead of holds. Minimap works by click and by keyboard. | GAG "avoid holding buttons"; WCAG **2.5.7** Dragging, 2.5.1 |
| A6 | **Colour-only cues** (steel = grey; hazards and teams told apart by colour) | Pattern and texture per terrain class (rivets = steel, chevrons = one-way). Hazards get an animation plus an icon. Critters get a 1 px dark outline. Optional **high-contrast / "clear physics" view**. | WCAG **1.4.1** Use of Color, **1.4.3** (4.5:1 text), **1.4.11** Non-text Contrast (3:1); GAG "not by colour alone" |
| A7 | **Sound-only cues** (builder "ting", steel "chink", "Oh no!") | Brick pips over the builder (amber at ≤3). A spark plus icon when hitting steel. Big countdown digits. Caption strip for voice barks. Visual flashes for saved and lost. | GAG "no essential info by sound alone", "visual cues / captions for important sounds"; XAG 103/104 |
| A8 | **No text or status output** | ARIA live region (`role="status"`, polite, throttled) announcing skill choice ("Digger, 3 left"), assignments, saved/lost tallies, time warnings and results. Real `<button>` elements with `aria-pressed` and `aria-label`. | WCAG **4.1.3** Status Messages, 4.1.2 Name/Role/Value |
| A9 | **Coarse audio control** (music *or* full FX) | Separate **music / effects / voice** volume plus master mute, saved between sessions. Start muted until the user interacts (browser autoplay rules). | WCAG **1.4.2** Audio Control; GAG "separate volume controls" |
| A10 | **Flashing and motion** (explosions, confetti, nuke) | No full-screen flashes; at most 3 flashes per second in small areas. Respect `prefers-reduced-motion` with fewer particles, no shake and no camera jumps. In-game toggle. | WCAG **2.3.1** Three Flashes, **2.3.3** Animation from Interactions, **2.2.2** Pause/Stop/Hide; GAG "avoid flicker" |
| A11 | **Every level is timed** | A "Relaxed" mode (no timer, or a timer that doesn't fail the level). The strict timer becomes an optional challenge. | WCAG 2.2.1; GAG "wide choice of difficulty levels" |
| A12 | **Destructive nuke on a double-click** | Two-step confirmation ("Press again to nuke" with a visible state, no timing window). Act on pointer *up*. | WCAG 2.5.2 Pointer Cancellation; XAG 115 |
| A13 | **No remapping** | Remappable keys, stored in `localStorage` (stretch goal). Always a help/controls screen. | GAG "allow controls to be remapped"; WCAG 2.1.4 |
| A14 | **Objective shown only before the level** | Persistent HUD line, e.g. "Saved 3 · need 8 of 20". Reopen the briefing at any time. Optional hint. Fall-height ruler. | GAG "allow reminder of current objectives", "contextual help" |
| A15 | **Passwords and a forced order** | Autosave, with an option to skip or unlock levels | GAG "autosave", "bypass" |
| A16 | *(Strength)* Tutorial levels | Keep the one-verb tutorial levels, plus a no-fail practice sandbox | GAG "interactive tutorials", "practice without failure" |

**How modern games solved this (to borrow):**
- **NeoLemmix:** assign while paused, frame-step forward and back, skill "shadows", physics view, fall ruler, remappable hotkeys, replays.
- **Lix:** undo the last assignment, force left or right, rewind.
- **Lemmings Touch:** pick the lemming first, then the skill.
- **PSP / J2ME:** lock-on cursor.

---

## 8. Reference screenshots (`docs/research/reference/`, for comparison only, **never shipped**)

All six images are verified PNGs that the lead viewed. Full captions, direct image URLs, alternates and pixel measurements are in [`notes-screenshots.md`](notes-screenshots.md).

| File | Source | What it shows | Compare our build against |
|---|---|---|---|
| `01-gameplay-panel.png` (Amiga, 320×200, slightly resampled) | https://en.wikipedia.org/wiki/File:Amiga_Lemmings.png | Dirt tileset on navy; about a dozen walkers, a builder bridge, a rock arch. Status `OUT 23 IN 00% TIME 4-00`. Full 12-button panel (RR 50/50, all skills 10, basher selected) plus minimap. | Panel order and proportions (20% of height), status-line position and legibility, minimap, scene density |
| `02-busy-builders.png` (Amiga, 320×200, crisp) | https://www.hardcoregaming101.net/lemmings/ | Pillar (gold sandstone) tileset. A blocker holds a queue of about 78 lemmings on a ledge leading to builder stairs. Hatch at upper left, exit at lower right. Hover box on a lemming; status `WALKER 6 OUT 78 IN 00% TIME 4-17`. | Critter scale versus playfield (10 px of 160), crowd readability, stair-brick look, hover-box cursor and `ACTION N` label |
| `03-level-preview.png` (Amiga, 640×416) | https://www.pixelatedarcade.com/games/lemmings/screenshots | Briefing for level 1 "Just dig!": level thumbnail on top, then coloured lines (Number of Lemmings 10 / 10% To Be Saved / Release Rate 50 / Time 5 Minutes / Rating Fun), then "Press mouse button to continue". | Briefing information hierarchy (title → stats → prompt), presence of a level thumbnail |
| `04-title-menu.png` (Amiga, 640×416) | https://www.pixelatedarcade.com/games/lemmings/screenshots | Main menu: green logo, then 5 signs held by lemmings (1 PLAYER, 2 PLAYER, NEW LEVEL, music, FUN with ▲▼ rating selector), then a scrolling credits band. | Menu composition and charm; the difficulty selector (our logo, names and art must differ) |
| `05-results.png` (Amiga, 640×416) | https://www.pixelatedarcade.com/games/lemmings/screenshots | Results: "All lemmings accounted for." / needed 10% / rescued 100% / "Superb!…" / access code; sleeping-lemming busy pointer | Results information order (headline → needed vs saved → cheeky verdict → next action) |
| `06-dos-vga-busy-hover.png` (DOS VGA, 642×400 = 2× upscale) | https://dosdays.co.uk/topics/Games/game_lemmings.php | Crystal tileset on black. About 50 lemmings climb a blue lattice pyramid toward a crystal exit with a red glow. DOS hover box; status `WALKER 1 OUT 50 IN 0% TIME 3-41`. Panel RR 50/85 with only the basher available (35). | DOS versus Amiga palette (black background), hover-cursor style, handling of empty skill counts |

**Visual constants measured from the references:**
- **Background:** Amiga `#000031`, DOS `#000000`.
- **Lemming colours:** hair green ≈ `#00BA00`, skin ≈ `#FFDFDE`, robe blue ≈ `#4245EF`. These are *not for our critter*; they are only for contrast comparison.
- **Status text:** green, about 16 px tall.
- **Proportions:** a critter is 1/16 of the playfield height.

---

## 9. Do-not-copy list (IP) and working title

**Status:**
- **"LEMMINGS"** is USPTO Reg. **1,848,503** (class 9), owned by **Sony Interactive Entertainment Europe Ltd**. It was renewed on 7 Nov 2024 and is live to about 2034 ([TSDR](https://tsdr.uspto.gov/statusview/sn74115666)). EU and UK marks are likely too (unverified).
- **Mechanics** are generally not protectable, but **close visual expression can be**. *Tetris Holding v. Xio* (2012) is the cautionary case.
- This is not legal advice. It is the design constraint we adopt.

**Do NOT copy:**
1. The name or logo "Lemmings", or any "Lemm-" prefixed name, in the product title, page `<title>`, icons or metadata. A neutral "inspired by the 1991 classic" credit in the README is acceptable.
2. **Level layouts and titles** from the original, *Oh No! More Lemmings* and later games. This includes the hint-titles quoted in §6.1.
3. **Sprites and animations:** the green-haired, blue-robed, droopy-nosed look; the skill icons, including the "Paws" paw prints and the mushroom-cloud nuke; the panel art, font, minimap style, box art, cursor and busy-pointer art.
4. **Music:** the arrangements, *and* the specific tune set and its order, even though the melodies are public domain.
5. **Sound samples and voice lines** ("Let's go!", "Oh no!", "Yippee!"), including their exact timing and pitch contour. Use our own wordless chirps, with our own captions, e.g. "Off we go!", "Uh-oh…", "Wheee!".
6. **Screen texts:** results messages, manual jokes, the title-scroller text, the ending text and the 10-letter password scheme.
7. **Reference images** stay in `docs/research/reference/` and are **never** bundled into `public/`, `src/` or `dist/`.

**Working-title options** (quick web check done 2026-09-26; a formal trademark search is needed before any public release):

| Name | Pitch | Risk |
|---|---|---|
| **Mumblemarch** *(recommended)* | A stream of little critters mumbling as they march toward the exit | **Low.** No game found with this name. |
| **Tuftlings** | Round critters with a leafy sprout-tuft. "-lings" = little ones. | **Low–medium.** The "-lings" suffix echoes the original, so pair it with a clearly different look. |
| **Trundlers** | They trundle onward no matter what | **Low–medium.** Close to the Steam puzzle game *Trundle*. |

- **Rejected:** "Marchlings" (an existing itch.io game), "Lemmlings" and "Lemmingo" (confusingly similar to the mark).

**Our critter (a proposal for the design phase):**
- **Body:** a round "bean" body with no robe, about 8×10 px, with a 1 px dark plum outline.
- **Colours:** warm apricot or coral body with a cream face, and a swaying **sunflower-yellow sprout tuft** instead of hair. Avoid the green-plus-blue pairing.
- **Face:** two white eye pixels whose pupils show the facing direction.
- **Skill props:** leaf or dandelion glider instead of an umbrella; a "stop" paddle for the blocker; planks with a visible count for the builder; a fuse sparking from the tuft for the bomber; suction-cup hands for the climber.
- **Contrast:** check ≥3:1 against every terrain theme (WCAG 1.4.11).

---

## Sources (primary; the full lists are in the notes files)
- ccexplore's DOS pseudocode and notes: https://github.com/AaronKelley/LemmixPlayer/tree/main/PlayerSourceTrad/Mechanics
- Lemmix (DOS-exact clone): https://github.com/ericlangedijk/Lemmix (`src/Game.pas`, `src/Dos.Consts.pas`, `src/Base.Strings.pas`, `src/GameScreen.Postview.pas`)
- camanis file-format docs: https://www.camanis.net/lemmings/tools.php
- Viglietta, *Glitches in Lemmings*: https://giovanniviglietta.com/files/lemmings/Glitches.html
- Mike Dailly: https://lemmings.info/lemmings-gamehistory/ · https://lemmings.info/making-next-lemmings-part-1/ (and parts 2–3)
- Manuals: DOS https://www.lakora.us/lemmings/dox/ · Amiga https://www.goodolddays.net/files/games/Lemmings/Files/Amiga-OCS/Lemmings-Manual.htm
- Lemmings Wiki: https://lemmings.fandom.com/wiki/Lemmings · /Ability_Panel · /Completion_Screen · /Tileset · /Trap · /Fun · /Music_in_Lemmings
- Wikipedia: https://en.wikipedia.org/wiki/Lemmings_(video_game)
- Level design threads: https://www.lemmingsforums.net/index.php?topic=6437.0 · https://www.lemmingsforums.net/index.php?topic=3926.0
- Accessibility: https://gameaccessibilityguidelines.com/full-list/ · https://www.w3.org/TR/WCAG22/ · https://learn.microsoft.com/en-us/gaming/accessibility/guidelines
- NeoLemmix: https://www.neolemmix.com/ · Lix: https://www.lixgame.com/
- USPTO TSDR (LEMMINGS): https://tsdr.uspto.gov/statusview/sn74115666
