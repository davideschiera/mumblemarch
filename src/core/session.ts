/**
 * GameSession — one play-through of one level. The single owner of mutable game state.
 *
 * Deterministic: given the same CompiledLevel, seed, options and TimedCommands, `step()`
 * produces the same states and events on every machine. No DOM, no clocks, no Math.random().
 */
import {
  SKILL_RULES,
  STATE_HANDLERS,
  tickFuse,
  UNASSIGNABLE_STATES,
  setState,
  type TickContext,
} from './behaviours/index.ts';
import { CommandQueue } from './commands.ts';
import {
  BLOCKER_REACH,
  BOMB_FUSE_TICKS,
  ENTRANCE_OPEN_TICK,
  ENTRANCE_ORDER,
  EXIT_TRIGGER,
  FALL_COUNTER_STEP,
  FIRST_SPAWN_TICK,
  LETS_GO_TICK,
  MAX_RELEASE_RATE,
  OUT_OF_BOUNDS_MARGIN,
  releaseIntervalTicks,
  TICKS_PER_SECOND,
  TIME_WARNINGS_SECONDS,
} from './constants.ts';
import { createRng, type Rng } from './rng.ts';
import type { Terrain } from './terrain.ts';
import {
  SKILL_IDS,
  type CompiledLevel,
  type DeathCause,
  type Direction,
  type GameCommand,
  type GameCounts,
  type GameEvent,
  type GameSnapshot,
  type GameView,
  type Lemming,
  type LemmingState,
  type LevelOutcome,
  type Rejection,
  type Replay,
  type SessionStatus,
  type SkillCounts,
  type SkillId,
} from './types.ts';

/** Foot-pixel triggers (exit/water/fire/trap) never apply to these — dying/leaving already. */
const TRIGGER_SKIP_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'splatting',
  'drowning',
  'burning',
  'exploding',
  'exiting',
]);

/** The session applies the blocker field to these states after their handler runs (dir only). */
const BLOCKER_TURN_STATES: ReadonlySet<LemmingState> = new Set<LemmingState>([
  'walking',
  'building',
  'bashing',
  'mining',
]);

/** Hazard kinds are checked in this fixed order (RESEARCH §2.7 / core-rules §F); within one
 * kind, several hazards are checked lowest index first. */
const HAZARD_KIND_ORDER = ['water', 'fire', 'trap'] as const;

/** Half-open rect containment: [rx, rx+rw) × [ry, ry+rh). */
function inRect(x: number, y: number, rx: number, ry: number, rw: number, rh: number): boolean {
  return x >= rx && x < rx + rw && y >= ry && y < ry + rh;
}

export interface SessionOptions {
  /** Overrides the level's seed. */
  readonly seed?: number;
  /** Accessibility option: the clock never ends the level (it stops at 0). Part of replays. */
  readonly relaxedTimer?: boolean;
}

type MutableTickContext = { -readonly [K in keyof TickContext]: TickContext[K] };

export class GameSession implements GameView {
  readonly level: CompiledLevel;
  readonly terrain: Terrain;
  readonly seed: number;
  readonly relaxedTimer: boolean;
  readonly commands = new CommandQueue();

  private readonly rng: Rng;
  /** Active lemmings in release order; compacted in place at the end of each tick. */
  private readonly active: Lemming[] = [];
  private readonly skillCounts: Record<SkillId, number>;
  private readonly cooldowns: number[];
  private events: GameEvent[] = [];
  private currentTick = 0;
  private nextLemmingId = 0;
  private released = 0;
  private savedCount = 0;
  private deadCount = 0;
  private rate: number;
  private timeLeft: number;
  private isNuking = false;
  private result: LevelOutcome | null = null;
  /** Ticks the relaxed clock has run past 0:00. */
  private overtime = 0;
  private readonly ctx: MutableTickContext;

  /** Tick of the last spawn (release timeline); meaningless before the first spawn. */
  private lastSpawnTick = 0;
  /** Ids ever killed, so a death is counted and announced at most once. */
  private readonly deadIds = new Set<number>();
  /** Blockers whose fuse turned them into `ohno`: they keep their field until they explode. */
  private readonly blockerFuseIds = new Set<number>();
  /** Scratch list of field-casting blockers, rebuilt once per tick (no per-query scan). */
  private readonly fieldBlockers: Lemming[] = [];
  private goalReached = false;
  private goalImpossible = false;

  constructor(level: CompiledLevel, options: SessionOptions = {}) {
    this.level = level;
    this.terrain = level.terrain.clone();
    this.seed = options.seed ?? level.seed;
    this.relaxedTimer = options.relaxedTimer ?? false;
    this.rng = createRng(this.seed);
    this.skillCounts = { ...level.skills };
    this.cooldowns = level.hazards.map(() => 0);
    this.rate = level.releaseRate;
    this.timeLeft = level.timeLimitTicks;
    this.ctx = {
      tick: 0,
      level,
      terrain: this.terrain,
      rng: this.rng,
      lemmings: this.active,
      nuking: false,
      emit: (event) => this.events.push(event),
      blockerTurn: (x, y, selfId) => this.blockerTurn(x, y, selfId),
      kill: (lem, cause) => this.kill(lem, cause),
      save: (lem) => this.save(lem),
    };
  }

  // ─── GameView ──────────────────────────────────────────────────────────────────────────
  get tick(): number {
    return this.currentTick;
  }
  get status(): SessionStatus {
    return this.result ? 'ended' : 'running';
  }
  get outcome(): LevelOutcome | null {
    return this.result;
  }
  get lemmings(): readonly Readonly<Lemming>[] {
    return this.active;
  }
  get releaseRate(): number {
    return this.rate;
  }
  get timeLeftTicks(): number {
    return this.timeLeft;
  }
  get nuking(): boolean {
    return this.isNuking;
  }
  get skills(): SkillCounts {
    return this.skillCounts;
  }
  get hazardCooldowns(): readonly number[] {
    return this.cooldowns;
  }
  get overtimeTicks(): number {
    return this.overtime;
  }
  get counts(): GameCounts {
    return {
      total: this.level.lemmingCount,
      toRelease: this.isNuking ? 0 : this.level.lemmingCount - this.released,
      out: this.released - this.savedCount - this.deadCount,
      saved: this.savedCount,
      dead: this.deadCount,
      required: this.level.saveRequired,
    };
  }

  // ─── Driving the simulation ────────────────────────────────────────────────────────────

  /** Schedule a command for the start of step `atTick` (default: the next step). Replays. */
  enqueue(command: GameCommand, atTick: number = this.currentTick): void {
    this.commands.push(command, atTick);
  }

  /**
   * Apply a player command immediately — also while paused — and return its events
   * (e.g. `skill-assigned`) so the UI can give instant feedback. It is recorded at the current
   * tick, which is exactly equivalent to `enqueue(command)` followed by the next `step()`.
   */
  applyNow(command: GameCommand): readonly GameEvent[] {
    this.events = [];
    if (this.result) {
      if (command.type === 'assign-skill') this.pushAssignRejection(command.lemmingId, command.skill, { reason: 'level-ended' });
      return this.events;
    }
    this.ctx.tick = this.currentTick;
    this.commands.record(command, this.currentTick);
    this.apply(command);
    return this.events;
  }

  /**
   * Advance exactly one tick. Returns the events emitted during that tick.
   * Phase order (core-rules §F): due commands → release → each active lemming in release
   * order (tickFuse → stateTicks++ → state handler → blocker turn → triggers) → nuke →
   * compact → traps (cooldown −1) → clock → goal events → end check → tick++.
   */
  step(): readonly GameEvent[] {
    this.events = [];
    if (this.result) return this.events;
    this.ctx.tick = this.currentTick;

    for (const command of this.commands.takeDue(this.currentTick)) this.apply(command);
    this.releaseLemmings();

    // Field-casting blockers, computed once per tick (not per blockerTurn query).
    this.fieldBlockers.length = 0;
    for (const lem of this.active) {
      if (!lem.removed && this.isFieldCaster(lem)) this.fieldBlockers.push(lem);
    }

    for (const lem of this.active) {
      if (lem.removed) continue;
      const wasBlocking = lem.state === 'blocking';
      tickFuse(lem, this.ctx);
      if (wasBlocking && lem.state === 'ohno') this.blockerFuseIds.add(lem.id);
      if (lem.removed) continue;
      lem.stateTicks++; // before the handler: the first tick in any state sees 1
      STATE_HANDLERS[lem.state](lem, this.ctx);
      if (lem.removed) continue;
      if (BLOCKER_TURN_STATES.has(lem.state)) {
        const d = this.blockerTurn(lem.x, lem.y, lem.id);
        if (d !== 0) lem.dir = d;
      }
      if (!lem.removed) this.checkTriggers(lem);
    }
    this.advanceNuke();
    this.compact();
    this.advanceTraps();
    this.advanceClock();
    this.advanceGoals();
    this.checkEnd();
    this.currentTick++;
    return this.events;
  }

  snapshot(): GameSnapshot {
    return {
      levelId: this.level.id,
      tick: this.currentTick,
      status: this.status,
      outcome: this.result,
      releaseRate: this.rate,
      minReleaseRate: this.level.releaseRate,
      timeLeftTicks: this.timeLeft,
      timeLeftSeconds: Math.ceil(this.timeLeft / TICKS_PER_SECOND),
      nuking: this.isNuking,
      counts: this.counts,
      skills: { ...this.skillCounts },
      lemmings: this.active.map(({ removed: _removed, ...rest }) => ({ ...rest })),
      hazardCooldowns: [...this.cooldowns],
      overtimeTicks: this.overtime,
    };
  }

  /** Everything needed to reproduce this run from the start. */
  replay(): Replay {
    return { levelId: this.level.id, seed: this.seed, relaxedTimer: this.relaxedTimer, commands: [...this.commands.history()] };
  }

  lemmingById(id: number): Readonly<Lemming> | undefined {
    return this.active.find((lem) => lem.id === id);
  }

  /**
   * Pure preflight for `assign-skill`: no events, no mutation. Order: level ended → id
   * missing/removed → count 0 → the skill rule. Lets the UI predict a refusal (hover feedback)
   * without side effects, and is the single source of truth the private assign path uses too.
   */
  checkAssign(lemmingId: number, skill: SkillId): Rejection | null {
    if (this.result) return { reason: 'level-ended' };
    const lem = this.findActive(lemmingId);
    if (!lem) return { reason: 'no-lemming' };
    if (this.skillCounts[skill] <= 0) return { reason: 'none-left' };
    return SKILL_RULES[skill].rejectReason(lem, this.ctx);
  }

  // ─── Commands ──────────────────────────────────────────────────────────────────────────

  private apply(command: GameCommand): void {
    switch (command.type) {
      case 'assign-skill':
        this.assignSkill(command.lemmingId, command.skill);
        return;
      case 'set-release-rate':
        this.setRate(command.rate);
        return;
      case 'adjust-release-rate':
        this.setRate(this.rate + command.delta);
        return;
      case 'nuke':
        if (!this.isNuking) {
          this.isNuking = true;
          this.ctx.nuking = true;
          this.events.push({ type: 'nuke-started' });
        }
        return;
    }
  }

  private setRate(requested: number): void {
    const rate = Math.min(MAX_RELEASE_RATE, Math.max(this.level.releaseRate, Math.round(requested)));
    if (rate === this.rate) return;
    this.rate = rate;
    this.events.push({ type: 'release-rate-changed', rate });
  }

  private assignSkill(lemmingId: number, skill: SkillId): void {
    const rejection = this.checkAssign(lemmingId, skill);
    if (rejection) return this.pushAssignRejection(lemmingId, skill, rejection); // never consumes the skill
    const lem = this.findActive(lemmingId);
    if (!lem) return; // unreachable: checkAssign returns null only when the lemming was found
    SKILL_RULES[skill].assign(lem, this.ctx);
    this.skillCounts[skill]--;
    this.events.push({ type: 'skill-assigned', lemmingId: lem.id, skill });
  }

  private findActive(lemmingId: number): Lemming | undefined {
    return this.active.find((l) => l.id === lemmingId && !l.removed);
  }

  private pushAssignRejection(lemmingId: number, skill: SkillId, rejection: Rejection): void {
    const lem = this.findActive(lemmingId);
    const detail = rejection.detail;
    this.events.push({
      type: 'skill-rejected',
      lemmingId: lem ? lem.id : null,
      skill,
      reason: rejection.reason,
      ...(detail !== undefined ? { detail } : {}),
    });
  }

  // ─── Tick phases ────────────────────────────────────────────────────────────────────────

  /** Start timeline, then one lemming every releaseIntervalTicks(rate). */
  private releaseLemmings(): void {
    const tick = this.currentTick;
    if (tick === LETS_GO_TICK) this.events.push({ type: 'lets-go' });
    if (tick === ENTRANCE_OPEN_TICK) this.events.push({ type: 'entrance-opened' });
    if (this.isNuking) return; // nothing is released once nuking (no all-released either)
    if (this.released >= this.level.lemmingCount) return;

    const shouldSpawn =
      this.released === 0 ? tick === FIRST_SPAWN_TICK : tick - this.lastSpawnTick >= releaseIntervalTicks(this.rate);
    if (!shouldSpawn) return;

    const order = ENTRANCE_ORDER[Math.min(this.level.entrances.length, ENTRANCE_ORDER.length) - 1] ?? [0];
    const entranceIndex = order[this.released % order.length] ?? 0;
    const point = this.level.entrances[entranceIndex] ?? this.level.entrances[0];
    this.lastSpawnTick = tick;
    if (point) this.spawn(point.x, point.y);
    if (this.released >= this.level.lemmingCount) this.events.push({ type: 'all-released' });
  }

  /** While nuking, give the next lemming (release order) a BOMB_FUSE_TICKS fuse per tick. */
  private advanceNuke(): void {
    if (!this.isNuking) return;
    for (const lem of this.active) {
      if (lem.removed || lem.fuseTicks !== 0 || UNASSIGNABLE_STATES.has(lem.state)) continue;
      lem.fuseTicks = BOMB_FUSE_TICKS;
      break; // one per tick, the first eligible lemming in release order
    }
  }

  /** True while `lem` casts a blocker field: blocking, or ohno after having been a blocker. */
  private isFieldCaster(lem: Readonly<Lemming>): boolean {
    return lem.state === 'blocking' || (lem.state === 'ohno' && this.blockerFuseIds.has(lem.id));
  }

  /** Foot-pixel triggers for one lemming: exits, water, fire, traps, leaving the level. */
  private checkTriggers(lem: Lemming): void {
    if (!TRIGGER_SKIP_STATES.has(lem.state)) {
      const { x, y } = lem;

      // 1. Exit — never while falling or ohno.
      if (lem.state !== 'falling' && lem.state !== 'ohno') {
        for (const exit of this.level.exits) {
          if (inRect(x, y, exit.x + EXIT_TRIGGER.dx, exit.y + EXIT_TRIGGER.dy, EXIT_TRIGGER.w, EXIT_TRIGGER.h)) {
            setState(lem, 'exiting');
            return;
          }
        }
      }

      // 2–4. Water, then fire, then traps; within one kind, lowest hazard index first.
      for (const kind of HAZARD_KIND_ORDER) {
        for (let i = 0; i < this.level.hazards.length; i++) {
          const hazard = this.level.hazards[i];
          if (!hazard || hazard.kind !== kind) continue;
          if (!inRect(x, y, hazard.area.x, hazard.area.y, hazard.area.w, hazard.area.h)) continue;
          if (kind === 'water') {
            setState(lem, 'drowning');
            this.kill(lem, 'drown');
            return;
          }
          if (kind === 'fire') {
            setState(lem, 'burning');
            this.kill(lem, 'burn');
            return;
          }
          // Trap: only when armed; an unarmed trap ignores everyone (try the next one).
          if ((this.cooldowns[i] ?? 0) !== 0) continue;
          this.events.push({ type: 'trap-triggered', hazardIndex: i, lemmingId: lem.id });
          this.kill(lem, 'trap');
          this.cooldowns[i] = hazard.cooldownTicks;
          return;
        }
      }
    }

    // 5. Out of bounds — applies to every state, including a still-animating death.
    if (lem.y > this.level.height + OUT_OF_BOUNDS_MARGIN) this.kill(lem, 'out-of-bounds');
  }

  private advanceTraps(): void {
    for (let i = 0; i < this.cooldowns.length; i++) {
      const c = this.cooldowns[i] ?? 0;
      if (c > 0) this.cooldowns[i] = c - 1;
    }
  }

  private advanceClock(): void {
    if (this.timeLeft > 0) {
      this.timeLeft--;
      if (this.timeLeft % TICKS_PER_SECOND === 0) {
        const secondsLeft = this.timeLeft / TICKS_PER_SECOND;
        if (TIME_WARNINGS_SECONDS.includes(secondsLeft)) this.events.push({ type: 'time-low', secondsLeft });
      }
      if (this.timeLeft === 0 && this.relaxedTimer) this.events.push({ type: 'overtime-started' });
    } else if (this.relaxedTimer) {
      this.overtime++;
    }
  }

  /** `goal-reached`/`goal-impossible`, each fired at most once (core-rules §F). */
  private advanceGoals(): void {
    if (!this.goalReached && this.savedCount >= this.level.saveRequired) {
      this.goalReached = true;
      this.events.push({ type: 'goal-reached', saved: this.savedCount });
    }
    if (!this.goalReached && !this.goalImpossible) {
      let alive = 0;
      for (const lem of this.active) if (!this.deadIds.has(lem.id)) alive++;
      const notYetReleased = this.isNuking ? 0 : this.level.lemmingCount - this.released;
      if (this.savedCount + alive + notYetReleased < this.level.saveRequired) {
        this.goalImpossible = true;
        this.events.push({ type: 'goal-impossible' });
      }
    }
  }

  /** Decide win/lose: all lemmings resolved, or time up (lemmings still out are lost). */
  private checkEnd(): void {
    const allReleased = this.released >= this.level.lemmingCount;
    if ((allReleased || this.isNuking) && this.active.length === 0) {
      this.end('all-resolved');
      return;
    }
    // Auto-end: released everyone, not nuking, and every survivor is a spent blocker (LEVELS L11).
    if (allReleased && !this.isNuking && this.active.length >= 1) {
      let allSpentBlockers = true;
      for (const lem of this.active) {
        if (lem.state !== 'blocking' || lem.fuseTicks !== 0) {
          allSpentBlockers = false;
          break;
        }
      }
      if (allSpentBlockers) {
        this.end('all-resolved');
        return;
      }
    }
    if (this.timeLeft === 0 && !this.relaxedTimer) this.end('time-up');
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────────────────

  /**
   * Create a lemming at an entrance (used by releaseLemmings): a faller, facing right.
   * `protected` (not `private`): `tests/contracts.test.ts` subclasses GameSession to reach it
   * directly, bypassing the timed release path (core-lead).
   */
  protected spawn(x: number, y: number): Lemming {
    const lem: Lemming = {
      id: this.nextLemmingId++,
      x,
      y,
      dir: 1,
      state: 'falling',
      stateTicks: 0,
      fallDistance: FALL_COUNTER_STEP,
      isClimber: false,
      isFloater: false,
      fuseTicks: 0,
      bricksLeft: 0,
      removed: false,
    };
    this.active.push(lem);
    this.released++;
    this.events.push({ type: 'lemming-spawned', lemmingId: lem.id, x, y });
    return lem;
  }

  private end(reason: LevelOutcome['reason']): void {
    if (this.result) return;
    this.result = {
      won: this.savedCount >= this.level.saveRequired,
      saved: this.savedCount,
      required: this.level.saveRequired,
      total: this.level.lemmingCount,
      reason,
      // Steps run including this one: currentTick hasn't been incremented yet at this point.
      ticks: this.currentTick + 1,
      overtimeTicks: this.overtime,
    };
    this.events.push({ type: 'level-ended', outcome: this.result });
  }

  /** Drop removed lemmings, keeping release order and the same array (ctx.lemmings). */
  private compact(): void {
    let w = 0;
    for (const lem of this.active) {
      if (lem.removed) {
        this.blockerFuseIds.delete(lem.id);
        continue;
      }
      this.active[w++] = lem;
    }
    this.active.length = w;
  }

  /**
   * Blocker field at (x, y): the direction a lemming there is turned to, from the tick's
   * precomputed list of field-casting blockers (blocking, or ohno after having been one).
   */
  private blockerTurn(x: number, y: number, selfId: number): Direction | 0 {
    for (const b of this.fieldBlockers) {
      if (b.id === selfId) continue;
      if (y < b.y - 6 || y > b.y + 5) continue;
      const dx = x - b.x;
      const adx = dx < 0 ? -dx : dx;
      if (adx >= 1 && adx <= BLOCKER_REACH) return dx > 0 ? 1 : -1;
    }
    return 0;
  }

  /**
   * Mark `lem` dead: counted and announced at most once (`deadIds`), whichever cause got there
   * first. Left in place while its state is an animated death (splatting/drowning/burning) —
   * the terminal handler removes it silently once the animation ends; otherwise removed now.
   */
  private kill(lem: Lemming, cause: DeathCause): void {
    if (!this.deadIds.has(lem.id)) {
      this.deadIds.add(lem.id);
      this.deadCount++;
      this.events.push({ type: 'lemming-died', lemmingId: lem.id, cause });
    }
    if (lem.state === 'splatting' || lem.state === 'drowning' || lem.state === 'burning') return;
    lem.removed = true;
  }

  private save(lem: Lemming): void {
    if (lem.removed) return;
    lem.removed = true;
    this.savedCount++;
    this.events.push({ type: 'lemming-exited', lemmingId: lem.id });
  }
}

/** All skill ids with a count of zero — handy for tests and level defaults. */
export function emptySkills(): Record<SkillId, number> {
  return Object.fromEntries(SKILL_IDS.map((id) => [id, 0])) as Record<SkillId, number>;
}
