> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

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
