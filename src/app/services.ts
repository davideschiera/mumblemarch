/**
 * The app's long-lived services, created once in app.ts and shared by screens/controllers.
 * Owner: E5c (E0 added `stageOverlay`).
 */
import type { AudioEngine } from '../audio/audio-engine.ts';
import type { MusicPlayer } from '../audio/music.ts';
import type { InputManager } from '../input/input-manager.ts';
import type { KeyBindings } from '../input/bindings.ts';
import type { SaveStore } from '../persistence/storage.ts';
import type { Camera } from '../render/camera.ts';
import type { Renderer } from '../render/renderer.ts';
import type { Announcer } from '../ui/announcer.ts';
import type { FrameScheduler } from './game-loop.ts';

export interface AppServices {
  readonly save: SaveStore;
  readonly audio: AudioEngine;
  readonly music: MusicPlayer;
  readonly announcer: Announcer;
  readonly renderer: Renderer;
  readonly camera: Camera;
  readonly input: InputManager;
  readonly scheduler: FrameScheduler;
  /** The persistent game canvas itself (400×160 backing store; app.ts fits its CSS size). */
  readonly canvas: HTMLCanvasElement;
  /** Container of the persistent game canvas (shown only on screens with `usesStage`). */
  readonly stage: HTMLElement;
  /** `#stage-overlay`, positioned over the canvas: the game view mounts its plates here (DESIGN §5.3). */
  readonly stageOverlay: HTMLElement;
  bindings(): KeyBindings;
  reducedMotion(): boolean;
}
