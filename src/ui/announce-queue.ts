/**
 * Announcement types + the keyed queues (DESIGN §7.3 throttle rules 1–5) — pure and DOM-free
 * with an injected clock, so it is unit-testable in Node. `announcer.ts` is the thin DOM wrapper
 * that writes the live regions; `event-announcements.ts` and the game modules talk to the
 * `Speaker` interface only.
 *
 * Rules implemented here (§7.3, MUST):
 *  1. Messages actually *said* (pushed) within `ANNOUNCE_JOIN_MS` of each other join into one
 *     utterance, joined with ". " — a genuine burst, not everything that happens to be queued.
 *  2. Polite messages are otherwise spoken ONE PER TURN, ≥ 1000 ms apart
 *     (`ANNOUNCE_POLITE_GAP_MS`): each `due()` release takes only the leading queued item plus
 *     any further item(s) within its `ANNOUNCE_JOIN_MS` burst window (rule 1), leaving anything
 *     pushed later queued for its own later turn. A push whose key matches a queued item replaces
 *     it in place (same position, and its push time refreshes to now). The queue holds at most
 *     `ANNOUNCE_QUEUE_MAX`; on overflow the oldest `all`-level item is dropped first (falling
 *     back to the oldest item of any level when none is `all`, so the cap always holds).
 *  3. The same exact text pushed again within `ANNOUNCE_DEDUP_MS` is dropped, unless
 *     `userInitiated` (a direct key/click always gets its own confirmation).
 *  4. Assertive messages get their own queue/gate (≥ 1000 ms between flushes) and, when pushed,
 *     remove any queued POLITE item with the same key.
 *  5. `passesLevel` — off / essential / all (`Settings.announcements`).
 *
 * Owner: E5b (E0 defined the types and a pass-through stub; E5b implements the queue).
 */
import type { AnnouncementLevel } from '../persistence/schema.ts';
import {
  ANNOUNCE_ASSERTIVE_GAP_MS,
  ANNOUNCE_DEDUP_MS,
  ANNOUNCE_JOIN_MS,
  ANNOUNCE_LOG_LIMIT,
  ANNOUNCE_POLITE_GAP_MS,
  ANNOUNCE_QUEUE_MAX,
} from './ui-config.ts';

export type Politeness = 'polite' | 'assertive';

export interface AnnounceOptions {
  /** Coalesce key (§7.3 last column): a queued message with the same key is replaced in place. */
  readonly key?: string;
  /** Default 'polite'. */
  readonly politeness?: Politeness;
  /** Catalogue level (§7.3 "Level" column); default 'essential'. Dropped when the setting is lower. */
  readonly level?: 'essential' | 'all';
  /** A direct key/click caused it: bypasses the 3 s same-text de-dup (rule 3). */
  readonly userInitiated?: boolean;
  /**
   * Opaque payload to remember alongside this keyed message, handed back to a later push's
   * `merge` under the same key (undefined if there is no queued item yet, or it carried none).
   */
  readonly data?: unknown;
  /**
   * A11Y-2: rule 2 "replace in place" normally takes `message` verbatim, which is right for most
   * rows (latest skill count, latest release rate, …) but wrong for a row that COALESCES several
   * events into one message (§7.3 #10 "{s} saved, {l} lost…") — replacing in place must SUM what
   * it replaces, not just keep the latest push's own numbers. When set, `merge(previousData)` (the
   * queued item's own `data`, or undefined the first time / if there is none queued yet) computes
   * the replacement's `{text, data}` instead of using `message`/`data` directly.
   */
  readonly merge?: (previous: unknown) => { readonly text: string; readonly data?: unknown };
}

/** Anything that can speak (the Announcer, or a test double). */
export interface Speaker {
  say(message: string, options?: AnnounceOptions): void;
}

export interface AnnouncerLogEntry {
  /** Clock time (ms) when the text was written to the live region. */
  readonly t: number;
  readonly text: string;
  readonly politeness: Politeness;
}

/** A message ready to be written to a live region (already joined per rule 1). */
export interface Utterance {
  readonly text: string;
  readonly politeness: Politeness;
}

interface QueuedItem {
  readonly key: string | null;
  text: string;
  level: 'essential' | 'all';
  /** Clock time this item was (most recently) pushed — rule 1's burst window is measured from it. */
  t: number;
  /** Opaque payload a push's `merge` (AnnounceOptions) can read back and update (A11Y-2). */
  data?: unknown;
}

/** Does `level` (message) pass the user's announcement setting (§7.3 rule 5)? */
export function passesLevel(setting: AnnouncementLevel, level: 'essential' | 'all' = 'essential'): boolean {
  return setting === 'all' || (setting === 'essential' && level === 'essential');
}

/** ms still to wait before `gapMs` has elapsed since `last` (0 if never spoken, or already elapsed). */
function waitFor(last: number | null, now: number, gapMs: number): number {
  return last === null ? 0 : Math.max(0, gapMs - (now - last));
}

function removeByKey(queue: QueuedItem[], key: string): void {
  const i = queue.findIndex((item) => item.key === key);
  if (i >= 0) queue.splice(i, 1);
}

/** Join and clear the whole queue (assertive: rare enough that a whole-queue join is fine). */
function drainAll(queue: QueuedItem[]): string {
  return joinUtterance(queue.splice(0).map((item) => item.text));
}

/**
 * Rule 1 + rule 2: take only the front item plus any further leading items pushed within
 * `ANNOUNCE_JOIN_MS` of it (a genuine burst said together) — NOT the whole queue — leaving
 * anything pushed later queued for its own later turn.
 */
function drainBurst(queue: QueuedItem[]): string {
  const anchor = queue[0]?.t ?? 0;
  let count = 0;
  while (count < queue.length) {
    const item = queue[count];
    if (!item || item.t - anchor > ANNOUNCE_JOIN_MS) break;
    count++;
  }
  return joinUtterance(queue.splice(0, count).map((item) => item.text));
}

/**
 * Rule 1's ". " join, without doubling a sentence end the message already has
 * (`'… Press H for help.'` + `'Spade Expectations'` → `'… Press H for help. Spade Expectations'`).
 */
export function joinUtterance(texts: readonly string[]): string {
  let out = '';
  for (const text of texts) {
    if (out === '') out = text;
    else out += /[.!?…]$/.test(out) ? ` ${text}` : `. ${text}`;
  }
  return out;
}

export class AnnounceQueue {
  private readonly clock: () => number;
  private level: AnnouncementLevel = 'essential';
  private readonly politeQueue: QueuedItem[] = [];
  private readonly assertiveQueue: QueuedItem[] = [];
  private lastPoliteAt: number | null = null;
  private lastAssertiveAt: number | null = null;
  /** Text → the time it last passed the rule-3 de-dup check (queued or spoken). */
  private readonly recentTexts = new Map<string, number>();
  private readonly history: AnnouncerLogEntry[] = [];

  constructor(clock: () => number) {
    this.clock = clock;
  }

  setLevel(level: AnnouncementLevel): void {
    this.level = level;
  }

  /** §7.3 rules 2–5. */
  push(message: string, options: AnnounceOptions = {}): void {
    if (!passesLevel(this.level, options.level)) return;
    const now = this.clock();
    const lastSeen = this.recentTexts.get(message);
    if (lastSeen !== undefined && now - lastSeen < ANNOUNCE_DEDUP_MS && !options.userInitiated) return; // rule 3
    this.recentTexts.set(message, now);

    const key = options.key ?? null;
    const level = options.level ?? 'essential';
    if ((options.politeness ?? 'polite') === 'assertive') {
      if (key !== null) removeByKey(this.politeQueue, key); // rule 4: assertive evicts the same-key polite item
      this.assertiveQueue.push({ key, text: message, level, t: now, data: options.data });
      return;
    }

    const existing = key !== null ? this.politeQueue.find((item) => item.key === key) : undefined;
    // A11Y-2: when `merge` is given, it ALWAYS computes the {text, data} to store — even for the
    // very first push under a key (previous === undefined) — so every push under that key (merged
    // or not) is formatted the same consistent way.
    const resolved = options.merge ? options.merge(existing?.data) : { text: message, data: options.data };
    if (existing) {
      existing.text = resolved.text; // rule 2: replace in place, same queue position
      existing.data = resolved.data;
      existing.level = level;
      existing.t = now; // the message just changed "now": it can still join a fresh burst
      return;
    }
    if (this.politeQueue.length >= ANNOUNCE_QUEUE_MAX) {
      const dropIndex = this.politeQueue.findIndex((item) => item.level === 'all');
      this.politeQueue.splice(dropIndex >= 0 ? dropIndex : 0, 1); // rule 2: oldest 'all' first, else oldest overall
    }
    this.politeQueue.push({ key, text: resolved.text, level, t: now, data: resolved.data });
  }

  /**
   * Drops every not-yet-spoken message from both queues (PLAY-B2: a screen change must not let a
   * stale in-game message from the OLD screen surface later, on the NEW one). Per-politeness
   * pacing (`lastPoliteAt`/`lastAssertiveAt`) and the rule-3 de-dup history are left alone — they
   * only pace how soon the new screen's own messages may speak, not what was already queued.
   */
  clear(): void {
    this.politeQueue.length = 0;
    this.assertiveQueue.length = 0;
  }

  /** Utterances to speak now (call on every timer wake-up); logs them. At most one per politeness. */
  due(): Utterance[] {
    const now = this.clock();
    const out: Utterance[] = [];
    if (this.assertiveQueue.length > 0 && (this.lastAssertiveAt === null || now - this.lastAssertiveAt >= ANNOUNCE_ASSERTIVE_GAP_MS)) {
      out.push({ text: drainAll(this.assertiveQueue), politeness: 'assertive' });
      this.lastAssertiveAt = now;
    }
    if (this.politeQueue.length > 0 && (this.lastPoliteAt === null || now - this.lastPoliteAt >= ANNOUNCE_POLITE_GAP_MS)) {
      out.push({ text: drainBurst(this.politeQueue), politeness: 'polite' });
      this.lastPoliteAt = now;
    }
    for (const u of out) this.history.push({ t: now, text: u.text, politeness: u.politeness });
    if (this.history.length > ANNOUNCE_LOG_LIMIT) this.history.splice(0, this.history.length - ANNOUNCE_LOG_LIMIT);
    return out;
  }

  /** ms until the next message may be spoken, or null when nothing is waiting. */
  nextDueIn(): number | null {
    const now = this.clock();
    let best: number | null = null;
    if (this.assertiveQueue.length > 0) best = waitFor(this.lastAssertiveAt, now, ANNOUNCE_ASSERTIVE_GAP_MS);
    if (this.politeQueue.length > 0) {
      const wait = waitFor(this.lastPoliteAt, now, ANNOUNCE_POLITE_GAP_MS);
      best = best === null ? wait : Math.min(best, wait);
    }
    return best;
  }

  /** The last 50 spoken messages, oldest first (`__game.announcerLog()`). */
  log(): readonly AnnouncerLogEntry[] {
    return this.history.slice();
  }
}
