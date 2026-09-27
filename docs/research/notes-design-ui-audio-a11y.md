# Research notes: design spirit, UI/HUD, audio, level design, accessibility, IP

Worker B · 2026-09-26 · Research only. Original on-screen texts are quoted **for tone and reference only**. None of them may ship verbatim.
Legend: **approx.** = derived or estimated; **unverified** = no primary source confirmed it.

Primary sources I leaned on: the 1991 DOS manual ([lakora.us](https://www.lakora.us/lemmings/dox/)), the Amiga manual ([goodolddays.net](https://www.goodolddays.net/files/games/Lemmings/Files/Amiga-OCS/Lemmings-Manual.htm)), Mike Dailly's *Complete History of Lemmings* ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)), Lemmings Wiki pages (read through the MediaWiki API), the Lemmix source (a DOS-faithful clone; I used its strings and logic, [github](https://github.com/ericlangedijk/Lemmix)) and USPTO TSDR.

---

# 1. Design spirit & pillars

## Origin facts (with developer quotes)
- **August 1989.** DMA Design was starting *Walker*, a follow-up to *Blood Money*. Scott Johnston drew little men for the walker to shoot at "in a 16 by 16 pixel box". Mike Dailly: "I however maintained that they could be done in less; 8 by 8 pixels… This only took an hour or so to make." The same lunchtime Deluxe Paint animation included a gun and "the 10 ton weight". ([lemmings.info](https://lemmings.info/lemmings-gamehistory/))
- **Gary Timmons** added "the chomping mouth, the clapping hand and the rotating thing", and he fixed the walker. Dailly: "My one, is a bit 'stiff', while Gary's is clearly the one that was used in the game." (same source; also [Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game)))
- **Russell Kay** "first laughed 'There's a game in that!'". He also coined the name "Lemmings" and built the first demo, which was shown to Psygnosis at the PCW show in late September 1989. ([lemmings.info](https://lemmings.info/lemmings-gamehistory/))
- **Dave Jones** described it this way: "a small animation of a bunch of little guys walking up a hill. As they reached the top they got nuked up by a big gun." He added: "It was so damn addictive and also made people laugh when they played it; a rare combination in games." ([Game Developer](https://www.gamedeveloper.com/game-platforms/playing-catch-up-i-gta-lemmings-i-dave-jones)) Slapstick death was part of the concept from the very first day.
- **Look:** the colours were picked "because of the PC EGA palette… it was decided the green hair was nicer than blue" ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)). The droopy nose was inspired by *The Wombles* ([Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings)).
- **Voice:** Carol Johnston (Scott's mum) "was the first voice of the lemmings, and while they got sped up a little, they were pretty much unchanged." ([lemmings.info](https://lemmings.info/lemmings-gamehistory/))
- **Genre:** *Amiga Power* (1991) called it "the first major game to introduce the 'indirect-control' concept". ([Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game)))
- **Tone:** the Amiga title scroller says "Remember / The needs of the many / outweigh the needs of the few." It also carries a disclaimer for "Loss of sleep / Loss of hair / Loss of sanity / The elevator music". ([Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings))

## Pillars and what they mean for us
| Pillar | How it shows in the original | Implication for our remake |
|---|---|---|
| **Indirect control** | "you have no immediate control over the actions of our little green-haired friends. The only thing you can do is promote some of them…" ([DOS manual](https://www.lakora.us/lemmings/dox/)) | Input is only *pick a skill, then pick a critter*. Critters are otherwise autonomous and deterministic. |
| **Flow as a resource** | A steady stream comes out of the hatch. Release rate runs 1–99 and can be raised but never lowered below the level's value. At 1 it is "one every few seconds"; at 99 it is "a veritable flood". (DOS manual) | Release rate is a real puzzle lever for spacing and bunching. Crowds are both a resource and a hazard. |
| **Scarce skill budget = the puzzle** | Each level sets a count per skill, shown above the icon. "A blank space… indicates that you have none of these skills left." (DOS manual) | Per-skill counts in level data. The skill set itself is a hint. Show zero clearly. |
| **Puzzle + time pressure + dexterity** | Assignment happens only in real time ([Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game))). Manual tips: use "the keyboard to select the icons and the mouse to choose a Lemming at the same time" and "the difference between a Lemming going splat! and… walking away… can be a single pixel!" Jones: "It was really a mouse game and needed the level of precision only a mouse could give." | Keep timing as optional spice. Assists in §5 remove the need for dexterity without removing the puzzle. |
| **Humour and charm** | Tiny sprites with big personality; slapstick deaths; manual voice ("They really hate when this happens" for the Bomber); voice barks; builder shrugs | Carry charm through animation and sound, not through text. |
| **Calm then chaos** (my analysis) | Preview screen → "Let's go!" → hatch creak → a trickle that becomes a crowd pressing on a hazard. The manual calls Nuke "a great tension reliever". | Open each level quietly. Crises emerge from the flow; nobody scripts them. |
| **Sacrifice** | Bombers die. Blockers stand "until the level timer runs out" unless you bomb them. Fun 6, *A task for blockers and bombers*, teaches this. Scroller: "needs of the many…" | Save requirement below 100% gives room for deliberate sacrifices. |
| **Multiple solutions** | Dailly: "this was the beauty of Lemmings; there were so many ways of completing a level." Jones would say "There! Beat that!" and the team found "a totally new way… in a much simpler method". | Accept creative alternative solutions ("backroutes") as long as they are fun. |
| **"Save X%" slack** | Fun 1: 10 lemmings, 10% needed ([Lemmings Wiki: Just dig!](https://lemmings.fandom.com/wiki/Just_dig!)). The required % rises with rating. | Tune the slack per difficulty tier. |
| **Smooth learning curve** | Gary Timmons graded and ordered the levels. Early levels were "so simple, that some under 5's managed to play the first few levels unaided." Dailly: "This I believe is where many games fall down today, they don't spend the time making a good learning curve." | Teach one verb per level early on. Playtest the ordering. |

---

# 2. UI/HUD of the original (DOS/Amiga)

## Screen layout
- **Viewport:** roughly the top three-quarters of the screen ("top three-quarters", DOS manual). It scrolls horizontally when you push the cursor against the left or right edge. Holding the **right mouse button** scrolls faster, and **clicking the minimap** jumps there (DOS and Amiga manuals).
- **Status line:** one row of text between the viewport and the icon panel.
- **Icon panel:** 12 buttons, with the **minimap** to their right. The Amiga manual also says you can drag the cursor over the minimap to scroll.

## Icon panel, left to right ([Lemmings Wiki: Ability Panel](https://lemmings.fandom.com/wiki/Ability_Panel), DOS/Amiga manuals)
| # | Button | Number above it | DOS key | Notes |
|---|---|---|---|---|
| 1 | Release rate − | the level's **minimum** (initial) rate | F1 | Can't go below the initial rate. Must be **held** to slide the value (Wiki). |
| 2 | Release rate + | the **current** rate | F2 | Also held to slide. |
| 3 | Climber | uses left | F3 | Permanent for that lemming. |
| 4 | Floater | uses left | F4 | "brolly" (umbrella), permanent. Climber + Floater = **"Athlete"**. |
| 5 | Bomber | uses left | F5 | 5-second countdown above the head. Called "Exploder" in some versions. |
| 6 | Blocker | uses left | F6 | Arms out; reverses walkers. |
| 7 | Builder | uses left | F7 | 12 bricks. After the 12th he "turns to look at you for a moment" or shrugs; clicking again builds 12 more. |
| 8 | Basher | uses left | F8 | Digs horizontally. |
| 9 | Miner | uses left | F9 | Digs diagonally down. |
| 10 | Digger | uses left | F10 | Digs straight down. |
| 11 | Pause, labelled **"Paws"** (paw-print icon) | — | F11 or keypad `+` (Amiga: `P`) | Freezes play. You can look around but can't assign skills. |
| 12 | Nuke, called "Armageddon" / "Nuke 'Em" (mushroom-cloud icon) | — | F12 or `Delete` | **Double-click to activate** (both manuals). In 2-player, **both players** must click it. |
| — | Minimap | — | — | Green map of the whole level. Lemmings are **yellow dots**; "a large light-colored box" marks the viewport (DOS manual). |

- **Selected button:** "a highlighted box" appears around the icon (DOS manual). It renders as a light or white rectangle (approx.).
- **Other keys.** Amiga: icons via `Z`/`X` or the cursor keys; `P` pauses. DOS keyboard-only mode moves the crosshair with `Q`/`A`/`O`/`P`; `Space` = left click, `Return` = right click, `ESC` = abort the level (DOS manual).
- **Later ports.** Many added **Fast-Forward** between Paws and Nuke (Win95, PS1, PSP, Mac, 3DO…). In Win95 the icon bar can be docked or detached ([Wiki](https://lemmings.fandom.com/wiki/Ability_Panel)).

## Status line (DOS)
- Layout, from the Lemmix template `..............OUT_.....IN_.....TIME_.-..`: `[TYPE N]  OUT n  IN n%  TIME m-ss`. Example: `WALKER 1   OUT 12   IN 45%   TIME 4-32`. Upper-case rendering is approx.
- **TYPE N** means "the number tells you how many lemming(s) are under your pointer; the word tells you what the lemming(s) are doing". Example: "Digger 6" when six lemmings overlap and one is digging. It only appears while the pointer covers at least one lemming (DOS manual). Type words include Walker, Faller, Climber, Floater, Athlete, Blocker, Builder, Shrugger, Basher, Miner, Digger, Bomber, Drowner, Splatter, Exiter and Frier (Lemmix strings).
- **OUT** = lemmings currently in the level. **IN** = % of the level's total that has reached the exit. **TIME** counts down, and "on slower machines, the 'seconds'… may not be exactly accurate". When time runs out the level is scored on % saved, so "you can run out of time, but still finish the level" (DOS manual).

## Cursor and selection
- The cursor is a crosshair. It "turns into a box, framing the Lemming" when one is under it (DOS manual).
- **Walkers-only filter:** "if you hold down the right mouse button while you're assigning a skill, your assignment will only be given to a Lemming who is a Walker" (DOS manual, 1991). So this feature was already in the DOS original. The Amiga manual doesn't mention it (unverified for Amiga).
- Assigning with no uses left: "nothing will happen" (DOS manual).
- In the Amiga level *All or Nothing*, stacked lemmings had to be clicked at the exact moment one turned. Gary's trick was that the cursor "would 'flash' briefly when a lemming was under it". Dailly on that level: "99.999999% of people would have solved this level through pure luck and frustration." ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)) This is an anti-pattern we should avoid.

## Level preview screen (called the "Objective screen")
- Fields per the DOS manual: mini-map, level number, title ("sometimes there's a hint hidden in the name!"), number of lemmings, number to be saved (as a %), release rate, time, rating.
- **Exact strings**, confirmed in Lemmix `Base.Strings.pas` with Fun 1 values from the Wiki. Reference only:
  `Level 1 Just dig!` · `Number of Lemmings 10` · `10% To Be Saved` · `Release Rate 50` · `Time 5 Minutes` · `Rating Fun` · `Press mouse button to continue`

## Results screen (called the "Completion screen"). Reference only; do not ship
- **Header:** `All lemmings accounted for.` or `Your time is up!`, then `You rescued X%` and `You needed Y%`.
- **Flavour line.** Thresholds are in **percentage points**, checked top to bottom (Lemmix `GameScreen.Postview.pas`; texts cross-checked with [Wiki Completion Screen](https://lemmings.fandom.com/wiki/Completion_Screen)):

| Condition (saved % vs needed %) | Text |
|---|---|
| saved = 100 | "Superb! You rescued every lemmings on that level. Can you do it again...." (sic) |
| saved = 0 | "ROCK BOTTOM! I hope for your sake that you nuked that level." |
| < needed ÷ 2 | "Better rethink your strategy before you try this level again!" |
| < needed − 5 | "A little more practice on this level is definitely recommended." |
| < needed − 1 | "You got pretty close that time. Now try again for that few % extra." |
| = needed − 1 | "OH NO, So near and yet so far (teehee) Maybe this time....." |
| = needed | "RIGHT ON. You can't get much closer than that. Let's try the next..." (the Wiki says some versions use "SPOT ON" or "EXACTLY") |
| < needed + 20 | "That level seemed no problem to you on that attempt. Onto the next...." |
| ≥ needed + 20 | "You totally stormed that level! Let's see if you can storm the next..." |

- Because the thresholds are in % points, levels with few lemmings can't show some lines. With 10 lemmings each one is worth 10%, so "needed − 1" can never happen. The Wiki notes the same limitation.
- **Footer:** `Your Access Code for Level N is XXXXXXXXXX`, then `Press left mouse button for next level` or `…to retry level`, and `Press right mouse button for menu`.
- **After Mayhem 30:** "Congratulations! Everybody here at DMA Design salutes you as a MASTER Lemmings player…" over a GenLock photo of the team ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)).

## Passwords, menus and structure
- **Passwords** are "always made up of letters, and always exactly 10 letters long". Codes "may vary from game session to game session" (DOS manual). Amiga, ST, DOS, Mac and others share one scheme. The Acorn and Lynx versions used hand-picked phrases instead, e.g. `DAVIDJONES` for Acorn Fun 1 ([Wiki](https://lemmings.fandom.com/wiki/Lemmings)). **For us:** autosave progress instead of passwords.
- **Amiga main menu:** One Player · Two Player · New Level (enter password) · Music/FX toggle ("music and limited sound effects or no music and Full sound effects") · up/down arrows to pick FUN/TRICKY/TAXING/MAYHEM. "Style has no effect in a Two player Game." (Amiga manual)
- **DOS main menu:** F1 play (labelled "Let's Go!" or "One Player" depending on machine) · F2 New Level · F3 cycles music + FX → FX only → silent · F4 control device (mouse/joystick/keyboard) · arrow keys pick the rating · ESC exits to DOS (DOS manual). The menu shows animated lemmings and a scrolling message.
- **Structure:** 4 ratings × 30 = 120 levels. Finishing level 30 moves you to level 1 of the next rating (DOS manual). The rating reflects "the number of obstacles…, the limitation on the number of types of skills available…, the time limit, the minimum rate of lemming release, and the percentage… that must be saved" ([Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game))).
- **2-player** on Amiga (two mice) and Atari ST (mouse + joystick): 20 levels, all by Gary Timmons, with a vertical split screen. The left player has **blue** lemmings and the right player **green**. Each has their own exit and skill set, and you score *any* colour lemming that enters your exit. Each side starts with 40 lemmings; later levels carry over what was saved. Play cycles until neither player saves any (Amiga manual; Wikipedia). Timmons balanced "the same distance to go for exits" and "fair and equal terrain" ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)).
- *Oh No! More Lemmings* (1991): 100 levels in Tame/Crazy/Wild/Wicked/Havoc × 20 (DOS manual).

---

# 3. Audio

## Sound events
File names come from the [PC sound pack list](https://sounds.spriters-resource.com/pc_computer/lemmings/asset/395718/). Triggers come from Lemmix `Dos.Consts.pas` / `Game.pas` and from [lemmingsforums t=5271](https://www.lemmingsforums.net/index.php?topic=5271.0). The synth ideas are my suggestions.

| Event | Trigger | Original character (file) | Synth analogue for us |
|---|---|---|---|
| Level-start voice | At about game frame 15, *before* the hatch opens | "Let's go!" in a sped-up female voice (LETSGO) | 2–3 syllable chirp with a rising contour: pulse or saw wave through a swept bandpass ("formant") |
| Hatch opens | At about frame 34 | Wooden creak or clunk (DOOR) | Noise burst through a resonant low-pass filter, plus a descending pitch-bent squeak |
| Skill button chosen | Clicking a panel icon | Short tick (CHANGEOP) | 2 ms click plus a 30 ms sine blip at ~1.2 kHz |
| Skill assigned to a lemming | Clicking a lemming | Soft "thunk"/click (exact file unverified; MOUSEPRE or THUNK) | 150–250 Hz triangle blip, 40 ms |
| **Builder low on bricks** | When ≤3 bricks remain, once per brick cycle (Lemmix `NumberOfBricksLeft <= 3`) | "Ting". The manual calls it "a clicking noise. Listen carefully!" The forum calls TING "more 'brick-ish'" than CHINK. | Rising 3-step high ping (~1.8, 2.1, 2.4 kHz). **Must have a visual twin (see §5).** |
| Hits steel / wrong-way wall | Basher, miner or digger stops | Metallic "chink" (CHINK) | FM bell with an inharmonic ratio (e.g. 1:1.41), 120 ms |
| Bomber "Oh no!" | End of the 5 s countdown, while the lemming clutches its head. Lemmix skips it during a user nuke (approx.). | "Oh no!" voice (OHNO) | Falling two-note squeak (e.g. 900 → 600 Hz) |
| Explosion | Bomber or nuke | "Pop" plus a "colorful shower of confetti" (EXPLODE, BANG) | Short noise burst with fast decay and a downward pitch sweep, plus particles |
| Splat | Fall too high | Wet slap (SPLAT) | Low-passed noise plus a sine thump |
| Drowning | Water or acid | Gurgle (GLUG, SPLASH) | Random-rate sine "bubbles" rising in pitch |
| Fire | Fire or lava | Sizzle/whoosh (FIRE) | High-passed noise swell |
| Traps | Rope or pillar trap (CHAIN, "has a thunk at the end"), squasher or 10-ton weight (TENTON), electric (ELECTRIC), bear or chomper traps (THUD/THUNK, approx.), later MANTRAP/SLICER/SCRAPE | Mechanical, and different for each trap. The forum reports the Amiga "DIE" sound replaces trap sounds while music plays. | A distinct timbre per hazard type (distinct sounds are an accessibility goal) |
| Exit | Lemming enters the exit | "Yippee!" (YIPPEE). The Amiga variant is "more of a deep 'boing'" (forum). | Upward glide "whee" plus a small sparkle |
| Nuke | Double-click | Countdowns on everyone, then cascading pops | Stagger the pops and cap how many play at once (polyphony limit) |
| Hover or low-time warning | **None in the original** (unverified) | — | Optional soft tick in the last 30 s, always paired with a visual blink |

- **Sound modes.** Amiga: "music and limited sound effects **or** no music and Full sound effects" (Amiga manual). This probably reflects the Amiga's 4 hardware channels (approx.). DOS: F3 cycles music + FX / FX only / silent; music needs AdLib, SoundBlaster or Tandy (DOS manual). DOS effects may have been FM rather than samples ([Vogons](https://www.vogons.org/viewtopic.php?t=62042), approx.).
- In later remakes (PS3), voice clips play "in a randomly selected, slightly different pitch for each Lemming" ([Lemmings Wiki](https://lemmings.fandom.com/wiki/Lemmings_(PS3))). This is a good trick for synthesized barks.

## Music
- **Composers:** Brian Johnston (Scott's younger brother) wrote the first tracks from 1960s themes ("Mission Impossible, Batman etc."). Those were copyright risks, so Psygnosis brought in **Tim Wright** to replace them with arrangements of classical and traditional pieces. The credits read "Music By Brian Johnston, Tim Wright". (lemmings.info; Wikipedia; Wiki)
- **Tunes** (17 in the main cycle, in order; [Wiki: Music in Lemmings](https://lemmings.fandom.com/wiki/Music_in_Lemmings)):
  - Can-Can (Offenbach's *Galop infernal*)
  - Lemming1 (original)
  - Tim2 *Smile If You Love Lemmings* (original)
  - Lemming2 (original)
  - Dance of the Little Swans (Tchaikovsky)
  - Tim3 (Wright's *Puggs in Space* theme)
  - Tim5 (original)
  - *How Much Is That Doggie in the Window?* (still under copyright; Dailly says Psygnosis "had to settle"; removed from later versions)
  - Dance of the Reed Flutes (Tchaikovsky)
  - Lemming3 (original)
  - Rondo alla Turca (Mozart)
  - London Bridge Is Falling Down
  - Tim1 (original)
  - Forest Green (Vaughan Williams) mixed with *The Good, the Bad and the Ugly* (later removed)
  - Tim4 (original)
  - TenLems (Ten Green Bottles + Chopin's Funeral March + Wagner's Bridal Chorus)
  - She'll Be Coming 'Round the Mountain
  - Plus 4 special-level tracks (Beast, Menace, Awesome, Beast II) and an intro track, *March of the Mods* (Tony Hatch).
- **Character:** Amiga 4-channel tracker music (MOD format). Bright and bouncy, comic, march-like. PC/PS MIDI versions run at 120–175 BPM. Instruments: pizzicato strings, piccolo, harpsichord, glockenspiel, orchestra hits, finger or slap bass. Tracks loop, and the cycle advances one track per completed level (Wiki).
- Tim Wright released his tracks commercially in 2021 on Bandcamp and streaming services (Wiki). **His arrangements are actively exploited IP.**
- **For us:** write original chiptune pieces in WebAudio (pulse, triangle, noise drums) at 110–170 BPM with staccato "walking" bass lines. Do **not** reuse the Lemmings set of public-domain tunes or their order. The melodies are public domain, but those arrangements and the association with this game are not ours to use.

---

# 4. Level design principles

## Difficulty ramp
- The team built the hard levels first, then made easy ones: "we had all these really hard levels, but no easy ones. So, Gary then set about making simple ones…" Also: "Most levels were used at least twice – once for hard, and then by adding more skills, a simpler version was then made." ([lemmings.info](https://lemmings.info/lemmings-gamehistory/)) Example: the Fun 1 map is reused as Tricky 15 ([Wiki](https://lemmings.fandom.com/wiki/Just_dig!)). **Technique to copy:** same map, fewer skills = harder level.
- Rating factors are obstacles, skill variety, time limit, minimum release rate and required % (see §2).
- Psygnosis testers faxed back the time taken, and levels usually took "around 3-6 minutes". The goal was the fax "covered in scribbles with the time and comment's crossed out again and again" (lemmings.info).

## Fun 1–10: the title is the tutorial ([Wiki: Fun](https://lemmings.fandom.com/wiki/Fun))
| # | Title (reference only) | Skill being taught (inferred) |
|---|---|---|
| 1 | Just dig! | Digger (10 lemmings, 10% needed, release rate 50, 5 min) |
| 2 | Only floaters can survive this | Floater |
| 3 | Tailor-made for blockers | Blocker |
| 4 | Now use miners and climbers | Miner + Climber |
| 5 | You need bashers this time | Basher |
| 6 | A task for blockers and bombers | Blocker + Bomber (sacrifice) |
| 7 | Builders will help you here | Builder |
| 8 | Not as complicated as it looks | combination |
| 9 | As long as you try your best | combination |
| 10 | Smile if you love Lemmings | combination |

- **Title styles by designer:** Dailly wrote clue titles ("It's hero time" = one lemming going "over the top"); Timmons used pop-culture references; Scott Johnston picked "nice sounding names" (lemmings.info). **Level styles:** Timmons made minimal play areas and later added non-interfering "fluff" around the edges; Dailly made picture-like levels and liked "making the user do multiple things at once"; Johnston's levels were compact.

## Puzzle archetypes (ideas only; free to reuse)
| Archetype | Key skill(s) | Notes |
|---|---|---|
| Bridge a gap | Builder | 12-step stairs. Chain builders. "Stretch" a bridge by letting him take a step before building again (manual tip 4). |
| Hold the crowd | Blocker, later Bomber or Nuke | One worker clears the path while the crowd waits. Two blockers make a pen. Or "dig a hole deep enough to trap them" (tip 2). |
| Go down through floors | Digger, Miner | A miner's diagonal avoids lethal drops. Diggers "keep digging until they fall". |
| Go through walls | Basher | Stops "as soon as he breaks through". Fails straight away with nothing in front, which wastes the skill. |
| One-way walls | Basher/Miner direction | "An obstacle with arrows on it may only be dug through in the direction in which the arrows point" (tip 3). Forces a route or direction. |
| Climb and float | Climber, Floater, both ("Athlete") | Over a wall, then safely down the far side. |
| Blast a thin barrier | Bomber | Removes terrain but not steel or traps. Costs a lemming. |
| Steel routing | — | Indestructible, "dull grey rusty plates". Shuts off shortcuts. |
| Timing and flow | Release rate | Raise it to bunch the crowd; the level's rate is the floor. |
| Hazards | — | Water, acid, lava, fire, traps, falling off the bottom, and lethal drops (manual: "greater than about 80 pixels"; exact value in notes-mechanics). |
| Sacrifice | Bomber, Blocker | Needed % below 100 gives room for it. |
| Multitask | several | Dailly's *The Fast Food Kitchen* "required the player to jump back and forth". |
| Time pressure | — | Long route plus tight clock. Keep this rare and optional in our game (§5). |

## What makes a level fair
- **The original's rule:** "Dave refused to put in any level that could *only* be solved by chance" (lemmings.info).
- **Community principles** ([lemmingsforums t=6437](https://www.lemmingsforums.net/index.php?topic=6437.0), [t=3926](https://www.lemmingsforums.net/index.php?topic=3926.0), [t=6451](https://www.lemmingsforums.net/index.php?topic=6451.0)):
  - "No hiding stuff from players!" (IchoTolot). Also: "Hidden information… A level should give me all the information they need" (Nepster).
  - "As easy as possible on the execution side, as hard as possible on the puzzle side" (Strato Incendus).
  - "It is easy to notice execution difficulty in your own levels. It is much harder to notice puzzle difficulty" (namida).
  - "Make the level as big as your idea needs to be but not way bigger" (IchoTolot). Avoid "Unnecessarily huge level[s]" (Nepster).
  - Readable art: avoid looking "too 'busy', so that you can't tell… what's background, what's terrain" (WillLem).
  - Avoid "Drops that are almost or just deadly, gaps that can almost bridged" (Nepster), "Relative pixel precision" and "Generic titles" (Strato Incendus).
  - **Backroutes** are unintended solutions. Advice: "Test. Test some more. Get others to test too." (namida). Builder-heavy levels "are much more likely to be backrouted" (Crane). Cramming in many tricks means the level "would be flooded by backroutes" (Armani). "Envision how the skills you provide can accidentally open other routes" (IchoTolot).
- **Our checklist:**
  1. Every hazard is visible and animated. Terrain, steel and one-way surfaces are distinguishable **by pattern, not only colour**.
  2. The skill set hints at the solution.
  3. Early levels have generous slack.
  4. Simulation is deterministic, and replays are available.
  5. The preview shows the whole level.
  6. No hidden objects.
  7. No near-lethal fall heights unless a fall-height ruler is available.
  8. Test every level for backroutes. Keep the fun ones.

---

# 5. Accessibility & usability: gaps and modern remedies

Frameworks cited:
- **GAG:** [gameaccessibilityguidelines.com](https://gameaccessibilityguidelines.com/full-list/) (titles quoted exactly)
- **WCAG 2.2:** [w3.org/TR/WCAG22](https://www.w3.org/TR/WCAG22/) (Recommendation Oct 2023, updated 12 Dec 2024)
- **XAG:** [Xbox Accessibility Guidelines](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines) v3.2
- **Includification:** AbleGamers' practical guide ([PDF](https://accessible.games/wp-content/uploads/2018/11/AbleGamers_Includification.pdf))

| # | Gap in the original | Evidence | Remedy for our game | Guideline mapping |
|---|---|---|---|---|
| 1 | **Tiny, overlapping click targets** (~10 px sprites, approx.) | "very difficult to select a particular Lemming" (DOS manual). Jones: needed "the level of precision only a mouse could give". | Effective hit area of at least **24×24 CSS px** per critter, snap to the nearest critter within a radius, target outline and label on hover, integer zoom. Panel buttons at least 44×44 px. | GAG "Ensure interactive elements / virtual controls are large and well spaced…"; WCAG **2.5.8** Target Size (Minimum, AA, 24×24; exceptions: spacing, equivalent, inline, user-agent, essential) and 2.5.5 (AAA, 44×44); XAG 107 Input |
| 2 | **Real-time-only assignment; frame-precise timing** | "skills can only be assigned in real-time" (Wikipedia); manual tips 11–12 | **Pause-and-assign** (on by default), frame-step forward and back, slow motion (0.25× / 0.5×), fast-forward, **undo last assignment**, instant restart, skill-path preview ("skill shadows") | GAG "Do not make precise timing essential to gameplay – offer alternatives, actions that can be carried out while paused, or a skip mechanism"; "Include an option to adjust the game speed"; WCAG **2.2.1** Timing Adjustable (games may claim its real-time or essential exceptions, but we shouldn't rely on that); XAG 116 Time limits |
| 3 | **No keyboard selection of lemmings** | Amiga keys pick icons only. DOS keys move the crosshair with Q/A/O/P. | Full keyboard play: `1`–`8` pick a skill; `Tab`/`Shift+Tab` or `[`/`]` cycle critters (left→right in view, optionally filtered, e.g. walkers only); `Enter`/`Space` assigns; arrow keys scroll; `P` pauses; `F` fast-forward; `R` restart. Precedent: the ZX Spectrum/CPC **"Lock-On"** cursor, where the camera follows a locked lemming and you can assign to it at any time. It was refined for J2ME ([Wiki](https://lemmings.fandom.com/wiki/Lemmings)). | GAG "Ensure that all key actions can be carried out by digital controls…", "Support more than one input device"; WCAG **2.1.1** Keyboard, **2.1.4** Character Key Shortcuts, **2.4.7** Focus Visible, **2.4.11** Focus Not Obscured (Minimum, AA; don't hide the focus ring under the panel or minimap); XAG 107/112/113 |
| 4 | **Crowd disambiguation** | DOS right-click = walkers only. Lix: "Force left", "Force right", "Priority invert". NeoLemmix: ForceWalker, ForceUnassigned, DirLeft/DirRight, Highlight. | Toggleable filters (walkers only, facing left, facing right) shown as HUD chips. Persistent highlight on the selected critter. | GAG "Ensure controls are as simple as possible, or provide a simpler alternative" |
| 5 | **Held buttons** (release-rate slider, right-button filter, fast scroll) | Wiki: a release-rate button "must be held" | Click ±1 per press (Shift for ±10); toggles instead of holds | GAG "Avoid / provide alternatives to requiring buttons to be held down"; WCAG **2.5.7** Dragging Movements (minimap and scroll need non-drag options), 2.5.1 Pointer Gestures |
| 6 | **Colour-only cues** | 2-player teams are blue vs green. The ZX version used one colour per level ("difficult to see"). Steel is recognised by grey colour. Hazards are recognised by colour. | Steel gets a rivet or hatch pattern. Keep one-way chevrons. Hazards get animation plus an icon. Teams differ by shape (hat or marker). Critters get a 1 px dark outline. A **high-contrast / "clear physics"** view shows flat terrain classes, each with its own pattern (NeoLemmix `PhysicsView`). | GAG "Ensure no essential information is conveyed by a fixed colour alone", "Provide high contrast between text/UI and background", "Provide an option to adjust contrast"; WCAG **1.4.1** Use of Color, **1.4.3** Contrast (4.5:1 text), **1.4.11** Non-text Contrast (3:1); XAG 102 |
| 7 | **Sound-only cues** | Builder "will make a clicking noise. Listen carefully!" (DOS manual); the steel "chink"; "Oh no!" | Brick pips above the builder (12→0, amber at ≤3). Spark plus icon when hitting steel. Keep the big countdown numerals. Caption strip for barks. Visual flash for "saved" and "lost". | GAG "Ensure no essential information is conveyed by sounds alone", "Provide subtitles for all important speech", "Provide captions or visuals for significant background sounds"; XAG 103, 104 |
| 8 | **No text or status output** | — | ARIA live region (`role="status"`, polite) for skill picked (e.g. "Digger, 3 left"), assignments, saved/lost counts (throttled and aggregated), time warnings and results. Real `<button>`s with `aria-pressed`. | WCAG **4.1.3** Status Messages, 4.1.2 Name, Role, Value; GAG "Ensure screen reader support, including menus & installers"; XAG 106 |
| 9 | **Coarse audio control** | Amiga: music + limited FX **or** full FX. DOS: 3-state toggle. | Separate **music / effects / voice** sliders plus master mute, all remembered | GAG "Provide separate volume controls or mutes for effects, speech and background / music", "Ensure that all settings are saved/remembered"; WCAG **1.4.2** Audio Control; XAG 105 |
| 10 | **Flashing and motion** | Explosions are a "colorful shower of confetti"; a nuke means mass explosions | No full-screen flashes; keep flash areas small and at most 3 per second. Honour `prefers-reduced-motion` plus an in-game toggle: fewer particles, no screen shake, cut camera jumps. | GAG "Avoid flickering images and repetitive patterns", "Provide an option to turn off / hide background movement"; WCAG **2.3.1** Three Flashes or Below Threshold, **2.3.3** Animation from Interactions (AAA), **2.2.2** Pause, Stop, Hide; XAG 117, 118 |
| 11 | **Every level is timed; time-out ends the level** | Wikipedia | "Relaxed" mode: timer off or doubled, or shown without failing the level; the original-style timer becomes an optional challenge badge | GAG "Offer a wide choice of difficulty levels", "Allow difficulty level to be altered during gameplay…"; WCAG 2.2.1; XAG 108, 116 |
| 12 | **Destructive Nuke on a double-click** | Both manuals | Two-step confirm with a visible "Press again to nuke" and no timing window. Act on pointer *up*. | XAG 115 Error messages and destructive actions; WCAG 2.5.2 Pointer Cancellation |
| 13 | **No remapping** | Fixed F-keys | Remappable keys (NeoLemmix "Configure Hotkeys"; Lix remaps all keys) | GAG "Allow controls to be remapped / reconfigured"; WCAG 2.1.4 |
| 14 | **Objective and hints only shown before the level** | Preview screen only | Persistent HUD "Saved 3 · need 8 of 20"; re-open the briefing any time; optional hint; **fall-height ruler** (Lix "splat ruler"; NeoLemmix `FallDistance`) | GAG "Indicate / allow reminder of current objectives during gameplay", "Include contextual in-game help / guidance / tips"; XAG 109 Objective clarity |
| 15 | **Passwords and forced order** | 10-letter codes | Autosave, with an option to unlock or skip levels | GAG "Provide an autosave feature", "Offer a means to bypass gameplay elements that aren't part of the core mechanic…" |
| 16 | Tutorials (a strength of the original) | Fun 1–7 | Keep interactive one-verb tutorials, plus sandbox and rewind | GAG "Include interactive tutorials", "Include a means of practicing without failure…" |

## What modern remakes and clones did
| Product | Assist and usability features |
|---|---|
| DOS 1991 | Right-button walkers-only filter; F-key shortcuts; keyboard crosshair mode; pause ([manual](https://www.lakora.us/lemmings/dox/)) |
| ZX Spectrum / CPC / J2ME / PSP / PS2 / PSM | "Lock-On" cursor with camera follow. PSM (touch) uses lock-on as its main control ([Wiki](https://lemmings.fandom.com/wiki/Lemmings)). |
| Win95 / PS1 / Mac / 3DO / PSP… | Fast-forward; autosave; Win95 detachable icon bar |
| Lemmings (PS3) | Level-specific **tips on the results screen** after a failure; skill panel scrolled with L1/R1 ([Wiki](https://lemmings.fandom.com/wiki/Completion_Screen)) |
| Lemmings Touch (Vita, 2014, D3T) | **Select the lemming first**, then pick from a "Skill Cloud". L button pauses so you can assign. Tap the entrance to start. Pinch to zoom. 3-star grades. ([Wiki](https://lemmings.fandom.com/wiki/Lemmings_Touch)) |
| Lemmings: The Puzzle Adventure (mobile, 2018, Exient/Sad Puppy) | **Tile-based**. "Instructions" are placed on tiles and fire when a lemming reaches them, which removes all timing precision. Its free-to-play energy system is something *not* to copy. ([Wiki](https://lemmings.fandom.com/wiki/Lemmings:_The_Puzzle_Adventure)) |
| NeoLemmix (and Community Edition) | Configurable hotkeys; assign while paused; frame-stepping including backwards; fast-forward; slow motion; skill shadows and projection; highlight; left/right direction select; force walker or unassigned; physics view; fall-distance ruler; zoom; save/load state; replays (save, load, edit, insert); options for timer and lemming-count blink, "Black-Out Zero Skill Count", disabling backgrounds, separate sound and music volume, success/failure jingles ([hotkey enum](https://github.com/Willicious/NeoLemmixCommunityEdition/blob/main/LemmixHotkeys.pas), [options list](https://www.lixgame.com/etc/nl-options.txt)) |
| Lix | Pause; option for whether an assignment during pause unpauses or advances 1 frame; rewind 1 tick (1/15 s) or 1 s; "Rewind your previous skill assignment" (undo); fast-forward ×4 and turbo ×36; force left/right; priority invert; snapping splat ruler; hold-to-scroll; crisp integer zoom; in-game tooltips; keyboard level browser; remappable keys ([english.txt](https://github.com/SimonN/LixD/blob/master/data/transl/english.txt)) |

---

# 6. IP / do-not-copy

## Status
- **Trademark "LEMMINGS":** USPTO Reg. **1,848,503** (Serial 74115666), Principal Register, class 9: "computer software and computer programs in the field of games…".
  - Filed Nov 1990 with UK priority (UK A1445799, 30 Oct 1990). Registered 9 Aug 1994.
  - **Owner: Sony Interactive Entertainment Europe Limited**, London.
  - Third 10-year renewal accepted **7 Nov 2024**, so it is live to about 2034 ([USPTO TSDR](https://tsdr.uspto.gov/statusview/sn74115666)).
  - EU and UK marks are likely too (unverified).
- **Ownership chain:** Psygnosis → Sony in 1993 → Psygnosis folded in 2012; the IP stayed with Sony. Sony licensed it to Team17 (PSP, 2006), D3T (*Lemmings Touch*, 2014) and Exient (*Lemmings: The Puzzle Adventure*, 2018). Exient's Sad Puppy label was renamed Exient Publishing in 2020. ([Wikipedia](https://en.wikipedia.org/wiki/Lemmings_(video_game)), [PocketGamer.biz](https://www.pocketgamer.biz/news/74299/exient-rebrands-publishing-arm/))
- **Look-and-feel risk:** in *Tetris Holding v. Xio* (D.N.J. 2012), game mechanics were not protected, but closely copying the visual expression infringed ([Wikipedia](https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.)). **Our approach:** reuse mechanics and ideas only, never expression. (This is not legal advice.)

## Do not copy
- The name and logo "Lemmings". Keep it out of the product name, store metadata and icons. A plain "inspired by" credit in a README is for the lead to decide.
- The 120 level layouts and their **titles**, plus those of *Oh No! More Lemmings* and later games.
- Sprites and animation frames. The **green-haired, blue-robed, droopy-nosed** character. The skill icons, including the paw-print "Paws" pun and the mushroom-cloud nuke icon. The panel art, font, minimap style and box art.
- The music arrangements, **and** the tune set and its order (Can-Can → … → Mountain), even though the melodies are public domain.
- The sound samples and voice lines ("Let's go!", "Oh no!", "Yippee!") and their timing and pitch.
- The results-screen texts, manual jokes, title-scroller text, final-screen text and the 10-letter password scheme.
- Names starting with "Lemm-". Fan clones already use Lemmix, Lemmini and NeoLemmix. "Lemmlings" and "Lemmingo" would likely be confusingly similar to the registered mark. **Rejected.**

## Working-title candidates (web-checked 2026-09-26; no formal trademark search yet)
| Name | Pitch | Quick check | Risk |
|---|---|---|---|
| **Mumblemarch** | A stream of critters mumbling as they march | No game called "Mumblemarch" or "Mumble March" found. Only "Mumble Jumble" word games and the Mumble voice-chat app. | **Low.** My recommendation. |
| **Tuftlings** | Small critters with a sprout-tuft; "-lings" = little creatures | No "Tuftlings" game found. Only the "Tüfteln" board game and a tiny "Tuft's Game". | **Low–medium.** The "-lings" ending echoes the original, but it's a common suffix (e.g. *Darklings*). Don't combine it with a lemming-like look. |
| **Trundlers** | They trundle onward no matter what | No exact game found. There is "Trundle" (a Steam puzzle game), League of Legends' champion Trundle, and "Victorious Trundlers" (an itch.io bowling game). | **Low–medium.** Close to the "Trundle" puzzle game. |

- Also checked:
  - **Burrowkin:** only a location name in *Mortal Shell 2*, so a low-risk alternate.
  - **Marchlings:** rejected. An itch.io jam game by McBlueFrog already uses it.
  - **Pipsqueak Parade:** rejected. It's an existing art brand, and *Pipsqueak!* is an existing game.
- **Before any public release:** run searches at USPTO, EUIPO and UKIPO in classes 9, 28 and 41, plus Steam, itch.io and the app stores.

## A distinct critter design that still reads as "lemming-like"
- **Silhouette:** a round "bean" body with no robe, about 8×10 px (approx.). Two white eye pixels with a dark pupil show which way it faces. Stubby feet, a 4-frame waddle and a 1 px bounce. The head has a single **leaf or sprout tuft** that sways, instead of hair.
- **Palette:** warm apricot or coral body, cream face and belly, a dark plum 1 px outline so it reads on any terrain, and a sunflower-yellow tuft. **Avoid the green-plus-blue pairing.** Verify at least 3:1 contrast against every terrain palette (WCAG 1.4.11).
- **Skill props:**
  - Floater: a dandelion or leaf glider, not an umbrella.
  - Blocker: holds up a round "stop" paddle.
  - Builder: carries planks, with visible pips for planks left.
  - Digger / Miner / Basher: shovel, pick and fists respectively, each with its own motion.
  - Bomber: a fuse sparking from the tuft, plus large numeric countdown digits.
  - Climber: suction-cup hands.
- **Voice:** wordless synthesized chirps with pitch varied per critter. Captions use our own words (e.g. "Off we go!", "Uh-oh…", "Wheee!").

---

## Sources
- Mike Dailly, *The Complete History of Lemmings*: https://lemmings.info/lemmings-gamehistory/
- Wikipedia, *Lemmings (video game)*: https://en.wikipedia.org/wiki/Lemmings_(video_game)
- Game Developer, *Playing Catch Up: Dave Jones*: https://www.gamedeveloper.com/game-platforms/playing-catch-up-i-gta-lemmings-i-dave-jones
- Lemmings DOS/CD manual (text): https://www.lakora.us/lemmings/dox/
- Lemmings Amiga manual (text): https://www.goodolddays.net/files/games/Lemmings/Files/Amiga-OCS/Lemmings-Manual.htm
- Lemmings Wiki pages (read through `api.php`):
  - https://lemmings.fandom.com/wiki/Lemmings
  - https://lemmings.fandom.com/wiki/Ability_Panel
  - https://lemmings.fandom.com/wiki/Nuke
  - https://lemmings.fandom.com/wiki/Completion_Screen
  - https://lemmings.fandom.com/wiki/Objective_Screen
  - https://lemmings.fandom.com/wiki/Fun
  - https://lemmings.fandom.com/wiki/Just_dig!
  - https://lemmings.fandom.com/wiki/Music_in_Lemmings
  - https://lemmings.fandom.com/wiki/Lemmings_Touch
  - https://lemmings.fandom.com/wiki/Lemmings:_The_Puzzle_Adventure
  - https://lemmings.fandom.com/wiki/Lemmings_(PS3)
- Lemmix source (DOS-faithful strings, result thresholds, SFX triggers): https://github.com/ericlangedijk/Lemmix (`src/Base.Strings.pas`, `src/GameScreen.Postview.pas`, `src/Dos.Consts.pas`, `src/Game.pas`)
- NeoLemmix: https://www.neolemmix.com/ · CE hotkeys: https://github.com/Willicious/NeoLemmixCommunityEdition · options: https://www.lixgame.com/etc/nl-options.txt
- Lix: https://www.lixgame.com/ · https://github.com/SimonN/LixD (`data/transl/english.txt`, `doc/history.txt`)
- Sound pack file list: https://sounds.spriters-resource.com/pc_computer/lemmings/asset/395718/ · Amiga SFX thread: https://www.lemmingsforums.net/index.php?topic=5271.0 · Vogons DOS sound thread: https://www.vogons.org/viewtopic.php?t=62042
- Lemmings Forums level design threads: https://www.lemmingsforums.net/index.php?topic=6437.0 · https://www.lemmingsforums.net/index.php?topic=3926.0 · https://www.lemmingsforums.net/index.php?topic=6451.0
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- Xbox Accessibility Guidelines: https://learn.microsoft.com/en-us/gaming/accessibility/guidelines (XAG 101–123 pages)
- AbleGamers, *Includification*: https://accessible.games/wp-content/uploads/2018/11/AbleGamers_Includification.pdf
- USPTO TSDR, LEMMINGS Reg. 1848503: https://tsdr.uspto.gov/statusview/sn74115666
- *Tetris Holding v. Xio*: https://en.wikipedia.org/wiki/Tetris_Holding,_LLC_v._Xio_Interactive,_Inc.
- Exient Publishing rebrand: https://www.pocketgamer.biz/news/74299/exient-rebrands-publishing-arm/
- Name checks: https://mcbluefrog.itch.io/marchlings · https://store.steampowered.com/app/683070/Trundle/ · https://store.steampowered.com/app/2741550/Pipsqueak/
