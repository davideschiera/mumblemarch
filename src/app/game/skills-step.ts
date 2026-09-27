/**
 * Pure skill-cycling logic (DESIGN §6.1.1 Q/E "Previous / next skill"): the previous/next skill
 * with a count > 0, wrapping, starting from the currently selected skill. DOM-free so it is
 * unit-testable in Node; `skills.ts` is the only caller.
 * Owner: E5a.
 */
import { SKILL_IDS, type SkillCounts, type SkillId } from '../../core/types.ts';

/**
 * The neighbour of `current` that is `step` positions away in `SKILL_IDS` order and has a
 * count > 0, wrapping around the full list. With no current selection, `step === 1` starts the
 * search from the first slot and `step === -1` from the last (so Q with nothing selected lands
 * on the last skill with a count). Returns null when no skill has a count > 0.
 */
export function nextSkillWithCount(current: SkillId | null, step: 1 | -1, counts: SkillCounts): SkillId | null {
  const n = SKILL_IDS.length;
  const start = current ? SKILL_IDS.indexOf(current) : step === 1 ? -1 : 0;
  for (let i = 1; i <= n; i++) {
    const index = (((start + step * i) % n) + n) % n;
    const skill = SKILL_IDS[index];
    if (skill && counts[skill] > 0) return skill;
  }
  return null;
}
