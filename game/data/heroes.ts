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
  brave: { name: 'Храбро сърце', desc: '+1 морал. Полските мишки: +1 нападение и защита.' },
  pathfinder: { name: 'Пътеводителка', desc: 'Дъщерята на Картографа: +2 видимост, по-лек терен, +10% движение. Катериците: +2 нападение.' },
  swift: { name: 'Бегач', desc: '+20% движение по картата.' },
  gatherer: { name: 'Събирачка', desc: '+150 трохи на ден. Катериците: +1 нападение и защита.' },
  captain: { name: 'Капитанът с белега', desc: 'Всички плъхове: +1 нападение и защита. Ветераните: +3 нападение.' },
  patrol: { name: 'Патрулен водач', desc: '+2 видимост. Плъховете от тунелите: +2 нападение и +1 защита.' },
  king: { name: 'Старият крал', desc: '+1 морал, +1 сирене на ден. Плъховете: +1/+1, гвардейците: +3 защита.' },
};

const T: HeroTemplate[] = [
  {
    id: 'mishkontin', name: 'Мишконтин', title: 'Мишлето от Сиренград', faction: 'forest', portrait: 'mishkontin',
    specialty: 'brave', att: 1, def: 1, pow: 1, kno: 2, skills: { leadership: 1 },
    spells: [], artifacts: ['medallion'], weights: [25, 25, 25, 25],
    army: [['mouse', 8]],
    bio: 'Малко мишле от Сиренград — градчето в старата мелница край реката. Плъховете на крал Мортис отведоха родителите му и всички жители. Мишконтин тръгна да ги върне.',
  },
  {
    id: 'iskritsa', name: 'Искрица', title: 'Дъщерята на Картографа', faction: 'forest', portrait: 'iskritsa',
    specialty: 'pathfinder', att: 1, def: 1, pow: 2, kno: 2, skills: { cartography: 1, archery: 1 },
    spells: ['bless'], artifacts: [], weights: [25, 20, 30, 25],
    army: [['wanderer', 6]],
    bio: 'Дребна мишка със светла козина и живи, пъстри очи. Баща ѝ рисуваше карти върху кора, майка ѝ пееше така, че вятърът спираше да слуша. Обича да пътува с честни сърца.',
  },
  {
    id: 'harescout', name: 'Заек-бегач', title: 'Вестоносецът на поляната', faction: 'forest', portrait: 'hare',
    specialty: 'swift', att: 2, def: 1, pow: 0, kno: 1, skills: { logistics: 1 },
    spells: [], artifacts: [], weights: [30, 30, 20, 20], army: [['hare', 2], ['mouse', 6]],
    bio: 'Един от зайците, които се изправиха срещу Зъбодробко. Тича по-бързо от слуховете.',
  },
  {
    id: 'oldsquirrel', name: 'Старата катерица', title: 'Пазителката на бора', faction: 'forest', portrait: 'oldsquirrel',
    specialty: 'gatherer', att: 1, def: 2, pow: 1, kno: 1, skills: { estates: 1 },
    spells: [], artifacts: [], weights: [20, 35, 25, 20], army: [['squirrel', 5], ['vole', 3]],
    bio: '„Никой не иска да е първият“ — каза тя някога. После беше сред първите.',
  },
  {
    id: 'belegor', name: 'Белегор', title: 'Капитанът на крал Мортис', faction: 'rats', portrait: 'belegor',
    specialty: 'captain', att: 4, def: 3, pow: 1, kno: 2, skills: { offense: 2, armor: 1 },
    spells: ['slow'], artifacts: [], weights: [40, 30, 15, 15],
    army: [['rat', 30], ['ratspear', 12], ['trapper', 10], ['veteran', 5]],
    bio: 'Плъх с дълга драскотина от окото до края на муцуната. Минал през много битки — надхитрил цяла група диви котки, и то неведнъж.',
  },
  {
    id: 'mortis', name: 'Мортис', title: 'Кралят плъх', faction: 'rats', portrait: 'mortis',
    specialty: 'king', att: 3, def: 4, pow: 3, kno: 3, skills: { leadership: 1, sorcery: 1 },
    spells: ['lightning', 'slow'], artifacts: ['ratCrown'], weights: [25, 35, 20, 20],
    army: [['guard', 4], ['veteran', 6]],
    bio: 'Владетелят на Тъмните тунели. Стар, побелял и прегърбен. Цял живот трупа сирене, ядки и власт — от страх, че няма да му стигне.',
  },
  {
    id: 'ostrozab', name: 'Острозъб', title: 'Водач на патрул', faction: 'rats', portrait: 'rat',
    specialty: 'patrol', att: 2, def: 1, pow: 0, kno: 1, skills: { offense: 1 },
    spells: [], artifacts: [], weights: [40, 30, 15, 15], army: [['rat', 14], ['ratspear', 3]],
    bio: 'Един от воините на Белегор. Следи всяка стъпка в гората.',
  },
  {
    id: 'sivoopashko', name: 'Сивоопашко', title: 'Водач на патрул', faction: 'rats', portrait: 'rat',
    specialty: 'patrol', att: 1, def: 2, pow: 0, kno: 1, skills: { armor: 1 },
    spells: [], artifacts: [], weights: [30, 40, 15, 15], army: [['rat', 12], ['trapper', 4]],
    bio: 'Обича капаните повече от битките.',
  },
];

export const HERO_TEMPLATES: Record<string, HeroTemplate> = Object.fromEntries(T.map((t) => [t.id, t]));

export const XP_LEVELS = [0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12500, 15500, 19000, 23000, 27500, 32500, 38000];

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) lvl = i + 1;
  return lvl;
}
