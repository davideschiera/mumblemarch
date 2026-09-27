/**
 * Level select: one <section> per tier, a roving-tabindex grid of level cards per tier.
 * DESIGN §5.4 "Level select" row, §7.2 (accessible names, grid roving), §7.9 (inTime badge),
 * §7.11 (Unlock all levels), §6.2.6 (landing focus). Reference: docs/design/mockups/menus.html.
 */
import type { LevelDef, TierId } from '../../levels/format.ts';
import type { LevelProgress } from '../../persistence/schema.ts';
import { firstUnfinishedLevelId, isLevelUnlocked } from '../../persistence/storage.ts';
import { joinUtterance } from '../announce-queue.ts';
import { h } from '../dom.ts';
import {
  LEVEL_CARD_STATE,
  LEVEL_SELECT,
  LEVELS_BACK,
  LEVELS_BADGE_ICON,
  LEVELS_IN_TIME_DESCRIPTION,
  LEVELS_LAST_PLAYED_DESCRIPTION,
  LEVELS_TIER_DIFFICULTY_LABEL,
  TIER_BLURBS,
  TIER_NAMES,
} from '../strings.ts';
import { drawCardThumbnail } from '../thumbnail.ts';
import { screenSection, type Screen, type ScreenContext } from './screen.ts';

/** VIS-6: the card thumbnail box's fixed CSS height — taller than VIS-5's 25px strip so it uses
 * the card's spare middle band (DESIGN §5.4 "a mini minimap"; target ~64–80 CSS px). The box's
 * WIDTH is the card's own rendered width (tracked live via `ResizeObserver`, see below), so
 * `drawCardThumbnail` can contain-fit the whole level into the real box at every breakpoint. */
const CARD_THUMB_HEIGHT = 72;
/** A reasonable pre-layout guess for the card's CSS width (DESIGN §5.4's 282px wireframe minus a
 * little), used only for the ONE synchronous draw at build time, before the card is attached to
 * the document and its `ResizeObserver` can report the real width; corrected on the next frame. */
const CARD_THUMB_FALLBACK_WIDTH = 260;
/** Cards per row at the 1200px layout (DESIGN §5.4) — also the roving grid's column count. */
const CARDS_PER_ROW = 4;

export function createLevelSelectScreen(ctx: ScreenContext, focusLevelId?: string): Screen {
  const { section, h1 } = screenSection('screen--levels', LEVEL_SELECT.title);
  const { levels, save } = ctx;
  const levelIds = levels.map((level) => level.id);
  const progress = save.current.progress;
  const unlockAll = save.current.settings.unlockAll;
  const lastLevelId = save.current.lastLevelId;
  const landingId =
    (focusLevelId && levelIds.includes(focusLevelId) ? focusLevelId : undefined) ??
    (lastLevelId && levelIds.includes(lastLevelId) ? lastLevelId : undefined) ??
    firstUnfinishedLevelId(levelIds, progress) ??
    levelIds[0];

  const back = h('button', { type: 'button', class: 'button levels__back', onclick: () => ctx.navigate({ screen: 'title' }) }, LEVELS_BACK);
  h1.after(back);

  let landingButton: HTMLButtonElement | null = null;

  // VIS-6: every card's thumbnail canvas is re-drawn to contain-fit its level whenever the
  // card's own rendered CSS width changes — one shared observer (mirrors the `--stage-w` pattern
  // in `ui/screens/game.ts`/`title.ts`) rather than measuring layout by hand at build time, since
  // cards are still detached from the document here and card width varies with the viewport
  // (§5.1: 4-column grid, no width media query) — so the FIRST real width only exists once the
  // router attaches this screen and the observer's first callback fires. It observes the CARD
  // BUTTON, not the canvas itself: `drawCardThumbnail` sets the canvas's own inline CSS width, so
  // a canvas observing its own box would only ever report the size it was just told to be, and
  // never notice the card growing/shrinking again. `contentRect` on the button is its content box
  // (padding excluded) — exactly the width the `width:100%` canvas would occupy.
  const thumbTargets = new WeakMap<HTMLButtonElement, { canvas: HTMLCanvasElement; level: LevelDef }>();
  let thumbResizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    thumbResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = thumbTargets.get(entry.target as HTMLButtonElement);
        if (target) drawCardThumbnail(target.canvas, target.level, entry.contentRect.width, CARD_THUMB_HEIGHT);
      }
    });
  }
  const registerThumb = (button: HTMLButtonElement, canvas: HTMLCanvasElement, level: LevelDef): void => {
    thumbTargets.set(button, { canvas, level });
    thumbResizeObserver?.observe(button);
  };

  for (const tier of ctx.tiers) {
    const tierLevels = levels.filter((level) => level.tier === tier.id);
    if (tierLevels.length === 0) continue;
    const { tierSection, buttons, landingIndex } = buildTierSection(ctx, tier.id, tierLevels, {
      allLevels: levels,
      levelIds,
      progress,
      unlockAll,
      lastLevelId,
      landingId,
      registerThumb,
    });
    section.append(tierSection);
    attachRovingGrid(tierSection, buttons, CARDS_PER_ROW, Math.max(0, landingIndex));
    if (landingIndex >= 0) landingButton = buttons[landingIndex] ?? null;
  }

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      ctx.navigate({ screen: 'title' });
    }
  });

  return {
    element: section,
    title: LEVEL_SELECT.title,
    focusTarget: () => landingButton,
    destroy: () => thumbResizeObserver?.disconnect(),
  };
}

interface TierBuildOptions {
  readonly allLevels: readonly LevelDef[];
  readonly levelIds: readonly string[];
  readonly progress: Readonly<Record<string, LevelProgress>>;
  readonly unlockAll: boolean;
  readonly lastLevelId: string | null;
  readonly landingId: string | undefined;
  readonly registerThumb: (button: HTMLButtonElement, canvas: HTMLCanvasElement, level: LevelDef) => void;
}

function buildTierSection(
  ctx: ScreenContext,
  tierId: TierId,
  tierLevels: readonly LevelDef[],
  opts: TierBuildOptions,
): { tierSection: HTMLElement; buttons: HTMLButtonElement[]; landingIndex: number } {
  const pips = h(
    'span',
    { class: 'tier__pips', role: 'img', 'aria-label': LEVELS_TIER_DIFFICULTY_LABEL(tierId) },
    ...Array.from({ length: 4 }, (_, i) => h('i', { class: i < tierId ? 'is-on' : '' })),
  );
  const head = h('div', { class: 'tier__head' }, pips, h('h2', {}, TIER_NAMES[tierId]), h('p', {}, TIER_BLURBS[tierId]));
  const list = h('ol', { class: 'levels' });
  const buttons: HTMLButtonElement[] = [];
  let landingIndex = -1;

  tierLevels.forEach((level) => {
    const globalIndex = opts.allLevels.indexOf(level);
    const { button } = buildCard(ctx, level, globalIndex, opts);
    buttons.push(button);
    if (level.id === opts.landingId) landingIndex = buttons.length - 1;
    list.append(h('li', {}, button));
  });

  const tierSection = h('section', { class: 'tier' }, head, list);
  // -1 when `landingId` isn't in this tier — the caller must not mistake that for "index 0".
  return { tierSection, buttons, landingIndex };
}

function buildCard(
  ctx: ScreenContext,
  level: LevelDef,
  globalIndex: number,
  opts: TierBuildOptions,
): { button: HTMLButtonElement } {
  const number = globalIndex + 1;
  const unlocked = isLevelUnlocked(opts.levelIds, globalIndex, opts.progress, opts.unlockAll);
  const record = opts.progress[level.id];
  const attempts = record?.attempts ?? 0;
  const completed = record?.completed === true;
  const bestSaved = record?.bestSaved ?? 0;
  const perfect = completed && bestSaved >= level.lemmings;
  const inTime = record?.inTime === true;
  const isNew = unlocked && attempts === 0;
  const isCurrent = level.id === opts.lastLevelId;

  const thumb = h('canvas', { class: 'level-card__thumb', 'aria-hidden': 'true' });
  drawCardThumbnail(thumb, level, CARD_THUMB_FALLBACK_WIDTH, CARD_THUMB_HEIGHT);

  const stateNodes: (Node | string)[] = [];
  let ariaState: string | undefined;
  if (!unlocked) {
    stateNodes.push(h('span', { 'aria-hidden': 'true' }, LEVELS_BADGE_ICON.locked), ' ', LEVEL_SELECT.locked(number - 1));
  } else if (perfect) {
    stateNodes.push(
      h('span', { class: 'level-card__badge level-card__badge--perfect', 'aria-hidden': 'true' }, `${LEVELS_BADGE_ICON.completed} ${LEVELS_BADGE_ICON.perfect}`),
      ' ',
      LEVEL_SELECT.perfect,
    );
    ariaState = LEVEL_CARD_STATE.perfect;
  } else if (completed) {
    stateNodes.push(h('span', { class: 'level-card__badge level-card__badge--done', 'aria-hidden': 'true' }, LEVELS_BADGE_ICON.completed), ' ', LEVEL_SELECT.completed(bestSaved, level.lemmings));
    ariaState = LEVEL_CARD_STATE.completed(bestSaved, level.lemmings);
  } else if (isNew) {
    stateNodes.push(h('span', { class: 'level-card__badge level-card__badge--new' }, LEVEL_SELECT.new));
    ariaState = LEVEL_CARD_STATE.new;
  }
  if (unlocked && inTime) {
    stateNodes.push(' ', h('span', { class: 'level-card__intime', 'aria-hidden': 'true', title: LEVELS_IN_TIME_DESCRIPTION }, LEVELS_BADGE_ICON.inTime));
  }

  // PLAY-A4: join with `joinUtterance` (adds a space after the first sentence's own '.') instead of
  // two sibling <span>s with no text node between them, which the accessible-description algorithm
  // concatenated with no separator ("limit.This").
  const descTexts: string[] = [];
  if (unlocked && inTime) descTexts.push(LEVELS_IN_TIME_DESCRIPTION);
  if (isCurrent) descTexts.push(LEVELS_LAST_PLAYED_DESCRIPTION);
  const descId = descTexts.length > 0 ? `level-card-desc-${level.id}` : undefined;

  // VIS-1 (axe label-content-name-mismatch, WCAG 2.5.3): axe compares the button's own RENDERED
  // text against its accessible name, `aria-hidden` notwithstanding (it's still visible on
  // screen). `titleSpan`/`stateSpan` used to sit with no text node between them, and the number
  // badge glued straight onto the title, so the rendered run ("1Spade ExpectationsNew") could
  // never be a literal substring of a name built from natural sentences — no amount of echoing
  // that same glued run back into the label makes it legible to a screen-reader user. Two real
  // fixes instead: (1) real whitespace TEXT NODES between the number/title/state parts below —
  // flex/grid ignore whitespace-only text nodes for layout, so nothing moves on screen; (2)
  // reorder the name so the visible run ("{n} {title} {state}") lands contiguous in it — the state
  // words move in front of the tier name (see `cardAriaName`'s own comment, strings.ts, for why
  // that now differs from DESIGN §7.2's literal "title. tier. state" order), and for a locked card
  // "Locked." moves to the front since nothing on the card actually renders that word.
  const friendlyLabel = unlocked
    ? LEVEL_SELECT.cardAriaName(number, level.title, TIER_NAMES[level.tier], ariaState)
    : `Locked. Level ${number}: ${level.title} ${LEVEL_SELECT.locked(number - 1)}. ${TIER_NAMES[level.tier]}.`;

  const titleSpan = h(
    'span',
    { class: 'level-card__title' },
    h('span', { class: 'level-card__num', 'aria-hidden': 'true' }, String(number)),
    ' ',
    level.title,
  );
  const stateSpan = h('span', { class: 'level-card__state' }, ...stateNodes);

  const button = h(
    'button',
    {
      type: 'button',
      class: `level-card${isCurrent ? ' is-current' : ''}`,
      'aria-label': friendlyLabel,
      ...(unlocked ? {} : { 'aria-disabled': 'true' }),
      ...(descId ? { 'aria-describedby': descId } : {}),
      onclick: () => {
        if (!unlocked) {
          ctx.uiSound('deny');
          ctx.announce(LEVEL_SELECT.cardAriaLocked(number - 1));
          return;
        }
        ctx.navigate({ screen: 'briefing', levelId: level.id });
      },
    },
    thumb,
    titleSpan,
    ' ',
    stateSpan,
    descId ? h('span', { id: descId, class: 'visually-hidden' }, joinUtterance(descTexts)) : null,
  );
  opts.registerThumb(button, thumb, level);
  return { button };
}

/**
 * ARIA "roving tabindex" grid (DESIGN §5.4/§7.2): exactly one card per tier is a Tab stop;
 * arrow keys move within the tier (←/→ by one, ↑/↓ by a row of `columns`), Home/End to the
 * tier's first/last card. Tab itself needs no handling — only one button per group has
 * `tabIndex 0`, so the browser's normal Tab order already lands on the next tier's grid.
 */
function attachRovingGrid(container: HTMLElement, buttons: readonly HTMLButtonElement[], columns: number, initialActive: number): void {
  if (buttons.length === 0) return;
  let active = Math.min(Math.max(0, initialActive), buttons.length - 1);
  const sync = (): void => buttons.forEach((button, i) => (button.tabIndex = i === active ? 0 : -1));
  sync();
  buttons.forEach((button, i) => button.addEventListener('focus', () => (active = i)));
  container.addEventListener('keydown', (event) => {
    let next = active;
    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(buttons.length - 1, active + 1);
        break;
      case 'ArrowLeft':
        next = Math.max(0, active - 1);
        break;
      case 'ArrowDown':
        next = Math.min(buttons.length - 1, active + columns);
        break;
      case 'ArrowUp':
        next = Math.max(0, active - columns);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== active) {
      active = next;
      sync();
    }
    buttons[active]?.focus();
  });
}
