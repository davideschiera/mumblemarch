/**
 * Screen router: one screen at a time inside #screen-root. On every navigation it destroys
 * the old screen, mounts the new one, toggles the canvas stage, updates document.title and
 * moves focus (to the screen's <h1> by default, so screen readers announce the new context).
 */
import type { Announcer } from '../ui/announcer.ts';
import { focusElement } from '../ui/focus.ts';
import type { Route, Screen } from '../ui/screens/screen.ts';
import { GAME_TITLE } from '../ui/strings.ts';

/**
 * Root cause of the "level title announced twice" defect: `go()` used to always speak
 * `screen.title` as a fallback whenever focus landed away from the `<h1>` — right for a screen
 * that focuses a plain button (title's "Play", results' primary button, …), but for the game
 * screen it duplicated the §7.3 #1 "ready" message (which already opens with the title) and the
 * canvas's own `aria-label` (read natively on focus). Pure so it is unit-testable without a DOM.
 */
export function shouldAnnounceEntry(focusedHeading: boolean, announcesEntry: boolean | undefined): boolean {
  return !focusedHeading && !announcesEntry;
}

/** The router's bookkeeping for one live screen: which route built it, and the screen itself. */
export interface Active<S> {
  readonly route: Route;
  readonly screen: S;
}

/** `transition()`'s outcome: the screen now mounted, and — only on recovery — the error to rethrow. */
export interface TransitionResult<S> {
  readonly active: Active<S>;
  /** Non-null when `factory(route)` threw; `active` is then the rebuilt previous/title screen. */
  readonly error: unknown;
}

/**
 * Root cause of the IF4 regression: after IF3 made `go()` build the new screen BEFORE destroying
 * the old one (to keep a throwing `factory()` from wedging the router — see below), a game→game
 * transition briefly had TWO `GameController`s alive at once. Both share singletons (`services.
 * input`, `services.music`, `services.stageOverlay`, …): the new controller's constructor calls
 * `services.input.attach(this)`, and then the OLD controller's `destroy()` called
 * `services.input.detach()` — unconditionally, so it ripped out the brand-new handler's listeners,
 * leaving keyboard input dead until the player left through a non-game screen.
 *
 * Fix: restore the "one screen alive at a time" invariant — destroy the OLD screen first, THEN
 * build the new one — while keeping IF3's guarantee that a throwing/unknown route can never wedge
 * the router. If `factory(route)` throws (the old screen is already gone), rebuild a *fresh*
 * instance of the previous route so `active` never holds a dead/undefined screen; if that also
 * throws, fall back to the title screen, which is assumed never to throw. Pure (no DOM) and generic
 * over the screen type so it is unit-testable with plain fake screen objects — `go()` supplies the
 * real `Screen` type, `this.factory` and `(screen) => screen.destroy()`, and does the DOM work
 * (mount, title, focus, announce) itself.
 */
export function transition<S>(
  previous: Active<S> | null,
  route: Route,
  factory: (route: Route) => S,
  destroy: (screen: S) => void,
): TransitionResult<S> {
  if (previous) destroy(previous.screen);
  try {
    return { active: { route, screen: factory(route) }, error: null };
  } catch (error) {
    return { active: rebuildAfterError(previous, factory), error };
  }
}

/**
 * PLAY-B2: `Router.go()`'s ordering contract — `clear` (wipe the announcer's live regions and
 * drop anything queued but not yet spoken) must run BEFORE the old screen is destroyed or the new
 * one is built, so a stale message from the screen being LEFT (e.g. the game screen's assertive
 * "Level complete! …") can never survive into the screen being ENTERED, even one that has no
 * reason to speak that channel again (Levels, Briefing). Because `clear` always runs first, the
 * new screen's own entry announcement — queued during `factory(route)` (e.g. the game screen's
 * §7.3 #1 "ready"), or `go()`'s own `shouldAnnounceEntry` fallback afterwards — starts from an
 * empty queue and is unaffected: it still speaks exactly once (the IF1 guarantee). Exported (and
 * taking `clear` as a plain callback) so this ORDER is unit-testable without a DOM.
 */
export function clearBeforeTransition<S>(
  clear: () => void,
  previous: Active<S> | null,
  route: Route,
  factory: (route: Route) => S,
  destroy: (screen: S) => void,
): TransitionResult<S> {
  clear();
  return transition(previous, route, factory, destroy);
}

/** `factory(route)` just threw with the old screen already destroyed: land somewhere valid. */
function rebuildAfterError<S>(previous: Active<S> | null, factory: (route: Route) => S): Active<S> {
  if (previous) {
    try {
      return { route: previous.route, screen: factory(previous.route) };
    } catch {
      // The previous route doesn't rebuild either (e.g. its level was deleted mid-session) — fall
      // through to the title screen below.
    }
  }
  const titleRoute: Route = { screen: 'title' };
  return { route: titleRoute, screen: factory(titleRoute) };
}

export class Router {
  private readonly root: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly announcer: Announcer;
  private readonly factory: (route: Route) => Screen;
  private active: Active<Screen> | null = null;

  constructor(root: HTMLElement, stage: HTMLElement, announcer: Announcer, factory: (route: Route) => Screen) {
    this.root = root;
    this.stage = stage;
    this.announcer = announcer;
    this.factory = factory;
  }

  get route(): Route | null {
    return this.active?.route ?? null;
  }

  go(route: Route): void {
    const result = clearBeforeTransition(
      () => this.announcer.clear(),
      this.active,
      route,
      this.factory,
      (screen) => screen.destroy(),
    );
    this.active = result.active;
    const { screen } = result.active;
    this.root.replaceChildren(screen.element);
    this.stage.hidden = !screen.usesStage;
    document.title = `${screen.title} — ${GAME_TITLE}`;
    const heading = screen.element.querySelector<HTMLElement>('h1');
    const target = screen.focusTarget?.() ?? heading;
    focusElement(target);
    // Focusing the heading reads the new context; when focus lands elsewhere, say it — unless
    // the screen already announces its own arrival (`announcesEntry`, e.g. the game screen's
    // §7.3 #1 message), which would otherwise double up with this fallback.
    if (shouldAnnounceEntry(target === heading, screen.announcesEntry)) this.announcer.say(screen.title);
    // Rethrow AFTER mounting the recovered screen: the app stays usable (matches IF3's original
    // goal — a malformed/unknown route must never wedge the router) while the caller (the test
    // hook's `navigate`, or a console error for a real navigation bug) still sees the failure.
    if (result.error) throw result.error;
  }
}
