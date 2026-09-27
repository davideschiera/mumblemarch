/**
 * The campaign: every shipped level, in play order, grouped by tier.
 * Order matters — it defines unlocking (see persistence) and the level-select layout.
 */
import { spadeExpectationsLevel } from './data/spade-expectations.ts';
import { gentlyDownTheDomeLevel } from './data/gently-down-the-dome.ts';
import { bridgeOverTroubledToffeeLevel } from './data/bridge-over-troubled-toffee.ts';
import { thePunchLineLevel } from './data/the-punch-line.ts';
import { suctionCupFinalLevel } from './data/suction-cup-final.ts';
import { notOneStepBogwardLevel } from './data/not-one-step-bogward.ts';
import { diagonallyYoursLevel } from './data/diagonally-yours.ts';
import { onePopWonderLevel } from './data/one-pop-wonder.ts';
import { clamBeforeTheStormLevel } from './data/clam-before-the-storm.ts';
import { doubleBoilerLevel } from './data/double-boiler.ts';
import { wrongSideOfTheHedgeLevel } from './data/wrong-side-of-the-hedge.ts';
import { lastShiftAtTheFoundryLevel } from './data/last-shift-at-the-foundry.ts';
import type { LevelDef, TierId } from './format.ts';

/** Tier names from DESIGN D5. */
export const TIERS: readonly { readonly id: TierId; readonly name: string }[] = [
  { id: 1, name: 'Breezy' },
  { id: 2, name: 'Knotty' },
  { id: 3, name: 'Gnarly' },
  { id: 4, name: 'Stampede' },
];

export const LEVELS: readonly LevelDef[] = [
  spadeExpectationsLevel,
  gentlyDownTheDomeLevel,
  bridgeOverTroubledToffeeLevel,
  thePunchLineLevel,
  suctionCupFinalLevel,
  notOneStepBogwardLevel,
  diagonallyYoursLevel,
  onePopWonderLevel,
  clamBeforeTheStormLevel,
  doubleBoilerLevel,
  wrongSideOfTheHedgeLevel,
  lastShiftAtTheFoundryLevel,
];

export function getLevel(id: string): LevelDef | undefined {
  return LEVELS.find((level) => level.id === id);
}

/** The level after `id` in campaign order, if any. */
export function nextLevel(id: string): LevelDef | undefined {
  const index = LEVELS.findIndex((level) => level.id === id);
  return index >= 0 ? LEVELS[index + 1] : undefined;
}
