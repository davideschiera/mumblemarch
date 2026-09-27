/**
 * VALIDATOR (ev1b-announce) spec-derived tests for `src/ui/announce-queue.ts` against DESIGN.md
 * §7.3 throttle rules 1–5 (MUST) and §7.1 A8's acceptance criterion, independent of the
 * implementer's own `tests/ui-announce-queue.test.ts`. DOM-free: imports only `announce-queue.ts`
 * (pure) plus the shared timing constants; the flush-scheduling loop below re-implements, purely
 * in arithmetic on a fake clock, the same algorithm `src/ui/announcer.ts`'s `scheduleFlush`/
 * `flush` use (nextDueIn() -> wait -> due() -> reschedule), so it exercises the real throttle
 * behaviour end-to-end without touching the DOM.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AnnounceQueue } from '../src/ui/announce-queue.ts';
import { ANNOUNCE_JOIN_MS } from '../src/ui/ui-config.ts';

/**
 * Mirrors `Announcer.scheduleFlush` / `Announcer.flush` (src/ui/announcer.ts lines ~48-76)
 * exactly, but against a fake clock with no real timers: `runUntil`/`drain` jump straight to the
 * next scheduled flush time (never later than the production code would) instead of waiting on
 * wall-clock time.
 */
function makeDriver(queue: AnnounceQueue, now: () => number) {
  let scheduledAt: number | null = null;
  const scheduleFlush = (): void => {
    const next = queue.nextDueIn();
    if (next === null) return;
    const delay = Math.max(ANNOUNCE_JOIN_MS, next);
    const dueAt = now() + delay;
    if (scheduledAt !== null && scheduledAt <= dueAt) return; // already due at least as soon
    scheduledAt = dueAt;
  };
  const flush = (): void => {
    scheduledAt = null;
    queue.due();
    scheduleFlush();
  };
  return {
    scheduleFlush,
    /** Fire every flush scheduled at or before `target`, then land exactly on `target`. */
    runUntil(target: number, advance: (t: number) => void): void {
      while (scheduledAt !== null && scheduledAt <= target) {
        advance(scheduledAt);
        flush();
      }
      advance(target);
    },
    /** Fire every remaining scheduled flush to drain the queue completely. */
    drain(advance: (t: number) => void): void {
      while (scheduledAt !== null) {
        advance(scheduledAt);
        flush();
      }
    },
  };
}

// ─── §7.3 rules 1 & 2: three messages 300 ms apart (no user-initiation) ───────────────────────
//
// Rule 1 (MUST): "Messages said within 50 ms join with '. '" -- a coalescing window for
// near-simultaneous pushes.
// Rule 2 (MUST): "Polite messages go through a queue with >= 1000 ms between messages... The
// queue holds at most 4 messages." Read with rule 1, this describes up to 4 queued messages
// being spoken IN TURN, one utterance per message, >= 1000 ms apart -- not merged together just
// because they were still queued when their turn came up.
//
// A, B, C are each 300 ms apart -- well outside the 50 ms join window from one another -- so per
// the spec each should reach the live region as its own utterance, gated >= 1000 ms apart.

test('spec §7.3 rules 1+2: three messages 300ms apart, each its own utterance >=1000ms after the previous', () => {
  let t = 0;
  const clock = () => t;
  const advance = (target: number): void => {
    t = target;
  };
  const queue = new AnnounceQueue(clock);
  const driver = makeDriver(queue, clock);

  queue.push('A', { key: 'a' }); // t=0
  driver.scheduleFlush();

  driver.runUntil(300, advance);
  queue.push('B', { key: 'b' }); // t=300
  driver.scheduleFlush();

  driver.runUntil(600, advance);
  queue.push('C', { key: 'c' }); // t=600
  driver.scheduleFlush();

  driver.drain(advance); // let every remaining scheduled flush fire

  const log = queue.log();

  // Spec-conformant expectation (§7.3 rules 1+2, A8): three separate utterances, each >=1000ms
  // after the previous one. (Originally FAILed here: `due()` joined the whole pending queue into
  // one utterance per turn; fixed in src/ui/announce-queue.ts's `drainBurst()`, which joins only
  // messages pushed within ANNOUNCE_JOIN_MS of the item whose turn it is — ui-lead, post-fix.)
  const texts = log.map((e) => e.text);
  assert.deepEqual(texts, ['A', 'B', 'C'], 'DESIGN §7.3 rules 1+2: B and C must be spoken as separate utterances, not joined');
  for (let i = 1; i < log.length; i++) {
    const gap = (log[i]?.t ?? 0) - (log[i - 1]?.t ?? 0);
    assert.ok(gap >= 1000, `utterance ${i} must be >=1000ms after the previous one (was ${gap}ms)`);
  }
});
