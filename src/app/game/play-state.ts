/**
 * PlayState — the ONE mutable bag of UI-side state (not simulation state) that the game
 * modules share for one play of one level. DOM-free. Each field names its single writer; every
 * module may read any field. The session (core) stays the source of truth for the simulation.
 * Owner: ui-lead (E0 wrote it). Adding a field = a ui-lead change; say who writes it.
 */
import type { SelectionFilter } from '../../core/picking.ts';
import type { Point, SkillCounts, SkillId } from '../../core/types.ts';
import { SKILL_IDS } from '../../core/types.ts';
import type { ArmKind } from './arming.ts';

export type CursorMode = 'mouse' | 'keyboard';
export type StatusKind = 'info' | 'refusal' | 'warning';

/** A message that expires at `untilMs` (PlayState.nowMs clock). */
export interface TimedText {
  readonly text: string;
  readonly kind: StatusKind;
  readonly untilMs: number;
}

export interface PlayState {
  /** Real-time ms since the level opened; advanced by the controller's frame(). Writer: controller. */
  nowMs: number;

  // ─── Skills (writer: skills.ts) ───────────────────────────────────────────────────────────
  /** Chosen skill (§6.1.1). Stays selected when it runs out; never auto-switches. */
  selectedSkill: SkillId | null;

  // ─── Selection (writer: selection.ts — other modules call Selection methods) ─────────────
  /** §6.2.2 lock-on selection, by mumble id. */
  selectedId: number | null;
  /** Last known x of the selection, for `fromX` after it vanished (§6.2.3/§6.2.5). */
  selectedLastX: number | null;
  /** The cursor pick (§6.2.2) under `cursor`, re-picked every frame. */
  hoverId: number | null;
  /** The chosen skill would be refused by the hover pick (dashed bracket + ✕, §6.3.1). */
  hoverWouldRefuse: boolean;
  /** Filter chip (§6.3.4); resets to 'all' at every level start. */
  filter: SelectionFilter;

  // ─── Cursor (writers: pointer.ts in mouse mode, keyboard-cursor.ts in keyboard mode) ──────
  /** Shared world-space cursor (mouse position or W A S D crosshair); null = none. */
  cursor: Point | null;
  /** Who moved the cursor last; the in-canvas crosshair is drawn only in 'keyboard' mode. */
  cursorMode: CursorMode | null;

  // ─── Camera (writer: camera-control.ts) ─────────────────────────────────────────────────
  /** Follow the selected mumble (§6.1.1 L; persisted in settings.cameraFollow). */
  follow: boolean;

  // ─── Flow (writer: flow.ts) ─────────────────────────────────────────────────────────────
  /** Simulation paused. Source of truth: the controller copies it into GameLoop each frame. */
  paused: boolean;
  /** The player paused explicitly (P / button / menu) — pauseWhileChoosing never resumes this. */
  userPaused: boolean;
  /** ×3 (§6.4.3); off at level end and on restart. */
  fastForward: boolean;
  /** Mumbles assigned during the current pause (pending badge + `Ready:` count, §6.4.1). Writers: skills.ts adds, flow.ts clears on the next tick. */
  pendingIds: number[];
  /** `Tick 312 (+1)` note (§6.4.2). */
  tickNote: TimedText | null;
  /** A modal dialog (pause menu, briefing, help, settings) is open. Writer: flow.withPause(). */
  dialogOpen: boolean;
  /** The level has ended (results pending). */
  ended: boolean;

  // ─── Arming (writer: pop-restart.ts) ────────────────────────────────────────────────────
  /** Armed Pop all / Restart (§6.4.5–6), no timeout. */
  armed: ArmKind | null;

  // ─── Status line (writer: PlayContext.setStatus — any module; the controller expires it) ─
  status: TimedText | null;
}

/** Fresh state for a level start (§6.3.4: filter resets to All). */
export function createPlayState(skills: SkillCounts, follow: boolean): PlayState {
  return {
    nowMs: 0,
    selectedSkill: SKILL_IDS.find((id) => skills[id] > 0) ?? null,
    selectedId: null,
    selectedLastX: null,
    hoverId: null,
    hoverWouldRefuse: false,
    filter: 'all',
    cursor: null,
    cursorMode: null,
    follow,
    paused: false,
    userPaused: false,
    fastForward: false,
    pendingIds: [],
    tickNote: null,
    dialogOpen: false,
    ended: false,
    armed: null,
    status: null,
  };
}
