/**
 * Help / controls screen (DESIGN §7.10, §5.4 "How to play"): the goal, a keyboard/mouse quick
 * start, an 8-card skill glossary, controls tables GENERATED from the live key bindings
 * (grouped Skills · Choosing mumbles · Camera · Game flow · Sound & info, via `ACTION_LABELS` /
 * `ACTION_GROUPS` / `keyLabel` — never raw ids), the static mouse table (§6.1.3), assists with a
 * link to Settings, and screen-reader tips. Also used inside the in-game H/F1 overlay
 * (`ui/dialogs/overlay.ts`): `options.overlay` swaps the `<h1>` + Back button for an `<h2>` +
 * "Back to the game" button (the dialog's `aria-labelledby` points at that `<h2>`).
 * Owner: E3b2.
 */
import { SKILL_IDS, type SkillId } from '../../core/types.ts';
import { ICONS, MUMBLE_PALETTE } from '../../art/index.ts';
import type { ActionId } from '../../input/actions.ts';
import { keyLabel } from '../../input/bindings.ts';
import { h } from '../dom.ts';
import { pixelFrameToDataUrl } from '../pixel-art.ts';
import {
  ACTION_GROUPS,
  HELP,
  HELP_BACK,
  HELP_BACK_TO_GAME,
  HELP_GOAL_HEADING,
  HELP_MOUSE_TABLE,
  HELP_OPEN_SETTINGS,
  HELP_QUICK_START_HEADING,
  HELP_SCREEN_READER_HEADING,
  HELP_TABLE_HEADERS,
  ACTION_LABELS,
  SKILL_DESCRIPTIONS,
  SKILL_NAMES,
} from '../strings.ts';
import { screenSection, type Route, type Screen, type ScreenBuildOptions, type ScreenContext } from './screen.ts';

/** A 32×32 CSS px data URL for a skill's HUD icon (§3.4 art, App. A copy). '' if 2D unavailable. */
function skillIconUrl(id: SkillId): string {
  return pixelFrameToDataUrl(ICONS[id] ?? [], MUMBLE_PALETTE, 2);
}

export function createHelpScreen(ctx: ScreenContext, back: Route, options: ScreenBuildOptions = {}): Screen {
  const overlay = options.overlay ?? false;
  const bindings = ctx.bindings();
  const title = 'How to play';

  // Heading levels shift by one inside the overlay, where the dialog owns an implicit <h1>-ish
  // role via aria-labelledby on our <h2>: overlay sections are h3, groups h4; full-screen: h2/h3.
  const baseLevel = overlay ? 2 : 1;
  const heading = (depth: 1 | 2 | 3, text: string): HTMLElement =>
    h(`h${Math.min(6, baseLevel + depth)}` as keyof HTMLElementTagNameMap, {}, text);

  let section: HTMLElement;
  let headingEl: HTMLElement;
  let closeButton: HTMLButtonElement;
  if (overlay) {
    section = document.createElement('section');
    section.className = 'screen screen--help';
    headingEl = document.createElement('h2');
    headingEl.id = 'help-overlay-title';
    headingEl.className = 'screen__title';
    headingEl.textContent = title;
    closeButton = h('button', { type: 'button', class: 'button button--primary', onclick: () => ctx.navigate(back) }, HELP_BACK_TO_GAME);
    section.append(headingEl);
  } else {
    ({ section, h1: headingEl } = screenSection('screen--help', title));
    closeButton = h('button', { type: 'button', class: 'button', onclick: () => ctx.navigate(back) }, HELP_BACK);
  }

  const quickStart = h(
    'section',
    { class: 'help__block' },
    heading(1, HELP_QUICK_START_HEADING),
    h(
      'div',
      { class: 'help__quickstart-grid' },
      h('div', {}, heading(2, HELP.keyboardHeading), h('ol', { class: 'help__steps' }, ...HELP.quickStartKeyboard.map((step) => h('li', {}, step)))),
      h('div', {}, heading(2, HELP.mouseHeading), h('p', {}, HELP.quickStartMouse)),
    ),
  );

  const skills = h(
    'section',
    { class: 'help__block' },
    heading(1, HELP.skillsHeading),
    h(
      'div',
      { class: 'skills-help' },
      ...SKILL_IDS.map((id) =>
        h(
          'div',
          { class: 'skills-help__card' },
          h('img', { class: 'skills-help__icon', src: skillIconUrl(id), alt: '', width: 32, height: 32 }),
          h(
            'div',
            { class: 'skills-help__info' },
            h('p', { class: 'skills-help__name' }, SKILL_NAMES[id], h('kbd', { class: 'kbd' }, firstKey(bindings[`skill-${id}` as ActionId]))),
            h('p', { class: 'skills-help__desc' }, SKILL_DESCRIPTIONS[id]),
          ),
        ),
      ),
    ),
  );

  const mouseTable = h(
    'table',
    { class: 'controls' },
    h(
      'thead',
      {},
      h('tr', {}, h('th', { scope: 'col' }, HELP_TABLE_HEADERS.input), h('th', { scope: 'col' }, HELP_TABLE_HEADERS.where), h('th', { scope: 'col' }, HELP_TABLE_HEADERS.behaviour)),
    ),
    h('tbody', {}, ...HELP_MOUSE_TABLE.map((row) => h('tr', {}, h('td', {}, row.input), h('td', {}, row.where), h('td', {}, row.behaviour)))),
  );

  const keyboardGroups = ACTION_GROUPS.map((group) => {
    const table = h(
      'table',
      { class: 'controls' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, HELP_TABLE_HEADERS.action), h('th', { scope: 'col' }, HELP_TABLE_HEADERS.keys))),
      h('tbody', {}, ...group.actions.map((action) => h('tr', {}, h('td', {}, ACTION_LABELS[action]), keysCell(bindings[action])))),
    );
    return h('div', { class: 'controls-group' }, heading(3, group.label), table);
  });

  const controls = h(
    'section',
    { class: 'help__block' },
    heading(1, HELP.controlsHeading),
    heading(2, HELP.mouseHeading),
    mouseTable,
    heading(2, HELP.keyboardHeading),
    ...keyboardGroups,
  );

  const assists = h(
    'section',
    { class: 'help__block' },
    heading(1, HELP.assistsHeading),
    h('ul', { class: 'help__assists' }, ...HELP.assists.map((line) => h('li', {}, line))),
    overlay
      ? null
      : h('button', { type: 'button', class: 'help__link', onclick: () => ctx.navigate({ screen: 'settings', back }) }, HELP_OPEN_SETTINGS),
  );

  const srTips = h('section', { class: 'help__block' }, heading(1, HELP_SCREEN_READER_HEADING), h('p', {}, HELP.screenReaderTips));

  const columns = h(
    'div',
    { class: 'help__columns' },
    h('div', { class: 'help__col' }, h('section', { class: 'help__block' }, heading(1, HELP_GOAL_HEADING), h('p', {}, HELP.goal)), quickStart, skills),
    h('div', { class: 'help__col' }, controls, assists, srTips),
  );

  section.append(columns, closeButton);

  return {
    element: section,
    title,
    destroy: () => {},
    // Non-overlay: omitted, so the router falls back to the screen's <h1> (default focus).
    ...(overlay ? { focusTarget: () => closeButton } : {}),
  };
}

/** The label of the first bound key ("" if somehow unbound) — never a raw key code. */
function firstKey(codes: readonly string[]): string {
  return keyLabel(codes[0] ?? '');
}

/** `<td>` of one or more `<kbd>` chips, joined " / " (never a raw key code — always `keyLabel`). */
function keysCell(codes: readonly string[]): HTMLElement {
  const td = h('td', {});
  codes.forEach((code, i) => {
    if (i > 0) td.append(' / ');
    td.append(h('kbd', { class: 'kbd' }, keyLabel(code)));
  });
  return td;
}
