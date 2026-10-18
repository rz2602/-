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
  /** Plural form for counts ("12 полевки"). */
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
  // ---- Съюзът на малките (Мишконтин и горските гризачи) ----
  {
    id: 'mouse', name: 'Полска мишка', plural: 'Полски мишки', faction: 'forest', tier: 1,
    att: 3, def: 3, dmin: 1, dmax: 3, hp: 6, spd: 5, abilities: [], growth: 12, cost: { acorns: 45 }, value: 70,
    icon: '🐭', badge: '🗡️', desc: 'Изгонени от домовете си от плъховете на Мортис. Малки, но много — и с големи сърца.',
  },
  {
    id: 'vole', name: 'Полевка', plural: 'Полевки', faction: 'forest', tier: 2,
    att: 4, def: 7, dmin: 2, dmax: 3, hp: 12, spd: 4, abilities: ['shielded'], growth: 8, cost: { acorns: 90 }, value: 145,
    icon: '🐹', desc: 'Копае ходници и се крие от изстрелите.',
  },
  {
    id: 'squirrel', name: 'Катерица', plural: 'Катерици', faction: 'forest', tier: 3,
    att: 6, def: 3, dmin: 2, dmax: 4, hp: 10, spd: 7, shots: 10, abilities: ['ranged'], growth: 6,
    cost: { acorns: 140 }, value: 210, icon: '🐿️', badge: '🌲', desc: 'Замеря с шишарки от върха на дървото. Рядко пропуска.',
  },
  {
    id: 'hare', name: 'Заек', plural: 'Зайци', faction: 'forest', tier: 4,
    att: 8, def: 6, dmin: 4, dmax: 7, hp: 24, spd: 10, abilities: ['charge'], growth: 3,
    cost: { acorns: 300, wood: 1 }, value: 450, icon: '🐇', desc: 'Най-бързият в гората. Рита със задните лапи.',
  },
  {
    id: 'eagle', name: 'Орел', plural: 'Орли', faction: 'forest', tier: 5,
    att: 13, def: 11, dmin: 10, dmax: 15, hp: 70, spd: 11, abilities: ['flyer', 'fearless'], growth: 1,
    cost: { acorns: 1000, cheese: 1 }, value: 1500, icon: '🦅', desc: 'Воините на крал Златокрил. Сянката им гони плъховете.',
  },

  // ---- Ордата на крал Мортис ----
  {
    id: 'rat', name: 'Плъх от тунелите', plural: 'Плъхове от тунелите', faction: 'rats', tier: 1,
    att: 4, def: 2, dmin: 1, dmax: 3, hp: 6, spd: 6, abilities: [], growth: 14, cost: { acorns: 40 }, value: 65,
    icon: '🐀', desc: 'Едри, зъбати и винаги на тълпа.',
  },
  {
    id: 'ratspear', name: 'Плъх-копиеносец', plural: 'Плъхове-копиеносци', faction: 'rats', tier: 2,
    att: 5, def: 7, dmin: 2, dmax: 4, hp: 13, spd: 5, abilities: [], growth: 8, cost: { acorns: 95 }, value: 150,
    icon: '🐀', badge: '🔱', desc: 'Тъмно наметало и дълго, остро копие.',
  },
  {
    id: 'trapper', name: 'Плъх-капанджия', plural: 'Плъхове-капанджии', faction: 'rats', tier: 3,
    att: 5, def: 3, dmin: 2, dmax: 4, hp: 9, spd: 5, shots: 8, abilities: ['ranged', 'web'], growth: 6,
    cost: { acorns: 130 }, value: 200, icon: '🐀', badge: '⛓️', desc: 'Мята мрежи и ръждиви капани. Който се заплете, едва пълзи.',
  },
  {
    id: 'veteran', name: 'Плъх-ветеран', plural: 'Плъхове-ветерани', faction: 'rats', tier: 4,
    att: 9, def: 6, dmin: 4, dmax: 7, hp: 24, spd: 7, abilities: ['doubleStrike'], growth: 3,
    cost: { acorns: 320, wood: 1 }, value: 470, icon: '🐀', badge: '⚔️', desc: 'Белязан в много битки — като капитана си Белегор.',
  },
  {
    id: 'guard', name: 'Червеноок гвардеец', plural: 'Червенооки гвардейци', faction: 'rats', tier: 5,
    att: 12, def: 12, dmin: 8, dmax: 13, hp: 70, spd: 6, abilities: ['unlimitedRetaliation', 'fearless'], growth: 1,
    cost: { acorns: 950, cheese: 1 }, value: 1400, icon: '🐀', badge: '🛡️', desc: 'Стражата на тронната зала. Очите им светят червено в мрака.',
  },

  // ---- Обитатели на гората ----
  {
    id: 'wanderer', name: 'Скитник от Зелендол', plural: 'Скитници от Зелендол', faction: 'neutral', tier: 2,
    att: 4, def: 4, dmin: 2, dmax: 3, hp: 10, spd: 6, abilities: [], growth: 6, cost: { acorns: 80 }, value: 120,
    icon: '🐭', badge: '🎒', desc: 'Мишки без дом. Търсят Вечната пита отвъд Сивите хълмове.',
  },
  {
    id: 'ferret', name: 'Пор', plural: 'Порове', faction: 'neutral', tier: 4,
    att: 10, def: 8, dmin: 5, dmax: 9, hp: 34, spd: 7, abilities: ['charge'], growth: 2, cost: { acorns: 450 }, value: 600,
    icon: '🦦', desc: 'Дълъг, лъскав и гладен.',
  },
  {
    id: 'wildcat', name: 'Дива котка', plural: 'Диви котки', faction: 'neutral', tier: 5,
    att: 14, def: 10, dmin: 10, dmax: 16, hp: 80, spd: 9, abilities: ['fearless'], growth: 1, cost: { acorns: 1200 },
    value: 1600, icon: '🐈', desc: 'Белегор ги е надхитрил много пъти. Ти още не.',
  },
  {
    id: 'zubodrobko', name: 'Зъбодробко', plural: 'Зъбодробко', faction: 'neutral', tier: 6,
    att: 14, def: 12, dmin: 12, dmax: 20, hp: 420, spd: 7, abilities: ['charge', 'fearless'], growth: 0, cost: {},
    value: 5200, icon: '🦦', badge: '🦷', desc: 'Тиранинът на гората. Взима храната на всички малки гризачи.',
  },
  {
    id: 'tower', name: 'Стрелкова кула', plural: 'Стрелкови кули', faction: 'neutral', tier: 0,
    att: 10, def: 10, dmin: 8, dmax: 14, hp: 120, spd: 1, shots: 99, abilities: ['ranged', 'immobile', 'fearless'], growth: 0,
    cost: {}, value: 0, icon: '🗼', desc: 'Защитава укреплението.',
  },
];

export const CREATURES: Record<string, CreatureDef> = Object.fromEntries(defs.map((d) => [d.id, d]));

export const FACTION_LINE: Record<'forest' | 'rats', string[]> = {
  forest: ['mouse', 'vole', 'squirrel', 'hare', 'eagle'],
  rats: ['rat', 'ratspear', 'trapper', 'veteran', 'guard'],
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
