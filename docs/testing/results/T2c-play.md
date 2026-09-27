# T2c-play — fresh-eyes play-test of levels 2–6 (tier 1, Breezy)

Tester: t2c-play · Build: snapshot :5215 · Viewport 1440×900 (canvas ×3) · Date 2026-09-26

**Method.** Levels unlocked through the real UI (Settings → *Unlock all levels* checkbox, a genuine
player-facing setting), reached through Levels → card → briefing → *Let's march!*. Each level was read from
the briefing, the in-game view (screenshot + `__game.terrainAt` as "precise eyes") before any skill use.
**Every skill assignment used real input**: keyboard selection (`Z`/`X`) + `Space` to assign, skill 1–8 keys
to pick a skill. No `assignSkill`/`playSolution`. Time was advanced with `__game.step(n)` while paused
(`P`) so assignments are deterministic; `__game.snapshot()`/`events()` were used only to read state, never
to act. LEVELS.md sections were read only after each level was solved.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| L2 Gently Down the Dome solvable fresh | 6/12 by floater (LEVELS §2) | PASS: 10/12, 1st attempt | L2-briefing.png, L2-start.png |
| L3 Bridge Over Troubled Toffee solvable fresh | 8/15 by builder (LEVELS §3) | PASS: 13/15, 1st attempt | L3-briefing.png, L3-start.png |
| L4 The Punch Line solvable fresh | 6/12 by basher ×2 (LEVELS §4) | PASS: 12/12, 1st attempt | L4-briefing.png, L4-start.png |
| L5 Suction Cup Final solvable fresh | 6/12 by climber (LEVELS §5) | PASS: 10/12, 1st attempt | L5-briefing.png, L5-start.png |
| L6 Not One Step Bogward solvable fresh | 9/15 by blocker (LEVELS §6) | PASS: 14/15, 1st attempt | L6-briefing.png, L6-start.png |
| Softlocks / unwinnable states | none in tier 1 | PASS: none found | — |
| Console | 0 errors/warnings | PASS (0), checked after every level and at session end (`includePreservedMessages`) | list_console_messages |

No bugs filed (`PLAY-C*`): every surprising moment I investigated (see per-level notes) turned out to match
documented design intent exactly once I checked LEVELS.md afterwards.

## Level 2 — Gently Down the Dome (Floater)
- **Result:** solved, 10/12 saved (need 6), 1 attempt, time left (beat the clock). Skills used: Floater 6/11.
- **My solution:** cycled every mumble with `X`+`Space` and gave each one Floater (already the only selectable
  skill) as soon as it existed, before or during its fall off the ledge at x≈176 into the 96 px drop. Matches
  LEVELS §2 exactly ("give it before/during the drop").
- **Difficulty:** 1/5. A single skill, single obstacle, impossible to misread.
- **Caveat on my 2 losses:** I used real-time UI navigation (`Let's march!`) rather than a hard pause-on-load,
  and my own tool round-trips (screenshots, image reads) let ~9 real seconds elapse before my first `P` actually
  landed (confirmed via the event log: both early splats happened *before* my pause+assignments landed at
  tick 276). That is a testing-methodology artifact, not a level fairness issue — a player who reacts promptly
  loses 0. Not filed as a bug.
- **Teaches its skill clearly:** yes — hint ("pack a puff for everyone") plus a single long fall says exactly
  what to do. Briefing/hint clarity good, readability good (water pit is a nice red herring but the actual death
  cause is the plain fall height, confirmed via `terrainAt`/lemming state, not water).
- **Fun/spirit:** simple, satisfying first "aha" for floater.

## Level 3 — Bridge Over Troubled Toffee (Builder)
- **Result:** solved, 13/15 saved (need 8), 1 attempt, beat the clock. Skills used: Builder 1/5.
- **My solution:** let the first mumble walk to the ledge edge (found via `terrainAt` scan: gap x≈222→236,
  14 px), selected it with `Z` right as it reached x=221 (still facing the gap) and assigned Builder. The
  7–8-brick stair reached the far ledge; 2 followers who were already close behind fell into the caramel before
  the bridge completed. Matches LEVELS §3's own verification note exactly ("expect 2–3 losses"; sim got 12/15,
  I got 13/15).
- **Difficulty:** 1.5/5 — slightly harder than L2 because of the follower-timing element, but the level explicitly
  budgets for those losses (50% save requirement, 4 spare builders).
- **Teaches its skill clearly:** yes, hint ("lay a staircase across the gap") is unambiguous.
- **Fairness:** the "some followers fall while you build" behaviour is real Lemmings-style skill tension, not a
  bug — it is called out and budgeted for in the level's own design notes.

## Level 4 — The Punch Line (Basher)
- **Result:** solved, 12/12 saved (need 6, i.e. everyone), 1 attempt, beat the clock. Skills used: Basher 2/5.
- **My solution:** assigned Basher to the lead mumble right at each of the two coral walls (x≈146 for the first,
  32 px wide; x≈291 for the second, 52 px wide), catching it a tick or two before it would otherwise turn around
  from the wall. Both breaches completed well before any follower reached them, so zero losses. Matches LEVELS
  §4's intended solution windows (139–149, 285–295) almost exactly.
- **Difficulty:** 1/5. Flat floor, no drop hazards on the route, so nothing but the two walls to solve — the
  gentlest level of the five.
- **Teaches its skill clearly:** yes, the hint ("punch straight through it — twice") sets the expectation of two
  separate assignments up front, and the level rewards prompt assignment with a perfect save.
- **Note (not filed):** LEVELS §4's internal lesson blurb says "followers wait at the tunnel face" — in practice
  they turn around and walk away (oscillating back toward the hatch) rather than literally waiting, which matches
  RESEARCH §2.3's walker rule (turn around on a wall) rather than the blurb's wording. This text is internal/dev-only
  (not shown to players), so not filed as a player-facing bug.

## Level 5 — Suction Cup Final (Climber)
- **Result:** solved, 10/12 saved (need 6), 1 attempt, beat the clock. Skills used: Climber 10/10.
- **My solution:** gave every mumble Climber as it appeared (10 supplied for 12 mumbles), well before the 56 px
  chimney face at x=232. The last two spawned after the supply ran out and were left oscillating between the
  hatch-side wall and the unclimbable face; since the goal (6) was already exceeded, I used Pop All (`N`,`N`) to
  end the level immediately rather than waiting out the 5-minute clock. Matches LEVELS §5 (10 climbers for 12
  mumbles is a deliberate 2-short supply, matching the 50% save target).
- **Difficulty:** 1/5. One obstacle, one permanent skill, very clear.
- **Teaches its skill clearly:** yes, "tall but grippy, stick with it" directly names the mechanic.
- **Minor observation:** ending early via Pop All while the goal is already met is a nice legitimate player option;
  no issue found with it (nuke behaved per RESEARCH §2.7 — one bomb timer per tick, single nuke sound implied,
  ended cleanly).

## Level 6 — Not One Step Bogward (Blocker)
- **Result:** solved, 14/15 saved (need 9), 1 attempt, beat the clock. Skills used: Blocker 1/4.
- **My solution:** the hatch (x=160) drops mumbles walking *toward* the bog (impassable water cliff at x=320);
  the real exit is behind them, at x≈40. Assigned Blocker to the first mumble at x=229 (within LEVELS §6's
  documented window 161–319) so every follower turns around and walks home. The level then ended automatically
  ("all-resolved") the moment every non-blocker mumble was saved, with the lone blocker still standing — I did not
  need to press Pop All. I initially thought this contradicted RESEARCH §2.7 ("a surviving blocker keeps the level
  running until timeout or nuke"), but `src/core/session.ts` (`checkEnd`) has an explicit, intentional "auto-end:
  every survivor is a spent blocker (LEVELS L11)" rule — this is a deliberate QoL improvement over the 1991
  original's behaviour, not a bug. LEVELS §6's own solution text ("press Pop all to finish") is just slightly
  stale against this later QoL rule; internal doc only, not filed.
- **Difficulty:** 1.5/5 — the "aha" that the exit is *behind* the spawn point, opposite of every previous level's
  left-to-right flow, is a nice small twist for a tutorial level.
- **Teaches its skill clearly:** yes, "somebody has to hold up a paddle" clearly signals Blocker; the level layout
  makes the danger (bog) and the need to turn around obvious once you scout the full screen (it fits in one
  400 px screen, no scrolling needed — confirmed via `ui().cameraX` staying 0 even after `End`/arrow-key presses).
- **Fun/spirit:** the reversed-direction twist is the most memorable moment of the five levels tested.

## Curve / cross-level notes
- Levels 2→6 each introduce exactly one new skill (floater, builder, basher, climber, blocker) with a single,
  legible obstacle and a generous save margin (50–60% required, with spare skill charges in every level but this
  one where the intended solution needs only 1–2 uses). This matches LEVELS.md §"Difficulty curve"'s stated intent
  for Breezy 1–6 almost exactly, and every one of my playthroughs landed within (or above) the designer's own
  simulated save counts.
- All five were first-attempt solves once I understood the single obstacle; nothing needed a retry, an
  `unlockAll`-style workaround, or a softlock recovery. Time was never a pressure factor (all runs finished with
  well over half the 5-minute clock left).
- The two levels with less-than-full saves by design (L2 floater supply matches losses to my own reaction-time
  artifact; L5 climber supply of 10 for 12 mumbles; L3's follower-timing loss; L6's 1-mumble blocker cost) are all
  intentional per LEVELS.md's own verification notes — the tier is honest about its margins, nothing felt
  arbitrary or unfair once I understood the mechanic.
- Readability was good throughout: hazards (water/caramel) read visually distinct from safe terrain, and
  `terrainAt` scans always confirmed what the screenshots suggested.
- 0 console errors/warnings across the whole session (checked after every level and once more at the end with
  `includePreservedMessages: true`).

## Untested / not verified
- Real-time (non-stepped) feel of assigning skills under time pressure (I always paused before acting).
- Keyboard-only cursor aiming (`W A S D`) and mouse/pointer assignment paths (I used keyboard selection +
  `Space` throughout, per the brief's allowed methods; pointer-event assignment on the canvas was not exercised
  in this session).
- Screen reader / announcer wording beyond spot-checking `announcerLog()` output (looked correct, e.g. "Walker,
  facing right, N of M", "Climber assigned. Starts when you resume.", "Level complete! N of M saved, K needed.").
- Settings other than *Unlock all levels*.
