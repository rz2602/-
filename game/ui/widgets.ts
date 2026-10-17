import { abilityLines } from '../core/combat';
import type { Army } from '../core/types';
import { creature } from '../data/creatures';
import { esc, h, tip } from './dom';

export function creatureTip(cid: string, n?: number): string {
  const c = creature(cid);
  const ab = abilityLines(cid).map((l) => `<br>• ${esc(l)}`).join('');
  return `<b>${esc(n != null ? `${n} × ${c.name}` : c.name)}</b><br>⚔️ Нападение ${c.att} · 🛡️ Защита ${c.def}<br>💥 Щети ${c.dmin}–${c.dmax} · ❤️ Живот ${c.hp}<br>💨 Скорост ${c.spd}${c.shots ? ` · 🏹 Изстрели ${c.shots}` : ''}${ab}<br><i>${esc(c.desc)}</i>`;
}

export function slotEl(st: { cid: string; n: number } | null, opts: { small?: boolean; selected?: boolean; onClick?: (e: MouseEvent) => void } = {}): HTMLElement {
  const el = h('div', { class: `slot${st ? '' : ' empty'}${opts.small ? ' small' : ''}${opts.selected ? ' sel' : ''}` });
  if (st) {
    const c = creature(st.cid);
    el.append(c.icon);
    if (c.badge) el.append(h('span', { class: 'b' }, c.badge));
    el.append(h('span', { class: 'n' }, String(st.n)));
    tip(el, () => creatureTip(st.cid, st.n));
  }
  if (opts.onClick) el.addEventListener('click', opts.onClick);
  return el;
}

export function armyRow(army: Army, opts: { small?: boolean; selected?: number | null; onClick?: (i: number, e: MouseEvent) => void } = {}): HTMLElement {
  return h(
    'div',
    { class: 'army' },
    army.map((st, i) => slotEl(st, { small: opts.small, selected: opts.selected === i, onClick: opts.onClick ? (e) => opts.onClick!(i, e) : undefined })),
  );
}
