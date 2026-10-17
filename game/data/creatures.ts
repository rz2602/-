import type { Cost, Faction } from '../core/types';

export type Ability =
  | 'ranged'
  | 'flyer'
  | 'noRetaliation'
  | 'unlimitedRetaliation'
  | 'thorns'
  | 'doubleStrike'
  | 'shielded'
  | 'web'
  | 'immobile'
  | 'charge'
  | 'fearless';

export interface CreatureDef {
  id: string;
  name: string;
  /** Plural form for counts ("12 таралежа"). */
  plural: string;
  faction: Faction;
  tier: number;
  att: number;
  def: number;
  dmin: number;
  dmax: number;
  hp: number;
  spd: number;
  shots?: number;
  abilities: Ability[];
  growth: number;
  cost: Cost;
  /** Rough fighting value used by the AI and auto-resolve. */
  value: number;
  icon: string;
  /** Small accessory glyph drawn on the token (e.g. a bow). */
  badge?: string;
  desc: string;
}

export const ABILITY_TEXT: Record<Ability, string> = {
  ranged: 'Стрелец: атакува отдалеч.',
  flyer: 'Летец: прелита над препятствия.',
  noRetaliation: 'Удари-и-бягай: врагът не отвръща.',
  unlimitedRetaliation: 'Неуморен: отвръща на всяка атака.',
  thorns: 'Бодли: нападателят отблизо получава 25% от щетите обратно.',
  doubleStrike: 'Двоен удар: атакува два пъти.',
  shielded: 'Щит: половин щети от стрелци.',
  web: 'Паяжина: ударената цел губи половината си скорост за 2 рунда.',
  immobile: 'Неподвижен.',
  charge: 'Устрем: +5% щети за всяко изминато поле.',
  fearless: 'Безстрашен: моралът не му влияе.',
};

const defs: CreatureDef[] = [
  // ---- Горският съюз (Mishkontin) ----
  {
    id: 'mouse', name: 'Мишка-опълченец', plural: 'Мишки-опълченци', faction: 'forest', tier: 1,
    att: 3, def: 3, dmin: 1, dmax: 3, hp: 6, spd: 5, abilities: [], growth: 12, cost: { acorns: 45 }, value: 70,
    icon: '🐭', badge: '🗡️', desc: 'Смели, бързи и много. Носят тенджери вместо шлемове.',
  },
  {
    id: 'hedgehog', name: 'Таралеж-пазач', plural: 'Таралежи-пазачи', faction: 'forest', tier: 2,
    att: 4, def: 8, dmin: 2, dmax: 3, hp: 13, spd: 4, abilities: ['thorns'], growth: 8, cost: { acorns: 95 }, value: 150,
    icon: '🦔', desc: 'Бавен, но никой не обича да го прегръща.',
  },
  {
    id: 'squirrel', name: 'Катерица-прашкар', plural: 'Катерици-прашкари', faction: 'forest', tier: 3,
    att: 6, def: 3, dmin: 2, dmax: 4, hp: 10, spd: 7, shots: 10, abilities: ['ranged'], growth: 6,
    cost: { acorns: 140 }, value: 210, icon: '🐿️', badge: '🌰', desc: 'Стрелят с жълъди. Улучват почти винаги.',
  },
  {
    id: 'owl', name: 'Бухал-страж', plural: 'Бухали-стражи', faction: 'forest', tier: 4,
    att: 9, def: 7, dmin: 5, dmax: 8, hp: 26, spd: 9, abilities: ['flyer'], growth: 3,
    cost: { acorns: 320, wood: 1 }, value: 470, icon: '🦉', desc: 'Нощни пазачи на Сиренград. Виждат всичко.',
  },
  {
    id: 'bear', name: 'Мечок-закрилник', plural: 'Мечоци-закрилници', faction: 'forest', tier: 5,
    att: 12, def: 12, dmin: 9, dmax: 14, hp: 72, spd: 5, abilities: ['unlimitedRetaliation'], growth: 1,
    cost: { acorns: 950, cheese: 1 }, value: 1400, icon: '🐻', desc: 'Сънлив великан, който се събужда за приятелите си.',
  },

  // ---- Плъховата орда (Mortis) ----
  {
    id: 'rat', name: 'Плъх-дрипльо', plural: 'Плъхове-дрипльовци', faction: 'rats', tier: 1,
    att: 4, def: 2, dmin: 1, dmax: 3, hp: 6, spd: 6, abilities: [], growth: 14, cost: { acorns: 40 }, value: 65,
    icon: '🐀', desc: 'Гладни, нахални и винаги на тълпа.',
  },
  {
    id: 'beetle', name: 'Бръмбар-щитоносец', plural: 'Бръмбари-щитоносци', faction: 'rats', tier: 2,
    att: 3, def: 9, dmin: 1, dmax: 3, hp: 15, spd: 3, abilities: ['shielded'], growth: 8, cost: { acorns: 90 }, value: 140,
    icon: '🪲', desc: 'Носи черупката си като щит. Стрелите отскачат.',
  },
  {
    id: 'ratbow', name: 'Плъх-самострелец', plural: 'Плъхове-самострелци', faction: 'rats', tier: 3,
    att: 6, def: 3, dmin: 2, dmax: 5, hp: 9, spd: 5, shots: 8, abilities: ['ranged'], growth: 6,
    cost: { acorns: 135 }, value: 200, icon: '🐀', badge: '🏹', desc: 'Самострел от кламер и ластик. Боли.',
  },
  {
    id: 'bat', name: 'Прилеп-вестоносец', plural: 'Прилепи-вестоносци', faction: 'rats', tier: 4,
    att: 8, def: 5, dmin: 3, dmax: 7, hp: 19, spd: 10, abilities: ['flyer', 'noRetaliation'], growth: 3,
    cost: { acorns: 300, wood: 1 }, value: 430, icon: '🦇', desc: 'Удря и изчезва в тъмното.',
  },
  {
    id: 'badger', name: 'Язовец-наемник', plural: 'Язовци-наемници', faction: 'rats', tier: 5,
    att: 11, def: 10, dmin: 6, dmax: 9, hp: 66, spd: 6, abilities: ['doubleStrike'], growth: 1,
    cost: { acorns: 900, cheese: 1 }, value: 1350, icon: '🦡', desc: 'Бие се за сирене. Много сирене.',
  },

  // ---- Неутрални ----
  {
    id: 'wasp', name: 'Оса', plural: 'Оси', faction: 'neutral', tier: 1,
    att: 4, def: 2, dmin: 1, dmax: 3, hp: 5, spd: 9, abilities: ['flyer'], growth: 10, cost: { acorns: 50 }, value: 70,
    icon: '🐝', desc: 'Жужат сърдито около всичко сладко.',
  },
  {
    id: 'spider', name: 'Горски паяк', plural: 'Горски паяци', faction: 'neutral', tier: 2,
    att: 5, def: 4, dmin: 2, dmax: 4, hp: 11, spd: 5, abilities: ['web'], growth: 7, cost: { acorns: 100 }, value: 150,
    icon: '🕷️', desc: 'Плете мрежи там, където е най-неудобно.',
  },
  {
    id: 'frog', name: 'Блатна жаба', plural: 'Блатни жаби', faction: 'neutral', tier: 2,
    att: 5, def: 5, dmin: 2, dmax: 4, hp: 14, spd: 4, abilities: [], growth: 7, cost: { acorns: 90 }, value: 140,
    icon: '🐸', desc: 'Квака страшно, но е по-скоро любопитна.',
  },
  {
    id: 'mushroom', name: 'Гъбар', plural: 'Гъбари', faction: 'neutral', tier: 2,
    att: 3, def: 7, dmin: 1, dmax: 4, hp: 14, spd: 3, abilities: ['fearless'], growth: 7, cost: { acorns: 80 }, value: 120,
    icon: '🍄', desc: 'Тих горски народ. Не обича да го настъпват.',
  },
  {
    id: 'wolf', name: 'Вълк', plural: 'Вълци', faction: 'neutral', tier: 3,
    att: 7, def: 5, dmin: 3, dmax: 6, hp: 18, spd: 8, abilities: ['charge'], growth: 5, cost: { acorns: 200 }, value: 260,
    icon: '🐺', desc: 'Бързи ловци от Сивия гъсталак.',
  },
  {
    id: 'boar', name: 'Глиган', plural: 'Глигани', faction: 'neutral', tier: 4,
    att: 10, def: 8, dmin: 5, dmax: 9, hp: 36, spd: 7, abilities: ['charge'], growth: 2, cost: { acorns: 450 }, value: 620,
    icon: '🐗', desc: 'Минава направо. През всичко.',
  },
  {
    id: 'ghost', name: 'Таласъм', plural: 'Таласъми', faction: 'neutral', tier: 4,
    att: 9, def: 7, dmin: 4, dmax: 8, hp: 30, spd: 7, abilities: ['flyer', 'fearless'], growth: 2, cost: { acorns: 420 },
    value: 540, icon: '👻', desc: 'Стар страх от старите мини. Всъщност е самотен.',
  },
  {
    id: 'tower', name: 'Стрелкова кула', plural: 'Стрелкови кули', faction: 'neutral', tier: 0,
    att: 10, def: 10, dmin: 8, dmax: 14, hp: 120, spd: 1, shots: 99, abilities: ['ranged', 'immobile', 'fearless'], growth: 0,
    cost: {}, value: 0, icon: '🗼', desc: 'Защитава града.',
  },
];

export const CREATURES: Record<string, CreatureDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

export const FACTION_LINE: Record<'forest' | 'rats', string[]> = {
  forest: ['mouse', 'hedgehog', 'squirrel', 'owl', 'bear'],
  rats: ['rat', 'beetle', 'ratbow', 'bat', 'badger'],
};

export function creature(id: string): CreatureDef {
  const c = CREATURES[id];
  if (!c) throw new Error(`Unknown creature ${id}`);
  return c;
}

export function hasAbility(cid: string, a: Ability): boolean {
  return creature(cid).abilities.includes(a);
}

/** "12 таралежа" style label: singular for 1, plural otherwise. */
export function stackLabel(cid: string, n: number): string {
  const c = creature(cid);
  return `${n} ${n === 1 ? c.name : c.plural}`;
}

/** HoMM-style vague army size words for unexplored/neutral stacks. */
export function sizeWord(n: number): string {
  if (n < 5) return 'Няколко';
  if (n < 10) return 'Малко';
  if (n < 20) return 'Глутница от';
  if (n < 50) return 'Много';
  if (n < 100) return 'Тълпа';
  return 'Легион';
}
