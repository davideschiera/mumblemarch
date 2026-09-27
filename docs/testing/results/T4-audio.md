# T4 — Audio (Phase 5)

Build under test: production snapshot on port 5218 (`node scripts/snapshot.mjs 5218 …`), plus an
independent offline-render harness (esbuild-bundled from the **real** `src/audio/{sfx,synth,
sfx-ids,limiter,music,music-data}.ts` — not the design mockup) served on port 5228, rendering each
recipe through `OfflineAudioContext` in the same Chrome. No `src/` files were read into that
harness's output — only imported and bundled for measurement.

## Case results

| Case | Expected (spec ref) | Result | Evidence |
|---|---|---|---|
| 1. No AudioContext before gesture | DESIGN §8.1 "no sound before a gesture"; `audioState()`='locked' | **PASS** | Patched `window.AudioContext` on a fresh page before any input: 0 contexts constructed, `__game.audioState()`='locked', 0 console messages. First real `press_key` (Shift) → exactly 1 `AudioContext` constructed, state → 'running' immediately, still 0 console messages (no "not allowed to start" warning). |
| 2. Event → sound → visual/caption mapping | DESIGN §8.3 catalogue, §7.6, §7.7/§9.4 | **PASS** (representative sample; see notes) | Code review: `soundFor()` in `src/audio/event-sounds.ts` matches the §8.3 trigger column and §7.6/§9.4 caption tables exactly, id-for-id (36 ids, no gaps). Live: instrumented `createOscillator`/`createBufferSource` counts confirm real Web Audio nodes are created (not just events logged) for `lets-go`, `entrance-open`, `ui-empty` (none-left), `ui-deny` (no-lemming), `nuke`, `explosion`; oscillator/buffer deltas matched each recipe's node count exactly (e.g. `ui-deny` = +2 osc/+0 buf, `ui-empty` = +1 osc/+1 buf). Captions appeared correctly: "Off we go!" (barks), "[creak… clunk]" (all), "[fizz… pop all!]" + "[pop!]" (nuke/explosion, all-mode); `ui-empty`/`ui-deny` correctly show **no** caption (not in DESIGN §9.4's table). `captions:'off'` → no caption lines. `captions:'barks'` **+ muted** → caption still shown (visual twin is independent of mute, per spec). During a nuke, `lemming-ohno` events still fire but are correctly silent **and captionless** ("one nuke sound instead of a chorus", §8.3). |
| 3. Settings apply immediately + persist | DESIGN §7.11, §8.1 | **PASS** | Identified the 7 bus `GainNode`s by creation order in `AudioEngine.unlock()` (master, sfxBus, voiceBus, musicIn, duckGain, pauseGain, musicBus) and read live `.gain.value`. Defaults on first unlock: master 0.7, sfx 0.8, voice 0.8, music 0.35 — exact §7.11/§8.1 defaults (music low, not off, per §8.1 "ON by default, low"). Dragging each of the 4 volume sliders updates the matching bus gain within the same rAF/ramp window (~<250 ms, consistent with the 0.02 s `setTargetAtTime` constant); `M`/pause-menu path not tested but the Settings **mute** checkbox ramps master → 0 within ~20-40 ms and restores exactly on uncheck. `M` key mutes/unmutes **in-game** (master → 0 → back to 0.3), announces "Sound off"/status "🔇 Muted" (§7.3 #20). Reload with saved `{master:.3, sfx:.4, voice:.5, music:.6}` → engine re-initialises at those exact values (persistence confirmed via `localStorage['mumblemarch.save']` and live gain read after reload). One early reading appeared to show `musicVolume` not propagating in a 4-slider-in-a-row batch; two clean, fully-logged repeats of the identical sequence (incl. from cleared defaults) both showed correct, immediate propagation for all 4 buses every time — treating as a test-harness artifact, not a product bug (not filed). |
| 4. No clipping / loudness targets | DESIGN §8.2/§8.3 | **PASS**, 36/36 | See table below. All 36 recipes' peaks ≤ −6.5 dBFS (spec ceiling −6 dBFS) and within ≤0.8 dB of the DESIGN §8.3 reference numbers (re-derived independently from the shipped `src/audio/sfx.ts`, not copied from the doc). Loud (short-term max RMS) within ≤0.6 dB of each tier target. Music: 6/6 themes render with 0 errors, peak ≤ −7.5…−10.6 dBFS (target ≤ −6), all safely in range (measured over a 4 s excerpt — see note). **Worst case**: 20 simultaneous `explosion` triggers with *no* rate-limiting, through `master→limiter→destination`: peak **+2.6 dBFS** (would clip/distort) — the `DynamicsCompressorNode` alone does not prevent this (matches DESIGN §8.1 "the limiter is a safety net only"). With the real `SfxLimiter` gating (as `AudioEngine.play()` always applies — no code path calls `SFX[id]` directly), only 2/20 rapid-fire triggers pass and peak drops to −4.4 dBFS. |
| 5. Rate limiting / polyphony | DESIGN §8.5 | **PASS** | Live in-game: released 10 mumbles, then `nuke()`. Core logged 10 `explosion` + 10 `lemming-died` + 10 `lemming-ohno` (silenced) events, but the oscillator/buffer-source delta for the whole sequence (nuke stinger + explosions + level-lost stinger) was only +9 osc/+1 buf — far below the ~24 osc/10 buf a naive unthrottled render of 10 explosions + nuke would need — confirming `SfxLimiter`'s 80 ms min-gap / 6-voice cap collapses near-simultaneous pops into a staggered cascade, never a wall of sound. |
| 6. Tab hidden / pause ducks | DESIGN §8.5, §6.4.8 | **PASS** (with caveat) | `P` (pause) → `pauseGain` ramps to exactly 0.3162 (−10 dB) within 300 ms; unpause restores to 1. Verified `document.hidden`/`visibilitychange` path directly (Chrome's `select_page` between two automation-owned tabs did not actually flip `document.visibilityState` for the backgrounded tab, so `document.hidden` was overridden via `Object.defineProperty` + a dispatched `visibilitychange` event) → `controller.autoPause('hidden')` fires, `ui().paused` → true, music duck engages identically. True OS-level tab-switch behaviour not independently confirmed. |
| 7. Console errors/warnings | — | **PASS** | `list_console_messages` returned 0 messages on both the game page and the offline-measurement page across the entire session. |

## Case 4 — measured recipe loudness (offline, unity bus gain, 44.1 kHz)

All 36 `SfxId`s, rendered via `SFX[id](ctx, out, 0, pitch=1)` into a 2.5 s `OfflineAudioContext`,
`out` = a unity-gain node → destination (matches DESIGN §8.2 methodology). Δ = mine − DESIGN §8.3.

| SfxId | Peak (dBFS) | Δ Peak | Loud/50ms-RMS (dBFS) | Δ Loud | Dur (ms) |
|---|---|---|---|---|---|
| ui-move | −13.2 | 0.0 | −27.0 | 0.0 | 44 |
| ui-select | −14.2 | 0.0 | −26.5 | +0.5 | 119 |
| ui-back | −14.3 | 0.0 | −26.5 | +0.5 | 119 |
| ui-deny | −17.3 | 0.0 | −27.0 | 0.0 | 174 |
| ui-empty | −16.6 | 0.0 | −27.0 | 0.0 | 104 |
| ui-arm | −16.9 | 0.0 | −27.0 | 0.0 | 313 |
| pause | −15.4 | 0.0 | −27.0 | 0.0 | 195 |
| unpause | −15.6 | −0.2 | −27.0 | 0.0 | 195 |
| ff-on | −13.5 | 0.0 | −27.0 | 0.0 | 144 |
| ff-off | −13.4 | +0.1 | −27.0 | 0.0 | 143 |
| rr-up | −9.9 | 0.0 | −27.0 | 0.0 | 32 |
| rr-down | −10.7 | −0.8 | −27.0 | 0.0 | 33 |
| undo | −17.4 | 0.0 | −27.0 | 0.0 | 160 |
| assign | −8.8 | 0.0 | −22.0 | 0.0 | 71 |
| fuse | −11.1 | 0.0 | −22.0 | 0.0 | 357 |
| builder-low | −10.4 | 0.0 | −22.0 | 0.0 | 121 |
| builder-shrug | −17.5 | 0.0 | −21.9 | +0.1 | 300 |
| steel | −12.3 | 0.0 | −22.0 | 0.0 | 160 |
| time-low | −8.3 | 0.0 | −22.0 | 0.0 | 309 |
| lets-go | −13.5 | 0.0 | −18.0 | 0.0 | 430 |
| ohno | −13.7 | 0.0 | −18.0 | 0.0 | 470 |
| exit | −11.2 | 0.0 | −18.0 | 0.0 | 366 |
| entrance-open | −9.7 | 0.0 | −17.9 | +0.1 | 681 |
| splat | −8.2 | 0.0 | −18.0 | 0.0 | 140 |
| drown | −6.5 | 0.0 | −19.1 | +0.3 | 385 |
| burn | −7.5 | 0.0 | −18.0 | 0.0 | 430 |
| trap | −8.8 | 0.0 | −18.0 | 0.0 | 134 |
| trap-flytrap | −8.5 | 0.0 | −18.0 | 0.0 | 422 |
| trap-press | −10.3 | 0.0 | −18.0 | 0.0 | 421 |
| trap-pendulum | −11.6 | 0.0 | −18.0 | 0.0 | 787 |
| trap-piston | −8.1 | 0.0 | −18.0 | 0.0 | 505 |
| trap-clam | −8.6 | 0.0 | −18.0 | 0.0 | 411 |
| explosion | −6.5 | 0.0 | −18.7 | 0.0 | 217 |
| nuke | −9.0 | 0.0 | −17.9 | +0.1 | 764 |
| level-won | −11.4 | 0.0 | −18.0 | 0.0 | 873 |
| level-lost | −11.3 | 0.0 | −18.0 | 0.0 | 1111 |

**36/36 in range** (peak ≤ −6 dBFS target, all Δ ≤ 0.8 dB). This independently re-confirms the
D-V2 dev validation (`docs/development/DEV_TASKS.md`) from the actual shipped `src/audio/*.ts`,
not the mockup.

### Music (4 s excerpt of each loop, unity gain)

| Theme | Peak (dBFS) | Δ vs §8.6 | Active RMS | Δ |
|---|---|---|---|---|
| title | −8.2 | −0.7 | −25.6 | +0.2 |
| mossgrove | −8.5 | −1.0 | −25.7 | +0.4 |
| sugarworks | −8.7 | −0.9 | −25.8 | +0.3 |
| observatory | −10.6 | 0.0 | −24.3 | +0.2 |
| foundry | −7.5 | 0.0 | −24.7 | 0.0 |
| reef | −8.2 | −1.0 | −24.2 | +0.3 |

All comfortably under the −6 dBFS peak ceiling; the small negative Δs are consistent with only
sampling the first 4 s of an 8-16 s loop (not the full loop, per the brief's "a few seconds"
allowance) rather than a defect — no id exceeded 1 dB.

## Bugs filed

- **AUD-1** (minor): the caption strip never relocates to top-left when the cursor/selected mumble
  is over it (DESIGN §7.7). `src/ui/hud/captions.ts` documents this as an intentional gap
  ("skipped — the view is given no on-screen position"), not an accidental regression.

## Not independently verified (budget / setup)

- `splat`, `drown`, `burn`, `exit`, `builder-low`/`builder-shrug`, `steel`, `time-low`, and the 5
  `trap-*` variants were **not** individually re-triggered live in this pass (would need engineered
  hazard/exit scenarios per level); their `soundFor()` mapping and §9.4 caption text were verified
  by direct code comparison against DESIGN §8.3/§9.4 (exact match, no gaps), and the general
  event→sound→caption pipeline was empirically proven end-to-end on 6 other representative events
  (see Case 2).
- True OS-level tab backgrounding (vs. a simulated `visibilitychange`) was not exercised.
- "While muted the music scheduler keeps its position, so unmuting resumes in time" (§8.1) was not
  measured (would need a long-running timed comparison); not contradicted by anything observed.
