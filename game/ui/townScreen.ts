import { costText, RES_INFO, townIncome } from '../core/adventure';
import { visitTown } from '../core/town';
import {
  build,
  buildBlocker,
  canHire,
  hireCandidates,
  hireHero,
  learnableSpells,
  marketBuy,
  marketSell,
  maxRecruit,
  moveStack,
  recruit,
  recruitTarget,
  recruitUnitCost,
  visitingHero,
} from '../core/town';
import type { Army, GameState, ResKey, Town } from '../core/types';
import { creature } from '../data/creatures';
import { HERO_TEMPLATES, SPECIALTIES } from '../data/heroes';
import { SPELLS } from '../data/magic';
import { BUILD_ORDER, BUILDINGS, buildingDesc, buildingName, dwellingCreature, MARKET_RATE, TAVERN_HERO_COST } from '../data/towns';
import type { App } from './app';
import { clear, esc, h, modal, tip } from './dom';
import { drawTown, ownerColor, portraitCanvas } from './gfx';
import { armyRow, slotEl } from './widgets';

type Tab = 'build' | 'market' | 'tavern';

export class TownScreen {
  private body = h('div', { class: 'town' });
  private tab: Tab = 'build';
  private sel: { army: 'g' | 'h'; i: number } | null = null;
  private recruitOpen: string | null = null;

  constructor(
    private app: App,
    private s: GameState,
    private t: Town,
    private onClose: () => void,
  ) {}

  open(): void {
    this.render();
    modal(this.app.root, this.body, { onClose: this.onClose });
  }

  private render(): void {
    const { s, t } = this;
    const b = this.body;
    clear(b);
    const inc = townIncome(t);
    const pic = h('canvas', { width: 90, height: 70, style: 'width:90px;height:70px' });
    drawTown(pic.getContext('2d')!, 45, 34, 52, t.faction, ownerColor(t.owner), t.special);
    b.append(
      h('div', { class: 'town-head' },
        pic,
        h('div', { class: 'grow' },
          h('h2', null, t.name),
          h('div', { class: 'muted' }, `Доход: ${costText(inc)} на ден · ${t.builtToday ? 'Днес вече строихте.' : 'Днес може да се построи една сграда.'}`),
          h('div', { class: 'row', style: 'gap:10px;margin-top:4px;font-weight:800' },
            (Object.keys(RES_INFO) as ResKey[]).map((k) => h('span', null, `${RES_INFO[k].icon} ${s.players.player.res[k]}`)))),
        h('div', { class: 'tabs' },
          this.tabBtn('build', '🏗️ Сгради'),
          t.built.includes('market') ? this.tabBtn('market', '⚖️ Пазар') : null,
          t.built.includes('tavern') ? this.tabBtn('tavern', '🍺 Странноприемница') : null),
      ),
    );
    const left = h('div', { style: 'overflow:auto;min-height:0' });
    if (this.tab === 'build') left.append(this.buildingsPanel());
    else if (this.tab === 'market') left.append(this.marketPanel());
    else left.append(this.tavernPanel());
    b.append(left);
    b.append(this.recruitPanel());
    b.append(this.armiesPanel());
  }

  private tabBtn(tab: Tab, label: string): HTMLElement {
    return h('button', { class: this.tab === tab ? 'on' : '', onclick: () => { this.tab = tab; this.render(); } }, label);
  }

  private buildingsPanel(): HTMLElement {
    const { s, t } = this;
    const grid = h('div', { class: 'buildings' });
    const ids = [...t.built.filter((x) => BUILDINGS[x]?.special), 'hall', ...BUILD_ORDER];
    for (const id of ids) {
      const def = BUILDINGS[id];
      if (!def) continue;
      const built = t.built.includes(id);
      const block = built ? null : buildBlocker(s, t, id);
      const cid = dwellingCreature(t.faction, id);
      const reqs = def.requires.filter((r) => !t.built.includes(r)).map((r) => buildingName(t.faction, r));
      const card = h(
        'div',
        {
          class: `bld${built ? ' built' : ''}${!built && !block ? ' can' : ''}`,
          onclick: () => {
            if (!built && !block && build(s, t, id)) {
              s.toasts.push({ text: `Построено: ${buildingName(t.faction, id)}`, icon: '🏗️' });
              this.render();
            }
          },
        },
        h('div', { class: 'nm' }, `${built ? '✅ ' : ''}${cid ? `${creature(cid).icon} ` : ''}${buildingName(t.faction, id)}`),
        h('div', { class: 'muted' }, cid ? `Жилище на ${creature(cid).plural.toLowerCase()} (+${creature(cid).growth}/седм.)` : buildingDesc(t.faction, id)),
        !built ? h('div', { class: 'cost' }, costText(def.cost)) : null,
        !built && reqs.length ? h('div', { class: 'muted', style: 'font-size:12px' }, `Нужно: ${reqs.join(', ')}`) : null,
        !built && block && !reqs.length && block !== 'Не стигат ресурсите.' ? h('div', { class: 'muted', style: 'font-size:12px' }, block) : null,
      );
      grid.append(card);
    }
    return grid;
  }

  private marketPanel(): HTMLElement {
    const s = this.s;
    const box = h('div', null, h('h3', null, '⚖️ Пазар'), h('p', { class: 'muted' }, 'Тук може да размениш ресурси срещу жълъди и обратно.'));
    for (const k of ['wood', 'stone', 'cheese'] as const) {
      const rate = MARKET_RATE[k];
      box.append(
        h('div', { class: 'recruit-row' },
          h('div', { class: 'emoji', style: 'font-size:30px' }, RES_INFO[k].icon),
          h('div', { class: 'grow' }, h('b', null, RES_INFO[k].name), h('div', { class: 'muted', style: 'font-size:13px' }, `Продаваш за ${rate.sell} 🌰 · купуваш за ${rate.buy} 🌰 · имаш ${s.players.player.res[k]}`)),
          h('button', { class: 'small', disabled: s.players.player.res[k] < 1, onclick: () => { marketSell(s, 'player', k, 1); this.render(); } }, 'Продай 1'),
          h('button', { class: 'small', disabled: s.players.player.res[k] < 5, onclick: () => { marketSell(s, 'player', k, 5); this.render(); } }, 'Продай 5'),
          h('button', { class: 'small primary', disabled: s.players.player.res.acorns < rate.buy, onclick: () => { marketBuy(s, 'player', k, 1); this.render(); } }, 'Купи 1'),
        ),
      );
    }
    return box;
  }

  private tavernPanel(): HTMLElement {
    const { s, t } = this;
    const box = h('div', null, h('h3', null, '🍺 Странноприемница'), h('p', { class: 'muted' }, `Наеми нов герой за ${TAVERN_HERO_COST} 🌰. Героите събират ресурси и пазят земите ти.`));
    const block = canHire(s, t);
    for (const id of hireCandidates(s, 'player')) {
      const tpl = HERO_TEMPLATES[id];
      const pic = portraitCanvas(tpl.portrait, 56);
      box.append(
        h('div', { class: 'recruit-row' },
          pic,
          h('div', { class: 'grow' },
            h('b', null, `${tpl.name}, ${tpl.title}`),
            h('div', { class: 'muted', style: 'font-size:13px' }, `${SPECIALTIES[tpl.specialty]?.name}: ${SPECIALTIES[tpl.specialty]?.desc}`),
            h('div', { class: 'muted', style: 'font-size:13px;font-style:italic' }, tpl.bio)),
          h('button', { class: 'primary', disabled: !!block, title: block ?? '', onclick: () => { if (hireHero(s, t, id)) { s.toasts.push({ text: `${tpl.name} се присъедини!`, icon: '🎉' }); this.render(); } } }, 'Наеми'),
        ),
      );
    }
    if (block) box.append(h('p', { class: 'muted' }, block));
    return box;
  }

  private recruitPanel(): HTMLElement {
    const { s, t } = this;
    const box = h('div', { class: 'town-right' }, h('h3', { style: 'margin:0' }, '🛡️ Наемане'));
    const dwellings = t.built.filter((x) => dwellingCreature(t.faction, x));
    if (!dwellings.length) box.append(h('div', { class: 'muted' }, 'Няма жилища. Построй ги от „Сгради“.'));
    for (const b of dwellings.sort()) {
      const cid = dwellingCreature(t.faction, b)!;
      const c = creature(cid);
      const avail = t.available[cid] ?? 0;
      const max = maxRecruit(s, 'player', cid, avail);
      const target = recruitTarget(s, t, cid);
      const row = h('div', { class: 'recruit-row' },
        slotEl({ cid, n: avail }),
        h('div', { class: 'grow' },
          h('b', null, c.name),
          h('div', { class: 'muted', style: 'font-size:13px' }, `Свободни: ${avail} · ${costText(recruitUnitCost(s, cid, 'player'))} за един`)),
        h('button', { class: 'small primary', disabled: max < 1 || !target, title: !target ? 'Няма свободно място в армиите' : '', onclick: () => { this.recruitOpen = this.recruitOpen === cid ? null : cid; this.render(); } }, 'Наеми'),
      );
      box.append(row);
      if (this.recruitOpen === cid && max > 0 && target) {
        let n = max;
        const label = h('b', null, String(n));
        const cost = h('span', { class: 'muted' }, '');
        const upd = () => {
          label.textContent = String(n);
          const u = recruitUnitCost(s, cid, 'player');
          const total: Partial<Record<ResKey, number>> = {};
          for (const k of Object.keys(u) as ResKey[]) total[k] = (u[k] ?? 0) * n;
          cost.textContent = costText(total);
        };
        const range = h('input', { type: 'range', min: 1, max, value: max, oninput: (e: Event) => { n = Number((e.target as HTMLInputElement).value); upd(); } });
        upd();
        box.append(
          h('div', { class: 'recruit-row', style: 'border-color:var(--gold)' },
            h('div', { class: 'qty grow' }, range, label, cost),
            h('button', { class: 'small primary', onclick: () => { if (recruit(s, t, cid, n)) { this.recruitOpen = null; this.render(); } } }, 'Купи')),
        );
      }
    }
    // Library
    if (t.built.includes('library')) {
      const vh = visitingHero(s, t);
      box.append(h('h3', { style: 'margin:6px 0 0' }, '📖 Библиотека'));
      box.append(
        h('div', { class: 'chips' },
          t.spells
            .filter((sp) => SPELLS[sp].level <= (t.built.includes('library2') ? 3 : 1))
            .map((sp) => tip(h('span', { class: 'chip' }, `${SPELLS[sp].icon} ${SPELLS[sp].name}`), esc(`Ниво ${SPELLS[sp].level}, ${SPELLS[sp].cost} магия. ${SPELLS[sp].desc}${SPELLS[sp].level === 3 ? ' (Нужно е умение Магьосничество.)' : ''}`))),
        ),
        h('div', { class: 'muted', style: 'font-size:13px' }, vh ? `${vh.name} знае ${learnableSpells(t, vh).filter((x) => vh.spells.includes(x)).length} от тях.` : 'Героите научават магиите, когато влязат в града.'),
      );
    }
    return box;
  }

  private armiesPanel(): HTMLElement {
    const { s, t } = this;
    const hero = visitingHero(s, t);
    const click = (army: 'g' | 'h', i: number, e: MouseEvent) => {
      const get = (a: 'g' | 'h'): Army => (a === 'g' ? t.garrison : hero!.army);
      if (!this.sel) {
        if (get(army)[i]) this.sel = { army, i };
      } else if (this.sel.army === army && this.sel.i === i) this.sel = null;
      else {
        const from = get(this.sel.army);
        const st = from[this.sel.i];
        if (st) moveStack(from, this.sel.i, get(army), i, e.shiftKey ? Math.floor(st.n / 2) || 1 : null, this.sel.army === 'h');
        this.sel = null;
      }
      this.render();
    };
    return h('div', { class: 'town-armies' },
      h('div', null,
        h('div', { class: 'side-title' }, 'Гарнизон'),
        armyRow(t.garrison, { selected: this.sel?.army === 'g' ? this.sel.i : null, onClick: (i, e) => click('g', i, e) })),
      hero
        ? h('div', null,
            h('div', { class: 'side-title' }, `${hero.name} (гостуващ герой)`),
            armyRow(hero.army, { selected: this.sel?.army === 'h' ? this.sel.i : null, onClick: (i, e) => click('h', i, e) }))
        : h('div', { class: 'muted', style: 'max-width:260px;font-size:13px' }, 'Няма герой в града. Влез с герой, за да му дадеш войска.'),
      h('div', { class: 'muted grow', style: 'font-size:12px;text-align:right' }, 'Щракни отряд, после място. Shift разделя наполовина.', h('br'), 'Ново наетите отиват при героя (ако има място), иначе в гарнизона.'),
      hero ? h('button', { onclick: () => { visitTown(s, hero, t); this.allToHero(); } }, 'Всички към героя ⬆') : null,
    );
  }

  private allToHero(): void {
    const hero = visitingHero(this.s, this.t);
    if (!hero) return;
    for (let i = 0; i < this.t.garrison.length; i++) {
      const st = this.t.garrison[i];
      if (!st) continue;
      const j = hero.army.findIndex((x) => x && x.cid === st.cid);
      const k = j >= 0 ? j : hero.army.findIndex((x) => !x);
      if (k >= 0) moveStack(this.t.garrison, i, hero.army, k, null, false);
    }
    this.render();
  }
}
