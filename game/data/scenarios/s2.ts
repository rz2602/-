import { addToArmy, armyFrom } from '../../core/hero';
import type { ScenarioDef } from '../../core/scenario';
import type { GameState, MapObject } from '../../core/types';
import { has, hasNot, hasRes, L, res } from './helpers';

function npc(s: GameState, id: string): Extract<MapObject, { kind: 'npc' }> | undefined {
  const o = s.objects.find((x) => x.id === id);
  return o && o.kind === 'npc' ? o : undefined;
}

/** Adapts the chapter to the choices made in chapter 1. */
function setup(s: GameState): void {
  // Troshko remembers how he was treated.
  const tr = npc(s, 'troshko');
  if (tr) {
    tr.dialogue = s.flags.troshko_robbed ? 's2_troshko_angry' : s.flags.map2_memorized ? 's2_troshko_sold' : s.flags.troshko_paid ? 's2_troshko_trade' : 's2_troshko_friend';
  }
  // Letokril: friend, unsure, or enemy.
  const lk = s.objects.find((o) => o.id === 'letokril');
  if (s.flags.letokril_trust || s.flags.letokril_left) {
    if (lk) lk.done = true;
  }
  // Grizan: deserter, enemy guard or former prisoner.
  const gz = s.objects.find((o) => o.id === 'grizan');
  if (!s.flags.grizan_fed && gz) gz.done = true;
  const outpost = s.towns.find((t) => t.id === 'outpost');
  if (s.flags.grizan_released && outpost) addToArmy(outpost.garrison, 'badger', 2);
  if (s.flags.grizan_prisoner) s.flags.tunnel_open = true;
  // Shushumiga bought the original map piece from Troshko: she is ready sooner.
  const sh = s.heroes.find((h) => h.id === 'shushumiga');
  if (sh && s.flags.map2_memorized) {
    addToArmy(sh.army, 'bat', 4);
    if (sh.ai) sh.ai.activeFrom = 10;
  }
}

export const S2: ScenarioDef = {
  id: 's2',
  number: 2,
  title: 'Пътеката на Картографа',
  subtitle: 'Втора глава',
  bg: 'img/bg-mount.webp',
  intro: [
    'С трите парчета от картата Мишконтин откри Пътеката на Картографа — тайния път през Сребърните планини до Старата порта на Сиренград.',
    'Но плъховете не спят. Шушумига, господарката на шпионите на Мортис, е построила застава точно на единствения мост над ждрелото. А високо горе вече мирише на сняг.',
    'Ако проходът се затвори, Сиренград ще остане сам срещу армията на Кралят плъх. Мишконтин трябва да побърза — и да намери приятели по пътя.',
  ],
  goals: ['Отведи Мишконтин до Старата порта на Сиренград (горе вдясно).', 'Направи го до 42-рия ден, преди снеговете.', 'Мишконтин трябва да оцелее.'],
  map: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
    'MMMMMMMnnnMMMMnnMMMnnnnnMMMMMMMMMM',
    'MMMMMMMnnnMMMMnnMMMnnnnnMMMMMMOMMM',
    'MMMMMMMnnJnnnnnnMMMnnnnnnnnn:::nnM',
    'MnnnnnnnnnYnnn*nMMMnnnn:::S:::RunM',
    'Mnnnnnn?nnnnnnnn~~nn$n:nnnnnn:nnnM',
    'Mnnnxnnnnunnn$nn~~nnn:MMnnnnn:nnnM',
    'Mnnnnnnnnnnnnnnn~~nnneMMnnncn:nnnM',
    'M......MMMMMM...~~..n:MMnnFnn:nnxM',
    'M^^^.D.MMMMMM^^^~~..:nMMnnnhh:ZnnM',
    'M^^^.........^^^~~^nnnnnLnnhh:nHnM',
    'M.....I.P......:==B:nnnnnnnon:nnnM',
    'M.$.hhh...r..#:.~~^^Gnn+nnnnnn:nnM',
    'M...hhh.....f:..~~~..o....MMMMMMMM',
    'M.w.....TTT.:...~~~.......MMMMMMMM',
    'M.......TTT:..o..~~.....TT.::::..M',
    'M..A:::::::.:!...~~.hhh.TT:...:..M',
    'M...@......hh:...~~.hhh.::.....%.M',
    'MTTTT....q.hh.:.^~~.:QU:..E......M',
    'MTTTT..r...K....X==:.....a..TTTTTM',
    'MTTTTTTTTT......^~~.TTTTT...TTTTTM',
    'MTTTTTTTTT..TTT..~~VTTTTTx..TTTTTM',
    'MTTTTTTTTT..TTT$.~~.TTTTT...TTTTTM',
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  ],
  legend: {
    A: { town: { kind: 'town', id: 'stonestep', name: 'Каменна стъпка', faction: 'forest', owner: 'player', built: ['hall', 'fort', 'd1', 'd2', 'd3', 'market'], garrison: [['mouse', 10], ['hedgehog', 4]] } },
    B: { town: { kind: 'town', id: 'outpost', name: 'Сивата застава', faction: 'rats', owner: 'enemy', built: ['hall', 'fort', 'd1', 'd2'], garrison: [['rat', 24], ['beetle', 8], ['ratbow', 8]] } },
    '@': { terrain: ':', hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true } },
    G: { terrain: 'n', hero: { kind: 'hero', tpl: 'shushumiga', owner: 'enemy', role: 'boss', activeFrom: 14, targetTown: 'outpost', army: [['ratbow', 8], ['rat', 18], ['beetle', 6]] } },
    I: { obj: { id: 'iskritsa', kind: 'npc', npc: 'iskritsa', label: 'Лагерът на Искрица', dialogue: 's2_iskritsa' } },
    P: { obj: { id: 'troshko', kind: 'npc', npc: 'troshko', label: 'Странноприемницата на Трошко', dialogue: 's2_troshko_friend', repeatDialogue: 's2_troshko_after', doneFlag: 'troshko_s2_done' } },
    L: { terrain: 'n', obj: { id: 'letokril', kind: 'npc', npc: 'letokril', label: 'Прилепът на камбанарията', dialogue: 's2_letokril_tower', repeatDialogue: 's2_letokril_after', doneFlag: 'letokril_s2_done' } },
    f: { obj: { id: 'grizan', kind: 'npc', npc: 'grizan', label: 'Самотен плъх', dialogue: 's2_grizan', repeatDialogue: 's2_grizan_after', doneFlag: 'grizan_s2_done' } },
    X: { obj: { id: 'tunnel', kind: 'gate', needFlag: 'tunnel_open', label: 'Старият тунел', lockedText: 'Каменна врата, обрасла с мъх. Отвътре свири вятър. Някой сигурно знае как се отваря…' } },
    O: { terrain: ':', obj: { id: 'gate', kind: 'goal', label: 'Старата порта на Сиренград', dialogue: 's2_gate', flag: 'gate_reached', needHero: 'mishkontin', needText: 'В средата на портата има вдлъбнатина с формата на буквата „М“. Само Мишконтин с медальона може да я отвори.' } },
    K: { obj: { kind: 'shrine', effect: 'spell', value: 0, spell: 'haste', label: 'Олтарът на вятъра' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: null } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    E: { obj: { kind: 'monster', cid: 'boar', n: 4, guard: true, label: 'Глигани-пазачи' } },
    c: { terrain: 'n', obj: { kind: 'mine', res: 'cheese', owner: 'enemy' } },
    F: { terrain: 'n', obj: { kind: 'monster', cid: 'wolf', n: 9, guard: true, label: 'Снежни вълци' } },
    D: { obj: { kind: 'dwelling', cid: 'squirrel', available: 6, owner: null } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { terrain: 'n', obj: { kind: 'shrine', effect: 'def', value: 1 } },
    '?': { terrain: 'n', obj: { kind: 'shrine', effect: 'xp', value: 900 } },
    '*': { terrain: 'n', obj: { kind: 'shrine', effect: 'reveal', value: 12, label: 'Кулата на картографа' } },
    '%': { obj: { kind: 'shrine', effect: 'kno', value: 1 } },
    H: { terrain: 'n', obj: { kind: 'artifact', art: 'thornSword' } },
    Z: { terrain: 'n', obj: { kind: 'monster', cid: 'boar', n: 5, guard: true, label: 'Глигани от прохода' } },
    J: { terrain: 'n', obj: { kind: 'artifact', art: 'honeyCup' } },
    Y: { terrain: 'n', obj: { kind: 'monster', cid: 'ghost', n: 5, guard: true, label: 'Таласъмите от старата мина' } },
    '#': { obj: { kind: 'sign', text: 'Към Сиренград — през Сивата застава. Плъховете добавили с тебешир: „МОСТЪТ Е НАШ!“' } },
    e: { terrain: ':', obj: { id: 'view', kind: 'event', dialogue: 's2_view', onlyHuman: true } },
    U: { terrain: ':', obj: { kind: 'monster', cid: 'mushroom', n: 12, joinable: true } },
    V: { obj: { kind: 'monster', cid: 'wasp', n: 15, joinable: true } },
    R: { terrain: ':', obj: { kind: 'monster', cid: 'badger', n: 6, guard: true, label: 'Стражата на Старата порта' } },
    Q: { terrain: ':', obj: { kind: 'monster', cid: 'ghost', n: 7, guard: true, label: 'Пазачите на тунела' } },
    S: { terrain: ':', obj: { kind: 'monster', cid: 'wolf', n: 14, guard: true, label: 'Вълците на Шушумига' } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 700 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 6 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 6 } },
    u: { terrain: 'n', obj: { kind: 'resource', res: 'cheese', amount: 3 } },
    x: { obj: { kind: 'chest', acorns: 1500, xp: 1100 } },
  },
  carryArmies: {
    mishkontin: armyFrom([['mouse', 22], ['hedgehog', 9], ['squirrel', 6]]),
  },
  startRes: { player: res(3000, 10, 10, 2), enemy: res(4000, 15, 15, 4) },
  heroPool: { player: ['barzonog', 'borko'], enemy: ['muhlyo', 'opashcho'] },
  weekNames: ['Седмица на първия сняг', 'Седмица на ледените висулки', 'Седмица на виещия вятър', 'Седмица на дългите нощи', 'Седмица на последния слънчев лъч', 'Седмица на затворените проходи'],
  setup,
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [
        { a: 'dialogue', id: 's2_intro' },
        { a: 'quest', id: 'gate', title: 'Старата порта', text: 'Отведи Мишконтин до Старата порта на Сиренград (горе вдясно). Пътят минава през Сивата застава на моста… а може би има и друг път.' },
        { a: 'quest', id: 'snow', title: 'Преди снеговете', text: 'Проходът ще се затвори след 42-рия ден.' },
      ],
    },
    {
      id: 'letokril_enemy',
      when: (s, e) => e.t === 'day' && s.day === 2 && !!s.flags.letokril_left,
      actions: [
        { a: 'spawnHero', tpl: 'letokril', owner: 'enemy', x: 24, y: 10, role: 'roam', targetTown: 'outpost', army: [['bat', 6], ['rat', 12]] },
        { a: 'toast', text: 'Над планината прелетя ято прилепи — водени от Летокрил.', icon: '🦇' },
      ],
    },
    {
      id: 'letokril_friend',
      when: (s, e) => e.t === 'day' && s.day === 2 && !!s.flags.letokril_trust,
      actions: [{ a: 'dialogue', id: 's2_letokril_friend' }],
    },
    {
      id: 'troshko_ambush',
      when: (s, e) => e.t === 'day' && s.day === 4 && !!s.flags.troshko_robbed,
      actions: [
        { a: 'spawnHero', tpl: 'opashcho', owner: 'enemy', x: 12, y: 12, role: 'raider', targetTown: 'outpost', army: [['rat', 20], ['ratbow', 4]] },
        { a: 'toast', text: 'Някой е казал на плъховете къде си! Засада от запад!', icon: '⚠️' },
      ],
    },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 7,
      actions: [
        { a: 'spawnHero', tpl: 'muhlyo', owner: 'enemy', x: 20, y: 11, role: 'raider', targetTown: 'outpost', army: [['rat', 24], ['ratbow', 6], ['beetle', 4]] },
        { a: 'toast', text: 'От Сивата застава тръгна отряд към Каменна стъпка!', icon: '🐀' },
      ],
    },
    {
      id: 'taunt',
      when: (s, e) => e.t === 'day' && s.day === 10,
      actions: [{ a: 'dialogue', id: 's2_taunt' }],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 18,
      actions: [
        { a: 'spawnHero', tpl: 'opashcho', owner: 'enemy', x: 20, y: 11, role: 'raider', targetTown: 'outpost', army: [['rat', 30], ['beetle', 10], ['bat', 4]] },
        { a: 'toast', text: 'Още плъхове слизат от планината!', icon: '🐀' },
      ],
    },
    {
      id: 'snow_warning',
      when: (s, e) => e.t === 'day' && s.day === 35,
      actions: [{ a: 'toast', text: 'Започна да вали сняг. Остава една седмица, преди проходът да се затвори!', icon: '❄️' }],
    },
    {
      id: 'outpost_taken',
      when: (_s, e) => e.t === 'capture' && e.townId === 'outpost' && e.by === 'player',
      actions: [{ a: 'dialogue', id: 's2_outpost' }],
    },
    {
      id: 'shushumiga_beaten',
      when: (_s, e) => e.t === 'defeatHero' && e.heroId === 'shushumiga',
      actions: [{ a: 'dialogue', id: 's2_shushumiga_beaten' }],
    },
    {
      id: 'letokril_beaten',
      when: (_s, e) => e.t === 'defeatHero' && e.heroId === 'letokril',
      actions: [{ a: 'dialogue', id: 's2_letokril_beaten' }],
    },
  ],
  checkEnd: (s) => {
    if (s.flags.gate_reached && s.pendingDialogues.length === 0) return { status: 'won', reason: '' };
    if (s.day > 42) return { status: 'lost', reason: 'Снегът затвори прохода. Сиренград остана сам срещу Мортис.' };
    return null;
  },
  victoryDialogue: () => 's2_end',
  dialogues: {
    s2_intro: {
      id: 's2_intro',
      title: 'Подножието на планината',
      bg: 'img/bg-mount.webp',
      lines: [
        L('narrator', 'Пътеката на Картографа започваше там, където свършваше гората: в подножието на Сребърните планини, при малката крепост Каменна стъпка.'),
        L('mishkontin', 'Според картата Старата порта е горе, зад ждрелото. Но единственият мост е… ох. Плъховете са построили застава точно на него.', 'map'),
        L('narrator', 'Над моста се вееше сиво знаме с опашка. Сивата застава на Шушумига — господарката на шпионите на Мортис.'),
        L('mishkontin', 'Трябва да стигна портата преди снеговете. Иначе проходът ще се затвори до пролетта. А Мортис няма да чака пролетта.'),
        L('narrator', 'Някой беше разказал на Мишконтин за стария тунел на юг. Капитан Гризан знаеше много неща — и в плен ги разказа всичките.', undefined, has('grizan_prisoner')),
      ],
    },
    s2_iskritsa: {
      id: 's2_iskritsa',
      title: 'Пеещият бор',
      lines: [
        L('narrator', 'Фюю! Един жълъд отскочи от тоягата на Мишконтин. После втори. После цял дъжд от жълъди.'),
        L('iskritsa', 'Стой! Още една крачка и ще те направя на мишеница! Шпионин на плъховете ли си?'),
        L('mishkontin', 'Шпионин? Аз съм Мишконтин от Мъхово! Виж — медальонът на Пазителите!', 'surprised'),
        L('iskritsa', '…О. Ооо. Значи ти си този с картата! Извинявай за жълъдите. Повечето. Аз съм Искрица, водачката на прашкарите от Пеещия бор.'),
        L('iskritsa', 'Плъховете на Шушумига ни изгониха от моста. Искам да ги ударя! Сега! Веднага! Идваш ли?'),
      ],
      choices: [
        {
          text: '„Да ударим заедно — сега!“', virtue: 'courage',
          actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'flag', flag: 'iskritsa_joined' }, { a: 'flag', flag: 'iskritsa_bold' }, { a: 'removeObj', id: 'iskritsa' }, { a: 'spawnHero', tpl: 'iskritsa', owner: 'player', x: 6, y: 12 }, { a: 'dialogue', id: 's2_iskritsa_bold' }],
        },
        {
          text: '„Първо да разузнаем. Добрият план е половин победа.“', virtue: 'wisdom',
          actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'iskritsa_joined' }, { a: 'flag', flag: 'iskritsa_planned' }, { a: 'removeObj', id: 'iskritsa' }, { a: 'spawnHero', tpl: 'iskritsa', owner: 'player', x: 6, y: 12 }, { a: 'troops', cid: 'squirrel', n: 4, hero: 'iskritsa' }, { a: 'reveal', x: 19, y: 11, r: 5 }, { a: 'dialogue', id: 's2_iskritsa_plan' }],
        },
        {
          text: '„Гората има нужда от теб тук. Пази Пеещия бор.“', virtue: 'kindness',
          actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'iskritsa_stayed' }, { a: 'removeObj', id: 'iskritsa' }, { a: 'troops', cid: 'squirrel', n: 8 }, { a: 'dialogue', id: 's2_iskritsa_stay' }],
        },
      ],
    },
    s2_iskritsa_bold: { id: 's2_iskritsa_bold', lines: [L('iskritsa', 'Ха! Това е приказка, каквато обичам! Катерици — след мен! Ъъъ… след нас!'), L('mishkontin', 'Само не стреляй по мен.', 'happy')] },
    s2_iskritsa_plan: {
      id: 's2_iskritsa_plan',
      lines: [
        L('iskritsa', 'Разузнаване… Добре. Ще се опитам да не стрелям първа. Ще се опитам.'),
        L('mishkontin', 'Виж: на моста има застава, а зад нея — Шушумига. Ако изчакаме седмица, ще имаме двойно повече прашкари.', 'map'),
        L('iskritsa', 'Двойно повече жълъди във въздуха… Харесва ми как мислиш, картографе.'),
      ],
    },
    s2_iskritsa_stay: {
      id: 's2_iskritsa_stay',
      lines: [
        L('iskritsa', 'Да пазя гората? …Добре. Някой трябва да го направи. Вземи поне моите най-добри прашкари.'),
        L('iskritsa', 'Но ако Мортис стигне до Сиренград — ще дойда. Обещавам с опашка на сърцето!'),
      ],
    },
    s2_troshko_friend: {
      id: 's2_troshko_friend',
      title: 'Странноприемницата на Трошко',
      lines: [
        L('troshko', 'Мишконтин! Моят спасител! Колелото още се върти благодарение на теб! Отворих си странноприемница — „При Трошко: топла супа и почти нови лъжици“.'),
        L('troshko', 'Ето — моят компас. Не, не, подарък е! Горе в планината пътят е хитър, а компасът е по-хитър.'),
      ],
      after: [{ a: 'artifact', art: 'compass' }, { a: 'flag', flag: 'troshko_friend' }, { a: 'flag', flag: 'troshko_s2_done' }, { a: 'res', res: { acorns: 500 } }],
    },
    s2_troshko_trade: {
      id: 's2_troshko_trade',
      title: 'Странноприемницата на Трошко',
      lines: [
        L('troshko', 'А, клиентът с честните жълъди! Добре дошъл. Имам точно това, което ти трябва: компас! Почти не е ял никой. Искам да кажа — почти не е ползван.'),
      ],
      choices: [
        { text: 'Купи компаса за 1500 жълъда.', requires: hasRes({ acorns: 1500 }), lockedHint: 'Нямаш 1500 жълъда.', actions: [{ a: 'res', res: { acorns: -1500 } }, { a: 'artifact', art: 'compass' }, { a: 'flag', flag: 'troshko_s2_done' }] },
        { text: '„Разкажи ми за пътя нагоре.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'reveal', x: 22, y: 6, r: 7 }, { a: 'flag', flag: 'troshko_s2_done' }, { a: 'dialogue', id: 's2_troshko_tale' }] },
        { text: '„Ще мина по-късно.“', actions: [] },
      ],
    },
    s2_troshko_tale: {
      id: 's2_troshko_tale',
      lines: [L('troshko', 'Нагоре пътят минава покрай голяма стража бръмбари. Казват, че пазят Старата порта от сто години. Аз лично не съм проверявал. Аз съм търговец, не герой.')],
    },
    s2_troshko_sold: {
      id: 's2_troshko_sold',
      title: 'Странноприемницата на Трошко',
      lines: [
        L('troshko', 'Мишконтин… трябва да ти призная нещо. Онова парче карта, дето го запомни наизуст… Продадох оригинала.'),
        L('troshko', 'На една дама-плъх с маска. Плати с истинско сирене! Откъде да знам, че е Шушумига?'),
        L('mishkontin', 'Значи и Шушумига знае пътя…', 'surprised'),
      ],
      choices: [
        { text: '„Случва се. Важно е, че ми каза истината.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'troshko_friend' }, { a: 'flag', flag: 'troshko_s2_done' }, { a: 'res', res: { acorns: 800 } }, { a: 'dialogue', id: 's2_troshko_thanks' }] },
        { text: '„Тогава ще трябва да съм по-бърз от нея.“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'flag', flag: 'troshko_s2_done' }] },
      ],
    },
    s2_troshko_thanks: { id: 's2_troshko_thanks', lines: [L('troshko', 'Ти… не ми се сърдиш? Ето, вземи сиренените пари. На мен не ми носят радост.')] },
    s2_troshko_angry: {
      id: 's2_troshko_angry',
      title: 'Странноприемницата на Трошко',
      lines: [
        L('troshko', 'Ти! Крадецът от гората! Как смееш да влизаш в моята странноприемница?'),
        L('troshko', 'Да знаеш — казах на плъховете, че идваш. Да видиш как е, когато някой ти вземе нещо!'),
      ],
      choices: [
        { text: '„Прости ми, Трошко. Сгреших. Ето 1000 жълъда за картата.“', virtue: 'kindness', requires: hasRes({ acorns: 1000 }), lockedHint: 'Нямаш 1000 жълъда.', actions: [{ a: 'res', res: { acorns: -1000 } }, { a: 'virtue', v: 'kindness', n: 2 }, { a: 'flag', flag: 'troshko_friend' }, { a: 'flag', flag: 'troshko_robbed', value: false }, { a: 'flag', flag: 'troshko_s2_done' }, { a: 'dialogue', id: 's2_troshko_forgive' }] },
        { text: 'Тръгни си мълчаливо.', actions: [] },
      ],
    },
    s2_troshko_forgive: {
      id: 's2_troshko_forgive',
      lines: [
        L('troshko', '…Хмф. Признаваш си. Това е повече, отколкото правят повечето.'),
        L('troshko', 'Добре. Простено ти е. Почти. Вземи този компас — и никога вече не грабвай нищо от таралеж!'),
      ],
      after: [{ a: 'artifact', art: 'compass' }],
    },
    s2_troshko_after: {
      id: 's2_troshko_after',
      lines: [
        L('troshko', 'Супа? Лъжица? Перо от врабче? Не? Е, приятен път, картографе!', undefined, hasNot('troshko_robbed')),
        L('troshko', 'Нямам какво да ти кажа.', undefined, has('troshko_robbed')),
      ],
    },
    s2_letokril_friend: {
      id: 's2_letokril_friend',
      title: 'Познат силует',
      lines: [
        L('letokril', 'Пст! Горе! Не, по-горе! Аз съм — Летокрил. Помниш ли паяжината?'),
        L('mishkontin', 'Летокрил! Какво правиш тук?', 'happy'),
        L('letokril', 'Напуснах Мортис. Някой веднъж ми помогна без нищо в замяна и… не можах да спра да мисля за това.'),
        L('letokril', 'Слушай: на юг има стар тунел под ждрелото. Вратата се отваря, ако натиснеш камъка с буквата „М“. Шушумига не знае за него.'),
        L('letokril', 'И още нещо — облетях цялата планина. Ето какво видях.'),
      ],
      after: [{ a: 'flag', flag: 'tunnel_open' }, { a: 'flag', flag: 'letokril_friend' }, { a: 'reveal', x: 17, y: 19, r: 4 }, { a: 'reveal', x: 26, y: 5, r: 7 }, { a: 'quest', id: 'tunnel', title: 'Старият тунел', text: 'Летокрил каза, че на юг има тунел под ждрелото. Вратата вече може да се отвори.' }],
    },
    s2_letokril_tower: {
      id: 's2_letokril_tower',
      title: 'Камбанарията',
      lines: [
        L('letokril', 'Пак ти… Дойде чак дотук? Кажи ми нещо, мишле. Защо изобщо ме пусна тогава, в мрежата?'),
      ],
      choices: [
        { text: '„Защото и ти заслужаваше помощ.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'letokril_friend' }, { a: 'flag', flag: 'letokril_s2_done' }, { a: 'artifact', art: 'featherQuill' }, { a: 'dialogue', id: 's2_letokril_gift' }] },
        { text: '„Честно? Трябваше ми информация.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'letokril_s2_done' }, { a: 'reveal', x: 28, y: 3, r: 6 }, { a: 'dialogue', id: 's2_letokril_honest' }] },
      ],
    },
    s2_letokril_gift: {
      id: 's2_letokril_gift',
      lines: [
        L('letokril', '…Никой не ми е казвал такова нещо. Никога.'),
        L('letokril', 'Вземи това перо. Носи вятъра. Ще ти трябва там горе. И ако някога имаш нужда от прилеп — просто погледни нагоре.'),
      ],
    },
    s2_letokril_honest: { id: 's2_letokril_honest', lines: [L('letokril', 'Поне си честен. Това е повече от Мортис. Ето — порталът е горе, зад стражата на бръмбарите. Довиждане, картографе.')] },
    s2_letokril_after: { id: 's2_letokril_after', lines: [L('narrator', 'Камбанарията е празна. Само едно перо се върти във вятъра.')] },
    s2_letokril_beaten: {
      id: 's2_letokril_beaten',
      title: 'Паднал прилеп',
      lines: [
        L('letokril', 'Пак ти. Винаги ти. Хайде, свършвай. Нали затова дойде?'),
        L('mishkontin', 'Не. Дойдох, защото ти ме помоли за помощ веднъж, а аз не ти я дадох.'),
      ],
      choices: [
        { text: '„Прости ми за паяжината. Свободен си.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'letokril_friend' }, { a: 'flag', flag: 'tunnel_open' }, { a: 'dialogue', id: 's2_letokril_second' }] },
        { text: '„Лети си. И не се връщай.“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }] },
      ],
    },
    s2_letokril_second: {
      id: 's2_letokril_second',
      lines: [
        L('letokril', '…Втори шанс. Не знаех, че ги раздават.'),
        L('letokril', 'На юг има стар тунел под ждрелото. Вратата вече е отворена — погрижих се. Довиждане… приятелю.'),
      ],
    },
    s2_grizan: {
      id: 's2_grizan',
      title: 'Самотен плъх',
      lines: [
        L('grizan', 'Мишле! Чакай, не стреляй! Аз съм — Гризан. Без шлем. Без армия. Без сирене.'),
        L('grizan', 'Избягах от Шушумига. Тя казва, че гладният плъх е послушен плъх. А аз си спомних твоя хляб.'),
        L('grizan', 'Знам за стария тунел на юг. Вратата се отваря с ритник отдолу. Сериозно. Пробвах.'),
      ],
      choices: [
        { text: '„Ела с нас, Гризане.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'tunnel_open' }, { a: 'flag', flag: 'grizan_friend' }, { a: 'flag', flag: 'grizan_s2_done' }, { a: 'troops', cid: 'rat', n: 12 }, { a: 'removeObj', id: 'grizan' }, { a: 'dialogue', id: 's2_grizan_join' }] },
        {
          text: '„Иди в Каменна стъпка. Там ще имаш хляб и работа.“', virtue: 'wisdom',
          actions: [
            { a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'tunnel_open' }, { a: 'flag', flag: 'grizan_friend' }, { a: 'flag', flag: 'grizan_s2_done' }, { a: 'removeObj', id: 'grizan' },
            { a: 'call', fn: (s) => { const t = s.towns.find((x) => x.id === 'stonestep'); if (t && t.owner === 'player') addToArmy(t.garrison, 'rat', 15); } },
            { a: 'toast', text: 'Гризан и петнайсет плъха пазят Каменна стъпка.', icon: '🐀' },
          ],
        },
      ],
    },
    s2_grizan_join: { id: 's2_grizan_join', lines: [L('grizan', 'Плъх в горската армия! Мама нямаше да повярва. Ама нищо — свиквай, мишле. Аз хъркам.'), L('narrator', 'Плъховете и горските не се познават добре — смесената армия има малко по-нисък морал.')] },
    s2_grizan_after: { id: 's2_grizan_after', lines: [L('narrator', 'Тук Гризан беше оставил огризка от хляб. Изглежда я пази за спомен.')] },
    s2_view: {
      id: 's2_view',
      title: 'Над облаците',
      lines: [
        L('mishkontin', 'Оттук се вижда Сиренград! А там долу… това армия ли е?', 'map'),
        L('narrator', 'По главния път към града пълзеше черна река от опашки. Начело вървеше едра фигура с лъскава капачка вместо корона.'),
        L('mishkontin', 'Мортис. Тръгнал е към Сиренград! Трябва да стигна портата преди него.', 'surprised'),
      ],
    },
    s2_taunt: {
      id: 's2_taunt',
      title: 'Шепот във вятъра',
      lines: [
        L('shushumiga', 'Шшш… малкото мишле с картата. Знам всичко за теб. Знам какво яде за закуска. Знам дори, че се страхуваш от височини.'),
        L('mishkontin', 'Не се страхувам от височини!', 'surprised'),
        L('shushumiga', 'Ще видим, мишле. Ще видим, когато погледнеш надолу от моста.'),
      ],
    },
    s2_outpost: {
      id: 's2_outpost',
      title: 'Сивата застава',
      lines: [
        L('narrator', 'Сивото знаме падна. На негово място някой закачи зелено наметало — малко, но много гордо.'),
        L('mishkontin', 'Мостът е свободен! Нагоре, към портата!', 'happy'),
      ],
    },
    s2_shushumiga_beaten: {
      id: 's2_shushumiga_beaten',
      lines: [
        L('shushumiga', 'Шшш… това не беше по плана. Нищо. Кралят вече е при стените на Сиренград. Ти закъсня, мишле.'),
        L('narrator', 'И Шушумига изчезна в мъглата, както изчезват шепотите.'),
      ],
    },
    s2_gate: {
      id: 's2_gate',
      title: 'Старата порта',
      bg: 'img/bg-siren.webp',
      lines: [
        L('narrator', 'Старата порта беше висока колкото десет мечока и стара колкото планината. По средата ѝ имаше вдлъбнатина с формата на буквата „М“.'),
        L('mishkontin', 'Медальонът…', 'map'),
        L('narrator', 'Мишконтин постави медальона в каменното легло. Нещо щракна дълбоко в скалата и портата се отвори с дълга въздишка.'),
        L('belagor', 'Най-сетне. Знаех си, че ще дойдеш, малки Пазителю.'),
        L('mishkontin', 'Белагор?! Значи сте истински!', 'surprised'),
        L('belagor', 'Почти. Останаха ми само перата и паметта. Слушай: Мортис обсажда Сиренград от главния път. Тази нощ портата е единственият път към града.'),
        L('belagor', 'И още нещо… Аз познавам Мортис. Отдавна. Но това е история за друга вечер.'),
      ],
    },
    s2_end: {
      id: 's2_end',
      title: 'През портата',
      lines: [
        L('narrator', 'Мишконтин мина през Старата порта и тя се затвори зад него с тихо „щрак“.'),
        L('narrator', 'Искрица вървеше до него и броеше на ум жълъдите си. „За всеки случай“, каза тя.', undefined, has('iskritsa_joined')),
        L('narrator', 'Някъде високо над тях кръжеше прилеп. Пазеше ги.', undefined, has('letokril_friend')),
        L('narrator', 'А Гризан, бившият капитан, хъркаше гръмко в обоза — за първи път сит.', undefined, has('grizan_friend')),
        L('mishkontin', 'Сиренград… Издръж още малко. Идваме.', 'map'),
      ],
    },
  },
};
