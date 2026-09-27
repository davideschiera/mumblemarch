/**
 * Tiny DOM builder — the whole "framework". `h('button', { class: 'x', onclick }, 'Label')`.
 * - `on*` function props become event listeners
 * - `true` → empty attribute, `false`/`undefined` → omitted, anything else → string attribute
 */
export type Child = Node | string | number | null | undefined | false;
export type Attrs = Readonly<Record<string, string | number | boolean | undefined | ((event: Event) => void)>>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) el.setAttribute(key, '');
    else if (value !== false && value !== undefined) el.setAttribute(key, String(value));
  }
  append(el, ...children);
  return el;
}

export function append(parent: Node, ...children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/** Set text only when it changed (cheap to call every frame). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
