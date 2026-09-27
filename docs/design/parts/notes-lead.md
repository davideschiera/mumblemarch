> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

## Notes for architecture / dev (lead)

Items the design needs that differ from the current scaffold. Architecture files were **not** edited by design; dev applies these.

| # | Where | Current | Design needs | Why |
|---|---|---|---|---|
| N1 ✅ | `src/render/camera.ts` `VIEW_WIDTH`; ARCHITECTURE §1/§9 | ~~320~~ → **400 (done by architecture)** | **400** (height stays 160) | At ×3 a 400 view fills a 1280 px window (1200 px canvas) and shows 25% more level, which means less scrolling and less time pressure (D2). |
| N2 (partly ✅) | `index.html` `<title>`, meta description, favicon; `ui/strings.ts` `GAME_TITLE`; `package.json` name/description | Title, description and `GAME_TITLE` are **done**. Still open: `package.json` `"name": "lemmings"` and the favicon art | **"Mumblemarch"**; favicon = a mumble head (tuft + coral face, from `sprites.js`); description "Guide a marching line of mumbles home — a puzzle game with brand-new levels." | IP rule (RESEARCH §9): no "Lemm-" in title, icons or metadata. |
| N3 ✅ | `persistence/schema.ts` `STORAGE_KEY` | **done** (`mumblemarch.save`) | `mumblemarch.save` (rename now; nothing is shipped yet, so no migration is needed) | Metadata hygiene. |
| N4 | `render/sprites.ts` `SPRITE_COLORS` comment | "keep the classic green hair / blue robe spirit" | Replace with the mumble palette from `mockups/sprites.js` | IP (D3). |
| N5 | `src/styles/tokens.css` | Green accent `#3fd13f`, blue secondary | Token values from DESIGN §5.2 (names unchanged, plus new tokens). `mockups/mockup.css` is the reference implementation. | Contrast is verified; the palette matches the mumble. |
| N6 | `ui/hud/skill-bar.ts` | Text-only skills, `min-width: 4.5rem`; Pause/Fast/Nuke labels | Pixel icons, key hint, count badge, **"Pop all"** label, a ☰ menu button at the end, RR value with the interval sub-label, and a roving tabindex | DESIGN §5.3. |
| N7 | `ui/hud/status-bar.ts` | `In 3/8` | Filter chip + focus label (16ch) + `Out n` + `Saved n ▰▱ need m` + `Time m:ss` | DESIGN §5.3; A14. |
| N8 | `render/renderer.ts` | Frame = `stateTicks % frames` | Per-state `ticksPerFrame` and `footX/footY` from `sprites.js` | Animations stay in sync with the mechanics (visual notes). |
| N9 | `levels/themes.ts` | Only `meadow` | The 5 themes `mossgrove`, `sugarworks`, `observatory`, `foundry`, `reef` (+ extra roles, see visual notes) | D4. |
| N10 | `app/game-controller.ts` / `core/session.ts` | Commands apply at the start of the next tick | Assigning while paused must give **immediate** feedback: either apply it at once via a zero-length "apply pending commands" step (preferred; deterministic because it is recorded at the current tick), or show a "pending" badge until the tick runs | Pillar 4; interaction spec. |
| N11 | `layout.css` `.screen-root` / stage | Stage scaled by `integerScale()` | Scale rule `s = clamp(2, 4, min(floor((vw−32)/400), floor((vh−196)/160)))`, plus the Settings "Scale" override | DESIGN §5.1. |
