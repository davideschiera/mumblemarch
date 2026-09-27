/**
 * Pure press-modifier rule for the playfield pointer (DESIGN §6.1.3): Shift, or the right button
 * already held, makes a left press "walkers only" for that single press (combined with the
 * filter chip in `Selection.pickAt`). Split out so the rule is Node-testable.
 * Owner: E4a.
 */

/** `buttons` is the PointerEvent bitmask (1 left, 2 right, 4 middle). */
export function pressWalkersOnly(shiftKey: boolean, buttons: number): boolean {
  return shiftKey || (buttons & 2) !== 0;
}
