/**
 * Level briefing: objective, skills available, hint; Let's march! / Back to levels — or, in
 * overlay mode (the in-game `B` key modal), a single "Back to the game" button.
 * DESIGN §5.4 "Briefing" row, §9.3 sample strings, §7.1 A16 (hint text is level data), §6.2.6
 * (landing focus). Reference: docs/design/mockups/menus.html "3. BRIEFING".
 */
import { TICKS_PER_SECOND } from '../../core/constants.ts';
import { SKILL_IDS } from '../../core/types.ts';
import type { LevelDef } from '../../levels/format.ts';
import { drawPixelFrame } from '../pixel-art.ts';
import { ICONS } from '../../art/icons.ts';
import { MUMBLE_PALETTE } from '../../art/palette.ts';
import { append, h } from '../dom.ts';
import {
  BRIEFING,
  BRIEFING_EXTRA,
  formatClock,
  LEVELS_BACK_TO_GAME,
  LEVELS_THUMBNAIL_LABEL,
  SKILL_NAMES,
  TIER_NAMES,
} from '../strings.ts';
import { drawLevelThumbnail } from '../thumbnail.ts';
import type { Screen, ScreenBuildOptions, ScreenContext } from './screen.ts';

/** Same shape as `screenSection` (screen.ts, ui-lead-owned), but the heading level depends on
 * overlay mode (DESIGN's briefing contract: `<h2>` inside the in-game modal, `<h1>` on its own
 * screen) — screenSection always builds an `<h1>`, so this is a small local equivalent. */
function briefingShell(overlay: boolean): { section: HTMLElement; heading: HTMLHeadingElement } {
  const section = document.createElement('section');
  section.className = 'screen screen--briefing';
  const heading = document.createElement(overlay ? 'h2' : 'h1') as HTMLHeadingElement;
  heading.className = 'screen__title';
  heading.tabIndex = -1;
  return { section, heading };
}

export function createBriefingScreen(ctx: ScreenContext, level: LevelDef, options: ScreenBuildOptions = {}): Screen {
  const overlay = options.overlay === true;
  const { section, heading } = briefingShell(overlay);
  heading.textContent = level.title;

  const number = ctx.levels.indexOf(level) + 1;
  const eyebrow = h('p', { class: 'briefing__eyebrow' }, BRIEFING_EXTRA.levelHeader(number, TIER_NAMES[level.tier]));

  const scale = level.width > 1200 ? 0.75 : 1;
  const thumb = h('canvas', { class: 'briefing__thumb', role: 'img', 'aria-label': LEVELS_THUMBNAIL_LABEL(level.title) });
  drawLevelThumbnail(thumb, level, { scale, markers: true });

  const pct = level.lemmings > 0 ? Math.round((level.saveRequired / level.lemmings) * 100) : 0;
  const settings = ctx.save.current.settings;
  const timeClock = formatClock(Math.round(level.timeLimitSeconds * TICKS_PER_SECOND));
  const timeValue = settings.relaxedTimer ? BRIEFING_EXTRA.timeRelaxed(timeClock) : timeClock;
  const facts = h(
    'dl',
    { class: 'briefing-stats' },
    h('div', {}, h('dt', {}, BRIEFING.mumbles), h('dd', {}, String(level.lemmings))),
    h('div', {}, h('dt', {}, BRIEFING.save), h('dd', {}, `${level.saveRequired} `, h('small', {}, `(${pct}%)`))),
    h('div', {}, h('dt', {}, BRIEFING.rate), h('dd', {}, String(level.releaseRate))),
    h('div', {}, h('dt', {}, BRIEFING.time), h('dd', {}, timeValue)),
    h('div', {}, h('dt', {}, BRIEFING.tier), h('dd', {}, TIER_NAMES[level.tier])),
  );

  const record = ctx.save.current.progress[level.id];
  const bestLine = record?.completed ? h('p', { class: 'briefing__best' }, BRIEFING_EXTRA.best(record.bestSaved)) : null;

  const skillIds = SKILL_IDS.filter((id) => (level.skills[id] ?? 0) > 0);
  const skillList = h(
    'ul',
    { class: 'skill-chip-list' },
    ...skillIds.map((id) => {
      const icon = h('canvas', { class: 'skill-chip__icon', width: 16, height: 16, 'aria-hidden': 'true' });
      const iconCtx = icon.getContext('2d');
      const frame = ICONS[id];
      if (iconCtx && frame) drawPixelFrame(iconCtx, frame, MUMBLE_PALETTE, 0, 0, 1);
      return h('li', { class: 'skill-chip' }, icon, h('span', {}, SKILL_NAMES[id]), h('b', {}, `×${level.skills[id]}`));
    }),
  );

  let hint: HTMLElement | null = null;
  if (level.hint) {
    const hintText = h('p', { class: 'briefing__hint-text', hidden: true }, level.hint);
    // PLAY-A3: the WAI-ARIA APG disclosure pattern keeps the button's own label fixed ("Show
    // hint") and its state in `aria-expanded` (DESIGN §5.4) — that stays exactly as-is. A sighted
    // player still needs a visible cue that the hint is open, so a purely decorative `aria-hidden`
    // chevron rides along, flipped by CSS keyed off `[aria-expanded]` (screens.css).
    const hintChevron = h('span', { class: 'briefing__hint-chevron', 'aria-hidden': 'true' }, '▸');
    const hintButton = h(
      'button',
      { type: 'button', class: 'button briefing__hint-toggle', 'aria-expanded': 'false' },
      hintChevron,
      ' ',
      BRIEFING.showHint,
    );
    hintButton.addEventListener('click', () => {
      const expanded = hintButton.getAttribute('aria-expanded') === 'true';
      hintButton.setAttribute('aria-expanded', String(!expanded));
      hintText.hidden = expanded;
    });
    hint = h('div', { class: 'briefing__hint' }, hintButton, hintText);
  }

  append(section, eyebrow, heading, thumb, facts, bestLine, h('h2', {}, BRIEFING.skills), skillList, hint);

  let focusButton: HTMLButtonElement;
  if (overlay) {
    const backToGame = h(
      'button',
      { type: 'button', class: 'button button--primary', onclick: () => ctx.navigate({ screen: 'briefing', levelId: level.id }) },
      LEVELS_BACK_TO_GAME,
    );
    focusButton = backToGame;
    section.append(h('div', { class: 'menu' }, backToGame));
  } else {
    const start = h(
      'button',
      {
        type: 'button',
        class: 'button button--primary',
        onclick: () => {
          ctx.save.setLastLevel(level.id);
          ctx.navigate({ screen: 'game', levelId: level.id });
        },
      },
      BRIEFING.start,
    );
    const back = h('button', { type: 'button', class: 'button', onclick: () => ctx.navigate({ screen: 'level-select', focusLevelId: level.id }) }, BRIEFING.back);
    focusButton = start;
    section.append(h('div', { class: 'menu' }, start, back));
    section.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        ctx.navigate({ screen: 'level-select', focusLevelId: level.id });
      }
    });
  }

  return {
    element: section,
    title: `Briefing: ${level.title}`,
    focusTarget: () => focusButton,
    destroy: () => {},
  };
}
