/**
 * Results: headline (✓/↺, success/failure), the saved/required meter with a notch, the graded
 * verdict, "New best!"/"Beat the clock ✓"/relaxed-timer notes, Next level / Try again / Levels
 * buttons, a failure-only hint disclosure, and the hopping-mumbles decor (DESIGN §5.4 Results,
 * §9.5). Landing focus is the primary button (§6.2.6 "results → primary button").
 * Owner: e3a1-title-results.
 */
import type { LevelOutcome } from '../../core/types.ts';
import type { LevelDef } from '../../levels/format.ts';
import { joinUtterance } from '../announce-queue.ts';
import { append, h } from '../dom.ts';
import { BRIEFING, BRIEFING_EXTRA, RESULTS, beatClockLine, relaxedNote, resultsHeadline, verdictFor } from '../strings.ts';
import { SCREENS_HIDE_HINT, SCREENS_NEEDED } from '../strings/screens.ts';
import { createHopStrip } from './results-hop.ts';
import { screenSection, type ResultRecord, type Screen, type ScreenContext } from './screen.ts';

/** Route.record is only sometimes wired up yet (CONTRACTS §E: "e5c will pass route.record; until
 * then it's undefined"); fall back to the rule given there when it's missing. */
function resolveRecord(ctx: ScreenContext, level: LevelDef, record: ResultRecord | undefined): ResultRecord {
  if (record) return record;
  const attempts = ctx.save.current.progress[level.id]?.attempts ?? 1;
  return { newBest: false, attempt: Math.max(0, attempts - 1), relaxed: ctx.save.current.settings.relaxedTimer, inTime: false };
}

/** Next level / Try again / Levels, primary action first in DOM order (§5.4 shared screen rule). */
function buildButtons(ctx: ScreenContext, level: LevelDef, outcome: LevelOutcome, next: LevelDef | undefined): { readonly row: HTMLElement; readonly primary: HTMLButtonElement } {
  const tryAgain = h(
    'button',
    { type: 'button', class: outcome.won ? 'button button--wide' : 'button button--primary button--wide', onclick: () => ctx.navigate({ screen: 'game', levelId: level.id }) },
    RESULTS.retry,
  );
  const levelsBtn = h('button', { type: 'button', class: 'button button--wide', onclick: () => ctx.navigate({ screen: 'level-select', focusLevelId: level.id }) }, RESULTS.levels);
  if (outcome.won && next) {
    const nextBtn = h('button', { type: 'button', class: 'button button--primary button--wide', onclick: () => ctx.navigate({ screen: 'briefing', levelId: next.id }) }, RESULTS.next);
    return { row: h('div', { class: 'menu' }, nextBtn, tryAgain, levelsBtn), primary: nextBtn };
  }
  return { row: h('div', { class: 'menu' }, tryAgain, levelsBtn), primary: tryAgain };
}

/** Failure-only "Show hint" disclosure (spoiler-safe, closed by default); omitted when the level
 * has no hint. Mirrors the briefing screen's disclosure pattern. */
function buildHint(level: LevelDef): HTMLElement | null {
  if (!level.hint) return null;
  const text = h('p', { class: 'results-hint__text' }, level.hint);
  text.hidden = true;
  const toggle = h('button', { type: 'button', class: 'button results-hint__toggle', 'aria-expanded': 'false' }, BRIEFING.showHint);
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    text.hidden = expanded;
    toggle.textContent = expanded ? BRIEFING.showHint : SCREENS_HIDE_HINT;
  });
  return h('div', { class: 'results-hint' }, toggle, text);
}

export function createResultsScreen(ctx: ScreenContext, level: LevelDef, outcome: LevelOutcome, next: LevelDef | undefined, record?: ResultRecord): Screen {
  const rec = resolveRecord(ctx, level, record);
  const headlineText = resultsHeadline(outcome);
  const verdictText = verdictFor(outcome.saved, outcome.required, outcome.total, rec.attempt);

  const { section, h1 } = screenSection('screen--results', headlineText);
  h1.classList.add('results-headline', outcome.won ? 'results-headline--success' : 'results-headline--fail');
  h1.prepend(h('span', { 'aria-hidden': 'true', class: 'results-headline__icon' }, outcome.won ? '✓' : '↺'));

  const levelNumber = ctx.levels.findIndex((l) => l.id === level.id) + 1;
  const tierName = ctx.tiers.find((t) => t.id === level.tier)?.name ?? '';
  h1.before(h('p', { class: 'results-eyebrow' }, `${BRIEFING_EXTRA.levelHeader(levelNumber, tierName)} · ${level.title}`));

  const scoreLine = h('p', { class: 'results-score' }, RESULTS.score(outcome.saved, outcome.total, outcome.required));

  const total = Math.max(0, outcome.total);
  const fillPct = total > 0 ? Math.min(1, outcome.saved / total) * 100 : 0;
  const notchPct = total > 0 ? Math.min(1, outcome.required / total) * 100 : 0;
  const meter = h(
    'div',
    { class: 'results-meter', role: 'img', 'aria-label': RESULTS.score(outcome.saved, outcome.total, outcome.required) },
    h('i', { class: 'results-meter__fill', style: `width:${fillPct}%` }),
    h('b', { class: 'results-meter__notch', style: `left:${notchPct}%` }),
  );
  const needed = h('p', { class: 'results-needed', 'aria-hidden': 'true' }, SCREENS_NEEDED(outcome.required));

  const verdictP = h('p', { class: 'results-verdict' }, verdictText);
  const badge = rec.newBest ? h('p', { class: 'results-badges' }, h('span', { class: 'results-badge' }, RESULTS.newBest)) : null;
  const beatClockText = beatClockLine(outcome.won, rec.inTime, rec.relaxed);
  const beatClockP = beatClockText ? h('p', { class: 'results-note' }, beatClockText) : null;
  const relaxedP = rec.relaxed ? h('p', { class: 'results-note results-note--muted' }, relaxedNote(outcome.overtimeTicks)) : null;

  const { row: buttonRow, primary } = buildButtons(ctx, level, outcome, next);
  const hint = outcome.won ? null : buildHint(level);
  const hop = createHopStrip(outcome.saved);

  append(section, scoreLine, meter, needed, badge, verdictP, beatClockP, relaxedP, buttonRow, hint, hop);

  return {
    element: section,
    title: joinUtterance([headlineText, verdictText]), // no "Level complete!. …"
    focusTarget: () => primary,
    destroy: () => {},
  };
}
