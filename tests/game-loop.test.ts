import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameLoop, type FrameScheduler } from '../src/app/game-loop.ts';

/** Manual frame scheduler: `advance(ms)` fires one frame `ms` after the previous one. */
function fakeScheduler(): FrameScheduler & { advance(ms: number): void } {
  let now = 0;
  let pending: ((t: number) => void) | null = null;
  return {
    request: (cb) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
    advance(ms) {
      now += ms;
      const cb = pending;
      pending = null;
      cb?.(now);
    },
  };
}

test('fixed timestep: ticks depend on elapsed time, not frame count', () => {
  const scheduler = fakeScheduler();
  let ticks = 0;
  let renders = 0;
  const loop = new GameLoop({ tick: () => ticks++, frame: () => {}, render: () => renders++ }, scheduler, 50);
  loop.start();
  scheduler.advance(0); // first frame establishes the time base
  for (let i = 0; i < 10; i++) scheduler.advance(20); // 200 ms in 10 frames
  assert.equal(ticks, 4);
  assert.equal(renders, 11);
});

test('pause stops ticks but keeps rendering; speed multiplies time', () => {
  const scheduler = fakeScheduler();
  let ticks = 0;
  const loop = new GameLoop({ tick: () => ticks++, frame: () => {}, render: () => {} }, scheduler, 50);
  loop.start();
  scheduler.advance(0);
  loop.paused = true;
  scheduler.advance(100);
  assert.equal(ticks, 0);
  loop.paused = false;
  loop.speed = 3;
  scheduler.advance(100);
  assert.equal(ticks, 6);
});

test('speed 0.5 (DESIGN §6.4.3 Game speed 50%) halves the tick rate', () => {
  const scheduler = fakeScheduler();
  let ticks = 0;
  const loop = new GameLoop({ tick: () => ticks++, frame: () => {}, render: () => {} }, scheduler, 50);
  loop.speed = 0.5;
  loop.start();
  scheduler.advance(0);
  scheduler.advance(200); // 200 ms × 0.5 = 100 ms of sim time = 2 ticks at 50 ms/tick
  assert.equal(ticks, 2);
});

test('stepTicks runs exactly n ticks even while paused', () => {
  let ticks = 0;
  const loop = new GameLoop({ tick: () => ticks++, frame: () => {}, render: () => {} }, fakeScheduler(), 50);
  loop.paused = true;
  loop.stepTicks(5);
  assert.equal(ticks, 5);
});

test('stop() from inside a tick ends the loop for good (no zombie frames)', () => {
  const scheduler = fakeScheduler();
  let ticks = 0;
  let renders = 0;
  const loop: GameLoop = new GameLoop(
    {
      tick: () => {
        ticks++;
        loop.stop();
      },
      frame: () => {},
      render: () => renders++,
    },
    scheduler,
    50,
  );
  loop.start();
  scheduler.advance(0);
  scheduler.advance(500);
  scheduler.advance(500);
  assert.equal(ticks, 1);
  assert.equal(renders, 1);
  assert.equal(loop.running, false);
});

test('frame() runs every frame with elapsed time, even while paused', () => {
  const scheduler = fakeScheduler();
  const elapsed: number[] = [];
  const loop = new GameLoop({ tick: () => {}, frame: (ms) => elapsed.push(ms), render: () => {} }, scheduler, 50);
  loop.paused = true;
  loop.start();
  scheduler.advance(0);
  scheduler.advance(16);
  assert.deepEqual(elapsed, [0, 16]);
});
