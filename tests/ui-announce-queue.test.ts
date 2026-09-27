/**
 * Unit tests for `src/ui/announce-queue.ts` — the pure keyed announcement queue (DESIGN §7.3
 * throttle rules 1–5). Every rule is driven by a fake, manually-advanced clock so timing is
 * exact and deterministic. DOM-free, so it runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AnnounceQueue, joinUtterance } from '../src/ui/announce-queue.ts';
import {
  ANNOUNCE_ASSERTIVE_GAP_MS,
  ANNOUNCE_DEDUP_MS,
  ANNOUNCE_LOG_LIMIT,
  ANNOUNCE_POLITE_GAP_MS,
  ANNOUNCE_QUEUE_MAX,
} from '../src/ui/ui-config.ts';

function fakeClock(start = 0): { now: () => number; clock: () => number } {
  let t = start;
  return { now: () => t, clock: () => t };
}

// ─── Rule 1: messages pushed before a flush join with ". " ────────────────────────────────────

test('rule 1: everything pushed before due() is drained and joined into one utterance', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('A');
  q.push('B');
  q.push('C');
  const due = q.due();
  assert.deepEqual(due, [{ text: 'A. B. C', politeness: 'polite' }]);
});

test('rule 1: joining does not double a sentence end the message already has (game-ready + screen title)', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Spade Expectations. Save 5 of 10. Press H for help.');
  q.push('Spade Expectations');
  q.push('Well done!');
  q.push('Resumed');
  assert.deepEqual(q.due(), [
    { text: 'Spade Expectations. Save 5 of 10. Press H for help. Spade Expectations. Well done! Resumed', politeness: 'polite' },
  ]);
});

test('joinUtterance: ". " between plain messages, a single space after . ! ? or …', () => {
  assert.equal(joinUtterance([]), '');
  assert.equal(joinUtterance(['A']), 'A');
  assert.equal(joinUtterance(['A', 'B']), 'A. B');
  assert.equal(joinUtterance(['A.', 'B']), 'A. B');
  assert.equal(joinUtterance(['A?', 'B!', 'C…', 'D']), 'A? B! C… D');
});

test('rule 1: a second due() with nothing new returns nothing', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('A');
  q.due();
  assert.deepEqual(q.due(), []);
});

// ─── Rule 2: ≥ 1000 ms between polite flushes ─────────────────────────────────────────────────

test('rule 2: a polite message must wait ANNOUNCE_POLITE_GAP_MS after the previous flush', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('first');
  assert.deepEqual(q.due(), [{ text: 'first', politeness: 'polite' }]);

  q.push('second');
  assert.deepEqual(q.due(), [], 'too soon: nothing due yet');
  assert.equal(q.nextDueIn(), ANNOUNCE_POLITE_GAP_MS);

  t += ANNOUNCE_POLITE_GAP_MS - 1;
  assert.deepEqual(q.due(), [], 'still 1 ms short');

  t += 1;
  assert.deepEqual(q.due(), [{ text: 'second', politeness: 'polite' }]);
});

test('rule 2: replace-by-key updates the queued text in place (no duplicate entry)', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Climber, 3 left', { key: 'skill' });
  q.push('Climber, 2 left', { key: 'skill' });
  q.push('Climber, 1 left', { key: 'skill' });
  assert.deepEqual(q.due(), [{ text: 'Climber, 1 left', politeness: 'polite' }]);
});

test('rule 2: replace-by-key keeps the item`s original queue position', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('one', { key: 'a' });
  q.push('two', { key: 'b' });
  q.push('one-updated', { key: 'a' }); // replaces in place, does not move to the back
  assert.deepEqual(q.due(), [{ text: 'one-updated. two', politeness: 'polite' }]);
});

test('rule 2: the queue holds at most ANNOUNCE_QUEUE_MAX; overflow drops the oldest all-level item', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.setLevel('all');
  assert.equal(ANNOUNCE_QUEUE_MAX, 4);
  q.push('k1', { key: 'k1' });
  q.push('k2', { key: 'k2' });
  q.push('k3-all', { key: 'k3', level: 'all' });
  q.push('k4', { key: 'k4' });
  // Queue is full (4/4). k3 is the only 'all'-level item, so it is evicted to make room for k5.
  q.push('k5', { key: 'k5' });
  assert.deepEqual(q.due(), [{ text: 'k1. k2. k4. k5', politeness: 'polite' }]);
});

test('rule 2: overflow falls back to the oldest item overall when none is all-level', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('k1', { key: 'k1' });
  q.push('k2', { key: 'k2' });
  q.push('k3', { key: 'k3' });
  q.push('k4', { key: 'k4' });
  q.push('k5', { key: 'k5' }); // no 'all'-level item queued: drop the oldest (k1)
  assert.deepEqual(q.due(), [{ text: 'k2. k3. k4. k5', politeness: 'polite' }]);
});

test('rules 1+2 together: only a genuine burst (within ANNOUNCE_JOIN_MS) joins; later pushes get their own later turn', () => {
  // EV1b repro: A/B/C pushed 300 ms apart must come out as three separate utterances, each on
  // its own ≥ 1000 ms turn — NOT joined into "A" then "B. C" just because B and C both happened
  // to still be queued when the 1000 ms gate next opened.
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('A', { key: 'a' });
  assert.deepEqual(q.due(), [{ text: 'A', politeness: 'polite' }]); // t=0: first ever, gate open

  t = 300;
  q.push('B', { key: 'b' });
  t = 600;
  q.push('C', { key: 'c' });
  assert.deepEqual(q.due(), [], 'gate still closed (only 600 ms since the A turn)');

  t = 1000;
  assert.deepEqual(q.due(), [{ text: 'B', politeness: 'polite' }]); // B's turn; C is 300 ms after B, not a burst with it

  t = 2000;
  assert.deepEqual(q.due(), [{ text: 'C', politeness: 'polite' }]); // C's own later turn
});

test('rule 1: a genuine burst (pushed within ANNOUNCE_JOIN_MS of the front item) still joins', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('A', { key: 'a' });
  t = 30; // well within the 50 ms join window
  q.push('B', { key: 'b' });
  t = 45;
  q.push('C', { key: 'c' });
  assert.deepEqual(q.due(), [{ text: 'A. B. C', politeness: 'polite' }]);
});

test('rule 1: a push just outside the burst window starts its own turn instead of joining', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('A', { key: 'a' });
  t = 51; // 1 ms outside the join window
  q.push('B', { key: 'b' });
  assert.deepEqual(q.due(), [{ text: 'A', politeness: 'polite' }]);
});

// ─── A11Y-2 mechanism: `merge` sums across a replace-in-place instead of just replacing ────────

test('merge: a keyed push`s merge sums a numeric payload across every push it replaces', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  let call = 0;
  const pushDelta = (n: number): void =>
    // Each push's raw `message` must be distinct (rule 3 de-dups identical text within 3 s on the
    // raw message, before merge ever runs) — real callers (e.g. the #10 batch text, which always
    // embeds the changing cumulative total) never collide like this.
    q.push(`ignored (${n}) #${++call}`, {
      key: 'batch',
      merge: (previous) => {
        const total = ((previous as number | undefined) ?? 0) + n;
        return { text: `${total} saved`, data: total };
      },
    });
  pushDelta(1);
  pushDelta(1);
  pushDelta(8);
  // Still one queue slot (same key, replaced in place), but the text reflects the SUM (10), not
  // just the last push's own delta (8) — the A11Y-2 defect kept only the latter.
  assert.deepEqual(q.due(), [{ text: '10 saved', politeness: 'polite' }]);
});

test('merge: the first push under a key calls merge(undefined) too, so its own formatting stays consistent', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('ignored', {
    key: 'a',
    merge: (previous) => ({ text: `${((previous as number | undefined) ?? 0) + 5} total`, data: 5 }),
  });
  assert.deepEqual(q.due(), [{ text: '5 total', politeness: 'polite' }]);
});

test('merge: unrelated keys are unaffected — only a replace under the SAME key merges', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('one', { key: 'a', merge: (previous) => ({ text: `a:${((previous as number | undefined) ?? 0) + 1}`, data: 1 }) });
  q.push('two', { key: 'b' }); // plain push, no merge: replaces normally (nothing to replace yet)
  assert.deepEqual(q.due(), [{ text: 'a:1. two', politeness: 'polite' }]);
});

// ─── clear(): drops not-yet-spoken messages (PLAY-B2) ──────────────────────────────────────────

test('clear(): drops every not-yet-spoken polite AND assertive message', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('stale polite', { key: 'x' });
  q.push('stale assertive', { politeness: 'assertive' });
  q.clear();
  assert.deepEqual(q.due(), []);
});

test('clear(): a fresh push right after clear() still speaks normally (a new screen`s own entry announcement)', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Level complete! 30 of 30 saved, 25 needed.', { politeness: 'assertive' });
  q.due(); // spoken; DOM would hold this text until something clears or replaces it
  q.push('stale leftover, never spoken');
  q.clear();
  q.push('New Screen Title');
  assert.deepEqual(q.due(), [{ text: 'New Screen Title', politeness: 'polite' }]);
});

// ─── Rule 3: same text within 3 s is dropped unless userInitiated ─────────────────────────────

test('rule 3: an identical text pushed again within ANNOUNCE_DEDUP_MS is dropped', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Hello');
  q.push('Hello'); // same instant, same text: dropped
  assert.deepEqual(q.due(), [{ text: 'Hello', politeness: 'polite' }]);
});

test('rule 3: userInitiated bypasses the de-dup', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Hello');
  q.push('Hello', { userInitiated: true });
  assert.deepEqual(q.due(), [{ text: 'Hello. Hello', politeness: 'polite' }]);
});

test('rule 3: the same text is accepted again once ANNOUNCE_DEDUP_MS has elapsed', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('No mumble here', { key: 'info' });
  q.due();
  t += ANNOUNCE_DEDUP_MS - 1;
  q.push('No mumble here', { key: 'info2' }); // still within the window: dropped
  assert.deepEqual(q.due(), []);
  t += 1;
  q.push('No mumble here', { key: 'info3' }); // exactly at the boundary: accepted
  assert.deepEqual(q.due(), [{ text: 'No mumble here', politeness: 'polite' }]);
});

// ─── Rule 4: assertive speaks at once, removes the same-key polite item, ≤ 1/s ────────────────

test('rule 4: an assertive push removes a queued polite item with the same key', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('Pop all is ready…', { key: 'arm' });
  q.push('Popping all mumbles!', { key: 'arm', politeness: 'assertive' });
  // The polite 'arm' entry was evicted, so due() has only the assertive utterance.
  assert.deepEqual(q.due(), [{ text: 'Popping all mumbles!', politeness: 'assertive' }]);
});

test('rule 4: assertive and polite are independent queues/gates', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.push('essential update'); // polite, unrelated key
  q.push('Popping all mumbles!', { politeness: 'assertive' });
  const due = q.due();
  assert.equal(due.length, 2);
  assert.ok(due.some((u) => u.politeness === 'assertive' && u.text === 'Popping all mumbles!'));
  assert.ok(due.some((u) => u.politeness === 'polite' && u.text === 'essential update'));
});

test('rule 4: assertive messages are limited to 1 per ANNOUNCE_ASSERTIVE_GAP_MS', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('first assertive', { politeness: 'assertive' });
  assert.deepEqual(q.due(), [{ text: 'first assertive', politeness: 'assertive' }]);

  q.push('second assertive', { politeness: 'assertive' });
  assert.deepEqual(q.due(), [], 'too soon after the first assertive');

  t += ANNOUNCE_ASSERTIVE_GAP_MS;
  assert.deepEqual(q.due(), [{ text: 'second assertive', politeness: 'assertive' }]);
});

// ─── Rule 5: off / essential / all ─────────────────────────────────────────────────────────────

test('rule 5: level "off" drops every message regardless of its own level', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.setLevel('off');
  q.push('essential row');
  q.push('all row', { level: 'all' });
  assert.deepEqual(q.due(), []);
});

test('rule 5: level "essential" passes essential rows only', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.setLevel('essential');
  q.push('essential row');
  q.push('all row', { level: 'all' });
  assert.deepEqual(q.due(), [{ text: 'essential row', politeness: 'polite' }]);
});

test('rule 5: level "all" passes every row', () => {
  const { clock } = fakeClock();
  const q = new AnnounceQueue(clock);
  q.setLevel('all');
  q.push('essential row');
  q.push('all row', { level: 'all' });
  assert.deepEqual(q.due(), [{ text: 'essential row. all row', politeness: 'polite' }]);
});

// ─── log(): last ANNOUNCE_LOG_LIMIT spoken messages, oldest first ─────────────────────────────

test('log() keeps only the last ANNOUNCE_LOG_LIMIT spoken messages, oldest first', () => {
  let t = 0;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  const total = ANNOUNCE_LOG_LIMIT + 10;
  for (let i = 0; i < total; i++) {
    q.push(`msg ${i}`, { key: `k${i}` });
    q.due();
    t += ANNOUNCE_POLITE_GAP_MS;
  }
  const log = q.log();
  assert.equal(log.length, ANNOUNCE_LOG_LIMIT);
  assert.equal(log[0]?.text, `msg ${total - ANNOUNCE_LOG_LIMIT}`);
  assert.equal(log[log.length - 1]?.text, `msg ${total - 1}`);
  for (const entry of log) assert.equal(entry.politeness, 'polite');
});

test('log() records the clock time each utterance was actually spoken', () => {
  let t = 100;
  const clock = () => t;
  const q = new AnnounceQueue(clock);
  q.push('A');
  q.due();
  const log = q.log();
  assert.equal(log.length, 1);
  assert.equal(log[0]?.t, 100);
});
