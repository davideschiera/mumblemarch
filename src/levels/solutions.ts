/**
 * Per-level scripted solutions ported from the "Sim solution data" blocks of
 * `docs/design/LEVELS.md` (== `window.MUMBLE_SOLUTIONS` in
 * `docs/design/mockups/levels-data.js`), keyed by LevelDef.id. Used by the headless replay tests
 * and by `__game.playSolution()` in the browser (via SolutionDriver).
 */
import type { SolutionScript } from './solution-driver.ts';

export const LEVEL_SOLUTIONS: Readonly<Record<string, SolutionScript>> = {
  // Spade Expectations
  'spade-expectations': { assignments: [{ skill: 'digger', idx: 0, x: 160 }] },
  // Gently Down the Dome
  'gently-down-the-dome': { assignments: [{ skill: 'floater', count: 7, minIdx: 0 }] },
  // Bridge Over Troubled Toffee
  'bridge-over-troubled-toffee': { assignments: [{ skill: 'builder', idx: 0, x: 216 }] },
  // The Punch Line
  'the-punch-line': {
    assignments: [
      { skill: 'basher', idx: 0, x: 146, dir: 1 },
      { skill: 'basher', idx: 0, x: 292, dir: 1 },
    ],
  },
  // Suction Cup Final
  'suction-cup-final': { assignments: [{ skill: 'climber', count: 7, minIdx: 0 }] },
  // Not One Step Bogward
  'not-one-step-bogward': { assignments: [{ skill: 'blocker', idx: 0, x: 240 }] },
  // Diagonally Yours
  'diagonally-yours': {
    assignments: [
      { skill: 'miner', idx: 0, x: 150, dir: 1 },
      { skill: 'basher', x: 476, dir: 1, ymin: 120 },
    ],
  },
  // One Pop Wonder
  'one-pop-wonder': {
    assignments: [
      { skill: 'bomber', idx: 0, after: 400 },
      { skill: 'basher', x: 316, dir: 1, ymin: 100 },
    ],
  },
  // Clam Before the Storm
  'clam-before-the-storm': { assignments: [{ skill: 'basher', x: 156, dir: 1, after: 1760 }] },
  // Double Boiler
  'double-boiler': {
    assignments: [
      { skill: 'digger', x: 150, dir: 1, ymax: 64 },
      { skill: 'blocker', x: 1000, dir: -1, minIdx: 2 },
      { skill: 'builder', x: 908, dir: -1 },
      { skill: 'basher', x: 396, dir: 1, ymin: 100 },
      { skill: 'bomber', target: 1, after: 500 },
    ],
  },
  // Wrong Side of the Hedge
  'wrong-side-of-the-hedge': {
    assignments: [
      { skill: 'climber', idx: 0 },
      { skill: 'basher', idx: 0, x: 250, dir: -1, ymin: 72, ymax: 72 },
      { skill: 'digger', x: 320, dir: 1, ymin: 72, ymax: 72, after: 1000 },
    ],
  },
  // Last Shift at the Foundry
  'last-shift-at-the-foundry': {
    releaseRate: 99,
    assignments: [
      { skill: 'climber', idx: 0 },
      { skill: 'builder', idx: 0, x: 456, dir: 1, ymin: 36, ymax: 36 },
      { skill: 'basher', x: 276, dir: 1, ymin: 36, ymax: 36, after: 700 },
      { skill: 'miner', x: 1060, dir: 1, ymin: 76, ymax: 76 },
    ],
  },
};
