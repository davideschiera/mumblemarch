# T2a-play — fresh-eyes play-test of levels 7, 8, 9

Tester: t2a-play · Build: snapshot :5213 (built 14:20) · Viewport 1440×900 (canvas ×3) · Date 2026-09-26

**Method.** Levels unlocked through the real UI (Settings → *Unlock all levels* checkbox), reached through
Levels → card → briefing → *Let's march!*. I read each level from the briefing, the in-game view (camera via
`End`/`Home` and minimap pointer presses) and `__game.terrainAt`/`snapshot` as "precise eyes"; time was advanced
with `__game.step(n)` while paused. **Every skill assignment and release-rate change used real input**: skill keys
`3`/`6`/`7`, `X` + `Space`, or pointer events on the canvas over the mumble; RR with `Shift+=`. No
`assignSkill`/`playSolution`. LEVELS.md sections were read only after each level was solved. Before playing, the only
level-design text I saw was the LEVELS.md overview table rows (its "new skill" column), found while grepping for the
section headings.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| L7 Diagonally Yours solvable fresh | 14/20 by miner + basher (LEVELS §7) | PASS: 20/20, 3:20 left, 1st attempt | L7-briefing.png, L7-midplay.jpg |
| L8 One-Pop Wonder solvable fresh | 15/20 by bomber + basher (LEVELS §8) | PASS: 19/20, 2:51 left, 1st attempt | L8-briefing.jpg, L8-midplay.jpg |
| L8 "any one bomber works" | LEVELS §8: pops wherever it stands | FAIL: a pop under the hatch column makes later spawns splat (PLAY-A1) | events log |
| L9 Clam Before the Storm solvable fresh | 28/40 with a rush past the trap (LEVELS §9) | PASS: 32/40, 4:10 left, 1st attempt (2nd variant 34/40) | L9-briefing.jpg, L9-midplay.jpg |
| Softlocks / timer | levels end on their own when all resolved | PASS: all runs ended `all-resolved`, 0 overtime | snapshot outcome |
| Console | 0 errors/warnings | PASS (0) | list_console_messages |

## Level 7 — Diagonally Yours (Knotty, 1st Knotty)
- **Result:** solved, 20/20 (need 14), 3:20 left, 1 attempt. Skills used: Miner 1/2, Basher 1/2.
- **My solution:** Miner on the leading mumble at x≈141 on the striped hill (it breaks into the undercroft at y 88,
  a 40 px drop). The crowd follows the tunnel. Then a Basher at the ice pillar (x≈469). This matches the intended
  solution in LEVELS §7 exactly.
- **Difficulty:** 1.5/5. It is a clean skill-intro level: one obvious obstacle per skill and a spare of each. It is gentler than a
  "Knotty" label suggests, but it is fine as the tier opener that teaches the Miner.
- **Briefing/hint:** the briefing has stats and skills only (no flavour line). I did not need the hint. The preview
  shows the hill, the steel parapet, the pillar and the exit clearly.
- **Readability:** the gold riveted plates read as steel. The striped hill and pale undercroft floor read as diggable
  earth. The purple bridge right of the parapet is unreachable decor, but it does not mislead because the parapet is
  visibly steel.
- **Fairness:** no timing precision is needed (window x 24..195 per the design). The parapet keeps everyone safe while
  you think. **Fun:** a pleasant "aha, diagonal" moment, very much in the spirit of the original's teaching levels.

## Level 8 — One-Pop Wonder (Knotty)
- **Result:** solved, 19/20 (need 15), 2:51 left, 1 attempt. Skills used: Bomber 1/2, Basher 1/2.
- **My solution:** Bomber on the first mumble in the steel hopper; it popped at x=146 (right side). The crowd dropped
  48 px to the works floor. Then a Basher at the slag wall (x≈310). This matches LEVELS §8.
- **Difficulty:** 2/5 and it fits the tier. The hint ("one brave volunteer") plus the Bomber-only kit makes the idea
  obvious.
- **Fairness issue (PLAY-A1, major):** *where* the bomber pops matters, and nothing tells you. A crater under the
  hatch (spawn x=124) turns every later spawn's drop into 24→104 = 80 px, so each one splats. In a deliberate 2nd run
  (pop at x=129 with 11 still unreleased) six splats followed at one per spawn, and the run could no longer be won
  (max 8 < 15). Roughly 30 % of pop positions in the hopper do this. The design text's claim "pops wherever it
  stands / popping the very first mumble works too" is only true if the crater misses the drop column. It is a
  classic original-game lesson, but the level's text says the opposite, and a tier-2 intro level shouldn't hinge on it silently.
- **Readability (PLAY-A2, minor):** the hint's "thin tin floor" is drawn as brick. The only tin-looking thin strips are
  the solid bars at y=72 elsewhere. The blue riveted steel walls are very clear.
- **Fun:** yes. Sacrificing one mumble is satisfying, and the "uh-oh" plus crater feedback is good.

## Level 9 — Clam Before the Storm (Knotty)
- **Result:** solved, 32/40 (need 28), 4:10 left, 1 attempt. A 2nd variant for the screenshot saved 34/40.
- **My solution:** Basher on the first mumble at the coral gate (x≈153). Then RR 20→99 with `Shift+=` ×8 (run 1
  after the gate was open; run 2 immediately). The dense stream passed the clam (x≈320), which eats one mumble and then
  naps 34 ticks. The first 3–4 trickled mumbles were eaten, then about 1 in 8 of the rush. This matches the documented
  alternative. The intended solution is to wait for a full pen and then bash.
- **Difficulty:** 2/5 and it fits the tier. It is a good "release rate matters" lesson, and failing with a trickle is visible and
  instructive. The hint ("naps after every snack … one big rush") says exactly what to do. Without the hint, a
  newcomer needs to know that traps re-arm. The name helps.
- **Readability:** the clam reads as a creature (eye), and the hint and title identify it as the danger. During the rush
  the mumbles are drawn over it, so you can't see it snap (cosmetic, not filed). The cave roof and drips are clearly
  decor.
- **Fairness:** generous margin (need 28, I got 32–34). No pixel timing is needed, and a 2nd basher is spare.

## Curve / cross-level notes
- Levels 7→8→9 each introduce one idea (miner, bomber, trap and release rate) with spare skills. All three were first-try
  solves for me and felt Breezy-to-Knotty. That suits a teaching block, but the tier label "Knotty – a few tangles"
  overstates L7.
- The only real pitfall found is PLAY-A1 (L8 hatch column). Skills behaved as RESEARCH §2 describes: miner 1:2,
  bomber crater ~14 px at floor rows, steel untouched, trap cooldown 34 ticks.
- Other findings: PLAY-A3 ("Show hint" label doesn't toggle, minor) and PLAY-A4 (missing space in a level-card
  description, minor). I also saw stale text in the assertive live region on the Levels screen ("Press R again to
  restart…"). That is a duplicate of **PLAY-B2**, so it is not filed again.
- Not verified: the audio or visual feedback of the clam bite, real-time (non-stepped) feel of timing, keyboard-only
  cursor aiming (`W A S D`), levels at other scales.
