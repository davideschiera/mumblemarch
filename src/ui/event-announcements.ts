/**
 * EventAnnouncer — the tick-driven rows of the announcement catalogue (DESIGN §7.3): #1 game
 * ready, #10 saves/losses batch (≥ 2 s apart), #11 goal reached, #12 goal impossible, #13 only
 * blockers left (skipped: core auto-ends instead of emitting a matching GameEvent), #24
 * nuke-started (assertive), #26 time-low, #27 relaxed overtime, #29–#33 builder/steel/hatch/
 * bomber chatter (level 'all'), #34 level-ended (assertive). Exact templates + key/politeness/
 * level come from `ANNOUNCE` / `ANNOUNCE_META` (`strings.ts`, ported from §7.3 by E1).
 * Player-command feedback (#2–#9, #14–#23, #25, #28) is NOT here — those modules call `ctx.say`.
 * DOM-free: talks to the `Speaker` interface (announce-queue.ts), so it is testable in Node.
 * Owner: E5b.
 */
import { TICKS_PER_SECOND } from '../core/constants.ts';
import { SKILL_IDS } from '../core/types.ts';
import type { EventSink, GameEvent, Lemming, SkillCounts, SkillId } from '../core/types.ts';
import type { Speaker } from './announce-queue.ts';
import { ANNOUNCE, describeLemming } from './strings.ts';
import { EVENT_TEXT_GENERIC_MUMBLE } from './strings/announce.ts';
import { EVENT_BATCH_MS } from './ui-config.ts';

const BATCH_TICKS = Math.round((EVENT_BATCH_MS / 1000) * TICKS_PER_SECOND);

export interface EventAnnouncerOptions {
  /** Look a mumble up by id (e.g. #31 "{label} hit steel"). */
  readonly lemmingById: (id: number) => Readonly<Lemming> | undefined;
}

/** §7.3 #1 inputs. */
export interface IntroInfo {
  readonly title: string;
  readonly required: number;
  readonly total: number;
  readonly skills: SkillCounts;
  readonly selectedSkill: SkillId | null;
}

export class EventAnnouncer implements EventSink {
  private readonly speaker: Speaker;
  private readonly options: EventAnnouncerOptions;
  /** The level's save target, remembered from `announceIntro` for #10–#12. */
  private required = 0;
  private savedDelta = 0;
  private diedDelta = 0;
  /** Cumulative saved count, matching `GameCounts.saved` (§7.3 #10 "{saved} of {required} home"). */
  private totalSaved = 0;
  private lastFlushTick = 0;
  /**
   * A11Y-4 round 2: the #10 batch's coalesce key, `` `batch:${this.batchGeneration}` `` — bumped
   * whenever #11 "Goal reached" fires (see `flush`'s doc comment for why a plain, unchanging
   * 'batch' key isn't enough on its own).
   */
  private batchGeneration = 0;

  constructor(speaker: Speaker, options: EventAnnouncerOptions) {
    this.speaker = speaker;
    this.options = options;
  }

  /** §7.3 #1, once on construction. */
  announceIntro(info: IntroInfo): void {
    this.required = info.required;
    const skills = SKILL_IDS.filter((id) => info.skills[id] > 0).map((skill) => ({ skill, count: info.skills[skill] }));
    const chosen: SkillId = info.selectedSkill ?? skills[0]?.skill ?? SKILL_IDS[0] ?? 'digger';
    this.speaker.say(ANNOUNCE.ready(info.title, info.required, info.total, skills, chosen), { key: 'ready' });
  }

  /** Every tick (also with no events) so the #10 batch can flush on schedule. */
  handleEvents(events: readonly GameEvent[], tick: number): void {
    for (const event of events) this.handleEvent(event, tick);
    if ((this.savedDelta || this.diedDelta) && tick - this.lastFlushTick >= BATCH_TICKS) this.flush(tick);
  }

  private handleEvent(event: GameEvent, tick: number): void {
    switch (event.type) {
      case 'lets-go':
        this.speaker.say(ANNOUNCE.letsGo, { key: 'letsGo', level: 'all' });
        break;
      case 'entrance-opened':
        this.speaker.say(ANNOUNCE.hatchOpen, { key: 'hatchOpen', level: 'all' });
        break;
      case 'all-released':
        this.speaker.say(ANNOUNCE.allReleased, { key: 'allReleased', level: 'all' });
        break;
      case 'lemming-exited':
        this.savedDelta++;
        this.totalSaved++;
        break;
      case 'lemming-died':
        this.diedDelta++;
        break;
      case 'lemming-ohno':
        if (!event.nuking) this.speaker.say(ANNOUNCE.bomberWarning, { key: 'bomber', level: 'all' });
        break;
      case 'builder-low-bricks':
        this.speaker.say(ANNOUNCE.builderLow(event.bricksLeft), { key: 'builder', level: 'all' });
        break;
      case 'builder-finished':
        this.speaker.say(ANNOUNCE.builderFinished, { key: 'builder', level: 'all' });
        break;
      case 'hit-steel': {
        const lem = this.options.lemmingById(event.lemmingId);
        const label = lem ? describeLemming(lem) : EVENT_TEXT_GENERIC_MUMBLE;
        this.speaker.say(ANNOUNCE.hitSteel(label), { key: 'steel', level: 'all' });
        break;
      }
      case 'nuke-started':
        this.speaker.say(ANNOUNCE.nukeStarted, { politeness: 'assertive', key: 'arm' });
        break;
      case 'time-low':
        this.speaker.say(ANNOUNCE.timeLow(event.secondsLeft), { key: 'time' });
        break;
      case 'overtime-started':
        this.speaker.say(ANNOUNCE.relaxedTimeUp, { key: 'time' });
        break;
      case 'goal-reached':
        // A11Y-4: this event's own save (and any other save/loss since the last flush) may still be
        // sitting unflushed — the #10 batch only flushes on its own ≥2s schedule (`BATCH_TICKS`),
        // which this tick need not have reached. If we left it pending, the still-queued (or about
        // to be queued) "{s} saved… {saved} of {required} home." batch would keep an older `saved`
        // total than the "Goal reached: {saved} of {required} home!" clause about to join it in the
        // same utterance (rule 1's ≤50ms join) — one utterance stating two different running totals.
        // Flushing now (out of schedule) folds this save into the batch under its current-generation
        // key, so both clauses read the same fresh total when they join.
        if (this.savedDelta || this.diedDelta) this.flush(tick);
        // Round 2: SEAL that batch message by rolling the coalesce key to a new generation, whether
        // or not the line above just flushed one. Rule 2 ("replace in place, same queue position")
        // otherwise lets a LATER save's flush silently rewrite the still-queued 'batch' item that
        // already sits BEFORE 'goal' in the queue — the batch would then run ahead of the goal
        // clause it precedes ("7 saved. 7 of 5 home. Goal reached: 5 of 5 home!"), the same
        // one-utterance-two-totals problem in the other direction. A fresh key can't match that
        // queued item, so any later flush pushes/merges as its own NEW entry, which — being a new
        // push — queues AFTER 'goal' instead of rewriting what precedes it.
        this.batchGeneration++;
        this.speaker.say(ANNOUNCE.goalReached(event.saved, this.required), { key: 'goal' });
        break;
      case 'goal-impossible':
        this.speaker.say(ANNOUNCE.goalImpossible(this.required), { key: 'goal' });
        break;
      case 'level-ended':
        this.speaker.say(ANNOUNCE.levelEnded(event.outcome), { politeness: 'assertive', key: 'levelEnded' });
        break;
      default:
        break;
    }
  }

  /**
   * #10 "{s} saved, {l} lost. {saved} of {required} home." (batched, ≥ 2 s apart).
   *
   * A11Y-2: this flush only knows the deltas since ITS OWN last flush (game-tick time). When
   * several flushes land close enough in real (wall-clock) time that the announce queue's own
   * ≥ 1000 ms polite gate hasn't had a chance to speak the previous one yet (e.g. `__game.step()`
   * driving many ticks synchronously), rule 2's "replace in place by key" would otherwise keep
   * only this flush's own `s`/`l` and silently drop the earlier, still-queued batch's counts —
   * "1 saved" instead of the true total. `merge` sums `s` and `l` across every push it replaces;
   * "{saved} of {required}" is already the latest cumulative total either way.
   *
   * A11Y-4 round 2: the coalesce key includes `batchGeneration` (bumped once per goal-reached, see
   * that case's comment) so a flush from AFTER the goal can never replace-in-place a still-queued
   * batch message from BEFORE it — it queues its own new entry after 'goal' instead, keeping every
   * "N of R home" figure in one utterance in chronological (non-decreasing) reading order.
   */
  private flush(tick: number): void {
    const s = this.savedDelta;
    const l = this.diedDelta;
    const saved = this.totalSaved;
    const required = this.required;
    this.speaker.say(ANNOUNCE.batch(s, l, saved, required), {
      key: `batch:${this.batchGeneration}`,
      merge: (previous) => {
        const prior = previous as { readonly s: number; readonly l: number } | undefined;
        const totalS = (prior?.s ?? 0) + s;
        const totalL = (prior?.l ?? 0) + l;
        return { text: ANNOUNCE.batch(totalS, totalL, saved, required), data: { s: totalS, l: totalL } };
      },
    });
    this.savedDelta = this.diedDelta = 0;
    this.lastFlushTick = tick;
  }
}
