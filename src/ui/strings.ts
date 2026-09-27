/**
 * All user-facing text in one place (consistency now, i18n later).
 *
 * Source of truth: docs/design/DESIGN.md §9 (copywriting voice) + App. A of
 * docs/design/DESIGN-APPENDIX.md (the ready-made string table). Where this file and App. A
 * disagree, App. A wins — report the mismatch.
 *
 * DESIGN D1 / §9.1.4: the game is "Mumblemarch", the critters are "mumbles". Code identifiers
 * stay `lemming*`, but no user-facing string, title, icon or metadata may contain "Lemm-".
 *
 * This file (and everything under `ui/strings/`) MUST stay DOM-free: `tests/tsconfig.json` has
 * no DOM lib, and both are imported directly by node tests.
 */
import type { DeathCause, Lemming, LemmingState, LevelOutcome, Rejection, SkillId } from '../core/types.ts';
import { TICKS_PER_SECOND } from '../core/constants.ts';
import type { SelectionFilter } from '../core/picking.ts';
import type { ActionId } from '../input/actions.ts';

// ─── Title ─────────────────────────────────────────────────────────────────────────────────

export const GAME_TITLE = 'Mumblemarch';
export const TAGLINE = 'Little feet, big plans.';
export const CRITTER = { one: 'mumble', many: 'mumbles' } as const;

// ─── Tiers (DESIGN D5 / App. A) ────────────────────────────────────────────────────────────

export const TIER_NAMES = { 1: 'Breezy', 2: 'Knotty', 3: 'Gnarly', 4: 'Stampede' } as const;
export const TIER_BLURBS = {
  1: 'Gentle first steps',
  2: 'A few tangles',
  3: 'Think it through',
  4: 'Everything at once',
} as const;

// ─── Skills (App. A) ───────────────────────────────────────────────────────────────────────

export const SKILL_NAMES: Readonly<Record<SkillId, string>> = {
  climber: 'Climber',
  floater: 'Floater',
  bomber: 'Bomber',
  blocker: 'Blocker',
  builder: 'Builder',
  basher: 'Basher',
  miner: 'Miner',
  digger: 'Digger',
};

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

export const SKILL_PLURAL: Readonly<Record<SkillId, string>> = {
  climber: 'climbers',
  floater: 'floaters',
  bomber: 'bombers',
  blocker: 'blockers',
  builder: 'builders',
  basher: 'bashers',
  miner: 'miners',
  digger: 'diggers',
};
export const SKILL_VERB: Readonly<Record<SkillId, string>> = {
  climber: 'climb',
  floater: 'float',
  bomber: 'pop',
  blocker: 'block',
  builder: 'build',
  basher: 'bash',
  miner: 'mine',
  digger: 'dig',
};
export const SKILL_GERUND: Readonly<Record<SkillId, string>> = {
  climber: 'climbing',
  floater: 'floating',
  bomber: 'fizzing',
  blocker: 'blocking',
  builder: 'building',
  basher: 'bashing',
  miner: 'mining',
  digger: 'digging',
};

// ─── Mumble status (DESIGN §6.3.1) ─────────────────────────────────────────────────────────

/** Status-line names for what a mumble is doing (classic style: "WALKER 6"). */
export const STATE_LABELS: Readonly<Record<LemmingState, string>> = {
  falling: 'Faller',
  walking: 'Walker',
  jumping: 'Walker',
  climbing: 'Climber',
  hoisting: 'Climber',
  floating: 'Floater',
  splatting: 'Splat',
  blocking: 'Blocker',
  building: 'Builder',
  shrugging: 'Builder',
  bashing: 'Basher',
  mining: 'Miner',
  digging: 'Digger',
  ohno: 'Bomber',
  exploding: 'Bomber',
  drowning: 'Drowning',
  burning: 'Burning',
  exiting: 'Home',
};

/**
 * Seconds shown on a lit fuse (DESIGN §6.3.1 status suffix; §3.4 draws the in-canvas digit from
 * a slightly different formula tied to the overlay's own frame timing — this is the *spoken/
 * status-line* count, always 5…1).
 */
function fuseSecondsLeft(fuseTicks: number): number {
  return Math.min(5, Math.max(1, Math.ceil(fuseTicks / TICKS_PER_SECOND)));
}

/**
 * Short description of a mumble for the status line and announcements (DESIGN §6.3.1):
 * `Climber + Floater` / `Climber` / `Floater` for a walking/falling/jumping mumble that has a
 * permanent skill, the job name otherwise, plus a lit-fuse suffix.
 */
export function describeLemming(lem: Readonly<Lemming>): string {
  let label: string;
  if (lem.state === 'walking' || lem.state === 'falling' || lem.state === 'jumping') {
    if (lem.isClimber && lem.isFloater) label = 'Climber + Floater';
    else if (lem.isClimber) label = 'Climber';
    else if (lem.isFloater) label = 'Floater';
    else label = STATE_LABELS[lem.state];
  } else {
    switch (lem.state) {
      case 'building':
        label = `Builder · ${lem.bricksLeft} ${lem.bricksLeft === 1 ? 'brick' : 'bricks'}`;
        break;
      case 'shrugging':
        label = 'Builder · out of bricks';
        break;
      case 'ohno':
        label = 'Bomber · uh-oh';
        break;
      default:
        label = STATE_LABELS[lem.state];
    }
  }
  // The ohno/exploding poses already read as "about to pop"; a second countdown would be noise.
  if (lem.fuseTicks > 0 && lem.state !== 'ohno' && lem.state !== 'exploding') {
    label += ` · pops in ${fuseSecondsLeft(lem.fuseTicks)}`;
  }
  return label;
}

// ─── Controls (help screen, aria-keyshortcuts source) ──────────────────────────────────────

export const ACTION_LABELS: Readonly<Record<ActionId, string>> = {
  'skill-climber': 'Choose Climber',
  'skill-floater': 'Choose Floater',
  'skill-bomber': 'Choose Bomber',
  'skill-blocker': 'Choose Blocker',
  'skill-builder': 'Choose Builder',
  'skill-basher': 'Choose Basher',
  'skill-miner': 'Choose Miner',
  'skill-digger': 'Choose Digger',
  'skill-next': 'Next skill',
  'skill-prev': 'Previous skill',
  'lemming-next': 'Select next mumble',
  'lemming-prev': 'Select previous mumble',
  assign: 'Give the chosen skill to the selected mumble',
  'cursor-left': 'Move cursor left',
  'cursor-right': 'Move cursor right',
  'cursor-up': 'Move cursor up',
  'cursor-down': 'Move cursor down',
  'scroll-left': 'Scroll left',
  'scroll-right': 'Scroll right',
  'camera-center': 'Centre on the selected mumble',
  'camera-follow': 'Follow the selected mumble',
  'camera-hatch': 'Jump to the hatch',
  'camera-exit': 'Jump to the exit',
  'filter-cycle': 'Change the selection filter',
  'release-rate-down': 'Slower release',
  'release-rate-up': 'Faster release',
  pause: 'Pause / resume',
  'frame-step': 'Advance one step (while paused)',
  'fast-forward': 'Fast-forward',
  nuke: 'Pop all',
  undo: 'Undo the last job',
  restart: 'Restart level',
  mute: 'Mute / unmute',
  briefing: 'Show the level briefing',
  help: 'Help',
  menu: 'Pause menu',
};

/** Groups for the Help screen's controls table (DESIGN §7.10 #4). Covers all 36 ActionIds. */
export const ACTION_GROUPS: readonly { readonly label: string; readonly actions: readonly ActionId[] }[] = [
  {
    label: 'Skills',
    actions: [
      'skill-climber',
      'skill-floater',
      'skill-bomber',
      'skill-blocker',
      'skill-builder',
      'skill-basher',
      'skill-miner',
      'skill-digger',
      'skill-prev',
      'skill-next',
    ],
  },
  {
    label: 'Choosing mumbles',
    actions: ['lemming-prev', 'lemming-next', 'assign', 'cursor-left', 'cursor-right', 'cursor-up', 'cursor-down', 'filter-cycle'],
  },
  {
    label: 'Camera',
    actions: ['scroll-left', 'scroll-right', 'camera-center', 'camera-follow', 'camera-hatch', 'camera-exit'],
  },
  {
    label: 'Game flow',
    actions: [
      'pause',
      'frame-step',
      'fast-forward',
      'release-rate-down',
      'release-rate-up',
      'nuke',
      'undo',
      'restart',
      'briefing',
      'menu',
    ],
  },
  { label: 'Sound & info', actions: ['mute', 'help'] },
] as const;

// ─── Deaths (App. A) ───────────────────────────────────────────────────────────────────────

export const DEATH_TEXT: Readonly<Record<DeathCause, string>> = {
  splat: 'went splat',
  drown: 'took an unplanned swim',
  burn: 'got far too toasty',
  trap: 'got caught by a trap',
  explode: 'went pop',
  'out-of-bounds': 'fell off the map',
};

// ─── Captions & sound captions (App. A / DESIGN §9.4) ──────────────────────────────────────

/**
 * Keys are `SfxId`s (`src/audio/sfx-ids.ts`). Duplicated here as a literal union, rather than
 * imported, because `ui` must never import `audio`. Keep the two lists in sync.
 */
type SfxIdLiteral =
  | 'ui-move'
  | 'ui-select'
  | 'ui-deny'
  | 'ui-back'
  | 'ui-empty'
  | 'ui-arm'
  | 'assign'
  | 'entrance-open'
  | 'lets-go'
  | 'exit'
  | 'splat'
  | 'drown'
  | 'burn'
  | 'trap'
  | 'ohno'
  | 'explosion'
  | 'builder-low'
  | 'steel'
  | 'nuke'
  | 'time-low'
  | 'level-won'
  | 'level-lost'
  | 'pause'
  | 'unpause'
  | 'ff-on'
  | 'ff-off'
  | 'rr-up'
  | 'rr-down'
  | 'undo'
  | 'fuse'
  | 'builder-shrug'
  | 'trap-flytrap'
  | 'trap-press'
  | 'trap-pendulum'
  | 'trap-piston'
  | 'trap-clam';

/** Bark-strip captions (`Settings.captions === 'barks' | 'all'`), DESIGN §9.4. */
export const CAPTIONS: Partial<Record<SfxIdLiteral, string>> = {
  'lets-go': 'Off we go!',
  ohno: 'Uh-oh…',
  exit: 'Wheee!',
  'builder-shrug': 'Out of planks!',
};

/** Bracketed sound-effect captions (`Settings.captions === 'all'` only), DESIGN §9.4. */
export const SOUND_CAPTIONS: Partial<Record<SfxIdLiteral, string>> = {
  splat: '[splat]',
  drown: '[glug glug]',
  burn: '[tsss!]',
  explosion: '[pop!]',
  nuke: '[fizz… pop all!]',
  steel: '[tink]',
  'builder-low': '[plink]',
  fuse: '[fizz]',
  'time-low': '[tick-tock]',
  'entrance-open': '[creak… clunk]',
  'trap-flytrap': '[snap! chomp chomp]',
  'trap-press': '[ka-chunk!]',
  'trap-pendulum': '[swish… clang]',
  'trap-piston': '[hiss… bang!]',
  'trap-clam': '[clack-gloop]',
  trap: '[snap!]',
};

// ─── Refusals (App. A / DESIGN §6.5) ───────────────────────────────────────────────────────

export const REFUSAL = {
  noneLeft: (s: SkillId): string => `No ${SKILL_PLURAL[s]} left`,
  alreadyClimber: 'Already a climber',
  alreadyFloater: 'Already a floater',
  fuseLit: 'That fuse is already lit',
  airborne: (s: SkillId): string => `Needs solid ground to ${SKILL_VERB[s]}`,
  isBlocker: 'Blockers only take a Bomber',
  sameJob: (s: SkillId): string => `Already ${SKILL_GERUND[s]}`,
  dying: 'Too late for that one',
  steel: (s: SkillId, where: 'ahead' | 'below'): string => `Can't ${SKILL_VERB[s]}: steel ${where}`,
  oneWay: (s: SkillId): string => `Can't ${SKILL_VERB[s]} against the arrows`,
  blockerOverlap: 'Too close to another blocker',
  tooHigh: 'No room to build up here',
  noTarget: 'No mumble selected — press X to pick one',
  noMumbleHere: 'No mumble here',
  levelOver: 'The level is over',
} as const;

/** Click on empty ground (no command, status text only) — DESIGN §6.5 last row. */
export const NO_MUMBLE_HERE = REFUSAL.noMumbleHere;

/** Every `SkillRejectReason`/`RejectDetail` row of DESIGN §6.5, exactly. */
export function refusalText(rejection: Rejection, skill: SkillId): string {
  switch (rejection.reason) {
    case 'none-left':
      return REFUSAL.noneLeft(skill);
    case 'not-applicable':
      switch (rejection.detail) {
        case 'already-climber':
          return REFUSAL.alreadyClimber;
        case 'already-floater':
          return REFUSAL.alreadyFloater;
        case 'fuse-lit':
          return REFUSAL.fuseLit;
        case 'airborne':
          return REFUSAL.airborne(skill);
        case 'is-blocker':
          return REFUSAL.isBlocker;
        case 'same-job':
          return REFUSAL.sameJob(skill);
        case 'busy-dying':
        default:
          return REFUSAL.dying;
      }
    case 'steel':
      return REFUSAL.steel(skill, rejection.detail === 'below' ? 'below' : 'ahead');
    case 'one-way':
      return REFUSAL.oneWay(skill);
    case 'blocker-overlap':
      return REFUSAL.blockerOverlap;
    case 'too-high':
      return REFUSAL.tooHigh;
    case 'no-lemming':
      return REFUSAL.noTarget;
    case 'level-ended':
      return REFUSAL.levelOver;
  }
}

// ─── HUD (App. A / DESIGN §5.3) ────────────────────────────────────────────────────────────

export const HUD = {
  pausedPlate: '⏸ Paused — you can still assign skills',
  fastPlate: '⏩ ×3',
  popAll: 'Pop all',
  popArmed: 'Press again',
  popping: 'Popping…',
  popBubble: 'Press Pop all again (or N) to pop every mumble · Esc cancels',
  restartBubble: 'Press R again to restart · Esc cancels',
  out: (n: number): string => `Out ${n}`,
  saved: (s: number): string => `Saved ${s}`,
  need: (r: number): string => `need ${r}`,
  goalMet: 'goal met ✓',
  time: (m: string): string => `Time ${m}`,
  overtime: (m: string): string => `Time +${m} · relaxed`,
  muted: 'Muted',
  ready: (n: number): string => `Ready: ${n} ${n === 1 ? 'job starts' : 'jobs start'} when you resume`,
  filter: { all: 'Pick: All', walkers: 'Pick: Walkers', left: 'Pick: Facing ←', right: 'Pick: Facing →' },
} as const;

/** Chip label + status-line/announcer wording for each selection filter (DESIGN §6.3.4 / §7.2).
 * VIS-1 (label-content-name-mismatch): `aria` leads with the chip's own visible text ("Pick: All")
 * so it stays contiguous with the fuller DESIGN §7.2 wording that follows. */
export const FILTER_TEXT: Readonly<Record<SelectionFilter, { readonly chip: string; readonly aria: string; readonly spoken: string }>> = {
  all: { chip: HUD.filter.all, aria: `${HUD.filter.all}. Selection filter: all mumbles.`, spoken: 'All mumbles' },
  walkers: { chip: HUD.filter.walkers, aria: `${HUD.filter.walkers}. Selection filter: walkers only.`, spoken: 'Walkers only' },
  'facing-left': { chip: HUD.filter.left, aria: `${HUD.filter.left}. Selection filter: facing left.`, spoken: 'Facing left' },
  'facing-right': { chip: HUD.filter.right, aria: `${HUD.filter.right}. Selection filter: facing right.`, spoken: 'Facing right' },
};

export const FOLLOW = { label: 'Follow', aria: 'Follow selected mumble' } as const;

/** Canvas `aria-describedby` text (DESIGN §7.2), verbatim. */
export const STAGE_HELP_TEXT =
  'Choose a skill with 1 to 8. Pick a mumble with X and Z, or move the cursor with W A S D. Press Space to assign. P pauses, H opens help.';

export function playfieldAriaLabel(levelTitle: string): string {
  return `Playfield: ${levelTitle}`;
}

/** Release-rate group (DESIGN §5.3 / §7.2). */
export const RR_ARIA = {
  groupLabel: 'Release rate',
  slower: 'Slower release',
  faster: 'Faster release',
  describedText: (rr: number): string => `Release rate ${rr}, one every ${rrIntervalSeconds(rr).toFixed(1)} seconds`,
} as const;

/** `((99−RR)>>1)+4` ticks, in seconds (DESIGN §5.3/§6.4.4). */
export function rrIntervalSeconds(rr: number): number {
  const ticks = ((99 - rr) >> 1) + 4;
  return ticks / TICKS_PER_SECOND;
}

/** e.g. `"1.6 s"` — the RR value-well sub-label (DESIGN §5.3). */
export function rrIntervalText(rr: number): string {
  return `${rrIntervalSeconds(rr).toFixed(1)} s`;
}

/** Misc status-line / toast texts not tied to a specific object above (DESIGN §5.3/§6.4). */
export const STATUS = {
  rrBelowMin: (min: number): string => `Release rate can't go below ${min} here`,
  tick: (n: number, k: number): string => `Tick ${n} (+${k})`,
  noMumblesToSelect: 'No mumbles to select',
  noWalkersToSelect: 'No walkers to select',
  noSkillsLeft: 'No skills left',
  noMumbleSelected: 'No mumble selected',
  rewinding: 'Rewinding…',
  undone: 'Undone',
} as const;

export const MINIMAP_ARIA_LABEL = 'Level map';

/** `aria-valuetext` for the minimap slider (DESIGN §7.2). */
export function minimapValueText(x0: number, x1: number, levelWidth: number, mumblesInView: number): string {
  return `Showing ${x0} to ${x1} of ${levelWidth}. ${mumblesInView} mumbles in view.`;
}

/**
 * Appends `×{N}` (N ≥ 2), a `Selected:` prefix and/or a predicted-refusal suffix to a focus
 * label (DESIGN §5.3/§6.3.1). `refusal` is the already-rendered refusal text; its first letter
 * is lower-cased to read naturally after the em dash (e.g. "— can't dig: steel below").
 */
export interface FocusLabelOptions {
  readonly selected?: boolean;
  readonly refusal?: string;
}
export function focusLabelText(label: string, count = 1, opts: FocusLabelOptions = {}): string {
  const counted = count >= 2 ? `${label} ×${count}` : label;
  const withSelection = opts.selected ? `Selected: ${counted}` : counted;
  return opts.refusal ? `${withSelection} — ${lowerFirst(opts.refusal)}` : withSelection;
}

/** The focus label when the filter chip excludes every candidate under the pointer. */
export function noMumblesHereText(pluralLabel: string): string {
  return `No ${pluralLabel} here`;
}

function lowerFirst(s: string): string {
  return s.length === 0 ? s : s[0]!.toLowerCase() + s.slice(1);
}

// ─── Briefing (App. A / DESIGN §5.4 / §9.3) ────────────────────────────────────────────────

export const BRIEFING = {
  mumbles: 'Mumbles',
  save: 'Save',
  rate: 'Release rate',
  time: 'Time',
  tier: 'Tier',
  skills: 'Skills',
  showHint: 'Show hint',
  start: "Let's march!",
  back: 'Back to levels',
} as const;

export const BRIEFING_EXTRA = {
  levelHeader: (n: number, tierName: string): string => `Level ${n} · ${tierName}`,
  timeRelaxed: (clock: string): string => `${clock} · relaxed`,
  best: (saved: number): string => `Best: ${saved} saved`,
} as const;

// ─── Results (App. A / DESIGN §9.5) ────────────────────────────────────────────────────────

export const RESULTS = {
  won: 'Level complete!',
  lost: 'Not quite this time',
  timeUp: "Time's up!",
  score: (s: number, t: number, r: number): string => `You saved ${s} of ${t} · needed ${r}`,
  relaxed: 'Played with the relaxed timer.',
  relaxedOvertime: (m: string): string => `Played with the relaxed timer · finished ${m} into overtime.`,
  beatClock: 'Beat the clock ✓',
  newBest: 'New best!',
  next: 'Next level',
  retry: 'Try again',
  levels: 'Levels',
} as const;

/** DESIGN §9.5's 8-row verdict table; `{n}` = R − S, substituted by `verdictFor`. */
export const VERDICTS: readonly (readonly [string, string])[] = [
  ['Every single mumble made it home. Take a bow!', 'A full house! Nobody left behind.'],
  ['Nobody made it home this time. Fancy another go?', 'Not one through yet. The hatch is ready when you are.'],
  ['That route needs a rethink. Try a different first job?', 'Plenty to figure out here. Peek at the hint if you like.'],
  ["Getting there! A couple of tweaks and they're home.", "Good progress. A few more mumbles and it's yours."],
  ['So close! Just {n} more needed.', "A whisker short: {n} more and it's done."],
  ['Bang on the number. Every mumble counted!', 'Exactly enough. Phew!'],
  ['Brilliant! You marched right past the target.', 'What a crowd at the exit. Nicely marched!'],
  ['Nicely done. That went smoothly.', 'Tidy work. On to the next one?'],
];

/**
 * DESIGN §9.5 verdict rule, checked top to bottom, counted in mumbles: `m = max(1, round(T×0.05))`.
 * `attempt mod 2` picks variant A (even) / B (odd), deterministically.
 */
export function verdictFor(S: number, R: number, T: number, attempt: number): string {
  const m = Math.max(1, Math.round(T * 0.05));
  let row: number;
  if (S === T) row = 1;
  else if (S === 0) row = 2;
  else if (S < Math.ceil(R / 2)) row = 3;
  else if (S < R - m) row = 4;
  else if (S < R) row = 5;
  else if (S === R) row = 6;
  else if (S >= R + Math.max(2, Math.ceil((T - R) / 2))) row = 7;
  else row = 8;
  const variant = attempt % 2 === 0 ? 0 : 1;
  const template = VERDICTS[row - 1]![variant];
  return template.replace('{n}', String(R - S));
}

/** DESIGN §9.5 headline: won / lost-all-resolved / lost-at-time-up. */
export function resultsHeadline(outcome: Pick<LevelOutcome, 'won' | 'reason'>): string {
  if (outcome.won) return RESULTS.won;
  return outcome.reason === 'time-up' ? RESULTS.timeUp : RESULTS.lost;
}

/** The muted relaxed-timer note under the verdict (DESIGN §9.5); call only when relaxedTimer was on. */
export function relaxedNote(overtimeTicks: number): string {
  return overtimeTicks > 0 ? RESULTS.relaxedOvertime(formatClock(overtimeTicks)) : RESULTS.relaxed;
}

/** "Beat the clock ✓" shows only for a standard-timer win finished within the clock (DESIGN §9.5). */
export function beatClockLine(won: boolean, inTime: boolean, relaxedTimer: boolean): string | null {
  return won && inTime && !relaxedTimer ? RESULTS.beatClock : null;
}

// ─── Live-region announcements (DESIGN §7.3, exact templates) ─────────────────────────────

export type AnnouncePoliteness = 'polite' | 'assertive';
export type AnnounceLevel = 'essential' | 'all';

export const ANNOUNCE = {
  /**
   * #1 Game screen ready. ui-lead decision: this one orientation message is EXEMPT from the §9.1
   * "announcements ≤ 90 characters" budget, because its verbatim §7.3 template must enumerate the
   * level's skills (up to 8) — every other row stays ≤ 90.
   */
  ready(
    title: string,
    required: number,
    total: number,
    skills: readonly { readonly skill: SkillId; readonly count: number }[],
    chosenSkill: SkillId,
  ): string {
    const list = skills.map((s) => `${SKILL_NAMES[s.skill]} ${s.count}`).join(', ');
    return `${title}. Save ${required} of ${total}. Skills: ${list}. ${SKILL_NAMES[chosenSkill]} chosen. Press H for help.`;
  },
  /** #2 Skill chosen. */
  skillChosen(skill: SkillId, n: number): string {
    return `${SKILL_NAMES[skill]}, ${n} left`;
  },
  /** #3 0-left skill pressed. */
  skillEmpty(skill: SkillId): string {
    return REFUSAL.noneLeft(skill);
  },
  /** #4 Keyboard/click selection. */
  selection(label: string, dir: 'left' | 'right', i: number, n: number, filter: SelectionFilter = 'all'): string {
    const base = `${label}, facing ${dir}, ${i} of ${n}`;
    return filter === 'all' ? base : `${base}, ${FILTER_TEXT[filter].spoken}`;
  },
  /** #5 Cursor settles 150 ms on a pick. */
  underCursor(label: string): string {
    return `${label} under cursor`;
  },
  /** #6 Assignment accepted (keyboard; mouse announces at 'all' level with the same text). */
  assigned(skill: SkillId, paused: boolean): string {
    return paused ? `${SKILL_NAMES[skill]} assigned. Starts when you resume.` : `${SKILL_NAMES[skill]} assigned`;
  },
  /** #8 Selected mumble exits. */
  selectedExited: 'Your selected mumble got home',
  /** #9 Selected mumble dies. */
  selectedDied(cause: DeathCause): string {
    return `Your selected mumble ${DEATH_TEXT[cause]}`;
  },
  /** #10 Saves/losses batch (omit whichever count is zero). */
  batch(s: number, l: number, saved: number, required: number): string {
    const parts: string[] = [];
    if (s > 0) parts.push(`${s} saved`);
    if (l > 0) parts.push(`${l} lost`);
    const head = parts.length > 0 ? `${parts.join(', ')}. ` : '';
    return `${head}${saved} of ${required} home.`;
  },
  /** #11 Goal reached (first time). */
  goalReached(saved: number, required: number): string {
    return `Goal reached: ${saved} of ${required} home!`;
  },
  /** #12 Goal now impossible. */
  goalImpossible(required: number): string {
    return `Not enough mumbles left to reach ${required}. Press R to try again.`;
  },
  /** #13 Only blockers left. */
  onlyBlockersLeft: 'Only blockers are left. Use Pop all to finish.',
  /** #14 Release rate settled (500 ms debounce). `seconds` is pre-formatted, e.g. "1.6". */
  releaseRate(rr: number, seconds: string, atMin: boolean): string {
    return atMin
      ? `Release rate ${rr}, one every ${seconds} seconds, the lowest for this level`
      : `Release rate ${rr}, one every ${seconds} seconds`;
  },
  /** #15 Pause / resume. */
  paused(isPaused: boolean): string {
    return isPaused ? 'Paused' : 'Resumed';
  },
  /** #16 Frame-step. */
  stepped(ticks: number): string {
    return ticks >= TICKS_PER_SECOND ? 'Stepped 1 second' : 'Stepped 1 tick';
  },
  /** #17 Fast-forward. */
  fastForward(on: boolean): string {
    return on ? 'Fast forward on' : 'Fast forward off';
  },
  /** #18 Filter changed. */
  filter(filter: SelectionFilter, nInView: number): string {
    return `Filter: ${FILTER_TEXT[filter].spoken}. ${nInView} in view.`;
  },
  /** #19 Follow toggled/armed. */
  follow(state: 'following' | 'armed' | 'off'): string {
    switch (state) {
      case 'following':
        return 'Following your selected mumble';
      case 'armed':
        return 'Follow on. Select a mumble to follow.';
      case 'off':
        return 'Follow off';
    }
  },
  /** #20 Mute toggled. */
  mute(muted: boolean): string {
    return muted ? 'Sound off' : 'Sound on';
  },
  /** #22 Pop all armed (assertive). */
  popAllArmed: 'Pop all is ready. Press N again to pop every mumble, or Escape to cancel.',
  /** #23 Pop all / restart disarmed. */
  disarmed(kind: 'pop-all' | 'restart'): string {
    return kind === 'pop-all' ? 'Pop all cancelled' : 'Restart cancelled';
  },
  /** #24 `nuke-started` (assertive). */
  nukeStarted: 'Popping all mumbles!',
  /** #25 Restart armed (assertive). */
  restartArmed: 'Press R again to restart the level, or Escape to cancel.',
  /** #26 `time-low` at 60/30/10 s. */
  timeLow(secondsLeft: number): string {
    return secondsLeft === 60 ? '1 minute left' : `${secondsLeft} seconds left`;
  },
  /** #27 Relaxed clock hits 0 (once). */
  relaxedTimeUp: "Time's up, but the relaxed timer lets you keep going.",
  /** #28 Undo. */
  undo(skill: SkillId | null): string {
    return skill ? `Undid ${SKILL_NAMES[skill]}. Paused.` : 'Nothing to undo';
  },
  /** #29 `builder-low-bricks`. */
  builderLow(n: number): string {
    return `Builder: ${n} bricks left`;
  },
  /** #30 `builder-finished`. */
  builderFinished: 'A builder ran out of planks',
  /** #31 `hit-steel`. */
  hitSteel(label: string): string {
    return `${label} hit steel`;
  },
  /** #32 `lets-go` / `entrance-opened` / `all-released`. */
  letsGo: 'Off we go!',
  hatchOpen: 'Hatch open',
  allReleased: 'All mumbles are out',
  /** #33 `lemming-ohno` (not nuking). */
  bomberWarning: 'A bomber is about to pop',
  /** #34 `level-ended` (assertive). */
  levelEnded(outcome: Pick<LevelOutcome, 'won' | 'reason' | 'saved' | 'total' | 'required'>): string {
    const lead = outcome.won ? 'Level complete!' : outcome.reason === 'time-up' ? "Time's up!" : 'Not quite.';
    return `${lead} ${outcome.saved} of ${outcome.total} saved, ${outcome.required} needed.`;
  },
  /** #35 Results screen router title. */
  resultsTitle(headline: string, verdict: string): string {
    return `${headline}. ${verdict}`;
  },
} as const;

export interface AnnounceMetaEntry {
  /** Row number in DESIGN §7.3. */
  readonly row: number;
  /** `ANNOUNCE` property (and Announcer throttle/coalesce key) for this row. */
  readonly key: string;
  readonly politeness: AnnouncePoliteness;
  readonly level: AnnounceLevel;
  readonly note?: string;
}

/**
 * Machine-readable mirror of the §7.3 catalogue's Pol./Level/Throttle-key columns, so the
 * announcer and its callers use the right key/level without re-reading the prose table.
 * Row 21 (briefing/help opened) is omitted: the dialog's own `<h2>` is read natively.
 */
export const ANNOUNCE_META: readonly AnnounceMetaEntry[] = [
  { row: 1, key: 'ready', politeness: 'polite', level: 'essential' },
  { row: 2, key: 'skill', politeness: 'polite', level: 'essential' },
  { row: 3, key: 'skill', politeness: 'polite', level: 'essential' },
  { row: 4, key: 'selection', politeness: 'polite', level: 'essential' },
  { row: 5, key: 'selection', politeness: 'polite', level: 'essential' },
  { row: 6, key: 'assign', politeness: 'polite', level: 'essential', note: 'mouse assignment announces at level "all"' },
  { row: 7, key: 'refusal', politeness: 'polite', level: 'essential' },
  { row: 8, key: 'selection', politeness: 'polite', level: 'essential' },
  { row: 9, key: 'selection', politeness: 'polite', level: 'essential' },
  { row: 10, key: 'batch', politeness: 'polite', level: 'essential', note: 'coalesce ≥ 2 s apart' },
  { row: 11, key: 'goal', politeness: 'polite', level: 'essential' },
  { row: 12, key: 'goal', politeness: 'polite', level: 'essential' },
  { row: 13, key: 'goal', politeness: 'polite', level: 'essential' },
  { row: 14, key: 'rr', politeness: 'polite', level: 'essential', note: '500 ms debounce' },
  { row: 15, key: 'pause', politeness: 'polite', level: 'essential' },
  { row: 16, key: 'step', politeness: 'polite', level: 'all', note: '300 ms debounce' },
  { row: 17, key: 'speed', politeness: 'polite', level: 'essential' },
  { row: 18, key: 'filter', politeness: 'polite', level: 'essential' },
  { row: 19, key: 'follow', politeness: 'polite', level: 'essential' },
  { row: 20, key: 'mute', politeness: 'polite', level: 'essential' },
  { row: 22, key: 'arm', politeness: 'assertive', level: 'essential' },
  { row: 23, key: 'arm', politeness: 'polite', level: 'essential' },
  { row: 24, key: 'arm', politeness: 'assertive', level: 'essential' },
  { row: 25, key: 'arm', politeness: 'assertive', level: 'essential' },
  { row: 26, key: 'time', politeness: 'polite', level: 'essential' },
  { row: 27, key: 'time', politeness: 'polite', level: 'essential' },
  { row: 28, key: 'undo', politeness: 'polite', level: 'essential' },
  { row: 29, key: 'builder', politeness: 'polite', level: 'all' },
  { row: 30, key: 'builder', politeness: 'polite', level: 'all' },
  { row: 31, key: 'steel', politeness: 'polite', level: 'all' },
  { row: 32, key: 'letsGo', politeness: 'polite', level: 'all', note: 'own key per sub-event' },
  { row: 33, key: 'bomber', politeness: 'polite', level: 'all' },
  { row: 34, key: 'levelEnded', politeness: 'assertive', level: 'essential' },
  { row: 35, key: 'results', politeness: 'polite', level: 'essential' },
];

// ─── Title screen (DESIGN §5.4 / §9.3) ─────────────────────────────────────────────────────

export const TITLE = {
  start: 'Start',
  continue: (n: number, title: string): string => `Continue — ${n} · ${title}`,
  levels: 'Levels',
  howToPlay: 'How to play',
  settings: 'Settings',
  soundNote: 'Sound starts after your first click or key press.',
} as const;

// ─── Level select (DESIGN §5.4 / §7.2 / §9.3) ──────────────────────────────────────────────

export const LEVEL_SELECT = {
  title: 'Levels',
  cardNumber: (n: number): string => `Level ${n}`,
  locked: (prevLevelNumber: number): string => `Finish level ${prevLevelNumber} to unlock`,
  new: 'New',
  completed: (best: number, total: number): string => `Completed · best ${best} of ${total}`,
  perfect: 'Everyone home',
  unlockAllLabel: 'Unlock all levels',
  /** `<button>` accessible name. DESIGN §7.2's literal order is "Level 3: {title}. Breezy.
   * Completed, best 14 of 20." (title, tier, state) — but the card only ever RENDERS the title
   * immediately followed by the state text (the tier name isn't shown on the card itself), and
   * axe's `label-content-name-mismatch` (VIS-1, WCAG 2.5.3) requires that rendered "{title}
   * {state}" run to appear contiguous in the name. So the state moves in front of the tier here:
   * "Level 3: {title}, {state}. {tier}." (e.g. "Level 3: Double Boiler, Completed · best 14 of 20.
   * Gnarly."). With no `stateText` there's nothing to keep contiguous, so the order is unchanged.
   * A11Y-4: a comma sits between the title and the state — with none, "Spade Expectations Everyone
   * home." reads as one run-on. axe strips punctuation before its substring check, so the comma
   * (present only in the name, not in the rendered title/state text nodes) doesn't break the match. */
  cardAriaName: (n: number, title: string, tierName: string, stateText?: string): string =>
    stateText ? `Level ${n}: ${title}, ${stateText}. ${tierName}.` : `Level ${n}: ${title}. ${tierName}.`,
  cardAriaLocked: (prevLevelNumber: number): string => `Locked. Finish level ${prevLevelNumber} to unlock.`,
} as const;

/** The state-row text fed into `LEVEL_SELECT.cardAriaName` as `stateText` (DESIGN §5.4). VIS-1:
 * this MUST be textually identical to what's actually rendered in the `.level-card__state` badge
 * (`LEVEL_SELECT.completed`/`.perfect`/`.new` above) — axe's `label-content-name-mismatch` does a
 * literal substring check, so `completed` previously using a comma here against a rendered "·"
 * (DESIGN §7.2's own aria-name example vs. its §5.4 visible-badge example disagree on that one
 * character) was, on its own, enough to fail it even after the reordering above. */
export const LEVEL_CARD_STATE = {
  completed: (best: number, total: number): string => `Completed · best ${best} of ${total}`,
  perfect: 'Everyone home',
  new: 'New',
} as const;

// ─── Pause menu (DESIGN §5.4 / §9.3) ───────────────────────────────────────────────────────

export const PAUSE_MENU = {
  title: 'Paused',
  objective: (saved: number, required: number, total: number, timeLeft: string): string =>
    `Saved ${saved} · need ${required} of ${total} · ${timeLeft} left`,
  resume: 'Resume',
  restart: 'Restart level',
  briefing: 'Show briefing',
  help: 'How to play',
  settings: 'Settings',
  quit: 'Quit to levels',
  restartConfirmBody: 'Restart? Your mumbles go back to the hatch.',
  restartConfirmYes: 'Restart',
  restartConfirmCancel: 'Cancel',
} as const;

// ─── Help / controls screen (DESIGN §7.10 / §9.3) ──────────────────────────────────────────

export const HELP = {
  /** §7.10 #1, verbatim. */
  goal: 'Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs.',
  /** §9.3 "Help intro" sample, verbatim — used where a single paragraph is wanted. */
  intro:
    'Get enough mumbles from the hatch to the exit. They walk on their own; you give them jobs. ' +
    'Pick a skill, then pick a mumble. Pause any time — you can still give jobs while paused.',
  quickStartKeyboard: [
    'Choose a skill: 1–8, or Q/E.',
    'Pick a mumble: X/] next, Z/[ previous, or move the cursor with W A S D.',
    'Assign: Space or Enter. Press P first if you want time to think.',
    'Watch: L follows, C re-centres, . steps while paused.',
  ] as readonly string[],
  quickStartMouse: 'Pick a skill below, then click a mumble.',
  assists: [
    'Pause any time and still give jobs — Assign while paused.',
    'The filter chip narrows who a click or key picks.',
    'Follow keeps the camera on your selected mumble.',
    'The fall ruler marks safe vs deadly drops under the cursor.',
    'The relaxed timer lets the clock run past 0:00 without ending the level.',
    'Game speed slows the simulation down without costing clock time.',
  ] as readonly string[],
  screenReaderTips:
    "The playfield is an application: keys go straight to the game. If a key doesn't work, press NVDA+Space or use the toolbar. Announcements can be set to Off, Essential or All.",
  controlsHeading: 'Controls',
  mouseHeading: 'Mouse',
  keyboardHeading: 'Keyboard',
  skillsHeading: 'Skills',
  assistsHeading: 'Assists',
} as const;

/** Static mouse table (§6.1.3) — the keyboard table is generated from live bindings instead. */
export const HELP_MOUSE_TABLE: readonly { readonly input: string; readonly where: string; readonly behaviour: string }[] = [
  { input: 'Hover', where: 'Playfield', behaviour: 'Highlights the pick; the status line names it.' },
  { input: 'Left press', where: 'On a mumble', behaviour: 'Selects it and assigns the chosen skill.' },
  { input: 'Left press', where: 'Empty ground', behaviour: 'Nothing is assigned or deselected.' },
  { input: 'Shift + left press', where: 'Playfield', behaviour: 'Walkers only for this click.' },
  { input: 'Wheel / trackpad', where: 'Playfield', behaviour: 'Scrolls the camera.' },
  { input: 'Edge zones', where: 'Playfield edges', behaviour: 'Scrolls the camera after a short dwell.' },
  { input: 'Press / drag', where: 'Minimap', behaviour: 'Centres the camera; drag keeps scrolling.' },
  { input: 'Click', where: 'HUD buttons', behaviour: 'Activates the control.' },
] as const;

// ─── Settings (DESIGN §7.11 / §5.4) ────────────────────────────────────────────────────────

export const SETTINGS = {
  sections: { sound: 'Sound', display: 'Display', play: 'Play', controls: 'Controls' },
  fields: {
    masterVolume: 'Master',
    sfxVolume: 'Effects',
    voiceVolume: 'Mumble chirps',
    musicVolume: 'Music',
    muted: 'Mute',
    musicEnabled: 'Play music',
    motion: 'Motion',
    highContrast: 'Clear physics view',
    scale: 'Scale',
    cursorSize: 'Cursor size',
    captions: 'Captions',
    announcements: 'Announcements',
    relaxedTimer: 'Relaxed timer',
    fallRuler: 'Fall-height ruler',
    unlockAll: 'Unlock all levels',
    edgeScroll: 'Edge scrolling',
    cameraFollow: 'Follow selected mumble',
    assignOn: 'Assign on release',
    pauseOnBlur: 'Pause when the window loses focus',
    pauseWhileChoosing: 'Choosing a skill pauses',
    gameSpeed: 'Game speed',
    showKeyHints: 'Show key hints',
  },
  options: {
    motion: { system: 'System', reduce: 'Reduced', full: 'Full' },
    scale: { auto: 'Auto', '2': '×2', '3': '×3', '4': '×4' },
    cursorSize: { '32': 'Small', '48': 'Medium', '64': 'Large' },
    captions: { off: 'Off', barks: 'Barks', all: 'All' },
    announcements: { off: 'Off', essential: 'Essential', all: 'All' },
    assignOn: { press: 'On press', release: 'On release' },
    gameSpeed: { '1': '100%', '0.75': '75%', '0.5': '50%' },
  },
  rebind: {
    change: 'Change',
    pressAKey: 'Press a key…',
    reservedKey: (keyLabel: string): string => `${keyLabel} is reserved and can't be used`,
    clash: (keyLabel: string, actionLabel: string): string => `${keyLabel} is already ${actionLabel}`,
    swap: 'Swap',
    cancel: 'Cancel',
    resetDefaults: 'Reset to defaults',
    saved: 'Saved',
  },
} as const;

/** Contextual tips (§9.3), shown once each. */
export const TIPS: readonly string[] = [
  'Tip: press P to pause. You can still give jobs.',
  'Tip: X and Z pick mumbles one by one.',
  'Tip: V picks only walkers in a crowd.',
];

// ─── Misc ───────────────────────────────────────────────────────────────────────────────────

/** `m:ss`, floor-rounded (status line, briefing facts, pause-menu objective). */
export function formatClock(ticks: number): string {
  const totalSeconds = Math.max(0, Math.floor(ticks / TICKS_PER_SECOND));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Later workers add missing copy to these files, not here (keeps this file mergeable).
// One file per worker; export names must be unique across files.
export * from './strings/hud.ts';
export * from './strings/status.ts';
export * from './strings/screens.ts';
export * from './strings/levels.ts';
export * from './strings/settings.ts';
export * from './strings/help.ts';
export * from './strings/camera.ts';
export * from './strings/selection.ts';
export * from './strings/game.ts';
export * from './strings/flow.ts';
export * from './strings/announce.ts';
export * from './strings/shell.ts';
