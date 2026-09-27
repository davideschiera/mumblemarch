/**
 * Hold-to-repeat and speed-ramp timing — pure and DOM-free (unit-testable in Node).
 * Shared by release rate (DESIGN §6.4.4), frame-step (§6.1.1), camera scroll (§6.1.1),
 * keyboard cursor (§6.2.4), edge zones (§6.1.3) and minimap keys (§7.2).
 * Owner: ui-lead (fully implemented in E0; E4/E5a use it — changes go through ui-lead).
 */

/**
 * Repeats a held control: the caller performs the first step on press, then `advance()` reports
 * how many repeat steps are due — the first after `delayMs`, then one every `intervalMs`.
 */
export class HoldRepeater {
  /** Delay before the first repeat (ms). */
  delayMs: number;
  /** Repeat period once repeating (ms). May change while held (e.g. Shift for release rate). */
  intervalMs: number;
  private heldFor = -1;
  private nextRepeatAt = 0;

  constructor(delayMs: number, intervalMs: number) {
    this.delayMs = delayMs;
    this.intervalMs = intervalMs;
  }

  get held(): boolean {
    return this.heldFor >= 0;
  }

  /** Milliseconds since `press()` (0 when not held). */
  get heldMs(): number {
    return Math.max(0, this.heldFor);
  }

  /** Start (or restart) holding. The caller performs the immediate first step itself. */
  press(): void {
    this.heldFor = 0;
    this.nextRepeatAt = this.delayMs;
  }

  release(): void {
    this.heldFor = -1;
  }

  /** Advance real time by `elapsedMs`; returns how many repeat steps are now due (0 when not held). */
  advance(elapsedMs: number): number {
    if (this.heldFor < 0) return 0;
    this.heldFor += elapsedMs;
    let steps = 0;
    while (this.heldFor >= this.nextRepeatAt) {
      steps++;
      this.nextRepeatAt += Math.max(1, this.intervalMs);
    }
    return steps;
  }
}

/**
 * Linear speed ramp for held movement: 0 before `delayMs`, then `from` rising to `to` over
 * `rampMs` (units of `from`/`to`, e.g. world px/s). Used by the keyboard cursor (60→180 px/s
 * over 600 ms after 150 ms) and edge zones (150→400 px/s over 1 s after a 120 ms dwell).
 */
export function rampSpeed(heldMs: number, delayMs: number, from: number, to: number, rampMs: number): number {
  if (heldMs < delayMs) return 0;
  const t = rampMs <= 0 ? 1 : Math.min(1, (heldMs - delayMs) / rampMs);
  return from + (to - from) * t;
}
