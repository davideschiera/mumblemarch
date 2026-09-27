> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

# UI design (lead draft, merged into DESIGN.md §5)

## 5.1 Screen geometry and scale

- **View:** 400×160 world px. **Canvas backing store = 400×160.** CSS scales it by an integer factor `s` (`image-rendering: pixelated`; never fractional).
- **Scale rule** (recomputed on `resize`):
  - `s = clamp(2, 4, min(floor((vw − 32) / 400), floor((vh − 196) / 160)))`.
  - 196 px is the HUD budget (164) plus the page padding (32).
  - The "Scale" setting can force ×2/×3/×4. Below ×2 the page scrolls; desktop only.

  | Viewport (CSS px) | s | Canvas | Total height |
  |---|---|---|---|
  | 1280×720 (a 1280×800 screen minus browser chrome) | 3 | 1200×480 | ≈ 676 |
  | 1440×800 | 3 | 1200×480 | ≈ 676 |
  | 1920×960 | 4 | 1600×640 | ≈ 836 |
  | 1024×640 | 2 | 800×320 | ≈ 516 |

- **Game-screen wireframe at ×3** (content column = canvas width, centred, 16 px page padding):

```
x:0                                                                                    1200
┌────────────────────────────────────────────────────────────────────────────────────────┐ y:0
│  PLAYFIELD  <canvas> 400×160 world px → 1200×480 CSS px                                │
│  DOM overlays, top-centre: [⏸ Paused — you can still assign skills]  [⏩ ×3]           │
│                 under them: refusal / info toast  [✕ Can't dig: steel below]           │
│  bottom-left caption strip: « Off we go! »                                             │
└────────────────────────────────────────────────────────────────────────────────────────┘ y:480
  8 px gap
┌ status line (sunken well, 18 px mono, flex 1 → 860 px) ─────────────┬ minimap well 332×44 ┐ y:488
│ [Pick: All][Follow] Walker ×3  │ Out 12 │ Saved 3 ▰▰▱▱ need 8 │ Time 4:12 │ ▒▒[▭▭]▒▒▒▒▒▒▒▒ │ h:44
└─────────────────────────────────────────────────────────────────────┴─────────────────────┘ y:532
  8 px gap
┌ toolbar role="toolbar" (one Tab stop, roving) ─────────────────────────────────────────┐ y:540
│[−][ 50 ][+] ║ [1][2][3][4][5][6][7][8] ║ [⏸ Pause][⏩ Fast][Pop all] ║ [☰]              │ h:88
│ 48/56/48    ║ 8 skill buttons 80×88    ║ 72 / 72 / 92                ║ 48               │
└────────────────────────────────────────────────────────────────────────────────────────┘ y:628
```
- **Toolbar width budget:**
  - RR group 48+56+48 = 152 px.
  - Group separators: 3 × 8 px.
  - Skills 8×80 + 7×4 = 668 px.
  - Controls 72+72+92 = 236 px.
  - Menu ☰ 48 px.
  - Gaps ≈ 40 px.
  - Total ≈ 1170 px ≤ 1200 ✓.
- **Measured in the mockup at 1280×720:**
  - canvas 1200×480;
  - status line 860×44 with no overflow;
  - minimap well 332×44 on the same row;
  - toolbar bottom at y = 644, so the page is ≈ 660 px tall and fits a 720 px viewport.
  - All controls are ≥ 44×44 (independent check: `validation/ui-contrast.md`).
- **At ×2 (800 px canvas):** the HUD keeps its own minimum width of 800 px. The toolbar wraps into 2 rows (skills on row 1; RR + controls on row 2) with `flex-wrap`, and the minimap drops under the status line. Nothing overlaps the canvas, so focus is never obscured (WCAG 2.4.11).
- **Minimap:**
  - 1 CSS px = **5** world px in both axes (level 1600 wide → 320×32; level 640 → 128×32, left-aligned in a 332×44 well).
  - It shows the terrain silhouette (theme `earth[2]`), steel (theme `steel[1]`), hazards (danger-coloured 2 px strip), the exit (4×6 white doorway glyph) and mumbles (2×2 `#ffc93c` dots).
  - The viewport is a 2 px `#f7f3ff` rectangle, ≥ 12:1 on the sunken well.
- **Top-of-page chrome:** none during play. The ☰ button at the end of the toolbar opens the pause menu, and so does Esc. Every other screen uses a 1200 px max-width column with a `<header>` (logo mark + screen `<h1>`).

## 5.2 Design tokens (replace the values in `src/styles/tokens.css`; names are kept)

All ratios were computed with the WCAG 2.2 relative-luminance formula.

| Token | Value | Use | Contrast (verified) |
|---|---|---|---|
| `--color-bg` | `#14112a` | page | — |
| `--color-surface` | `#1f1b3d` | panels, cards, dialogs | — |
| `--color-surface-raised` | `#2c2754` | buttons | — |
| `--color-surface-hover` *(new)* | `#3a3470` | button hover | text 10.1:1 |
| `--color-surface-sunken` *(new)* | `#0c0a1a` | status line, minimap well, RR value | — |
| `--color-border` | `#7a72b8` | control boundaries | 4.3:1 on bg, 3.8:1 surface, 3.2:1 raised |
| `--color-border-strong` *(new)* | `#a59de0` | hover border | 5.6:1 on raised |
| `--color-text` | `#f7f3ff` | body text | 16.8 bg · 15.0 surface · 12.6 raised · 17.9 sunken |
| `--color-text-muted` | `#c9c2e8` | secondary text | 10.8 bg · 9.6 surface · 8.1 raised |
| `--color-text-faint` *(new)* | `#b0a9d4` | key hints, "0 left" | 5.0 hover · 6.2 raised · 7.4 surface · 8.8 sunken |
| `--color-accent` | `#ffc93c` (tuft yellow) | selected skill, primary button, minimap dots | 12.0 bg · 9.0 raised |
| `--color-accent-contrast` | `#2a1433` (plum) | text on accent | 11.0:1 on accent |
| `--color-secondary` | `#ff8a65` (body coral) | decorative highlights, "New" badge | 7.1 surface; plum on coral 7.3 |
| `--color-success` | `#72e08e` | saved ✓, completed | 10.0 surface · 11.9 sunken |
| `--color-warning` | `#ffb44d` | time low, ≤ 3 bricks | 9.3 surface · 11.1 sunken |
| `--color-danger` | `#ff7470` | Pop all, failure | 6.2 surface · 5.2 raised; plum on danger 6.4 |
| `--color-info` *(new)* | `#8fb6ff` | hints, links | 8.0 surface |
| `--color-focus` | `#6fe3ff` (cyan) | focus ring only | 12.3 bg · 11.0 surface · 9.3 raised |

**Rules**
- **Focus ≠ selected:** focus is **cyan**, selection is **yellow + notch**. The focus ring is `outline: 3px solid var(--color-focus); outline-offset: 2px`, so the 2 px gap always shows bg or surface (≥ 11:1). It is never removed, and it coexists with the selected state.
- No information is carried by colour alone. Every coloured state also has an icon, text or shape (✓, ⚠, ✕, notch, hatch).

**Type** (no web-font fetches):

| Token | Value |
|---|---|
| `--font-ui` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` (status line, counts; plus `font-variant-numeric: tabular-nums`) |
| `--font-display` *(new)* | `--font-ui` at weight 800–900, `letter-spacing: .02em`, with the "sticker" treatment: `paint-order: stroke fill; -webkit-text-stroke: 6px #2a1433` + `text-shadow: 0 4px 0 #2a1433` |

- **Scale:** `--text-xs .75rem` (12, badges only) · `--text-sm .875rem` (14) · `--text-md 1rem` (16) · `--text-lg 1.25rem` (20) · `--text-xl 1.5rem` (24) · `--text-2xl 2rem` (32) · `--text-hero clamp(3rem, 7vw, 5.5rem)`.
- **Minimums:** no running text below 14 px. The status line is 18 px mono. Skill names are 14 px/600. Counts are 20 px mono/700.
- **Line-height:** 1.5 for body, 1.1 for display.

**Spacing and shape**
- **Spacing:** 4 px grid (`--space-1` … `--space-8` as today) plus `--space-12: 3rem`.
- **Radius:**
  - `--radius-sm 6px` (badges, chips)
  - `--radius-md 10px` (buttons)
  - `--radius-lg 16px` (cards, dialogs)
  - `--radius-pill 999px`
- **Depth** ("chunky toy" buttons): `--shadow-raised: 0 3px 0 #0c0a1a`. When pressed: `translateY(2px)` with a 1 px shadow. With reduced motion there is no translate, only the colour change.
- **Motion:** `--duration-fast 120ms`, `--duration-normal 220ms`, both zeroed under `data-motion="reduce"` (already wired).

**Sizes**
- `--hud-button-h: 88px` (≥ 44 ✓ WCAG 2.5.5)
- `--skill-w: 80px`
- `--control-w: 72px` (Pop all 92px, ☰ 48px, RR ± 48px)
- `--min-target: 44px`: every clickable element in menus is ≥ 44×44. Nothing anywhere is < 24×24 (2.5.8).

## 5.3 HUD components and states

**Skill button** (80×88), content top to bottom:
- key hint `1` (top-left, 12 px faint);
- count badge (top-right, 20 px mono bold on a sunken pill);
- 16×16 pixel icon at ×3 = 48×48 (from `sprites.js` icons);
- name (14 px/600).

| State | Visual (never colour-only) | ARIA |
|---|---|---|
| default | raised fill, 2 px `--color-border`, 3 px bottom shadow | `aria-pressed="false"`, `aria-label="Digger, 3 left"` |
| hover | `--color-surface-hover` fill, `--color-border-strong` border | — |
| focus-visible | + cyan 3 px ring, 2 px offset | — |
| pressed (`:active`) | translateY(2px), 1 px shadow | — |
| **selected** | **3 px yellow border** + yellow 12% inner tint + **yellow ▲ notch** under the button + bold name | `aria-pressed="true"` |
| **0 left** (`aria-disabled="true"`) | count shows **"0"** in faint text; icon at 45% opacity; **diagonal hatch overlay** (`repeating-linear-gradient(45deg, #ffffff14 0 4px, transparent 4px 8px)`); still focusable and clickable (gives refusal feedback) | `aria-label="Digger, none left"` |
| selected **and** 0 left | selected styling + hatch; the status line shows "No diggers left" | — |
| refusal flash | 3 horizontal shakes of ±3 px over 240 ms (reduced motion: 2 blinks of the red ✕ badge in the top-right, total 400 ms; ≤ 3 flashes/s) | message via Announcer |
| count changed | count badge scales 1.0→1.25→1.0 over 160 ms (none with reduced motion) | label updated |

**Release-rate group** `role="group" aria-label="Release rate"`:
- The **−** and **+** buttons are 48×88 with glyphs 28 px bold.
- The value well (56×88, sunken) shows the RR number (24 px mono) plus a sub-label with the interval, e.g. **"1.6 s"** (12 px), computed as `((99−RR)>>1)+4` ticks ÷ 17.
- − is `aria-disabled` at the level minimum and shows a small padlock glyph with "min". + is `aria-disabled` at 99.

**Controls**
- **Pause** 72×88: two-bars icon + "Pause". When paused: yellow selected styling, and a DOM pill over the canvas top-centre reads **"⏸ Paused — you can still assign skills"** (16 px, surface-sunken at 90% opacity, 1 px border).
- **Fast** 72×88: double-chevron icon + "Fast". When active: selected styling, and a pill reads **"⏩ ×3"**.
- **Pop all** 92×88: danger border, plum-on-red "burst" icon.
  - **Armed** (after the first press): solid danger fill with plum text **"Press again"**, a 2 px dashed plum inner outline, and a bubble above reading "Press Pop all again (or N) to pop every mumble · Esc cancels".
  - The armed state persists with no timeout, until confirmed, Esc, or any other action.
  - In reduced motion there is no pulse; otherwise the border pulses at 1 Hz, which is below the flash threshold.

**Status line** (sunken well, 18 px mono, tabular numbers; plain text, not a live region, and not `aria-hidden`):
0. **Chips** (real buttons, 32 px high inside the 44 px row):
   - **Filter** `Pick: All` / `Walkers` / `Facing ←` / `Facing →` (`V`), with `aria-label="Selection filter: walkers only"`;
   - **Follow** (`L`), `aria-pressed`, yellow border when on.
1. **Focus label**, a fixed 16ch slot so nothing jumps: `Walker ×3` / `Builder · 4 bricks` / `Climber + Floater` / blank.
2. `Out 12`.
3. `Saved 3` + a mini meter (8 segments, filled ▰ vs ▱) + `need 8`. When the goal is met: success colour + ✓ glyph + "goal met".
4. `Time 4:12`:
   - under 30 s: warning colour + ⚠ glyph (no blinking in reduced motion; otherwise a 1 Hz blink);
   - relaxed timer: `Time 4:12 · relaxed`.

**Minimap** 320×32 max (1:5) in a 332×44 sunken well: 2 px border, cursor `pointer`, focusable (keyboard behaviour in §6). The hover state shows a ghost viewport rectangle at the pointer.

**Playfield cursor**
- A CSS custom cursor (a data-URL PNG generated at runtime from the pixel crosshair in `sprites.js`) in 3 sizes: **32 / 48 / 64 px** (Settings → Cursor size).
- Over a pickable mumble, the canvas draws the hover bracket (overlay art) around it, and the crosshair stays.
- The keyboard cursor is the same crosshair drawn in-canvas with a 1 px dark halo.

**Bark caption strip**: bottom-left inside the canvas box, DOM, max 2 lines visible, 16 px, 2.5 s each, `aria-hidden="true"` (the announcer covers speech).

**Toast** (refusals and one-line info): a DOM plate top-centre under the pause pill, 16 px, `✕` + danger border for refusals and `ℹ` + info border for info. It shows for 2.5 s, max 1 at a time (newest replaces), and is `aria-hidden` (the Announcer speaks it).

## 5.4 Screens

Every screen follows the same rules:
- one `<h1>`, landing focus per architecture;
- max-width 1200 px, centred;
- surface cards;
- ≥ 44 px targets;
- primary action first in DOM order;
- Esc = back.

| Screen | Layout & content | States |
|---|---|---|
| **Title** | **Logo:** "Mumblemarch" in the display style (hero size, yellow fill `#ffc93c`, plum stroke; each letter offset ±3 px vertically like a marching line). **Tagline** (from copy). **Menu column** (buttons 320×56): **Play** (primary; continues at the first unfinished level's briefing) · **Levels** · **How to play** · **Settings**. **Footer:** a canvas strip 1200×96 where 5–8 mumbles march across on a grassy ledge; with reduced motion it is a static frame. Small text: "Sound starts after your first click or key press." | first visit: Play reads "Start"; returning: "Continue — 4 · The Punch Line" |
| **Level select** | `<h1>Levels</h1>`, then one `<section>` per tier with an `<h2>`: **Breezy** · **Knotty** · **Gnarly** · **Stampede**. Each tier heading shows a shape-based difficulty mark (1–4 filled rounded pips) and a 1-line descriptor. **Card grid:** 4 per row at 1200, cards 282×176: a thumbnail (level scaled to fit 250×25 world→CSS, i.e. a mini minimap, over the theme background colour), then "3" (number badge), the title, then the state row. Cards are `<button>`s in a list; arrow keys move within the grid (roving tabindex), and Tab jumps to the next tier. | **locked:** padlock icon + "Finish level 2 to unlock", fill at 60% but text stays ≥ 4.5:1, `aria-disabled`. **New:** coral "New" badge. **Completed:** ✓ badge + "Best: saved 14 of 20". **Perfect** (100%): ✓ + star "Everyone home". **Current/last played:** yellow left border stripe. A Settings toggle "Unlock all levels" overrides locks. |
| **Briefing** | Header row: `Level 3 · Breezy` (muted) above `<h1>` title (2xl display). **Thumbnail:** the whole level at 1 CSS px = 1 world px, i.e. up to 1200 wide (≤ 1600-wide levels at 0.75), with entrance/exit markers. **Facts** `<dl>` in a 5-column row of stat tiles: *Mumbles* 20 · *Save* 10 (50%) · *Release rate* 50 · *Time* 5:00 · *Tier* Breezy. **Skills available:** icon chips with counts (only non-zero ones, in bar order). **Hint:** a collapsed "Show hint" disclosure button (spoiler-safe). **Buttons:** **Let's march!** (primary, Enter) · Back to levels (Esc). | relaxed timer on: the Time tile reads "5:00 · relaxed". Already completed: adds "Best: 14 saved". |
| **Pause menu** | A native `<dialog>` over the frozen game (backdrop 60% black; the game keeps rendering its paused frame). `<h2>Paused</h2>`, then an objective line "Saved 3 · need 8 of 20 · 4:12 left". Buttons: **Resume** (Esc/P) · Restart level · Show briefing · How to play · Settings · Quit to levels. A mini controls cheat-sheet sits at the bottom (5 most-used keys). | Restart asks for confirmation inside the dialog ("Restart? Your mumbles go back to the hatch." [Restart] [Cancel]). |
| **Results** | `<h1>` headline (success/fail copy), then the big line "You saved **14** of 20" and a meter with a notch at the requirement: "needed 10". Then the verdict one-liner (copy), a "New best!" badge when it applies, and buttons: **Next level** (primary on success) · **Try again** (primary on failure) · Levels. On failure only, a "Show hint" disclosure. Decor: saved mumbles hop (static with reduced motion). | Success: success colour + ✓ icon in the headline. Failure: warning colour + ↺ icon. Relaxed: the note "Played with the relaxed timer". |
| **How to play** | Two columns. Left: **Goal** (3 sentences) and a **Skills** glossary (8 cards: icon, name, key, one-line effect). Right: **Controls** tables (Mouse / Keyboard, generated from the live bindings) and **Tips** (pause-and-assign, filters, fall ruler). Reachable from title, pause and H/F1. | — |
| **Settings** | Sections as `<fieldset>`s with `<legend>`s: **Sound** (Mute toggle; Master / Effects / Voice chirps / Music `<input type=range>` 0–100 with `<output>`); **Display** (Scale: Auto/×2/×3/×4 radio; Motion: System/Reduced/Full; Clear physics view toggle; Cursor size radio; Captions toggle); **Play** (Relaxed timer; Fall-height ruler; Unlock all levels; Announcements Off/Essential/All); **Controls** (a list of actions with key chips and a "Change" button: press a key, Esc cancels, conflicts are highlighted with a text message; "Reset to defaults"). Changes apply and save immediately; a "Saved" status appears (role="status"). | Every control uses native form elements with visible labels; 44 px rows. |
