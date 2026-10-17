import { dayLabel, playerHeroes } from '../core/adventure';
import { applyLevelUp, heroAtt, heroDef, heroKno, heroLuck, heroMaxMp, heroMorale, heroPow, maxSp, skill, VIRTUE_INFO, virtueRank } from '../core/hero';
import { moveStack } from '../core/town';
import type { GameState, Hero } from '../core/types';
import { VIRTUES } from '../core/types';
import { SPECIALTIES, XP_LEVELS } from '../data/heroes';
import { ARTIFACTS, ITEMS, SKILLS, SPELLS } from '../data/magic';
import { getScenario } from '../data/scenarios';
import type { AdventureScreen } from './adventureScreen';
import type { App } from './app';
import { clear, confirmBox, esc, h, infoBox, modal, tip } from './dom';
import { portraitEl } from './gfx';
import { listSaves, loadGame, saveGame, SLOTS, type Slot } from './save';
import { armyRow } from './widgets';

export function heroPanel(root: HTMLElement, s: GameState, hero: Hero, onChange: () => void): void {
  const body = h('div', { style: 'width:min(760px,92vw)' });
  let sel: number | null = null;
  const render = () => {
    clear(body);
    const next = XP_LEVELS[hero.level] ?? hero.xp;
    const prev = XP_LEVELS[hero.level - 1] ?? 0;
    const pct = next > prev ? Math.round(((hero.xp - prev) / (next - prev)) * 100) : 100;
    const spec = SPECIALTIES[hero.specialty];
    body.append(
      h('div', { class: 'row', style: 'align-items:flex-start;gap:16px' },
        h('div', { style: 'width:120px;height:130px;display:flex;align-items:flex-end;justify-content:center' }, portraitEl(hero.portrait, hero.portrait === 'mishkontin' ? 130 : 110)),
        h('div', { class: 'grow' },
          h('h2', { style: 'margin-bottom:2px' }, hero.name),
          h('div', { class: 'muted' }, `${hero.title} · ниво ${hero.level} · опит ${hero.xp}${next > hero.xp ? ` / ${next}` : ''}`),
          h('div', { class: 'mpbar', style: 'height:8px;margin:6px 0 8px' }, h('div', { style: `width:${pct}%;background:linear-gradient(90deg,#d9b45f,#ffe9a0)` })),
          spec ? h('div', null, h('b', null, `Специалност: ${spec.name}. `), h('span', { class: 'muted' }, spec.desc)) : null,
          h('div', { class: 'chips', style: 'margin-top:8px' },
            statChip('⚔️', 'Нападение', heroAtt(hero), 'Увеличава щетите на всички отряди.'),
            statChip('🛡️', 'Защита', heroDef(hero), 'Намалява получените щети.'),
            statChip('🔮', 'Сила', heroPow(hero), 'Сила на магиите.'),
            statChip('📚', 'Знание', heroKno(hero, s), 'Точки магия: 10 за всяко знание.'),
            statChip('🙂', 'Морал', heroMorale(hero, s), 'Шанс за допълнителен ход в битка.'),
            statChip('🍀', 'Късмет', heroLuck(hero, s), 'Шанс за двойни щети.'),
            statChip('🥾', 'Движение', `${hero.mp}/${heroMaxMp(hero)}`, 'Точки движение по картата днес.'),
            statChip('✨', 'Магия', `${hero.sp}/${maxSp(hero, s)}`, 'Точки магия.'),
          ),
        ),
      ),
      h('h3', { style: 'margin-top:12px' }, 'Умения'),
      h('div', { class: 'chips' },
        Object.keys(hero.skills).length
          ? (Object.keys(hero.skills) as (keyof typeof SKILLS)[]).map((k) => tip(h('span', { class: 'chip' }, `${SKILLS[k].icon} ${SKILLS[k].name} ${'★'.repeat(skill(hero, k))}`), esc(SKILLS[k].levels[skill(hero, k) - 1])))
          : h('span', { class: 'muted' }, 'Още няма.'),
      ),
      h('h3', { style: 'margin-top:12px' }, 'Артефакти'),
      h('div', { class: 'chips' },
        hero.artifacts.length
          ? hero.artifacts.map((a) => tip(h('span', { class: 'chip' }, `${ARTIFACTS[a]?.icon ?? '✨'} ${ARTIFACTS[a]?.name ?? a}`), esc(ARTIFACTS[a]?.desc ?? '')))
          : h('span', { class: 'muted' }, 'Няма.'),
      ),
      h('h3', { style: 'margin-top:12px' }, 'Магии'),
      h('div', { class: 'chips' },
        hero.spells.length
          ? hero.spells.map((sp) => tip(h('span', { class: 'chip' }, `${SPELLS[sp].icon} ${SPELLS[sp].name} (${SPELLS[sp].cost})`), esc(`Ниво ${SPELLS[sp].level}. ${SPELLS[sp].desc}`)))
          : h('span', { class: 'muted' }, 'Няма. Построй Библиотека в град.'),
      ),
      h('h3', { style: 'margin-top:12px' }, 'Армия'),
      h('div', { class: 'muted', style: 'font-size:13px;margin-bottom:4px' }, 'Щракни отряд, после друго място, за да ги размениш. Shift+щракване разделя отряда наполовина.'),
      armyRow(hero.army, {
        selected: sel,
        onClick: (i, e) => {
          if (sel == null) {
            if (hero.army[i]) sel = i;
          } else if (sel === i) sel = null;
          else {
            const st = hero.army[sel];
            if (st) moveStack(hero.army, sel, hero.army, i, e.shiftKey ? Math.floor(st.n / 2) : null, false);
            sel = null;
            onChange();
          }
          render();
        },
      }),
    );
  };
  render();
  modal(root, body, { onClose: onChange });
}

function statChip(icon: string, name: string, value: number | string, desc: string): HTMLElement {
  return tip(h('span', { class: 'chip' }, `${icon} ${name}: `, h('b', null, String(value))), `<b>${name}</b><br>${desc}`);
}

export function levelUpModal(root: HTMLElement, s: GameState, hero: Hero, next: () => void): void {
  const offer = hero.pendingLevelUps[0];
  const statName = { att: '⚔️ Нападение', def: '🛡️ Защита', pow: '🔮 Сила', kno: '📚 Знание' }[offer.stat];
  let close = () => {};
  const pickSkill = (k: (typeof offer.options)[number] | null) => {
    hero.pendingLevelUps.shift();
    applyLevelUp(hero, offer, k);
    close();
    next();
  };
  const box = h(
    'div',
    { style: 'width:min(520px,90vw);text-align:center' },
    h('div', { style: 'display:flex;justify-content:center' }, portraitEl(hero.portrait, 110, 'happy')),
    h('h2', null, `${hero.name} достига ниво ${hero.level - hero.pendingLevelUps.length + 1}!`),
    h('p', { style: 'font-size:17px' }, `${statName} +1`),
    offer.options.length ? h('p', null, 'Избери умение:') : null,
    h('div', { class: 'row', style: 'justify-content:center;gap:10px;flex-wrap:wrap' },
      offer.options.map((k) => {
        const lvl = skill(hero, k) + 1;
        return h('button', { class: 'primary', style: 'min-width:200px;text-align:left', onclick: () => pickSkill(k) },
          h('div', { style: 'font-size:17px' }, `${SKILLS[k].icon} ${SKILLS[k].name} ${'★'.repeat(lvl)}`),
          h('div', { style: 'font-weight:600;font-size:13px;opacity:.9' }, SKILLS[k].levels[lvl - 1]));
      }),
      offer.options.length ? null : h('button', { class: 'primary', onclick: () => pickSkill(null) }, 'Добре'),
    ),
  );
  close = modal(root, box, { closable: false, parch: true });
  void s;
}

export function questLog(root: HTMLElement, s: GameState): void {
  const sc = getScenario(s.scenario);
  const body = h(
    'div',
    { style: 'width:min(680px,92vw)' },
    h('h2', null, `Глава ${sc.number}: ${sc.title}`),
    h('div', { class: 'muted' }, dayLabel(s.day)),
    h('h3', { style: 'margin-top:10px' }, 'Цели'),
    h('ul', { class: 'goals' }, sc.goals.map((g) => h('li', null, g))),
    h('h3', null, 'Задачи'),
    s.quests.length ? s.quests.map((q) => h('div', { class: `quest${q.done ? ' done' : ''}` }, h('b', null, `${q.done ? '✅ ' : '📌 '}${q.title}`), h('div', { class: 'muted', style: 'font-size:14px' }, q.text))) : h('div', { class: 'muted' }, 'Няма.'),
    h('h3', { style: 'margin-top:10px' }, 'Предмети'),
    h('div', { class: 'chips' }, s.items.length ? s.items.map((i) => h('span', { class: 'chip' }, `${ITEMS[i]?.icon ?? '📜'} ${ITEMS[i]?.name ?? i}`)) : h('span', { class: 'muted' }, 'Няма.')),
    h('h3', { style: 'margin-top:10px' }, 'Добродетели'),
    h('div', { class: 'muted', style: 'font-size:13px;margin-bottom:4px' }, 'Изборите ти в историята трупат добродетели. На 2 и 4 точки те дават бонуси и отключват нови възможности по-късно.'),
    VIRTUES.map((v) =>
      h('div', { class: 'quest' }, h('b', null, `${VIRTUE_INFO[v].icon} ${VIRTUE_INFO[v].name}: ${s.virtues[v] ?? 0}`), h('div', { class: 'muted', style: 'font-size:14px' }, `Сега: ${VIRTUE_INFO[v].ranks[virtueRank(s, v)]}`)),
    ),
    h('h3', { style: 'margin-top:10px' }, 'Дневник'),
    h('div', { class: 'muted', style: 'font-size:13px;max-height:140px;overflow:auto' }, s.log.slice(-25).reverse().map((l) => h('div', null, l))),
  );
  modal(root, body);
}

export function saveLoadModal(app: App, s: GameState | null, screen: AdventureScreen | null): void {
  const body = h('div', { style: 'width:min(560px,92vw)' });
  let close = () => {};
  const render = () => {
    clear(body);
    body.append(h('h2', null, s ? 'Запис и зареждане' : 'Зареди игра'));
    const metas = listSaves();
    for (const slot of SLOTS) {
      const m = metas.find((x) => x.slot === slot);
      const label = slot === 'auto' ? 'Автоматичен запис' : `Място ${slot}`;
      const canSave = !!s && slot !== 'auto' && s.turn === 'player' && !s.battle && s.status === 'play';
      body.append(
        h('div', { class: 'save-slot' },
          h('div', { class: 'grow' },
            h('b', null, label),
            h('div', { class: 'muted', style: 'font-size:13px' }, m ? `${m.title} · ден ${m.day} · Мишконтин ниво ${m.level} · ${new Date(m.savedAt).toLocaleString('bg-BG')}` : 'празно')),
          canSave
            ? h('button', {
                class: 'small primary',
                onclick: () => {
                  const doSave = () => {
                    const ok = saveGame(s!, slot as Slot);
                    infoBox(app.root, ok ? 'Записано' : 'Грешка', ok ? 'Играта е записана.' : 'Браузърът не позволи запис (може би е в личен режим).', ok ? '💾' : '⚠️');
                    render();
                  };
                  if (m) confirmBox(app.root, 'Да презапиша ли това място?', 'Презапиши', doSave);
                  else doSave();
                },
              }, 'Запиши')
            : null,
          m
            ? h('button', {
                class: 'small',
                onclick: () => {
                  const st = loadGame(slot as Slot);
                  if (!st) {
                    infoBox(app.root, 'Грешка', 'Записът не може да бъде прочетен.', '⚠️');
                    return;
                  }
                  close();
                  app.startState(st);
                },
              }, 'Зареди')
            : null,
        ),
      );
    }
  };
  render();
  close = modal(app.root, body);
  void screen;
  void playerHeroes;
}
