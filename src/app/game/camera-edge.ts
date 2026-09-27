/**
 * Pure edge-zone geometry (DESIGN §6.1.3): which side, if any, a pointer's CSS x sits in the
 * inner edge zone of the canvas. Takes plain numbers (not a PointerSample) so it is
 * Node-testable; `camera-control.ts` calls it from `onPointerMove`.
 * Owner: E4a.
 */

export type EdgeSide = 'left' | 'right' | null;

/**
 * `cssX` within `zonePx` of the left/right edge of a `cssWidth`-wide canvas → that side; outside
 * the canvas entirely (cssX < 0 or > cssWidth, e.g. a captured drag) → null, same as the middle.
 */
export function edgeSideAt(cssX: number, cssWidth: number, zonePx: number): EdgeSide {
  if (cssX < 0 || cssX > cssWidth) return null;
  if (cssX < zonePx) return 'left';
  if (cssX > cssWidth - zonePx) return 'right';
  return null;
}
