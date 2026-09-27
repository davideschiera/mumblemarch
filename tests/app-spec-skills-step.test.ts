/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.1.1 Q/E "Previous / next skill": moves to the
 * previous/next skill with a count > 0, wrapping; none left → null (caller shows "No skills left").
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nextSkillWithCount } from '../src/app/game/skills-step.ts';
import { SKILL_IDS, type SkillCounts } from '../src/core/types.ts';

function counts(partial: Partial<Record<(typeof SKILL_IDS)[number], number>>): SkillCounts {
  const base: Record<(typeof SKILL_IDS)[number], number> = {} as Record<(typeof SKILL_IDS)[number], number>;
  for (const id of SKILL_IDS) base[id] = 0;
  return { ...base, ...partial };
}

test('E/next: moves to the next skill with count > 0', () => {
  const c = counts({ climber: 0, floater: 3, bomber: 0, digger: 5 });
  // SKILL_IDS order: climber, floater, bomber, blocker, builder, basher, miner, digger
  assert.equal(nextSkillWithCount('climber', 1, c), 'floater');
});

test('E/next: skips 0-count skills', () => {
  const c = counts({ climber: 1, floater: 0, bomber: 0, blocker: 2 });
  assert.equal(nextSkillWithCount('climber', 1, c), 'blocker');
});

test('Q/prev: moves to the previous skill with count > 0', () => {
  const c = counts({ climber: 3, floater: 0, bomber: 2 });
  assert.equal(nextSkillWithCount('bomber', -1, c), 'climber');
});

test('wrapping: next from the last skill wraps to the first with count', () => {
  const c = counts({ climber: 4, digger: 1 });
  assert.equal(nextSkillWithCount('digger', 1, c), 'climber');
});

test('wrapping: prev from the first skill wraps to the last with count', () => {
  const c = counts({ climber: 4, digger: 1 });
  assert.equal(nextSkillWithCount('climber', -1, c), 'digger');
});

test('none has a count > 0 -> null ("No skills left")', () => {
  const c = counts({});
  assert.equal(nextSkillWithCount('climber', 1, c), null);
  assert.equal(nextSkillWithCount(null, 1, c), null);
});

test('a single skill with count > 0: stepping either way stays on it (wraps to itself)', () => {
  const c = counts({ builder: 1 });
  assert.equal(nextSkillWithCount('builder', 1, c), 'builder');
  assert.equal(nextSkillWithCount('builder', -1, c), 'builder');
});

test('no current selection: E starts search from the first slot', () => {
  const c = counts({ climber: 0, floater: 5 });
  assert.equal(nextSkillWithCount(null, 1, c), 'floater');
});

test('no current selection: Q starts search from the last slot', () => {
  const c = counts({ digger: 0, miner: 3 });
  assert.equal(nextSkillWithCount(null, -1, c), 'miner');
});
