/**
 * Pure routing logic (DOM-free): `shouldAnnounceEntry` decides whether `Router.go()`'s fallback
 * "focus landed away from the heading, so say the screen title" announcement should fire.
 *
 * Regression for "the level title is announced twice at level start": the game screen already
 * announces its own arrival (§7.3 #1 "ready" message, which opens with the title, plus the
 * canvas's own `aria-label` read natively on focus), so the router must skip its usual fallback
 * for any screen that declares `announcesEntry: true` — even though its focus target (the
 * canvas) is not the `<h1>`, same as every other screen that focuses a plain button.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clearBeforeTransition, shouldAnnounceEntry, transition, type Active } from '../src/app/router.ts';
import { validateRoute } from '../src/app/test-hook.ts';
import type { Route } from '../src/ui/screens/screen.ts';

test('shouldAnnounceEntry: fires when focus left the heading and the screen has no announcesEntry flag (title/level-select/briefing/results/help)', () => {
  assert.equal(shouldAnnounceEntry(false, undefined), true);
  assert.equal(shouldAnnounceEntry(false, false), true);
});

test('shouldAnnounceEntry: does NOT fire for a screen that already announces its own arrival (the game screen), even though focus left the heading', () => {
  assert.equal(shouldAnnounceEntry(false, true), false);
});

test('shouldAnnounceEntry: never fires when focus landed on the heading itself — reading it already announces the context', () => {
  assert.equal(shouldAnnounceEntry(true, undefined), false);
  assert.equal(shouldAnnounceEntry(true, false), false);
  assert.equal(shouldAnnounceEntry(true, true), false);
});

/**
 * `validateRoute` (src/app/test-hook.ts): the fix for the "malformed route wedges the app"
 * defect. `__game.navigate('level-select')` used to reach `Router.go()` as a bare string; now the
 * hook validates first and throws instead, leaving the router untouched. `hasLevel` is stubbed
 * here so these stay DOM-free and independent of the real level registry's contents.
 */
const hasLevel = (id: string) => id === 'spade-expectations';

test('validateRoute: rejects non-object candidates (the original defect — a bare screen-id string)', () => {
  assert.throws(() => validateRoute('level-select', hasLevel), /expected a route object/);
  assert.throws(() => validateRoute(undefined, hasLevel), /expected a route object/);
  assert.throws(() => validateRoute(null, hasLevel), /expected a route object/);
  assert.throws(() => validateRoute(42, hasLevel), /expected a route object/);
  assert.throws(() => validateRoute(['level-select'], hasLevel), /expected a route object/);
});

test('validateRoute: rejects an object with a missing or unknown screen id', () => {
  assert.throws(() => validateRoute({}, hasLevel), /unknown screen/);
  assert.throws(() => validateRoute({ screen: 'lemm-select' }, hasLevel), /unknown screen/);
  assert.throws(() => validateRoute({ screen: 123 }, hasLevel), /unknown screen/);
});

test('validateRoute: accepts every known screen id that needs no levelId', () => {
  assert.deepEqual(validateRoute({ screen: 'title' }, hasLevel), { screen: 'title' });
  assert.deepEqual(validateRoute({ screen: 'level-select' }, hasLevel), { screen: 'level-select' });
  assert.deepEqual(validateRoute({ screen: 'level-select', focusLevelId: 'x' }, hasLevel), {
    screen: 'level-select',
    focusLevelId: 'x',
  });
  assert.deepEqual(validateRoute({ screen: 'help', back: { screen: 'title' } }, hasLevel), {
    screen: 'help',
    back: { screen: 'title' },
  });
});

test('validateRoute: game/briefing/results require a levelId `hasLevel` recognises', () => {
  for (const screen of ['game', 'briefing', 'results']) {
    assert.throws(() => validateRoute({ screen }, hasLevel), /unknown levelId/, `${screen} with no levelId`);
    assert.throws(() => validateRoute({ screen, levelId: 'not-a-real-level' }, hasLevel), /unknown levelId/, `${screen} with a bad levelId`);
    assert.throws(() => validateRoute({ screen, levelId: 42 }, hasLevel), /unknown levelId/, `${screen} with a non-string levelId`);
  }
  assert.deepEqual(validateRoute({ screen: 'game', levelId: 'spade-expectations' }, hasLevel), {
    screen: 'game',
    levelId: 'spade-expectations',
  });
});

/**
 * A11Y-3: `__game.navigate({screen:'settings'})` with no `back` used to reach the router
 * untouched, so activating the Settings/Help screen's Back button later called
 * `ctx.navigate(undefined)` and crashed. Every real (UI-driven) navigation always supplies an
 * explicit `back`, so this only ever bit the raw test hook — defaulting it here (to the title
 * screen) means Back can never crash, without touching the settings/help screens themselves.
 */
test('validateRoute: defaults a missing `back` on help/settings to the title screen so Back can never crash (A11Y-3)', () => {
  assert.deepEqual(validateRoute({ screen: 'settings' }, hasLevel), { screen: 'settings', back: { screen: 'title' } });
  assert.deepEqual(validateRoute({ screen: 'help' }, hasLevel), { screen: 'help', back: { screen: 'title' } });
});

test('validateRoute: leaves an explicit `back` on help/settings untouched', () => {
  assert.deepEqual(validateRoute({ screen: 'settings', back: { screen: 'level-select' } }, hasLevel), {
    screen: 'settings',
    back: { screen: 'level-select' },
  });
});

test('validateRoute: with no `hasLevel` override, falls back to the real level registry', () => {
  assert.deepEqual(validateRoute({ screen: 'game', levelId: 'spade-expectations' }), {
    screen: 'game',
    levelId: 'spade-expectations',
  });
  assert.throws(() => validateRoute({ screen: 'game', levelId: 'not-a-real-level' }), /unknown levelId/);
});

/**
 * `transition()` (src/app/router.ts): the IF4 fix. Root cause of the regression it fixes — after
 * IF3 made `go()` build the NEW screen before destroying the OLD one (so a throwing/unknown route
 * could never wedge the router), a game→game transition briefly had two `GameController`s alive:
 * the new one's constructor attached itself to the shared `InputManager`, and the old one's
 * `destroy()` then unconditionally detached it, killing keyboard input. `transition` restores
 * "destroy old, then build new" while keeping IF3's guarantee via a fresh rebuild of the previous
 * (or title) route if the factory throws. Pure and generic (`FakeScreen` below is not a real
 * `Screen` — no DOM, no `.destroy()` method on the screen itself) so it needs no browser.
 */
interface FakeScreen {
  readonly id: string;
}

/** A fake screen factory: records every call in `log`, throws for any route whose `screen` id is in `throwFor`. */
function fakeFactory(log: string[], throwFor: ReadonlySet<string> = new Set()): (route: Route) => FakeScreen {
  let n = 0;
  return (route) => {
    const id = `${route.screen}#${++n}`;
    log.push(`factory:${id}`);
    if (throwFor.has(route.screen)) throw new Error(`factory failed for ${route.screen}`);
    return { id };
  };
}

function fakeDestroy(log: string[]): (screen: FakeScreen) => void {
  return (screen) => log.push(`destroy:${screen.id}`);
}

test('transition: destroys the OLD screen before building the NEW one (the IF4 regression: overlapping game controllers)', () => {
  const log: string[] = [];
  const factory = fakeFactory(log);
  const destroy = fakeDestroy(log);
  const previous: Active<FakeScreen> = { route: { screen: 'title' }, screen: { id: 'title#0' } };

  const result = transition(previous, { screen: 'level-select' }, factory, destroy);

  assert.deepEqual(log, ['destroy:title#0', 'factory:level-select#1']); // destroy strictly before factory
  assert.equal(result.error, null);
  assert.deepEqual(result.active.route, { screen: 'level-select' });
  assert.equal(result.active.screen.id, 'level-select#1');
});

test('transition: a throwing factory rebuilds the PREVIOUS route as a fresh instance and reports the original error; a later transition still works', () => {
  const log: string[] = [];
  const factory = fakeFactory(log, new Set(['briefing']));
  const destroy = fakeDestroy(log);
  const previous: Active<FakeScreen> = { route: { screen: 'title' }, screen: { id: 'title#0' } };

  const result = transition(previous, { screen: 'briefing', levelId: 'x' }, factory, destroy);

  assert.deepEqual(log, ['destroy:title#0', 'factory:briefing#1', 'factory:title#2']);
  assert.ok(result.error instanceof Error);
  assert.match((result.error as Error).message, /factory failed for briefing/);
  // Recovered on the PREVIOUS route — as a brand-new instance, not the one already destroyed.
  assert.deepEqual(result.active.route, { screen: 'title' });
  assert.equal(result.active.screen.id, 'title#2');
  assert.notEqual(result.active.screen, previous.screen);

  // The next real transition (the following `go()` call) is unaffected: `this.active` is never
  // left holding a dead/undefined screen, so the router is not wedged.
  const log2: string[] = [];
  const factory2 = fakeFactory(log2);
  const destroy2 = fakeDestroy(log2);
  const next = transition(result.active, { screen: 'level-select' }, factory2, destroy2);

  assert.equal(next.error, null);
  assert.deepEqual(next.active.route, { screen: 'level-select' });
  assert.deepEqual(log2, ['destroy:title#2', 'factory:level-select#1']);
});

test('transition: factory throwing for both the target AND the rebuilt previous route falls back to the title screen', () => {
  const log: string[] = [];
  const factory = fakeFactory(log, new Set(['briefing', 'level-select']));
  const destroy = fakeDestroy(log);
  const previous: Active<FakeScreen> = { route: { screen: 'level-select' }, screen: { id: 'level-select#0' } };

  const result = transition(previous, { screen: 'briefing', levelId: 'x' }, factory, destroy);

  assert.deepEqual(log, ['destroy:level-select#0', 'factory:briefing#1', 'factory:level-select#2', 'factory:title#3']);
  assert.ok(result.error instanceof Error);
  assert.match((result.error as Error).message, /factory failed for briefing/); // the ORIGINAL error, not the rebuild's
  assert.deepEqual(result.active.route, { screen: 'title' });
  assert.equal(result.active.screen.id, 'title#3');
  assert.equal(log.filter((l) => l.startsWith('destroy:')).length, 1); // only the original previous screen, once
});

/**
 * `clearBeforeTransition()` (src/app/router.ts): the PLAY-B2 fix. Root cause of the defect it
 * fixes — the Announcer only ever cleared a live region by writing NEW text to it, so a screen
 * that never speaks a given channel again (e.g. Levels/Briefing never use assertive) left the
 * previous screen's stale message (the game screen's assertive "Level complete! …") sitting in
 * the DOM forever. Fix: `Router.go()` clears the announcer BEFORE touching the old or new screen,
 * every time. This test only checks the ORDER `clear` is called in relative to destroy/build —
 * `clear`'s own effect (dropping queued-but-unspoken messages) is unit-tested directly on
 * `AnnounceQueue.clear()` in tests/ui-announce-queue.test.ts.
 */
test('clearBeforeTransition: clears the announcer BEFORE the old screen is destroyed or the new one is built (PLAY-B2)', () => {
  const log: string[] = [];
  const factory = fakeFactory(log);
  const destroy = fakeDestroy(log);
  const previous: Active<FakeScreen> = { route: { screen: 'game', levelId: 'x' }, screen: { id: 'game#0' } };

  const result = clearBeforeTransition(() => log.push('clear'), previous, { screen: 'level-select' }, factory, destroy);

  assert.deepEqual(log, ['clear', 'destroy:game#0', 'factory:level-select#1']); // clear strictly first
  assert.equal(result.error, null);
  assert.deepEqual(result.active.route, { screen: 'level-select' });
});

test('clearBeforeTransition: clear still runs, exactly once, even with no previous screen (the very first navigation)', () => {
  const log: string[] = [];
  const factory = fakeFactory(log);
  const destroy = fakeDestroy(log);

  clearBeforeTransition(() => log.push('clear'), null, { screen: 'title' }, factory, destroy);

  assert.deepEqual(log, ['clear', 'factory:title#1']);
});

test('clearBeforeTransition: clear runs before a throwing factory too, and only once even though transition rebuilds', () => {
  const log: string[] = [];
  const factory = fakeFactory(log, new Set(['briefing']));
  const destroy = fakeDestroy(log);
  const previous: Active<FakeScreen> = { route: { screen: 'title' }, screen: { id: 'title#0' } };

  const result = clearBeforeTransition(() => log.push('clear'), previous, { screen: 'briefing', levelId: 'x' }, factory, destroy);

  assert.deepEqual(log, ['clear', 'destroy:title#0', 'factory:briefing#1', 'factory:title#2']);
  assert.equal(log.filter((l) => l === 'clear').length, 1); // never re-cleared by the internal recovery rebuild
  assert.ok(result.error instanceof Error);
});

test('transition: a throwing factory with no previous screen (the very first navigation) falls back straight to the title screen', () => {
  const log: string[] = [];
  const factory = fakeFactory(log, new Set(['level-select']));
  const destroy = fakeDestroy(log);

  const result = transition(null, { screen: 'level-select' }, factory, destroy);

  assert.ok(result.error instanceof Error);
  assert.deepEqual(result.active.route, { screen: 'title' });
  assert.deepEqual(log, ['factory:level-select#1', 'factory:title#2']); // nothing to destroy yet
});
