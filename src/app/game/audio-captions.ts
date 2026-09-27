/**
 * Pure caption-text selection for a sound cue (DESIGN §7.7 bark strip, §9.4 caption table) —
 * DOM-free, so it is unit-testable in Node. `audio-wiring.ts`'s `onCue` calls `ctx.view.caption`
 * with what this returns (or does nothing when it returns null).
 * Owner: E5b.
 */
import type { CaptionsLevel } from '../../persistence/schema.ts';
import type { SfxId } from '../../audio/sfx-ids.ts';
import { CAPTIONS, SOUND_CAPTIONS } from '../../ui/strings.ts';

/**
 * The caption text for `cueId` at the given `Settings.captions` level, or null to show nothing.
 * 'off': never. 'barks' (default): voice-chirp lines (CAPTIONS) only. 'all': + the bracketed
 * sound captions (SOUND_CAPTIONS) for cues with no bark line of their own.
 */
export function captionFor(cueId: SfxId, level: CaptionsLevel): string | null {
  if (level === 'off') return null;
  const bark = CAPTIONS[cueId];
  if (bark) return bark;
  return level === 'all' ? (SOUND_CAPTIONS[cueId] ?? null) : null;
}
