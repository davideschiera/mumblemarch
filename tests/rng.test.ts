import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRng, hashString } from '../src/core/rng.ts';

test('same seed → same sequence', () => {
  const a = createRng(42);
  const b = createRng(42);
  const seqA = Array.from({ length: 100 }, () => a.next());
  const seqB = Array.from({ length: 100 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test('different seeds diverge', () => {
  assert.notEqual(createRng(1).next(), createRng(2).next());
});

test('next() is in [0, 1) and int() is inclusive', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const f = rng.next();
    assert.ok(f >= 0 && f < 1);
    const n = rng.int(3, 5);
    assert.ok(n >= 3 && n <= 5 && Number.isInteger(n));
  }
});

test('state can resume a sequence', () => {
  const rng = createRng(99);
  rng.next();
  const resumed = createRng(rng.state);
  assert.equal(resumed.next(), rng.next());
});

test('hashString is stable', () => {
  assert.equal(hashString('first-steps'), hashString('first-steps'));
  assert.notEqual(hashString('a'), hashString('b'));
});
