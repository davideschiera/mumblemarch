# Tester brief (shared by every Phase 5 test agent)

Project: **Mumblemarch** — vanilla HTML/CSS/TypeScript remake of the 1991 game *Lemmings* with novel
levels. Critters are "mumbles"; **no user-facing text may contain "Lemm-"** (code identifiers may).
Root: `/Users/davideschiera/Projects/lemmings`. Spec: `docs/design/DESIGN.md` (+ `DESIGN-APPENDIX.md`),
`docs/research/RESEARCH.md` (§2 mechanics, §7 accessibility), `docs/architecture/ARCHITECTURE.md` (§14 `window.__game`).
Project acceptance criteria: `docs/PLAN.md` → "Acceptance criteria (whole project)".

## Your build (isolated production snapshot)
1. Check the port is free: `curl -s -o /dev/null -w '%{http_code}' http://localhost:<PORT>/` → `000`.
2. Start it in the background from the project root (Bash `run_in_background: true`):
   `node scripts/snapshot.mjs <PORT> <SCRATCH>/snap-<PORT>` where `<SCRATCH>` is
   `/private/tmp/claude-501/-Users-davideschiera-Projects-lemmings/58d5c9d4-6163-42e3-8eb9-452b3de6012f/scratchpad`.
   It builds the current `src/` once and serves it (other agents may edit `src/`; your snapshot does not change).
3. **At the end, stop it**: `pkill -f "snapshot.mjs <PORT>"`. Never touch other ports/servers.

## Browser rules (chrome-devtools MCP; load tools with ToolSearch `select:` in ONE call)
- Open your OWN page: `new_page({url: 'http://localhost:<PORT>/', isolatedContext: '<your-label>'})` and pass its
  `pageId` on every call. Close only pages you opened (at the end). Never `select_page`/close others' pages
  except `select_page` on your own page to bring it to front.
- Other agents share this Chrome. A background tab may be throttled/hidden (the game auto-pauses when hidden).
  Before any real-time check, verify `document.visibilityState === 'visible'` (bring your page to front with
  `select_page` if needed) — and prefer `__game.step(n)` to advance the simulation deterministically.
- Viewport: use `resize_page` to 1440×900 (or as your task says) at start.
- Keyboard: `press_key` sends real key input (e.g. `"Space"`, `"Shift+Period"`, `"ArrowLeft"`, `"Enter"`, `"4"`).
  Focus must be where a player's focus would be (the game canvas/stage during play).
- Mouse on the canvas: the MCP `click` only targets snapshot uids, so dispatch `PointerEvent`s via
  `evaluate_script` (`pointermove` → `pointerdown` → `pointerup`, `pointerType:'mouse'`, `isPrimary:true`,
  `button:0`, `buttons:1` on down / `0` on up, `bubbles:true`, correct `clientX/clientY`). Read
  `src/input/input-manager.ts` + `src/app/game/pointer.ts` first for the target element and the
  world→client mapping (canvas `#game-canvas` is 400×160 world px drawn at an integer scale, plus camera x).
  Buttons/DOM controls: use real `click` on snapshot uids where possible.
- `window.__game` (ARCHITECTURE §14): `loadLevel(id)` (real time paused, auto-advance off), `step(n)`,
  `snapshot()`, `ui()`, `events()`, `announcerLog()`, `audioState()`, `focus()`, `terrainAt(x,y)`,
  `setRealtime(bool)`, `levels()`, `navigate(route)`. Use it to inspect and to set up states; when a test is
  about an input path, perform that input for real. `playSolution` exists but only T5/T7 may use it.
- Console: `list_console_messages` must show 0 errors/warnings; record anything else.
- Screenshots → `docs/testing/evidence/<area>/<name>.png` (`take_screenshot` with `filePath`). Keep them few
  and meaningful; view one with Read only when you need to judge visuals.

## Recording
- Results: write `docs/testing/results/<area>.md`: a table `Case | Expected (spec ref) | Result PASS/FAIL/NOTE | Evidence`,
  then short notes. Be factual; say what you could NOT verify.
- Bugs: append each to `docs/testing/BUGS.md` using its template, with a shell append
  (`cat >> docs/testing/BUGS.md <<'EOF' … EOF`) — never rewrite the file or other entries. Use your id prefix.
  Check the spec before filing: behaviour the spec explicitly asks for is not a bug (file it as `note` if it
  seems bad for players). Don't file duplicates of bugs already in BUGS.md (add a line to your results instead).
- Progress: append one line when you start and one when you finish to `docs/PROGRESS.md`:
  `- 2026-09-26 HH:MM — [<your-label>] <message>` (use `date '+%H:%M'`).
- Do NOT edit `src/`, `tests/`, level data, or other docs. You are a tester, not a fixer.
- Budget: stay within ~120k tokens. Prefer `evaluate_script` returning compact JSON over large a11y snapshots;
  avoid dumping big objects. If you run out of budget, write what you have and list the untested cases.
- Final answer (to the test lead): ≤ 250 words — PASS/FAIL counts, bug ids with one-line titles and severities,
  untested items, and the results file path.
