/**
 * Spec-derived tests for `render/camera.ts` against DESIGN.md §7.4 (camera jumps ease 200ms
 * ease-out) and RENDER-PLAN.md §3.5 (exact easing formula + clamping). Independent validation
 * (render-v1a).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Camera, VIEW_HEIGHT, VIEW_WIDTH } from '../src/render/camera.ts';

test('VIEW_WIDTH/VIEW_HEIGHT match DESIGN §5.1 (400×160 world px)', () => {
  assert.equal(VIEW_WIDTH, 400);
  assert.equal(VIEW_HEIGHT, 160);
});

test('instant centerOn clamps x to [0, levelWidth − viewW]', () => {
  const cam = new Camera();
  cam.setLevelSize(1000, 160);
  cam.centerOn(2000, 80); // way past the right edge
  assert.equal(cam.x, 1000 - VIEW_WIDTH); // 600
  cam.centerOn(-500, 80); // way past the left edge
  assert.equal(cam.x, 0);
  cam.centerOn(500, 80); // dead centre, no clamping needed
  assert.equal(cam.x, 500 - VIEW_WIDTH / 2); // 300
});

test('instant centerOn clamps y the same way, and a level narrower than the view clamps to 0', () => {
  const cam = new Camera();
  cam.setLevelSize(1000, 160);
  cam.centerOn(500, -1000);
  assert.equal(cam.y, 0);
  cam.centerOn(500, 10_000);
  assert.equal(cam.y, Math.max(0, 160 - VIEW_HEIGHT)); // 0, since level height == view height
  const narrow = new Camera();
  narrow.setLevelSize(100, 50); // smaller than the view in both axes
  narrow.centerOn(50, 25);
  assert.equal(narrow.x, 0);
  assert.equal(narrow.y, 0);
});

test('centerOn with no y defaults to the level\'s vertical centre', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  cam.centerOn(500);
  assert.equal(cam.y, 0); // levelH/2 = 80, view centred on 80 with viewH 160 → clamps to 0
});

test('animated centerOn eases from the current position over exactly 200ms (ease-out cubic)', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  assert.equal(cam.x, 0);

  cam.centerOn(1000, 80, { animate: true }); // target = clamp(round(1000 - 200)) = 800
  assert.equal(cam.animating, true);

  cam.update(100); // halfway through the 200ms window
  assert.equal(cam.animating, true);
  assert.ok(Number.isInteger(cam.x), 'x is rounded to an integer at every step');
  // Ease-out cubic 1 − (1 − 0.5)³ = 0.875 ≫ 0.5 → more than half the distance is covered by 100ms.
  assert.ok(cam.x > 400, `expected > 400 (half of 800) at t=100ms, got ${cam.x}`);
  assert.ok(cam.x <= 800);

  cam.update(100); // total elapsed = 200ms → finished
  assert.equal(cam.x, 800);
  assert.equal(cam.animating, false);
});

test('a new centerOn mid-flight retargets the easing from wherever the camera currently is', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  cam.centerOn(1000, 80, { animate: true }); // target 800
  cam.update(50); // partway there
  const midX = cam.x;
  assert.ok(midX > 0 && midX < 800);

  cam.centerOn(200, 80, { animate: true }); // retarget to a much smaller x while still easing
  assert.equal(cam.animating, true);
  cam.update(200); // finishes the new animation
  assert.equal(cam.x, 0); // clamp(round(200-200)) = 0
  assert.equal(cam.animating, false);
});

test('scrollBy cancels an in-flight animation and clamps the result', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  cam.centerOn(1000, 80, { animate: true });
  cam.update(50);
  const midX = cam.x;
  assert.equal(cam.animating, true);

  cam.scrollBy(10);
  assert.equal(cam.animating, false);
  assert.equal(cam.x, midX + 10);

  // Further update() calls are a no-op once cancelled.
  cam.update(1000);
  assert.equal(cam.x, midX + 10);
});

test('setLevelSize also cancels an in-flight animation', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  cam.centerOn(1000, 80, { animate: true });
  assert.equal(cam.animating, true);
  cam.setLevelSize(2000, 160);
  assert.equal(cam.animating, false);
});

test('an instant (non-animated) centerOn cancels any in-flight animation immediately', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 160);
  cam.centerOn(1000, 80, { animate: true });
  assert.equal(cam.animating, true);
  cam.centerOn(300, 80); // no {animate: true} → instant cut
  assert.equal(cam.animating, false);
  assert.equal(cam.x, 300 - VIEW_WIDTH / 2); // 100
});

test('levelWidth getter reflects setLevelSize', () => {
  const cam = new Camera();
  cam.setLevelSize(1234, 160);
  assert.equal(cam.levelWidth, 1234);
  cam.setLevelSize(50, 50);
  assert.equal(cam.levelWidth, 50);
});

test('toWorld converts a view pixel to a world pixel using the current camera offset', () => {
  const cam = new Camera();
  cam.setLevelSize(2000, 500); // taller than the view so vertical scroll isn't clamped to 0
  cam.scrollBy(50, 5);
  assert.deepEqual(cam.toWorld(10, 20), { x: 60, y: 25 });
});
