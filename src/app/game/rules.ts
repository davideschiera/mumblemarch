/**
 * Small pure game-flow formulas — DOM-free, unit-testable in Node.
 * Owner: E5a (release rate, speed, clock); E5b may add the music-variant rule here.
 */
import { TICKS_PER_SECOND } from '../../core/constants.ts';
import type { GameSpeedSetting } from '../../persistence/schema.ts';
import { FAST_FORWARD_SPEED, MUSIC_VARIANTS, TIME_LOW_SECONDS } from '../config.ts';

/** DESIGN §5.3/§6.4.4: seconds between releases at `rate` = (((99 − RR) >> 1) + 4) ticks ÷ 17. */
export function releaseIntervalSeconds(rate: number): number {
  return (((99 - rate) >> 1) + 4) / TICKS_PER_SECOND;
}

/** DESIGN §6.4.3: loop speed = (fast-forward ? ×3 : ×1) × the Game speed setting. */
export function loopSpeed(fastForward: boolean, gameSpeed: GameSpeedSetting): number {
  return (fastForward ? FAST_FORWARD_SPEED : 1) * gameSpeed;
}

/** DESIGN §5.3: the clock shows the warning style under 30 s (never in overtime). */
export function isTimeLow(timeLeftTicks: number, overtimeTicks: number): boolean {
  return overtimeTicks === 0 && timeLeftTicks < TIME_LOW_SECONDS * TICKS_PER_SECOND;
}

/** DESIGN §8.6: music variant = index of the level within its theme (campaign order), mod 3. */
export function musicVariant(levelIdsInTheme: readonly string[], levelId: string): number {
  return Math.max(0, levelIdsInTheme.indexOf(levelId)) % MUSIC_VARIANTS;
}
