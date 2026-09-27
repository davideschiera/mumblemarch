import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Material, Terrain } from '../src/core/terrain.ts';

test('set/get round-trip and out-of-bounds reads as empty', () => {
  const t = new Terrain(10, 5);
  t.set(3, 2, Material.Earth, 4);
  assert.equal(t.get(3, 2), Material.Earth);
  assert.equal(t.color[2 * 10 + 3], 4);
  assert.equal(t.isSolid(3, 2), true);
  assert.equal(t.get(-1, 0), Material.Empty);
  assert.equal(t.get(10, 0), Material.Empty);
  assert.equal(t.get(0, 5), Material.Empty);
  t.set(99, 99, Material.Earth, 1); // ignored, no throw
});

test('steel cannot be removed; earth can', () => {
  const t = new Terrain(4, 4);
  t.set(0, 0, Material.Steel, 1);
  t.set(1, 0, Material.Earth, 1);
  assert.equal(t.remove(0, 0, 0), false);
  assert.equal(t.get(0, 0), Material.Steel);
  assert.equal(t.remove(1, 0, 1), true);
  assert.equal(t.get(1, 0), Material.Empty);
  assert.equal(t.color[1], 0);
});

test('one-way earth is removable only in its direction (or direction-less)', () => {
  const t = new Terrain(4, 1);
  t.set(0, 0, Material.OneWayRight, 1);
  assert.equal(t.canRemove(0, 0, -1), false);
  assert.equal(t.canRemove(0, 0, 1), true);
  assert.equal(t.canRemove(0, 0, 0), true);
  t.set(1, 0, Material.OneWayLeft, 1);
  assert.equal(t.canRemove(1, 0, 1), false);
  assert.equal(t.canRemove(1, 0, -1), true);
});

test('dirty rectangle covers exactly the changed pixels, then resets', () => {
  const t = new Terrain(20, 20);
  assert.equal(t.takeDirty(), null);
  t.set(2, 3, Material.Earth, 1);
  t.set(5, 7, Material.Earth, 1);
  assert.deepEqual(t.takeDirty(), { x: 2, y: 3, w: 4, h: 5 });
  assert.equal(t.takeDirty(), null);
});

test('clone is independent', () => {
  const t = new Terrain(3, 3);
  t.set(1, 1, Material.Earth, 2);
  const c = t.clone();
  c.remove(1, 1, 0);
  assert.equal(t.get(1, 1), Material.Earth);
  assert.equal(c.get(1, 1), Material.Empty);
});
