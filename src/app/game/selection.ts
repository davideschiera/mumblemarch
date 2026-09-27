/**
 * Selection — the one "target" for Space, C and L (DESIGN §6.2.2), keyboard cycling (§6.2.3),
 * picking with the filter chip + snap radius + accept-awareness (§6.3.2–§6.3.4), the hover pick
 * and predicted refusal (§6.3.1), the status focus label (§6.3.1), the edge arrow (§6.2.2), the
 * cursor-settle announcement (§6.2.4, §7.3 #5) and what happens when the selected mumble exits
 * or dies (§6.2.5).
 * Writes PlayState: selectedId, selectedLastX, hoverId, hoverWouldRefuse, filter.
 * Owner: E4b.
 */
import { CURSOR_SETTLE_MS, STATUS_REFUSAL_MS } from '../config.ts';
import { SNAP_RADIUS_CSS } from '../../core/constants.ts';
import { SELECTION_FILTERS, cycleLemming, isSelectable, lemmingsAt, pickLemmingAt, type PickOptions, type SelectionFilter } from '../../core/picking.ts';
import type { GameEvent, Lemming, Point } from '../../core/types.ts';
import type { EdgeArrow } from '../../ui/hud/types.ts';
import { ANNOUNCE, describeLemming, focusLabelText, noMumblesHereText, refusalText, SELECTION_FILTER_PLURAL, STATUS } from '../../ui/strings.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { advanceSettle, INITIAL_SETTLE, markAnnounced, shouldAnnounceSettle, type SettleState } from './cursor-settle.ts';
import { cycleStartOptions, dirLabel, orderedSelectables, orderPosition } from './selection-order.ts';

export class Selection {
  private readonly ctx: PlayContext;

  // Cursor-settle tracking (§6.2.4 / §7.3 #5): re-evaluated every frame().
  private settle: SettleState = INITIAL_SETTLE;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /** §6.2.2: the lock-on selection, if that mumble is still selectable (looked up by id each call). */
  selected(): Readonly<Lemming> | null {
    return this.selectable(this.ctx.state.selectedId);
  }

  /** §6.2.2: target = the selected mumble if still selectable, else the cursor pick, else null. */
  target(): Readonly<Lemming> | null {
    return this.selected() ?? this.selectable(this.ctx.state.hoverId);
  }

  /**
   * §6.2.3 keyboard cycling (Z/X/[ ]): ±1 in x-then-id order with wrap, filter-aware; `group`
   * (Shift) jumps to the next group. Starts in view / nearest to centre with no prior selection,
   * else continues from the vanished selection's last x. Centres the camera when needed;
   * announces §7.3 #4, or `ui-deny` + "No mumbles/walkers to select" when nothing qualifies.
   */
  cycle(step: 1 | -1, group: boolean): void {
    const { state, session, services } = this.ctx;
    const view = { x0: services.camera.x, x1: services.camera.x + services.camera.viewW };
    const options = cycleStartOptions(state.filter, group, state.selectedLastX, view);
    const lem = cycleLemming(session.lemmings, this.selected()?.id ?? null, step, options);
    if (!lem) {
      this.ctx.uiSound('ui-deny');
      const text = state.filter === 'all' ? STATUS.noMumblesToSelect : STATUS.noWalkersToSelect;
      this.ctx.setStatus(text, 'refusal', STATUS_REFUSAL_MS);
      this.ctx.say(text, { key: 'selection', userInitiated: true });
      return;
    }
    this.select(lem.id, 'key');
    this.ctx.modules.camera.ensureVisible(lem.x, lem.y);
  }

  /**
   * Lock the selection on `id` (keyboard cycle, mouse click, L in cursor mode, §6.2.2). Announces
   * §7.3 #4 for a direct key/click selection (not for internal/hook callers).
   */
  select(id: number, source: CommandSource = 'key'): void {
    const lem = this.ctx.session.lemmingById(id);
    if (!lem) return;
    this.ctx.state.selectedId = id;
    this.ctx.state.selectedLastX = lem.x;
    if (source === 'key' || source === 'pointer') this.announceSelection(lem);
  }

  /** Drop the lock-on selection (W A S D aiming, §6.2.2). Keeps `selectedLastX` for fromX. */
  clear(): void {
    this.ctx.state.selectedId = null;
  }

  /**
   * §6.3.2 pick at world point `p`: filter chip (+ walkersOnly for Shift/right-held presses),
   * snap radius (§6.3.3) and accept-awareness for the chosen skill (via session.checkAssign).
   */
  pickAt(p: Point, walkersOnly = false): Readonly<Lemming> | null {
    const { state, session } = this.ctx;
    const skill = state.selectedSkill;
    const options: PickOptions = {
      filter: state.filter,
      walkersOnly,
      snapRadius: this.snapRadius(),
      ...(skill ? { accepts: (lem: Readonly<Lemming>) => session.checkAssign(lem.id, skill) === null } : {}),
    };
    return pickLemmingAt(session.lemmings, p, skill, options);
  }

  /** §6.3.3 snap radius in world px: ceil(24 CSS px ÷ scale). */
  snapRadius(): number {
    return Math.ceil(SNAP_RADIUS_CSS / this.ctx.scale());
  }

  /**
   * Per frame (also while paused): re-pick under the still cursor (mumbles move), predict the
   * refusal cue (§6.3.1), the cursor-settle announcement (§6.2.4/§7.3 #5), track the selection's
   * last x, drop a vanished selection.
   */
  frame(elapsedMs: number): void {
    const { state, session } = this.ctx;
    const pick = state.cursor ? this.pickAt(state.cursor) : null;
    state.hoverId = pick?.id ?? null;
    const skill = state.selectedSkill;
    state.hoverWouldRefuse = pick !== null && skill !== null && session.checkAssign(pick.id, skill) !== null;

    this.updateSettle(elapsedMs, state.cursor, pick);

    // A dying mumble is no longer selectable (selected() → null) but keeps its id until the
    // exit/death event arrives, so handleEvents() can still announce #8/#9.
    const lem = state.selectedId === null ? undefined : session.lemmingById(state.selectedId);
    if (!lem) state.selectedId = null;
    else if (isSelectable(lem)) state.selectedLastX = lem.x;
  }

  /**
   * §6.3.1 focus label: hover wins over the selection. `×N` when ≥ 2 selectable, filter-passing
   * mumbles share the hit box under the pointer; a predicted refusal appends "— can't dig: steel
   * below"; a mumble physically under the pointer but excluded by the filter chip shows
   * "No {plural} here" instead of falling through to the selection.
   */
  focusLabel(): string {
    const { state, session } = this.ctx;
    const hovered = this.selectable(state.hoverId);
    if (state.cursor) {
      if (hovered) {
        const count = lemmingsAt(session.lemmings, state.cursor, { filter: state.filter }).length;
        const skill = state.selectedSkill;
        const rejection = skill ? session.checkAssign(hovered.id, skill) : null;
        const opts = rejection ? { refusal: refusalText(rejection, skill!) } : {};
        return focusLabelText(describeLemming(hovered), count, opts);
      }
      if (lemmingsAt(session.lemmings, state.cursor, {}).length > 0) {
        return noMumblesHereText(SELECTION_FILTER_PLURAL[state.filter]);
      }
    }
    const selected = this.selected();
    return selected ? focusLabelText(describeLemming(selected), 1, { selected: true }) : '';
  }

  /**
   * §6.3.4 filter chip (V / chip click): All → Walkers → Facing ← → Facing → → All. Never drops
   * the selection. Announces §7.3 #18 with the count now in view.
   */
  cycleFilter(): void {
    const { state } = this.ctx;
    const index = SELECTION_FILTERS.indexOf(state.filter);
    state.filter = SELECTION_FILTERS[(index + 1) % SELECTION_FILTERS.length] ?? 'all';
    this.ctx.say(ANNOUNCE.filter(state.filter, this.inViewCount(state.filter)), { key: 'filter', userInitiated: true });
  }

  /**
   * §6.2.2: a small edge arrow with the selected mumble's label at the view edge it walked past,
   * shown only while Follow is off (Follow is expected to keep it in view). Null hides it.
   */
  edgeArrow(): EdgeArrow | null {
    const { state, session, services } = this.ctx;
    if (state.follow) return null;
    const lem = state.selectedId === null ? undefined : session.lemmingById(state.selectedId);
    if (!lem || !isSelectable(lem)) return null;
    const camera = services.camera;
    if (lem.x >= camera.x && lem.x <= camera.x + camera.viewW) return null;
    return { side: lem.x < camera.x ? 'left' : 'right', label: describeLemming(lem) };
  }

  /**
   * §6.2.5: the selected mumble exited/died → clear at once (never move it to another mumble),
   * keep fromX, announce #8/#9 (the 250 ms "poof" is drawn by the renderer).
   */
  handleEvents(events: readonly GameEvent[]): void {
    const { state } = this.ctx;
    for (const event of events) {
      if ((event.type !== 'lemming-exited' && event.type !== 'lemming-died') || event.lemmingId !== state.selectedId) continue;
      state.selectedId = null;
      const text = event.type === 'lemming-exited' ? ANNOUNCE.selectedExited : ANNOUNCE.selectedDied(event.cause);
      this.ctx.say(text, { key: 'selection' });
    }
  }

  /** §7.3 #4: `{label}, facing {left|right}, {i} of {n}` + `, {filter}` when the chip isn't All. */
  private announceSelection(lem: Readonly<Lemming>): void {
    const { state, session } = this.ctx;
    const pos = orderPosition(orderedSelectables(session.lemmings, state.filter), lem.id);
    if (!pos) return; // Picked lemmings always pass the current filter, but guard defensively.
    this.ctx.say(ANNOUNCE.selection(describeLemming(lem), dirLabel(lem.dir), pos.i, pos.n, state.filter), {
      key: 'selection',
      userInitiated: true,
    });
  }

  /** Selectable, filter-passing mumbles currently inside the camera view (§7.3 #18 "{n} in view"). */
  private inViewCount(filter: SelectionFilter): number {
    const { session, services } = this.ctx;
    const camera = services.camera;
    return orderedSelectables(session.lemmings, filter).filter((lem) => lem.x >= camera.x && lem.x <= camera.x + camera.viewW).length;
  }

  /** §6.2.4/§7.3 #5: once the cursor (and the pick under it) is unchanged for CURSOR_SETTLE_MS. */
  private updateSettle(elapsedMs: number, cursor: Point | null, pick: Readonly<Lemming> | null): void {
    this.settle = advanceSettle(this.settle, elapsedMs, cursor, pick?.id ?? null);
    if (pick && shouldAnnounceSettle(this.settle, CURSOR_SETTLE_MS)) {
      this.settle = markAnnounced(this.settle);
      this.ctx.say(ANNOUNCE.underCursor(describeLemming(pick)), { key: 'selection' });
    }
  }

  private selectable(id: number | null): Readonly<Lemming> | null {
    const lem = id === null ? undefined : this.ctx.session.lemmingById(id);
    return lem && isSelectable(lem) ? lem : null;
  }
}
