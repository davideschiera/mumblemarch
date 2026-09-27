/**
 * Minimal DOM-free drawing target. `CanvasRenderingContext2D` satisfies this structurally
 * (it has a settable `fillStyle` and a `fillRect`), so DOM-free render code (particles, effects,
 * the fall ruler) can draw straight into a real canvas context with no adapter, while still
 * type-checking under the DOM-free `tests/tsconfig.json` (no DOM lib).
 */
export interface PixelTarget {
  fillStyle: unknown;
  fillRect(x: number, y: number, w: number, h: number): void;
}
