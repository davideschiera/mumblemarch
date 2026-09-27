/** Focus-management helpers shared by screens and dialogs. */
export const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Focus `el` without scrolling the page; makes non-focusable targets (headings) focusable. */
export function focusElement(el: HTMLElement | null | undefined): void {
  if (!el) return;
  if (!el.matches(FOCUSABLE) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

export function firstFocusable(container: ParentNode): HTMLElement | null {
  return container.querySelector<HTMLElement>(FOCUSABLE);
}
