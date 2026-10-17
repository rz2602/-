import type { SkillId, SpellId } from '../core/types';

export type SpellTarget = 'enemy' | 'ally' | 'area' | 'adventure';

export interface SpellDef {
  id: SpellId;
  name: string;
  level: 1 | 2 | 3;
  cost: number;
  target: SpellTarget;
  icon: string;
  desc: string;
}

export const SPELLS: Record<SpellId, SpellDef> = {
  arrow: { id: 'arrow', name: 'Вълшебна стрела', level: 1, cost: 5, target: 'enemy', icon: '✨', desc: 'Щети: 10 + 10 × Сила.' },
  heal: { id: 'heal', name: 'Билков мехлем', level: 1, cost: 6, target: 'ally', icon: '🌿', desc: 'Лекува 15 + 10 × Сила точки живот, връща паднали в тази битка.' },
  haste: { id: 'haste', name: 'Попътен вятър', level: 1, cost: 6, target: 'ally', icon: '💨', desc: '+3 скорост за 3 рунда.' },
  shield: { id: 'shield', name: 'Дъбова кора', level: 1, cost: 5, target: 'ally', icon: '🛡️', desc: '+5 защита за 3 рунда.' },
  slow: { id: 'slow', name: 'Тинеста кал', level: 2, cost: 8, target: 'enemy', icon: '💧', desc: 'Наполовина скорост за 3 рунда.' },
  bless: { id: 'bless', name: 'Смела песен', level: 2, cost: 8, target: 'ally', icon: '🎵', desc: 'Винаги максимални щети и +1 морал за 3 рунда.' },
  fireflies: { id: 'fireflies', name: 'Рояк светулки', level: 2, cost: 10, target: 'area', icon: '🔥', desc: 'Щети 12 + 8 × Сила по целта и съседите ѝ (и по свои!).' },
  lightning: { id: 'lightning', name: 'Гръмотевица', level: 3, cost: 12, target: 'enemy', icon: '⚡', desc: 'Щети: 25 + 20 × Сила.' },
  farsight: { id: 'farsight', name: 'Поглед от високо', level: 1, cost: 4, target: 'adventure', icon: '🗺️', desc: 'Разкрива картата в радиус 9 около героя.' },
};

export interface SkillDef {
  id: SkillId;
  name: string;
  icon: string;
  levels: [string, string, string];
}

export const SKILLS: Record<SkillId, SkillDef> = {
  cartography: { id: 'cartography', name: 'Картография', icon: '🧭', levels: ['+1 видимост, по-лек терен', '+2 видимост, още по-лек терен', '+3 видимост, теренът не бави'] },
  logistics: { id: 'logistics', name: 'Логистика', icon: '🥾', levels: ['+10% движение', '+20% движение', '+30% движение'] },
  archery: { id: 'archery', name: 'Стрелба', icon: '🎯', levels: ['+10% щети от стрелба', '+25% щети от стрелба', '+50% щети от стрелба'] },
  offense: { id: 'offense', name: 'Нападение', icon: '⚔️', levels: ['+10% щети отблизо', '+20% щети отблизо', '+30% щети отблизо'] },
  armor: { id: 'armor', name: 'Броня', icon: '⛑️', levels: ['−5% получени щети', '−10% получени щети', '−15% получени щети'] },
  sorcery: { id: 'sorcery', name: 'Магьосничество', icon: '🔮', levels: ['+15% щети от магии', '+30% щети, магии ниво 2', '+50% щети, магии ниво 3'] },
  leadership: { id: 'leadership', name: 'Водачество', icon: '🚩', levels: ['+1 морал', '+2 морал', '+3 морал'] },
  luck: { id: 'luck', name: 'Късмет', icon: '🍀', levels: ['+1 късмет', '+2 късмет', '+3 късмет'] },
  estates: { id: 'estates', name: 'Стопанство', icon: '🌰', levels: ['+100 жълъда на ден', '+200 жълъда на ден', '+300 жълъда на ден'] },
};

export interface ArtifactDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  att?: number;
  def?: number;
  pow?: number;
  kno?: number;
  morale?: number;
  luck?: number;
  mpPct?: number;
  vision?: number;
  speed?: number;
  /** Quest artifacts cannot be traded or lost. */
  quest?: boolean;
}

export const ARTIFACTS: Record<string, ArtifactDef> = {
  medallion: { id: 'medallion', name: 'Златният медальон „М“', icon: '🏅', desc: 'Знакът на Пазителите на картите. +1 морал, +1 видимост.', morale: 1, vision: 1, quest: true },
  acornHelm: { id: 'acornHelm', name: 'Жълъдов шлем', icon: '⛑️', desc: '+2 защита.', def: 2 },
  thornSword: { id: 'thornSword', name: 'Трънена шпага', icon: '🗡️', desc: '+2 нападение.', att: 2 },
  shellShield: { id: 'shellShield', name: 'Щит от охлювена черупка', icon: '🐚', desc: '+3 защита.', def: 3 },
  mossBoots: { id: 'mossBoots', name: 'Мъхести ботуши', icon: '🥾', desc: '+20% движение по картата.', mpPct: 20 },
  compass: { id: 'compass', name: 'Компасът на Трошко', icon: '🧭', desc: '+2 видимост, +10% движение.', vision: 2, mpPct: 10 },
  clover: { id: 'clover', name: 'Четирилистна детелина', icon: '🍀', desc: '+2 късмет.', luck: 2 },
  fireflyBook: { id: 'fireflyBook', name: 'Книга на светулките', icon: '📖', desc: '+2 сила.', pow: 2 },
  honeyCup: { id: 'honeyCup', name: 'Медената чаша', icon: '🍯', desc: '+2 знание.', kno: 2 },
  featherQuill: { id: 'featherQuill', name: 'Перото на Летокрил', icon: '✒️', desc: '+1 скорост на всички отряди.', speed: 1 },
  bellCharm: { id: 'bellCharm', name: 'Звънче на смелостта', icon: '🔔', desc: '+1 морал, +1 нападение.', morale: 1, att: 1 },
  owlLens: { id: 'owlLens', name: 'Бухалово стъкло', icon: '🔍', desc: '+1 знание, +1 сила.', kno: 1, pow: 1 },
  ratCrown: { id: 'ratCrown', name: 'Капачката-корона', icon: '👑', desc: 'Короната на Мортис. +2 към всичко.', att: 2, def: 2, pow: 2, kno: 2 },
};

/** Quest items (not artifacts) shown in the hero/quest panel. */
export const ITEMS: Record<string, { name: string; icon: string }> = {
  map1: { name: 'Парче от картата (Север)', icon: '📜' },
  map2: { name: 'Парче от картата (Изток)', icon: '📜' },
  map3: { name: 'Парче от картата (Юг)', icon: '📜' },
  mortisLetter: { name: 'Старото писмо на Мортис', icon: '✉️' },
};
