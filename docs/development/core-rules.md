# Core simulation rules — resolved details (workstream A)

Owner: **core-lead**. Spec sources stay authoritative: `docs/research/RESEARCH.md` §2 (numbers),
`docs/research/notes-mechanics.md`, `docs/design/DESIGN.md` §1.1/§3.4/§6.2.3/§6.3/§6.4.1/§6.5/§7.9,
`docs/design/LEVELS.md` "Notes for architecture/dev", `docs/architecture/ARCHITECTURE.md` §5–§6,
`docs/development/CONTRACTS.md` §2. This file only **pins down what those leave open**, so the
implementers and the independent validators agree. Where it is silent, follow the sources; where
geometry is still open, match the preview sim (`docs/design/mockups/levels-preview.html`
`simulate()`), which the level windows were derived with — except where this file or DESIGN differ.

Notation: `(x, y)` = foot pixel; supported ⇔ `terrain.isSolid(x, y)`. `dir` ∈ {−1, +1}.
"t" = dir-relative column offset: pixel column `x + t·dir`. `phase = stateTicks % cycle`.
The session increments `stateTicks` **before** each handler, so the first tick in a state sees 1.
Constants: `src/core/constants.ts` (FROZEN). Helpers: `src/core/behaviours/movement.ts`
(`HEAD_DY = 10`, `isSolidOrEdge`, `isOutsideX`, `solidRunAbove`, `gapBelow`, `headAboveTop`,
`startFalling` (= falling + `fallDistance = FALL_COUNTER_STEP`), `turnAround`, `isOneWayAgainst`, `isSteel`).

## F. Session flow (session.ts)

- **Tick order** (`step()`): due commands → release → each active lemming in release order
  [`tickFuse` → `stateTicks++` → state handler → blocker turn (below) → triggers] → nuke →
  compact → traps (cooldown −1) → clock → goal events → end check → `tick++`.
- **Start timeline**: `lets-go` on the step with `tick === LETS_GO_TICK` (15), `entrance-opened`
  at 35, first spawn at 54. Afterwards spawn when `tick − lastSpawnTick >= releaseIntervalTicks(rate)`
  using the **current** rate (so RR changes apply at once). Entrance for the n-th release (0-based)
  = `ENTRANCE_ORDER[min(entrances,4)−1][n % order.length]` (ABBA for 2). Spawn at the entrance
  point, `falling`, `dir +1`, `fallDistance = FALL_COUNTER_STEP` (3), ids 0,1,2… in release order;
  emit `lemming-spawned`; right after the last one emit `all-released`. Nothing is released once
  nuking (no `all-released` then).
- **Nuke** (command): once — `nuking = true`, `nuke-started`. Each tick in the nuke phase, the
  **first** active lemming in release order that is eligible (not removed, `fuseTicks === 0`, state
  not in `UNASSIGNABLE_STATES`) gets `fuseTicks = BOMB_FUSE_TICKS`; one per tick (the first one on
  the tick the nuke is applied). `counts.toRelease` = 0 while nuking.
- **Triggers** (foot pixel only, after the handler, in this order, first match wins; skipped for
  lemmings in `splatting | drowning | burning | exploding | exiting`):
  1. **Exit**: foot in `[ex+dx, ex+dx+w) × [ey+dy, ey+dy+h)` of `EXIT_TRIGGER` for any exit, and
     state not `falling` and not `ohno` → `setState(exiting)`. (Floaters, jumpers, workers do exit.)
  2. **Water** (`kind 'water'`, foot inside `area`, half-open rect) → `setState(drowning)` then
     `kill(lem, 'drown')`.
  3. **Fire** → `setState(burning)` then `kill(lem, 'burn')`.
  4. **Trap** — only when armed (`hazardCooldowns[i] === 0`); applies to **every** non-terminal
     state (walkers, fallers, floaters, workers…): emit `trap-triggered{hazardIndex, lemmingId}`,
     then `kill(lem, 'trap')` (removed at the end of the tick), `cooldowns[i] = cooldownTicks`.
     An unarmed trap ignores everyone. Fired at tick T ⇒ can fire again at tick T + cooldownTicks.
  5. **Out of bounds**: `y > level.height + OUT_OF_BOUNDS_MARGIN` → `kill(lem, 'out-of-bounds')`
     (applies to every state).
  Several hazards of one kind: lowest index first.
- **Deaths and saves** (`kill`/`save` are the only counters):
  - `kill(lem, cause)`: if the lemming was not yet counted dead: `dead++` and emit
    `lemming-died{cause}` **now** (the moment the fatal state begins). If its state is an animated
    death (`splatting | drowning | burning`) it is **not** removed — the terminal handler removes it
    silently later; otherwise it is removed at the end of the tick. A lemming is never counted or
    announced twice (e.g. a drowning bomber that then explodes). Callers `setState` first, then kill.
  - `save(lem)`: `saved++`, `lemming-exited`, removed at the end of the tick.
  - `counts.out = released − saved − dead` (dying mumbles are already dead).
- **Blocker field** (`blockerTurn(x, y, selfId)`): for every other lemming B that is `blocking`,
  or is in `ohno` having been a blocker when its fuse ran out (the session remembers these ids —
  a blocker keeps its field through oh-no until it explodes): if `B.y − 6 ≤ y ≤ B.y + 5` and
  `1 ≤ |x − B.x| ≤ BLOCKER_REACH` → return `sign(x − B.x)` (left column turns left, right column
  right); `x === B.x` is the neutral middle. The session applies it after the handler to lemmings
  in `walking | building | bashing | mining`: if it returns d ≠ 0, `dir = d` (the state is kept —
  a builder/basher/miner continues its job the other way).
- **Clock**: every step `timeLeft−−` while > 0; `time-low{secondsLeft}` when it lands exactly on
  60/30/10 s. When it reaches 0: not relaxed → level ends `time-up` (same step); relaxed → emit
  `overtime-started` once on that step, the clock stays 0 and `overtimeTicks` += 1 on every later
  step. The relaxed clock never ends the level.
- **Goal events** (end of every step, once each): `goal-reached{saved}` the first time
  `saved ≥ saveRequired`; `goal-impossible` the first time (and only if goal-reached never fired)
  `saved + alive + notYetReleased < saveRequired`, where alive = active lemmings not counted dead
  (exiting ones count as alive) and notYetReleased = nuking ? 0 : total − released.
- **End** (after the goal events): (all released **or** nuking) and no active lemmings →
  `all-resolved`; **auto-end** `all-resolved` when all released, not nuking, ≥ 1 active and every
  active lemming is `blocking` with `fuseTicks === 0`; else time-up (above). Dying/exiting mumbles
  are active until removed, so the end waits for their animations. `won = saved ≥ saveRequired`.
  `LevelOutcome.ticks` = number of steps run including the last (= `session.tick` afterwards);
  `overtimeTicks` = the overtime so far. After the end `step()` does nothing.
- **Commands / assignment**: `checkAssign` is pure (order: level ended → `no-lemming` (missing or
  removed) → `none-left` → the skill rule). `applyNow` applies at once through the same path as a
  due command and records it at `session.tick`; several in one pause apply in order, each checked
  against the state left by the earlier ones. A refusal never consumes the skill.

## R. Rejections (every `SkillRule.rejectReason`, first match wins)

| Skill | Checks in order → `{reason, detail}` |
|---|---|
| all 8 | state in `UNASSIGNABLE_STATES` (splatting, ohno, exploding, drowning, burning, exiting) → `not-applicable / busy-dying` |
| climber | blocking → `not-applicable / is-blocker`; isClimber → `not-applicable / already-climber` |
| floater | blocking → `is-blocker`; isFloater → `already-floater` |
| bomber | `fuseTicks > 0` → `not-applicable / fuse-lit` (blockers accept bombers) |
| blocker, builder, basher, miner, digger | state in `AIRBORNE_STATES` → `not-applicable / airborne`; blocking → `not-applicable / is-blocker`; same job (building / bashing / mining / digging) → `not-applicable / same-job`; then the skill check below |
| blocker | another blocker (state `blocking`) with `|dx| < BLOCKER_FIELD.w` and `|dy| < BLOCKER_FIELD.h` → `blocker-overlap` |
| builder | `headAboveTop(y − BUILDER_STEP_Y)` → `too-high` (a shrugger is accepted: extends the stair) |
| basher | steel in the first stroke's test region → `steel / ahead`; one-way against dir there → `one-way / ahead` |
| miner | steel in the first cycle's test region above the foot row → `steel / ahead`; steel at (x, y), (x, y+1) or in the test region at/below the foot row → `steel / below`; one-way against → `one-way / ahead` |
| digger | steel anywhere in row y, columns x−4..x+4 → `steel / below` |

Rejection checks use the **same geometry functions** as the handlers, so a refusal is truthful.

## M. Movement (walk.ts, fall.ts, climb.ts, terminal.ts)

- **Walking** (1 px/tick): `nx = x + dir`. If `nx` is outside [0, width) → turn around, do not move
  (edges never get climbed). Else `x = nx` and:
  - `(x, y)` solid: `r = solidRunAbove(x, y, WALL_HEIGHT)`. `r ≤ 2` → `y −= r`. `3 ≤ r ≤ 6` → jump:
    `y −= JUMP_SPEED`, `setState(jumping)`. `r ≥ 7` → wall: climber → `setState(climbing)` at this x
    (the foot column is the wall's face column); otherwise `x −= dir` and turn around (no 1-px
    step into the wall). A rise that would make `headAboveTop(newY)` also counts as a wall
    (turn, never climb).
  - `(x, y)` empty: `d = gapBelow(x, y, MAX_STEP_DOWN)`; `d > 0` → `y += d`; else
    `y += WALK_OFF_DROP` and `startFalling`.
- **Jumping** (x fixed): each tick rise while `isSolid(x, y−1)`, at most `JUMP_SPEED` px; then if
  `(x, y−1)` is empty → `walking`. (A 3–4 px ledge: 1 jumping tick; 5–6 px: 2 ticks.)
- **Falling**: first, floater with `fallDistance > FLOATER_OPEN_FALL` → `setState(floating)`, no
  move this tick. Else move down pixel by pixel while `(x, y)` is empty, at most `FALL_SPEED`. If it
  moved fewer than `FALL_SPEED` px it landed: `fallDistance > MAX_SAFE_FALL` → `splatting` +
  `kill('splat')`, else `walking`. If it moved the full 3 px: `fallDistance += FALL_COUNTER_STEP`.
  ⇒ walk-off drop (foot to floor top) ≤ 63 px safe, ≥ 64 px splats; from a hatch ≤ 59 px safe.
- **Floating**: if supported → `walking`. Else `dy = FLOATER_OPENING_DY[stateTicks−1]` for
  stateTicks ≤ 8, then `FLOAT_SPEED`; `dy < 0` → `y += dy`; `dy > 0` → move down pixel by pixel
  while unsupported, at most dy; supported afterwards → `walking`. Floaters never splat.
- **Climbing** (x = wall face column): every tick **first** the overhang/ceiling check: `(x − dir,
  y − 8)` solid, or `headAboveTop(y)` → turn around, `x += CLIMB_FALLBACK·dir` (new dir, i.e. 2 px
  away from the wall), `startFalling`. Else `phase = stateTicks % 8`: phases 0–3 = top check: if
  `(x, y − 7 − phase)` is empty → `y −= phase − 2` and `setState(hoisting)`; phases 4–7 → `y −= 1`.
  (Invariant: at the switch the wall's top pixel is exactly 8 px above the foot.)
- **Hoisting**: stateTicks 1–4 → `y −= 2`; stateTicks === `HOIST_TICKS` → `walking` (standing on
  the wall's top pixel, same x, same dir).
- **Terminal** (dying mumbles keep animating; the death was already counted):
  splatting — removed silently (`lem.removed = true`, no event) at stateTicks === `SPLAT_TICKS`;
  drowning — each tick drift `x += dir` unless `isSolidOrEdge(x + dir, y − 1)`; removed at
  `DROWN_TICKS`; burning — removed at `BURN_TICKS`; exiting — `ctx.save(lem)` at `EXIT_TICKS`.

## S. Skills (block.ts, bomb.ts, build.ts, bash.ts, mine.ts, dig.ts)

- **Assign**: climber/floater set the flag; bomber `fuseTicks = BOMB_FUSE_TICKS`; blocker →
  `blocking`; builder → `bricksLeft = BUILDER_BRICKS`, `building`; basher/miner/digger → their state.
- **Workers lose ground**: blocking, shrugging, building, bashing, mining, digging check support at
  the start of their handler; unsupported → blocker: `walking` (reverts; the walker then falls),
  others: `startFalling`.
- **Fuse** (`tickFuse`, every lemming before its handler): nothing when `fuseTicks === 0` or state
  is `exiting | splatting | burning | ohno | exploding` (a mumble that reaches the exit is saved).
  Else `fuseTicks−−`; at 0: state `falling | floating | drowning` → `setState(exploding)` (it
  explodes this same tick); otherwise `setState(ohno)` + emit `lemming-ohno{lemmingId, nuking}`.
- **Oh-no**: while unsupported, fall up to `FALL_SPEED` px (pixel by pixel, no fall counter, no
  splat). At stateTicks === `OHNO_TICKS` → `exploding`.
- **Exploding** (first tick in the state): crater, emit `explosion{lemmingId, x, y}`, then
  `kill('explode')`. Crater = every pixel (px, py) with px ∈ [x−8, x+7], py ∈ [y−14, y+7] and
  `((2(px−x)+1)·11)² + ((2(py−y+3)+1)·8)² ≤ 176²` (integer maths; the preview ellipse), removed with
  `terrain.remove(px, py, 0)` — never steel, one-way ignored. Other lemmings are unharmed. On a
  16 px floor the bowl is walkable (depth 8 at the centre, ≤ 2 px per column step at the rims).
- **Blocking**: stays put. Its field is applied by the session (F).
- **Builder** (`phase = stateTicks % 16`): phase 9 with bricks left → lay a brick in row `y − 1`,
  columns t = 0..5 (right: x..x+5, left: x−5..x — symmetric), `Material.Earth` +
  `level.brickColor`, only into empty pixels; `bricksLeft−−`. Phase 10 → if `bricksLeft <
  BUILDER_WARN_BRICKS` emit `builder-low-bricks{bricksLeft}` (after bricks 10, 11, 12: 2, 1, 0).
  Phase 0 (stateTicks > 0) → step: `y −= 1; x += dir`; if outside [0,width) (clamp back) or `(x, y−1)`
  solid → turn, `walking`; `x += dir`, same check; head bump `(x, y − 9)` solid → turn, `walking`;
  `headAboveTop(y)` → `walking`; `bricksLeft === 0` → `shrugging` + `builder-finished`.
  12 bricks → stair x..x+27 (27 px ahead), 12 px high; the builder ends at (x0 + 24·dir, y0 − 12)
  after 192 ticks. **Shrugging**: stateTicks === `SHRUG_TICKS` → `walking`.
- **Basher** (`phase = stateTicks % 16`): mask t ∈ [−8, 7] × rows y−10..y−1 (16×10); **test region**
  t ∈ [0, 7] × rows y−10..y−1. Carve phases 2–5: before carving, steel in the test region → emit
  `hit-steel{lemmingId, x, y}` (the first steel pixel, scanning t ascending then rows top→bottom),
  turn, `walking`; one-way against dir there → turn, `walking` (no event). Else remove every mask
  pixel with `terrain.remove(px, py, dir)`. **Lookahead** when `stateTicks % 32 === 5` (after the
  carve): if none of `(x + k·dir, y − 6)`, k = 8..11, is `isSolidOrEdge` (all 4 empty, level edges count as solid) → `walking`. Move phases
  11–15: `x += dir`; outside [0,width) → step back, turn, `walking`; unsupported → `d = gapBelow(x, y,
  3)`: `1 ≤ d ≤ BASH_FOLLOW_DOWN` → `y += d`, else `startFalling`. (5 px per stroke.)
- **Miner** (`phase = stateTicks % 24`): carve at phase 1 with the mask anchored at (x, y) and at
  phase 2 anchored at (x + dir, y + 1). Mask (16×13, slanted so the path stays supported): columns
  t ∈ [−7, 8]; for column t the rows `bottom(t) − 12 .. bottom(t)` with
  `bottom(t) = y + b(t)`, `b(t) = floor(t/2) − 1` for t ≤ 1 and `floor(t/2) − 2` for t ≥ 2.
  **Test region** = mask pixels with t ≥ 0: steel → `hit-steel` (first steel pixel), turn, `walking`;
  one-way against → turn, `walking`. Else `terrain.remove(px, py, dir)` over the mask.
  Moves: phase 3 → `x += 2·dir, y += 1`; phase 15 → `x += 2·dir`; phase 0 (stateTicks > 0) →
  `y += 1` (net +4 across, +2 down per 24 ticks). After each move: outside [0,width) → undo x, turn,
  `walking`; unsupported → `startFalling`.
- **Digger** (`DIG_TICKS_PER_ROW` = 8): when `stateTicks % 8 === 0`: row y, columns x−4..x+4:
  any steel → `hit-steel` (first steel pixel), `walking`; no solid pixel → `startFalling`; else
  remove the row with `dir 0` (one-way ignored) and `y += 1`; if the new row x−4..x+4 has no solid
  pixel → `startFalling`.

## P. Picking (picking.ts, DESIGN §6.2.3 / §6.3.2–§6.3.4)

- `isSelectable` = not removed and not in `UNASSIGNABLE_STATES`. Filter `walkers` (and
  `walkersOnly`) pass `walking | jumping`; `facing-left/right` test `dir`.
- `lemmingsAt(p)` = selectable, filter-passing lemmings whose `LEMMING_HITBOX` (x−6..x+6,
  y−11..y+1) contains p, in release order (the "×N" count).
- `pickLemmingAt(p, skill, {filter, walkersOnly, snapRadius, accepts})`: 1) candidates =
  `lemmingsAt`; 2) none → the single nearest selectable filter-passing mumble whose body centre
  (x, y−5) is within `snapRadius` (Euclidean, `d² ≤ R²`), ties → higher id; none → null; 3) if
  `skill` and `accepts` are given and ≥ 1 candidate accepts, drop those that don't; 4) prefer busy
  (blocking, building, shrugging, bashing, mining, digging, ohno — ohno is never selectable, so in
  practice the first six); 5) then the highest id (last released).
- `cycleLemming(current, step, {filter, fromX, view, group})`: order = selectable filter-passing,
  sorted by x then id. Current found → step ±1 wrapping; with `group` → walk from current in `step`
  direction (wrapping) to the first mumble with `|x − current.x| > GROUP_GAP` or a different state;
  none → plain ±1. Current missing/null → `fromX` given: step 1 → first with x ≥ fromX, step −1 →
  last with x ≤ fromX, none → wrap to first/last; else `view` given: step 1 → leftmost with
  x0 ≤ x ≤ x1, step −1 → rightmost in view; none in view → nearest to (x0+x1)/2 (ties → higher id);
  else first/last. Empty order → null.
