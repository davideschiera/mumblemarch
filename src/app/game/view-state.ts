/**
 * Per-frame view state assembly: the full `RenderState` (CONTRACTS §5) for the renderer and the
 * full `HudState` (ui/hud/types.ts) for the HUD view, read from the session, PlayState and the
 * modules' getters. No logic of its own beyond composition.
 * Owner: E5a after E0 (part of the controller). A new HUD field = ui-lead adds it to HudState,
 * then it is filled here from the owning module's getter.
 */
import { resolveBindings, type KeyBindings } from '../../input/bindings.ts';
import type { Settings } from '../../persistence/schema.ts';
import type { RenderState } from '../../render/renderer.ts';
import type { HudState } from '../../ui/hud/types.ts';
import type { PlayContext } from './context.ts';
import { isTimeLow, releaseIntervalSeconds } from './rules.ts';

export function buildRenderState(ctx: PlayContext, timeMs: number): RenderState {
  const { services, state, session, modules } = ctx;
  const settings = ctx.settings();
  const reducedMotion = services.reducedMotion();
  return {
    game: session,
    camera: services.camera,
    selectedLemmingId: modules.selection.selected()?.id ?? null,
    hoveredLemmingId: state.hoverId,
    hoverWouldRefuse: state.hoverWouldRefuse,
    keyboardCursor: modules.cursor.position,
    pendingLemmingIds: state.pendingIds,
    timeMs: reducedMotion ? 0 : timeMs,
    reducedMotion,
    highContrast: settings.highContrast,
    fallRuler: settings.fallRuler,
    paused: state.paused,
  };
}

export function buildHudState(ctx: PlayContext): HudState {
  const { services, state, session, modules } = ctx;
  const settings = ctx.settings();
  const counts = session.counts;
  const camera = services.camera;
  // DESIGN §7.7: same world→view conversion the renderer uses (`lem.x - camX`, RenderState's
  // `keyboardCursor`), so the caption strip can compare against its own on-screen box.
  const selectedLem = modules.selection.selected();
  const captionAvoidPoints = {
    cursor: state.cursor ? { x: state.cursor.x - camera.x, y: state.cursor.y - camera.y } : null,
    selected: selectedLem ? { x: selectedLem.x - camera.x, y: selectedLem.y - camera.y } : null,
  };
  return {
    skills: session.skills,
    selectedSkill: state.selectedSkill,
    releaseRate: {
      value: session.releaseRate,
      min: modules.releaseRate.min,
      max: modules.releaseRate.max,
      intervalSeconds: releaseIntervalSeconds(session.releaseRate),
    },
    paused: state.paused,
    fastForward: state.fastForward,
    popAll: modules.popRestart.popState(),
    restartArmed: state.armed === 'restart',
    filter: state.filter,
    follow: state.follow,
    focusLabel: modules.selection.focusLabel(),
    status: state.status ? { text: state.status.text, kind: state.status.kind } : null,
    counts,
    goalMet: counts.saved >= counts.required,
    time: {
      timeLeftTicks: session.timeLeftTicks,
      overtimeTicks: session.overtimeTicks,
      relaxed: session.relaxedTimer,
      low: isTimeLow(session.timeLeftTicks, session.overtimeTicks),
    },
    muted: settings.muted,
    readyJobs: modules.flow.readyJobs(),
    tickNote: modules.flow.tickNote(),
    minimap: modules.minimap.slider(),
    showKeyHints: settings.showKeyHints,
    bindings: memoBindings(settings),
    ended: state.ended,
    reducedMotion: services.reducedMotion(),
    captionAvoidPoints,
  };
}

/** Same KeyBindings object until the player rebinds, so the view can diff by identity. */
let lastOverrides: Settings['bindings'] | null = null;
let lastBindings: KeyBindings | null = null;
function memoBindings(settings: Settings): KeyBindings {
  if (settings.bindings !== lastOverrides || !lastBindings) {
    lastOverrides = settings.bindings;
    lastBindings = resolveBindings(settings.bindings);
  }
  return lastBindings;
}
