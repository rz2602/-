import { campaignAfterVictory, newCampaign, newGame } from '../core/adventure';
import { VIRTUE_INFO } from '../core/hero';
import type { CampaignState, Difficulty, GameState } from '../core/types';
import { VIRTUES } from '../core/types';
import { CHARACTERS } from '../data/characters';
import { getScenario, presetCampaign, SCENARIO_ORDER, SCENARIOS } from '../data/scenarios';
import { AdventureScreen } from './adventureScreen';
import { isMusicOn, isSfxOn, mapTheme, music, setMusicOn, setSfxOn, sfx } from './audio';
import { clear, confirmBox, h, infoBox, modal } from './dom';
import { portraitEl, preloadImages } from './gfx';
import { saveLoadModal } from './panels';
import { latestSave, loadCampaign, loadGame, saveCampaign, saveGame } from './save';

export class App {
  adventure: AdventureScreen | null = null;
  private screenEl: HTMLElement | null = null;

  constructor(public root: HTMLElement) {}

  async boot(): Promise<void> {
    await preloadImages(['img/mishkontin-idle.webp', 'img/bg-siren.webp']);
    this.showMenu();
  }

  private clearScreen(): void {
    this.adventure?.destroy();
    this.adventure = null;
    this.screenEl?.remove();
    this.screenEl = null;
    for (const o of Array.from(this.root.querySelectorAll('.overlay, .combat'))) o.remove();
  }

  // -------------------------------------------------------------------------
  // Main menu
  // -------------------------------------------------------------------------

  showMenu(): void {
    this.clearScreen();
    music('menu');
    const last = latestSave();
    const camp = loadCampaign();
    const buttons = h('div', { class: 'menu-buttons' });
    if (last) buttons.append(h('button', { class: 'primary', onclick: () => this.loadSlot(last.slot) }, `▶ Продължи (${last.title}, ден ${last.day})`));
    if (camp?.next) buttons.append(h('button', { class: last ? '' : 'primary', onclick: () => this.startScenario(camp.next!, camp.c) }, `📜 Следваща глава: ${getScenario(camp.next).title}`));
    buttons.append(
      h('button', { class: last || camp?.next ? '' : 'primary', onclick: () => this.chooseDifficulty() }, '✨ Нова кампания'),
      h('button', { onclick: () => this.chapterSelect() }, '📖 Избери глава'),
      h('button', { onclick: () => saveLoadModal(this, null, null) }, '💾 Зареди игра'),
      h('div', { class: 'row', style: 'gap:9px' },
        h('button', { class: 'grow', onclick: () => this.help() }, '❓ Как се играе'),
        h('button', { class: 'grow', onclick: () => this.storyBook() }, '🦉 Героите')),
      this.soundRow(),
    );
    if ('ontouchstart' in window && document.fullscreenEnabled) buttons.append(h('button', { onclick: () => goFullscreen() }, '⛶ Цял екран'));
    const el = h(
      'div',
      { class: 'screen' },
      h('div', { class: 'menu-bg', style: 'background-image:url(img/bg-siren.webp)' }),
      h('div', { class: 'menu-box' },
        h('div', { class: 'menu-title' }, 'Мишконтин', h('br'), h('span', { style: 'font-size:.62em' }, 'и кралят плъх Мортис')),
        h('div', { class: 'menu-sub' }, 'Приказна стратегия за смели мишки'),
        buttons,
        h('div', { class: 'menu-foot' }, 'Концепция в стил „Heroes of Might and Magic III“ · v0.2')),
    );
    this.screenEl = el;
    this.root.append(el);
  }

  /** Music / sound toggles (also used in the in-game menu). */
  soundRow(): HTMLElement {
    const row = h('div', { class: 'row', style: 'gap:9px' });
    const render = () => {
      clear(row);
      row.append(
        h('button', { class: 'grow', onclick: () => { setMusicOn(!isMusicOn()); render(); } }, isMusicOn() ? '🎵 Музика: да' : '🔇 Музика: не'),
        h('button', { class: 'grow', onclick: () => { setSfxOn(!isSfxOn()); render(); } }, isSfxOn() ? '🔔 Звуци: да' : '🔕 Звуци: не'),
      );
    };
    render();
    return row;
  }

  private chooseDifficulty(): void {
    let close = () => {};
    const pick = (d: Difficulty) => {
      close();
      const go = () => this.startScenario('s1', newCampaign(d));
      go();
    };
    const opt = (d: Difficulty, title: string, text: string) =>
      h('button', { style: 'text-align:left;width:100%', onclick: () => pick(d) }, h('div', { style: 'font-size:17px' }, title), h('div', { style: 'font-weight:600;font-size:13px;opacity:.85' }, text));
    close = modal(
      this.root,
      h('div', { style: 'width:min(440px,90vw);display:grid;gap:8px' },
        h('h2', null, 'Колко трудно да бъде?'),
        opt('easy', '🌱 Лесно', 'Повече жълъди в началото, по-малки чудовища, по-бедни плъхове. За първи поход.'),
        opt('normal', '🌳 Нормално', 'Така, както е замислено.'),
        opt('hard', '🌲 Трудно', 'Плъховете са богати, чудовищата — големи. За опитни пазители.')),
    );
  }

  private chapterSelect(): void {
    let close = () => {};
    const camp = loadCampaign();
    const box = h('div', { style: 'width:min(620px,92vw)' }, h('h2', null, 'Избери глава'), h('p', { class: 'muted' }, 'Може да започнеш всяка глава. Ако не си играл предишната, Мишконтин тръгва с готов опит и избори по подразбиране.'));
    for (const id of SCENARIO_ORDER) {
      const sc = SCENARIOS[id];
      const done = camp?.c.completed.includes(id);
      box.append(
        h('div', { class: 'save-slot' },
          h('div', { class: 'grow' }, h('b', null, `Глава ${sc.number}: ${sc.title}${done ? ' ✅' : ''}`), h('div', { class: 'muted', style: 'font-size:13px' }, sc.goals[0])),
          h('button', { class: 'primary small', onclick: () => { close(); this.startScenario(id, presetCampaign(id, camp?.c)); } }, 'Започни')),
      );
    }
    close = modal(this.root, box);
  }

  help(): void {
    const box = h(
      'div',
      { class: 'help', style: 'width:min(720px,92vw)' },
      h('h2', null, 'Как се играе'),
      h('p', null, 'Водиш Мишконтин и приятелите му из Приказната гора. Всеки ден героите имат точки движение. Градовете дават жълъди и нови воини всяка седмица. Изборите в разговорите трупат добродетели — Смелост, Доброта и Мъдрост — които променят историята по-нататък.'),
      h('h3', null, 'Картата'),
      h('ul', null,
        h('li', null, 'Щракни върху поле: показва се пътят (зелено — стигаш днес, оранжево — по-късно). Щракни пак или натисни Интервал, за да тръгнеш.'),
        h('li', null, 'Щракни върху своя герой или град, за да ги отвориш. Десен бутон показва подробности.'),
        h('li', null, 'Влачи картата с мишката или със стрелките/WASD. Колелцето увеличава и намалява.'),
        h('li', null, 'Чудовищата пазят полетата около себе си — минеш ли до тях, има битка.'),
        h('li', null, 'Мините, дъскорезниците и мандрите дават ресурси всеки ден, след като ги вземеш.'),
        h('li', null, 'Клавиши: E — край на хода, H — следващ герой, T — град, Q — задачи, C — центрирай, Esc — меню.')),
      h('h3', null, 'Градът'),
      h('ul', null,
        h('li', null, 'По една сграда на ден. Жилищата дават нови същества всяка седмица (в първия ден на седмицата).'),
        h('li', null, 'Наетите отиват при героя в града (ако има място), иначе в гарнизона, който пази града.'),
        h('li', null, 'Щракни отряд и после място, за да местиш войска. Shift+щракване разделя отряда.')),
      h('h3', null, 'Битката'),
      h('ul', null,
        h('li', null, 'Отрядите действат по скорост. Щракни поле, за да преместиш, или враг, за да нападнеш. Посоката на мишката избира откъде да удариш.'),
        h('li', null, 'Стрелците стрелят отдалеч, но отблизо удрят наполовина. Всеки отряд отвръща веднъж на рунд.'),
        h('li', null, '„Изчакай“ отлага хода до края на рунда, „Защита“ дава +20% защита. Героят може да направи една магия на рунд.'),
        h('li', null, '„Авто“ и „Бързо“ оставят битката на компютъра. „Бягство“ спасява героя, но армията се губи.')),
    );
    modal(this.root, box);
  }

  storyBook(): void {
    const people: [string, string][] = [
      ['mishkontin', 'Малък полски мишок от Мъхово със зелено наметало, чанта, проста дървена тояга и златния медальон „М“ на дядо си. Чете карти като никой друг. Учи се, че не е нужно да носи всичко сам.'],
      ['belagor', 'Старият бял бухал, последният Пазител на картите в Сиренград. Мъдър, бавен, вечно търси очилата си. Крие стара вина.'],
      ['iskritsa', 'Рижата водачка на катериците-прашкари. Смела до безразсъдство. Учи се да мисли, преди да скочи.'],
      ['letokril', 'Прилепът-вестоносец на Мортис. Самотен и сприхав. Дали ще остане сам, зависи от теб.'],
      ['troshko', 'Таралеж-търговец с каруца, пълна с „безценни“ трошки. Пазари се за всичко, но сърцето му е по-меко от бодлите.'],
      ['mortis', 'Кралят плъх. Капачка от бутилка вместо корона, обида вместо сърце. Иска Вечната пита — и още нещо, за което не говори.'],
    ];
    const box = h('div', { style: 'width:min(720px,92vw)' }, h('h2', null, 'Героите на историята'));
    for (const [id, text] of people) {
      box.append(
        h('div', { class: 'row', style: 'align-items:center;gap:14px;margin:10px 0' },
          h('div', { style: 'width:90px;height:90px;display:flex;align-items:flex-end;justify-content:center;flex:none' }, portraitEl(id, id === 'mishkontin' ? 96 : 76)),
          h('div', null, h('b', { style: 'font-size:17px' }, CHARACTERS[id].name), h('div', { class: 'muted' }, text))),
      );
    }
    modal(this.root, box);
  }

  // -------------------------------------------------------------------------
  // Scenario flow
  // -------------------------------------------------------------------------

  startScenario(id: string, campaign: CampaignState): void {
    this.clearScreen();
    music('menu');
    const sc = getScenario(id);
    const el = h(
      'div',
      { class: 'screen' },
      h('div', { class: 'menu-bg', style: `background-image:url(${sc.bg})` }),
      h('div', { class: 'intro' },
        h('div', { class: 'panel parch' },
          h('div', { class: 'dlg-title' }, `Глава ${sc.number}`),
          h('h2', { style: 'font-size:30px' }, sc.title),
          sc.intro.map((p) => h('p', null, p)),
          h('h3', null, 'Цели'),
          h('ul', { class: 'goals' }, sc.goals.map((g) => h('li', null, g))),
          h('div', { class: 'row', style: 'justify-content:flex-end' },
            h('button', { onclick: () => this.showMenu() }, 'Назад'),
            h('button', { class: 'primary', id: 'start-scenario', onclick: () => {
              const s = newGame(id, campaign);
              saveCampaign(campaign, id);
              saveGame(s, 'auto');
              this.startState(s);
            } }, 'Започни ▸')))),
    );
    this.screenEl = el;
    this.root.append(el);
  }

  startState(s: GameState): void {
    this.clearScreen();
    music(mapTheme(s));
    this.adventure = new AdventureScreen(this, s);
    this.adventure.mount();
  }

  loadSlot(slot: Parameters<typeof loadGame>[0]): void {
    const s = loadGame(slot);
    if (!s) {
      infoBox(this.root, 'Грешка', 'Записът не може да бъде прочетен.', '⚠️');
      return;
    }
    this.startState(s);
  }

  gameMenu(adv: AdventureScreen): void {
    let close = () => {};
    close = modal(
      this.root,
      h('div', { style: 'width:min(340px,86vw);display:grid;gap:8px' },
        h('h2', null, 'Меню'),
        h('button', { class: 'primary', onclick: () => close() }, 'Продължи играта'),
        h('button', { onclick: () => { close(); saveLoadModal(this, adv.s, adv); } }, '💾 Запис / зареждане'),
        h('button', { onclick: () => { close(); this.help(); } }, '❓ Как се играе'),
        this.soundRow(),
        h('button', { onclick: () => { close(); confirmBox(this.root, 'Да започна ли главата отначало?', 'Отначало', () => this.startScenario(adv.s.scenario, adv.s.campaign)); } }, '↺ Започни главата отначало'),
        h('button', { class: 'danger', onclick: () => { close(); confirmBox(this.root, 'Към главното меню? Последният автоматичен запис е от началото на деня.', 'Главно меню', () => this.showMenu()); } }, '⌂ Главно меню')),
    );
  }

  showEnd(s: GameState): void {
    const sc = getScenario(s.scenario);
    const won = s.status === 'won';
    sfx(won ? 'victory' : 'defeat');
    music(won ? 'menu' : null);
    const idx = SCENARIO_ORDER.indexOf(s.scenario);
    const next = won ? SCENARIO_ORDER[idx + 1] ?? null : null;
    let camp: CampaignState | null = null;
    if (won) {
      camp = campaignAfterVictory(s);
      saveCampaign(camp, next);
    }
    const virtues = h('div', { class: 'chips', style: 'justify-content:center;margin:8px 0' },
      VIRTUES.map((v) => h('span', { class: 'chip' }, `${VIRTUE_INFO[v].icon} ${VIRTUE_INFO[v].name}: ${s.virtues[v] ?? 0}`)));
    let close = () => {};
    const box = h(
      'div',
      { class: 'endscreen' },
      h('div', { class: 'big' }, won ? (next ? '🏆 Главата е завършена!' : '🌟 Край на приказката') : '🍂 Поражение'),
      h('h3', null, `Глава ${sc.number}: ${sc.title}`),
      h('p', { style: 'font-size:16px' }, won ? (next ? `Следва: „${getScenario(next).title}“. Мишконтин запазва опита, уменията и артефактите си, а изборите ти ще имат последствия.` : 'Благодарим, че изигра историята на Мишконтин!') : s.endReason || 'Походът се провали.'),
      virtues,
      h('div', { class: 'row wrap', style: 'justify-content:center' },
        won && next ? h('button', { class: 'primary', id: 'next-chapter', onclick: () => { close(); this.startScenario(next, camp!); } }, 'Следваща глава ▸') : null,
        !won ? h('button', { class: 'primary', onclick: () => { close(); this.startScenario(s.scenario, s.campaign); } }, '↺ Опитай пак') : null,
        !won ? h('button', { onclick: () => { close(); this.loadSlot('auto'); } }, 'Зареди автоматичния запис') : null,
        h('button', { onclick: () => { close(); this.showMenu(); } }, '⌂ Главно меню')),
    );
    close = modal(this.root, box, { closable: false, parch: false });
  }
}

/** Fullscreen + landscape where the browser allows it (phones). */
export function goFullscreen(): void {
  const el = document.documentElement;
  el.requestFullscreen?.()
    .then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {});
}

export function mountApp(root: HTMLElement): App {
  clear(root);
  const app = new App(root);
  void app.boot();
  return app;
}
