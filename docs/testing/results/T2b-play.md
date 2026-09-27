# T2b — Fresh-eyes play-test, levels 10–12 (t2b-play)

Build: snapshot :5214 (14:19). Viewport 1440×900, canvas ×3. Levels 1–9 were unlocked by writing
`localStorage['mumblemarch.save']` (`progress[id] = {completed:true,…}` for the first 9 ids) and reloading. After that I used
only the real UI: Levels → card → Briefing → "Let's march!", then Next level. Skills were chosen with the number keys
(`3`–`8`) and given by `PointerEvent`s dispatched on `#game-canvas` over the mumble (one Shift-click for walkers only).
Release rate was changed with `Shift+=`. The camera was moved with `Home` and minimap presses. I paused with `P`.
I used `__game.step`, `snapshot()` and `terrainAt()` only to look and to fast-forward. I never called `assignSkill` or
`playSolution`. I read each LEVELS.md section only after that level was finished.

**Fresh-eyes caveat (L12):** while comparing L10 I also read the LEVELS.md *Overview / Difficulty curve* block at the top.
It has one sentence about L12 ("chains a climber scout, a bridge, a held crowd released in one rush past a trap, and a
mined descent"). So my L12 run was not fully blind. I had not seen its layout, the timings or the solution.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| L10 Double Boiler: solvable by a first-time player | Gnarly, multi-site (LEVELS §10) | PASS: solved on attempt 1, 39/40 (need 32), 2:14 left | L10-briefing.png, L10-midplay.png |
| L11 Wrong Side of the Hedge: solvable | Gnarly, scout + one-way (LEVELS §11) | PASS: solved on attempt 1, 30/30 (need 25), ≈3:00 left | L11-briefing.png, L11-midplay.png |
| L11 rightward bash into the one-way hedge is refused and not consumed | RESEARCH §2.5, DESIGN §6.5 | PASS: `skill-rejected reason:one-way`, basher count unchanged; message "Can't bash against the arrows" | events log |
| L12 Last Shift at the Foundry: solvable | Stampede finale (LEVELS §12) | PASS (barely): solved on attempt 1, **48/60, need 48, zero margin**, ≈2:48 left | L12-briefing.png, L12-midplay-trap.png |
| Softlocks / stuck mumbles in L10–12 | — | PASS: all 3 runs ended by "all-resolved", no Pop all needed | outcome JSON |
| Console errors/warnings | tester brief | PASS: 0 | list_console_messages |

## Level 10 — Double Boiler (Gnarly)
- **Result:** solved, 39/40 saved (need 32), 2:14 left, 1 attempt. Skills used: digger, basher, blocker, builder, bomber (5 of 10).
- **My solution:** West: a digger at x≈202 on the bare slab (the steel tray under the hatch stops a lazy dig), then a basher
  through the brick "door" in the corridor (x=400). East: a blocker on the 2nd east mumble at x≈1056, walking left, left of the
  hatch landing. A builder on the 1st east mumble at the caramel gap (x≈902, facing left). When the stair was done, a bomber on the blocker.
- **Compared with LEVELS §10:** the same as the intended solution, step for step. The plan came from just looking at the level.
  The two hatches, the gap over the fire pot, the pillar and the steel tray all read clearly.
- **Difficulty:** 2.5/5. It is right for the first Gnarly level: two sites 500 px apart and a blocker-then-bomber sacrifice. The time
  pressure is fair: the east mumbles need ≈20 s to reach the gap.
- **Briefing/hint:** the briefing has no description text, only stats, skills and the map. The hint ("Two hatches, two kitchens, one
  exit in the middle…") fits but adds little. The map thumbnail was enough to see two hatches and one exit.
- **Readability:** good. The caramel fire pool has a flame texture and reads as dangerous. Note: the exit pit's floor (fill `solid`)
  is flat, untextured orange. Next to the striped strata and the orange caramel it could be taken for a liquid at first glance.
  Only the exit standing on it says otherwise. Polish only.
- **Near-miss route (not tested):** bashing the west pillar instead of digging leads to a walk-off at x=504 with a 64 px drop onto
  the exit floor. That is exactly the lethal limit (RESEARCH §2.3), and the eye can't tell it from a safe 63 px drop. LEVELS says
  "West bash before the dig is impossible". In play it is a trap that looks possible, but you learn it from the splats. Fair in the Lemmings spirit.
- **Fun:** good. A satisfying juggle. It really teaches "plan the camera".

## Level 11 — Wrong Side of the Hedge (Gnarly)
- **Result:** solved, 30/30 saved (need 25), ≈3:00 left, 1 attempt. Skills used: climber, basher, digger (3 of 6).
- **My solution:** a climber on the first mumble. It climbs the hedge, walks to the steel end wall, bounces off the overhang and
  comes back facing left. At x≈253, a basher facing left bashes along the arrows into the pen. Then a digger on the first crowd
  mumble in the yard (x≈311). Everyone drops into the lower tunnel and walks left to the exit.
- **Compared with LEVELS §11:** the same as intended. The "<" arrows on the hedge block and the steel pen floor made the idea
  easy to read. The basher window is ≈11 px (x 248–258) before the scout starts to climb the hedge again. That is tight
  without pause, but a miss only costs one scout loop (≈40 s), not the level.
- **Difficulty:** 2/5. It felt easier than L10, so the curve inside Gnarly goes slightly down. It is still OK as a "concept" level.
- **Briefing/hint:** the hint ("cut it from the far side. Send a scout over the top") gives the solution away almost completely. That is fine for Gnarly.
- **Readability:** good. The one-way arrows, the steel pen and the steel overhang are all clear. The refusal text for a rightward
  bash, "Can't bash against the arrows", explains the rule well.
- **Fun:** a good "aha" moment even with the hint.

## Level 12 — Last Shift at the Foundry (Stampede)
- **Result:** solved, **48/60, need 48, zero margin**, ≈2:48 left, 1 attempt. Skills used: climber, builder, basher, miner (4 of 8).
- **My solution:** a climber scout over the slag wall (x=280). A builder over the 12 px brass channel (x≈461). Release rate raised
  to 99 with `Shift+=`, so all 60 were on the dock by t≈1346. A miner (the scout) on the heap at x≈1045, which breaks into the undercroft.
  Then a basher on a crowd mumble at the slag wall (x≈277) to release the whole shift. The scout died alone at the piston.
  11 crowd mumbles were hit by the piston (re-arm ≈50 ticks), because the crowd arrived spread out over ≈500 px.
- **Compared with LEVELS §12:** same skills, different **timing**. In the intended run the crowd is released early (sim: t=700),
  so it reaches the heap *while the miner is still digging*. The heap (20 px walls on both sides + parapet) then acts as a second
  holding pen and bunches the crowd before the tunnel opens (sim: 7–8 bites, 52–53 saved). I did it the "careful" way and prepared the
  whole route first, then let the shift through, which is what the hint suggests ("Scout ahead, bridge the brass, then let the whole
  shift through at once"). The crowd then trickles past the piston and the margin disappears. Nothing on screen tells the player
  that the heap is where the bunching must happen. → **PLAY-B1**.
- **Difficulty:** 4/5 as played, and it fits the Stampede tier. Route-finding was fair: the wall, the channel, the steel bedrock and
  the parapet with its overhang all read clearly. The trap maths is the hard part, and it is mostly invisible.
- **Readability:** the piston hammer is small (≈16 px) and sits on a plain floor. It is easy to see once you scroll there. The long
  hanging ring at x≈1400 is decoration made of terrain and looked like it might be the trap. Minor.
- **Fun:** a satisfying finale route. Scraping through with exactly 48 felt lucky, not earned.

## Other observations
- Pressing "Try again" on the results screen restarts the level at once, running in real time (no briefing, not paused).
  That is fine, but it means ≈1 s of play before a player can press `P`.
- When I left L11 via Esc → Quit to levels, the assertive live region still held "Level complete! 30 of 30 saved, 25 needed."
  on the Levels and Briefing screens → **PLAY-B2**.
- `__game.snapshot()` returns `null` once the results screen shows. This is test-hook behaviour only, not a bug.

## Bugs filed
- PLAY-B1 (minor): L12 piston toll depends on invisible crowd timing; the hint-following "route first, then release" run saves exactly 48/48.
- PLAY-B2 (minor): stale "Level complete!…" text stays in the assertive live region on the Levels/Briefing screens.

## Not verified
- I did not play-test alternatives (L10 pillar-bash route, L10 builder-before-blocker, L12 early release to measure the better margin).
- Keyboard-only selection (`X`/`Z` + `Space`) was not used for assignments; I used pointer events only.
- No second attempt on L12, so I did not measure how often the natural approach fails.
