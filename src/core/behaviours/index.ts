/**
 * Behaviour registries. Assignment rules (who may receive which skill) are in RESEARCH §2.5;
 * dying/exiting lemmings accept no skills. A refused assignment never consumes the skill.
 * `Record<…>` types make them exhaustive: adding a state to
 * LEMMING_STATES or a skill to SKILL_IDS fails type-checking until it is registered here.
 */
import type { LemmingState, SkillId } from '../types.ts';
import type { SkillRule, StateHandler } from './context.ts';
import { bashing, basherRule } from './bash.ts';
import { blocking, blockerRule } from './block.ts';
import { bomberRule, exploding, ohno } from './bomb.ts';
import { builderRule, building, shrugging } from './build.ts';
import { climberRule, climbing, hoisting } from './climb.ts';
import { digging, diggerRule } from './dig.ts';
import { falling, floaterRule, floating, splatting } from './fall.ts';
import { minerRule, mining } from './mine.ts';
import { burning, drowning, exiting } from './terminal.ts';
import { jumping, walking } from './walk.ts';

export { tickFuse } from './bomb.ts';
export { AIRBORNE_STATES, UNASSIGNABLE_STATES, setState } from './context.ts';
export type { SkillRule, StateHandler, TickContext } from './context.ts';

export const STATE_HANDLERS: Readonly<Record<LemmingState, StateHandler>> = {
  falling,
  walking,
  jumping,
  climbing,
  hoisting,
  floating,
  splatting,
  blocking,
  building,
  shrugging,
  bashing,
  mining,
  digging,
  ohno,
  exploding,
  drowning,
  burning,
  exiting,
};

export const SKILL_RULES: Readonly<Record<SkillId, SkillRule>> = {
  climber: climberRule,
  floater: floaterRule,
  bomber: bomberRule,
  blocker: blockerRule,
  builder: builderRule,
  basher: basherRule,
  miner: minerRule,
  digger: diggerRule,
};
