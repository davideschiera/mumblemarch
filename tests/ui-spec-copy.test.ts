/**
 * INDEPENDENT validator test (ev1a-copy). Every expected value below is transcribed BY HAND from
 * the spec documents (docs/design/DESIGN-APPENDIX.md App. A, docs/design/DESIGN.md §6.5/§6.3.1/
 * §7.3/§9.5), not copied from src/ui/strings.ts or from the implementer's own tests. Where this
 * file and the implementation disagree, this file follows the spec documents.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Lemming, LevelOutcome, SkillId } from '../src/core/types.ts';
import {
  ANNOUNCE,
  ANNOUNCE_META,
  BRIEFING,
  CAPTIONS,
  DEATH_TEXT,
  describeLemming,
  GAME_TITLE,
  HUD,
  minimapValueText,
  playfieldAriaLabel,
  refusalText,
  RESULTS,
  RR_ARIA,
  SKILL_DESCRIPTIONS,
  SKILL_GERUND,
  SKILL_PLURAL,
  SKILL_VERB,
  SOUND_CAPTIONS,
  STAGE_HELP_TEXT,
  TAGLINE,
  TIER_BLURBS,
  TIER_NAMES,
  verdictFor,
  VERDICTS,
  LEVEL_CARD_STATE,
  LEVEL_SELECT,
} from '../src/ui/strings.ts';

function makeLemming(overrides: Partial<Lemming> = {}): Lemming {
  return {
    id: 1,
    x: 100,
    y: 50,
    dir: 1,
    state: 'walking',
    stateTicks: 1,
    fallDistance: 0,
    isClimber: false,
    isFloater: false,
    fuseTicks: 0,
    bricksLeft: 12,
    removed: false,
    ...overrides,
  };
}

// ─── 1. App. A verbatim ──────────────────────────────────────────────────────────────────────

test('App. A: GAME_TITLE / TAGLINE verbatim', () => {
  assert.equal(GAME_TITLE, 'Mumblemarch');
  assert.equal(TAGLINE, 'Little feet, big plans.');
});

test('App. A: TIER_NAMES / TIER_BLURBS verbatim', () => {
  assert.deepEqual(TIER_NAMES, { 1: 'Breezy', 2: 'Knotty', 3: 'Gnarly', 4: 'Stampede' });
  assert.deepEqual(TIER_BLURBS, {
    1: 'Gentle first steps',
    2: 'A few tangles',
    3: 'Think it through',
    4: 'Everything at once',
  });
});

test('App. A: SKILL_DESCRIPTIONS verbatim (all 8)', () => {
  assert.deepEqual(SKILL_DESCRIPTIONS, {
    climber: 'Suction-cup hands: climbs straight up walls. Keeps the skill.',
    floater: 'Dandelion puff: drifts down safely from any height. Keeps the skill.',
    bomber: 'Lights a fuse, counts 5 to 1, then pops and blasts a hole (not through steel).',
    blocker: 'Holds up a STOP paddle. Everyone else turns around.',
    builder: 'Lays a stair of 12 planks, then shrugs.',
    basher: 'Punches a tunnel straight ahead.',
    miner: 'Picks a tunnel diagonally down.',
    digger: 'Digs straight down.',
  });
});

test('App. A: SKILL_PLURAL / SKILL_VERB / SKILL_GERUND verbatim', () => {
  assert.deepEqual(SKILL_PLURAL, {
    climber: 'climbers',
    floater: 'floaters',
    bomber: 'bombers',
    blocker: 'blockers',
    builder: 'builders',
    basher: 'bashers',
    miner: 'miners',
    digger: 'diggers',
  });
  assert.deepEqual(SKILL_VERB, {
    climber: 'climb',
    floater: 'float',
    bomber: 'pop',
    blocker: 'block',
    builder: 'build',
    basher: 'bash',
    miner: 'mine',
    digger: 'dig',
  });
  assert.deepEqual(SKILL_GERUND, {
    climber: 'climbing',
    floater: 'floating',
    bomber: 'fizzing',
    blocker: 'blocking',
    builder: 'building',
    basher: 'bashing',
    miner: 'mining',
    digger: 'digging',
  });
});

test('App. A: DEATH_TEXT verbatim', () => {
  assert.deepEqual(DEATH_TEXT, {
    splat: 'went splat',
    drown: 'took an unplanned swim',
    burn: 'got far too toasty',
    trap: 'got caught by a trap',
    explode: 'went pop',
    'out-of-bounds': 'fell off the map',
  });
});

test('App. A: CAPTIONS / SOUND_CAPTIONS verbatim', () => {
  assert.equal(CAPTIONS['lets-go'], 'Off we go!');
  assert.equal(CAPTIONS.ohno, 'Uh-oh…');
  assert.equal(CAPTIONS.exit, 'Wheee!');
  assert.equal(CAPTIONS['builder-shrug'], 'Out of planks!');
  assert.equal(SOUND_CAPTIONS.splat, '[splat]');
  assert.equal(SOUND_CAPTIONS.drown, '[glug glug]');
  assert.equal(SOUND_CAPTIONS.burn, '[tsss!]');
  assert.equal(SOUND_CAPTIONS.explosion, '[pop!]');
  assert.equal(SOUND_CAPTIONS.nuke, '[fizz… pop all!]');
  assert.equal(SOUND_CAPTIONS.steel, '[tink]');
  assert.equal(SOUND_CAPTIONS['builder-low'], '[plink]');
  assert.equal(SOUND_CAPTIONS.fuse, '[fizz]');
  assert.equal(SOUND_CAPTIONS['time-low'], '[tick-tock]');
  assert.equal(SOUND_CAPTIONS['entrance-open'], '[creak… clunk]');
  assert.equal(SOUND_CAPTIONS['trap-flytrap'], '[snap! chomp chomp]');
  assert.equal(SOUND_CAPTIONS['trap-press'], '[ka-chunk!]');
  assert.equal(SOUND_CAPTIONS['trap-pendulum'], '[swish… clang]');
  assert.equal(SOUND_CAPTIONS['trap-piston'], '[hiss… bang!]');
  assert.equal(SOUND_CAPTIONS['trap-clam'], '[clack-gloop]');
  assert.equal(SOUND_CAPTIONS.trap, '[snap!]');
});

test('App. A: HUD verbatim', () => {
  assert.equal(HUD.pausedPlate, '⏸ Paused — you can still assign skills');
  assert.equal(HUD.fastPlate, '⏩ ×3');
  assert.equal(HUD.popAll, 'Pop all');
  assert.equal(HUD.popArmed, 'Press again');
  assert.equal(HUD.popping, 'Popping…');
  assert.equal(HUD.popBubble, 'Press Pop all again (or N) to pop every mumble · Esc cancels');
  assert.equal(HUD.restartBubble, 'Press R again to restart · Esc cancels');
  assert.equal(HUD.out(3), 'Out 3');
  assert.equal(HUD.saved(4), 'Saved 4');
  assert.equal(HUD.need(9), 'need 9');
  assert.equal(HUD.goalMet, 'goal met ✓');
  assert.equal(HUD.time('4:12'), 'Time 4:12');
  assert.equal(HUD.overtime('0:12'), 'Time +0:12 · relaxed');
  assert.equal(HUD.muted, 'Muted');
  assert.equal(HUD.ready(1), 'Ready: 1 job starts when you resume');
  assert.equal(HUD.ready(2), 'Ready: 2 jobs start when you resume');
  assert.deepEqual(HUD.filter, { all: 'Pick: All', walkers: 'Pick: Walkers', left: 'Pick: Facing ←', right: 'Pick: Facing →' });
});

test('App. A: BRIEFING verbatim', () => {
  assert.deepEqual(BRIEFING, {
    mumbles: 'Mumbles',
    save: 'Save',
    rate: 'Release rate',
    time: 'Time',
    tier: 'Tier',
    skills: 'Skills',
    showHint: 'Show hint',
    start: "Let's march!",
    back: 'Back to levels',
  });
});

test('App. A: RESULTS verbatim (fixed strings and function outputs)', () => {
  assert.equal(RESULTS.won, 'Level complete!');
  assert.equal(RESULTS.lost, 'Not quite this time');
  assert.equal(RESULTS.timeUp, "Time's up!");
  assert.equal(RESULTS.score(5, 12, 6), 'You saved 5 of 12 · needed 6');
  assert.equal(RESULTS.relaxed, 'Played with the relaxed timer.');
  assert.equal(RESULTS.relaxedOvertime('0:12'), 'Played with the relaxed timer · finished 0:12 into overtime.');
  assert.equal(RESULTS.beatClock, 'Beat the clock ✓');
  assert.equal(RESULTS.newBest, 'New best!');
  assert.equal(RESULTS.next, 'Next level');
  assert.equal(RESULTS.retry, 'Try again');
  assert.equal(RESULTS.levels, 'Levels');
});

// ─── 2. verdictFor (§9.5) — independent table + rule re-derivation ─────────────────────────────

/** The 8 rows x 2 variants, transcribed by hand from DESIGN.md §9.5. */
const SPEC_VERDICTS: readonly (readonly [string, string])[] = [
  ['Every single mumble made it home. Take a bow!', 'A full house! Nobody left behind.'],
  ['Nobody made it home this time. Fancy another go?', 'Not one through yet. The hatch is ready when you are.'],
  ['That route needs a rethink. Try a different first job?', 'Plenty to figure out here. Peek at the hint if you like.'],
  ["Getting there! A couple of tweaks and they're home.", "Good progress. A few more mumbles and it's yours."],
  ['So close! Just {n} more needed.', "A whisker short: {n} more and it's done."],
  ['Bang on the number. Every mumble counted!', 'Exactly enough. Phew!'],
  ['Brilliant! You marched right past the target.', 'What a crowd at the exit. Nicely marched!'],
  ['Nicely done. That went smoothly.', 'Tidy work. On to the next one?'],
];

test('VERDICTS export matches the §9.5 table text exactly (byte-for-byte, incl. apostrophe style)', () => {
  assert.equal(VERDICTS.length, 8);
  for (let i = 0; i < 8; i++) {
    assert.equal(VERDICTS[i]![0], SPEC_VERDICTS[i]![0], `row ${i + 1} variant A`);
    assert.equal(VERDICTS[i]![1], SPEC_VERDICTS[i]![1], `row ${i + 1} variant B`);
  }
});

function specRow(S: number, R: number, T: number): number {
  const m = Math.max(1, Math.round(T * 0.05));
  if (S === T) return 1;
  if (S === 0) return 2;
  if (S < Math.ceil(R / 2)) return 3;
  if (S < R - m) return 4;
  if (S < R) return 5;
  if (S === R) return 6;
  if (S >= R + Math.max(2, Math.ceil((T - R) / 2))) return 7;
  return 8;
}

test('verdictFor: all 8 rows, 2+ R values, T = 10/20/80, both variants, {n} = R-S', () => {
  for (const T of [10, 20, 80]) {
    for (const R of [Math.ceil(T / 2), Math.max(1, T - 3)]) {
      const rowsHit = new Set<number>();
      for (let S = 0; S <= T; S++) {
        const row = specRow(S, R, T);
        rowsHit.add(row);
        const n = R - S;
        const expectedA = SPEC_VERDICTS[row - 1]![0].replace('{n}', String(n));
        const expectedB = SPEC_VERDICTS[row - 1]![1].replace('{n}', String(n));
        assert.equal(verdictFor(S, R, T, 0), expectedA, `T=${T} R=${R} S=${S} row=${row} attempt=0`);
        assert.equal(verdictFor(S, R, T, 2), expectedA, `even attempt must reuse variant A`);
        assert.equal(verdictFor(S, R, T, 1), expectedB, `T=${T} R=${R} S=${S} row=${row} attempt=1`);
        assert.equal(verdictFor(S, R, T, 3), expectedB, `odd attempt must reuse variant B`);
      }
      assert.equal(rowsHit.size, 8, `T=${T} R=${R}: expected all 8 rows, saw ${[...rowsHit].sort().join(',')}`);
    }
  }
});

test('verdictFor: row 4/5 boundary (S = R-m is row 5, S = R-m-1 is row 4)', () => {
  for (const T of [10, 20, 80]) {
    const R = Math.ceil(T / 2);
    const m = Math.max(1, Math.round(T * 0.05));
    assert.equal(specRow(R - m, R, T), 5, `sanity T=${T}`);
    assert.equal(specRow(R - m - 1, R, T), 4, `sanity T=${T}`);
    assert.equal(verdictFor(R - m, R, T, 0), SPEC_VERDICTS[4]![0].replace('{n}', String(m)));
    assert.equal(verdictFor(R - m - 1, R, T, 0), SPEC_VERDICTS[3]![0]);
  }
});

test('verdictFor: row 7/8 boundary (S = R + max(2,ceil((T-R)/2)) is row 7, one less is row 8)', () => {
  for (const T of [10, 20, 80]) {
    const R = Math.ceil(T / 2);
    const bound = R + Math.max(2, Math.ceil((T - R) / 2));
    if (bound > T) continue; // not reachable at this R; covered by the T-3 case below instead
    assert.equal(specRow(bound, R, T), 7, `sanity T=${T}`);
    assert.equal(specRow(bound - 1, R, T), 8, `sanity T=${T}`);
    assert.equal(verdictFor(bound, R, T, 0), SPEC_VERDICTS[6]![0]);
    assert.equal(verdictFor(bound - 1, R, T, 0), SPEC_VERDICTS[7]![0]);
  }
});

test('every verdict line (both variants, {n} in 1/9/27) is <= 70 characters (§9.1 MUST)', () => {
  for (const [a, b] of SPEC_VERDICTS) {
    for (const n of [1, 9, 27]) {
      assert.ok(a.replace('{n}', String(n)).length <= 70, a);
      assert.ok(b.replace('{n}', String(n)).length <= 70, b);
    }
  }
});

// ─── 3. refusalText — every §6.5 row (15 combinations) ─────────────────────────────────────────

test('refusalText: none-left, exact plural per skill', () => {
  const cases: readonly [SkillId, string][] = [
    ['climber', 'No climbers left'],
    ['floater', 'No floaters left'],
    ['bomber', 'No bombers left'],
    ['blocker', 'No blockers left'],
    ['builder', 'No builders left'],
    ['basher', 'No bashers left'],
    ['miner', 'No miners left'],
    ['digger', 'No diggers left'],
  ];
  for (const [skill, expected] of cases) {
    assert.equal(refusalText({ reason: 'none-left' }, skill), expected);
  }
});

test('refusalText: not-applicable/already-climber and already-floater', () => {
  assert.equal(refusalText({ reason: 'not-applicable', detail: 'already-climber' }, 'climber'), 'Already a climber');
  assert.equal(refusalText({ reason: 'not-applicable', detail: 'already-floater' }, 'floater'), 'Already a floater');
});

test('refusalText: not-applicable/fuse-lit', () => {
  assert.equal(refusalText({ reason: 'not-applicable', detail: 'fuse-lit' }, 'bomber'), 'That fuse is already lit');
});

test('refusalText: not-applicable/airborne, exact verb per job skill (dig, build, bash, mine, block)', () => {
  const cases: readonly [SkillId, string][] = [
    ['digger', 'Needs solid ground to dig'],
    ['builder', 'Needs solid ground to build'],
    ['basher', 'Needs solid ground to bash'],
    ['miner', 'Needs solid ground to mine'],
    ['blocker', 'Needs solid ground to block'],
  ];
  for (const [skill, expected] of cases) {
    assert.equal(refusalText({ reason: 'not-applicable', detail: 'airborne' }, skill), expected);
  }
});

test('refusalText: not-applicable/is-blocker', () => {
  assert.equal(refusalText({ reason: 'not-applicable', detail: 'is-blocker' }, 'bomber'), 'Blockers only take a Bomber');
});

test('refusalText: not-applicable/same-job, exact gerund per skill', () => {
  const cases: readonly [SkillId, string][] = [
    ['digger', 'Already digging'],
    ['builder', 'Already building'],
    ['basher', 'Already bashing'],
    ['miner', 'Already mining'],
    ['blocker', 'Already blocking'],
  ];
  for (const [skill, expected] of cases) {
    assert.equal(refusalText({ reason: 'not-applicable', detail: 'same-job' }, skill), expected);
  }
});

test('refusalText: not-applicable/busy-dying', () => {
  assert.equal(refusalText({ reason: 'not-applicable', detail: 'busy-dying' }, 'digger'), 'Too late for that one');
});

test('refusalText: steel ahead and steel below', () => {
  assert.equal(refusalText({ reason: 'steel', detail: 'ahead' }, 'basher'), "Can't bash: steel ahead");
  assert.equal(refusalText({ reason: 'steel', detail: 'below' }, 'miner'), "Can't mine: steel below");
  assert.equal(refusalText({ reason: 'steel', detail: 'below' }, 'digger'), "Can't dig: steel below");
});

test('refusalText: one-way', () => {
  assert.equal(refusalText({ reason: 'one-way' }, 'basher'), "Can't bash against the arrows");
  assert.equal(refusalText({ reason: 'one-way' }, 'miner'), "Can't mine against the arrows");
});

test('refusalText: blocker-overlap, too-high, no-lemming, level-ended', () => {
  assert.equal(refusalText({ reason: 'blocker-overlap' }, 'blocker'), 'Too close to another blocker');
  assert.equal(refusalText({ reason: 'too-high' }, 'builder'), 'No room to build up here');
  assert.equal(refusalText({ reason: 'no-lemming' }, 'digger'), 'No mumble selected — press X to pick one');
  assert.equal(refusalText({ reason: 'level-ended' }, 'digger'), 'The level is over');
});

// ─── 4. describeLemming — every §6.3.1 label ────────────────────────────────────────────────────

test('describeLemming: walking/falling/jumping with permanent skills', () => {
  assert.equal(describeLemming(makeLemming({ state: 'walking', isClimber: true, isFloater: true })), 'Climber + Floater');
  assert.equal(describeLemming(makeLemming({ state: 'falling', isClimber: true, isFloater: true })), 'Climber + Floater');
  assert.equal(describeLemming(makeLemming({ state: 'jumping', isClimber: true, isFloater: true })), 'Climber + Floater');
  assert.equal(describeLemming(makeLemming({ state: 'walking', isClimber: true })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'walking', isFloater: true })), 'Floater');
});

test('describeLemming: plain state labels (§6.3.1 list)', () => {
  assert.equal(describeLemming(makeLemming({ state: 'walking' })), 'Walker');
  assert.equal(describeLemming(makeLemming({ state: 'falling' })), 'Faller');
  assert.equal(describeLemming(makeLemming({ state: 'climbing' })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'hoisting' })), 'Climber');
  assert.equal(describeLemming(makeLemming({ state: 'floating' })), 'Floater');
  assert.equal(describeLemming(makeLemming({ state: 'blocking' })), 'Blocker');
  assert.equal(describeLemming(makeLemming({ state: 'bashing' })), 'Basher');
  assert.equal(describeLemming(makeLemming({ state: 'mining' })), 'Miner');
  assert.equal(describeLemming(makeLemming({ state: 'digging' })), 'Digger');
});

test('describeLemming: builder bricks (singular/plural), out-of-bricks, bomber uh-oh', () => {
  assert.equal(describeLemming(makeLemming({ state: 'building', bricksLeft: 4 })), 'Builder · 4 bricks');
  assert.equal(describeLemming(makeLemming({ state: 'building', bricksLeft: 1 })), 'Builder · 1 brick');
  assert.equal(describeLemming(makeLemming({ state: 'shrugging' })), 'Builder · out of bricks');
  assert.equal(describeLemming(makeLemming({ state: 'ohno' })), 'Bomber · uh-oh');
});

test('describeLemming: lit-fuse suffix " · pops in {5..1}", suppressed during ohno/exploding', () => {
  assert.match(describeLemming(makeLemming({ state: 'walking', fuseTicks: 85 })), / · pops in 5$/);
  assert.match(describeLemming(makeLemming({ state: 'walking', fuseTicks: 1 })), / · pops in 1$/);
  assert.ok(!describeLemming(makeLemming({ state: 'ohno', fuseTicks: 5 })).includes('pops in'));
  assert.ok(!describeLemming(makeLemming({ state: 'exploding', fuseTicks: 5 })).includes('pops in'));
});

// ─── §7.2 spot checks (stage help / RR aria / minimap valuetext / level-card names) ─────────────

test('§7.2: stage help text is verbatim', () => {
  assert.equal(
    STAGE_HELP_TEXT,
    'Choose a skill with 1 to 8. Pick a mumble with X and Z, or move the cursor with W A S D. Press Space to assign. P pauses, H opens help.',
  );
});

test('§7.2: playfield aria-label "Playfield: {title}"', () => {
  assert.equal(playfieldAriaLabel('Spade Expectations'), 'Playfield: Spade Expectations');
});

test('§7.2: RR described text and interval formula ((99-RR)>>1)+4 ticks / 17', () => {
  assert.equal(RR_ARIA.describedText(50), 'Release rate 50, one every 1.6 seconds');
  assert.equal(RR_ARIA.groupLabel, 'Release rate');
  assert.equal(RR_ARIA.slower, 'Slower release');
  assert.equal(RR_ARIA.faster, 'Faster release');
});

test('§7.2: minimap valuetext "Showing {x0} to {x1} of {w}. {n} mumbles in view."', () => {
  assert.equal(minimapValueText(0, 400, 1600, 5), 'Showing 0 to 400 of 1600. 5 mumbles in view.');
});

test('§7.2: level-card accessible name "Level {n}: {title}, {state}. {tier}." (VIS-1: state moved in front of the tier so it stays contiguous with the rendered title; A11Y-4: a comma separates title from state, see cardAriaName\'s comment)', () => {
  assert.equal(
    LEVEL_SELECT.cardAriaName(3, 'Double Boiler', 'Gnarly', LEVEL_CARD_STATE.completed(14, 20)),
    'Level 3: Double Boiler, Completed · best 14 of 20. Gnarly.',
  );
  assert.equal(LEVEL_SELECT.cardAriaName(3, 'Double Boiler', 'Gnarly'), 'Level 3: Double Boiler. Gnarly.');
  assert.equal(LEVEL_SELECT.cardAriaLocked(2), 'Locked. Finish level 2 to unlock.');
});

test('VIS-1: LEVEL_CARD_STATE (fed into the aria-label) is textually identical to the rendered .level-card__state badge text, for every state — a literal-substring check like label-content-name-mismatch breaks the moment these two drift', () => {
  assert.equal(LEVEL_CARD_STATE.completed(8, 10), LEVEL_SELECT.completed(8, 10));
  assert.equal(LEVEL_CARD_STATE.perfect, LEVEL_SELECT.perfect);
  assert.equal(LEVEL_CARD_STATE.new, LEVEL_SELECT.new);
});

// ─── 5. §7.3 announcement catalogue — every row 1-35 except 21 ─────────────────────────────────

test('§7.3 #1 ready: exact template', () => {
  assert.equal(
    ANNOUNCE.ready('Spade Expectations', 5, 10, [{ skill: 'digger', count: 5 }], 'digger'),
    'Spade Expectations. Save 5 of 10. Skills: Digger 5. Digger chosen. Press H for help.',
  );
});
test('§7.3 #2 skillChosen', () => assert.equal(ANNOUNCE.skillChosen('digger', 3), 'Digger, 3 left'));
test('§7.3 #3 skillEmpty', () => assert.equal(ANNOUNCE.skillEmpty('digger'), 'No diggers left'));
test('§7.3 #4 selection, with and without a filter', () => {
  assert.equal(ANNOUNCE.selection('Walker', 'left', 3, 8), 'Walker, facing left, 3 of 8');
  assert.equal(ANNOUNCE.selection('Walker', 'right', 1, 4, 'walkers'), 'Walker, facing right, 1 of 4, Walkers only');
});
test('§7.3 #5 underCursor', () => assert.equal(ANNOUNCE.underCursor('Builder · 4 bricks'), 'Builder · 4 bricks under cursor'));
test('§7.3 #6 assigned, running vs paused', () => {
  assert.equal(ANNOUNCE.assigned('digger', false), 'Digger assigned');
  assert.equal(ANNOUNCE.assigned('digger', true), 'Digger assigned. Starts when you resume.');
});
test('§7.3 #8 selectedExited', () => assert.equal(ANNOUNCE.selectedExited, 'Your selected mumble got home'));
test('§7.3 #9 selectedDied', () => assert.equal(ANNOUNCE.selectedDied('drown'), 'Your selected mumble took an unplanned swim'));
test('§7.3 #10 batch, zero part omitted', () => {
  assert.equal(ANNOUNCE.batch(2, 1, 6, 10), '2 saved, 1 lost. 6 of 10 home.');
  assert.equal(ANNOUNCE.batch(0, 3, 6, 10), '3 lost. 6 of 10 home.');
  assert.equal(ANNOUNCE.batch(3, 0, 6, 10), '3 saved. 6 of 10 home.');
});
test('§7.3 #11-13 goal reached/impossible, only blockers left', () => {
  assert.equal(ANNOUNCE.goalReached(10, 10), 'Goal reached: 10 of 10 home!');
  assert.equal(ANNOUNCE.goalImpossible(10), 'Not enough mumbles left to reach 10. Press R to try again.');
  assert.equal(ANNOUNCE.onlyBlockersLeft, 'Only blockers are left. Use Pop all to finish.');
});
test('§7.3 #14 releaseRate, normal and at-minimum', () => {
  assert.equal(ANNOUNCE.releaseRate(50, '1.6', false), 'Release rate 50, one every 1.6 seconds');
  assert.equal(ANNOUNCE.releaseRate(30, '2.5', true), 'Release rate 30, one every 2.5 seconds, the lowest for this level');
});
test('§7.3 #15 paused/resumed', () => {
  assert.equal(ANNOUNCE.paused(true), 'Paused');
  assert.equal(ANNOUNCE.paused(false), 'Resumed');
});
test('§7.3 #16 stepped tick/second', () => {
  assert.equal(ANNOUNCE.stepped(1), 'Stepped 1 tick');
  assert.equal(ANNOUNCE.stepped(17), 'Stepped 1 second');
});
test('§7.3 #17 fastForward on/off', () => {
  assert.equal(ANNOUNCE.fastForward(true), 'Fast forward on');
  assert.equal(ANNOUNCE.fastForward(false), 'Fast forward off');
});
test('§7.3 #18 filter', () => {
  assert.equal(ANNOUNCE.filter('all', 9), 'Filter: All mumbles. 9 in view.');
  assert.equal(ANNOUNCE.filter('walkers', 5), 'Filter: Walkers only. 5 in view.');
  assert.equal(ANNOUNCE.filter('facing-left', 2), 'Filter: Facing left. 2 in view.');
  assert.equal(ANNOUNCE.filter('facing-right', 2), 'Filter: Facing right. 2 in view.');
});
test('§7.3 #19 follow: following/armed/off', () => {
  assert.equal(ANNOUNCE.follow('following'), 'Following your selected mumble');
  assert.equal(ANNOUNCE.follow('armed'), 'Follow on. Select a mumble to follow.');
  assert.equal(ANNOUNCE.follow('off'), 'Follow off');
});
test('§7.3 #20 mute', () => {
  assert.equal(ANNOUNCE.mute(true), 'Sound off');
  assert.equal(ANNOUNCE.mute(false), 'Sound on');
});
test('§7.3 #22 popAllArmed (assertive)', () => {
  assert.equal(ANNOUNCE.popAllArmed, 'Pop all is ready. Press N again to pop every mumble, or Escape to cancel.');
});
test('§7.3 #23 disarmed', () => {
  assert.equal(ANNOUNCE.disarmed('pop-all'), 'Pop all cancelled');
  assert.equal(ANNOUNCE.disarmed('restart'), 'Restart cancelled');
});
test('§7.3 #24 nukeStarted (assertive)', () => assert.equal(ANNOUNCE.nukeStarted, 'Popping all mumbles!'));
test('§7.3 #25 restartArmed (assertive)', () => {
  assert.equal(ANNOUNCE.restartArmed, 'Press R again to restart the level, or Escape to cancel.');
});
test('§7.3 #26 timeLow at 60/30/10', () => {
  assert.equal(ANNOUNCE.timeLow(60), '1 minute left');
  assert.equal(ANNOUNCE.timeLow(30), '30 seconds left');
  assert.equal(ANNOUNCE.timeLow(10), '10 seconds left');
});
test('§7.3 #27 relaxedTimeUp', () => {
  assert.equal(ANNOUNCE.relaxedTimeUp, "Time's up, but the relaxed timer lets you keep going.");
});
test('§7.3 #28 undo', () => {
  assert.equal(ANNOUNCE.undo('digger'), 'Undid Digger. Paused.');
  assert.equal(ANNOUNCE.undo(null), 'Nothing to undo');
});
test('§7.3 #29-30 builderLow / builderFinished', () => {
  assert.equal(ANNOUNCE.builderLow(3), 'Builder: 3 bricks left');
  assert.equal(ANNOUNCE.builderFinished, 'A builder ran out of planks');
});
test('§7.3 #31 hitSteel', () => assert.equal(ANNOUNCE.hitSteel('Basher'), 'Basher hit steel'));
test('§7.3 #32 letsGo / hatchOpen / allReleased', () => {
  assert.equal(ANNOUNCE.letsGo, 'Off we go!');
  assert.equal(ANNOUNCE.hatchOpen, 'Hatch open');
  assert.equal(ANNOUNCE.allReleased, 'All mumbles are out');
});
test('§7.3 #33 bomberWarning', () => assert.equal(ANNOUNCE.bomberWarning, 'A bomber is about to pop'));

const SAMPLE_OUTCOME: Pick<LevelOutcome, 'won' | 'reason' | 'saved' | 'total' | 'required'> = {
  won: true,
  reason: 'all-resolved',
  saved: 14,
  total: 20,
  required: 10,
};

test('§7.3 #34 levelEnded: won / lost / time-up exact lead-ins', () => {
  assert.equal(ANNOUNCE.levelEnded(SAMPLE_OUTCOME), 'Level complete! 14 of 20 saved, 10 needed.');
  assert.equal(
    ANNOUNCE.levelEnded({ ...SAMPLE_OUTCOME, won: false, reason: 'all-resolved', saved: 6 }),
    'Not quite. 6 of 20 saved, 10 needed.',
  );
  assert.equal(
    ANNOUNCE.levelEnded({ ...SAMPLE_OUTCOME, won: false, reason: 'time-up', saved: 6 }),
    "Time's up! 6 of 20 saved, 10 needed.",
  );
});

test('§7.3 #35 resultsTitle router = "{headline}. {verdict}" (literal concatenation, per spec)', () => {
  assert.equal(
    ANNOUNCE.resultsTitle('Level complete!', 'Bang on the number. Every mumble counted!'),
    'Level complete!. Bang on the number. Every mumble counted!',
  );
});

// ─── §7.3 politeness/level metadata vs the table ───────────────────────────────────────────────

/** [row, politeness, level] transcribed by hand from the §7.3 Pol./Level columns. */
const SPEC_META: readonly [number, 'polite' | 'assertive', 'essential' | 'all'][] = [
  [1, 'polite', 'essential'],
  [2, 'polite', 'essential'],
  [3, 'polite', 'essential'],
  [4, 'polite', 'essential'],
  [5, 'polite', 'essential'],
  [6, 'polite', 'essential'],
  [7, 'polite', 'essential'],
  [8, 'polite', 'essential'],
  [9, 'polite', 'essential'],
  [10, 'polite', 'essential'],
  [11, 'polite', 'essential'],
  [12, 'polite', 'essential'],
  [13, 'polite', 'essential'],
  [14, 'polite', 'essential'],
  [15, 'polite', 'essential'],
  [16, 'polite', 'all'],
  [17, 'polite', 'essential'],
  [18, 'polite', 'essential'],
  [19, 'polite', 'essential'],
  [20, 'polite', 'essential'],
  [22, 'assertive', 'essential'],
  [23, 'polite', 'essential'],
  [24, 'assertive', 'essential'],
  [25, 'assertive', 'essential'],
  [26, 'polite', 'essential'],
  [27, 'polite', 'essential'],
  [28, 'polite', 'essential'],
  [29, 'polite', 'all'],
  [30, 'polite', 'all'],
  [31, 'polite', 'all'],
  [32, 'polite', 'all'],
  [33, 'polite', 'all'],
  [34, 'assertive', 'essential'],
  [35, 'polite', 'essential'],
];

test('ANNOUNCE_META politeness/level matches the §7.3 table for every row (except #21)', () => {
  assert.equal(ANNOUNCE_META.length, 34, 'row 21 (dialog title read natively) has no ANNOUNCE_META entry');
  for (const [row, pol, level] of SPEC_META) {
    const entry = ANNOUNCE_META.find((e) => e.row === row);
    assert.ok(entry, `row ${row} missing from ANNOUNCE_META`);
    assert.equal(entry!.politeness, pol, `row ${row} politeness`);
    assert.equal(entry!.level, level, `row ${row} level`);
  }
});

// ui-lead decision (EV1a finding): row #1 "game ready" is exempt from the §9.1 90-char budget —
// its verbatim §7.3 template must enumerate up to 8 skills. Every other row must stay ≤ 90.
test('§7.3 row #1 keeps its verbatim template (exempt from the 90-char budget)', () => {
  assert.equal(
    ANNOUNCE.ready('Last Shift at the Foundry', 48, 60, [{ skill: 'climber', count: 2 }, { skill: 'builder', count: 2 }], 'climber'),
    'Last Shift at the Foundry. Save 48 of 60. Skills: Climber 2, Builder 2. Climber chosen. Press H for help.',
  );
});

test('every §7.3 announcement sample (except row #1) is <= 90 characters', () => {
  const samples: readonly string[] = [
    ANNOUNCE.skillChosen('digger', 3),
    ANNOUNCE.skillEmpty('digger'),
    ANNOUNCE.selection('Climber + Floater', 'left', 3, 8, 'walkers'),
    ANNOUNCE.underCursor('Builder · 4 bricks'),
    ANNOUNCE.assigned('digger', true),
    ANNOUNCE.selectedExited,
    ANNOUNCE.selectedDied('drown'),
    ANNOUNCE.batch(2, 1, 6, 10),
    ANNOUNCE.goalReached(48, 48),
    ANNOUNCE.goalImpossible(48),
    ANNOUNCE.onlyBlockersLeft,
    ANNOUNCE.releaseRate(1, '53.0', true),
    ANNOUNCE.paused(true),
    ANNOUNCE.stepped(17),
    ANNOUNCE.fastForward(true),
    ANNOUNCE.filter('facing-right', 5),
    ANNOUNCE.follow('armed'),
    ANNOUNCE.mute(true),
    ANNOUNCE.popAllArmed,
    ANNOUNCE.disarmed('restart'),
    ANNOUNCE.nukeStarted,
    ANNOUNCE.restartArmed,
    ANNOUNCE.timeLow(60),
    ANNOUNCE.relaxedTimeUp,
    ANNOUNCE.undo('digger'),
    ANNOUNCE.builderLow(3),
    ANNOUNCE.builderFinished,
    ANNOUNCE.hitSteel('Basher'),
    ANNOUNCE.bomberWarning,
    ANNOUNCE.levelEnded(SAMPLE_OUTCOME),
    ANNOUNCE.resultsTitle('Level complete!', 'Bang on the number. Every mumble counted!'),
  ];
  for (const s of samples) assert.ok(s.length <= 90, `"${s}" is ${s.length} chars`);
});

// ─── 6. No "Lemm-" spot check ────────────────────────────────────────────────────────────────

test('no "Lemm-" in the App. A-sourced constants exercised above', () => {
  const blob = JSON.stringify({
    GAME_TITLE,
    TAGLINE,
    SKILL_DESCRIPTIONS,
    DEATH_TEXT,
    HUD,
    BRIEFING,
    RESULTS,
    VERDICTS,
  });
  assert.ok(!/lemm/i.test(blob), `found "Lemm" in: ${blob}`);
});
