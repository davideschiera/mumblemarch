# Mumblemarch — Design appendix (reference data)

Companion to [`DESIGN.md`](DESIGN.md). It holds bulky reference material that dev copies from, rather than rules. Section letters are cited from DESIGN.md as "App. A" and so on. **The rules live in DESIGN.md**; where the two disagree, DESIGN.md wins, except that the data files (`sprites.js`, `levels-data.js`, `audio-lab.html`) win over both.

## A. `ui/strings.ts`-ready string table (from DESIGN §9.7)

```ts
export const GAME_TITLE = 'Mumblemarch';
export const TAGLINE = 'Little feet, big plans.';
export const TIER_NAMES = { 1: 'Breezy', 2: 'Knotty', 3: 'Gnarly', 4: 'Stampede' } as const;
export const TIER_BLURBS = { 1: 'Gentle first steps', 2: 'A few tangles', 3: 'Think it through', 4: 'Everything at once' } as const;
export const SKILL_DESCRIPTIONS: Readonly<Record<SkillId, string>> = {
  climber: 'Suction-cup hands: climbs straight up walls. Keeps the skill.',
  floater: 'Dandelion puff: drifts down safely from any height. Keeps the skill.',
  bomber: 'Lights a fuse, counts 5 to 1, then pops and blasts a hole (not through steel).',
  blocker: 'Holds up a STOP paddle. Everyone else turns around.',
  builder: 'Lays a stair of 12 planks, then shrugs.',
  basher: 'Punches a tunnel straight ahead.',
  miner: 'Picks a tunnel diagonally down.',
  digger: 'Digs straight down.',
};
export const SKILL_PLURAL: Readonly<Record<SkillId, string>> = { climber: 'climbers', floater: 'floaters', bomber: 'bombers', blocker: 'blockers', builder: 'builders', basher: 'bashers', miner: 'miners', digger: 'diggers' };
export const SKILL_VERB: Readonly<Record<SkillId, string>> = { climber: 'climb', floater: 'float', bomber: 'pop', blocker: 'block', builder: 'build', basher: 'bash', miner: 'mine', digger: 'dig' };
export const SKILL_GERUND: Readonly<Record<SkillId, string>> = { climber: 'climbing', floater: 'floating', bomber: 'fizzing', blocker: 'blocking', builder: 'building', basher: 'bashing', miner: 'mining', digger: 'digging' };
export const DEATH_TEXT: Readonly<Record<DeathCause, string>> = {
  splat: 'went splat', drown: 'took an unplanned swim', burn: 'got far too toasty',
  trap: 'got caught by a trap', explode: 'went pop', 'out-of-bounds': 'fell off the map',
};
export const CAPTIONS: Partial<Record<SfxId, string>> = { 'lets-go': 'Off we go!', ohno: 'Uh-oh…', exit: 'Wheee!', 'builder-shrug': 'Out of planks!' };
export const SOUND_CAPTIONS: Partial<Record<SfxId, string>> = { splat: '[splat]', drown: '[glug glug]', burn: '[tsss!]', explosion: '[pop!]', nuke: '[fizz… pop all!]', steel: '[tink]', 'builder-low': '[plink]', fuse: '[fizz]', 'time-low': '[tick-tock]', 'entrance-open': '[creak… clunk]', 'trap-flytrap': '[snap! chomp chomp]', 'trap-press': '[ka-chunk!]', 'trap-pendulum': '[swish… clang]', 'trap-piston': '[hiss… bang!]', 'trap-clam': '[clack-gloop]', trap: '[snap!]' };
export const REFUSAL = {
  noneLeft: (s: SkillId) => `No ${SKILL_PLURAL[s]} left`,
  alreadyClimber: 'Already a climber', alreadyFloater: 'Already a floater', fuseLit: 'That fuse is already lit',
  airborne: (s: SkillId) => `Needs solid ground to ${SKILL_VERB[s]}`, isBlocker: 'Blockers only take a Bomber',
  sameJob: (s: SkillId) => `Already ${SKILL_GERUND[s]}`, dying: 'Too late for that one',
  steel: (s: SkillId, where: 'ahead' | 'below') => `Can't ${SKILL_VERB[s]}: steel ${where}`,
  oneWay: (s: SkillId) => `Can't ${SKILL_VERB[s]} against the arrows`,
  blockerOverlap: 'Too close to another blocker', tooHigh: 'No room to build up here',
  noTarget: 'No mumble selected — press X to pick one', noMumbleHere: 'No mumble here', levelOver: 'The level is over',
} as const;
export const HUD = {
  pausedPlate: '⏸ Paused — you can still assign skills', fastPlate: '⏩ ×3', popAll: 'Pop all', popArmed: 'Press again', popping: 'Popping…',
  popBubble: 'Press Pop all again (or N) to pop every mumble · Esc cancels', restartBubble: 'Press R again to restart · Esc cancels',
  out: (n: number) => `Out ${n}`, saved: (s: number) => `Saved ${s}`, need: (r: number) => `need ${r}`, goalMet: 'goal met ✓',
  time: (m: string) => `Time ${m}`, overtime: (m: string) => `Time +${m} · relaxed`, muted: 'Muted',
  ready: (n: number) => `Ready: ${n} ${n === 1 ? 'job starts' : 'jobs start'} when you resume`,
  filter: { all: 'Pick: All', walkers: 'Pick: Walkers', left: 'Pick: Facing ←', right: 'Pick: Facing →' },
} as const;
export const BRIEFING = { mumbles: 'Mumbles', save: 'Save', rate: 'Release rate', time: 'Time', tier: 'Tier', skills: 'Skills', showHint: 'Show hint', start: "Let's march!", back: 'Back to levels' } as const;
export const RESULTS = {
  won: 'Level complete!', lost: 'Not quite this time', timeUp: "Time's up!",
  score: (s: number, t: number, r: number) => `You saved ${s} of ${t} · needed ${r}`,
  relaxed: 'Played with the relaxed timer.', relaxedOvertime: (m: string) => `Played with the relaxed timer · finished ${m} into overtime.`,
  beatClock: 'Beat the clock ✓', newBest: 'New best!', next: 'Next level', retry: 'Try again', levels: 'Levels',
} as const;
// Verdict lines: the table in §9.5 → export const VERDICTS: readonly [string, string][] (rows 1–8, {n} = R−S).
```

---

## B. Prop key frames (from DESIGN §3.3)

```
blocking f0 (12×14)   building f4 (10×10)   digging f0 (10×12)   floating f6 (10×16)
.......ooo..          ..........            ..........           ..d..dd..d
......orrro.          ..oo......            ..oo......           ..dddddd..
.....orrrrro          .otto.....            .otto.....           .ddddedddd
.....owwwwwo          ..oTo.....            ..oTo.....           .dDdddddDd
..o..orRRRro          .ooTooo...            .ooTooo...           ..DDdddDD.
.oto.ooRRRo.          obhbbcco..            obhbbccss.           ...DDDDD..
..otTo.ooo..          obbbwpco..            obbbwpcbs.           .oo.ee....
.ooTToo.s...          obbbccco..            obbbcccos.           ottobe....
obccccbos...          oBBbcccob.            oBBbcccos.           .otTb.....
bbwccwbbb...          .ooollllll  ← brick   .oooooogg.  ← blade  ..oToooo..
obpccpbo....                                .......gG.  (2 rows  .obhbbcco.
oBbccbBo....                                ........g.  below    ... (body)
.oooooo.....                                             foot)
.oo..oo.....
```
- **Blocker:** faces the viewer (two eyes) and holds a round red **STOP paddle** with a white bar.
- **Builder:** plank (`l`/`L`) whose bottom row lands exactly on the brick's cells.
- **Digger:** spade blade 2 rows below the foot.
- **Floater:** a dandelion puff on a stem, not an umbrella.
- **Climber:** pink suction cups `q`.
- **Basher:** teal mitt `m`.
- **Miner:** pick with a grey head.
- **Bomber:** fuse sparks `f`/`F` on the tuft.

---

## C. Music note data (from DESIGN §8.6)

**Note data** (tokens: note, `.` rest, `-` hold; lead = 8 per bar, bass = 4 per bar; drums = 16 steps). The full data is in the lab's `MUSIC` object.
```text
mossgrove  lead: D5 . B4 . G4 A4 B4 - | C5 . E5 . D5 C5 B4 - | A4 . F#4 A4 D5 - C5 - | B4 A4 G4 . D4 . G4 . |
                 E5 . B4 . G4 B4 E5 - | E5 D5 C5 . G4 . C5 . | D5 . F#5 . E5 D5 C5 A4 | G4 . B4 D5 G5 - . .
           bass: G2 D3 B2 D3 | C3 G3 E3 G3 | D3 A3 F#3 A3 | G2 D3 B2 D3 | E3 B3 G3 B3 | C3 G3 E3 G3 | D3 A3 F#3 A2 | G2 D3 G2 .
           drums k x.......x....... s ....x.......x... h ..x...x...x...x.
sugarworks lead: C5 A4 F4 A4 C5 . F5 . | D5 . Bb4 . D5 F5 D5 . | E5 . G5 . E5 C5 G4 . | A4 C5 F5 - . . . . | (+4 bars)
observatory lead: A4 - - - D5 - E5 - | F5 - E5 - C5 - - - | D5 - - - B4 - G4 - | A4 - - - . . . . | (+4 bars); arp 0-1-2-1 over Dm C G Dm F C G Dm
foundry    lead: A4 . C5 . E5 . A5 . | G#5 . E5 . B4 . G#4 . | A4 C5 E5 C5 A4 . . . | B4 . D5 . G#4 - E4 . | (+4 bars)
reef       lead: F4 . Bb4 . D5 - C5 Bb4 | G4 - D5 - Bb4 - . . | G4 . Bb4 . Eb5 - D5 C5 | C5 - F5 - A4 - . . | (+4 bars)
title      lead: C5 . E5 . G5 . C6 - | A5 . F5 . C5 . A5 - | G5 F5 E5 D5 B4 . D5 . | C5 - - - . . . .
```

## D. Full per-theme contrast table (from DESIGN §4.10)

Computed by `contrast.mjs` (scratchpad) from `sprites.js`, and live on the showcase page. **All pairs pass.**

| Pair | mossgrove | sugarworks | observatory | foundry | reef |
|---|---:|---:|---:|---:|---:|
| Mumble body `b` vs background | 7.84 | 7.58 | 8.09 | 8.04 | 7.27 |
| Mumble outline `o` vs lightest earth `earth[3]` | 8.99 | 9.68 | 9.32 | 8.75 | 9.12 |
| Mumble outline `o` vs surface | 11.07 | 8.92 | 15.24 | 12.46 | 12.17 |
| Mumble outline `o` vs surfaceHi | 15.43 | 15.51 | 16.85 | 8.00 | 15.64 |
| Tuft `t` vs background | 11.82 | 11.41 | 12.19 | 12.11 | 10.95 |
| Darkest earth `earth[0]` vs background | 3.76 | 3.83 | 3.84 | 3.80 | 3.71 |
| Mid earth `earth[1]` vs background | 5.17 | 5.32 | 5.20 | 5.20 | 4.91 |
| Surface vs background | 11.93 | 9.28 | 16.93 | 13.75 | 12.15 |
| Steel plate `steel[1]` vs background | 5.94 | 6.19 | 6.55 | 5.52 | 5.99 |
| Steel seam `steel[0]` vs background | 3.25 | 3.07 | 3.48 | 3.04 | 3.35 |
| Brick vs background | 3.90 | 3.81 | 4.66 | 3.98 | 5.70 |
| Builder brick vs background | 13.76 | 13.09 | 14.95 | 14.54 | 11.54 |
| One-way arrow vs its edge | 13.17 | 6.80 | 11.41 | 12.19 | 14.94 |
| One-way edge vs lightest earth | 8.99 | 3.91 | 8.63 | 8.41 | 8.09 |
| Hazard surface vs background | 9.76 | 9.96 | 13.01 | 12.90 | 10.39 |
| Hazard deep vs background | 3.84 | 5.33 | 6.31 | 7.89 | 4.50 |
| Exit rim vs background | 7.72 | 16.14 | 11.64 | 11.95 | 8.95 |
| Exit glow vs doorway `n` `#0c0816` | 16.27 | 14.01 | 14.88 | 15.67 | 16.10 |
| Trap main vs background | 7.44 | 12.81 | 8.32 | 7.44 | 6.07 |
| Hatch main vs background | 4.63 | 4.58 | 6.11 | 5.91 | 6.53 |

## E. Architecture / dev change list, full (from DESIGN §11)

Changes design needs from the scaffold. Sub-tables are grouped by owner area; items are numbered N/V/I/S/L so dev tasks can cite them.

**Resolved already:**
- V9 (exit trigger rows): the architecture already set `EXIT_TRIGGER = {dx:-4, dy:-7, w:8, h:8}` (rows y−7..y), which covers a mumble standing on the anchor row. No action needed.
- V10 is the same change as N1.

### E.1 Lead (layout, IP, tokens, HUD)

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

### E.2 Visual (sprites, themes, renderer, compiler)

| # | Where | Change |
|---|---|---|
| V1 | `render/sprites.ts` | `SPRITE_COLORS` ← `MUMBLE_ART.palette` (all 31 keys). Replace `LEMMING_FRAMES` with `LEMMING_ANIMS: Record<LemmingState, { frames; ticksPerFrame; footX; footY; loop; loopFrom? }>`, copied from `sprites.js` → `sprites`. |
| V2 | `SpriteAtlas.drawLemming` | Use the §3.4 frame-index rule (today: `tick % frames`). Draw origin `(x − footX, y − footY)`, mirrored `(x − (w − 1 − footX), y − footY)` (today: `x − floor(w/2)` for both directions, which shifts left-facing sprites by 1 px). Cache key `state:frame:dir`. |
| V3 | `render/sprites.ts` (new) | `drawOverlay(name, x, y, frame)` for the digits, pips, hover, selection, crosshair, steel spark, refusal, pending and assign ring, with the §3.4 placement. The renderer draws them after all mumbles. The CSS cursor PNG comes from `overlays.crosshair`. |
| V4 | `levels/themes.ts` | Replace `meadow` with the 5 themes (ids as D4). **Extend `Theme`:** `surfaceHi`, `brickHi`, `oneWayEdge`, `accent`, `hazard: [surface, deep, foam]`, `trap: [main, dark, accent]`, `hatch: [main, dark]`, `exit: [rim, glow]`, `decor`, `hazardKind`, `texture: { dripMax, strataBands: number[12], brick: [w, h], mossOnBricks }`, `minimap`. `bricks` stays `[brick, mortar]`. Palette entries 17–27 are never written into terrain. |
| V5 | `levels/compiler.ts` | Paint in **two passes**: (1) primitives write material + fill style per pixel (a `Uint8Array` fill map); (2) colour every pixel with the §4.2 recipes, using post-paint `depth`/`edge`, and bake one-way chevrons (§4.4). Recipes use `h2(x, y, seed)`, so the sequential `rng` argument is no longer needed. `validateLevel`: reject `fill: 'metal'` on non-steel materials and any non-`metal` fill on steel. |
| V6 | `core/constants.ts` | Add `SPLAT_TICKS = 16`, `DROWN_TICKS = 16`, `BURN_TICKS = 14`, `EXIT_TICKS = 8`. Builder, basher, miner and digger MUST use the §3.4 phase hooks, so that the art and the physics line up. |
| V7 | `render/renderer.ts` | Draw order: background → decor dots → terrain → hazard pools → traps → hatches → exits → mumbles → overlays → particles. Anchors: hatch = `LevelDef.entrances[i]`; exit = `LevelDef.exits[i]`; trap = `(x + w/2, y + h)` of its `HazardDef`. Ambient frame = `floor(timeMs / (1000/17) / ticksPerFrame)`, frozen at 0 when `reducedMotion`. Particles use a fixed pool of 256. |
| V8 | `render/terrain-layer.ts` | Add a high-contrast mode: a second path colouring by `Material` with the §4.9 patterns + edge outline. Recompute it on the dirty rect grown by 1 px. |
| V9 | `core/constants.ts` `EXIT_TRIGGER` | `dy −8, h 8` covers y−8..y−1, but a mumble standing in the doorway has its foot **on** the anchor row y (the floor). Suggest `dy −7, h 8` (y−7..y), or define the anchor as the row above the floor. Needs a mechanics decision (flagged, not changed). |
| V10 | `render/camera.ts` | `VIEW_WIDTH = 400` (D2; same as the lead's N1). |

**Open questions / deviations**
- One-way arrows are **static** and baked into the terrain (§4.4), where the original's arrows were animated.
- Themes use palette indices 17–27 for object accents. That goes beyond the "16 colours" rule, but terrain itself stays ≤ 16.
- Climbing and hoisting anchor at column 7, so the body hugs the wall. At the walk↔climb transition the sprite shifts ≤ 3 px, which is not noticeable at 17 ticks/s.

### E.3 Interaction and accessibility

| # | Where | Change | Why |
|---|---|---|---|
| I1 | `input/actions.ts`, `bindings.ts`, `ui/strings.ts ACTION_LABELS` | Add `camera-center` (`KeyC`), `camera-follow` (`KeyL`), `filter-cycle` (`KeyV`), `briefing` (`KeyB`), `undo` (`KeyU`, SHOULD), `camera-hatch` (`Home`), `camera-exit` (`End`). Add `frame-step` to `HOLDABLE_ACTIONS`. `Escape` is not rebindable. Add a `RESERVED_CODES` set for the rebinding UI. | §6.1 |
| I2 | `InputManager.onKeyDown` | Pass `shiftKey` through to handlers (Shift rule). Add `Home`/`End`/`PageUp`/`PageDown` to the keys owned by `data-arrow-keys` widgets. | §6.1.1, §6.2.6 |
| I3 | `core/session.ts` | `checkAssign(id, skill): SkillRejectReason \| null` (pure, aware of pending same-tick commands). `applyNow(command)` for paused input, using the start-of-tick path and recording `tick = session.tick`. | §6.3.2, §6.4.1 |
| I4 | `core/types.ts` `skill-rejected` | Optional `detail` for `not-applicable`: `'already-climber' \| 'already-floater' \| 'fuse-lit' \| 'airborne' \| 'is-blocker' \| 'same-job' \| 'busy-dying'`. Also `ahead \| below` for `steel`. | §6.5 texts |
| I5 | `core/picking.ts` | `pickLemmingAt(lemmings, p, skill, { filter, snapRadius, accepts })` implementing §6.3.2 steps 1–5. `cycleLemming` start rule "in view" (§6.2.3) + a `groupStep` option. | §6.3 |
| I6 | `game-controller.ts` | Replace `confirmDialog` for `nuke` with the arm/confirm state (§6.4.5). Do the same for `R` (§6.4.6). Any other action disarms. | A12, §5.3 |
| I7 | `ui/announcer.ts` | Keyed polite queue (≥ 1 s gap, replace-by-key, max 4, 3 s de-dup, assertive 1/s) on top of the 50 ms join. `say(msg, {key, politeness, level, userInitiated})`. | §7.3 |
| I8 | `persistence/schema.ts` | Add the NEW settings of §7.11 (bump `SAVE_VERSION` to 2 + migration). `LevelProgress.inTime: boolean`. `musicVolume` default 0.35. | §7.9, §7.11 |
| I9 | `LevelOutcome` | `overtimeTicks: number` (0 unless relaxed). The results copy needs it. | §7.9 |
| I10 | `ui/strings.ts describeLemming` | Use `Climber + Floater` (§5.3 slot) instead of "Athlete". Add the `Builder · n bricks` / fuse suffixes of §6.3.1. | §6.3.1 |
| I11 | Test hook | `__game.audioState()`, `__game.announcerLog()` (last 50 `{t, text, politeness}`), `__game.focus()` (active element id) for the A3/A8/A9 checks. | §7.1 |
| I12 | `index.html` | Canvas `role="application"` + `aria-roledescription="playfield"` (replaces `role="img"`). The stage help text is the one in §7.2. | §7.2 |

### E.4 Audio and copy

| # | Where | Change |
|---|---|---|
| S1 | `audio/sfx.ts` | Add the 17 NEW ids (`ui-back`, `ui-empty`, `ui-arm`, `pause`, `unpause`, `ff-on`, `ff-off`, `rr-up`, `rr-down`, `undo`, `fuse`, `builder-shrug`, `trap-flytrap`, `trap-press`, `trap-pendulum`, `trap-piston`, `trap-clam`). Port the lab helpers into `audio/synth.ts`. Add `builder-shrug` to `VOICE_SFX`. |
| S2 | `audio/event-sounds.ts` | `soundFor(event, ctx: {themeId, lemmingPitch(id)})` returns `{id, pitch}`: bomber assign → `fuse`; `none-left` → `ui-empty`; `steel`/`one-way` → `steel`; `level-ended` refusal → null; `trap-triggered` → the theme variant; `lemming-died{trap}` → null; `builder-finished` → `builder-shrug`; `builder-low-bricks` pitch per bricks left. |
| S3 | `audio/audio-engine.ts` | Master limiter (§8.1). Per-id `{minGapMs, maxVoices, durMs}` table (§8.5). `duck(db, attack, release)` on the music bus. Pause duck + low-pass. |
| S4 | `audio/music.ts` | Port the lab sequencer (`compileTheme`, `scheduleTheme`, look-ahead pump). Start at tick 55, per-level variant, title jingle once per session. |
| S5 | `persistence/schema.ts` | `musicVolume` default **0.35**; other audio defaults unchanged. |
| S6 | Controller | Plays UI sounds at input time (`ui-select`, `ui-move`, `pause`/`unpause`, `ff-*`, `rr-*`, `ui-arm`, `undo`, `ui-back`). The caption strip reads `CAPTIONS`/`SOUND_CAPTIONS` from the same `{id}` that `soundFor` returns, so the visual twin never drifts from the sound. |
| S7 | `ui/strings.ts` | Replace with §9.7 (and `GAME_TITLE = 'Mumblemarch'`). Add `VERDICTS` (§9.5) and `verdictFor(S, R, T, attempt)` with a unit test covering all 8 rows for T = 10, 20 and 80. |

### E.5 Levels (from LEVELS.md "Notes for architecture/dev")

| # | Where | Need |
|---|---|---|
| L1 | `EXIT_TRIGGER` | Already fixed (`dy −7`, rows y−7..y). |
| L2 | `LevelDef` | Optional non-colliding `decor?: TerrainPrimitive[]` layer: drawn, not simulated. Today `op:'behind'` decor is solid terrain, so all decor in LEVELS.md is placed off the walkways. |
| L3 | `HazardDef` (trap) | `art?: { x, y, flipX? }` visual anchor/facing. Until then, draw the trap sprite centred on the rect's bottom edge (§4.6). |
| L4 | Traps | Deterministic one-at-a-time rule (kill, then ignore everyone until `cooldownSeconds` elapse); applies to walkers **and** fallers. Levels 9 and 12 depend on it. |
| L5 | `cameraX` | Honour it (level 10 starts at 600). |
| L6 | Hatch order | ABBA for 2 hatches (`ENTRANCE_ORDER`); level 10 depends on it. |
| L7 | Bomber crater | The 16×22 elliptical mask must leave a walkable bowl on a 16 px floor (level 10). |
| L8 | Climber overhang check | Keep the ceiling check at (x−dir, y−8) exactly; levels 11 and 12 use overhangs as "climber bouncers". |
| L9 | Builder | Left/right symmetric: a left stair starts at the foot and extends 27 px ahead (level 10). |
| L10 | Camera | `VIEW_WIDTH` 400 (= N1); the 400 px Breezy levels fit one screen. |
| L11 | Session end | SHOULD auto-end when only blockers remain and nothing can change. Otherwise announce #13 (§7.3) and rely on Pop all. |
| L12 | Tests | The preview sim is a design aid: its jumps are instant, its masks rectangular, and its climber tops out when the wall column ends. **Re-verify every level in the real engine** with one replay test per level, from the "Sim solution data" blocks in LEVELS.md. |

---
