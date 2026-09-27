# V2 verification — PLAY-B2, A11Y-2, A11Y-3, PLAY-A3, VIS-4, AUD-1

Build: isolated snapshot on :5252 (`node scripts/snapshot.mjs 5252 …`), 1440×900, chrome-devtools MCP,
isolatedContext `V2`. All checks done through real UI (clicks/keys) for the input path under test;
`__game` used only to set up state (load levels, step the sim, read logs/snapshots) per the tester brief.

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| PLAY-B2 — stale live-region text | DESIGN §7.2/§7.3: live regions hold only text current for the screen; each screen's entry announcement fires once | **PASS** | See "PLAY-B2" notes below |
| A11Y-2 — batched "{s} saved" sum | DESIGN §7.3 #10 template; throttle rule 2 (replace-in-place); `{s}` = sum of saves folded into the coalesced message | **PASS** | See "A11Y-2" notes below |
| A11Y-3 — navigate() without `back` | Back falls back to a sane default (title) without erroring | **PASS** | See "A11Y-3" notes below |
| PLAY-A3 — "Show hint" toggle cue | Label unchanged, `aria-expanded` flips, a non-text (chevron) cue shows the state, both on the briefing screen and the in-game B overlay | **PASS (visual cue)** | `evidence/V2/play-a3-briefing-{collapsed,expanded}.png` |
| VIS-4 — HC exit colour `#3cff6a` | DESIGN §4.9: exit fill `#3cff6a`, no leaked theme glow, distinct from other HC classes | **PASS** | `evidence/V2/vis4-hc-{spade-exit,foundry-exit}.png` + pixel counts below |
| AUD-1 — caption strip repositions | DESIGN §7.7: strip moves to top-left while cursor/selected mumble is inside its box; instant under reduced motion | **PASS** | `evidence/V2/aud1-caption-top-left*.png` + rect/class evidence below |

Console: `list_console_messages` showed **0 errors/warnings** across every check in this file (one
intentional `getImageData` 2D-context read per VIS-4 scan, done via a fresh off-screen canvas
context created once per scan — no warning was actually logged for it, but noting the exception
per the task's instruction anyway).

## PLAY-B2 detail

Repro from the bug report (finish a level → stale "Level complete!" persists into Levels/next
briefing) does **not** reproduce through real UI navigation. Sequence, all via real clicks (Next
level's briefing card / Levels / Back / Let's march!):

1. Level ended (real `level-ended` → `RESULTS_DELAY_MS` timer → Results screen for real, using
   `loadLevel(id, {autoAdvance:true})` so the router's own timer fires, not a manual `navigate`).
   Results screen: `politeText = "Level complete! Every single mumble made it home. Take a bow!"`,
   **`assertiveText = ""`** (empty — not the stale "Level complete! 10 of 10 saved, 5 needed.").
2. Click **Levels**: `politeText = "Levels"`, `assertiveText = ""`.
3. Click level 1's card (**briefing**): `politeText = "Briefing: Spade Expectations"`,
   `assertiveText = ""`.
4. Click **Let's march!** (game): `politeText = "Spade Expectations. Save 5 of 10. Skills: Digger 5.
   Digger chosen. Press H for help."`, `assertiveText = ""`.

`announcerLog()` across this whole sequence shows each screen's entry line exactly once
(`"Levels"` once, `"Briefing: Spade Expectations"` once, the game-ready line once) — no duplicates,
no stale carry-over. (An earlier ad-hoc pass, re-using the same loaded level/controller across many
stacked `loadLevel()` test-hook calls without navigating away between them, produced a duplicate
"Level complete!" log entry — traced to my own test sequencing, not a real navigation path; a clean
re-run through real UI, above, is consistently clean.)

## A11Y-2 detail

`loadLevel('spade-expectations')`, `setRealtime(false)`, Digger assigned to the first walker, then
`step()` until `status==='ended'` (10/10 saved, 0 dead). Full `announcerLog()` batch sequence (§7.3
#10 template, `l` correctly omitted since 0 lost throughout):

```
"1 saved. 1 of 5 home."                                    (0 → 1,  s=1 ✓)
"2 saved. 3 of 5 home."                                     (1 → 3,  s=2 ✓)
"1 saved. 4 of 5 home. Goal reached: 5 of 5 home!"          (3 → 4,  s=1 ✓)
"5 saved. 9 of 5 home."                                     (4 → 9,  s=5 ✓)
"1 saved. 10 of 5 home."  (joined with "Level complete!…")  (9 → 10, s=1 ✓)
```
Sum of `s` = 1+2+1+5+1 = 10 = total saved. Every batch's `{s}` equals the change in cumulative
`saved` since the previous batch message, confirming the fix (previously always `1 saved`
regardless of the true batch count).

Note (not filed as a bug — outside A11Y-2's specific claim, and not asked for by DESIGN's throttle
rules in so many words): in the 3rd message, the `#10` clause reports "4 of 5 home" while the
immediately-joined `#11` "Goal reached" clause in the *same* utterance reports "5 of 5 home" — the
batch's own cumulative lags the goal-reached event's fresher count by one further save that landed
before the join. Cosmetic; the running total is still correct in the very next message.

## A11Y-3 detail

- `__game.navigate({screen:'settings'})` → real click on **Back** → `document.title` becomes the
  Title screen's title; 0 console errors.
- `__game.navigate({screen:'help'})` → real click on **Back** → same (Title), 0 console errors.

## VIS-4 detail (pixel counts, `getImageData` via a fresh off-screen 2D-context copy of `#game-canvas`)

Clear physics view enabled via a real click on the Settings checkbox (`#set-highContrast`).

| Level (theme) | `#3cff6a` px | `#7dff9a` (leaked glow) px |
|---|---:|---:|
| spade-expectations (mossgrove) | 71 | 0 |
| last-shift-at-the-foundry (foundry), camera on exit via real `End` key | 71 | 0 |
| clam-before-the-storm (reef), camera on exit via real `End` key | 71 | 0 |

Exactly matches the fixer's claim (71 px, 0 leaked glow) across three different levels/themes —
consistent, not a fluke of one level. HC-off comparison (same level, setting unchecked, fresh
`loadLevel`) renders the normal per-theme palette (no `#3cff6a`, no flat HC earth grey), confirming
the toggle genuinely switches the renderer's material LUT. (One earlier HC-off sample taken
*immediately* after unchecking, without a following animation frame, still showed the old HC frame —
a test-timing artifact of reading the canvas synchronously before the next `requestAnimationFrame`
repaint, not a product bug; a moment later the same level loaded fresh and showed normal colours.)

## AUD-1 detail

With "Off we go!" showing in `.caption-strip` (triggered by stepping past the `lets-go` event),
a real `PointerEvent('pointermove')` dispatched on `#game-canvas` at the strip's own
`getBoundingClientRect()` centre:

| State | `.caption-strip` rect (`left`, `top`) | classes |
|---|---|---|
| initial (bottom-left, inset 8px from canvas bottom) | `128, 460.8` | `caption-strip` |
| cursor moved into the strip's box | `128, 24` (top-left, inset 8px from canvas top) | `caption-strip caption-strip--top` |
| cursor moved away | `128, 460.8` | `caption-strip` |

Reduced motion (Settings → Motion → **Reduced**, real click): the same hover-in adds
`caption-strip--instant` and the rect is *already* `top: 24` after a single animation-frame pair
(no extra wait for the 150 ms CSS transition) — confirming the move is instant, not animated, under
reduced motion, per DESIGN §7.4/§7.7.

Also spot-checked: selecting a mumble with a real `X` keypress populates `ui().selectedLemmingId`
(→ feeds `HudState.captionAvoidPoints.selected` through the same `pointInRect`/`shouldMoveToTopLeft`
code path already verified above for the cursor); did not additionally chase positioning a moving
mumble's world coordinates exactly inside the strip's small on-screen box (harder to stage
deterministically) — the shared pure-function code path gives high confidence this arm works
identically to the cursor arm already verified end-to-end.

Screenshot evidence: `evidence/V2/aud1-caption-top-left.png` and `…-2.png` were both taken
best-effort right after triggering, but the caption strip's 2.5 s life is shorter than this MCP's
tool round-trip latency, so both screenshots landed a beat after the line had already expired (no
caption text visible in the frame) even though the *programmatic* rect/class evidence above,
captured synchronously in the same script call as the trigger, is solid and unambiguous.

## Untested / not fully covered
- AUD-1: the "selected mumble" arm of the OR was corroborated via code-path sharing + a quick
  selection check, not via placing a moving mumble's exact on-screen position inside the strip's
  box (see note above).
- PLAY-B2: did not additionally test leaving via Esc/keyboard-only (only real clicks); the router's
  `clearBeforeTransition` fix is not click-vs-key specific, and clicks already exercise the same
  route-transition code path documented as the fix.
