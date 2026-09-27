/**
 * Fixed-timestep loop: the simulation advances in exact TICK_MS steps (deterministic), while
 * rendering runs once per animation frame. Pause stops ticks but keeps rendering (camera can
 * still scroll); `speed` multiplies simulated time (fast-forward).
 *
 * DOM-free: the frame scheduler is injected (requestAnimationFrame in the app, a fake in tests).
 */
import { TICK_MS } from '../core/constants.ts';
import { MAX_TICKS_PER_FRAME } from './config.ts';

export interface FrameScheduler {
  request(callback: (timeMs: number) => void): number;
  cancel(handle: number): void;
}

export interface LoopCallbacks {
  /** One fixed simulation step. */
  tick(): void;
  /** Once per animation frame, also while paused: real-time app logic (held keys, scrolling). */
  frame(elapsedMs: number): void;
  /** Once per animation frame, after `frame` and any ticks. */
  render(timeMs: number): void;
}

export class GameLoop {
  paused = false;
  speed = 1;
  private readonly callbacks: LoopCallbacks;
  private readonly scheduler: FrameScheduler;
  private readonly tickMs: number;
  private accumulator = 0;
  private lastTime: number | null = null;
  private handle: number | null = null;
  private active = false;

  constructor(callbacks: LoopCallbacks, scheduler: FrameScheduler, tickMs: number = TICK_MS) {
    this.callbacks = callbacks;
    this.scheduler = scheduler;
    this.tickMs = tickMs;
  }

  get running(): boolean {
    return this.active;
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.lastTime = null;
    if (this.handle === null) this.handle = this.scheduler.request(this.onFrame);
  }

  /** Safe to call from inside tick/frame/render: no further frame will run. */
  stop(): void {
    this.active = false;
    if (this.handle !== null) this.scheduler.cancel(this.handle);
    this.handle = null;
  }

  /** Run exactly `n` ticks now, regardless of pause (frame-advance, tests, test hook). */
  stepTicks(n: number): void {
    for (let i = 0; i < n; i++) this.callbacks.tick();
  }

  private readonly onFrame = (timeMs: number): void => {
    this.handle = null; // this request has fired
    if (!this.active) return;
    const elapsed = this.lastTime === null ? 0 : Math.min(timeMs - this.lastTime, 250);
    this.lastTime = timeMs;
    this.callbacks.frame(elapsed);
    if (!this.paused && this.active) {
      this.accumulator += elapsed * this.speed;
      let ticks = 0;
      while (this.active && this.accumulator >= this.tickMs && ticks < MAX_TICKS_PER_FRAME) {
        this.callbacks.tick();
        this.accumulator -= this.tickMs;
        ticks++;
      }
      if (ticks === MAX_TICKS_PER_FRAME) this.accumulator = 0; // drop time we cannot catch up on
    }
    if (!this.active) return;
    this.callbacks.render(timeMs);
    // Re-arm unless stopped (or restarted, which already requested a frame) meanwhile.
    if (this.active && this.handle === null) this.handle = this.scheduler.request(this.onFrame);
  };
}
