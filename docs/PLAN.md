# Lemmings (vanilla HTML/CSS/TypeScript) — Master Plan

> **Resuming?** Read this file, then `docs/PROGRESS.md` (append-only log). Continue from the
> first phase whose status is not `DONE`. Each phase lead writes its own tracking file
> (listed below) with a task checklist — resume from the first unchecked task there.

## Goal
Build a browser version of the classic game *Lemmings* (DMA Design, 1991) using **only vanilla
HTML, CSS and TypeScript** (no UI/game frameworks, no runtime dependencies). Levels and
scenarios are **novel** (no copied levels, graphics or audio from the original), but the
**spirit of the original** is preserved. Usability + accessibility best practices apply to
interactions and sound. Desktop only (mobile not required).

The finished game must be tested in a real browser by the agents themselves, and proven with
**3 representative screenshots** saved in `docs/screenshots/`.

## Hard constraints
- Runtime: vanilla DOM + Canvas 2D + Web Audio. **Zero runtime dependencies.**
- Dev dependencies allowed only for build/type-check/test (keep minimal: e.g. `typescript`, a bundler/dev-server such as `esbuild` if justified).
- No original copyrighted assets (sprites, music, sfx, level maps). All art is procedurally
  drawn or authored as pixel data in code; all audio is synthesized with Web Audio.
- Reference screenshots of the original may be stored locally in `docs/research/reference/`
  **for comparison only** — never shipped in the game.
- Deterministic simulation (fixed timestep, seedable) so logic is unit-testable headlessly.
- Must run with a single command (e.g. `npm run dev`) and be testable via the Chrome DevTools MCP.

## Environment (verified in setup, 2026-09-26)
- macOS, Node v22.19.0 (supports running `.ts` via type stripping and `node --test`), npm 10.9.3
- npm registry reachable: typescript 7.0.2, esbuild 0.28.2, vite 8.3.1 (vite NOT to be used — keep vanilla)
- Python 3 available (no PIL). git available (repo not initialised; do not commit unless the user asks).
- Browser automation: `mcp__chrome-devtools__*` tools work (new_page, navigate_page, take_screenshot,
  evaluate_script, press_key, click, list_console_messages...). **Concurrency rule:** every agent
  that uses the browser must open its OWN page via `new_page` and pass that `pageId` on every call;
  never close pages you did not open.
- Web: `WebSearch` / `WebFetch` available; binary downloads via `curl` in Bash.

## Directory layout
```
docs/
  PLAN.md                 ← this file (master plan, phase status)
  PROGRESS.md             ← append-only log (who did what, when)
  research/               ← Phase 1 output: RESEARCH.md, reference/ (original-game screenshots)
  design/                 ← Phase 2 output: DESIGN.md (+ level concepts)
  architecture/           ← Phase 3 output: ARCHITECTURE.md
  development/            ← Phase 4 tracking: DEV_TASKS.md
  testing/                ← Phase 5 output: TEST_PLAN.md, TEST_REPORT.md, compare/
  screenshots/            ← Final proof: 3 representative screenshots
src/ , public/ , tests/   ← code (layout defined by Phase 3)
```

## Phases
Each phase is run by a **phase lead** agent that may coordinate worker sub-agents.
**Every phase starts with a SETUP step**: quickly check the tools needed are available and how
to use them, and confirm the target/scope (inputs from previous phases exist). Leads should work
autonomously; only escalate genuinely blocking questions.

| # | Phase | Status | Depends on | Tracking / output |
|---|-------|--------|------------|-------------------|
| 1 | Research | DONE | — | `docs/research/RESEARCH.md`, `docs/research/reference/` |
| 2 | Visual & interaction design | DONE | 1 | `docs/design/DESIGN.md` |
| 3 | Application architecture | DONE | — (reads 1 if available) | `docs/architecture/ARCHITECTURE.md` + scaffold |
| 4 | Development | DONE | 2, 3 | `docs/development/DEV_TASKS.md` |
| 5 | Testing (+ final screenshots) | DONE | 4 | `docs/testing/TEST_REPORT.md`, `docs/screenshots/` |

Phases 1 and 3 run in parallel. Phase 2 starts after 1. Phase 4 after 2 and 3. Phase 5 after 4
(with fix loops back into development as needed).

### Orchestration guidelines (from the user — MANDATORY for every lead/coordinator)
1. **Task sizing:** each coordinator breaks work down so that every sub-agent can complete its
   task within **100k–150k tokens**. Split anything bigger.
2. **Model choice** (Agent tool `model` param):
   - `sonnet` for well-defined implementation tasks (clear spec, clear files, clear acceptance);
   - `haiku` for simple tool executions (run build, run tests, typecheck, take a screenshot, collect console errors);
   - default/opus for coordinators and for ambiguous design/debugging work.
3. **Independent validation:** implementation and validation are performed by **different agents**.
   The agent that wrote the code never signs off on it; a separate validator agent checks it
   against the spec/acceptance criteria and reports pass/fail with evidence.
4. **Nested coordination:** any significant task may itself be handled by a set of sub-agents
   under a sub-coordinator. Use nesting as needed (lead → sub-coordinator → workers).
5. Sub-agents get self-contained prompts: exact files to read/write, acceptance criteria,
   and where to record progress (the phase's tracking file + `docs/PROGRESS.md`).

### Acceptance criteria (whole project)
1. `npm install && npm run dev` serves the game; `npm run build` produces a static `dist/`; `npm test` passes.
2. All 8 classic skills work: Climber, Floater, Bomber, Blocker, Builder, Basher, Miner, Digger.
   Plus release-rate −/+, pause, fast-forward, nuke (with confirmation), restart.
3. Pixel-destructible terrain, indestructible steel, hazards (water/lava/traps), one-way walls (optional stretch).
4. At least 8 novel levels across ≥3 difficulty tiers, with a level-select and progress saved in `localStorage`.
5. Synthesized sound effects + optional music, with mute/volume controls, respecting user preference.
6. Accessibility: full keyboard play (incl. selecting lemmings without a mouse), visible focus,
   ARIA live announcements of key events, `prefers-reduced-motion` respected, sufficient contrast,
   non-color-only cues, pause-anytime, help/controls screen.
7. No console errors during play. Tested in the browser by agents.
8. 3 representative screenshots in `docs/screenshots/` + side-by-side comparison notes against
   original-game reference screenshots in `docs/testing/TEST_REPORT.md`.
