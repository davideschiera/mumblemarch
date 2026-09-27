/**
 * Title screen: marching-letter logo, tagline, main menu (Play/Continue, Levels, How to play,
 * Settings), the march-strip footer decor and the sound note (DESIGN §5.4 Title, §9.2, §9.3,
 * §8.1). Landing focus is Play (§6.2.6 "title → Play").
 * Owner: e3a1-title-results.
 */
import { firstUnfinishedLevelId } from '../../persistence/storage.ts';
import { h } from '../dom.ts';
import { GAME_TITLE, TAGLINE, TITLE } from '../strings.ts';
import { createMarchStrip } from './march-strip.ts';
import { screenSection, type Route, type Screen, type ScreenContext } from './screen.ts';

/** Builds the accessible-but-decorative "Mumblemarch" wordmark: one aria-hidden span per
 * letter (offset ±3px like a marching line, §5.2 "sticker" treatment), while the h1's own
 * accessible name stays the plain game title. */
function buildLogo(h1: HTMLHeadingElement): void {
  h1.textContent = '';
  h1.setAttribute('aria-label', GAME_TITLE);
  h1.classList.add('title-logo');
  for (const ch of GAME_TITLE) {
    h1.append(h('span', { 'aria-hidden': 'true' }, ch === ' ' ? ' ' : ch));
  }
}

/** The Play button's label and destination (DESIGN §5.4/§9.3: "Start" first visit, else
 * "Continue — {n} · {title}"), landing on the first unfinished level's briefing. */
function resolvePlay(ctx: ScreenContext): { readonly label: string; readonly route: Route } {
  const { progress, lastLevelId } = ctx.save.current;
  const returning = Object.keys(progress).length > 0 || lastLevelId !== null;
  const levelIds = ctx.levels.map((level) => level.id);
  const resumeId = firstUnfinishedLevelId(levelIds, progress);
  const resumeIndex = resumeId ? levelIds.indexOf(resumeId) : -1;
  const resumeLevel = resumeIndex >= 0 ? ctx.levels[resumeIndex] : undefined;
  if (!resumeLevel) return { label: TITLE.start, route: { screen: 'level-select' } };
  const label = returning ? TITLE.continue(resumeIndex + 1, resumeLevel.title) : TITLE.start;
  return { label, route: { screen: 'briefing', levelId: resumeLevel.id } };
}

export function createTitleScreen(ctx: ScreenContext): Screen {
  const { section, h1 } = screenSection('screen--title', GAME_TITLE);
  buildLogo(h1);

  const { label: playLabel, route: playRoute } = resolvePlay(ctx);
  const play = h('button', { type: 'button', class: 'button button--primary button--wide', onclick: () => ctx.navigate(playRoute) }, playLabel);
  const levels = h('button', { type: 'button', class: 'button button--wide', onclick: () => ctx.navigate({ screen: 'level-select' }) }, TITLE.levels);
  const help = h('button', { type: 'button', class: 'button button--wide', onclick: () => ctx.navigate({ screen: 'help', back: { screen: 'title' } }) }, TITLE.howToPlay);
  const settings = h('button', { type: 'button', class: 'button button--wide', onclick: () => ctx.navigate({ screen: 'settings', back: { screen: 'title' } }) }, TITLE.settings);

  const strip = createMarchStrip(ctx.reducedMotion());

  section.append(
    h('p', { class: 'screen__lead title-tagline' }, TAGLINE),
    h('nav', { class: 'menu title-menu', 'aria-label': 'Main menu' }, play, levels, help, settings),
    strip.element,
    h('p', { class: 'title-sound-note' }, TITLE.soundNote),
  );

  // Keep the strip's CSS size an integer multiple of its 400×32 backing store (DESIGN §5.1) at
  // every column width, mirroring the `--stage-w` ResizeObserver pattern in game.ts.
  let stripResizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    stripResizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) strip.resize(width);
    });
    stripResizeObserver.observe(section);
  }

  return {
    element: section,
    title: `${GAME_TITLE}. ${TAGLINE}`,
    focusTarget: () => play,
    destroy: () => {
      stripResizeObserver?.disconnect();
      strip.destroy();
    },
  };
}
