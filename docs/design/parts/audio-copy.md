> **Superseded draft.** Merged into [`../DESIGN.md`](../DESIGN.md), which is authoritative. Kept for the validation trail only; do not edit.

# Audio & copy (W2 draft → DESIGN.md §8–§9)

Worker W2 · 2026-09-26. Every recipe below is implemented and measured in [`mockups/audio-lab.html`](../mockups/audio-lab.html) (screenshot `audio-lab.png`). Port the helpers (`noiseBuffer`, `pulseWave`, `envAD`, `mkFilter`, `tone`, `noise`, `bell`, `voice`) and the `SFX` object 1:1 into `src/audio/synth.ts` + `sfx.ts`. They already match `SfxRecipe = (ctx, out, when, pitch) => void`: only voice chirps and `builder-low` read `pitch`. All sound is synthesized; there are no samples, no speech and nothing modelled on the 1991 sounds (RESEARCH §9, D10).

---

## 1. Audio design

### 1.1 Graph, defaults and the "no sound before a gesture" rule
- **Graph:** `master (0.7) → limiter → destination`; `master ← sfx (0.8)`, `voice (0.8)`, `music (0.35)`.
  - **Limiter:** `DynamicsCompressorNode` with threshold −8 dB, knee 6, ratio 12, attack 3 ms, release 150 ms. It is a safety net only; calibrated sounds never reach it alone.
  - Gains are linear, set with `setTargetAtTime(v, t, 0.02)`.
- **Defaults:** masterVolume 0.7 · sfxVolume 0.8 · voiceVolume 0.8 · **musicVolume 0.35** · musicEnabled **true** · muted false.
  - Effective sfx gain is 0.56 (−5 dB). Effective music gain is 0.245 (−12.2 dB).
- **Music decision: ON by default, low.**
  - It carries pillar 5 (charm) and pillar 6 of the research (calm, then chaos).
  - It sits ≈ 12 dB under event sounds, so it never masks cues.
  - It starts only after a gesture and only inside a level. Menus are quiet, which helps screen-reader users and people adjusting settings.
  - One key (`M`), a Settings toggle and a separate slider turn it off (WCAG 1.4.2).
- **Before a gesture:** `AudioEngine.unlock()` creates the `AudioContext` on the first `pointerdown` or non-Escape `keydown`; `play()` is a no-op until then. The title screen says "Sound starts after your first click or key press."
- **Mute (`M`, Settings, pause menu):**
  - Ramps master to 0 in 20 ms.
  - Persisted in `Settings.muted`.
  - The status line shows a speaker-off glyph and "Muted".
  - While muted the music scheduler keeps its position, so unmuting resumes in time.
  - `musicEnabled: false` stops the scheduler instead.

### 1.2 Loudness targets (measured offline at unity bus gain, 44.1 kHz, 2 s render)
- **Peak ≤ −6 dBFS** for every recipe. At the default mix that is ≤ −11 dBFS at the output.
- **Loudness** = the loudest 50 ms window (short-term RMS), by tier:
  - **UI −27 ± 3 dBFS**: frequent HUD/menu feedback.
  - **Cue −22 ± 3**: gameplay feedback.
  - **Event −18 ± 3**: barks, deaths, traps, stingers.
- **Measured result: 36/36 in range.**
  - Peaks span −17.4 … −6.5 dBFS.
  - Short-term loudness: UI −27.0, Cue −22.0, Event −19.4 … −18.0.
  - Active RMS (start → −60 dB tail): −32.2 … −20.5 dBFS.
- **Re-run:** open the lab and call `await measureAll()` in the console (returns JSON). Measuring needs no gesture.

### 1.3 Sound-event catalogue (recipes, levels and measurements)
Notation: `tri`/`sq`/`saw`/`sin`, `pulse25` (25 % duty); `f→f1` = exponential glide; `a/d` = linear attack / exponential decay to −60 dB (s); `LP/HP/BP` = biquad (Q); `G` = the recipe's level (every part is relative to G). **Dur** = time to −60 dBFS; **Loud** = short-term max RMS.

| SfxId (bus) | Trigger (GameEvent / UI) | Recipe | G | Dur ms | Peak | RMS act. | Loud |
|---|---|---|---|---|---|---|---|
| `ui-move` | menu focus move; selection change (Z/X, snap) | sin 1200 Hz, a .003 d .04 | .2251 | 34 | −13.2 | −25.4 | −27.0 |
| `ui-select` | button press; skill chosen | tri 880 then 1320 (+45 ms), d .05/.07 | .2030 | 101 | −14.2 | −28.4 | −27.0 |
| **NEW** `ui-back` | back, cancel, dialog closed | tri 1320 then 880 | .2033 | 101 | −14.3 | −28.4 | −27.0 |
| `ui-deny` | refusal; Space with no target | 2× sq 185/175 Hz LP 1100, d .06/.08, 90 ms apart | .1387 | 151 | −17.3 | −29.2 | −27.0 |
| **NEW** `ui-empty` | `none-left`; 0-left skill pressed | sin 330→190 d .1 + BP 650 (1.5) noise puff ×.35 | .1518 | 77 | −16.6 | −28.9 | −27.0 |
| **NEW** `ui-arm` | Pop all / Restart armed | tri 660, then tri 880 with 9 Hz ±25 ct vibrato + pulse25 1760 ×.25 ("huh?") | .1368 | 256 | −16.9 | −32.2 | −27.0 |
| **NEW** `pause` / `unpause` | P, button | tri 880→587 / 587→880, two notes 70 ms apart | .174 | 163 | −15.4 | −29.9 | −27.0 |
| **NEW** `ff-on` / `ff-off` | F, button | 2× tri glide 500→1400 / 1400→500 in 60 ms ("zip-zip") | .2225 | 127 | −13.5 | −28.0 | −27.0 |
| **NEW** `rr-up` / `rr-down` | each RR step (input time) | tri 1046 / 784 Hz d .03 + HP 4 k click ×.3 | .3209 | 27 | −9.9 | −24.3 | −27.0 |
| **NEW** `undo` | U | sin 1600→380 (140 ms) + sin 1200→300 ×.5 at +50 ms ("rewind") | .1348 | 127 | −17.4 | −30.1 | −27.0 |
| `assign` | `skill-assigned` (non-bomber) | tri 260→150 d .07 + LP 2.2 k click ×.25 ("thunk-pop") | .4105 | 62 | −8.8 | −22.9 | −22.0 |
| **NEW** `fuse` | `skill-assigned` bomber | HP 4.5 k noise hiss d .35 ×.5 + 5 BP 3.2 k crackle ticks + sin 1800→2700 ×.3 | .3839 | 297 | −11.1 | −28.8 | −22.0 |
| `builder-low` | `builder-low-bricks` (pitch 1 / 7⁄6 / 4⁄3 for 3/2/1 left) | tri 1800·p d .12 + sin 3600·p ×.25 ("plink") | .3124 | 101 | −10.4 | −25.0 | −22.0 |
| **NEW** `builder-shrug` (voice) | `builder-finished` | voice "hmm?": 330 Hz then 300→400 rising, F1 300 / F2 1000–1100 | .2339 | 299 | −17.5 | −25.9 | −22.0 |
| `steel` | `hit-steel`; `steel`/`one-way` refusal | FM bell 1760 Hz, ratio 1.41, index 3, d .16 + BP 5 k tick ("tink") | .2288 | 128 | −12.3 | −26.0 | −22.0 |
| `time-low` | `time-low` 60/30/10 s | woodblock: sin 820 + BP 1.6 k click, then sin 620 + BP 1.3 k at +250 ms ("tick-tock") | .3995 | 301 | −8.3 | −27.3 | −22.0 |
| `lets-go` (voice) | `lets-go` (tick 15) | **"Off we go!"**: 3 rising syllables 500→540, 600→660, 760→900 Hz; formants o(520/900) · e(380/2100) · o(480/900→800); 7 Hz ±20 ct | .3279 | 429 | −13.5 | −24.3 | −18.0 |
| `ohno` (voice) | `lemming-ohno` (silent if `nuking`) | **"Uh-oh…"**: 700→690 Hz "uh" (620/1150), then 560→420 Hz "oh" (470/820→760), 6 Hz ±45 ct wobble | .3224 | 470 | −13.7 | −21.5 | −18.0 |
| `exit` (voice) | `lemming-exited` | **"Wheee!"**: glide 600→1400 Hz over 300 ms on "ee" (320/2300→2600) + sparkle sin 2637/3136/3951 at +180/240/300 ms ×.05 | 1.4388 | 351 | −11.2 | −21.8 | −18.0 |
| `entrance-open` | `entrance-opened` (tick 35) | creak: saw 92 Hz, 11 Hz ±120 ct wobble, BP 950→600 (Q 7), a .06 d .42; clunk at +500 ms: sin 120→55 ×1.4 + LP 450 noise ×.8 | .2555 | 654 | −9.7 | −28.9 | −18.0 |
| `splat` | `lemming-died` splat | sin 150→45 d .14 + LP 900→200 noise ×.6 + tri 240→120 "flop" ×.4 | .3748 | 120 | −8.2 | −21.8 | −18.0 |
| `drown` | `lemming-died` drown | 6 bubbles: sin f→2.4f in 40 ms (260/340/300/420/380/480 Hz at 0/60/110/190/240/330 ms) + LP 500 noise ×.25 | .4775 | 378 | −6.5 | −20.5 | −19.4 |
| `burn` | `lemming-died` burn | HP 2.5 k noise a .03 d .4 + BP 1200→500 (Q 3) ×.6 + sin 420→150 ×.4 ("tsss") | .2825 | 373 | −7.5 | −25.3 | −18.0 |
| `trap` | fallback (unknown theme) | BP 2.5 k snap + sq 190→80 LP 800 ×.6 | .5554 | 117 | −8.8 | −21.6 | −18.0 |
| **NEW** `trap-flytrap` | `trap-triggered`, mossgrove | snap BP 2.2 k; chomps sq 210→95 (+50 ms), 185→85 (+160 ms) LP 700; gulp sin 320→120 (+280 ms) | .4577 | 403 | −8.5 | −23.4 | −18.0 |
| **NEW** `trap-press` | sugarworks cookie-cutter | click BP 3.2 k; thud sin 110→50 ×1.2 (+80 ms) + LP 500 noise; boing sin 290 Hz, 14 Hz ±180 ct, d .35 ×.35 | .2766 | 361 | −10.3 | −25.9 | −18.0 |
| **NEW** `trap-pendulum` | observatory brass pendulum | swish: noise BP 400→2200→500 (Q 2.5), a .14 d .26; clang at +340 ms: FM bell 1400, ratio 1.41, index 2, d .45 ×.3 | .8237 | 701 | −11.6 | −26.6 | −18.0 |
| **NEW** `trap-piston` | foundry piston hammer | HP 3 k hiss ×.4; at +200 ms: sin 90→40 ×1.2 + LP 1.2 k noise + FM ring 620 Hz, ratio 2.76 ×.3 | .2490 | 451 | −8.1 | −27.1 | −18.0 |
| **NEW** `trap-clam` | reef giant clam | 2× BP 1.3 k (Q 4) clacks 70 ms apart; gloop sin 520→180 ×.8; 2 bubbles | .4760 | 403 | −8.6 | −25.7 | −18.0 |
| `explosion` | `explosion` | sq 900→150 click ×.5 + LP 5 k→250 noise d .3 + sin 120→40 d .22 ("pop!") | .2455 | 190 | −6.5 | −24.3 | −18.7 |
| `nuke` | `nuke-started` (Pop all) | saw 180→720 over 700 ms, LP 1400 (Q 3), 12 Hz ±40 ct + sin 1500→3000 "fwip" at +660 ms ×.5 | .2821 | 742 | −9.0 | −26.4 | −18.0 |
| `level-won` | `level-ended` won | pulse25 C5-E5-G5 (90 ms steps) → C6 pulse25 + C5 tri d .6 + 3 sparkle pings | .2122 | 761 | −11.4 | −26.8 | −18.0 |
| `level-lost` | `level-ended` lost | tri E5 · C5 · D5 (last one held, 5 Hz vibrato): a hopeful "try again", never a sad trombone | .2764 | 996 | −11.3 | −26.8 | −18.0 |

**Not sounded:**
- `lemming-spawned`, `all-released`: too frequent or no value.
- `release-rate-changed`: the UI plays `rr-*` at input time.
- `lemming-died` with `explode` or `out-of-bounds`: the explosion already sounds; falling out is silent.
- `lemming-died` with `trap`: `trap-triggered` plays the variant instead.

### 1.4 Voice: per-mumble pitch
- `pitchSemitones(id) = ((id × 5 + 3) mod 7) − 3` gives **−3 … +3 semitones**, and 7 consecutive ids never repeat. `pitch = 2^(st/12)`.
- Applied to `ohno`, `exit` and `builder-shrug`. `lets-go` is level-wide (pitch 1).
- Only the glottal pitch moves; the formants stay put, so high mumbles sound smaller, not chipmunked.

### 1.5 Mixing rules
- **Rate limits and polyphony** (engine default: 1 trigger per id per 60 ms). Overrides:

| Id(s) | Min gap | Max concurrent |
|---|---|---|
| `explosion` | 80 ms | 6 |
| `exit` | 120 ms | 3 |
| `splat` | 100 ms | 3 |
| `drown` | 150 ms | 3 |
| `burn`, `trap-*` | 150 ms | 2 |
| `steel` | 90 ms | — |
| `ohno` | 150 ms | — |
| `ui-move` | 40 ms | — |
| `rr-*` | 50 ms | — |
| `lets-go`, `entrance-open`, `nuke`, `level-*` | once per level | — |

  Concurrency is tracked as id → end times (end = when + measured Dur). Over the cap, the trigger is dropped. During Pop all this gives a staggered cascade of pops, never a roar.
- **Ducking** (music bus only, `setTargetAtTime`):
  - voice chirp: −6 dB (attack 20 ms, release 300 ms);
  - `explosion`/`nuke`: −3 dB;
  - **pause**: −10 dB + a 900 Hz low-pass;
  - level end: music fades out over 400 ms, then the stinger plays.
  - SFX are never ducked.
- **Pitch arg** for `builder-low`: `{3: 1, 2: 7/6, 1: 4/3}[bricksLeft]` (≈ 1.8 / 2.1 / 2.4 kHz, rising urgency).

### 1.6 Music: original procedural chiptune (validated in the lab: all 6 parse with 0 errors)
- **Concept:** one short loop per theme, march-like and bouncy. The lab's sequencer:
  - **lead:** pulse or triangle, 5 ms attack, falls to 55 % in 80 ms, 90 % legato;
  - **bass:** triangle, staccato 55 % of a beat;
  - **drums:** noise/sine — kick = sin 150→45 Hz over 150 ms, snare = BP 1.8 k noise + tri 190 Hz, hat = HP 7 k noise over 30 ms;
  - **arp:** pulse 50 %, 16ths.
  - Mix at unity: lead .07 (triangle ×1.6), bass .164, arp .029, kick .246, snare .082, hat .029.
- **Scheduling:** 100 ms look-ahead on a 25 ms timer. The theme loop **starts at tick 55** (after the first mumble drops) with a 1.5 s fade-in and loops seamlessly. FF does not change the tempo. It stops at `level-ended`.
- **Per-level variety:** the variant is the level's index within its theme, mod 3. It transposes by +0 / +2 / −3 semitones and shifts the tempo by 0 / +4 / −4 BPM.
- **Title jingle:** plays once per session on the first gesture on the title screen (if music is enabled). There is no menu loop.
- **Results:** the `level-won` / `level-lost` stingers.

| Theme | Title | BPM | Key | Lead | Bass / drums | Loop | Peak / RMS (dBFS, unity) |
|---|---|---|---|---|---|---|---|
| title | Doorstep Fanfare | 124 | C major | pulse 25 % | root–fifth / k-s + 8th hats | 4 bars, one-shot 7.7 s | −7.5 / −25.8 |
| mossgrove | Bog Hop | 116 | G major | pulse 25 % | walking arpeggio / off-beat hats | 8 bars 16.6 s | −7.5 / −26.1 |
| sugarworks | Taffy Pull | 132 | F major | pulse 12.5 % (thin, candy) | oom-pah / 8th hats | 8 bars 14.5 s | −7.8 / −26.1 |
| observatory | Clockwork Stars | 100 | D dorian | triangle + pulse-50 arp | half notes / soft quarter ticks, no kick | 8 bars 19.2 s | −10.6 / −24.5 |
| foundry | Piston Polka | 150 | A harmonic minor | pulse 50 % | root–fifth / four-on-floor | 8 bars 12.8 s | −7.5 / −24.7 |
| reef | Tide Tumble | 108 | B♭ major | triangle + echo (3⁄16, fb .3) | root–fifth–third / syncopated | 8 bars 17.8 s | −7.2 / −24.5 |

**Music target:** peak ≤ −6 dBFS, loop RMS −25 ± 2 at unity. At the default mix that is ≈ −37 dBFS RMS.

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
All melodies were written for this game from chord tones over simple progressions. None quotes the 1991 tune list or its arrangements (RESEARCH §5.2).

---

## 2. Copywriting voice

### 2.1 Tone rules (MUST)
1. **Warm and on the player's side.** Cheer the mumbles and the player; never mock (no sarcastic put-downs, and no wording borrowed from the original's results screen).
2. **Short and plain.**
   - Status/HUD ≤ 28 characters.
   - Announcements ≤ 90 characters.
   - Verdicts ≤ 70 characters.
   - Aim for a reading age of about 9. One idea per line.
3. **Sentence case, no ALL CAPS** (screen readers spell caps out). At most one "!" per line. Digits for numbers.
4. **"mumble / mumbles"**, lower case except at the start of a sentence (D1). Never "Lemm-".
5. **Functional text is literal; flavour text may play.**
   - Refusals, settings and help say exactly what happened and what to do.
   - Puns live only in titles, barks and verdicts.
6. **Cartoon, not grim.** Mumbles "go splat", "go pop", "take an unplanned swim". Never gore, never blame words ("failed", "wrong", "stupid").
7. **Next step included.** Failure copy always offers a way forward (try again, hint, different job).

### 2.2 Title & tagline
**Mumblemarch**. Tagline (recommended first):
- "Little feet, big plans."
- "Every mumble matters."
- "They march. You make the plan."

### 2.3 Sample strings

| Context | Strings |
|---|---|
| Title menu | Start · Continue — {n} · {title} · Levels · How to play · Settings · "Sound starts after your first click or key press." |
| Tier blurbs | **Breezy** "Gentle first steps" · **Knotty** "A few tangles" · **Gnarly** "Think it through" · **Stampede** "Everything at once" |
| Level card | "Level {n}" · "Completed · best {s} of {t}" · "Everyone home" (100 %) · "Locked · finish level {n−1} first" · "New" |
| Briefing | "Level 3 · Breezy" · **Mumbles: 20 · Save: 10 · Release rate: 50 · Time: 5:00 · Tier: Breezy** · "Skills" · "Show hint" · "Let's march!" · "Back to levels" · relaxed: "Time: 5:00 · relaxed" |
| HUD | Slower / Faster (RR aria) · "1.6 s" · skill names · Pause · Fast · Pop all · Press again · Popping… · Pick: All / Walkers / Facing ← / Facing → · Follow |
| Status line | `Walker ×3` · `Builder · 4 bricks` · `Climber + Floater` · `Selected: Digger` · `Out 12` · `Saved 3 ▰▰▱▱ need 8` · `goal met ✓` · `Time 4:12` · `Time +0:12 · relaxed` · `Muted` · `Ready: 2 jobs start when you resume` · `No mumble here` |
| Plates | "⏸ Paused — you can still assign skills" · "⏩ ×3" · "Press Pop all again (or N) to pop every mumble · Esc cancels" · "Press R again to restart · Esc cancels" |
| Pause menu | "Paused" · "Saved 3 · need 8 of 20 · 4:12 left" · Resume · Restart level · Show briefing · How to play · Settings · Quit to levels · "Restart? Your mumbles go back to the hatch." [Restart] [Cancel] |
| Help intro | "Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs. Pick a skill, then pick a mumble. Pause any time — you can still give jobs while paused." |
| Contextual tips (SHOULD, once each) | "Tip: press P to pause. You can still give jobs." · "Tip: X and Z pick mumbles one by one." · "Tip: V picks only walkers in a crowd." |
| Refusals | exactly as `interaction-a11y.md` §5 (e.g. "Can't dig: steel below", "Already a climber", "No diggers left") |

### 2.4 Bark & sound captions (strip; `barks` = quoted lines, `all` adds bracketed ones)
| SfxId | Caption | SfxId | Caption |
|---|---|---|---|
| `lets-go` | Off we go! | `splat` / `drown` / `burn` | [splat] / [glug glug] / [tsss!] |
| `ohno` | Uh-oh… | `trap-flytrap` / `-press` | [snap! chomp chomp] / [ka-chunk!] |
| `exit` | Wheee! (×n when coalesced) | `trap-pendulum` / `-piston` / `-clam` | [swish… clang] / [hiss… bang!] / [clack-gloop] |
| `builder-shrug` | Out of planks! | `explosion` / `nuke` | [pop!] / [fizz… pop all!] |
| `entrance-open` | [creak… clunk] | `steel` / `builder-low` / `fuse` / `time-low` | [tink] / [plink] / [fizz] / [tick-tock] |

### 2.5 Results: headline, score line, graded verdict
- **Headline:**
  - won: **"Level complete!"**;
  - lost, all resolved: **"Not quite this time"**;
  - lost at time-up: **"Time's up!"**.
- **Score line:** "You saved **{S}** of {T} · needed {R}".
- **Verdict:**
  - Symbols: S saved, R required, T total, `m = max(1, round(T × 0.05))`.
  - Rules are checked top to bottom, **counted in mumbles, not % points**, so small levels can reach every line.
  - Variant = attempt count mod 2 (deterministic).

| # | Condition | Variant A | Variant B |
|---|---|---|---|
| 1 | S = T | "Every single mumble made it home. Take a bow!" | "A full house! Nobody left behind." |
| 2 | S = 0 | "Nobody made it home this time. Fancy another go?" | "Not one through yet. The hatch is ready when you are." |
| 3 | S < ⌈R/2⌉ (far below) | "That route needs a rethink. Try a different first job?" | "Plenty to figure out here. Peek at the hint if you like." |
| 4 | S < R − m (below) | "Getting there! A couple of tweaks and they're home." | "Good progress. A few more mumbles and it's yours." |
| 5 | S < R (just below) | "So close! Just {R−S} more needed." | "A whisker short: {R−S} more and it's done." |
| 6 | S = R (exactly) | "Bang on the number. Every mumble counted!" | "Exactly enough. Phew!" |
| 7 | S ≥ R + max(2, ⌈(T−R)/2⌉) (way above) | "Brilliant! You marched right past the target." | "What a crowd at the exit. Nicely marched!" |
| 8 | otherwise (comfortably above) | "Nicely done. That went smoothly." | "Tidy work. On to the next one?" |

- **Relaxed-timer note** (under the verdict, muted text):
  - overtime: "Played with the relaxed timer · finished {m:ss} into overtime.";
  - otherwise: "Played with the relaxed timer.".
- **Extra line when won in time:** "Beat the clock ✓" (standard timer only).
- **Badge:** "New best!".

### 2.6 Level-title style guide
- **Length and form:** ≤ 28 characters, sentence case, no numbering in the title.
- **Breezy (hint titles):**
  - name the verb or the prop, never the answer's location;
  - one skill per title, spoken like a friendly foreman.
- **Knotty and up:** theme flavour plus a gentle nudge; puns allowed.
- **Never** reuse or paraphrase any title from the original games (RESEARCH §9). The level worker owns the final list and must check each title against this rule.
- **Examples** (all new):
  - "Spade first, questions later" (digger)
  - "Puff up, drift down" (floater)
  - "Paddles up, everyone wait" (blocker)
  - "Plank by plank" (builder)
  - "Mitts through the middle" (basher)
  - "Pick a slant" (miner)
  - "Suction cups, go!" (climber)
  - "One pop opens the door" (bomber)
  - "Caramel is not a bath"
  - "Tick, tock, pendulum"
  - "Two jobs, one crowd"
  - "The long way is shorter"
  - "The clam is not hungry. Yet."
  - "Stampede o'clock"

### 2.7 `ui/strings.ts`-ready table
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
// Verdict lines: the table in audio-copy.md §2.5 → export const VERDICTS: readonly [string, string][] (rows 1–8, {n} = R−S).
```

---

## 3. Notes for architecture/dev

| # | Where | Change |
|---|---|---|
| S1 | `audio/sfx.ts` | Add the 17 NEW ids (`ui-back`, `ui-empty`, `ui-arm`, `pause`, `unpause`, `ff-on`, `ff-off`, `rr-up`, `rr-down`, `undo`, `fuse`, `builder-shrug`, `trap-flytrap`, `trap-press`, `trap-pendulum`, `trap-piston`, `trap-clam`). Port the lab helpers into `audio/synth.ts`. Add `builder-shrug` to `VOICE_SFX`. |
| S2 | `audio/event-sounds.ts` | `soundFor(event, ctx: {themeId, lemmingPitch(id)})` returns `{id, pitch}`: bomber assign → `fuse`; `none-left` → `ui-empty`; `steel`/`one-way` → `steel`; `level-ended` refusal → null; `trap-triggered` → the theme variant; `lemming-died{trap}` → null; `builder-finished` → `builder-shrug`; `builder-low-bricks` pitch per bricks left. |
| S3 | `audio/audio-engine.ts` | Master limiter (§1.1). Per-id `{minGapMs, maxVoices, durMs}` table (§1.5). `duck(db, attack, release)` on the music bus. Pause duck + low-pass. |
| S4 | `audio/music.ts` | Port the lab sequencer (`compileTheme`, `scheduleTheme`, look-ahead pump). Start at tick 55, per-level variant, title jingle once per session. |
| S5 | `persistence/schema.ts` | `musicVolume` default **0.35**; other audio defaults unchanged. |
| S6 | Controller | Plays UI sounds at input time (`ui-select`, `ui-move`, `pause`/`unpause`, `ff-*`, `rr-*`, `ui-arm`, `undo`, `ui-back`). The caption strip reads `CAPTIONS`/`SOUND_CAPTIONS` from the same `{id}` that `soundFor` returns, so the visual twin never drifts from the sound. |
| S7 | `ui/strings.ts` | Replace with §2.7 (and `GAME_TITLE = 'Mumblemarch'`). Add `VERDICTS` (§2.5) and `verdictFor(S, R, T, attempt)` with a unit test covering all 8 rows for T = 10, 20 and 80. |
