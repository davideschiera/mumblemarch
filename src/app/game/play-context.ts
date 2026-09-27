/**
 * Composition helpers for the controller: the concrete PlayContext (the verbs every module uses:
 * command, step, say, uiSound, setStatus, settings, scale, focusCanvas, replaceSession) and the
 * module set. Owner: E5a after E0 (part of the controller).
 */
import type { GameSession } from '../../core/session.ts';
import type { GameCommand, GameEvent } from '../../core/types.ts';
import type { LevelDef } from '../../levels/format.ts';
import type { Minimap } from '../../render/minimap.ts';
import type { GameHudView } from '../../ui/hud/types.ts';
import type { ScreenContext } from '../../ui/screens/screen.ts';
import type { AppServices } from '../services.ts';
import { AudioWiring } from './audio-wiring.ts';
import { CameraControl } from './camera-control.ts';
import type { CommandSource, PlayContext, PlayModules, PlayNavigation } from './context.ts';
import { GameDialogs } from './dialogs.ts';
import { FlowControl } from './flow.ts';
import { KeyboardCursor } from './keyboard-cursor.ts';
import { MinimapControl } from './minimap-control.ts';
import type { PlayState } from './play-state.ts';
import { PointerControl } from './pointer.ts';
import { PopRestartControl } from './pop-restart.ts';
import { ReleaseRateControl } from './release-rate.ts';
import { Selection } from './selection.ts';
import { SkillsControl } from './skills.ts';
import { UndoControl } from './undo.ts';

/** The controller internals the context delegates to (resolved lazily: modules come later). */
export interface PlayContextHost {
  readonly services: AppServices;
  readonly level: LevelDef;
  readonly screen: ScreenContext;
  readonly nav: PlayNavigation;
  readonly state: PlayState;
  session(): GameSession;
  setSession(next: GameSession): void;
  view(): GameHudView;
  modules(): PlayModules;
  command(command: GameCommand, source: CommandSource): readonly GameEvent[];
  step(ticks: number): void;
}

export function createPlayContext(host: PlayContextHost): PlayContext {
  const { services, state } = host;
  const canvas = services.renderer.canvas;
  return {
    get session() {
      return host.session();
    },
    level: host.level,
    services,
    get view() {
      return host.view();
    },
    state,
    get modules() {
      return host.modules();
    },
    nav: host.nav,
    screen: host.screen,
    command: (command, source) => host.command(command, source),
    step: (ticks) => host.step(ticks),
    say: (message, options) => services.announcer.say(message, options),
    uiSound: (id) => host.modules().audio.uiSound(id),
    setStatus: (text, kind, ms) => {
      state.status = { text, kind, untilMs: state.nowMs + ms };
    },
    settings: () => services.save.current.settings,
    scale: () => Math.max(1, Math.round(canvas.clientWidth / canvas.width) || 1),
    focusCanvas: () => {
      if (document.activeElement !== canvas) canvas.focus({ preventScroll: true });
    },
    replaceSession: (next) => {
      host.setSession(next);
      services.renderer.setLevel(next.level, next);
      host.modules().minimap.setLevel();
    },
  };
}

/** One instance of every module (constructors must not call other modules: ctx.modules is set after). */
export function createModules(ctx: PlayContext, minimap: Minimap): PlayModules {
  return {
    selection: new Selection(ctx),
    camera: new CameraControl(ctx),
    cursor: new KeyboardCursor(ctx),
    pointer: new PointerControl(ctx),
    minimap: new MinimapControl(ctx, minimap),
    skills: new SkillsControl(ctx),
    flow: new FlowControl(ctx),
    releaseRate: new ReleaseRateControl(ctx),
    popRestart: new PopRestartControl(ctx),
    undo: new UndoControl(ctx),
    dialogs: new GameDialogs(ctx),
    audio: new AudioWiring(ctx),
  };
}
