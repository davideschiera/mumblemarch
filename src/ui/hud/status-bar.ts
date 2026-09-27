/**
 * The status row (DESIGN §5.1/§5.3 wireframe): the status line (chips, focus slot, Out/Saved/
 * Time, notes) beside the minimap well, `flex-wrap`ped so the minimap drops under the status
 * line at ×2 (§5.1). Owner: e2b-hud-view.
 */
import { h } from '../dom.ts';
import { createMinimapWell, type MinimapWell } from './minimap-well.ts';
import { StatusLine } from './status-line.ts';
import type { HudCallbacks, HudState } from './types.ts';

export class StatusBar {
  readonly element: HTMLElement;
  /** The canvas `render/Minimap` draws into (exposed as `GameScreenView.minimapCanvas`). */
  readonly minimapCanvas: HTMLCanvasElement;
  private readonly statusLine: StatusLine;
  private readonly minimapWell: MinimapWell;

  constructor(callbacks: HudCallbacks) {
    this.statusLine = new StatusLine(callbacks);
    this.minimapWell = createMinimapWell(callbacks);
    this.minimapCanvas = this.minimapWell.canvas;
    this.element = h('div', { class: 'game-hud stage-width' }, this.statusLine.element, this.minimapWell.element);
  }

  update(state: HudState): void {
    this.statusLine.update(state);
    this.minimapWell.update(state);
  }
}
