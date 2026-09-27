/**
 * Pure key-ownership rules (DESIGN §6.2.6): does the currently focused element handle a key
 * `code` itself, so the InputManager must leave it alone instead of firing a game action?
 * `FocusedElementInfo` is a DOM-free description of `document.activeElement` (computed by
 * `input-manager.ts` from the real DOM), so the rule itself is Node-testable.
 * Owner: E4a.
 */

export interface FocusedElementInfo {
  /** A text-entry control that owns its own typing (text-ish `<input>`, `<textarea>`, contentEditable). */
  readonly isTextEntry: boolean;
  /** Inside an open `<dialog>` (the dialog owns every key while open). */
  readonly inDialog: boolean;
  /** Closest ancestor-or-self is a button/link/input/select/textarea/summary/`[role="button"]`. */
  readonly ownsActivation: boolean;
  /** Closest ancestor-or-self is a slider/select/listbox/radiogroup/`[data-arrow-keys]` widget. */
  readonly ownsWidgetKeys: boolean;
}

/** Space/Enter: native "press" on the focused control. */
const ACTIVATION_KEYS: ReadonlySet<string> = new Set(['Space', 'Enter']);
/** Arrows + Home/End/PageUp/PageDown: belong to sliders, selects and composite widgets. */
const WIDGET_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown',
]);

/**
 * True when `code` belongs to the focused element rather than to a game action: text entry and
 * open dialogs claim every key; Space/Enter activate a focused control; the widget keys belong to
 * a roving-tabindex toolbar or a slider (`data-arrow-keys`, §6.2.6).
 */
export function ownsKey(info: FocusedElementInfo, code: string): boolean {
  if (info.isTextEntry || info.inDialog) return true;
  if (ACTIVATION_KEYS.has(code)) return info.ownsActivation;
  if (WIDGET_KEYS.has(code)) return info.ownsWidgetKeys;
  return false;
}
