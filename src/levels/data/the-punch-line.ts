import type { LevelDef } from '../format.ts';

export const thePunchLineLevel: LevelDef = {
  id: 'the-punch-line',
  title: 'The Punch Line',
  tier: 1,
  hint: 'Coral in the way? Punch straight through it — twice.',
  theme: 'reef',
  width: 480,
  height: 160,
  lemmings: 12,
  saveRequired: 6,
  releaseRate: 50,
  timeLimitSeconds: 300,
  skills: { basher: 5 },
  entrances: [{ x: 56, y: 76 }],
  exits: [{ x: 424, y: 112 }],
  terrain: [
    { kind: 'rect', x: 0, y: 112, w: 480, h: 48, fill: 'strata' },
    { kind: 'polygon', points: [[150, 112], [148, 84], [156, 60], [168, 50], [180, 58], [188, 84], [186, 112]] },
    { kind: 'ellipse', cx: 160, cy: 52, rx: 8, ry: 6 },
    { kind: 'ellipse', cx: 178, cy: 50, rx: 6, ry: 8 },
    { kind: 'polygon', points: [[292, 0], [356, 0], [360, 40], [348, 112], [296, 112], [296, 80], [288, 60]], fill: 'strata' },
    { kind: 'polygon', points: [[312, 0], [316, 0], [320, 30], [314, 26]], op: 'erase' },
    { kind: 'stamp', stamp: 'mushroom', x: 452, y: 105, op: 'behind' },
    { kind: 'stamp', stamp: 'boulder', x: 2, y: 106 },
  ],
};
