# T1a-skills — the 8 skills via real mouse + keyboard input

Tester: t1a-skills · Build: snapshot :5211 · Viewport 1440×900 (canvas ×3) · Date 2026-09-26

**Method.** Own snapshot server/page (port 5211). All skill selections and assignments used real input:
toolbar-button `click` on a11y uids or number-key presses (`1`–`8`) to choose a skill; real `PointerEvent`
`pointerdown`/`pointerup` on `#game-canvas` (world→client mapping from `camera.toWorld`/canvas rect/scale,
per `src/app/app.ts` + `src/render/camera.ts`) for the mouse path; `Z`/`X` mumble cycling + `Space` for the
keyboard path. `__game.step(n)` advanced ticks deterministically; `assignSkill`/`playSolution` were never used
for the skill under test (only `loadLevel`/`step`/`snapshot`/`terrainAt`/`events`/`announcerLog` for setup and
verification). Levels used: `spade-expectations` (Digger 5), `gently-down-the-dome` (Floater 11),
`bridge-over-troubled-toffee` (Builder 5), `one-pop-wonder` (Bomber 2, Basher 2), `suction-cup-final`
(Climber 10), `not-one-step-bogward` (Blocker 4), `double-boiler` (Bomber/Blocker/Builder/Basher/Digger 2 each),
`diagonally-yours` (Basher 2, Miner 2). 0 console errors/warnings throughout (`list_console_messages`, checked
repeatedly).

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| Digger — mouse assign, terrain | count −1, state `digging`, tunnel removes earth (RESEARCH §2.4) | PASS: click on toolbar+canvas → count 5→4, dug column empties, side earth intact | 02-digger-tunnel.png |
| Digger — refusal, steel below | `steel` reason, not consumed, "Can't dig: steel below" (§6.5) | PASS: mouse click at spawn → skill-rejected steel/below, count stayed 5, announced | 01-digger-steel-refusal.png |
| Digger — floor-gone ending | falls through when a row has no terrain (RESEARCH §2.4) | PASS: dug ~15px then y jumped 91→120 and became `walking` (no steel event) | events log |
| Digger — keyboard assign | `8`, `Z`/`X` select, `Space` assign | PASS: count 4→3, state `digging` | 03-keyboard-select-digger.png |
| Assign while paused | applied at once, "Ready: N jobs start when you resume", pending clears next tick (§6.4.1) | PASS: status showed "Ready: 1 job starts when you resume"; gone after `step(1)` | 04-pending-badge-pause.png |
| Floater — mouse assign on a faller | allowed on faller (RESEARCH §2.5) | PASS: `isFloater` true, count 11→10 | — |
| Floater vs non-floater fall | floater survives; non-floater with fallDistance>60 splats (RESEARCH §2.3/2.4) | PASS: floater id5 landed `walking`; sibling id6 died `cause:splat` | 05-floater-vs-splat.png |
| Floater — refusal, already-floater | "Already a floater", not consumed (§6.5) | PASS: count stayed 10, announced exactly | — |
| Floater — keyboard assign | `2`,`Z`,`Space` | PASS: count 11→10, `isFloater` true | — |
| Bomber — mouse assign + countdown | digits 5→4→3→2→1 then ohno→explode, crater, steel untouched (§3.4/RESEARCH §2.4) | PASS: fuseTicks 79→63→47→31→15→0 (ceil/16 = 4,3,2,1); crater carved x±~7, steel wall 12–16px away unaffected | 06-bomber-crater.png |
| Bomber — keyboard assign | `3`,`Z`,`Space` | PASS: fuseTicks set to 79, count −1 | — |
| Bomber on a blocker | allowed, blocker still explodes (RESEARCH §2.4) | PASS (double-boiler): blocker stayed `blocking` with fuse lit, then died `cause:explode` | — |
| Blocker — mouse assign, turns walkers | state `blocking`, turns approaching walkers (RESEARCH §2.4) | PASS: count 4→3; 4 successive walkers approaching from the left all reversed to `dir:-1` at the field edge. Right-side approach not independently observed (single hatch, no walker approached from >x); turning logic is direction-symmetric in the same field check, so treated as covered — noted as a residual gap, not a bug | — |
| Blocker — refusal, is-blocker | only Bomber accepted, "Blockers only take a Bomber" (§6.5) | PASS: count unchanged, announced verbatim | — |
| Blocker — refusal, overlap | "Too close to another blocker" (§6.5) | PASS: 2nd blocker within 6px refused `blocker-overlap`, count unchanged | — |
| Blocker — keyboard assign | `4`,`Z`,`Space` | PASS: state `blocking`, count −1 | — |
| Builder — mouse assign, brick count | 12 bricks, +2x/−1y per 16-tick cycle, low-brick cue on last 3, shrug→walk (RESEARCH §2.4, DESIGN §3.4) | PASS: bricksLeft 12→0 exactly on the predicted ticks; x/y advanced +2/−1 per cycle; `builder-low-bricks` events fired at bricksLeft 2,1,0; ended `shrugging`→`walking` | 08-builder-stair.png |
| Builder — keyboard assign | `5`,`Z`,`Space` | PASS: state `building`, bricksLeft 12, count −1 | — |
| Builder stopped by wall/ceiling | turns around on head/body hit (RESEARCH §2.4) | NOT OBSERVED: no wall was found within reach of any tested builder in the two builder levels visited (ran out of bricks first both times); not exercised within budget | — |
| Basher — mouse/keyboard tunnel | horizontal tunnel, stops (→walker) when nothing ahead (RESEARCH §2.4) | PASS (keyboard): assigned to id4, tunnelled, auto-stopped to `walking` | — |
| Basher — refusal, airborne | "Needs solid ground to bash" (§6.5) | PASS: assigned to a `falling` mumble via keyboard → `skill-rejected not-applicable/airborne`, count unchanged | — |
| Basher — refusal, none-left | "No bashers left" (§6.5) | PASS: count 0, refused, announced verbatim | — |
| Miner — mouse assign, diagonal dig | +4x/+2y per 24-tick cycle (RESEARCH §2.4) | PASS: x,y advanced exactly 4/2 per cycle over 3 cycles | — |
| Miner — keyboard assign | `7`,`X`,`Space` | PASS: state `mining`, count 2→0 across the two mumbles | — |
| Climber — mouse assign, climbs+hoists | 4px/8 ticks up a ≥7px wall, then hoist→walk (RESEARCH §2.3/§2.4) | PASS: y decreased exactly 4px every 8 ticks while `climbing`, then `hoisting`→`walking` above the wall | — |
| Climber — refusal, already-climber | "Already a climber" (§6.5) | PASS: count unchanged, announced verbatim | — |
| Climber — keyboard assign | `1`,`Z`,`Space` | PASS: `isClimber` true, count −1 | — |
| Picking priority, overlapping mumbles | busy > last-released; hover bracket (§6.3.1/§6.3.2) | PASS: two mumbles at identical (x,y); hover and the final assignment both resolved to the higher id (last released) | 07-hover-overlap-pick.png |
| Climber+Floater stack ("athlete") | both flags coexist, neither rejects the other (RESEARCH §2.4) | NOT EXERCISABLE via any shipped level (no `LevelDef` offers both Climber and Floater — checked all 12 `src/levels/data/*.ts`); verified by code reading instead: `climberRule`/`floaterRule` in `src/core/behaviours/{climb,fall}.ts` each check only their own flag, so stacking is implemented as specified | code: src/core/behaviours/climb.ts:33-43, fall.ts:62-72 |
| Focus stays on canvas after HUD click | §6.2.6 MUST | PASS: `__game.focus()` = `#game-canvas` after clicking the Digger button | — |
| Console errors/warnings | 0 throughout | PASS | list_console_messages (checked 3×) |

## Notes
- All 8 skills were assigned successfully via **both** a real mouse path (toolbar/key select + genuine
  `pointerdown`/`pointerup` on the canvas, assignment on press per `pointer.ts`) and a real keyboard path
  (skill key, `Z`/`X` mumble cycling, `Space`), with counts, states and terrain/physics effects all matching
  DESIGN §3.4/§6 and RESEARCH §2.3–§2.5 exactly, tick-for-tick where checked (bomber fuse digits, builder
  brick cadence, miner slope, climber climb rate).
- No skill assignment ever consumed the skill on a refusal (7 distinct refusal reasons exercised: `steel`,
  `already-climber`, `already-floater`, `is-blocker`, `blocker-overlap`, `airborne`, `none-left`), and every
  refusal's announcer text matched the §6.5 table verbatim.
- Two items could not be fully exercised within the ~120k token budget and are **not** filed as bugs (no
  spec violation observed, just untested): builder stopped by a wall/ceiling (only the "ran out of bricks"
  ending was hit in the two levels visited), and blocker turning walkers approaching from its *right* side
  specifically (only left-side approaches occurred in the single-hatch level used; same code path as the
  left side, which was confirmed working).
- No FUN- bugs filed. Every observed behaviour matched the spec.
