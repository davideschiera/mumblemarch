/**
 * Proves the shipped campaign (src/levels/data/*.ts, registered in registry.ts) is a faithful
 * port of docs/design/LEVELS.md, whose single source of truth is generated alongside
 * docs/design/mockups/levels-data.js (window.MUMBLE_LEVELS) — same 12 LevelDef objects twice,
 * so they must agree. Depends only on level data + the compiler's pure validate/compile; no
 * physics session.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { compileLevel, validateLevel } from '../src/levels/compiler.ts';
import type { LevelDef, TerrainPrimitive } from '../src/levels/format.ts';
import { getLevel, LEVELS, nextLevel, TIERS } from '../src/levels/registry.ts';
import { STAMPS } from '../src/levels/stamps.ts';
import { THEME_IDS } from '../src/levels/themes.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(root, 'docs/design/mockups/levels-data.js');
const source = readFileSync(sourcePath, 'utf8');
const sandbox: { window: Record<string, unknown> } = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: sourcePath });
const MUMBLE_LEVELS = sandbox.window['MUMBLE_LEVELS'] as readonly LevelDef[];

/**
 * Values parsed inside the vm sandbox live in a different realm (their own Object/Array
 * prototypes), so a strict deep-equal would fail on prototype identity alone even when every
 * enumerable property matches. A JSON round-trip normalises both sides to ordinary same-realm
 * values before comparing their actual content (same technique as tests/art-port.test.ts).
 */
const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test('levels-data.js loads and sets window.MUMBLE_LEVELS with 12 entries', () => {
  assert.ok(Array.isArray(MUMBLE_LEVELS));
  assert.equal(MUMBLE_LEVELS.length, 12);
});

test('LEVELS has exactly 12 entries, in the same order as MUMBLE_LEVELS', () => {
  assert.equal(LEVELS.length, 12);
  assert.deepEqual(
    LEVELS.map((l) => l.id),
    plain(MUMBLE_LEVELS.map((l) => l.id)),
  );
});

test('every registered LevelDef deep-equals its docs/design source entry', () => {
  assert.equal(LEVELS.length, MUMBLE_LEVELS.length);
  for (let i = 0; i < LEVELS.length; i++) {
    assert.deepEqual(plain(LEVELS[i]), plain(MUMBLE_LEVELS[i]), `mismatch at index ${i}`);
  }
});

test('every level tier exists in TIERS, and tiers are non-decreasing in campaign order', () => {
  const tierIds = new Set(TIERS.map((t) => t.id));
  let prev = -Infinity;
  for (const level of LEVELS) {
    assert.ok(tierIds.has(level.tier), `${level.id}: tier ${level.tier} not in TIERS`);
    assert.ok(level.tier >= prev, `${level.id}: tier ${level.tier} decreased from ${prev}`);
    prev = level.tier;
  }
});

test('every level theme is a known ThemeId', () => {
  for (const level of LEVELS) {
    assert.ok(
      (THEME_IDS as readonly string[]).includes(level.theme),
      `${level.id}: theme '${level.theme}' not in THEME_IDS`,
    );
  }
});

test('getLevel finds every registered level by id', () => {
  for (const level of LEVELS) {
    assert.equal(getLevel(level.id), level);
  }
  assert.equal(getLevel('does-not-exist'), undefined);
});

test('nextLevel walks the campaign in order; the last level has no next', () => {
  for (let i = 0; i < LEVELS.length - 1; i++) {
    assert.equal(nextLevel(LEVELS[i]!.id), LEVELS[i + 1]);
  }
  assert.equal(nextLevel(LEVELS[LEVELS.length - 1]!.id), undefined);
});

test('no level title or hint contains a banned "lemm" substring', () => {
  for (const level of LEVELS) {
    assert.doesNotMatch(level.title, /lemm/i, `${level.id}: title "${level.title}"`);
    if (level.hint !== undefined) {
      assert.doesNotMatch(level.hint, /lemm/i, `${level.id}: hint "${level.hint}"`);
    }
  }
});

test('every registered level validates with no problems', () => {
  for (const level of LEVELS) {
    assert.deepEqual(validateLevel(level), [], level.id);
  }
});

test('every registered level compiles without throwing', () => {
  for (const level of LEVELS) {
    assert.doesNotThrow(() => compileLevel(level), level.id);
  }
});

/** Collect every stamp id referenced by a level's terrain (and decor, if present). */
function stampIdsUsed(level: LevelDef): string[] {
  const ids: string[] = [];
  const scan = (prims: readonly TerrainPrimitive[] | undefined): void => {
    if (!prims) return;
    for (const p of prims) if (p.kind === 'stamp') ids.push(p.stamp);
  };
  scan(level.terrain);
  scan(level.decor);
  return ids;
}

test('every stamp id used by a level exists in STAMPS', () => {
  const knownStamps = new Set(Object.keys(STAMPS));
  for (const level of LEVELS) {
    for (const stampId of stampIdsUsed(level)) {
      assert.ok(knownStamps.has(stampId), `${level.id}: unknown stamp '${stampId}'`);
    }
  }
});
