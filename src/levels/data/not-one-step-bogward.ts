import type { LevelDef } from '../format.ts';

export const notOneStepBogwardLevel: LevelDef = {
  id: 'not-one-step-bogward',
  title: 'Not One Step Bogward',
  tier: 1,
  hint: 'Everyone marches towards the bog. Somebody has to hold up a paddle.',
  theme: 'mossgrove',
  width: 480,
  height: 160,
  lemmings: 15,
  saveRequired: 9,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { blocker: 4 },
  entrances: [{ x: 160, y: 64 }],
  exits: [{ x: 40, y: 104 }],
  terrain: [
    { kind: 'rect', x: 0, y: 104, w: 320, h: 56 },
    { kind: 'ellipse', cx: 160, cy: 112, rx: 40, ry: 12 },
    { kind: 'rect', x: 320, y: 148, w: 120, h: 12, fill: 'strata' },
    { kind: 'rect', x: 440, y: 104, w: 40, h: 56 },
    { kind: 'polygon', points: [[364, 116], [366, 94], [369, 116]] },
    { kind: 'polygon', points: [[392, 116], [395, 90], [397, 116]] },
    { kind: 'polygon', points: [[414, 116], [416, 98], [419, 116]] },
    { kind: 'rect', x: 456, y: 60, w: 6, h: 44, fill: 'solid' },
    { kind: 'ellipse', cx: 459, cy: 56, rx: 18, ry: 14 },
    { kind: 'stamp', stamp: 'mushroom', x: 2, y: 97, op: 'behind' },
  ],
  hazards: [
    { kind: 'water', x: 320, y: 116, w: 120, h: 36 },
  ],
};
