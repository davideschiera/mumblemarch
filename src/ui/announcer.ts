/**
 * Screen-reader announcer: the ONLY code that writes to the ARIA live regions in index.html.
 * A thin DOM wrapper around the pure `AnnounceQueue` (DESIGN §7.3 throttle rules): whatever the
 * queue joins into one utterance (rule 1: things said within its ~50 ms idle window) is written
 * in one go; the region is cleared first so identical text is still read out.
 * Owner: E5b (E0 set the API: say(message, options) / setLevel / log; E5b drives the queue timer).
 */
import type { AnnouncementLevel } from '../persistence/schema.ts';
import { AnnounceQueue, type AnnounceOptions, type AnnouncerLogEntry, type Politeness, type Speaker } from './announce-queue.ts';
import { ANNOUNCE_JOIN_MS } from './ui-config.ts';

export type { AnnounceOptions, AnnouncerLogEntry, Politeness, Speaker } from './announce-queue.ts';

export class Announcer implements Speaker {
  private readonly regions: Readonly<Record<Politeness, HTMLElement>>;
  private readonly queue: AnnounceQueue;
  private readonly clock: () => number;
  private timer: number | null = null;
  /** Clock time the pending timer is set to fire, so a more urgent push can move it earlier. */
  private scheduledAt: number | null = null;

  constructor(polite: HTMLElement, assertive: HTMLElement, clock: () => number = () => performance.now()) {
    this.regions = { polite, assertive };
    this.queue = new AnnounceQueue(clock);
    this.clock = clock;
  }

  /**
   * Speak `message` (DESIGN §7.3). `options.key` coalesces, `politeness` defaults to polite,
   * `level` 'all' messages are dropped unless the setting is All, `userInitiated` bypasses the
   * 3 s de-dup.
   */
  say(message: string, options?: AnnounceOptions): void {
    this.queue.push(message, options);
    this.scheduleFlush();
  }

  /** Settings → Announcements (off / essential / all), §7.3 rule 5. */
  setLevel(level: AnnouncementLevel): void {
    this.queue.setLevel(level);
  }

  /**
   * PLAY-B2: wipes both live regions AND drops anything already queued but not yet spoken —
   * called by the router right before it builds the next screen, so a stale message from the OLD
   * screen (e.g. the assertive "Level complete! …" left over from the game screen) never lingers
   * on a screen that has no reason to speak that channel again. Called BEFORE the new screen is
   * built, so a message the new screen queues immediately afterwards (its own §7.3 #1 "ready", or
   * the router's own entry-announcement fallback) starts from an empty queue and still speaks
   * exactly once — clearing never competes with it.
   */
  clear(): void {
    this.queue.clear();
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
      this.scheduledAt = null;
    }
    for (const region of Object.values(this.regions)) region.textContent = '';
  }

  /** The last 50 spoken messages, oldest first (CONTRACTS §9 `__game.announcerLog()`). */
  log(): readonly AnnouncerLogEntry[] {
    return this.queue.log();
  }

  /** Schedules `flush` no later than the queue's next due time (never later than already set). */
  private scheduleFlush(): void {
    const next = this.queue.nextDueIn();
    if (next === null) return; // nothing pending (dropped by the level filter or the 3 s de-dup)
    const now = this.clock();
    const delay = Math.max(ANNOUNCE_JOIN_MS, next);
    const dueAt = now + delay;
    if (this.timer !== null && this.scheduledAt !== null && this.scheduledAt <= dueAt) return; // already due at least as soon
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.scheduledAt = dueAt;
    this.timer = window.setTimeout(this.flush, delay);
  }

  private readonly flush = (): void => {
    this.timer = null;
    this.scheduledAt = null;
    const due = this.queue.due();
    for (const politeness of ['assertive', 'polite'] as const) {
      const utterance = due.find((u) => u.politeness === politeness);
      if (!utterance) continue;
      const region = this.regions[politeness];
      region.textContent = '';
      // Write on the next task so the cleared region is noticed and identical text is re-read.
      window.setTimeout(() => {
        region.textContent = utterance.text;
      }, 0);
    }
    this.scheduleFlush();
  };
}
