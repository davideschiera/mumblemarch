/**
 * Screen composition: maps a Route to a Screen. Plain UI screens come from ui/screens; the
 * game route composes the presentational GameScreenView with a GameController.
 * Owner: E5c (E0 rewired the game route for the split controller).
 */
import { getLevel, nextLevel } from '../levels/registry.ts';
import { createBriefingScreen } from '../ui/screens/briefing.ts';
import { createGameScreenView } from '../ui/screens/game.ts';
import { createHelpScreen } from '../ui/screens/help.ts';
import { createLevelSelectScreen } from '../ui/screens/level-select.ts';
import { createResultsScreen } from '../ui/screens/results.ts';
import type { Route, Screen, ScreenContext } from '../ui/screens/screen.ts';
import { createSettingsScreen } from '../ui/screens/settings.ts';
import { createTitleScreen } from '../ui/screens/title.ts';
import { playfieldAriaLabel } from '../ui/strings.ts';
import { GameController } from './game/controller.ts';
import type { AppServices } from './services.ts';

export interface ScreenHost {
  readonly services: AppServices;
  readonly context: ScreenContext;
  /** The live controller while the game screen is shown (for the test hook and auto-pause). */
  currentGame: GameController | null;
}

export function createScreen(route: Route, host: ScreenHost): Screen {
  const ctx = host.context;
  switch (route.screen) {
    case 'title':
      return createTitleScreen(ctx);
    case 'level-select':
      return createLevelSelectScreen(ctx, route.focusLevelId);
    case 'help':
      return createHelpScreen(ctx, route.back);
    case 'settings':
      return createSettingsScreen(ctx, route.back);
    case 'briefing': {
      const level = getLevel(route.levelId);
      return level ? createBriefingScreen(ctx, level) : createLevelSelectScreen(ctx);
    }
    case 'results': {
      const level = getLevel(route.levelId);
      return level ? createResultsScreen(ctx, level, route.outcome, nextLevel(level.id), route.record) : createLevelSelectScreen(ctx);
    }
    case 'game': {
      const level = getLevel(route.levelId);
      if (!level) return createLevelSelectScreen(ctx);
      const { services } = host;
      // §7.2: the canvas's accessible name names the current level (index.html has the rest —
      // role="application", aria-roledescription, aria-describedby="stage-help").
      services.canvas.setAttribute('aria-label', playfieldAriaLabel(level.title));
      const game = new GameController({
        services,
        level,
        screen: ctx,
        createView: (callbacks) =>
          createGameScreenView({ level, bindings: services.bindings(), callbacks, overlay: services.stageOverlay }),
        nav: {
          restart: () => ctx.navigate({ screen: 'game', levelId: level.id }),
          quit: () => ctx.navigate({ screen: 'level-select', focusLevelId: level.id }),
          results: (outcome, record) => ctx.navigate({ screen: 'results', levelId: level.id, outcome, record }),
        },
      });
      host.currentGame = game;
      return {
        element: game.view.element,
        title: level.title,
        usesStage: true,
        // The controller already announced §7.3 #1 (opens with the title) and the canvas's own
        // aria-label names the level, so the router must not also announce the title on entry.
        announcesEntry: true,
        // §6.2.6: the game screen focuses the canvas so keyboard play works at once.
        focusTarget: () => services.canvas,
        destroy: () => {
          game.destroy();
          if (host.currentGame === game) host.currentGame = null;
        },
      };
    }
    default: {
      // Exhaustiveness check: if a new ScreenId is ever added to `Route` without a case above,
      // this line fails to typecheck (`route` would not be `never`). At runtime — e.g. the test
      // hook receiving an unvalidated route — this is the last line of defence so `Router.go()`
      // fails loudly instead of returning `undefined` and wedging the app (see router.ts `go()`).
      const unreachable: never = route;
      throw new Error(`Unknown screen: ${JSON.stringify((unreachable as { screen?: unknown }).screen)}`);
    }
  }
}
