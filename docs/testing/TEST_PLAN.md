# Phase 5 — Test plan (resume point)

Lead: **test-lead**. Bugs: [`BUGS.md`](BUGS.md). Per-area results: `results/<area>.md`; evidence
(screenshots, traces, dumps): `evidence/<area>/`. Final report: [`TEST_REPORT.md`](TEST_REPORT.md).

**Resuming?** Read this file + `BUGS.md` + the tail of `docs/PROGRESS.md`. Continue with the first
row whose status is not `DONE`; bugs continue from their `Fix status` field.

Statuses: `TODO` → `RUNNING` → `DONE` (results file written). Bug fix states live in BUGS.md.

## Method and environment
- Build under test: isolated production snapshot per tester (`node scripts/snapshot.mjs <port> <scratch outdir>`),
  so fixers editing `src/` never change a running test. Final screenshots: `npm run build` + `npm run preview` (:5181).
- Browser: Chrome via chrome-devtools MCP; each agent opens its own page (`new_page`, own `isolatedContext`)
  and closes only its own pages. Keyboard = real CDP key input (`press_key`). Canvas clicks = synthetic
  `PointerEvent`s dispatched on the canvas at computed client coordinates (the MCP `click` only targets
  a11y uids) — same handlers as a real mouse, but not OS-level input.
- `window.__game` (ARCHITECTURE §14) may be used to inspect state, load levels and step time; player
  decisions in play-through tests are made by the tester through real controls.
- Setup (2026-09-26 14:15): `npm install` OK, `npm run check` 1036/1036, `npm run build` OK, chrome-devtools OK.

## Test matrix

| # | Area | Cases (summary) | Method | Owner (agent label) | Port | Status |
|---|---|---|---|---|---|---|
| T1a | Skills by real input | 8 skills assigned by canvas click and by keyboard (skill key / Q-E cycle + X/Z select + Space assign); behaviour per DESIGN §3.4/§6.5 + RESEARCH §2.4; refusals not consumed; hover/selected feedback; assign while paused | canvas pointer events + press_key + `__game` state | t1a-skills | 5211 | DONE |
| T1b | Game-flow controls + persistence | RR −/+ (hold-to-repeat, limits), pause/frame-step, FF, Pop all arm/confirm/cancel, restart arm/confirm, undo, camera (keys, edge scroll, minimap click/drag/keys, wheel), win / lose / time-up / relaxed timer, results screen, progress + unlocks + settings persisted across reload | press_key + pointer events + reload | t1b-flow | 5212 | DONE |
| T2a | Fresh-eyes play L7–L9 | solve with briefing + level view only; fairness, clarity, curve, softlocks | real controls, pause + step allowed | t2a-play | 5213 | DONE |
| T2b | Fresh-eyes play L10–L12 | same | same | t2b-play | 5214 | DONE |
| T2c | Fresh-eyes play L2–L6 | same (tier-1 curve and teaching) | same | t2c-play | 5215 | DONE |
| T3a | Keyboard-only flow, focus, ARIA, announcements | title → levels → briefing → play → results → next by keys only; visible focus every stop; focus order + restoration after dialogs/overlays; a11y tree roles/names; announcer catalogue §7.3 + throttling; help screen | press_key + take_snapshot + announcerLog | t3a-a11y-keys | 5216 | DONE |
| T3b | Visual a11y, layout, Lighthouse | Lighthouse a11y + best-practices (all screens reachable by URL/state); contrast spot-checks (UI text + non-text ≥ 3:1); target sizes ≥ 24 px; reduced-motion emulation; high-contrast terrain; 1280×720, 1024×768, 200 % zoom layouts; non-colour cues | lighthouse_audit + emulate + resize_page + screenshots | t3b-a11y-visual | 5217 | DONE |
| T4 | Audio (verifiable) | no AudioContext before gesture; every sound event → sound + visual twin/caption; mute/volume immediate + persisted; music default; OfflineAudioContext peak ≤ 0 dBFS + loudness; limiter/rate | evaluate_script + OfflineAudioContext | t4-audio | 5218 | DONE |
| T5 | Robustness + performance | 0 console errors/warnings on every screen + all 12 levels; crowd perf trace (80+ mumbles, FF): fps, long tasks; tab hidden → auto-pause; resize; input spam | list_console_messages + performance trace + scripted spam | t5-robust | 5219 | DONE |
| T6 | Spirit + visual comparison | side-by-side page reference vs Mumblemarch → `compare/*.png`; honest assessment | local HTML + screenshots | t6-compare | 5220 | DONE (pre-fix snapshot :5220) |
| T7 | Final screenshots | 3 screenshots from production build → `docs/screenshots/` + README | preview :5181 | t7-shots | 5181 | DONE (retaken after VIS-6/VIS-7; reviewed by test-lead) |
| TF | Fix loop | BUGS.md → sonnet fixers → independent browser re-verification | see BUGS.md | fix-lead (+ fx6/fx7 fixers, v4/v5 verifiers) | — | DONE (20/20 VERIFIED; check 1070/1070; results/V1–V3, V5-verify.md) |
| FR | Final regression (production build) | 12/12 solutions, keyboard-only L1, console + network + no-Lemm sweep, Lighthouse, live reduced motion, perf, fix spot-checks | preview :5181 | fr-regression | 5181 | DONE (8/8 PASS) |
