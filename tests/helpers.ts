/** Shared test fixtures. */
import { compileLevel } from '../src/levels/compiler.ts';
import type { LevelDef } from '../src/levels/format.ts';
import type { CompiledLevel } from '../src/core/types.ts';

/** Floor top row of the default test level. */
export const FLOOR_Y = 150;

/** A minimal valid level (400×160): flat floor, one entrance, one exit. Override anything. */
export function levelDef(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'test-level',
    title: 'Test',
    tier: 1,
    theme: 'mossgrove',
    width: 400,
    height: 160,
    lemmings: 5,
    saveRequired: 3,
    releaseRate: 50,
    timeLimitSeconds: 60,
    skills: {},
    entrances: [{ x: 40, y: 20 }],
    exits: [{ x: 360, y: FLOOR_Y }],
    terrain: [{ kind: 'rect', x: 0, y: FLOOR_Y, w: 400, h: 10 }],
    ...overrides,
  };
}

export function compiled(overrides: Partial<LevelDef> = {}): CompiledLevel {
  return compileLevel(levelDef(overrides));
}
