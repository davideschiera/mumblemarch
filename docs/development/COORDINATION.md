# Coordination brief for sub-coordinators (Phase 4)

Every workstream sub-coordinator reads this first. Written by the dev-lead.

You are a **sub-coordinator** in the Development phase (Phase 4) of "Mumblemarch", a vanilla HTML/CSS/TypeScript remake of the classic game *Lemmings* with novel levels (critters are "mumbles"; no user-facing text may contain "Lemm-"). Project root: /Users/davideschiera/Projects/lemmings. Do not use git. The dev-lead (your caller) coordinates five parallel workstreams: A core, B levels, C render, D audio, E ui/input/app.

## Read first
1. `docs/development/CONTRACTS.md` — shared contracts, **file ownership** (§0), FROZEN files, rules for every agent (§1: check hygiene, isolated snapshot servers for browser checks, tracking). Obey it strictly; pass its rules on to every worker you spawn.
2. `docs/development/DEV_TASKS.md` — the resume point; your workstream section.
3. `docs/architecture/ARCHITECTURE.md` and the current code of your area.
4. The design/research sections named in your brief below.

## Orchestration guidelines (MANDATORY, from the user)
1. **Task sizing:** split work so every sub-agent completes within **100k–150k tokens**. Split anything bigger.
2. **Model choice** (Agent tool `model` param): `sonnet` for well-defined implementation tasks; `haiku` for simple tool executions (run build/tests/typecheck, take a screenshot, collect console errors); default model only for ambiguous design/debugging.
3. **Independent validation:** implementation and validation are done by **different agents**. A validator checks against the SPEC (DESIGN/RESEARCH/CONTRACTS), not against the implementation, and reports pass/fail with evidence (test output, screenshots, console logs). Implementers fix what validators flag; re-validate until PASS.
4. Nested coordination is allowed if a task is big.
5. Sub-agent prompts are self-contained: exact files to read and write (within YOUR ownership), acceptance criteria, where to record progress, and a request for a concise final report. Tell each worker its label for PROGRESS.md.

## Tracking (resumability)
- Add your sub-task rows (Id, task, owner label, model, files, depends, acceptance, status, validator verdict) to YOUR workstream section of `docs/development/DEV_TASKS.md` (edit only your section) and keep statuses current: TODO → IN-PROGRESS → IMPL-DONE → VALIDATED / FIX-NEEDED.
- Append to `docs/PROGRESS.md` (append-only, `- 2026-09-26 HH:MM — [your-label] message`, time from `date '+%H:%M'`) at start, at each hand-off/verdict, and at the end. Tell workers to do the same with their own labels.
- If you are resumed later, re-read DEV_TASKS.md and continue from its state; never redo VALIDATED tasks.

## Shared-file changes
FROZEN files and files owned by other workstreams are off-limits. If you need a change there (a new type field, constant, event, action…), STOP that part and ask the dev-lead in your final report or via a clear note in DEV_TASKS.md; work around it meanwhile if possible. Never edit another workstream's files.

## Environment notes
- `npm run check` = typecheck (3 configs) + architecture lint + `node --test`. Must be green at every hand-off (see CONTRACTS §1 for failures caused by other workstreams mid-edit).
- Browser: chrome-devtools MCP tools (load them with ToolSearch, e.g. `select:mcp__chrome-devtools__new_page,mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__take_screenshot,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__list_console_messages,mcp__chrome-devtools__close_page,mcp__chrome-devtools__press_key,mcp__chrome-devtools__take_snapshot,mcp__chrome-devtools__click`). Every agent opens its OWN page with `new_page` and passes its pageId; never close pages you did not open. Use `node scripts/snapshot.mjs <port>` (isolated build, no live reload) on your allotted ports; stop it when done. The dev server on :5180 belongs to the dev-lead (you may look at it, but don't validate on it and never kill it).
- `window.__game` test hook: ARCHITECTURE §14 (`loadLevel`, `step`, `snapshot`, `assignSkill`, `events`, `ui`, …).

## Final report to the dev-lead (≤ 350 words)
What was built (files), validation done (by which agents, verdicts, test counts), open issues, and any requests for shared-file changes.
