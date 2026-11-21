/** Tiny DOM helpers: the game UI is plain HTML on top of the 3D scene. */

type Child = Node | string | number | null | undefined | false;

export interface Props {
  class?: string;
  style?: string;
  title?: string;
  disabled?: boolean;
  onclick?: (e: MouseEvent) => void;
  onmouseenter?: (e: MouseEvent) => void;
  onmouseleave?: (e: MouseEvent) => void;
  oninput?: (e: Event) => void;
  value?: string;
  type?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    if (props.class) el.className = props.class;
    if (props.style) el.setAttribute('style', props.style);
    if (props.title) el.title = props.title;
    if (props.onclick) el.onclick = props.onclick;
    if (props.onmouseenter) el.onmouseenter = props.onmouseenter;
    if (props.onmouseleave) el.onmouseleave = props.onmouseleave;
    if (props.oninput) el.oninput = props.oninput;
    if (el instanceof HTMLButtonElement && props.disabled) el.disabled = true;
    if (el instanceof HTMLInputElement) {
      if (props.type) el.type = props.type;
      // Range bounds before the value, or the browser clamps the value to the default range.
      if (props.min) el.min = props.min;
      if (props.max) el.max = props.max;
      if (props.step) el.step = props.step;
      if (props.value !== undefined) el.value = props.value;
      if (props.placeholder) el.placeholder = props.placeholder;
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
  return el;
}

/** Replace everything inside `el`. */
export function fill(el: HTMLElement, ...children: Child[]) {
  el.replaceChildren();
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'number' ? String(c) : c);
  }
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A promise that resolves when one of the buttons it builds is clicked. */
export function choose<T>(build: (resolve: (value: T) => void) => void): Promise<T> {
  return new Promise((resolve) => build(resolve));
}
