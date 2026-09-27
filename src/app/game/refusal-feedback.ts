/**
 * Pure selector for DESIGN §6.5's one exception to "every refusal gets full feedback": a
 * `level-ended` refusal shows the status text only (no toast, no skill-button flash, no
 * announcement) because the result was already announced assertively (§7.3 #34) and later input
 * must not talk over it. DOM-free so it is unit-testable in Node; `skills.ts` is the only caller.
 * Owner: E5a.
 */
import type { SkillRejectReason } from '../../core/types.ts';

/** True for every `SkillRejectReason` except `level-ended` (DESIGN §6.5 "Exception"). */
export function refusalShowsFullFeedback(reason: SkillRejectReason): boolean {
  return reason !== 'level-ended';
}
