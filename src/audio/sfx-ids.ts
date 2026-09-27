/**
 * Sound-effect ids and bus routing (DESIGN §8.3). Pure data with no Web Audio types, so Node
 * tests (no DOM lib) can import it; `sfx.ts` re-exports everything here.
 */
export const SFX_IDS = [
  'ui-move',
  'ui-select',
  'ui-deny',
  'ui-back',
  'ui-empty',
  'ui-arm',
  'assign',
  'entrance-open',
  'lets-go',
  'exit',
  'splat',
  'drown',
  'burn',
  'trap',
  'ohno',
  'explosion',
  'builder-low',
  'steel',
  'nuke',
  'time-low',
  'level-won',
  'level-lost',
  'pause',
  'unpause',
  'ff-on',
  'ff-off',
  'rr-up',
  'rr-down',
  'undo',
  'fuse',
  'builder-shrug',
  'trap-flytrap',
  'trap-press',
  'trap-pendulum',
  'trap-piston',
  'trap-clam',
] as const;
export type SfxId = (typeof SFX_IDS)[number];

/** Critter "voice" chirps go to the voice bus (own volume slider); everything else to sfx. */
export const VOICE_SFX: ReadonlySet<SfxId> = new Set<SfxId>(['lets-go', 'ohno', 'exit', 'builder-shrug']);
