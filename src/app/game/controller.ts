/**
 * GameController — composition and dispatch for one play of one level. It owns the GameSession
 * and the loop, builds the PlayContext + every module, routes input (routes.ts) and fans each
 * tick's events out to the sinks (audio, announcer, renderer effects, event log) and the modules
 * that care; each frame it assembles RenderState + HudState (view-state.ts).
 *
 *   input / HUD ──routes.ts──▶ modules ──ctx.command()──▶ session ──GameEvent[]──▶ sinks + modules
 *                                  ▲                                      │
 *                                  └────────── GameView (read-only) ◀─────┘ renderer / HUD
 *
 * Player commands use `session.applyNow()` so they work — with instant feedback — while paused
 * (DESIGN §6.4.1); this is replay-equivalent to queuing them for the next tick.
 * Owner: E5a after E0. Behaviour belongs in the modules; this file only wires them.
 */
import { GameSession } from '../../core/session.ts';
import type { SelectionFilter } from '../../core/picking.ts';
import type { EventSink, GameCommand, GameEvent, GameSnapshot, Point, SkillId } from '../../core/types.ts';
import type { ActionId } from '../../input/actions.ts';
import type { ActionModifiers, ActionPhase, InputHandler, PointerSample } from '../../input/handler.ts';
import { compileLevel } from '../../levels/compiler.ts';
import type { LevelDef } from '../../levels/format.ts';
import { Minimap } from '../../render/minimap.ts';
import { EventAnnouncer } from '../../ui/event-announcements.ts';
import type { HudCallbacks } from '../../ui/hud/types.ts';
import type { GameScreenView } from '../../ui/screens/game.ts';
import type { ScreenContext } from '../../ui/screens/screen.ts';
import { EVENT_LOG_LIMIT } from '../config.ts';
import { GameLoop } from '../game-loop.ts';
import type { AppServices } from '../services.ts';
import type { ArmKind } from './arming.ts';
import type { CommandSource, PlayContext, PlayModules, PlayNavigation } from './context.ts';
import type { AutoPauseReason } from './flow.ts';
import { createModules, createPlayContext } from './play-context.ts';
import { createPlayState, type CursorMode, type PlayState } from './play-state.ts';
import { hudCallbacks, routeAction } from './routes.ts';
import { buildHudState, buildRenderState } from './view-state.ts';

export interface GameControllerOptions {
  readonly services: AppServices;
  readonly level: LevelDef;
  /** Builds the HUD view wired to the controller's callbacks (ui/screens/game.ts). */
  readonly createView: (callbacks: HudCallbacks) => GameScreenView;
  /** For in-game overlays (help, briefing, settings). */
  readonly screen: ScreenContext;
  readonly nav: PlayNavigation;
}

export interface LoggedEvent {
  readonly tick: number;
  readonly event: GameEvent;
}

/** UI-side state (not part of the simulation), exposed to the test hook (`__game.ui()`). */
export interface ControllerState {
  readonly selectedSkill: SkillId | null;
  readonly selectedLemmingId: number | null;
  readonly hoveredLemmingId: number | null;
  readonly cursor: Point | null;
  readonly cursorMode: CursorMode | null;
  readonly paused: boolean;
  readonly speed: number;
  readonly fastForward: boolean;
  readonly cameraX: number;
  readonly filter: SelectionFilter;
  readonly follow: boolean;
  readonly armed: ArmKind | null;
}

export class GameController implements InputHandler {
  readonly view: GameScreenView;
  private sessionRef: GameSession;
  private readonly services: AppServices;
  private readonly playState: PlayState;
  private readonly ctx: PlayContext;
  private readonly modules: PlayModules;
  private readonly announcer: EventAnnouncer;
  private readonly sinks: readonly EventSink[];
  private readonly loop: GameLoop;
  private readonly eventLog: LoggedEvent[] = [];

  constructor(options: GameControllerOptions) {
    const { services, level } = options;
    this.services = services;
    this.sessionRef = new GameSession(compileLevel(level), { relaxedTimer: services.save.current.settings.relaxedTimer });
    this.playState = createPlayState(this.sessionRef.skills, services.save.current.settings.cameraFollow);
    this.ctx = createPlayContext({
      services, level, screen: options.screen, nav: options.nav, state: this.playState,
      session: () => this.sessionRef,
      setSession: (next) => {
        this.sessionRef = next;
      },
      view: () => this.view,
      modules: () => this.modules,
      command: (command, source) => this.command(command, source),
      step: (ticks) => this.loop.stepTicks(ticks),
    });
    this.view = options.createView(hudCallbacks(this.ctx));
    this.modules = createModules(this.ctx, new Minimap(this.view.minimapCanvas));
    services.renderer.setLevel(this.sessionRef.level, this.sessionRef);
    this.modules.minimap.setLevel();
    this.modules.camera.start();
    this.announcer = new EventAnnouncer(services.announcer, { lemmingById: (id) => this.sessionRef.lemmingById(id) });
    this.sinks = [this.modules.audio.sink, this.announcer, services.renderer];
    this.loop = new GameLoop({ tick: () => this.tick(), frame: (ms) => this.frame(ms), render: (t) => this.render(t) }, services.scheduler);
    this.modules.audio.beginLevel();
    const { counts, skills } = this.sessionRef;
    this.announcer.announceIntro({ title: level.title, required: counts.required, total: counts.total, skills, selectedSkill: this.playState.selectedSkill });
    services.input.attach(this);
    this.syncLoop();
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.services.input.detach(this); // no-op if a newer GameController has since attached itself
    this.modules.flow.destroy();
    this.modules.audio.destroy();
    this.view.destroy();
    delete this.services.stageOverlay.dataset['edge'];
  }

  // ─── API for screens.ts, app.ts and the test hook ─────────────────────────────────────────

  get session(): GameSession {
    return this.sessionRef;
  }

  get paused(): boolean {
    return this.playState.paused;
  }

  /** When false (test hook), the results screen is not opened automatically. */
  get autoAdvance(): boolean {
    return this.modules.flow.autoAdvance;
  }

  set autoAdvance(value: boolean) {
    this.modules.flow.autoAdvance = value;
  }

  get state(): ControllerState {
    const s = this.playState;
    return {
      selectedSkill: s.selectedSkill,
      selectedLemmingId: this.modules.selection.selected()?.id ?? null,
      hoveredLemmingId: s.hoverId,
      cursor: s.cursor,
      cursorMode: s.cursorMode,
      paused: s.paused,
      speed: this.modules.flow.speed(),
      fastForward: s.fastForward,
      cameraX: this.services.camera.x,
      filter: s.filter,
      follow: s.follow,
      armed: s.armed,
    };
  }

  /** Pause/resume as the player would (test hook `setRealtime`, `loadLevel`). */
  setPaused(paused: boolean, announce = false): void {
    this.modules.flow.setPaused(paused, { announce, user: true });
    this.syncLoop();
  }

  /** §6.4.8 auto-pause hooks (app.ts: visibilitychange, window blur). */
  autoPause(reason: AutoPauseReason): void {
    this.modules.flow.autoPause(reason);
    this.syncLoop();
  }

  /** Apply a player command now (works while paused) and dispatch its events; returns them. */
  command(command: GameCommand, source: CommandSource = 'hook'): readonly GameEvent[] {
    const events = this.sessionRef.applyNow(command);
    this.dispatch(events, this.sessionRef.tick);
    this.modules.skills.handleCommandEvents(command, events, source);
    return events;
  }

  /** Advance exactly `n` ticks synchronously (same path as real time). */
  stepTicks(n: number): GameSnapshot {
    this.loop.stepTicks(n);
    return this.sessionRef.snapshot();
  }

  events(limit = EVENT_LOG_LIMIT): readonly LoggedEvent[] {
    return this.eventLog.slice(-limit);
  }

  // ─── InputHandler ──────────────────────────────────────────────────────────────────────────

  onAction(action: ActionId, phase: ActionPhase, event: ActionModifiers | null): void {
    routeAction(this.ctx, action, phase, event?.shiftKey ?? false);
  }

  onPointerMove(sample: PointerSample | null): void {
    this.modules.pointer.move(sample);
  }

  onPointerDown(sample: PointerSample): void {
    this.modules.popRestart.onOtherAction(); // §6.4.5: any pointer press disarms
    this.modules.pointer.down(sample);
  }

  onPointerUp(sample: PointerSample): void {
    this.modules.pointer.up(sample);
  }

  onWheel(deltaCssPx: number): void {
    this.modules.camera.onWheel(deltaCssPx);
  }

  // ─── Loop callbacks ────────────────────────────────────────────────────────────────────────

  private tick(): void {
    const tick = this.sessionRef.tick;
    this.dispatch(this.sessionRef.step(), tick);
    this.modules.flow.onTick(tick);
    this.modules.audio.onTick(this.sessionRef.tick);
  }

  /** Every sink sees every tick (even with no events) so time-based batching can flush. */
  private dispatch(events: readonly GameEvent[], tick: number): void {
    for (const sink of this.sinks) sink.handleEvents(events, tick);
    if (events.length === 0) return;
    this.modules.selection.handleEvents(events);
    this.modules.flow.handleEvents(events);
    this.modules.audio.handleEvents(events);
    for (const event of events) this.eventLog.push({ tick, event });
    if (this.eventLog.length > EVENT_LOG_LIMIT) this.eventLog.splice(0, this.eventLog.length - EVENT_LOG_LIMIT);
  }

  /** Real-time logic (runs while paused too): held keys, camera, cursor, hover, status expiry. */
  private frame(elapsedMs: number): void {
    const { playState: state, modules: m } = this;
    state.nowMs += elapsedMs;
    m.releaseRate.frame(elapsedMs);
    m.flow.frame(elapsedMs);
    m.cursor.frame(elapsedMs);
    m.camera.frame(elapsedMs);
    m.minimap.frame(elapsedMs);
    m.selection.frame(elapsedMs);
    if (state.status && state.status.untilMs <= state.nowMs) state.status = null;
    this.syncLoop();
  }

  private render(timeMs: number): void {
    this.services.renderer.render(buildRenderState(this.ctx, timeMs));
    this.modules.minimap.render();
    this.view.update(buildHudState(this.ctx));
    this.view.edgeArrow(this.modules.selection.edgeArrow()); // §6.2.2 (the view no-ops when unchanged)
    // §6.1.3 chevron at the active edge zone while edge-scrolling (overlays.css draws it).
    const edge = this.modules.camera.edgeSide() ?? '';
    const overlay = this.services.stageOverlay;
    if ((overlay.dataset['edge'] ?? '') !== edge) overlay.dataset['edge'] = edge;
  }

  /** PlayState is the source of truth for pause/speed; the loop only reads a copy. */
  private syncLoop(): void {
    this.loop.paused = this.playState.paused;
    this.loop.speed = this.modules.flow.speed();
  }
}
