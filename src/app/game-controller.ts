/**
 * Compatibility re-export: the controller now lives in `app/game/controller.ts` (composition and
 * dispatch) with its behaviour split across the `app/game/*` modules.
 */
export { GameController, type ControllerState, type GameControllerOptions, type LoggedEvent } from './game/controller.ts';
