/**
 * Unit tests for the pure helpers behind `src/app/game/skills.ts`:
 *  - `skills-step.ts` — Q/E skill cycling (DESIGN §6.1.1: skip 0-left, wrap).
 *  - `refusal-feedback.ts` — which refusals get full feedback vs. status-only (DESIGN §6.5).
 * Both are DOM-free, so this runs directly in Node.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SKILL_IDS, type SkillCounts, type SkillId, type SkillRejectReason } from '../src/core/types.ts';
import { refusalShowsFullFeedback } from '../src/app/game/refusal-feedback.ts';
import { nextSkillWithCount } from '../src/app/game/skills-step.ts';

function counts(overrides: Partial<Record<SkillId, number>>): SkillCounts {
  const base = Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
  return { ...base, ...overrides };
}

// ─── nextSkillWithCount (DESIGN §6.1.1 Q/E) ────────────────────────────────────────────────────

test('steps to the next skill with a count > 0, skipping 0-left ones', () => {
  // climber:0 floater:0 bomber:3 blocker:0 builder:5 basher:0 miner:0 digger:0
  const c = counts({ bomber: 3, builder: 5 });
  assert.equal(nextSkillWithCount('bomber', 1, c), 'builder');
  assert.equal(nextSkillWithCount('builder', -1, c), 'bomber');
});

test('wraps around both ends of the skill bar', () => {
  const c = counts({ climber: 1, digger: 1 });
  assert.equal(nextSkillWithCount('digger', 1, c), 'climber'); // last → first
  assert.equal(nextSkillWithCount('climber', -1, c), 'digger'); // first → last
});

test('with no current selection, next starts from the first skill, previous from the last', () => {
  const c = counts({ floater: 2, miner: 4 });
  assert.equal(nextSkillWithCount(null, 1, c), 'floater');
  assert.equal(nextSkillWithCount(null, -1, c), 'miner');
});

test('returns null when nothing has a count > 0 (DESIGN: ui-empty + "No skills left")', () => {
  const c = counts({});
  assert.equal(nextSkillWithCount('bomber', 1, c), null);
  assert.equal(nextSkillWithCount(null, 1, c), null);
});

test('a lone skill with a count wraps back to itself', () => {
  const c = counts({ blocker: 1 });
  assert.equal(nextSkillWithCount('blocker', 1, c), 'blocker');
  assert.equal(nextSkillWithCount('blocker', -1, c), 'blocker');
});

test('the currently-selected skill is skipped even if it still has a count (Q/E always moves)', () => {
  const c = counts({ climber: 1, bomber: 1, digger: 1 });
  assert.notEqual(nextSkillWithCount('bomber', 1, c), 'bomber');
});

// ─── refusalShowsFullFeedback (DESIGN §6.5 "Exception") ────────────────────────────────────────

test('level-ended is the only reason that skips full feedback (status text only)', () => {
  assert.equal(refusalShowsFullFeedback('level-ended'), false);
});

test('every other SkillRejectReason gets full feedback', () => {
  const reasons: readonly SkillRejectReason[] = [
    'none-left',
    'not-applicable',
    'steel',
    'one-way',
    'blocker-overlap',
    'too-high',
    'no-lemming',
  ];
  for (const reason of reasons) assert.equal(refusalShowsFullFeedback(reason), true, reason);
});
