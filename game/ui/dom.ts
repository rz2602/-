type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string };

/** Tiny hyperscript helper: h('div', {class: 'x', onclick: fn}, 'text', child). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: (Child | Child[])[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else if (k in el) (el as unknown as Record<string, unknown>)[k] = v;
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Shows a modal overlay inside `root`. Returns a close function. */
export function modal(root: HTMLElement, content: HTMLElement, opts: { onClose?: () => void; closable?: boolean; parch?: boolean } = {}): () => void {
  const panel = h('div', { class: `panel${opts.parch ? ' parch' : ''}` }, content);
  const ov = h('div', { class: 'overlay' }, panel);
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    ov.remove();
    window.removeEventListener('keydown', onKey, true);
    opts.onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && opts.closable !== false) {
      e.stopPropagation();
      close();
    }
  };
  if (opts.closable !== false) {
    panel.append(h('button', { class: 'close-x small', title: 'Затвори (Esc)', onclick: close }, '✕'));
    ov.addEventListener('mousedown', (e) => {
      if (e.target === ov) close();
    });
  }
  window.addEventListener('keydown', onKey, true);
  root.append(ov);
  return close;
}

export function confirmBox(root: HTMLElement, text: string, yes: string, onYes: () => void, no = 'Отказ'): void {
  let close = () => {};
  const box = h(
    'div',
    { style: 'max-width:420px' },
    h('p', { style: 'font-size:17px;margin:4px 0 14px' }, text),
    h(
      'div',
      { class: 'row', style: 'justify-content:flex-end' },
      h('button', { onclick: () => close() }, no),
      h('button', { class: 'primary', onclick: () => { close(); onYes(); } }, yes),
    ),
  );
  close = modal(root, box);
}

export function infoBox(root: HTMLElement, title: string, text: string, icon?: string, onClose?: () => void): void {
  let close = () => {};
  const box = h(
    'div',
    { style: 'max-width:440px;text-align:center' },
    icon ? h('div', { class: 'emoji', style: 'font-size:52px;line-height:1.1' }, icon) : null,
    h('h3', null, title),
    h('p', { style: 'font-size:16px;margin:4px 0 14px;line-height:1.45' }, text),
    h('button', { class: 'primary', onclick: () => close() }, 'Добре'),
  );
  close = modal(root, box, { onClose, parch: true });
  (box.querySelector('button.primary') as HTMLButtonElement | null)?.focus();
}

let tipEl: HTMLDivElement | null = null;
export function showTip(x: number, y: number, html: string): void {
  if (!tipEl) {
    tipEl = h('div', { class: 'tip' });
    document.body.append(tipEl);
  }
  tipEl.innerHTML = html;
  tipEl.style.display = 'block';
  const w = tipEl.offsetWidth;
  const hgt = tipEl.offsetHeight;
  tipEl.style.left = `${Math.min(window.innerWidth - w - 8, x + 14)}px`;
  tipEl.style.top = `${Math.min(window.innerHeight - hgt - 8, y + 14)}px`;
}
export function hideTip(): void {
  if (tipEl) tipEl.style.display = 'none';
}

/** Attach a hover tooltip to an element. */
export function tip<T extends HTMLElement>(el: T, html: string | (() => string)): T {
  el.addEventListener('mousemove', (e) => showTip(e.clientX, e.clientY, typeof html === 'function' ? html() : html));
  el.addEventListener('mouseleave', hideTip);
  return el;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}
