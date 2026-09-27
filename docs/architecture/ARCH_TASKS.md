# Architecture phase — task checklist

Owner: architecture-lead. Resume from the first unchecked item.

## Setup
- [x] S1 Read PLAN.md / PROGRESS.md; confirm scope (docs + scaffold, no gameplay)
- [x] S2 Verify toolchain: TypeScript 7 (`tsc` flags), `node --test` on `.ts`, esbuild
- [x] S3 Verify chrome-devtools MCP tools load

## Decisions
- [x] D1 Build system chosen + rationale
- [x] D2 Module architecture (layers, dependency rules)
- [x] D3 Key TypeScript interfaces written in `src/`
- [x] D4 Conventions (layout, naming, tsconfig, CSS, a11y, perf)

## Scaffold
- [x] F1 `package.json`, `tsconfig.json`, `.gitignore`
- [x] F2 `scripts/` (dev server + build)
- [x] F3 `index.html` + `src/styles/*.css` (tokens)
- [x] F4 `src/**` typed stubs per module
- [x] F5 `tests/` with real passing tests
- [x] F6 `README.md`

## Docs
- [x] A1 `docs/architecture/ARCHITECTURE.md`

## Verification
- [x] V1 `npm install`, `npm run build`, `npm test`, `npm run typecheck`, `npm run check` pass
- [x] V2 Dev server on :5180, page renders in own chrome-devtools page, zero console errors
- [x] V3 Screenshot `docs/architecture/scaffold.png`; dev server stopped
- [x] V4 PROGRESS.md appended; PLAN.md Architecture row → DONE

## Follow-ups
- [x] R1 Align constants/tick order with docs/research/RESEARCH.md §2 (appeared mid-phase)
- [x] R2 Reviewer findings applied (exit trigger, stateTicks order, applyNow, rejectReason/blockerTurn/jumping, trap cooldowns, relaxedTimer, voice bus, bindings sanitise/conflicts, focus/keys, announcer joining, loop stop-safety, lint determinism, Mumblemarch naming per DESIGN D1, 400×160 view per D2)
- [x] V5 Independent validator agent (haiku): fresh install/build/test/typecheck, dev server + zero console errors in own page, ARCHITECTURE.md ↔ scaffold consistency → fix findings
