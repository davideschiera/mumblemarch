# T1b — Game-flow controls, camera, results, persistence

Build: isolated snapshot on port 5212. Levels used: `spade-expectations` (L1), `gently-down-the-dome`
(L2), `last-shift-at-the-foundry` (widest level, for camera clamp tests).

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| 1. Release rate | DESIGN §5.3, §6.1.1, §6.4.4 | PASS | single press ±1; hold-to-repeat (pointer: 12 steps/1000 ms, matches 400 ms delay + 60 ms repeat); Shift key = ±10 (99→89 via `Shift+Minus`); clamps at level min (50) and 99; `aria-disabled` at limits, still focusable/clickable; deny plays `ui-deny` + status-line text `"✕ Release rate can't go below/above …"`; interval text correct (`((99−RR)>>1)+4`÷17) |
| 2. Pause | DESIGN §6.4.1, §6.4.2 | PASS | `P` key + button; tick constant over 1 s while paused (Δ=0), 17 ticks/s while running; pause plate "⏸ Paused — you can still assign skills" visible; `assignSkill` while paused applies immediately (tick unchanged, count −1); frame-step `.`=+1 tick, `Shift+.`=+17 ticks |
| 3. Fast-forward | DESIGN §6.4.3 | PASS | `F` key; 51 ticks/1000 ms = 3.0× the 17 ticks/s baseline; `aria-pressed="true"`; `×3` pill shown (screenshot); Game-speed setting (75%) also verified: 12 ticks/1000 ms ≈ 0.75× | `evidence/T1b/fast-forward.png` |
| 4. Pop all | DESIGN §6.4.5 | PASS | arm (N/click) → bubble "Press Pop all again (or N) to pop every mumble · Esc cancels", assertive announce, `armed:"pop-all"`; Esc cancels → `armed:null`, announced "Pop all cancelled"; confirm (2nd N) → `nuking:true`, spawning stops, one fuse/tick, level ends `all-resolved`, won:false | `evidence/T1b/pop-all-armed.png` |
| 5. Restart | DESIGN §6.4.6, §5.4 | PASS | immediate restart when ended or tick<54 (state fully reset: RR back to level default, skill counts, dead/saved/out reset); armed R/R two-step mid-level with bubble "Press R again to restart · Esc cancels"; pause-menu Restart shows in-dialog confirm "Restart? Your mumbles go back to the hatch." with focus on Cancel, confirms correctly |
| 6. Undo | DESIGN §6.4.7 | PASS | undoes last `assign-skill` (Digger count 4→5, lemming state digging→walking), pauses, announces "Undid Digger. Paused."; repeated undo with nothing to undo → `ui-deny`/"Nothing to undo" |
| 7. Camera | DESIGN §6.1.1, §6.1.3, §6.2 | PASS | tap ArrowRight = 8 world px; hold (after 150 ms) ≈200 px/s (measured 120/700 ms); Shift-hold ≈600 px/s; Home/End jump to hatch/exit; clamps exactly at level bounds (0 / 1200 on the 1200-wide level); minimap click centers, drag follows pointer continuously, minimap arrow keys move the slider (16 px/step) without scrolling the canvas (focus-owns-keys rule holds); wheel scrolls proportionally; edge-zone hover (5 px from edge) scrolls after ~120 ms dwell, ramping (measured ≈194 px over 900 ms, matches 150→345 px/s ramp) |
| 8. Win/lose/time-up/relaxed, results screen | DESIGN §9.5, §7.9, RESEARCH §2.7 | PASS | **Real UI flow** (title→Levels→Briefing→"Let's march!", auto-advance on): lose run → headline "Not quite this time", score "You saved 0 of 12 · needed 6", verdict "Nobody made it home this time. Fancy another go?", buttons Try again(primary,focused)/Levels/Show hint, assertive announce matches. Retry with correct Floater assignment → win, headline "Level complete!", "New best!" badge, verdict "Exactly enough. Phew!" (S=R rule), "Beat the clock ✓", Next level(primary,focused) → opens L3 briefing (unlock confirmed). Time-up (via `step` to tick 5100, deterministic): `outcome.reason:"time-up"`, won:false, saved:0, out-lemmings counted as lost (not dead) — matches RESEARCH §2.7. Relaxed timer: enabled via Settings, level does not end at 0:00, `status:"running"`, `overtimeTicks` increments, status line shows "Time +0:01 · relaxed" with the low-time ⚠ glyph correctly `hidden` (verified via computed style, not just textContent) | `evidence/T1b/results-failed.png`, `evidence/T1b/results-won.png` |
| 9. Persistence | DESIGN §7.11, RESEARCH, `src/persistence/*` | PASS | After real wins, reload: `mumblemarch.save` (v2) has L1 `completed:true bestSaved:10 inTime:true`, L2 same (bestSaved:6); title "Continue — 3 · Bridge Over Troubled Toffee" (L3 correctly unlocked); Level-select shows L1 "Everyone home"/perfect badge, L2 completed, L3+ correctly locked/unlocked. Best score not lowered: replayed L1 with an immediate nuke (0 saved) → `bestSaved` stayed 10, `attempts` incremented. Settings persistence: toggled `relaxedTimer` → survives reload. Key rebinding: rebound `skill-climber` key1 to `Digit9` via Settings → Controls → `bindings:{"skill-climber":["Digit9"]}` persists across reload. Corrupt save (`localStorage['mumblemarch.save']='{bad'`) → reload: no crash, 0 console messages, defaults applied (title button reads "Start", i.e. fresh state). Missing save (`removeItem`) → reload: no crash, no console output |
| 10. Console | — | PASS | `list_console_messages` (including preserved, across every reload/navigation in this session) returned **0 messages** of any kind throughout the whole run |

## Bugs filed
None. No FLOW-n bugs found — every case above matched the spec text and DESIGN/RESEARCH references exactly,
including several precise real-time timing measurements (hold-repeat rates, FF 3×, edge-scroll ramp, game-speed
scaling) that were within a few percent of the specified constants.

## Notes / things double-checked that turned out NOT to be bugs
- The RR-limit deny ("Release rate can't go below/above…") shows only in the status-line focus label, not the
  `.overlay-toast` plate, and is not spoken by the Announcer. This matches DESIGN §6.4.4 literally ("shows the
  status", no announcement requirement) — the Toast/Announcer combo in §6.5 is specific to core `skill-rejected`
  events, confirmed by reading `src/app/game/skills.ts` vs `src/app/game/release-rate.ts`. Not filed as a bug.
- `textContent` on the status-line time/goal elements includes hidden children (`hidden` attribute); a naive
  read looked like the ⚠ warning glyph and the "goal met" ✓ were shown at the wrong times. Checking
  `computed style`/`hidden` directly showed both are correctly `hidden` outside their trigger conditions.
- Disabled RR buttons show `tabindex="-1"` — this is the documented roving-tabindex toolbar pattern (§6.2.6),
  not a focusability bug; only the currently-active toolbar item has `tabindex="0"` at any time.

## Untested / lower-confidence items (budget)
- Not all 20 individual `Settings` fields were round-tripped through reload (only `relaxedTimer`, `gameSpeed`,
  and one key rebinding were spot-checked); the persistence code (`src/persistence/storage.ts` sanitizers) was
  also read directly and looks correct field-by-field.
- Results-screen "Show hint" disclosure was confirmed present (button, `expandable`) but not expanded/verified.
- Did not exercise every verdict-copy rule (§9.5 rows 1,3,4,7,8) live — only rows 2 (S=0) and 6 (S=R) were hit
  naturally; the copy-selection code was not separately code-reviewed beyond the headline/reason mapping.
- Middle-drag camera pan (§6.1.3, SHOULD) not tested.
- Did not verify the pause-menu's "Show briefing"/"How to play"/"Settings"/"Quit to levels" buttons individually
  (only Resume and Restart were exercised) — out of this area's core scope but noted for completeness.
