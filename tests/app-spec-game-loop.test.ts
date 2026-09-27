/**
 * VALIDATOR (ev1c-logic) spec tests for DESIGN §6.4.2–§6.4.3: the fixed-timestep GameLoop (paused
 * loop runs no ticks; FF ×3 / game speed scale ticks), the frame-step/RR hold-repeat timings, and
 * fast-forward's loop-speed formula. A fake FrameScheduler drives the loop deterministically.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameLoop, type FrameScheduler } from '../src/app/game-loop.ts';
import { TICK_MS } from '../src/core/constants.ts';
import { HoldRepeater } from '../src/app/game/hold-repeat.ts';
import { loopSpeed } from '../src/app/game/rules.ts';
import {
  FAST_FORWARD_SPEED,
  FRAME_STEP_REPEAT_DELAY_MS,
  FRAME_STEP_REPEAT_MS,
} from '../src/app/config.ts';

/** A scheduler that never fires on its own: the test calls `fire(t)` to run one frame. */
class FakeScheduler implements FrameScheduler {
  private next = 1;
  private callback: ((t: number) => void) | null = null;
  request(cb: (t: number) => void): number {
    this.callback = cb;
    return this.next++;
  }
  cancel(): void {
    this.callback = null;
  }
  fire(timeMs: number): void {
    const cb = this.callback;
    this.callback = null; // onFrame sets handle=null itself; this just mirrors "consumed"
    cb?.(timeMs);
  }
}

function makeLoop() {
  const scheduler = new FakeScheduler();
  let ticks = 0;
  let frames = 0;
  const loop = new GameLoop(
    {
      tick: () => {
        ticks++;
      },
      frame: () => {
        frames++;
      },
      render: () => {},
    },
    scheduler,
  );
  return { loop, scheduler, ticks: () => ticks, frames: () => frames };
}

test('paused loop runs no ticks (frame still runs)', () => {
  const { loop, scheduler, ticks, frames } = makeLoop();
  loop.paused = true;
  loop.start();
  scheduler.fire(0);
  scheduler.fire(TICK_MS * 5); // well over one tick's worth of elapsed time
  assert.equal(ticks(), 0, 'no ticks while paused');
  assert.equal(frames() > 0, true, 'frame() still runs while paused (camera can still scroll)');
});

test('one tick advances exactly one TICK_MS of accumulated time at normal speed', () => {
  const { loop, scheduler, ticks } = makeLoop();
  loop.start();
  scheduler.fire(0); // establishes lastTime, elapsed=0, 0 ticks
  scheduler.fire(TICK_MS); // exactly one tick's worth
  assert.equal(ticks(), 1);
});

test('fast-forward ×3: speed multiplies simulated time, so 3× the ticks run for the same elapsed ms', () => {
  const { loop: normalLoop, scheduler: s1, ticks: t1 } = makeLoop();
  normalLoop.speed = loopSpeed(false, 1);
  normalLoop.start();
  s1.fire(0);
  s1.fire(TICK_MS * 3);
  const normalTicks = t1();

  const { loop: ffLoop, scheduler: s2, ticks: t2 } = makeLoop();
  ffLoop.speed = loopSpeed(true, 1);
  assert.equal(ffLoop.speed, FAST_FORWARD_SPEED);
  ffLoop.start();
  s2.fire(0);
  s2.fire(TICK_MS * 3);
  const ffTicks = t2();

  assert.equal(ffTicks, normalTicks * FAST_FORWARD_SPEED);
});

test('game speed 0.75/0.5 scales ticks down (and never costs extra clock time — it just runs slower)', () => {
  assert.equal(loopSpeed(false, 0.75), 0.75);
  assert.equal(loopSpeed(false, 0.5), 0.5);
  assert.equal(loopSpeed(true, 0.5), FAST_FORWARD_SPEED * 0.5);
});

test('stepTicks(n) runs exactly n ticks regardless of pause (frame-step)', () => {
  const { loop, ticks } = makeLoop();
  loop.paused = true;
  loop.stepTicks(1);
  assert.equal(ticks(), 1);
  loop.stepTicks(17); // Shift+. = 17 ticks (1 game second)
  assert.equal(ticks(), 18);
});

test('hold-repeat: frame-step repeats after 300 ms at 10 steps/s (100 ms interval)', () => {
  assert.equal(FRAME_STEP_REPEAT_DELAY_MS, 300);
  assert.equal(FRAME_STEP_REPEAT_MS, 100);
  const hr = new HoldRepeater(FRAME_STEP_REPEAT_DELAY_MS, FRAME_STEP_REPEAT_MS);
  hr.press();
  assert.equal(hr.advance(299), 0);
  assert.equal(hr.advance(1), 1); // first repeat at 300ms
  assert.equal(hr.advance(100), 1); // one more at 400ms (10/s)
});
