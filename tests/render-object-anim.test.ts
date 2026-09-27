/**
 * Spec-derived tests for `render/object-anim.ts` (DESIGN §2.2, §3.5, §4.6, §4.7, §7.4;
 * DESIGN-APPENDIX App. E.2 V7; RENDER-PLAN §4).
 *
 * Expected values below are computed independently from the spec formulas/constants, not by
 * calling the functions under test with different inputs and trusting their own logic.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ambientTick,
  ambientFrame,
  hatchFrame,
  hatchCrestLit,
  trapTriggerFrame,
  exitGlowLit,
  decorDots,
  decorDotVisible,
} from '../src/render/object-anim.ts';
import { LETS_GO_TICK, ENTRANCE_OPEN_TICK, TICKS_PER_SECOND } from '../src/core/constants.ts';

const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

test('sanity: LETS_GO_TICK=15, ENTRANCE_OPEN_TICK=35, TICKS_PER_SECOND=17 (RENDER-PLAN §4 contract)', () => {
  assert.equal(LETS_GO_TICK, 15);
  assert.equal(ENTRANCE_OPEN_TICK, 35);
  assert.equal(TICKS_PER_SECOND, 17);
});

// --- ambientTick / ambientFrame (App. E.2 V7; DESIGN §2.2, §7.4) ---

test('ambientTick: 0 under reduced motion, for any wall time', () => {
  for (const ms of [0, 1, 58.8, 235.3, 941.2, 100000]) {
    assert.equal(ambientTick(ms, true), 0, `ms=${ms}`);
  }
});

test('ambientTick: floor(timeMs / (1000/17)) when motion is not reduced', () => {
  for (const ms of [0, 1, 58.8, 100, 235.3, 941.2, 5000]) {
    assert.equal(ambientTick(ms, false), Math.floor(ms / MS_PER_TICK), `ms=${ms}`);
  }
});

test('ambientFrame: 0 under reduced motion, for any time/ticksPerFrame/frameCount', () => {
  for (const ms of [0, 500, 100000]) {
    assert.equal(ambientFrame(ms, 4, 4, true), 0, `ms=${ms} tpf=4`);
    assert.equal(ambientFrame(ms, 8, 2, true), 0, `ms=${ms} tpf=8`);
  }
});

test('ambientFrame: floor(timeMs/(1000/17)/tpf) % n, per the RENDER-PLAN worked examples', () => {
  // tpf=4, n=4: 0ms -> tick 0 -> frame 0; 235.3ms -> tick 4 -> frame 1; 941.2ms -> tick 16 -> frame 0 (wraps).
  assert.equal(ambientFrame(0, 4, 4, false), 0);
  assert.equal(ambientFrame(235.3, 4, 4, false), 1);
  assert.equal(ambientFrame(941.2, 4, 4, false), 0);
});

test('ambientFrame: general formula holds for varied ticksPerFrame/frameCount', () => {
  const cases: readonly (readonly [number, number, number])[] = [
    [100, 3, 5],
    [1000, 8, 2],
    [5000, 4, 4],
    [58.8235294117647, 1, 3],
  ];
  for (const [ms, tpf, n] of cases) {
    const expected = Math.floor(Math.floor(ms / MS_PER_TICK) / tpf) % n;
    assert.equal(ambientFrame(ms, tpf, n, false), expected, `ms=${ms},tpf=${tpf},n=${n}`);
  }
});

// --- hatchFrame / hatchCrestLit (DESIGN §4.7, §7.4) ---

test('hatchFrame: closed (0) before ENTRANCE_OPEN_TICK', () => {
  for (const tick of [0, 1, 20, ENTRANCE_OPEN_TICK - 1]) {
    assert.equal(hatchFrame(tick, false, false), 0, `tick=${tick}`);
  }
});

test('hatchFrame: opening frames 1..3, 3 ticks per frame, from ENTRANCE_OPEN_TICK, then holds on 3', () => {
  const cases: [number, number][] = [
    [ENTRANCE_OPEN_TICK, 1],
    [ENTRANCE_OPEN_TICK + 1, 1],
    [ENTRANCE_OPEN_TICK + 2, 1],
    [ENTRANCE_OPEN_TICK + 3, 2],
    [ENTRANCE_OPEN_TICK + 4, 2],
    [ENTRANCE_OPEN_TICK + 5, 2],
    [ENTRANCE_OPEN_TICK + 6, 3],
    [ENTRANCE_OPEN_TICK + 7, 3],
    [ENTRANCE_OPEN_TICK + 65, 3],
  ];
  for (const [tick, frame] of cases) {
    assert.equal(hatchFrame(tick, false, false), frame, `tick=${tick}`);
  }
});

test('hatchFrame: nuking forces closed (0) at every tick', () => {
  for (const tick of [0, ENTRANCE_OPEN_TICK, ENTRANCE_OPEN_TICK + 100]) {
    assert.equal(hatchFrame(tick, false, true), 0, `tick=${tick}`);
    assert.equal(hatchFrame(tick, true, true), 0, `tick=${tick} (reduced+nuking)`);
  }
});

test('hatchFrame: reduced motion jumps straight from closed to fully open at ENTRANCE_OPEN_TICK', () => {
  for (const tick of [0, 20, ENTRANCE_OPEN_TICK - 1]) {
    assert.equal(hatchFrame(tick, true, false), 0, `tick=${tick}`);
  }
  for (const tick of [ENTRANCE_OPEN_TICK, ENTRANCE_OPEN_TICK + 1, ENTRANCE_OPEN_TICK + 50]) {
    assert.equal(hatchFrame(tick, true, false), 3, `tick=${tick}`);
  }
});

test('hatchCrestLit: false before LETS_GO_TICK (14), true from LETS_GO_TICK (15) onward', () => {
  assert.equal(hatchCrestLit(0), false);
  assert.equal(hatchCrestLit(LETS_GO_TICK - 1), false);
  assert.equal(hatchCrestLit(LETS_GO_TICK), true);
  assert.equal(hatchCrestLit(LETS_GO_TICK + 1), true);
});

// --- trapTriggerFrame (DESIGN §4.6: trigger[0],[1],[1],[0] x 3 ticks, then idle) ---

test('trapTriggerFrame: [0,1,1,0] burst pattern, 3 ticks per step, over ages 0..11', () => {
  const cases: [number, number][] = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 1],
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 1],
    [9, 0],
    [10, 0],
    [11, 0],
  ];
  for (const [age, frame] of cases) {
    assert.equal(trapTriggerFrame(age), frame, `age=${age}`);
  }
});

test('trapTriggerFrame: -1 once the 12-tick burst has finished, and for negative ages', () => {
  for (const age of [12, 13, 50, -1, -2, -100]) {
    assert.equal(trapTriggerFrame(age), -1, `age=${age}`);
  }
});

// --- exitGlowLit (DESIGN §3.5 "Exit": glow all-lit for 4 ticks) ---

test('exitGlowLit: lit for exactly ages 0..3 after lastExitTick, false at 4 and before it fired', () => {
  const last = 100;
  for (const age of [0, 1, 2, 3]) {
    assert.equal(exitGlowLit(last + age, last), true, `age=${age}`);
  }
  assert.equal(exitGlowLit(last + 4, last), false);
  assert.equal(exitGlowLit(last + 100, last), false);
  assert.equal(exitGlowLit(last - 1, last), false);
  assert.equal(exitGlowLit(0, 0), true);
});

// --- decorDots (DESIGN §2.2: background decor <= 30 dots per 400px of width) ---

test('decorDots: deterministic for the same seed', () => {
  const a = decorDots(42, 400, 160);
  const b = decorDots(42, 400, 160);
  assert.deepEqual(Array.from(a), Array.from(b));
});

test('decorDots: a different seed produces a different layout', () => {
  const a = decorDots(1, 400, 160);
  const b = decorDots(2, 400, 160);
  assert.notDeepEqual(Array.from(a), Array.from(b));
});

test('decorDots: count = floor(26*width/400) and never exceeds 30 per 400px of width', () => {
  for (const width of [400, 480, 1600]) {
    const dots = decorDots(7, width, 160);
    const count = dots.length / 2;
    assert.equal(count, Math.floor((26 * width) / 400), `width=${width}`);
    assert.ok(count <= (30 * width) / 400 + 1e-9, `width=${width}: density ${count} exceeds 30/400px`);
  }
});

test('decorDots: every dot lies within [0,width) x [0, floor(height*0.6))', () => {
  const width = 480;
  const height = 200;
  const dots = decorDots(3, width, height);
  const maxY = Math.floor(height * 0.6);
  const n = dots.length / 2;
  for (let k = 0; k < n; k++) {
    const x = dots[k * 2] ?? NaN;
    const y = dots[k * 2 + 1] ?? NaN;
    assert.ok(x >= 0 && x < width, `k=${k} x=${x}`);
    assert.ok(y >= 0 && y < maxY, `k=${k} y=${y}`);
  }
});

test('decorDotVisible: twinkle rule (floor(ambient/6)+k) % 5 !== 0', () => {
  for (const ambient of [0, 1, 5, 6, 7, 29, 30, 1000]) {
    for (let k = 0; k < 20; k++) {
      const expected = (Math.floor(ambient / 6) + k) % 5 !== 0;
      assert.equal(decorDotVisible(k, ambient), expected, `k=${k},ambient=${ambient}`);
    }
  }
});

test('decorDotVisible: at most 1 of every 5 consecutive k is hidden, for any ambient value', () => {
  for (const ambient of [0, 3, 6, 42, 100, 12345]) {
    for (let start = 0; start < 20; start++) {
      let hidden = 0;
      for (let k = start; k < start + 5; k++) {
        if (!decorDotVisible(k, ambient)) hidden++;
      }
      assert.ok(hidden <= 1, `ambient=${ambient},start=${start},hidden=${hidden}`);
    }
  }
});
