import type { Faction, SkillId, SpellId } from '../core/types';

export interface HeroTemplate {
  id: string;
  name: string;
  title: string;
  faction: Faction;
  portrait: string;
  specialty: string;
  att: number;
  def: number;
  pow: number;
  kno: number;
  skills: Partial<Record<SkillId, number>>;
  spells: SpellId[];
  artifacts: string[];
  /** Relative chance of each primary stat on level-up. */
  weights: [number, number, number, number];
  army: [string, number][];
  bio: string;
}

export const SPECIALTIES: Record<string, { name: string; desc: string }> = {
  cartographer: { name: 'Картограф', desc: '+2 видимост, по-лек терен. Мишките-опълченци: +1 нападение и защита.' },
  spark: { name: 'Искра', desc: 'Катериците: +2 нападение. „Рояк светулки“ е с 50% по-силен.' },
  swift: { name: 'Бързоног', desc: '+20% движение по картата.' },
  builder: { name: 'Строител', desc: '+2 дърво на ден.' },
  gnaw: { name: 'Гризач', desc: 'Плъховете-дрипльовци: +2 нападение и +1 защита.' },
  spy: { name: 'Шпионка', desc: '+3 видимост, +10% движение. Самострелците: +1 нападение.' },
  king: { name: 'Кралят плъх', desc: 'Всички същества на ордата: +1 нападение и защита, +1 морал.' },
  night: { name: 'Нощен вестител', desc: 'Прилепите: +2 скорост и +2 нападение.' },
  hoarder: { name: 'Трупач', desc: '+150 жълъда на ден.' },
};

const T: HeroTemplate[] = [
  {
    id: 'mishkontin', name: 'Мишконтин', title: 'Пазител на картите', faction: 'forest', portrait: 'mishkontin',
    specialty: 'cartographer', att: 1, def: 1, pow: 1, kno: 2, skills: { cartography: 1, leadership: 1 },
    spells: ['farsight', 'arrow'], artifacts: ['medallion'], weights: [25, 25, 25, 25],
    army: [['mouse', 14], ['hedgehog', 5], ['squirrel', 4]],
    bio: 'Малък полски мишок от Мъхово с голямо сърце, дървена тояга и дядовия златен медальон „М“. Чете карти по-добре от всеки в гората.',
  },
  {
    id: 'iskritsa', name: 'Искрица', title: 'Водачка на прашкарите', faction: 'forest', portrait: 'iskritsa',
    specialty: 'spark', att: 2, def: 0, pow: 2, kno: 1, skills: { archery: 1, offense: 1 },
    spells: ['fireflies'], artifacts: [], weights: [35, 15, 30, 20],
    army: [['squirrel', 7], ['mouse', 10]],
    bio: 'Рижа катерица от Пеещия бор. Първо стреля, после пита. Учи се да мисли преди скока.',
  },
  {
    id: 'barzonog', name: 'Бързоног', title: 'Заек-вестоносец', faction: 'forest', portrait: 'rabbit',
    specialty: 'swift', att: 1, def: 1, pow: 0, kno: 1, skills: { logistics: 1 },
    spells: [], artifacts: [], weights: [30, 30, 20, 20], army: [['mouse', 8]],
    bio: 'Носи писма из цялата гора. Казва, че е видял края ѝ. Два пъти.',
  },
  {
    id: 'borko', name: 'Борко', title: 'Хамстер-строител', faction: 'forest', portrait: 'beaver',
    specialty: 'builder', att: 0, def: 2, pow: 1, kno: 1, skills: { estates: 1 },
    spells: [], artifacts: [], weights: [20, 40, 20, 20], army: [['hedgehog', 4], ['mouse', 6]],
    bio: 'Ако нещо може да се построи, Борко вече го е измерил.',
  },
  {
    id: 'grizan', name: 'Гризан', title: 'Капитан на ордата', faction: 'rats', portrait: 'grizan',
    specialty: 'gnaw', att: 2, def: 1, pow: 0, kno: 1, skills: { offense: 1 },
    spells: [], artifacts: [], weights: [40, 30, 15, 15], army: [['rat', 18], ['beetle', 4]],
    bio: 'Гръмогласен капитан с нащърбени зъби. Обича заповедите — особено да ги дава.',
  },
  {
    id: 'shushumiga', name: 'Шушумига', title: 'Господарка на шпионите', faction: 'rats', portrait: 'shushumiga',
    specialty: 'spy', att: 1, def: 1, pow: 2, kno: 2, skills: { archery: 1, cartography: 1 },
    spells: ['slow', 'arrow'], artifacts: [], weights: [20, 20, 30, 30], army: [['ratbow', 8], ['rat', 16], ['beetle', 6]],
    bio: 'Шепне, подслушва и никога не казва цялата истина.',
  },
  {
    id: 'mortis', name: 'Мортис', title: 'Кралят плъх', faction: 'rats', portrait: 'mortis',
    specialty: 'king', att: 4, def: 3, pow: 3, kno: 3, skills: { offense: 2, leadership: 1, sorcery: 1 },
    spells: ['lightning', 'slow', 'shield'], artifacts: ['ratCrown'], weights: [30, 30, 20, 20],
    army: [['rat', 40], ['beetle', 14], ['ratbow', 14], ['bat', 6], ['badger', 2]],
    bio: 'Носи капачка от бутилка вместо корона и обида, по-стара от самия него.',
  },
  {
    id: 'letokril', name: 'Летокрил', title: 'Прилепът-вестоносец', faction: 'rats', portrait: 'letokril',
    specialty: 'night', att: 1, def: 1, pow: 1, kno: 1, skills: { logistics: 1 },
    spells: [], artifacts: [], weights: [30, 20, 25, 25], army: [['bat', 4], ['rat', 10]],
    bio: 'Самотен прилеп, който носи писмата на Мортис. Не обича тъмното толкова, колкото се преструва.',
  },
  {
    id: 'opashcho', name: 'Опашчо', title: 'Плъх-събирач', faction: 'rats', portrait: 'rat',
    specialty: 'hoarder', att: 1, def: 1, pow: 0, kno: 1, skills: { estates: 1 },
    spells: [], artifacts: [], weights: [30, 30, 20, 20], army: [['rat', 12]],
    bio: 'Събира всичко лъскаво. И всичко нелъскаво.',
  },
  {
    id: 'muhlyo', name: 'Мухльо', title: 'Плъх-боец', faction: 'rats', portrait: 'rat',
    specialty: 'gnaw', att: 2, def: 1, pow: 0, kno: 0, skills: { offense: 1 },
    spells: [], artifacts: [], weights: [40, 30, 15, 15], army: [['rat', 14], ['beetle', 3]],
    bio: 'Мълчалив и мърляв. Много мърляв.',
  },
];

export const HERO_TEMPLATES: Record<string, HeroTemplate> = Object.fromEntries(T.map((t) => [t.id, t]));

export const XP_LEVELS = [0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12500, 15500, 19000, 23000, 27500, 32500, 38000];

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) lvl = i + 1;
  return lvl;
}
