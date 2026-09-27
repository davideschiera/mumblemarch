/**
 * Settings screen (DESIGN §7.11 all fields, §5.4 layout, §6.2.6 focus). Native form elements,
 * ≥44px rows; every change calls `ctx.save.updateSettings` at once and shows a shared "Saved"
 * status (role=status). Overlay mode (pause menu → Settings, `ScreenBuildOptions.overlay`,
 * screen.ts): heading is an `<h2>`, a single "Close" button gets initial focus and calls
 * `ctx.navigate(back)` (closes the dialog); everything else is identical and live. The
 * Controls fieldset (rebinding) lives in `settings-controls.ts`.
 */
import type {
  AnnouncementLevel,
  AssignTiming,
  CaptionsLevel,
  CursorSize,
  GameSpeedSetting,
  MotionPreference,
  Settings,
} from '../../persistence/schema.ts';
import { h } from '../dom.ts';
import { SETTINGS } from '../strings.ts';
import { SETTINGS_BACK, SETTINGS_CLOSE, SETTINGS_TITLE } from '../strings/settings.ts';
import { createControlsSection } from './settings-controls.ts';
import type { Route, Screen, ScreenBuildOptions, ScreenContext } from './screen.ts';

type NumberFieldKey = 'masterVolume' | 'sfxVolume' | 'voiceVolume' | 'musicVolume';
type BoolFieldKey =
  | 'muted'
  | 'musicEnabled'
  | 'highContrast'
  | 'showKeyHints'
  | 'relaxedTimer'
  | 'fallRuler'
  | 'unlockAll'
  | 'edgeScroll'
  | 'cameraFollow'
  | 'pauseOnBlur'
  | 'pauseWhileChoosing';

export function createSettingsScreen(ctx: ScreenContext, back: Route, options: ScreenBuildOptions = {}): Screen {
  const overlay = options.overlay ?? false;
  const current = (): Settings => ctx.save.current.settings;

  const status = h('p', { class: 'settings-status', role: 'status' });
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  const announceSaved = (): void => {
    status.textContent = SETTINGS.rebind.saved;
    if (savedTimer !== undefined) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (status.textContent = ''), 2500);
  };

  function sliderField(key: NumberFieldKey, label: string): HTMLElement {
    const id = `set-${key}`;
    const pct = Math.round(current()[key] * 100);
    const input = h('input', { type: 'range', min: 0, max: 100, step: 5, id, value: pct });
    const output = h('output', { for: id, class: 'settings-output' }, `${pct}%`);
    input.addEventListener('input', () => {
      const value = Number(input.value);
      output.textContent = `${value}%`;
      ctx.save.updateSettings({ [key]: value / 100 } as Partial<Settings>);
      announceSaved();
    });
    return h('div', { class: 'settings-row' }, h('label', { for: id, class: 'settings-row__label' }, label), input, output);
  }

  function boolField(key: BoolFieldKey, label: string): HTMLElement {
    const id = `set-${key}`;
    const input = h('input', { type: 'checkbox', id, checked: current()[key] });
    input.addEventListener('change', () => {
      ctx.save.updateSettings({ [key]: input.checked } as Partial<Settings>);
      announceSaved();
    });
    return h('div', { class: 'settings-row settings-row--inline' }, input, h('label', { for: id }, label));
  }

  function radioField(
    key: string,
    legend: string,
    optionsList: readonly { readonly value: string; readonly label: string }[],
    currentValue: string,
    onChange: (value: string) => void,
  ): HTMLElement {
    const name = `set-${key}`;
    const items = optionsList.map(({ value, label }) => {
      const id = `${name}-${value}`;
      const input = h('input', { type: 'radio', name, id, value, checked: value === currentValue });
      input.addEventListener('change', () => {
        if (!input.checked) return;
        onChange(value);
        announceSaved();
      });
      return h('div', { class: 'settings-radio' }, input, h('label', { for: id }, label));
    });
    return h('fieldset', { class: 'settings-subgroup' }, h('legend', {}, legend), h('div', { class: 'settings-radio-row' }, ...items));
  }

  const SCALE_OPTIONS = [
    { value: '0', label: SETTINGS.options.scale.auto },
    { value: '2', label: SETTINGS.options.scale['2'] },
    { value: '3', label: SETTINGS.options.scale['3'] },
    { value: '4', label: SETTINGS.options.scale['4'] },
  ];
  const MOTION_OPTIONS = (['system', 'reduce', 'full'] as const).map((v) => ({ value: v, label: SETTINGS.options.motion[v] }));
  const CURSOR_OPTIONS = [
    { value: '32', label: SETTINGS.options.cursorSize['32'] },
    { value: '48', label: SETTINGS.options.cursorSize['48'] },
    { value: '64', label: SETTINGS.options.cursorSize['64'] },
  ];
  const CAPTIONS_OPTIONS = (['off', 'barks', 'all'] as const).map((v) => ({ value: v, label: SETTINGS.options.captions[v] }));
  const ANNOUNCE_OPTIONS = (['off', 'essential', 'all'] as const).map((v) => ({ value: v, label: SETTINGS.options.announcements[v] }));
  const GAME_SPEED_OPTIONS = [
    { value: '1', label: SETTINGS.options.gameSpeed['1'] },
    { value: '0.75', label: SETTINGS.options.gameSpeed['0.75'] },
    { value: '0.5', label: SETTINGS.options.gameSpeed['0.5'] },
  ];

  function assignOnField(): HTMLElement {
    const id = 'set-assignOn';
    const input = h('input', { type: 'checkbox', id, checked: current().assignOn === 'release' });
    input.addEventListener('change', () => {
      const assignOn: AssignTiming = input.checked ? 'release' : 'press';
      ctx.save.updateSettings({ assignOn });
      announceSaved();
    });
    return h('div', { class: 'settings-row settings-row--inline' }, input, h('label', { for: id }, SETTINGS.fields.assignOn));
  }

  const soundFieldset = h(
    'fieldset',
    {},
    h('legend', {}, SETTINGS.sections.sound),
    boolField('muted', SETTINGS.fields.muted),
    sliderField('masterVolume', SETTINGS.fields.masterVolume),
    sliderField('sfxVolume', SETTINGS.fields.sfxVolume),
    sliderField('voiceVolume', SETTINGS.fields.voiceVolume),
    sliderField('musicVolume', SETTINGS.fields.musicVolume),
    boolField('musicEnabled', SETTINGS.fields.musicEnabled),
  );

  const displayFieldset = h(
    'fieldset',
    {},
    h('legend', {}, SETTINGS.sections.display),
    radioField('scale', SETTINGS.fields.scale, SCALE_OPTIONS, String(current().scale), (v) =>
      ctx.save.updateSettings({ scale: Number(v) }),
    ),
    radioField('motion', SETTINGS.fields.motion, MOTION_OPTIONS, current().motion, (v) =>
      ctx.save.updateSettings({ motion: v as MotionPreference }),
    ),
    boolField('highContrast', SETTINGS.fields.highContrast),
    radioField('cursorSize', SETTINGS.fields.cursorSize, CURSOR_OPTIONS, String(current().cursorSize), (v) =>
      ctx.save.updateSettings({ cursorSize: Number(v) as CursorSize }),
    ),
    radioField('captions', SETTINGS.fields.captions, CAPTIONS_OPTIONS, current().captions, (v) =>
      ctx.save.updateSettings({ captions: v as CaptionsLevel }),
    ),
    boolField('showKeyHints', SETTINGS.fields.showKeyHints),
  );

  const playFieldset = h(
    'fieldset',
    {},
    h('legend', {}, SETTINGS.sections.play),
    boolField('relaxedTimer', SETTINGS.fields.relaxedTimer),
    boolField('fallRuler', SETTINGS.fields.fallRuler),
    boolField('unlockAll', SETTINGS.fields.unlockAll),
    radioField('announcements', SETTINGS.fields.announcements, ANNOUNCE_OPTIONS, current().announcements, (v) =>
      ctx.save.updateSettings({ announcements: v as AnnouncementLevel }),
    ),
    boolField('edgeScroll', SETTINGS.fields.edgeScroll),
    boolField('cameraFollow', SETTINGS.fields.cameraFollow),
    assignOnField(),
    boolField('pauseOnBlur', SETTINGS.fields.pauseOnBlur),
    boolField('pauseWhileChoosing', SETTINGS.fields.pauseWhileChoosing),
    radioField('gameSpeed', SETTINGS.fields.gameSpeed, GAME_SPEED_OPTIONS, String(current().gameSpeed), (v) =>
      ctx.save.updateSettings({ gameSpeed: Number(v) as GameSpeedSetting }),
    ),
  );

  const controls = createControlsSection(ctx, announceSaved);

  const heading = document.createElement(overlay ? 'h2' : 'h1');
  heading.className = 'screen__title';
  heading.tabIndex = -1;
  heading.textContent = SETTINGS_TITLE;

  const navButton = h(
    'button',
    { type: 'button', class: `button${overlay ? ' button--primary' : ''}`, onclick: () => ctx.navigate(back) },
    overlay ? SETTINGS_CLOSE : SETTINGS_BACK,
  );

  // Esc = back on the full screen (DESIGN §5.4). In overlay mode the native <dialog> already
  // closes on Escape, so this only needs to defer to it (never call preventDefault there) — but
  // it must still yield to an in-progress key capture either way; `settings-controls.ts` runs its
  // own window-level guard first (registered on `window`, which is dispatched before `document`
  // in the capture phase), so this handler only ever sees Escape once no capture is active.
  function onEscBack(event: KeyboardEvent): void {
    if (overlay || event.code !== 'Escape') return;
    event.preventDefault();
    ctx.navigate(back);
  }
  document.addEventListener('keydown', onEscBack, true);

  const section = h(
    'section',
    { class: `screen screen--settings${overlay ? ' screen--overlay' : ''}` },
    heading,
    soundFieldset,
    displayFieldset,
    playFieldset,
    controls.element,
    status,
    navButton,
  );

  return {
    element: section,
    title: 'Settings',
    destroy(): void {
      document.removeEventListener('keydown', onEscBack, true);
      controls.destroy();
      if (savedTimer !== undefined) clearTimeout(savedTimer);
    },
    // Non-overlay: omitted, so the router falls back to the screen's <h1> (default focus).
    ...(overlay ? { focusTarget: () => navButton } : {}),
  };
}
