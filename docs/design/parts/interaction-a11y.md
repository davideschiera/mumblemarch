> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

# Interaction, controls & accessibility (W2 draft → DESIGN.md §6–§7)

Worker W2 · 2026-09-26. Binding inputs: D1–D10, RESEARCH §2.2/§2.5–2.7/§4/§7, ARCHITECTURE §10–§13 (as updated), lead `parts/ui.md` §5.3 (HUD states, caption strip, filter chip, cursor sizes are taken from there unchanged). **MUST** = required for release; **SHOULD** = do it unless it costs the schedule; **stretch** = only after everything else. World px = simulation pixels; CSS px = at the default ×3 scale unless noted (1 world px = 3 CSS px).

---

## 1. Control map

### 1.1 Keyboard (all single keys are remappable; `Esc` is fixed so there is always a way out)

| Action | ActionId | Default | Behaviour |
|---|---|---|---|
| Choose skill 1–8 | `skill-climber` … `skill-digger` | `1`–`8` | Selects that skill. A skill with **0 left cannot be newly chosen**: selection unchanged, `ui-empty`, refusal text. If the *selected* skill runs out it stays selected (hatched, "0"); we never auto-switch, so a quick second click can never assign a skill the player didn't pick. |
| Previous / next skill | `skill-prev` / `skill-next` | `Q` / `E` | Moves to the previous/next skill **with a count > 0**, wrapping. If none has a count: `ui-empty` + "No skills left". |
| Previous / next mumble | `lemming-prev` / `lemming-next` | `Z`,`[` / `X`,`]` | Keyboard selection (§2.3). `Shift` = jump to the next **group** (the first mumble > 8 world px away or in a different state). |
| Assign | `assign` | `Space`, `Enter` | Gives the chosen skill to the **target**: the selected mumble, else the mumble under the cursor (§2.2). On a focused HUD button, Space/Enter keep their native "press" meaning instead. |
| Keyboard cursor | `cursor-left/right/up/down` | `A` `D` `W` `S` | Moves the free crosshair (§2.4). `Shift` = ×2 speed. |
| Scroll camera | `scroll-left` / `scroll-right` | `←` / `→` | Tap = 8 world px (`SCROLL_STEP`); hold (after 150 ms) = 200 world px/s; `Shift` = 600 px/s. Turns Follow off. On the focused toolbar/minimap the arrows belong to that widget (§2.6). |
| Jump to hatch / exit (SHOULD) | **NEW** `camera-hatch` / `camera-exit` | `Home` / `End` | Centre the camera on the first hatch / nearest exit; pressing again cycles hatches/exits. Owned by the toolbar/minimap when they have focus. |
| Centre on target | **NEW** `camera-center` | `C` | Centres the camera on the target mumble (200 ms ease; instant cut in reduced motion). None: "No mumble selected". |
| Follow target | **NEW** `camera-follow` | `L` | Toggles Follow (persisted, chip "Follow"). While on, the camera keeps the selected mumble inside the middle 50 % of the view. In cursor mode, `L` first locks the cursor pick as the selection. Any manual scroll (keys, edge, wheel, minimap, Home/End) turns Follow off. |
| Selection filter | **NEW** `filter-cycle` | `V` | Cycles the chip **All → Walkers → Facing ← → Facing → → All** (§3.4). Resets to All at every level start. |
| Release rate − / + | `release-rate-down` / `-up` | `−`,`Num −` / `=`,`Num +` | ±1 per press, `Shift` ±10. Hold: first step on press, repeat after **400 ms** every **60 ms** (Shift: every 150 ms). Clamped to [level minimum, 99]; at a limit: `ui-deny` + status "Release rate can't go below 50 here". |
| Pause / resume | `pause` | `P` | Toggles pause. Assigning, scrolling, selecting, frame-step, RR, Pop all all work while paused (§4.1). |
| Frame-step | `frame-step` | `.` | Paused: advance exactly **1 tick**; `Shift+.` = **17 ticks** (1 game second). Hold: repeat after 300 ms at 10 steps/s (a slow-motion crawl). While running: pauses (no step). |
| Fast-forward | `fast-forward` | `F` | Toggles ×3 simulation speed (§4.3). |
| Pop all | `nuke` | `N` | Two-step arm/confirm, no timing window (§4.5). |
| Restart | `restart` | `R` | Two-step arm/confirm like Pop all (§4.6). Immediate if nothing has happened yet or the level has ended. |
| Undo last assignment (SHOULD/stretch) | **NEW** `undo` | `U` | Removes the most recent `assign-skill` or `nuke` command and rebuilds the run (§4.7). Repeatable. Leaves the game paused. |
| Mute | `mute` | `M` | Toggles `Settings.muted` (persisted). The status line shows a speaker-off glyph + "Muted" while muted. |
| Briefing | **NEW** `briefing` | `B` | Opens the level briefing as a modal dialog (pauses; restores the previous pause state on close). |
| Help | `help` | `H`, `F1` | Opens How to play as a modal overlay (pauses). |
| Pause menu | `menu` | `Esc` (fixed) | Priority: close an open dialog (native) → disarm an armed Pop all/Restart → end a minimap drag → open the pause menu. |

**Shift rule (one rule, everywhere):** Shift makes the step bigger: RR ±10, frame-step 1 s, cycle by group, scroll ×3, cursor ×2, Shift-click = walkers only. Shift never changes *which* action runs. The InputManager already ignores Ctrl/Meta/Alt. `Shift+=` produces the `+` character on US layouts, so a user who presses "+" with Shift gets +10; the help text therefore labels the keys **`−` / `=`** ("Shift for ×10") and the HUD buttons are the fallback.

### 1.2 Key-conflict audit (MUST hold after any default change or remap)

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

### 1.3 Mouse & trackpad

| Input | Where | Behaviour |
|---|---|---|
| Hover | Playfield | Hover bracket around the pick (§3.1); status-line label; predictive refusal cue (dashed bracket + ✕) when the chosen skill would be refused. |
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

**Cursor styles:** the playfield uses the lead's CSS pixel crosshair (32/48/64 px from *Cursor size*); an arrow chevron is drawn at the active edge while edge-scrolling; minimap `pointer` (while dragging `grabbing`); HUD `default`. There is never a busy or wait cursor.

---

## 2. Keyboard-only play

### 2.1 The flow (what Help teaches, in this order)
1. **Choose a skill:** `1`–`8`, or `Q`/`E`. You hear `ui-select` and "Digger, 3 left" is announced.
2. **Pick a mumble:** `X`/`]` = next, `Z`/`[` = previous, left→right with wrap. The camera follows. Or move the cursor with `W A S D` onto a mumble.
3. **Assign:** `Space` or `Enter`. Press `P` first if you want time to think: assigning works while paused.
4. **Watch:** `L` follows the selected mumble, `C` re-centres on it, `.` steps while paused.

### 2.2 Selection model (one "target" for Space, C and L)
- `selectedId` is the **lock-on selection**, stored by mumble id. It is set by `Z/X/[ ]`, by a mouse click on a mumble, or by `L` in cursor mode. Every frame the bracket and the status label look the mumble up by id, so the selection **moves with it**.
- The **cursor pick** is the mumble picked (§3.2) at the shared cursor, which the mouse or `W A S D` moves.
- **Target** = the selected mumble if it is still selectable, else the cursor pick, else none. `W A S D` **clears** `selectedId` (you are now aiming freely). Mouse hover does not clear it.
- If the selected mumble walks out of view with Follow off, a small edge arrow with its label ("▸ Walker") sits at that view edge. `C` brings it back.

### 2.3 Cycling rules
- Order: selectable mumbles (not dying/exiting) passing the chip filter, sorted by `x`, then `id`, **at the moment of the key press** (`cycleLemming`).
- With a current selection, step ±1 in that order, wrapping. With **no** selection: `X` starts at the leftmost mumble **in view**, `Z` at the rightmost in view. If none is in view, start from the one nearest the view centre. After the selection died, continue from its last x (`fromX`).
- If the new selection is off-screen or within 40 world px of a view edge, the camera centres on it (200 ms ease, instant cut in reduced motion).
- Announce: `"{label}, facing {left|right}, {i} of {n}"` (§6.3 #4). With no candidates: `ui-deny` + "No mumbles to select" (or "No walkers to select" when filtered).

### 2.4 Keyboard cursor (`W A S D`)
- It starts at the target mumble, else at the view centre, and is drawn in-canvas (crosshair + 1 px dark halo, lead §5.3).
- Movement: a tap moves 2 world px. Held keys, after 150 ms, move at 60 world px/s, ramping linearly to 180 px/s over 600 ms. `Shift` doubles the speed. Diagonals are normalised.
- The cursor stays inside the view. Pushing against a side edge scrolls the camera at the cursor's speed.
- **Snap:** the pick uses the same rules and snap radius as the mouse (§3.3). When the cursor has been still for 150 ms over a pick, the pick is announced ("Builder · 4 bricks under cursor").
- `Space` in cursor mode acts exactly like a mouse press at the cursor.

### 2.5 When the selected mumble exits or dies
- The selection **clears at once** (a dying mumble accepts no skills, D7). We **never** move the selection to another mumble automatically, so a repeated `Space` can't hit someone the player didn't choose.
- The bracket plays a 250 ms "poof" (none in reduced motion). Announce "Your selected mumble got home" or "Your selected mumble {death}". `fromX` = its last x, so the next `X`/`Z` continues from there. Follow stays switched on but idles.

### 2.6 Focus rules
- **Game keys work** when focus is on the canvas, on `<body>`, or on any HUD control (toolbar, chips, minimap, ☰). They **don't work** inside `<dialog>`s or text fields (InputManager `isInDialog`/`isTextEntry`).
- **Native wins on controls:** `Space`/`Enter` activate the focused button, and arrows/Home/End/PageUp/PageDown belong to the toolbar (roving) and the minimap (slider) (`data-arrow-keys`).
- **Playfield actions pull focus back:** `lemming-*`, `cursor-*`, `camera-center`, `camera-follow` pressed while a HUD control has focus move focus to the canvas first, so the next `Space` assigns instead of re-pressing a button.
- **Mouse never parks focus on the HUD:** HUD buttons `preventDefault()` on `mousedown` (architecture §11). Test: after clicking Digger, `document.activeElement === canvas`.
- **Toolbar = ARIA toolbar pattern:** one Tab stop, roving `tabindex`. `←`/`→` move between RR−, RR+, 8 skills, Pause, Fast, Pop all and ☰ Menu, with wrap; `Home`/`End` go to the first/last item. Buttons with `aria-disabled` (0 left) stay focusable. When focus enters, it lands on the last-focused item (initially the selected skill). **Arrow conflict resolved:** arrows scroll the camera only when focus is on the canvas or the body. Inside the toolbar they move focus, which the toolbar signals with `data-arrow-keys`. Shift+Tab (or any playfield action above) returns to the canvas.
- **Tab order** (= DOM order = visual order, WCAG 2.4.3): ① playfield canvas → ② Filter chip → ③ Follow chip → ④ minimap → ⑤ toolbar (one stop; its last item is ☰ Menu, which `End` reaches and `Esc` duplicates). The status text is not focusable. Nothing overlaps the canvas, so focus is never obscured (2.4.11).
- **Screen changes:** the game screen focuses the **canvas** (so keys work at once). The results screen focuses the **primary button** (Next level / Try again); the headline + verdict are announced as the screen title. Every other screen focuses its `<h1>` or its primary button (router).
- **Dialogs** (pause menu, briefing, help, restart confirm in the pause menu): the least destructive button gets initial focus (Resume / Close / Cancel). Esc closes. Focus returns to the invoker, which is the canvas when a key opened the dialog. The game auto-pauses while any dialog is open and restores the previous pause state on close.

---

## 3. Mouse behaviour

### 3.1 Hover highlight & status label
- **Hover bracket:** four 3×3 world-px corner brackets around a 12×14 box on the pick (1 world px lines, cream with a plum outline). **Selected** = the same brackets 2 px thick + a ▼ pip above the tuft. **Would refuse** = dashed brackets + a small ✕. Shape differs in every case, never colour alone.
- **Status focus label** (lead's fixed slot): hover wins over selection. Selection shows as `Selected: {label}`.
  - `{label}` for walking/falling/jumping mumbles with permanent skills: `Climber + Floater` / `Climber` / `Floater`.
  - Otherwise: `Walker`, `Faller`, `Climber` (climbing, hoisting), `Floater`, `Blocker`, `Builder · {n} bricks`, `Builder · out of bricks` (shrugging), `Basher`, `Miner`, `Digger`, `Bomber · uh-oh`.
  - Lit fuse suffix: ` · pops in {5…1}`.
  - `×{N}` is appended when N ≥ 2, where N = selectable, filter-passing mumbles whose hit box contains the pointer. Examples: `Walker ×3`, `Climber + Floater`, `Builder · 4 bricks`.
  - Filtered out: `No walkers here`.
  - Predicted refusal: the status line appends `— can't dig: steel below` (refusal text, §5).

### 3.2 Picking priority (`pickLemmingAt(lemmings, p, skill, {filter, scale})`, MUST)
1. **Candidates** = selectable mumbles passing the filter (chip AND click modifier) whose `LEMMING_HITBOX` (x−6..x+6, y−11..y+1) contains `p`.
2. If there are none: the single nearest selectable, filter-passing mumble whose body centre `(x, y−5)` lies within the snap radius `R`. Ties go to the later released.
3. If a skill is chosen and at least one candidate would **accept** it (`checkAssign`), drop the ones that would refuse. This generalises the original builder/basher/miner/digger fallback (RESEARCH §2.2) to every skill.
4. Prefer **busy** mumbles (blocking, building, shrugging, bashing, mining, digging, ohno), as in the original.
5. Then the **last released** (highest id), as in the original.

### 3.3 Hit area & snap
- The hit box stays 13×13 world px = **39×39 CSS px at ×3 and 26×26 at ×2**, which is ≥ 24×24 (WCAG 2.5.8) at every allowed scale.
- **Snap radius R = ceil(24 CSS px ÷ scale)** world px (×2: 12, ×3: 8, ×4: 6), measured from the body centre. It applies only when no hit box contains the pointer.

### 3.4 Filters (replacing the "hold right button" of the original)
| Chip value | Passes | Chip label | Icon |
|---|---|---|---|
| All | every selectable mumble | `Pick: All` | four dots |
| Walkers | state `walking` or `jumping` (flags allowed) | `Pick: Walkers` | boot |
| Facing ← | `dir === −1` | `Pick: Facing ←` | left arrow |
| Facing → | `dir === +1` | `Pick: Facing →` | right arrow |

The filter applies to hover, click, cursor snap and cycling. Shift-click or right-held adds "walkers" for that single press. Changing the filter never drops an existing selection. Announce "Filter: walkers only. 5 in view."

---

## 4. Game-flow controls

### 4.1 Pause & assigning while paused (precise definition, MUST)
- While paused, an `assign-skill` (and `adjust-release-rate`, `nuke`) is **applied immediately** through the same code path the start of a tick uses, and recorded with `tick = session.tick` (the next tick to run). In the normal flow that command would apply at the start of that tick before anything moves, and nothing moves while paused, so this is deterministic and replays identically (lead N10, preferred variant).
- The core emits `skill-assigned` / `skill-rejected` from that call, and the controller passes them to the sinks **now**. Sound, count −1, the new pose (fuse, STOP paddle, first builder frame) and the announcement are all immediate.
- **Pending badge:** every mumble assigned during the current pause shows a 5×5 world-px "paused clock" pip beside its skill pop-icon. The status line shows `Ready: 2 jobs start when you resume`. Both disappear when the next tick runs (resume or frame-step). The badge carries no rule; it only tells the player that time is frozen.
- Several assignments in one pause are allowed and apply in press order. Each one is checked against the state *after* the earlier ones, so a second Climber on the same mumble is refused ("Already a climber"), while Climber then Floater stacks.
- While running, commands queue for the next tick (≤ 59 ms). Feedback comes from the events of that tick.
- The pause plate (lead): "⏸ Paused — you can still assign skills". The music ducks −10 dB with a 900 Hz low-pass. UI sounds keep playing.

### 4.2 Frame-step
Exactly 1 tick per press (`Shift` 17). It runs `session.step()` through the normal sink path, so sounds, events and announcements behave as in real time. Pending commands apply on that tick. The status line shows `Tick 312 (+1)` for 1.5 s.

### 4.3 Fast-forward
- ×3 (`FAST_FORWARD_SPEED`). The **clock runs in game time**: 17 ticks = 1 clock second, so real time runs 3× faster too. This is fair and deterministic.
- FF stays on across pause/resume and turns off at level end and on restart.
- Music tempo is unchanged.
- The optional *Game speed* setting (100 / 75 / 50 %) scales normal speed the same way and never costs clock time.

### 4.4 Release rate
- Steps are sent as `adjust-release-rate` commands, clamped by the core to [level minimum, 99]. The value well shows the rate and the interval `((99−RR)>>1)+4` ticks ÷ 17, one decimal ("1.6 s").
- At a limit the button gets `aria-disabled="true"` (still focusable). Pressing it plays `ui-deny` and shows the status "Release rate can't go below {min} here".
- The rate is announced 500 ms after the last step (coalesced).

### 4.5 "Pop all" (two-step, no timing window, MUST)
- **Idle → Armed:** a press of `N` or a click (on `click`, i.e. pointer-up) arms it. The button turns armed (lead §5.3: solid danger fill, "Press again", a dashed inner outline and a bubble). It plays `ui-arm` and makes an **assertive** announcement (§6.3 #22).
- **Armed → Confirmed:** the next `N` keydown (a *new* keydown; auto-repeat is ignored) or the next click on the button. Enqueues `nuke` (applied at once if paused). The button becomes "Popping…" with `aria-disabled`.
- **Armed → Idle:** `Esc`, or **any other** action or pointer press (a skill key, a playfield click, P…). It says "Pop all cancelled". There is **no timeout**: the armed state waits forever.

### 4.6 Restart
- `R` arms with the same pattern: status + bubble "Press R again to restart · Esc cancels", `ui-arm`, assertive announcement.
- The pause-menu **Restart level** uses the lead's in-dialog confirmation.
- Restart is **immediate** when no command has been issued and the tick is < 54, or when the level has ended.

### 4.7 Undo last assignment (SHOULD; stretch if time is short)
- `U` removes the last `assign-skill`/`nuke` from `CommandQueue.history()`, rebuilds a session from `(level, seed, relaxedTimer, remaining commands)`, and runs it headless to the current tick with the sinks muted. It then pauses.
- Budget: 300 s × 17 = 5100 ticks, target < 150 ms. Show "Rewinding…" if it takes longer than 100 ms.
- RR commands are kept. It plays `undo`, and announces "Undid Digger. Paused." Nothing to undo: `ui-deny`, "Nothing to undo".

### 4.8 Auto-pause
The game pauses (and says "Paused") when the tab is hidden, when the window loses focus (setting *Pause when the window loses focus*, default on), and while any dialog is open. It **never auto-resumes**, except that closing a dialog restores the state it had before.

---

## 5. Invalid-assignment feedback (a refused skill is **never** consumed)

Every refusal shows: a ✕ badge (7×7 world px, white ✕ on plum) over the mumble for 600 ms, the lead's skill-button refusal animation (3 shakes of ±3 px over 240 ms; in reduced motion, 2 blinks of the ✕ badge over 400 ms), the status text for 2.5 s, and the announcement (same words, polite, key `refusal`). **Exception:** `level-ended` refusals show status text only, with no sound and no announcement, because the result was already announced assertively (§6.3 #34) and later input must not talk over it.

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

## 6. Accessibility spec

### 6.1 RESEARCH §7 A1–A16 → requirements & testable acceptance criteria

| # | Requirement | Acceptance criterion (how to test) |
|---|---|---|
| A1 Targets | 13×13 world hit box + snap R (§3.3); HUD ≥ 44×44; nothing < 24×24 | E2E: every `button, [role=slider]` on game/menus has `getBoundingClientRect()` ≥ 44×44 (chips ≥ 32 high inside a 44 row count as ≥ 24 + spacing). Unit: a press 7 world px from a lone mumble's body centre at ×3 selects it; 9 px does not. |
| A2 Timing | Assign while paused, frame-step, FF, game speed, undo (SHOULD), instant restart | Unit: while paused, `assign` changes the skill count before any tick. `frame-step` advances `snapshot().tick` by exactly 1 (17 with Shift). E2E: every Tier-1 level is solvable with all assignments made while paused. |
| A3 Keyboard | Full keyboard play (§2) | **With the mouse unplugged, levels 1–3 can be completed using only the keys listed in Help.** Every control is reachable with Tab, and the focus ring is visible (cyan 3 px, ≥ 3:1) at every stop. |
| A4 Crowds | Filter chip, Shift-click, busy/accept priority, persistent selection | Unit: 10 overlapping walkers + 1 digger, Bomber chosen → the digger is picked. Filter "Walkers" → the digger is never picked. "Facing ←" cycles only left-facing mumbles. |
| A5 No holds | Every hold has a press alternative | Checklist: RR by single presses; filter is a toggle; minimap reachable by keys; scrolling by taps or minimap keys. No action *requires* a held key or drag. |
| A6 Colour | Pattern/shape cues (§6.5); clear physics view | In a greyscale screenshot of each theme, steel, earth, one-way, hazards, exit, the selected skill, a 0-left skill and a selected mumble are all distinguishable. Text ≥ 4.5:1, UI parts ≥ 3:1 (lead tokens). |
| A7 Sound-only | A visual twin for every SFX (§6.6) | With `muted: true`, every row of §6.6 is observed during an E2E run of a level that uses all skills. |
| A8 Status output | Live regions via `Announcer` (§6.3); real buttons with names/states | VoiceOver + Chrome: announces skill choice, selection, refusal, batches, time warnings and the result. The instrumented Announcer log shows **≤ 1 polite message per 1000 ms** and no identical text repeated within 3 s (except direct key presses). |
| A9 Audio control | master/sfx/voice/music + mute, persisted; nothing before a gesture | Before any user gesture `AudioContext` is not created (hook: `__game.audioState() === 'locked'`). `M` toggles and survives a reload. Each slider changes only its bus. |
| A10 Flash/motion | §6.4 reduced motion; §6.8 flash limits | With `prefers-reduced-motion: reduce`, `data-motion="reduce"` is set and no particle, shake or eased camera move occurs. A frame capture of a 20-mumble Pop all shows ≤ 3 burst sprites started per second and no full-screen luminance change. |
| A11 Time | Relaxed timer (§6.9) | With the relaxed timer on, the level keeps running past 0:00, overtime is shown, and the results show the relaxed note. The level still counts as completed. |
| A12 Destructive | Two-step Pop all / Restart, no timing window, pointer-up | Unit/E2E: one `N` never pops. Arm, wait 60 s, then `N` still confirms. Arm then `Esc` or `1` disarms. Press on the button, drag off, release: nothing happens. |
| A13 Remap | Settings → Controls (§7) | Every non-reserved action can be rebound. Reserved keys are refused with a message. Clashes offer Swap/Cancel. The binding survives a reload, and Help plus `aria-keyshortcuts` update (both generated). |
| A14 Objective | Status "Saved 3 ▰▱ need 8"; `B` briefing; fall ruler; hints | `B` opens the briefing at any time and returns focus to the canvas on close. The status line always shows saved/needed. The fall ruler (§7) shows safe (≤ 63 px) vs deadly (≥ 64 px) with an icon + line style. |
| A15 Autosave | Progress saved at every level end; "Unlock all levels" | After a win, a reload shows the level as completed. With *Unlock all levels* on, every card is enabled. |
| A16 Tutorials | One-verb Tier-1 levels; level 1's hint names the keys | Level 1's briefing hint includes "1–8, X, Space" (keyboard) and "click a mumble" (mouse). |

### 6.2 ARIA & semantics (MUST)

| Element | Markup |
|---|---|
| Playfield `<canvas>` | `tabindex="0"`, `role="application"`, `aria-roledescription="playfield"`, `aria-label="Playfield: {level title}"`, `aria-describedby="stage-help"`. The help text reads: "Choose a skill with 1 to 8. Pick a mumble with X and Z, or move the cursor with W A S D. Press Space to assign. P pauses, H opens help." |
| Toolbar | `role="toolbar" aria-label="Skills and controls"`, `data-arrow-keys`, roving tabindex |
| Skill button | `<button aria-pressed>`; `aria-label="Digger, 3 left"`; at 0: `aria-disabled="true"` + `aria-label="Digger, none left"`; `aria-keyshortcuts="8"` (generated) |
| RR group | `role="group" aria-label="Release rate"`; buttons `aria-label="Slower release"` / `"Faster release"`. Value well: `aria-hidden` on the digits, with a visually hidden `<span>` "Release rate 50, one every 1.6 seconds" linked via `aria-describedby` on both buttons |
| Pause / Fast | `aria-pressed`; labels "Pause" / "Fast forward"; `aria-keyshortcuts` |
| Pop all | `aria-label="Pop all"`. Armed: `aria-label="Confirm pop all"` + `aria-describedby` → the bubble text. Confirmed: `aria-disabled="true"` |
| Filter / Follow chips | `<button>`; filter `aria-label="Selection filter: walkers only"` (cycles on press); follow `aria-pressed` + `aria-label="Follow selected mumble"` |
| Status line | `<p>` plain text, **not** a live region (D9); the meter glyphs are `aria-hidden`, with the text "Saved 3, need 8" |
| Minimap | `<canvas tabindex="0" role="slider" data-arrow-keys aria-label="Level map" aria-valuemin="0" aria-valuemax="{w−400}" aria-valuenow="{camera.x}" aria-valuetext="Showing {x0} to {x1} of {w}. {n} mumbles in view.">`; `←/→` ±16 world px (hold repeats), `PageUp/PageDown` ±400, `Home/End` start/end |
| Dialogs | native `<dialog>` + `aria-labelledby` (`<h2>`) + `aria-describedby` |
| Level select | `<h2>` per tier; `<ol>` of `<button>`s; name "Level 3: {title}. Breezy. Completed, best 14 of 20." Locked: `aria-disabled="true"` + "Locked. Finish level 2 to unlock." Grid roving per the lead |
| Caption strip | `aria-hidden="true"` (the Announcer covers speech) |

### 6.3 Live-region announcement catalogue (exact templates; `{Skill}` capitalised, `{skill}` lower case)

| # | Event / trigger | Message template | Pol. | Level | Throttle / coalesce key |
|---|---|---|---|---|---|
| 1 | Game screen ready | `{title}. Save {required} of {total}. Skills: {Skill} {n}, …. {Skill} chosen. Press H for help.` | polite | essential | once |
| 2 | Skill chosen | `{Skill}, {n} left` | polite | essential | `skill` |
| 3 | 0-left skill pressed | `No {skill plural} left` | polite | essential | `skill` |
| 4 | Keyboard/click selection | `{label}, facing {left\|right}, {i} of {n}` + `, {filter}` if not All | polite | essential | `selection` |
| 5 | Cursor settles 150 ms on a pick | `{label} under cursor` | polite | essential | `selection` |
| 6 | Assignment accepted (keyboard) | `{Skill} assigned` (paused: `{Skill} assigned. Starts when you resume.`) | polite | essential (mouse: all) | `assign` |
| 7 | Refusal | the §5 text | polite | essential | `refusal` |
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
| 35 | Results screen | router title = `{headline}. {verdict}` (audio-copy §2.5) | polite | essential | — |

**Throttle rules (Announcer, MUST):**
1. Messages said within 50 ms join with ". " (architecture).
2. Polite messages go through a queue with **≥ 1000 ms between messages**. A new message whose key is already queued **replaces** it in place. The queue holds at most 4 messages; on overflow the oldest `all`-level one is dropped first.
3. The same text within 3 s is dropped unless a direct key/click caused it.
4. Assertive messages speak at once, remove any queued polite message with the same key, and are limited to 1 per 1000 ms.
5. Level `off` = nothing; `essential` = rows marked essential; `all` = every row.

### 6.4 Reduced motion (`motion: 'system'` follows `prefers-reduced-motion`; `'reduce'` / `'full'` override)

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
| UI transitions, press translate, count-badge pop, skill shake | on | 0 ms; the shake becomes 2 ✕ blinks (lead) |
| Pop-all button pulse, 30 s timer blink | 1 Hz | static |
| Title-screen marching strip | animated | static frame |
| Kept in both | walk cycles, job animations, bomber digits, hatch opening (gameplay information) | — |

### 6.5 Non-colour cues (colour-blind safe, MUST)
- **Terrain:** steel = rivets; one-way = chevrons; hazards = waves, bubbles or flame tips + an icon at each end; traps = an idle tell + hazard stripes on the base; exit = door silhouette + beacon.
- **Mumbles:** selected = thick bracket + ▼ pip; hover = thin bracket; "would refuse" = dashed + ✕; pending = clock pip; bomber = digits; builder low = pips (hollow when ≤ 3) + number.
- **HUD:** selected skill = yellow border **+ notch + bold**; 0 left = hatch + "0"; armed = dashed outline + text; paused = plate text; FF = "×3" text; time low = ⚠ + plate; goal met = ✓ + "goal met"; muted = speaker-off glyph + "Muted".
- **Feedback:** saved = "+1" with ✓; lost = "−1" with ✕.
- **Clear physics view** (`highContrast`): flat classes, each with its own pattern and ≥ 3:1 against the others.

### 6.6 Visual equivalent for every sound (MUST; captions per §6.7)

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

### 6.7 Captions (bark strip)
- The strip is DOM, sits bottom-left inside the canvas box (inset 8 px), and is `aria-hidden`.
- It shows at most **2 lines**, 16 px, each for **2.5 s**. The newest line is at the bottom, with a 150 ms fade (none in reduced motion). Text sits on a sunken plate at 90 % opacity (≥ 4.5:1).
- The same text within 1 s coalesces into one line: "Wheee! ×3".
- The strip moves to the top-left while the cursor or the selected mumble is inside its box.
- Setting *Captions*:
  - `barks` (default): voice chirps only.
  - `all`: adds the bracketed sound captions ("[pop!]", "[tink]").
  - `off`.

### 6.8 Targets, flashing, pause
- **Targets:** HUD buttons 44–88 px high (lead). Chips 32 px high in a 44 px row with ≥ 8 px spacing. The minimap is ≥ 160×40. Nothing is < 24×24.
- **Flashing (MUST):**
  - never a full-screen or background colour change, including during Pop all;
  - a burst sprite is ≤ 16×16 world px;
  - **at most 3 bursts may start per rolling second in the view** (extra explosions draw only crater + confetti);
  - no element blinks faster than 1 Hz.
- **Pause** is always available (P, button, Esc menu), including during the start timeline and during Pop all.

### 6.9 Relaxed timer (`relaxedTimer`)
- The clock counts down as normal. At 0:00 it switches to **overtime**: `Time +0:12 · relaxed`, neutral colour, hourglass-off glyph. The level does **not** end (`SessionOptions.relaxedTimer`), and message #27 is announced once.
- The results show the relaxed note (audio-copy §2.5). The level counts as **completed** if saved ≥ required. `LevelProgress.inTime` is set only when completed within the clock with the timer on standard; the level card shows a small clock badge for it.
- Toggling mid-level applies from the next restart (the flag is part of the replay).

### 6.10 Help / controls screen (and the H overlay)
1. **Goal:** "Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs."
2. **Quick start:** keyboard (the 4 steps of §2.1) and mouse ("pick a skill below, click a mumble") side by side.
3. **Skills:** 8 cards: icon, name, key, one line (strings `SKILL_DESCRIPTIONS`).
4. **Controls:** tables *generated from the live bindings* and grouped: Skills · Choosing mumbles · Camera · Game flow · Sound & info. Use `ACTION_LABELS`, never raw ids. The mouse table is static (§1.3).
5. **Assists:** pause-to-assign, filter chip, Follow, fall ruler, relaxed timer, game speed, with links to Settings.
6. **Screen-reader tips:** "The playfield is an application: keys go straight to the game. If a key doesn't work, press NVDA+Space or use the toolbar. Announcements can be set to Off, Essential or All."

---

## 7. Settings (all in `SaveData.settings`, `localStorage['mumblemarch.save']`; apply at once, persist on change)

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

## 8. Notes for architecture/dev

| # | Where | Change | Why |
|---|---|---|---|
| I1 | `input/actions.ts`, `bindings.ts`, `ui/strings.ts ACTION_LABELS` | Add `camera-center` (`KeyC`), `camera-follow` (`KeyL`), `filter-cycle` (`KeyV`), `briefing` (`KeyB`), `undo` (`KeyU`, SHOULD), `camera-hatch` (`Home`), `camera-exit` (`End`). Add `frame-step` to `HOLDABLE_ACTIONS`. `Escape` is not rebindable. Add a `RESERVED_CODES` set for the rebinding UI. | §1 |
| I2 | `InputManager.onKeyDown` | Pass `shiftKey` through to handlers (Shift rule). Add `Home`/`End`/`PageUp`/`PageDown` to the keys owned by `data-arrow-keys` widgets. | §1.1, §2.6 |
| I3 | `core/session.ts` | `checkAssign(id, skill): SkillRejectReason \| null` (pure, aware of pending same-tick commands). `applyNow(command)` for paused input, using the start-of-tick path and recording `tick = session.tick`. | §3.2, §4.1 |
| I4 | `core/types.ts` `skill-rejected` | Optional `detail` for `not-applicable`: `'already-climber' \| 'already-floater' \| 'fuse-lit' \| 'airborne' \| 'is-blocker' \| 'same-job' \| 'busy-dying'`. Also `ahead \| below` for `steel`. | §5 texts |
| I5 | `core/picking.ts` | `pickLemmingAt(lemmings, p, skill, { filter, snapRadius, accepts })` implementing §3.2 steps 1–5. `cycleLemming` start rule "in view" (§2.3) + a `groupStep` option. | §3 |
| I6 | `game-controller.ts` | Replace `confirmDialog` for `nuke` with the arm/confirm state (§4.5). Do the same for `R` (§4.6). Any other action disarms. | A12, lead §5.3 |
| I7 | `ui/announcer.ts` | Keyed polite queue (≥ 1 s gap, replace-by-key, max 4, 3 s de-dup, assertive 1/s) on top of the 50 ms join. `say(msg, {key, politeness, level, userInitiated})`. | §6.3 |
| I8 | `persistence/schema.ts` | Add the NEW settings of §7 (bump `SAVE_VERSION` to 2 + migration). `LevelProgress.inTime: boolean`. `musicVolume` default 0.35. | §6.9, §7 |
| I9 | `LevelOutcome` | `overtimeTicks: number` (0 unless relaxed). The results copy needs it. | §6.9 |
| I10 | `ui/strings.ts describeLemming` | Use `Climber + Floater` (lead's slot) instead of "Athlete". Add the `Builder · n bricks` / fuse suffixes of §3.1. | §3.1 |
| I11 | Test hook | `__game.audioState()`, `__game.announcerLog()` (last 50 `{t, text, politeness}`), `__game.focus()` (active element id) for the A3/A8/A9 checks. | §6.1 |
| I12 | `index.html` | Canvas `role="application"` + `aria-roledescription="playfield"` (replaces `role="img"`). The stage help text is the one in §6.2. | §6.2 |
