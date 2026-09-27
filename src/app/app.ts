/**
 * Bootstrap: create the long-lived services once, wire settings → audio/motion/announcer, unlock
 * audio on the first user gesture, install the test hook and show the title screen.
 * Owner: E5c (E0: stage overlay, announcer level, ScreenContext additions, auto-pause hooks).
 */
import { AudioEngine } from '../audio/audio-engine.ts';
import { MusicPlayer } from '../audio/music.ts';
import type { SfxId } from '../audio/sfx-ids.ts';
import { resolveBindings } from '../input/bindings.ts';
import { InputManager } from '../input/input-manager.ts';
import { LEVELS, TIERS } from '../levels/registry.ts';
import type { Settings } from '../persistence/schema.ts';
import { SaveStore, type KeyValueStore } from '../persistence/storage.ts';
import { Camera, VIEW_HEIGHT, VIEW_WIDTH } from '../render/camera.ts';
import { crosshairCursorCss } from '../render/cursor.ts';
import { Renderer } from '../render/renderer.ts';
import { Announcer } from '../ui/announcer.ts';
import type { UiSoundKind } from '../ui/screens/screen.ts';
import { STAGE_HELP_TEXT } from '../ui/strings.ts';
import { resolveScale } from './scale.ts';
import type { FrameScheduler } from './game-loop.ts';
import { Router } from './router.ts';
import { createScreen, type ScreenHost } from './screens.ts';
import type { AppServices } from './services.ts';
import { installTestHook } from './test-hook.ts';

const UI_SOUNDS: Readonly<Record<UiSoundKind, SfxId>> = { move: 'ui-move', select: 'ui-select', deny: 'ui-deny', back: 'ui-back' };

export function startApp(doc: Document): void {
  const byId = <T extends HTMLElement>(id: string): T => {
    const el = doc.getElementById(id);
    if (!el) throw new Error(`#${id} missing from index.html`);
    return el as T;
  };
  const canvas = byId<HTMLCanvasElement>('game-canvas');
  const stage = byId<HTMLElement>('stage');
  const screenRoot = byId<HTMLElement>('screen-root');
  const stageOverlay = byId<HTMLElement>('stage-overlay');

  byId('stage-help').textContent = STAGE_HELP_TEXT;

  const save = new SaveStore(safeLocalStorage());
  const audio = new AudioEngine(save.current.settings);
  const music = new MusicPlayer(audio);
  const announcer = new Announcer(byId('announcer-polite'), byId('announcer-assertive'));
  const renderer = new Renderer(canvas);
  const camera = new Camera();
  const scheduler: FrameScheduler = {
    request: (cb) => window.requestAnimationFrame(cb),
    cancel: (handle) => window.cancelAnimationFrame(handle),
  };
  const bindings = () => resolveBindings(save.current.settings.bindings);
  const input = new InputManager({
    pointerTarget: canvas,
    keyTarget: window,
    bindings: bindings(),
    toWorld: (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      if (clientX < r.left || clientY < r.top || clientX >= r.right || clientY >= r.bottom) return null;
      return camera.toWorld(((clientX - r.left) / r.width) * canvas.width, ((clientY - r.top) / r.height) * canvas.height);
    },
  });
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reducedMotion = (): boolean => {
    const pref = save.current.settings.motion;
    return pref === 'reduce' || (pref === 'system' && motionQuery.matches);
  };

  const services: AppServices = {
    save, audio, music, announcer, renderer, camera, input, scheduler, canvas, stage, stageOverlay, bindings, reducedMotion,
  };

  // DESIGN §5.1: integer-scale the 400×160 backing store to the viewport (pixel-perfect, no
  // blur; src/app/scale.ts has the rule + unit tests). Re-fit on resize or a scale-setting change.
  const fitCanvas = (): void => {
    const scale = resolveScale(window.innerWidth, window.innerHeight, save.current.settings.scale);
    canvas.style.width = `${VIEW_WIDTH * scale}px`;
    canvas.style.height = `${VIEW_HEIGHT * scale}px`;
  };
  window.addEventListener('resize', fitCanvas);

  const applySettings = (settings: Settings): void => {
    audio.setVolumes(settings);
    music.setEnabled(settings.musicEnabled);
    announcer.setLevel(settings.announcements);
    input.setBindings(bindings());
    canvas.style.cursor = crosshairCursorCss(settings.cursorSize);
    const root = doc.documentElement;
    root.dataset['motion'] = reducedMotion() ? 'reduce' : 'full';
    root.dataset['contrast'] = settings.highContrast ? 'high' : 'normal';
    fitCanvas();
  };
  applySettings(save.current.settings);
  save.subscribe((data) => applySettings(data.settings));
  motionQuery.addEventListener('change', () => applySettings(save.current.settings));

  const host: ScreenHost = {
    services,
    currentGame: null,
    context: {
      navigate: (route) => router.go(route),
      save,
      levels: LEVELS,
      tiers: TIERS,
      bindings,
      announce: (message, options) => announcer.say(message, options),
      uiSound: (kind) => audio.play(UI_SOUNDS[kind]),
      reducedMotion,
    },
  };
  const router: Router = new Router(screenRoot, stage, announcer, (route) => createScreen(route, host));

  // Audio may only start after a user gesture; never before. Escape is not a user activation in
  // browsers, so it is skipped; listeners stay until the context is actually running.
  const unlockAudio = (event: Event): void => {
    if (event instanceof KeyboardEvent && event.key === 'Escape') return;
    audio.unlock();
    if (!audio.unlocked) return; // resume() is async: a later gesture re-checks (unlock is idempotent)
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
    // DESIGN §8.6: the title jingle plays once per session, on the first gesture while the title
    // screen is showing (MusicPlayer.playTitleJingle is itself idempotent per session).
    if (router.route?.screen === 'title') music.playTitleJingle();
  };
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  // DESIGN §6.4.8 auto-pause: tab hidden (fairness + no background CPU); window blur when
  // settings.pauseOnBlur (the controller checks the setting). Never auto-resumes.
  doc.addEventListener('visibilitychange', () => {
    if (doc.hidden) host.currentGame?.autoPause('hidden');
  });
  window.addEventListener('blur', () => host.currentGame?.autoPause('blur'));

  installTestHook(router, host);
  router.go({ screen: 'title' });
}

/** localStorage, or null when unavailable (privacy mode, disabled storage, sandboxed iframe). */
function safeLocalStorage(): KeyValueStore | null {
  try {
    const storage = window.localStorage;
    const probe = '__mumblemarch_probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
