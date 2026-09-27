/**
 * Preview-sim solution driver: replays a SolutionScript's scripted skill assignments against a
 * running session by matching each step's condition against the live GameView every tick, the
 * same semantics as `docs/design/mockups/levels-preview.html`'s `matches()` / assignment loop.
 * Used by the per-level headless replay tests and by `__game.playSolution()` (browser).
 *
 * Known difference from the preview: the preview's `apply()` mutates the mumble immediately
 * inside the same assignment pass, so a later step in that pass can see an earlier step's
 * effect on the WORLD (e.g. a freshly placed blocker already narrowing another mumble's path).
 * Here `checkAssign` is the engine's pre-tick `session.checkAssign`, called against state as of
 * the start of the tick — commands returned by this call are not applied until `session.step()`
 * runs afterwards. Only this call's own bookkeeping (`taken`, each step's `done`/`who`, and the
 * per-call skill budget) is updated as steps are scanned, so same-call `afterSkill`/`target`
 * chaining still works, but a step can never react to another step's world-mutating effect
 * within the same tick.
 */
import type { Direction, GameCommand, GameView, Lemming, LemmingState, Rejection, SkillId } from '../core/types.ts';

/**
 * One scripted skill assignment. Condition fields are optional and AND-ed together; the driver
 * assigns `skill` to the first matching, still-unassigned lemming (see levels-preview.html
 * `matches()`: idx, minIdx, x, xmin, xmax, dir, ymin, ymax, state, after, afterSkill, target).
 */
export interface SolutionStep {
  readonly skill: SkillId;
  readonly idx?: number;
  readonly minIdx?: number;
  readonly x?: number;
  readonly xmin?: number;
  readonly xmax?: number;
  readonly dir?: Direction;
  readonly ymin?: number;
  readonly ymax?: number;
  readonly state?: LemmingState;
  readonly after?: number;
  readonly afterSkill?: number;
  readonly target?: number;
  readonly count?: number;
}

export interface SolutionScript {
  /** Applied once, before the first assignment. */
  readonly releaseRate?: number;
  readonly assignments: readonly SolutionStep[];
}

/** Per-step runtime bookkeeping, mirroring the preview's `assigns[i]` fields. */
interface StepRuntime {
  /** Assignments still to make for this step (`count ?? 1`, decremented on success). */
  left: number;
  /** Set true the first time this step successfully assigns (stays true). */
  done: boolean;
  /** Lemming id of the most recent successful assignment for this step, if any. */
  who: number | null;
  /** Lemming ids this step has already targeted (never re-targeted, even if it walks away). */
  readonly seen: Set<number>;
  /** Set once this step failed to fire only because the skill budget was exhausted. */
  overBudget: boolean;
}

/** Read-only snapshot of one step's runtime state, for debugging/replay tests. */
export interface SolutionStepProgress {
  readonly left: number;
  readonly done: boolean;
  readonly who: number | null;
  readonly overBudget: boolean;
}

export class SolutionDriver {
  private readonly script: SolutionScript;
  private readonly runtime: StepRuntime[];
  private firstCall = true;

  constructor(script: SolutionScript) {
    this.script = script;
    this.runtime = script.assignments.map((step) => ({
      left: step.count ?? 1,
      done: false,
      who: null,
      seen: new Set<number>(),
      overBudget: false,
    }));
  }

  /**
   * Call once per tick BEFORE `session.step()`: the commands to apply now (`applyNow` each, in
   * order).
   */
  commandsFor(view: GameView, checkAssign: (lemmingId: number, skill: SkillId) => Rejection | null): GameCommand[] {
    const commands: GameCommand[] = [];

    if (this.firstCall) {
      this.firstCall = false;
      if (this.script.releaseRate !== undefined) {
        commands.push({ type: 'set-release-rate', rate: this.script.releaseRate });
      }
    }

    const lemmings = view.lemmings.filter((lem) => !lem.removed).slice().sort((a, b) => a.id - b.id);
    const taken = new Set<number>();
    const issuedThisCall = new Map<SkillId, number>();

    const assignments = this.script.assignments;
    for (let ai = 0; ai < assignments.length; ai++) {
      const step = assignments[ai];
      const state = this.runtime[ai];
      if (step === undefined || state === undefined || state.left <= 0) continue;

      for (const lem of lemmings) {
        if (taken.has(lem.id)) continue;
        if (state.seen.has(lem.id)) continue;
        if (!this.matches(step, lem, view)) continue;
        if (checkAssign(lem.id, step.skill) !== null) continue;

        const budget = view.skills[step.skill] ?? 0;
        const issued = issuedThisCall.get(step.skill) ?? 0;
        if (budget - issued <= 0) {
          state.overBudget = true;
          break;
        }

        commands.push({ type: 'assign-skill', lemmingId: lem.id, skill: step.skill });
        taken.add(lem.id);
        issuedThisCall.set(step.skill, issued + 1);
        state.left--;
        state.done = true;
        state.who = lem.id;
        state.seen.add(lem.id);
        if (state.left <= 0) break;
      }
    }

    return commands;
  }

  private matches(step: SolutionStep, lem: Readonly<Lemming>, view: GameView): boolean {
    if (step.idx !== undefined && lem.id !== step.idx) return false;
    if (step.minIdx !== undefined && lem.id < step.minIdx) return false;
    if (step.x !== undefined && lem.x !== step.x) return false;
    if (step.xmin !== undefined && lem.x < step.xmin) return false;
    if (step.xmax !== undefined && lem.x > step.xmax) return false;
    if (step.dir !== undefined && lem.dir !== step.dir) return false;
    if (step.ymin !== undefined && lem.y < step.ymin) return false;
    if (step.ymax !== undefined && lem.y > step.ymax) return false;
    if (step.state !== undefined && lem.state !== step.state) return false;
    if (step.after !== undefined && view.tick < step.after) return false;
    if (step.afterSkill !== undefined) {
      const dep = this.runtime[step.afterSkill];
      if (dep === undefined || !dep.done) return false;
    }
    if (step.target !== undefined) {
      const dep = this.runtime[step.target];
      if (dep === undefined || dep.who === null || lem.id !== dep.who) return false;
    }
    return true;
  }

  /** Read-only per-step diagnostics (debugging / replay tests), in `assignments` order. */
  get progress(): readonly SolutionStepProgress[] {
    return this.runtime.map((s) => ({ left: s.left, done: s.done, who: s.who, overBudget: s.overBudget }));
  }
}
