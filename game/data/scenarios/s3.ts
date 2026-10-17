import { addToArmy, armyFrom } from '../../core/hero';
import type { ScenarioDef } from '../../core/scenario';
import type { GameState } from '../../core/types';
import { has, L, res } from './helpers';

function setup(s: GameState): void {
  // Iskritsa only arrives together with Mishkontin if she joined him in chapter 2.
  if (!s.flags.iskritsa_joined) {
    const isk = s.heroes.find((h) => h.id === 'iskritsa');
    if (isk) {
      isk.alive = false;
      s.heroes = s.heroes.filter((h) => h !== isk);
    }
  }
  // Wisdom shown earlier means the defenders prepared better.
  if (s.flags.iskritsa_planned) {
    const t = s.towns.find((x) => x.id === 'sirengrad');
    if (t) addToArmy(t.garrison, 'squirrel', 6);
  }
}

function canMakePeace(s: GameState): boolean {
  return !!s.flags.letter_delivered || (s.virtues.kindness ?? 0) >= 5;
}

function weakenCamp(s: GameState): void {
  const t = s.towns.find((x) => x.id === 'camp');
  if (t && t.owner === 'enemy') for (const st of t.garrison) if (st) st.n = Math.max(1, Math.round(st.n * 0.7));
}

/** Day 15: Mortis takes most of the camp's garrison and marches. */
function mortisGathers(s: GameState): void {
  const m = s.heroes.find((h) => h.id === 'mortis' && h.alive);
  const t = s.towns.find((x) => x.id === 'camp' && x.owner === 'enemy');
  if (!m || !t) return;
  for (let i = 0; i < t.garrison.length; i++) {
    const st = t.garrison[i];
    if (!st) continue;
    const take = Math.floor(st.n * 0.6);
    if (take > 0 && addToArmy(m.army, st.cid, take)) {
      st.n -= take;
      if (st.n <= 0) t.garrison[i] = null;
    }
  }
}

export const S3: ScenarioDef = {
  id: 's3',
  number: 3,
  title: 'Обсадата на Сиренград',
  subtitle: 'Трета глава',
  bg: 'img/bg-siren.webp',
  intro: [
    'През Старата порта Мишконтин влезе в Сиренград — града от бял камък и сини кули, където Вечната пита храни цялата гора.',
    'Но под стените вече е разпънат Опашатият лагер. Кралят плъх Мортис е довел цялата си орда. Всяка нощ плъховете опитват стените, а всяка сутрин стават повече.',
    'Белагор, последният Пазител на картите, чака Мишконтин в Звездната кула. Той знае нещо за Мортис, което никой друг не знае.',
  ],
  goals: ['Победи Кралят плъх Мортис.', 'Не позволявай Сиренград да падне.', 'Мишконтин трябва да оцелее.'],
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMMMMMnnnnnnnnnnnnnMMMMMMMMMM',
    'MMMMMMMMMMMnnnnQnnnnnnnnMMMMMMMMMM',
    'MMMMMMMMMMMnnnnnnSnnnnnnMMMMMMMMMM',
    'MMMM......MMMMnnnnnInMMMM.....MMMM',
    'MMMM.w..r.MMMMnnnnnnnMMMM.....MMMM',
    'MMMM......UMMMnnnnnnnMMMM..V..MMMM',
    'M^^..TTTT...$...n:n....$..o......M',
    'Mdddddd^...u.....:......TT...q...M',
    'MdddYdd^.TT..:::::::::..TT.......M',
    'MddXddd^.TT.:....:....:.TT.....?.M',
    'MddddZd..TT:..!..:...+.:....a....M',
    'Mdddddd..h:h.G...:..R...:.hhhE..xM',
    'M...*^^^::hh.....:.......::hh.uH.M',
    'M~~~~~~~=~~~~....:....~~~~=~~~~~~M',
    'Mx......:...~~~~~=~~~~~...:......M',
    'MTTTT.$.:........:.......::..TTTTM',
    'MTTTT..ss:....L..:.o....sss..TTTTM',
    'MTTTT..sss..TT...:...TT.sss..TTTTM',
    'M.J....sss..TT...:...TD....r..%..M',
    'MTTTTTcF....y.ddd:Kdd.......TTTTTM',
    'MTTTTT...$b...dddCddd....v..TTTTTM',
    'MTTTTT........ddddddd..x....TTTTTM',
    'MTTTTT........ddddddd.......TTTTTM',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  ],
  legend: {
    S: {
      town: { kind: 'town', id: 'sirengrad', name: 'Сиренград', faction: 'forest', owner: 'player', special: 'sirengrad', built: ['hall', 'hall2', 'fort', 'fort2', 'market', 'library', 'library2', 'tavern', 'cheese', 'd1', 'd2', 'd3', 'd4', 'd5'], garrison: [['mouse', 20], ['hedgehog', 10], ['owl', 2]] },
      hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true },
    },
    I: { terrain: 'n', hero: { kind: 'hero', tpl: 'iskritsa', owner: 'player', carry: true } },
    Q: { terrain: 'n', obj: { id: 'belagor', kind: 'npc', npc: 'belagor', label: 'Звездната кула на Белагор', dialogue: 's3_belagor_tower', wantItem: 'mortisLetter', wantFlag: 'letter_delivered' } },
    C: { town: { kind: 'town', id: 'camp', name: 'Опашатият лагер', faction: 'rats', owner: 'enemy', built: ['hall', 'hall2', 'fort', 'd1', 'd2', 'd3', 'd4'], garrison: [['rat', 36], ['beetle', 14], ['ratbow', 12], ['bat', 4], ['badger', 1]] } },
    K: { terrain: 'd', hero: { kind: 'hero', tpl: 'mortis', owner: 'enemy', role: 'boss', activeFrom: 15, targetTown: 'camp', army: [['rat', 48], ['beetle', 16], ['ratbow', 14], ['bat', 6], ['badger', 2]] } },
    X: { terrain: 'd', obj: { id: 'letter', kind: 'questItem', item: 'mortisLetter', label: 'Стар сандък в избите', dialogue: 's3_letter' } },
    Y: { terrain: 'd', obj: { kind: 'monster', cid: 'ghost', n: 6, guard: true, label: 'Таласъмите от избите' } },
    Z: { terrain: 'd', obj: { kind: 'monster', cid: 'ghost', n: 5, guard: true, label: 'Таласъмите от избите' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: 'player' } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    E: { obj: { kind: 'monster', cid: 'boar', n: 6, guard: true, label: 'Глигани-пазачи' } },
    c: { obj: { kind: 'mine', res: 'cheese', owner: 'enemy' } },
    F: { obj: { kind: 'monster', cid: 'wolf', n: 12, guard: true, label: 'Вълците на Мортис' } },
    v: { terrain: 'd', obj: { kind: 'mine', res: 'stone', owner: 'enemy' } },
    b: { obj: { kind: 'mine', res: 'wood', owner: 'enemy' } },
    D: { obj: { kind: 'dwelling', cid: 'bat', available: 4, owner: 'enemy' } },
    y: { terrain: 'd', obj: { kind: 'dwelling', cid: 'ratbow', available: 8, owner: 'enemy' } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { obj: { kind: 'shrine', effect: 'att', value: 1 } },
    '?': { obj: { kind: 'shrine', effect: 'xp', value: 1200 } },
    '*': { obj: { kind: 'shrine', effect: 'reveal', value: 12, label: 'Старата наблюдателница' } },
    '%': { obj: { kind: 'shrine', effect: 'pow', value: 1 } },
    H: { obj: { kind: 'artifact', art: 'shellShield' } },
    J: { obj: { kind: 'artifact', art: 'bellCharm' } },
    L: { obj: { kind: 'artifact', art: 'owlLens' } },
    U: { obj: { kind: 'monster', cid: 'wasp', n: 20, joinable: true } },
    V: { obj: { kind: 'monster', cid: 'ghost', n: 4, joinable: true } },
    R: { terrain: ':', obj: { kind: 'monster', cid: 'rat', n: 25, label: 'Плъхове-съгледвачи' } },
    G: { obj: { kind: 'monster', cid: 'mushroom', n: 14, joinable: true } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 800 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 8 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 8 } },
    u: { obj: { kind: 'resource', res: 'cheese', amount: 4 } },
    x: { obj: { kind: 'chest', acorns: 2000, xp: 1500 } },
  },
  carryArmies: {
    mishkontin: armyFrom([['mouse', 24], ['hedgehog', 12], ['squirrel', 10], ['owl', 3]]),
    iskritsa: armyFrom([['squirrel', 12], ['mouse', 14]]),
  },
  startRes: { player: res(5000, 15, 15, 6), enemy: res(8000, 20, 20, 8) },
  heroPool: { player: ['barzonog', 'borko'], enemy: ['muhlyo', 'opashcho'] },
  weekNames: ['Седмица на обсадата', 'Седмица на тъмните нощи', 'Седмица на последната свещ', 'Седмица на надеждата', 'Седмица на сиренето'],
  setup,
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [
        { a: 'dialogue', id: 's3_intro' },
        { a: 'dialogue', id: 's3_belagor' },
        { a: 'quest', id: 'mortis', title: 'Кралят плъх', text: 'Победи Мортис. Той пази Опашатия лагер на юг, но рано или късно ще поведе ордата срещу Сиренград.' },
        { a: 'quest', id: 'hold', title: 'Пази Сиренград', text: 'Ако Сиренград падне, всичко е загубено. Остави силен гарнизон и не забравяй стрелковата кула.' },
      ],
    },
    { id: 'letokril', when: (s, e) => e.t === 'day' && s.day === 2 && !!s.flags.letokril_friend, actions: [{ a: 'dialogue', id: 's3_letokril' }] },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 3,
      actions: [
        { a: 'spawnHero', tpl: 'muhlyo', owner: 'enemy', x: 17, y: 20, role: 'raider', targetTown: 'camp', army: [['rat', 30], ['beetle', 10], ['ratbow', 8]] },
        { a: 'toast', text: 'Първата вълна плъхове тръгна към Сиренград!', icon: '🐀' },
      ],
    },
    { id: 'troshko', when: (s, e) => e.t === 'day' && s.day === 4 && !!s.flags.troshko_friend, actions: [{ a: 'dialogue', id: 's3_troshko' }] },
    {
      id: 'iskritsa_arrives',
      when: (s, e) => e.t === 'day' && s.day === 6 && !!s.flags.iskritsa_stayed,
      actions: [
        { a: 'spawnHero', tpl: 'iskritsa', owner: 'player', x: 5, y: 8, army: [['squirrel', 16], ['mouse', 12], ['hedgehog', 6]] },
        { a: 'dialogue', id: 's3_iskritsa_arrives' },
      ],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 8,
      actions: [
        { a: 'spawnHero', tpl: 'opashcho', owner: 'enemy', x: 17, y: 20, role: 'raider', targetTown: 'camp', army: [['rat', 40], ['ratbow', 12], ['bat', 5]] },
        { a: 'toast', text: 'Втората вълна идва! Плъховете вече носят стълби.', icon: '🐀' },
      ],
    },
    { id: 'grizan', when: (s, e) => e.t === 'day' && s.day === 10 && !!s.flags.grizan_friend, actions: [{ a: 'dialogue', id: 's3_grizan' }] },
    {
      id: 'raid3',
      when: (s, e) => e.t === 'day' && s.day === 12,
      actions: [
        { a: 'spawnHero', tpl: 'shushumiga', owner: 'enemy', x: 17, y: 20, role: 'raider', targetTown: 'camp', army: [['ratbow', 16], ['rat', 30], ['bat', 6], ['badger', 1]] },
        { a: 'dialogue', id: 's3_shushumiga' },
      ],
    },
    { id: 'mortis_moves', when: (s, e) => e.t === 'day' && s.day === 15, actions: [{ a: 'dialogue', id: 's3_mortis_moves' }, { a: 'call', fn: mortisGathers }] },
    { id: 'mortis_beaten', when: (_s, e) => e.t === 'defeatHero' && e.heroId === 'mortis', actions: [{ a: 'dialogue', id: 's3_mortis_end' }] },
    { id: 'camp_taken', when: (_s, e) => e.t === 'capture' && e.townId === 'camp' && e.by === 'player', actions: [{ a: 'dialogue', id: 's3_camp' }] },
    { id: 'siren_lost', when: (_s, e) => e.t === 'capture' && e.townId === 'sirengrad' && e.by === 'enemy', actions: [{ a: 'lose', reason: 'Плъховете превзеха Сиренград и отнесоха Вечната пита. Тази зима гората ще гладува.' }] },
  ],
  checkEnd: (s) => {
    const m = s.heroes.find((h) => h.id === 'mortis');
    if (m && !m.alive && s.pendingDialogues.length === 0 && (s.flags.ending_peace || s.flags.ending_exile || s.flags.ending_justice)) return { status: 'won', reason: '' };
    return null;
  },
  victoryDialogue: () => 's3_victory',
  dialogues: {
    s3_intro: {
      id: 's3_intro',
      title: 'Сиренград',
      bg: 'img/bg-siren.webp',
      lines: [
        L('narrator', 'Сиренград светеше в нощта като фенер. По стените стояха мишки с копия от игли за плетене, а от кулите бухали гледаха към юг.'),
        L('narrator', 'А на юг горяха стотици огньове. Опашатият лагер.'),
        L('mishkontin', 'Колко са… Никога не съм виждал толкова много плъхове.', 'surprised'),
        L('iskritsa', 'Повече плъхове — повече мишени. Така казва баба ми.', undefined, has('iskritsa_joined')),
      ],
    },
    s3_belagor: {
      id: 's3_belagor',
      title: 'Звездната кула',
      lines: [
        L('belagor', 'Седни, Мишконтине. Обещах ти една история. Историята на Мортис.'),
        L('belagor', 'Преди двайсет зими, в Дългата зима, едно малко плъхче дойде до портите на Сиренград. Гладно. С три още по-гладни сестричета.'),
        L('belagor', 'Носеше писмо до Съвета. Аз бях пазач на портата тогава. Казах му: „Ще го предам.“ И… не помня какво стана с писмото.'),
        L('belagor', 'Съветът така и не отвори портите. Малкото плъхче си отиде в снега. А после стана крал. Крал, който помни.'),
        L('mishkontin', 'Значи Мортис не иска само сиренето…', 'map'),
        L('belagor', 'Иска някой най-после да го чуе. Какво мислиш, малки Пазителю? Какво трябва да направим?'),
      ],
      choices: [
        { text: '„Всеки заслужава втори шанс. Дори Мортис.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'belagor_hope' }] },
        { text: '„Миналото не може да се промени. Сега пазим града.“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'flag', flag: 'belagor_duty' }, { a: 'troops', cid: 'owl', n: 3 }] },
        {
          text: '„Трябва да разберем какво е пишело в писмото.“', virtue: 'wisdom',
          actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'belagor_quest' }, { a: 'reveal', x: 4, y: 11, r: 4 }, { a: 'quest', id: 'letter', title: 'Изгубеното писмо', text: 'Белагор държеше старите си вещи в избите на запад. Може би писмото на Мортис е още там — но в избите живеят таласъми.' }],
        },
      ],
    },
    s3_belagor_tower: {
      id: 's3_belagor_tower',
      title: 'Звездната кула',
      lines: [
        L('belagor', 'Хм? А, ти си. Виждал ли си очилата ми? …А, на главата ми са. Благодаря.', undefined, (s) => !s.items.includes('mortisLetter')),
        L('belagor', 'Пази града, Мишконтине. И пази сърцето си. Двете са по-свързани, отколкото мислиш.', undefined, (s) => !s.items.includes('mortisLetter')),
        L('mishkontin', 'Белагор… Намерих го. Писмото на Мортис. Беше в джоба на старото ви палто.', 'map', (s) => s.items.includes('mortisLetter') && !s.flags.letter_delivered),
        L('belagor', '…„Моля ви, пуснете ни през зимата. Сестричетата ми са гладни. Ще работим. Ще чистим, ще носим вода. — М.“', undefined, (s) => s.items.includes('mortisLetter') && !s.flags.letter_delivered),
        L('belagor', 'Двайсет зими в моя джоб. Аз не съм го предал. Не Съветът го е отказал — аз го забравих. Вината е моя.', undefined, (s) => s.items.includes('mortisLetter') && !s.flags.letter_delivered),
        L('belagor', 'Ако срещнеш Мортис… кажи му, че искам да му поискам прошка. Лично.', undefined, (s) => s.items.includes('mortisLetter') && !s.flags.letter_delivered),
        L('belagor', 'Нося писмото до сърцето си. Когато дойде време, ще говоря с него.', undefined, (s) => !!s.flags.letter_delivered),
      ],
      after: [{ a: 'call', fn: (s) => { if (s.items.includes('mortisLetter') && !s.flags.letter_delivered) { s.flags.letter_delivered = true; s.virtues.wisdom = (s.virtues.wisdom ?? 0) + 1; s.toasts.push({ text: '+1 Мъдрост', icon: '🦉' }); const q = s.quests.find((x) => x.id === 'letter'); if (q) q.done = true; } } }],
    },
    s3_letter: {
      id: 's3_letter',
      title: 'Избите',
      lines: [
        L('narrator', 'В праха на избите стоеше старо палто на бухал, закачено на пирон. В джоба му — сгънат лист, пожълтял като есенен лист.'),
        L('mishkontin', '„До Съвета на Сиренград. Моля ви…“ Това е писмото на Мортис! Трябва да го занеса на Белагор.', 'surprised'),
      ],
      after: [{ a: 'quest', id: 'letter', title: 'Изгубеното писмо', text: 'Занеси писмото на Белагор в Звездната кула (до Сиренград).' }],
    },
    s3_letokril: {
      id: 's3_letokril',
      title: 'Крила в нощта',
      lines: [
        L('letokril', 'Обещах ти — ако имаш нужда от прилеп, погледни нагоре. Ето ме. И не съм сам.'),
        L('letokril', 'Шест мои братовчеди искат да помагат. Или пък мога да облетя лагера и да ти разкажа всичко, което видя.'),
      ],
      choices: [
        { text: '„Летете с нас!“ (прилепите влизат в армията)', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'troops', cid: 'bat', n: 6 }, { a: 'toast', text: 'Смесената армия има малко по-нисък морал, но прилепите са бързи!', icon: '🦇' }] },
        { text: '„Разузнай лагера. Знанието е най-доброто оръжие.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'reveal', x: 17, y: 21, r: 8 }, { a: 'reveal', x: 17, y: 12, r: 8 }, { a: 'call', fn: weakenCamp }, { a: 'toast', text: 'Летокрил подпали няколко палатки с обоза. Лагерът е отслабен!', icon: '🦇' }] },
      ],
    },
    s3_troshko: {
      id: 's3_troshko',
      title: 'Керванът на Трошко',
      lines: [
        L('troshko', 'Ох-ох-ох, какво задръстване! Пуснете ме, аз съм доставка! Сирене, жълъди, дъски, камъни — и половин лъжица, за всеки случай!'),
        L('mishkontin', 'Трошко! Как мина покрай плъховете?', 'happy'),
        L('troshko', 'Казах им, че съм кошче за боклук. Повярваха. Това са всичките ми трошки, Мишконтине — спестявани цял живот. Вземи ги. Градът ги заслужава повече от мен.'),
      ],
      after: [{ a: 'res', res: { acorns: 3000, wood: 6, stone: 6, cheese: 5 } }, { a: 'flag', flag: 'troshko_gave' }],
    },
    s3_iskritsa_arrives: {
      id: 's3_iskritsa_arrives',
      title: 'Обещанието',
      lines: [
        L('iskritsa', 'Казах ти, че ще дойда! С опашка на сърцето! Доведох всички прашкари от Пеещия бор!'),
        L('iskritsa', 'Пазих гората през цялото време. Беше… скучно. Ужасно скучно. Но научих нещо — да чакам точния момент. И ето го.'),
      ],
    },
    s3_grizan: {
      id: 's3_grizan',
      title: 'Неочаквана помощ',
      lines: [
        L('grizan', 'Мишле! Отвори! Аз съм, Гризан! Доведох момчетата — двайсет плъха, които също искат хляб вместо война.'),
        L('grizan', 'И да знаеш: бях в лагера. Мортис е сам на върха. Всички се страхуват от него, но никой не го обича. Дори той самият.'),
      ],
      after: [{ a: 'call', fn: (s) => { const t = s.towns.find((x) => x.id === 'sirengrad'); if (t && t.owner === 'player') addToArmy(t.garrison, 'rat', 20); } }, { a: 'toast', text: 'Гризан и 20 плъха пазят Сиренград!', icon: '🐀' }],
    },
    s3_shushumiga: {
      id: 's3_shushumiga',
      title: 'Шепот',
      lines: [
        L('shushumiga', 'Шшш… Сиренград. Толкова красив. Толкова пълен със сирене. Довечера ще бъде наш.'),
        L('mishkontin', 'Тя води третата вълна! Трябва да я спрем, преди да стигне стените.'),
      ],
    },
    s3_mortis_moves: {
      id: 's3_mortis_moves',
      title: 'Кралят тръгва',
      lines: [
        L('mortis', 'Достатъчно! Чаках двайсет зими. Няма да чакам и двайсет и първата!'),
        L('mortis', 'Плъхове! Днес влизаме в Сиренград! И този път никой няма да ни затвори портата под носа!'),
        L('mishkontin', 'Мортис идва лично. Сега е моментът — всичко или нищо.', 'surprised'),
      ],
    },
    s3_camp: {
      id: 's3_camp',
      title: 'Опашатият лагер',
      lines: [
        L('narrator', 'Лагерът беше пълен с празни чинии. Никъде нямаше сирене — само огризки и няколко детски играчки от капачки.'),
        L('mishkontin', 'Те… наистина са гладни. Всички.', 'surprised'),
      ],
    },
    s3_mortis_end: {
      id: 's3_mortis_end',
      title: 'Кралят без корона',
      bg: 'img/bg-siren.webp',
      lines: [
        L('narrator', 'Капачката-корона се търкулна в снега. Кралят плъх седеше на земята и изведнъж изглеждаше много малък.'),
        L('mortis', 'Е, хайде. Вземете си питата. Вземете всичко. Както винаги.'),
        L('mishkontin', 'Защо, Мортис? Защо искаше да откраднеш Вечната пита?'),
        L('mortis', 'Защото преди двайсет зими дойдох до тази порта с писмо. Гладен. С три гладни сестричета. И никой не отвори.'),
        L('belagor', 'Писмото ти стигна до мен, Мортис. И аз го забравих в джоба си. Двайсет зими. Не Сиренград те отхвърли — аз те забравих. Прости ми.', undefined, has('letter_delivered')),
        L('mortis', '…Забравил си го? Не си ме мразел… просто си забравил?', undefined, has('letter_delivered')),
        L('mishkontin', 'Какво да правим с теб, Мортис?', 'map'),
      ],
      choices: [
        {
          text: '„Седни на нашата маса. Вечната пита стига за всички.“', virtue: 'kindness',
          requires: canMakePeace, lockedHint: 'Нужно е писмото на Мортис или Доброта 5',
          actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'ending_peace' }],
        },
        {
          text: '„Ще останеш в Сиренград и ще поправиш стореното — с работа.“', virtue: 'wisdom',
          requires: (s) => (s.virtues.wisdom ?? 0) >= 3, lockedHint: 'Нужна е Мъдрост 3',
          actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'ending_justice' }],
        },
        { text: '„Върви си, Мортис. И никога не се връщай в гората.“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'flag', flag: 'ending_exile' }] },
      ],
    },
    s3_victory: {
      id: 's3_victory',
      title: 'Зимното споделяне',
      bg: 'img/bg-siren.webp',
      lines: [
        L('narrator', 'Тази зима в Сиренград имаше празник, какъвто никой не помнеше. Вечната пита беше разрязана на хиляда парчета — и стигна за всички.', undefined, has('ending_peace')),
        L('narrator', 'На масата, между мишките и катериците, седеше Мортис — без корона, с лъжица в лапа. Белагор му наливаше супа. Плъхчетата от лагера ядяха за трима.', undefined, has('ending_peace')),
        L('mortis', 'Хм. Сирене. Топло. …Благодаря. Казах го. Не ме карайте да го повтарям.', undefined, has('ending_peace')),
        L('narrator', 'Мортис остана в Сиренград. Всяка сутрин носеше вода за кухните и чистеше снега от стълбите. В началото мрънкаше. После престана.', undefined, has('ending_justice')),
        L('narrator', 'Плъховете от лагера получиха работа и хляб. Белагор казваше, че справедливостта е като сиренето: трябва ѝ време да узрее.', undefined, has('ending_justice')),
        L('narrator', 'Мортис си отиде в Дълбоките пещери, без корона и без армия. Плъховете му се разпръснаха из гората. Сиренград беше спасен.', undefined, has('ending_exile')),
        L('narrator', 'Но понякога, в най-студените нощи, от пещерите се чуваше тихо ехо: „Ще се върна…“', undefined, has('ending_exile')),
        L('iskritsa', 'Мишконтине! Научих се да чакам точния момент. Почти. Следващия път пак стрелям първа, нали?', undefined, (s) => s.heroes.some((h) => h.id === 'iskritsa' && h.alive)),
        L('letokril', 'Прилепите вече не живеят сами. Сега сме Нощната стража на Сиренград. Звучи добре, нали?', undefined, has('letokril_friend')),
        L('troshko', 'Отворих магазин на главния площад! „Трошко и трошките — сега и с почти нови вилици“!', undefined, has('troshko_friend')),
        L('grizan', 'Аз пека хляб. Аз! Гризан! Мама щеше да се гордее.', undefined, has('grizan_friend')),
        L('belagor', 'Мишконтине. Ела. Това е празна карта. Старите пътища ги начертаха старите Пазители. Новите… ще ги начертаеш ти.'),
        L('mishkontin', 'Нови пътища… Към всички. Дори към тези, които още не познаваме.', 'happy'),
        L('narrator', 'И така Мишконтин, малкият мишок от Мъхово, стана Пазител на картите. А златният медальон „М“ светеше топло — като огън, на който всеки е добре дошъл.'),
        L('narrator', 'КРАЙ'),
      ],
    },
  },
};

