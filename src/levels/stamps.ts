/**
 * Stamps: reusable terrain shapes as ASCII art ('#' = solid, anything else = empty).
 * Keep them small; build big structures from primitives. Add new shapes here.
 */
export const STAMPS = {
  boulder: [
    '..####..',
    '.######.',
    '########',
    '########',
    '.######.',
    '..####..',
  ],
  mushroom: [
    '..########..',
    '############',
    '############',
    '....####....',
    '....####....',
    '....####....',
    '...######...',
  ],
  /** mossgrove, 9×8: a spore-tipped fern frond. */
  fern: [
    '....#....',
    '.#..#..#.',
    '..#.#.#..',
    '#..###..#',
    '.#..#..#.',
    '..#.#.#..',
    '...###...',
    '....#....',
  ],
  /** foundry, 10×10: a toothed gear with a hollow hub. */
  cog: [
    '...####...',
    '.##.##.##.',
    '.#########',
    '###....###',
    '##......##',
    '##......##',
    '###....###',
    '.#########',
    '.##.##.##.',
    '...####...',
  ],
  /** sugarworks, 8×6: a rounded gumdrop candy. */
  gumdrop: ['..####..', '.######.', '########', '########', '########', '########'],
  /** observatory, 7×10: a faceted crystal spire. */
  crystal: [
    '...#...',
    '..###..',
    '..###..',
    '.#####.',
    '.#####.',
    '#######',
    '#######',
    '.#####.',
    '..###..',
    '...#...',
  ],
  /** reef, 10×8: a branching coral cluster. */
  coral: [
    '.#..#...#.',
    '.##.#..##.',
    '..###.##..',
    '#..####..#',
    '.#######..',
    '...####...',
    '....##....',
    '....##....',
  ],
} as const satisfies Record<string, readonly string[]>;

export type StampId = keyof typeof STAMPS;
