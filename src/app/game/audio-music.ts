/**
 * Pure music-variant helpers for `AudioWiring` (DESIGN §8.6: the loop starts at
 * `MUSIC_START_TICK`, variant = the level's index within its theme, mod 3). `LevelDef` has no
 * DOM types, so this is unit-testable in Node; `audio-wiring.ts` is the thin wrapper that feeds
 * the result to `services.music.startTheme`.
 * Owner: E5b.
 */
import type { LevelDef } from '../../levels/format.ts';
import type { ThemeId } from '../../levels/themes.ts';
import { musicVariant } from './rules.ts';

/** The ids of every level (campaign order) that shares `theme`, for `musicVariant`'s index rule. */
export function themeSiblingIds(levels: readonly LevelDef[], theme: ThemeId): readonly string[] {
  return levels.filter((level) => level.theme === theme).map((level) => level.id);
}

/** This level's music variant (§8.6: its index within its theme's levels, mod 3). */
export function musicVariantFor(levels: readonly LevelDef[], level: LevelDef): number {
  return musicVariant(themeSiblingIds(levels, level.theme), level.id);
}

/** Has the tick reached `MUSIC_START_TICK` (and the theme not already been started this level)? */
export function readyToStartMusic(tick: number, startTick: number, alreadyStarted: boolean): boolean {
  return !alreadyStarted && tick >= startTick;
}
