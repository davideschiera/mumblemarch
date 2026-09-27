# Lemmings (DMA Design, 1991) — mechanics & numbers (DOS primary, Amiga noted)

Scope: original *Lemmings* game logic, DOS version first (it is the one that has been fully disassembled), Amiga differences noted where sourced.
Unit convention: **1 frame = 1 logic tick** (everything in the game is frame-based, not time-based — ccexplore, [lemmingsforums t=497](https://www.lemmingsforums.net/index.php?topic=497.0)).

**How reliable is this?** Most numbers come straight from two primary sources:
- **[ccx]** ccexplore's pseudocode of the DOS game logic, reconstructed from a disassembly of the DOS executable (sent to Lemmix author E. Langedijk in 2006). File `Lemmings_mechanics015.txt` plus the explanatory e-mails `@Lemmings_mechanics0NN.txt`, stored in [LemmixPlayer/PlayerSourceTrad/Mechanics](https://github.com/AaronKelley/LemmixPlayer/tree/main/PlayerSourceTrad/Mechanics). Short link used below: [ccx015](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt).
- **[Lemmix]** Lemmix, an "almost exact clone of DOS-Lemmings", source code [ericlangedijk/Lemmix `src/Game.pas`](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas). It implements [ccx] and flags each DOS bug as an optional "mechanic".
- Secondary sources: the [Viglietta glitch list](https://giovanniviglietta.com/files/lemmings/Glitches.html), the [camanis file-format docs](https://www.camanis.net/lemmings/tools.php), Mike Dailly's (ex-DMA) blog [lemmings.info](https://lemmings.info/making-next-lemmings-part-2/), [Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings), and [Lemmings.ts](https://github.com/tomsoftware/Lemmings.ts), a TypeScript clone.

## Key numbers at a glance

| Quantity | Value | Confidence | Source |
|---|---|---|---|
| Logic tick rate | **17 ticks per game-second** (≈58.8 ms per tick). Lemmix's timer is 58 ms. On the Amiga the logic runs every 3rd PAL frame (50/3 ≈ 16.7 Hz). | High | [ccx note 004](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics004.txt), [Dos.Consts#L39](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L39), [Dailly](https://lemmings.info/making-next-lemmings-part-2/) |
| Level / view size | Level is **1600×160** (Amiga and level format). DOS shows x 0..1583 (1584 px). The view is 320×160 with a 320×40 panel below it, on a 320×200 screen. | High | [Dailly pt3](https://lemmings.info/making-next-lemmings-part-3/), [Dos.Consts#L58](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L58), [camanis main.dat](https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt) |
| Walker | **1 px/tick**, 8-frame cycle. Steps up ≤2 px directly. A 3–6 px step is climbed as a "jump". A rise of 7 px or more is a wall (turns, or climbs if a climber). Walks down ≤3 px; drops of 4 px or more start a fall. | High | [ccx015 L57-122](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2826](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2826) |
| Faller / splat | **3 px/tick**. Splats if its fall counter is >60. In practice, a walk-off drop of **≤63 px is safe and ≥64 px kills**. | High | [Game.pas#L3210](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3210), [Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html) |
| Floater | The umbrella starts once the fall counter is >16 (about 19 px of fall). The first 8 floating ticks move 3,3,3,3,−1,0,1,1 px; after that it sinks **2 px/tick**. | High | [Game.pas#L731](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L731) |
| Climber | Climbs **1 px on 4 of every 8 ticks** (0.5 px/tick). The hoist over the top takes 8 ticks. | High | [Game.pas#L2947](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2947) |
| Builder | **12 bricks**, each 6×1 px. Each brick moves the builder +2 px forward and 1 px up. One brick takes 16 ticks (192 ticks total), then an 8-tick shrug. A warning "ting" plays on the last 3 bricks. | High | [Game.pas#L2737](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2737), [#L2996](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2996) |
| Bomber | Countdown of **79 ticks** (shows 5→1), then a 16-tick "Oh no!", then the explosion. The crater is a **16×22** mask with its top-left at (x−8, y−14). | High | [Game.pas#L2075](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2075), [ccx note 008](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics008.txt) |
| Release interval | **(99 − RR) div 2 + 4 ticks** between lemmings (RR 99 → 4 ticks, RR 1 → 53 ticks). The hatch opens at tick 35 and the first lemming appears at tick 54. RR can never go below the level's starting value. | High | [Game.pas#L4001](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4001), [ccx note 005](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics005.txt) |
| Digger / basher / miner | **Digger:** 9 px wide, goes down 1 px every 8 ticks. **Basher:** 16×10 mask, advances 5 px per 16-tick stroke. **Miner:** 16×13 mask, moves +4 px across and +2 px down every 24 ticks. | High | [Game.pas#L2907-3208](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2907) |

At 17 Hz those speeds become: walker ≈17 px/s, faller ≈51 px/s, floater ≈34 px/s, climber ≈8.5 px/s, basher ≈5.3 px/s, miner ≈2.8 px/s across, digger ≈2.1 px/s. Crossing the whole level on foot takes about 93 s.

---

## A. Timing & world

### A1. Frame rate / tick
- **DOS: 17 logic frames per in-game second.**
  - ccexplore timed a slowed-down DOS build: "how many frames per game second, which if I counted correctly is apparently 17" ([ccx note 004](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics004.txt)).
  - Lemmix counts down the level clock by one second every 17 ticks ([Game.pas#L3498](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3498)) and sets `DOS_FRAMES_PER_SECOND = 17` ([Dos.Consts#L39](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L39)).
  - Lemmix's frame timer is `INTERVAL_FRAME = 58` ms (≈17.2 fps) ([GameScreen.Player.pas#L34](https://github.com/ericlangedijk/Lemmix/blob/master/src/GameScreen.Player.pas#L34)).
- **Amiga: every 3rd PAL vblank (16.7 Hz).** Mike Dailly (ex-DMA) wrote "the Amiga version ran in 3 frames" and "my target frame rate of 17fps (same as the Amiga version)" ([part 1](https://lemmings.info/making-next-lemmings-part-1/), [part 2](https://lemmings.info/making-next-lemmings-part-2/)).
- **Lemmings.ts** (a TypeScript clone) uses `TIME_PER_FRAME_MS = 60` (16.7 Hz) and derives the clock from that. This is slightly off from 17 ticks per game-second ([game-timer.ts](https://github.com/tomsoftware/Lemmings.ts/blob/master/src/game/game-play/game-timer.ts)).
- The ~15 fps figure that turns up in web search summaries is unsourced; do not use it. The "60 ms per tick (3/50 s)" figure is forum speculation ([t=497](https://www.lemmingsforums.net/index.php?topic=497.0)).
- **Fast-forward:**
  - The original DOS/Amiga games have no fast-forward.
  - The ONML "Introducing SUPERLEMMING" level runs the whole game, clock included, at about 2× speed ([ccexplore in t=497](https://www.lemmingsforums.net/index.php?topic=497.0), [wiki](https://lemmings.fandom.com/wiki/Inroducing_SUPERLEMMING)).
  - Lemmix uses 20 ms per tick for SuperLemming and 10 ms per tick for its own fast-forward ([Player.pas#L35-36](https://github.com/ericlangedijk/Lemmix/blob/master/src/GameScreen.Player.pas#L35)).
  - Recommendation: a fixed 17 Hz simulation, with fast-forward as N ticks per render frame.
- **Tick order** (the DOS "master loop", [ccx note 005](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics005.txt), [Game.pas#L3408](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3408)):
  1. Process skill assignment.
  2. Spawn a lemming.
  3. Update each lemming in release order:
     - update the bomb timer;
     - run the action handler (it returns a flag);
     - if the flag is TRUE, check interactive objects.
  4. Nuke step.
  5. Animate objects.

### A2. Playfield, screen, camera, coordinates
- **Level size:**
  - Amiga and the level format are 1600×160 ("5x320x160 screens", [Dailly pt3](https://lemmings.info/making-next-lemmings-part-3/)).
  - DOS only shows x = 0..1583 (1584 px wide) × y = 0..159 ([Dos.Consts#L58-70](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L58)).
  - The level's start-screen x is 0..0x4F0 (1264 = 1584 − 320) and is rounded to a multiple of 8 ([camanis .lvl](https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt)).
- **Screen layout:**
  - 320×200 total: a 320×160 playfield on top and a 320×40 panel below ([camanis main.dat §5/§9](https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt)).
  - The panel's top 16 px is a 40-character status line in an 8×16 font: cursor info, OUT, IN %, TIME.
  - Below that are 12 buttons, 16 px wide, starting at (1,16) ([Game.SkillPanel.pas](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.SkillPanel.pas)).
  - The minimap is 104×20 at (208,18) and scales the level by 1/16 horizontally and 1/8 vertically ([Dos.Consts#L36](https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas#L36), [Game.pas#L2305](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2305)).
- **Camera scroll:** Lemmix scrolls 8 px per 58 ms (≈138 px/s), 1 px with Ctrl, 328 px for page scroll ([Player.pas#L251](https://github.com/ericlangedijk/Lemmix/blob/master/src/GameScreen.Player.pas#L251)). The original DOS scroll speed is *unverified*.
- **Lemming position (x, y):** this is "the pixel of floor that the lemming is standing on", horizontally centred under the sprite. The foot is actually outside the lemming graphic ([ccx note 002](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics002.txt)).
  - The sprite's top-left is drawn at (x − footX, y − footY).
  - Trigger areas (exit, water, traps) are tested only at this foot pixel. So an exit's trigger sits just *under* the floor ([ccx note 006](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics006.txt)).
- **Movement bounds** ([ccx015 L42-47](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt)):
  - `LEMMING_MIN_X = 0`, `LEMMING_MAX_X = 1647`.
  - `LEMMING_MAX_Y = 163`: a lemming whose y is >163 is removed.
  - `HEAD_MIN_Y = −5`: if y + frameTopDy < −5, the lemming is pushed down and turned around.
- **Object map:** trigger areas, steel and blocker fields live in a separate grid with a resolution of **4×4 px**.
  - It covers x −16..1647 and y 0..159+ ([ccx note 006](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics006.txt)).
  - This is why steel rectangles and trigger areas snap to multiples of 4.

### A3. Sprites, hitbox, selection
- **Animation table** (DOS `MAIN.DAT`). All frames are 16 px wide. Frames per cycle / height / foot (x,y):

| Action | Frames | Height | Foot |
|---|---|---|---|
| walk | 8 | 10 | (8,10) |
| jump (3–6 px step) | 1 | 10 | (8,10) |
| dig | 16 | 14 | (8,12) |
| climb | 8 | 12 | (8,12) |
| hoist | 8 | 12 | (8,12) |
| build | 16 | 13 | (8,13) |
| bash | 32 (= 2 strokes) | 10 | (8,10) |
| mine | 24 | 13 | (8,13) |
| fall | 4 | 10 | (8,10) |
| umbrella (4 opening + 4 floating) | 8 | 16 | (8,16) |
| splat | 16 | 10 | (8,10) |
| exit | 8 | 13 | (8,13) |
| drown | 16 | 10 | (8,10) |
| fried | 14 | 14 | (8,14) |
| block | 16 | 10 | (8,10) |
| shrug | 8 | 10 | (8,10) |
| oh-no | 16 | 10 | (8,10) |

  - The explosion is a single 32×32 frame with its foot at (16,25).
  - Sources: [camanis main.dat §3](https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt), [Styles.Base.pas#L425](https://github.com/ericlangedijk/Lemmix/blob/master/src/Styles.Base.pas#L425).
- **Hitbox:** a lemming is "under the cursor" when the cursor point lies in [x+frameLeftDx, +12] × [y+frameTopDy, +12], which is a 13×13 px box ([ccx015 ProcessSkillAssignment](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L3595](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3595)).
  - For a walker that is x−8..x+4 by y−10..y+2.
  - The game's cursor hotspot is **not** the centre of the crosshair. Lemmix maps the visual centre (7,7) to the game hotspot (4,9), i.e. game point = centre + (−3, +2) ([Player.pas#L592](https://github.com/ericlangedijk/Lemmix/blob/master/src/GameScreen.Player.pas#L592)).
  - Measured from the crosshair centre, the box for a walker is roughly x−5..x+7 by y−12..y.
- **Priority when several lemmings are under the cursor** ([ccx015](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt)):
  - Lemmings that are *busy* (blocking, building, shrugging, bashing, mining, digging, oh-no-ing) are preferred over the rest.
  - Within each group, the **last one in release order** wins.
  - Holding the **right mouse button** forces the non-busy lemming to be picked.
  - For builder, basher, miner and digger: if the preferred lemming can't take the skill, it falls back to the non-busy one.
- **Status line:** shows the action name plus the number of lemmings under the cursor, e.g. "WALKER 1". A lemming that is both climber and floater shows as "ATHLETE" ([Game.pas#L3636](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3636)).

## B. Movement

### B4. Walker ([ccx015 L57-122](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2826](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2826))
Each tick the walker moves x += dx (±1). Then:
- **If (x, y) is terrain**, count the solid pixels directly above the foot (checks up to 7 px):
  - 0 → walk on flat ground.
  - 1–2 → step up that many px.
  - 3–6 → **jump**: y −= 2 at once, then rise up to 2 px per tick in the Jumping state until clear.
  - 7 or more (">6") → **wall**: turn around, or start climbing if it is a climber.
- **If (x, y) is empty**, look up to 3 px downward for floor:
  - Found → walk down to it.
  - Not found → y += 4 and become a **faller**.
- If x < 0, turn around. The left edge acts as a wall.
- A lemming that turns steps 1 px into the wall; several glitches exploit this ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).

### B5. Faller, splat, floater ([Game.pas#L3210-3292](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3210))
- **Fall speed:** up to 3 px/tick; each pixel step is tested for floor.
- **Fall counter:**
  - It starts at 3 (the original-DOS mechanic `FallerStartsWith3`, [Game.pas#L1984](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L1984); `SetToFalling` in [ccx015](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt)).
  - It grows by 3 on every full 3-px tick.
  - On landing, a counter **> 60** (`MAX_FALLDISTANCE`, [Game.pas#L764](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L764)) means **splat** (16 frames, then removed). Otherwise the lemming becomes a walker.
- **What that means in pixels** (derived):
  - A walker drops 4 px before it becomes a faller.
  - After 19 full ticks the counter is 60 and the drop is 61–63 px → safe.
  - One more tick means a drop of ≥64 px → splat.
  - **Safe maximum is 63 px**, which matches Viglietta ("66 [Windows] instead of 63") ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
  - From a hatch (the counter starts at 3 at the spawn point) the safe maximum is about 59 px below the spawn y.
  - The threshold differs by version: CustLemm uses 63 ([ccx note 002](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics002.txt)); the Windows port effectively allows 66 px.
- **Floater:**
  - At the start of a falling tick, if counter > 16 and the lemming is a floater, it switches to Floating. That happens after 5 full ticks, about 19 px.
  - A per-tick table then drives the fall: dy = 3,3,3,3,−1,0,1,1, followed by 2 px every tick (the table loops over its last 8 entries). The frames 0–3 open the umbrella.
  - A floater lands as a walker. Floaters survive any height, including when the umbrella never had time to open.
- **Falling out the bottom:** once y > 163 the lemming is removed silently, with no animation and no DOS sound. (Lemmix adds an optional custom sound.)

### B6. Climber / hoister ([ccx015 L253-301](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2947](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2947))
- Climbing is an 8-frame cycle:
  - Frames 0–3: check for the top. If (x, y−7−frame) is empty, set y −= frame − 2 and start hoisting.
  - Frames 4–7: y −= 1 each tick. So the climber gains **4 px per 8 ticks**.
- **Ceiling or overhang:** if there is terrain at (x−dx, y−8), or the head passes the top boundary, the climber becomes a faller. It turns around and shifts 2 px away from the wall; there is a known 1-px offset glitch here ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
- **Hoist:** 8 ticks. y −= 2 on frames 1–4, then the lemming becomes a walker.
- Climber is **permanent** (`isClimber`). It combines with floater ("athlete").

### B7. Level edges
- **Left edge (x < 0):** acts as a wall; the lemming turns around.
- **Right edge:** `LEMMING_MAX_X = 1647` is far beyond the visible 1583. With no terrain there, lemmings **walk off the right side and fall to their death**. ccexplore: "a lemming will turn around at the level's left boundary, but will simply fall off its right boundary" ([ccx note 002](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics002.txt)).
- **Top:** at `HEAD_MIN_Y = −5` the lemming is clamped and turned around; builders are refused near the top.
- **Bottom:** y > 163 → removed, counted as lost.
- **Remake recommendation:** make both side edges consistent. Either treat them as walls, or treat them as kill zones and make that visible.

## C. Skills

**Which states can receive each skill** ([ccx015 AssignSkill](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2039-2216](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2039)). A refused assignment does **not** use up the skill.

| Skill | Accepted from | Refused when |
|---|---|---|
| Climber | any state except blocking, splatting, exploding (fallers, floaters, builders etc. all OK) | already a climber |
| Floater | same as climber | already a floater |
| Bomber | any state except oh-no, exploding, fried/vaporizing, splatting | timer already running |
| Blocker | walking, shrugging, building, bashing, mining, digging | its field would overlap another blocker's field |
| Builder | walking, shrugging, bashing, mining, digging (**not** building) | head near the top (y + frameTopDy < −5) |
| Basher | walking, shrugging, building, mining, digging | steel in front (plays the "ting"); one-way wall facing the other way |
| Miner | walking, shrugging, building, bashing, digging | steel in front ("ting"); steel below; one-way wall facing the other way |
| Digger | walking, shrugging, building, bashing, mining | steel below |

- **Fallers, jumpers, climbers and floaters can only receive climber, floater or bomber.** The other skills need a walker or another worker.
- Assigning a builder to a *shrugger* is how you extend a bridge.

**Bomber** ([Game.pas#L2075, L2218, L2624, L3338-3379](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2218)):
- **Countdown:** `explosionTimer = 79`, decremented once per tick. The digit over the head is:

| Digit | Timer ticks | Duration |
|---|---|---|
| 5 | 65–79 | 15 ticks |
| 4 | 49–64 | 16 ticks |
| 3 | 33–48 | 16 ticks |
| 2 | 17–32 | 16 ticks |
| 1 | 1–16 | 16 ticks |

  - The whole countdown is ≈4.65 s ("five seconds").
- **When the timer hits 0:**
  - If the lemming is falling, floating, drowning or fried, it **explodes immediately**.
  - Otherwise it enters **Oh-no** for 16 ticks (≈0.94 s). During Oh-no it can still fall 3 px per tick, and it counts as a "busy" lemming for cursor priority. Then it explodes.
- **Crater:** a 16×22 elliptical mask with its top-left at (x−8, y−14), covering x−8..x+7 and y−14..y+7 ([ccx note 008](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics008.txt)). The mask shape, as in [NeoLemmix `bomber.png`](https://github.com/andersmelander/neolemmixplayer/blob/master/data/external/gfx/mask/bomber.png) (believed to be the DOS one):
  - rows 0/21 are 6 px wide;
  - rows 1/20 are 8–10 px;
  - rows 4–5 are 12 px;
  - rows 6–9 and 16–18 are 14 px;
  - rows 10–15 are 16 px.
- **What it destroys:**
  - **No terrain is removed** if the object map at the lemming's foot is steel or water.
  - Otherwise *all* terrain in the mask is removed, **including steel** (a DOS bug, [Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
  - Other lemmings are **not** harmed. The explosion only removes terrain.
  - A blocker's field is restored when it explodes.
- **Aftermath:** the explosion graphic shows for 1 tick. Particles (80 per explosion) last about 52 ticks, and the level can't end until they finish.

**Blocker** ([ccx notes 006-007](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics007.txt), [Game.pas#L1873-1925, L3319](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L1899)):
- **Field:** writes a 3×3 block of object-map cells (4 px each, so **12×12 px**) at x−4, x, x+4 and y−6, y−2, y+2, each snapped to the 4-px grid.
  - **Left column = FORCE_LEFT:** turns lemmings to face left.
  - **Right column = FORCE_RIGHT:** turns lemmings to face right.
  - **Middle column = neutral.** Lemmings dropping onto it walk through ([ccexplore post](https://lemmingsforums.net/index.php?action=profile&area=showposts&start=315&u=43)).
- **When others turn:** a lemming turns as soon as its **foot pixel** enters an arm cell, i.e. 1–8 px from the blocker's x. This also turns builders, bashers and miners, which is the classic "turn a builder with a blocker" trick. It only acts on ticks where the other lemming's handler returns TRUE.
- **Overwrites:** the field overwrites steel and trigger cells, which is a glitch. The old cells are saved and restored when the blocker is freed.
- **Release:** a blocker can't be told to stop. It reverts to a walker only if the **ground under its foot is removed**, and otherwise stays until it **explodes** (bomber or nuke). A blocker keeps its field through Oh-no until it explodes.
- **Amiga/SNES:** assigning a blocker to a lemming standing in mid-air makes it revert and turn around; this doesn't happen on DOS ([ccexplore](https://lemmingsforums.net/index.php?action=profile&area=showposts&start=315&u=43)).

**Builder** ([ccx015 L357-448](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2737, L2996](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2996)):
- **Bricks:** 12 per assignment. Each brick is **6 px × 1 px**, in the row above the foot (y−1).
  - Placed at x..x+5 when facing right, x−4..x+1 when facing left. This left/right asymmetry is itself a DOS quirk.
  - Drawn "behind" existing terrain in palette colour 7.
- **Cycle:** 16 frames per brick.
  - Frame 9: lay a brick.
  - Frame 10: play the warning sound if ≤3 bricks remain, so the last 3 bricks each "ting".
  - Frame 0: move +dx, −1 up, then +dx again.
- **Stair shape:** it rises 1 px for every 2 px across. After 12 bricks the stair is **28 px long and 12 px high**, and the lemming ends at (x0+24, y0−12).
- **When it stops:**
  - Terrain at (x, y−1) after either 1-px step → it turns around and walks.
  - Terrain at (x+2dx, y−9) → head bump → it turns and walks.
  - It reaches a level x-bound → it turns.
  - Its head goes above −5 → it becomes a walker.
  - It runs out of bricks → it **shrugs** for 8 ticks, then walks.
- **Duration:** 192 ticks (≈11.3 s) for the bricks plus 8 ticks of shrug.

**Basher** ([ccx notes 010-011](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics011.txt), [Game.pas#L3056](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3056)):
- **Cycle:** 32 frames containing **2 strokes** of 16.
- **Digging:** on frames 2–5 of each stroke it applies a 16×10 mask (4 masks, left and right versions), placed at the sprite's box (x−8, y−10). The tunnel is therefore up to 10 px tall.
- **Moving:** on frames 11–15 of each stroke it moves 1 px per tick, so **5 px per stroke**.
  - While moving it follows the floor down by up to 2 px. With no floor within 3 px it becomes a faller.
  - If the object in front (x+8dx, y−8) is steel (plays the "ting") or a one-way wall facing the wrong way, it turns around and walks.
- **When it runs out of terrain:** it only checks on frame 5 of the *first* stroke in each 32-frame cycle. It scans 4 px at height y−6, starting 8 px ahead; if all 4 are empty it becomes a walker. As a result, bashers always finish with an odd number of strokes.

**Miner** ([ccx015 L860-933](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L3125](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3125)):
- **On assignment:** y += 1.
- **Cycle:** 24 frames.
  - Frame 1: apply mask 0 (16×13) at the sprite box.
  - Frame 2: apply mask 1, offset (+dx, +1).
  - Frames 3 and 15: x += 2·dx.
  - Frames 0 and 3: y += 1.
  - Net result: **+4 px across and +2 px down per cycle**, a diagonal of 1 down per 2 across.
- **When it stops** (checked after each move):
  - No floor at the foot → faller.
  - Steel below → plays the "ting", turns, walks.
  - One-way-left wall while facing right → turns, walks.
  - **Any one-way-right wall → turns, walks.** This DOS bug makes right-pointing one-way walls unminable in both directions.

**Digger** ([ccx015 L720-782](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2767, L2907](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2907)):
- **First tick:** clears the rows y−2 and y−1.
- **Then:** on frames 0 and 8 of its 16-frame cycle it clears row y over **9 px (x−4..x+4)** and moves y += 1. That is **1 px per 8 ticks**.
- **When it stops:**
  - The row it tried to clear had no terrain → faller.
  - Steel in the object map at the new foot → plays the "ting" and becomes a walker.
- It only checks steel at its single foot point, so it can dig away the sides of steel ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
- Digging ignores one-way walls.

**Steel "ting":** plays on a refused basher/miner assignment and whenever a basher, miner or digger hits steel ([Game.pas#L2129](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2129)).

**Permanent skills:** climber and floater are flags (`isClimber`, `isFloater`); both together is an "athlete". Everything else is a state that the next state replaces.

## D. Game rules

### D8. Release rate, hatches, spawning ([ccx note 005](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics005.txt), [Game.pas#L4001](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4001))
- **Interval formula:** `interval = (99 − RR) div 2 + 4` ticks, using truncating division, so RR 98 and RR 99 behave the same.
  - Examples: RR 99 → 4 ticks (0.24 s); RR 50 → 28 ticks (1.6 s); RR 1 → 53 ticks (3.1 s).
  - Confirmed independently against WinLemm ("4+(99-RR)" at double frequency, [t=497](https://www.lemmingsforums.net/index.php?topic=497.0)).
  - Raw RR values of 0 and 100–255 wrap around (n < 0 → n + 256) ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
- **Allowed range:** RR can be adjusted between the **level's starting RR and 99** only (`Restrict(N, Level.Info.ReleaseRate, 99)`, [Game.pas#L4149](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4149)).
  - Lemmix changes RR by ±1 per tick while the button is held; the DOS rate is unverified.
  - DOS allows RR changes while paused; Amiga/SNES don't ([ccexplore](https://lemmingsforums.net/index.php?action=profile&area=showposts&start=315&u=43)).
- **Level-start timeline, counted in ticks from level start:**

| Tick | Event |
|---|---|
| 15 | "Let's go!" |
| 35 | Hatches start opening (with sound); spawning is enabled |
| 54 | First lemming (spawn countdown starts at 20 and decrements from tick 35) |
| 55 | Music starts |

  - These tick counters keep running while paused, which is the "pause for time" glitch worth about 2 s ([ccx note 005](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics005.txt)).
  - The hatch opening animation plays once. Its length depends on the tileset (≈10 frames, unverified).
- **Spawn point:** (hatch.x + 24, hatch.y + 14), as a **faller facing right**.
- **Multiple hatches:** only the first 4 hatches are used, and the order cycles every 4 lemmings:

| Hatches | Order |
|---|---|
| 1 | AAAA |
| 2 | **ABBA** (original Lemmings only; ONML uses ABAB) |
| 3 | ABCB |
| 4 | ABCD |

  - Source: [ccx note 005](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics005.txt), [Game.pas#L1604](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L1604).

### D9. Nuke ([ccx015 L22-38](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L3987, L4061](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4061))
- **Stops spawning** immediately.
- Then, **one lemming per tick** in release order gets `explosionTimer = 79`. Lemmings that are removed, splatting, exploding or already counting down are skipped. So the last of 80 lemmings starts its countdown about 80 ticks after the first.
- **Sounds:** the nuke sound plays once; the individual "Oh no!" sounds are suppressed while nuking.
- **End:** the level ends when no lemmings are out, after the last explosion's particles finish.
- **Nuke glitch:** the saved % is computed against the number *released* instead of the level total ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html), [Game.pas#L4469](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4469)). The Amiga doesn't have this glitch.
- **Activation:** double-clicking the nuke icon is the common behaviour ([wiki](https://lemmings.fandom.com/wiki/Nuke)); for DOS this is unverified.

### D10. Time limit
- The limit is set in minutes per level. The format allows 0–255, but "1 to 9 works best", and the display is M-SS ([camanis .lvl](https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt)).
- The clock loses 1 s every 17 ticks ([Game.pas#L3498](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3498)).
- **At 0-00 the level ends immediately.** Lemmings still in play simply count as not saved (`TimeIsUp → Finish`, [Game.pas#L2232](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2232)).
- The level also ends early in two cases:
  - every lemming has been released and is saved or dead;
  - after a nuke, when none are left.
- So a surviving blocker keeps the level running until the clock runs out or the player nukes.

### D11. Save requirement & lemming count
- **Requirement:** the level stores a *count* of lemmings to rescue. It is shown as a % (rescue·100 div total). The in-game "IN" figure is also a %.
- **Win check:** `saved·100 div total ≥ rescue·100 div total` ([Game.pas#L4469](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L4469)).
- **Maximum lemmings per level:** **80 in DOS** (reduced from the Amiga's 100 to limit slowdown) ([Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings); the Amiga figure of 100 is implied by [Dailly pt1](https://lemmings.info/making-next-lemmings-part-1/)). The Windows .lvl format allows up to 114 ([camanis .lvl](https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt)).
- **Skill counts:** 2 digits (0–99), and 0 is shown blank ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
- **Per-level limits:**
  - 32 objects, of which only the first 16 have effects in DOS because of a 4-bit index;
  - 400 terrain pieces;
  - 32 steel rectangles.
  - Sources: [camanis .lvl](https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt), [ccx note 006](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics006.txt).

### D12. Exits, traps, liquids ([ccx015 L480-562](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt), [Game.pas#L2342](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L2342))
- **Trigger rectangles:**
  - Each object's trigger rectangle comes from its tileset data: left = tl·4, top = tt·4−4, width and height ×4, relative to the object's position snapped to the 4-px grid.
  - An exit placed at a y that isn't a multiple of 4 may not work.
  - Where triggers overlap, the later object wins, and triggers overwrite steel ([camanis groundXo](https://www.camanis.net/lemmings/files/docs/lemmings_vgagrx_dat_groundxo_dat_file_format.txt), [ccx note 006](https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/%40Lemmings_mechanics006.txt)).
  - Objects' x positions are multiples of 8.
- **Exit:** triggers when the foot is in the exit trigger and the lemming is **not a faller**. It plays "Yippee" and the 8-frame exit animation, then the lemming is counted as **IN** (saved) and removed.
- **Triggered traps:** the lemming is **removed instantly** and the trap animation plays. The trap then ignores everyone until its animation ends, so bunched groups mostly pass. It then re-arms ([wiki Trap](https://lemmings.fandom.com/wiki/Trap)).
- **Water / acid / lava ("drown"):** 16-frame drowning. The lemming drifts 1 px per tick forward unless there is terrain 8 px ahead, then it is removed.
- **Fire / continuous traps ("fried"):** 14 frames, then removed.
- Both of the above kill instantly: the outcome can't be changed once triggered, although a bomber whose timer runs out still explodes.

### D13. One-way walls & steel
- **One-way walls** are trigger effects 7 (left) and 8 (right).
  - Only **bashers and miners** are restricted by them: they can't dig against the arrow. Assignment is refused, or they turn around when they reach the wall.
  - Miner bug: right-pointing walls block mining in both directions.
  - Diggers, bombers and builders ignore arrows.
  - Known data bugs: one-way triggers sit 4 px too high, and the brick tileset's one-way walls are twice as wide as intended ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
- **Steel:**
  - Stored as rectangles that are multiples of 4 px ([camanis .lvl](https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt)).
  - The game only tests steel at a few *points* (see C), not over the whole mask. As a result basher, miner and digger masks can shave steel at the edges ([Viglietta](https://giovanniviglietta.com/files/lemmings/Glitches.html)).
  - **Remake recommendation:** test steel per pixel of the mask and never remove steel.

### D14. Quirks & glitches (part of the DOS feel; most should be fixed)
All from the [Viglietta glitch list](https://giovanniviglietta.com/files/lemmings/Glitches.html) and ccexplore's notes.
- **Direct drop:** a faller that would splat, landing on an exit trigger that has terrain under it, exits instead. On DOS the splat handler returns TRUE, and the object check then overrides the splat ([Game.pas#L3237](https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas#L3237)). The Amiga doesn't have this.
- **Bombers destroy steel** unless the bomber is standing on steel itself.
- **Bashers, miners and diggers remove steel** inside their masks.
- **Blocker fields** erase steel, traps and exits underneath them.
- **Blockers push lemmings through thin walls.**
- **Builders pass through 1-px overhangs.**
- **"Giant leap"/sliding:** a lemming that is jumping keeps rising if bricks are added above it.
- **Left/right builder asymmetry** (see Builder above).
- **Continuous shrugger:** assigning a climber to a shrugger leaves it stuck in the shrug animation. Original DOS only.
- **Nuke glitch** (see D9).
- **Pause for time** (see D8).
- **Right-click bug:** a previously highlighted lemming receives the skill.
- **Miners over 1-px gaps:** miners step 2 px, so they cross 1-px gaps.
- **Bashers stop randomly near the top of the level:** the steel check reads garbage memory there.
- **Windows port:** the safe fall is 66 px, and lemmings can walk over the top of the level.
- **Amiga lacks** the nuke glitch, pause-for-time, direct drop and the continuous shrugger.

---

## Sources
- ccexplore's DOS-disassembly pseudocode (latest version): https://github.com/AaronKelley/LemmixPlayer/blob/main/PlayerSourceTrad/Mechanics/Lemmings_mechanics015.txt
- ccexplore's explanatory e-mails (notes 001–014): https://github.com/AaronKelley/LemmixPlayer/tree/main/PlayerSourceTrad/Mechanics
- Lemmix (DOS-exact clone) engine: https://github.com/ericlangedijk/Lemmix/blob/master/src/Game.pas
- Lemmix constants: https://github.com/ericlangedijk/Lemmix/blob/master/src/Dos.Consts.pas
- Lemmix animations: https://github.com/ericlangedijk/Lemmix/blob/master/src/Styles.Base.pas
- Lemmix timing and cursor: https://github.com/ericlangedijk/Lemmix/blob/master/src/GameScreen.Player.pas
- camanis MAIN.DAT doc (sprite and mask sizes): https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt
- camanis .LVL doc: https://www.camanis.net/lemmings/files/docs/lemmings_lvl_file_format.txt
- camanis groundXo (trigger areas): https://www.camanis.net/lemmings/files/docs/lemmings_vgagrx_dat_groundxo_dat_file_format.txt
- Viglietta, "Glitches in Lemmings": https://giovanniviglietta.com/files/lemmings/Glitches.html
- lemmingsforums "release rate calculation" (ccexplore): https://www.lemmingsforums.net/index.php?topic=497.0
- ccexplore forum posts (blocker, Amiga differences): https://lemmingsforums.net/index.php?action=profile&area=showposts&start=315&u=43
- Mike Dailly (ex-DMA), Making NEXT Lemmings: https://lemmings.info/making-next-lemmings-part-1/ , https://lemmings.info/making-next-lemmings-part-2/ , https://lemmings.info/making-next-lemmings-part-3/
- Lemmings Wiki: https://lemmings.fandom.com/wiki/Lemmings , https://lemmings.fandom.com/wiki/Nuke , https://lemmings.fandom.com/wiki/Trap , https://lemmings.fandom.com/wiki/Release_rate
- NeoLemmix mask PNGs (believed copied from DOS): https://github.com/andersmelander/neolemmixplayer/tree/master/data/external/gfx/mask
- Lemmings.ts (TypeScript clone, 60 ms tick): https://github.com/tomsoftware/Lemmings.ts
- Wikipedia: https://en.wikipedia.org/wiki/Lemmings_(video_game)

## Open questions / disagreements
1. **Wall-clock tick length.**
   - 17 ticks per *game second* is solid ([ccx], Lemmix).
   - The real-time period is measured, not disassembled: Lemmix uses 58 ms, Lemmings.ts uses 60 ms, and the Amiga runs at 50/3 Hz = 60 ms.
   - Recommendation: use ≈58.8 ms (1000/17) so that the game clock matches real seconds.
2. **Level width.**
   - DOS shows 1584 px; the Amiga and the format use 1600 px.
   - Recommendation for novel levels: pick 1600×160, or allow a variable width.
3. **Right edge.** DOS lets lemmings walk off the right side (fatal) but bounces them off the left side. This is inconsistent; decide one rule for the remake.
4. **Time up.**
   - Wikipedia says "all the lemmings explode" when time runs out.
   - The DOS-faithful Lemmix/[ccx] code just ends the level.
   - Some ports may nuke; the DOS behaviour is to end the level.
5. **Safe fall.**
   - DOS: 63 px (counter > 60, starting at 3).
   - CustLemm: threshold 63 (ccexplore). Windows: 66 px. Lynx: lower.
   - Whether the Amiga matches DOS exactly is unverified. Viglietta lists no Amiga difference.
6. **Hatch and trap animation lengths** depend on the tileset data (≈10 frames for hatches); not extracted.
7. **Mask shapes** for basher, miner and bomber are known only via NeoLemmix PNGs (believed to be from DOS `MAIN.DAT`). The sizes (16×10 ×4, 16×13 ×2, 16×22) are confirmed ([camanis](https://www.camanis.net/lemmings/files/docs/lemmings_main_dat_file_format.txt)).
8. **Still unverified for DOS:** scroll speed, how fast RR changes while +/− is held, and whether the nuke needs a double-click.
9. **Oddities in the reconstructed builder code.**
   - The builder also lays a brick on frame 10 when exactly 9 bricks remain.
   - The same brick's pixels are simply re-filled, so this is harmless; it is probably a disassembly quirk.
   - Recommendation: ignore it.
