import { armyFrom } from '../../core/hero';
import type { ScenarioDef } from '../../core/scenario';
import type { GameState } from '../../core/types';
import { has, hasNot, hasRes, L, res, unlockDwelling } from './helpers';

/** Chapter 2 follows chapters 5–6 of the book: Zubodrobko, the tyrant of the forest, and the small ones who stood up together. */

const PLAN = ['squirrels_join', 'voles_join', 'hares_join', 'slope_scouted'];
const VOLE_WOOD = 8;
const HARE_CRUMBS = 1500;

const groupJoin = (flag: string, building: string, cid: string, n: number) => [
  { a: 'flag' as const, flag },
  { a: 'troops' as const, cid, n },
  { a: 'call' as const, fn: (s: GameState) => unlockDwelling(s, 'glade', building, cid, Math.ceil(n / 2)) },
];

export const S2: ScenarioDef = {
  id: 's2',
  number: 2,
  title: 'Тиранинът на гората',
  subtitle: 'Втора глава',
  bg: 'img/bg-woods.webp',
  intro: [
    'Следите доведоха Мишконтин и Искрица до гора с одрани дървета. Кората беше надраскана с дълбоки белези, а въздухът миришеше на страшно.',
    'Тук всички малки гризачи — полски мишки, полевки, катерици, дори зайци — носят храна на огромния пор Зъбодробко. Който не донесе, бива прогонен. Или изяден.',
    'Пътят към Каньона минава точно покрай дупката му под стария дъб. А някъде зад тях Белегор вече търси мишлето, което избяга от мелницата.',
  ],
  goals: [
    'Събери малките гризачи: катериците, полевките и зайците.',
    'Огледай стръмния склон край дупката на Зъбодробко.',
    'Изправи се срещу тиранина — с план, а не със сила.',
    'Стигни до Изсъхналия дъб на път за Каньона.',
    'Мишконтин трябва да оцелее. Не губи Горската поляна за повече от 3 дни.',
  ],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTT^^TTTTT',
    'TTT.,,,,,TTT......$..z.^^hhhhT',
    'TTT.,,S,,....j...,.....^^hhhhT',
    'TTTx,,,,,w.........hhh.^^...HT',
    'TTT....P..,.y...D..hhh.^^.:G.T',
    'TTT..........TTT.....::Z.:...T',
    'TTT...TTT....TTT....k..^^....T',
    'TTT...TTT....TTT.+::...^^..c.T',
    'TTT...TTT.E......:..hhh^^.,..T',
    'T....,.......:*::...hhh^^.B.KT',
    'T...@..f..:::..~.b,.hhh^^.u..T',
    'T..A::::::.#....~.N....^^....T',
    'T...I.....:.TTT..~.....^^^^^^T',
    'T..,.....!:.TTT...~=~....^^^^T',
    'T.........:.TTT....W.~.......T',
    'TTT.r.....:....o.TTT.~g....X.T',
    'TTT...TTT..:...::::::::::....T',
    'TTT...TTT..v:::..TTT.~...R...T',
    'TTTF..TTT..V.........~.......T',
    'TTT..?.....,.a.TTT.q..~J..TTTT',
    'TTT............TTT....~...TTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  legend: {
    A: { town: { kind: 'town', id: 'glade', name: 'Горската поляна', faction: 'forest', owner: 'player', built: ['hall', 'd1', 'tavern'], garrison: [['mouse', 6]], special: 'oak' } },
    R: { town: { kind: 'town', id: 'ratcamp', name: 'Лагерът на Белегор', faction: 'rats', owner: 'enemy', built: ['fort', 'd1', 'd2', 'd3', 'd4'], garrison: [['rat', 22], ['ratspear', 8], ['trapper', 6], ['veteran', 2]] } },
    '@': { terrain: ':', hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true } },
    I: { hero: { kind: 'hero', tpl: 'iskritsa', owner: 'player', carry: true } },
    f: { obj: { id: 'family', kind: 'npc', npc: 'fieldmouse', label: 'Семейството полски мишки', dialogue: 's2_family' } },
    S: { terrain: ',', obj: { id: 'squirrels', kind: 'npc', npc: 'oldsquirrel', label: 'Катериците от бора', dialogue: 's2_squirrels', repeatDialogue: 's2_joined', doneFlag: 'squirrels_join', readyFlag: 'squirrels_freed' } },
    P: { obj: { kind: 'monster', cid: 'trapper', n: 14, guard: true, label: 'Капанджиите на Белегор', flag: 'squirrels_freed' } },
    V: { obj: { id: 'voles', kind: 'npc', npc: 'vole', label: 'Полевките от ливадата', dialogue: 's2_voles', repeatDialogue: 's2_joined', doneFlag: 'voles_join', readyFlag: 'voles_ready' } },
    v: { obj: { kind: 'monster', cid: 'rat', n: 26, guard: true, label: 'Плъховете, които срутиха ходниците', flag: 'voles_freed' } },
    N: { obj: { id: 'hares', kind: 'npc', npc: 'hareelder', label: 'Зайците от полето', dialogue: 's2_hares', repeatDialogue: 's2_joined', doneFlag: 'hares_join', readyFlag: 'hares_ready' } },
    b: { terrain: ',', obj: { kind: 'monster', cid: 'ferret', n: 4, guard: true, label: 'Поровете — братовчеди на Зъбодробко', flag: 'hares_freed' } },
    k: { obj: { id: 'slope', kind: 'event', dialogue: 's2_slope', onlyHuman: true } },
    Z: { terrain: ':', obj: { id: 'zubodrobko', kind: 'npc', npc: 'zubodrobko', label: 'Зъбодробко, тиранинът на гората', dialogue: 's2_zub', doneFlag: 'zub_done', readyFlag: 'plan_ready' } },
    G: { obj: { id: 'dryoak', kind: 'goal', label: 'Изсъхналият дъб', dialogue: 's2_goal', flag: 's2_goal', needHero: 'mishkontin', needText: 'Мишконтин трябва да дойде тук — пътят към Каньона е негов.' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    c: { obj: { kind: 'mine', res: 'cheese', owner: null } },
    B: { obj: { kind: 'monster', cid: 'veteran', n: 4, guard: true, label: 'Съгледвачите на Белегор' } },
    K: { obj: { kind: 'artifact', art: 'bellCharm' } },
    D: { obj: { kind: 'dwelling', cid: 'mouse', available: 8, owner: null } },
    E: { obj: { kind: 'monster', cid: 'ferret', n: 2 } },
    F: { obj: { kind: 'monster', cid: 'wildcat', n: 1, guard: true, label: 'Дива котка' } },
    j: { obj: { kind: 'monster', cid: 'squirrel', n: 6, joinable: true } },
    W: { obj: { kind: 'monster', cid: 'rat', n: 18 } },
    g: { obj: { kind: 'monster', cid: 'ratspear', n: 8 } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { obj: { kind: 'shrine', effect: 'att', value: 1 } },
    '?': { obj: { kind: 'shrine', effect: 'kno', value: 1 } },
    '*': { obj: { kind: 'shrine', effect: 'reveal', value: 10, label: 'Високият пън' } },
    y: { obj: { kind: 'shrine', effect: 'spell', value: 0, spell: 'haste' } },
    H: { terrain: 'h', obj: { kind: 'artifact', art: 'shellShield' } },
    J: { obj: { kind: 'artifact', art: 'owlLens' } },
    '#': { terrain: ':', obj: { kind: 'sign', text: 'Някой е надраскал с нокът: „ТЕРИТОРИЯ НА ЗЪБОДРОБКО. ДАНЪКЪТ СЕ НОСИ ВСЯКА СУТРИН.“ Отдолу, с много по-малки букви: „помощ“.' } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 600 } },
    z: { obj: { kind: 'resource', res: 'acorns', amount: 500 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 5 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 5 } },
    u: { obj: { kind: 'resource', res: 'cheese', amount: 2 } },
    x: { obj: { kind: 'chest', acorns: 1000, xp: 900 } },
    X: { obj: { kind: 'chest', acorns: 1200, xp: 1000 } },
  },
  carryArmies: {
    mishkontin: armyFrom([['mouse', 22], ['vole', 4]]),
    iskritsa: armyFrom([['mouse', 10], ['wanderer', 6]]),
  },
  startRes: { player: res(3000, 10, 10, 2), enemy: res(4000, 15, 15, 4) },
  heroPool: { player: ['harescout', 'oldsquirrel'], enemy: ['ostrozab', 'sivoopashko'] },
  weekNames: ['Седмица на одраните дървета', 'Седмица на гладните мишлета', 'Седмица на шишарките', 'Седмица на въжената стълба', 'Седмица на песните'],
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [{ a: 'dialogue', id: 's2_intro' }],
    },
    {
      id: 'belegor_camp',
      when: (s, e) => e.t === 'day' && s.day === 3,
      actions: [
        { a: 'dialogue', id: 's2_belegor' },
        { a: 'spawnHero', tpl: 'belegor', owner: 'enemy', x: 24, y: 17, role: 'boss', activeFrom: 11, targetTown: 'ratcamp', army: [['rat', 26], ['ratspear', 10], ['trapper', 8], ['veteran', 4]] },
      ],
    },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 6,
      actions: [
        { a: 'spawnHero', tpl: 'ostrozab', owner: 'enemy', x: 23, y: 16, role: 'raider', targetTown: 'ratcamp', army: [['rat', 18], ['ratspear', 5]] },
        { a: 'toast', text: 'Патрул на Белегор тръгна към Горската поляна!', icon: '🐀' },
      ],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 12,
      actions: [
        { a: 'spawnHero', tpl: 'sivoopashko', owner: 'enemy', x: 24, y: 18, role: 'raider', targetTown: 'ratcamp', army: [['rat', 20], ['trapper', 7], ['ratspear', 5]] },
        { a: 'toast', text: 'Още плъхове тръгнаха от лагера!', icon: '🐀' },
      ],
    },
    {
      // Keeps the "can help now" flags in sync with the player's resources.
      id: 'ready',
      repeat: true,
      when: (s) => {
        s.flags.voles_ready = !!s.flags.voles_freed && s.players.player.res.wood >= VOLE_WOOD;
        s.flags.hares_ready = !!s.flags.hares_freed && s.players.player.res.acorns >= HARE_CRUMBS;
        return false;
      },
      actions: [],
    },
    {
      id: 'plan',
      when: (s) => PLAN.every((f) => s.flags[f]) && !s.flags.plan_ready,
      actions: [{ a: 'flag', flag: 'plan_ready' }, { a: 'questDone', id: 'unite' }, { a: 'dialogue', id: 's2_plan' }],
    },
    {
      id: 'glade_lost',
      repeat: true,
      when: (s, e) => e.t === 'capture' && e.townId === 'glade' && e.by === 'enemy' && (s.vars.gladeLost ?? 0) === 0,
      actions: [
        { a: 'call', fn: (s) => (s.vars.gladeLost = s.day) },
        { a: 'toast', text: 'Плъховете превзеха Горската поляна! Имаш 3 дни да си я върнеш.', icon: '⚠️' },
      ],
    },
    {
      id: 'glade_back',
      repeat: true,
      when: (_s, e) => e.t === 'capture' && e.townId === 'glade' && e.by === 'player',
      actions: [{ a: 'call', fn: (s) => (s.vars.gladeLost = 0) }],
    },
    {
      id: 'camp_taken',
      when: (_s, e) => e.t === 'capture' && e.townId === 'ratcamp' && e.by === 'player',
      actions: [{ a: 'dialogue', id: 's2_camp' }],
    },
  ],
  checkEnd: (s) => {
    if (s.flags.s2_goal && s.flags.zub_done && s.pendingDialogues.length === 0) return { status: 'won', reason: '' };
    const lost = s.vars.gladeLost ?? 0;
    if (lost && s.day >= lost + 3 && s.towns.find((t) => t.id === 'glade')?.owner !== 'player') {
      return { status: 'lost', reason: 'Горската поляна остана в лапите на плъховете. Малките гризачи отново останаха сами.' };
    }
    return null;
  },
  victoryDialogue: () => 's2_victory',
  dialogues: {
    s2_intro: {
      id: 's2_intro',
      title: 'Срещата с тирана на гората',
      bg: 'img/bg-woods.webp',
      lines: [
        L('iskritsa', 'Хич не ми харесва това място. Нещо не е наред тук.'),
        L('narrator', 'Изведнъж се чу писукване — уплашено гласче. До един храст се бяха сгушили майка, татко и две съвсем малки полски мишлета. Пред тях стоеше огромен пор.'),
        L('zubodrobko', 'Храната! Къде е храната, която трябваше да ми донесете днес?'),
        L('fieldmouse', 'Молим те, Зъбодробко. Носихме ти храна цяла седмица. Децата ни гладуват. Остави ни малко и за нас.'),
        L('zubodrobko', 'Малко? Аз ви позволявам да дишате въздуха тук! Ако до утре не ми донесете двойно повече — ще ви изгоня от гората. Или още по-лошо… ще ви изям.'),
        L('narrator', 'Порът си тръгна, като си подсвиркваше доволно. Мишконтин погледна двете мишлета — гладни и изплашени — и видя себе си в нощта, когато плъховете нахлуха у дома.'),
        L('iskritsa', 'Мишконтин, знам какво мислиш. Но този пор е огромен. Трябва да заобиколим. Не можеш да спасиш всички.'),
      ],
      choices: [
        {
          text: '„Ако не помогна сега, какъв смисъл има да бъда смел, ако използвам силата само за себе си?“', virtue: 'courage',
          actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'virtue', v: 'kindness', n: 1 }, { a: 'dialogue', id: 's2_together' }],
        },
        { text: '„Права си… Но нека поне поговорим с другите гризачи.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'dialogue', id: 's2_together' }] },
      ],
    },
    s2_together: {
      id: 's2_together',
      lines: [
        L('iskritsa', 'Но ти не си силен, Мишконтин. Не по-силен от пора.'),
        L('mishkontin', 'Знам. Може би не трябва да се биеш със сила срещу сила. Може би трябва да използваш главата си.', 'map'),
        L('iskritsa', 'Добре. Ако ще го правиш, ще го правим заедно. Но трябва да имаме план.'),
        L('mishkontin', 'Имам идея. Но ще се нуждаем от помощта на другите гризачи.'),
      ],
      after: [
        { a: 'quest', id: 'unite', title: 'Заедно сме по-силни', text: 'Говори с катериците (на север, при бора), полевките (на юг, при ливадата) и зайците (на изток, при полето). Плъховете на Белегор и поровете ги държат в страх — прогони ги. Полевките ще искат клонки за подпори, а гладните зайци — трохи. Огледай и стръмния склон край пътеката на Зъбодробко.' },
        { a: 'reveal', x: 6, y: 2, r: 3 }, { a: 'reveal', x: 11, y: 18, r: 3 }, { a: 'reveal', x: 18, y: 11, r: 3 },
      ],
    },
    s2_family: {
      id: 's2_family',
      title: 'Полските мишки',
      lines: [
        L('fieldmum', 'Не сме добре. Но благодаря, че питате.'),
        L('fieldmouse', 'Заминахме от предишното си място заради по-лош враг — крал Мортис. А ако заминем и оттук, накъде? Навсякъде има по някой тиранин. А ние сме само мишки.'),
        L('fieldmouse', 'Всички тук му носим храна — и катериците, и полевките, и зайците. Всички мълчим и се покоряваме.', undefined, hasNot('plan_ready')),
        L('fieldmum', 'Чух, че сте говорили с всички. Утре сутрин… и ние ще бъдем там.', 'happy', has('plan_ready')),
      ],
    },
    s2_squirrels: {
      id: 's2_squirrels',
      title: 'Катериците от бора',
      lines: [
        L('oldsquirrel', 'Мишле с медальон? Ако си дошъл за данъка — Зъбодробко вчера взе последните ни шишарки.'),
        L('narrator', 'Около бора плъховете-капанджии на Белегор са опънали мрежи. Катериците не смеят да слязат.', undefined, hasNot('squirrels_freed')),
        L('mishkontin', 'Защо не се съберете всички заедно и не му се противопоставите?'),
        L('oldsquirrel', 'Защото всички се страхуваме. И никой не иска да бъде първият, който ще излезе срещу него. Защото първият е този, който ще пострада.'),
      ],
      choices: [
        { text: '„Тогава няма да има първи. Ще излезем всички наведнъж. Заедно.“', virtue: 'courage', requires: has('squirrels_freed'), lockedHint: 'Първо прогони капанджиите.', actions: [{ a: 'virtue', v: 'courage', n: 1 }, ...groupJoin('squirrels_join', 'd3', 'squirrel', 8), { a: 'dialogue', id: 's2_squirrels_yes' }] },
        { text: '„Първо ще махна мрежите от бора ви.“', requires: hasNot('squirrels_freed'), actions: [] },
      ],
    },
    s2_squirrels_yes: {
      id: 's2_squirrels_yes',
      lines: [L('oldsquirrel', 'Всички наведнъж… Хм. Ние знаем къде растат най-дългите лози в гората. И имаме много шишарки. Ще дойдем.', 'happy')],
    },
    s2_voles: {
      id: 's2_voles',
      title: 'Полевките от ливадата',
      lines: [
        L('vole', 'Шшт! Плъховете срутиха ходниците ни, докато търсеха някакво избягало мишле. А после дойде и Зъбодробко за данъка.', undefined, hasNot('voles_freed')),
        L('vole', 'Ти ли прогони плъховете? Значи ти си избягалото мишле! Какво искаш от нас?', 'surprised', has('voles_freed')),
        L('mishkontin', 'Искам да спрете да мълчите. Всички заедно.'),
        L('vole', 'Първо трябва да подпрем ходниците, иначе малките няма къде да спят. Трябват ни 8 здрави клонки.', undefined, has('voles_freed')),
      ],
      choices: [
        {
          text: `„Ето клонки за подпорите. Никой няма да е сам.“ (${VOLE_WOOD} 🌲)`, virtue: 'kindness', requires: (s) => !!s.flags.voles_freed && hasRes({ wood: VOLE_WOOD })(s), lockedHint: 'Прогони плъховете и събери 8 клонки.',
          actions: [{ a: 'res', res: { wood: -VOLE_WOOD } }, { a: 'virtue', v: 'kindness', n: 1 }, ...groupJoin('voles_join', 'd2', 'vole', 8), { a: 'dialogue', id: 's2_voles_yes' }],
        },
        { text: '„Ще се върна.“', actions: [] },
      ],
    },
    s2_voles_yes: {
      id: 's2_voles_yes',
      lines: [L('vole', 'Ние сме дребни, но копаем бързо и връзваме здраво. Кажи ни кога.', 'happy')],
    },
    s2_hares: {
      id: 's2_hares',
      title: 'Зайците от полето',
      lines: [
        L('hare', 'Внимавай! Поровете — братовчедите на Зъбодробко — дебнат точно там. Ние тичаме бързо, но от тях не можем да избягаме.', undefined, hasNot('hares_freed')),
        L('hare', 'Мишле прогони поровете?! Това трябва да го видя пак. Но малките ни гладуват — Зъбодробко взе всичко. Гладен заек не тича.', 'surprised', has('hares_freed')),
      ],
      choices: [
        {
          text: `„Ето трохи за малките. Ще ни трябват здрави клони — и вашите бързи крака.“ (${HARE_CRUMBS} 🍞)`, virtue: 'courage', requires: (s) => !!s.flags.hares_freed && hasRes({ acorns: HARE_CRUMBS })(s), lockedHint: 'Прогони поровете и събери 1500 трохи.',
          actions: [{ a: 'res', res: { acorns: -HARE_CRUMBS } }, { a: 'virtue', v: 'courage', n: 1 }, ...groupJoin('hares_join', 'd4', 'hare', 3), { a: 'dialogue', id: 's2_hares_yes' }],
        },
        { text: '„Ще се върна.“', actions: [] },
      ],
    },
    s2_hares_yes: {
      id: 's2_hares_yes',
      lines: [L('hare', 'Клони ли? Ние знаем къде са най-здравите. Тичаме!', 'happy')],
    },
    s2_joined: {
      id: 's2_joined',
      lines: [L('narrator', 'Тук вече не се крие никой. Гризачите говорят тихо за утрешния ден — и никой не казва „аз съм първият“, защото ще бъдат всички.')],
    },
    s2_slope: {
      id: 's2_slope',
      title: 'Стръмният склон',
      lines: [
        L('narrator', 'Пътеката, по която Зъбодробко минава всяка сутрин, се вие покрай стръмен склон. Склонът е покрит със сухи листа и хлъзгави камъни и завършва с голяма дупка.'),
        L('mishkontin', 'Ако го изненадаме точно тук, ще изгуби равновесие и ще се претърколи надолу…', 'map'),
        L('mishkontin', 'Всеки камък. Всяко дърво. Всеки корен. Трябва да ги запомня наизуст.'),
      ],
      after: [{ a: 'flag', flag: 'slope_scouted' }, { a: 'virtue', v: 'wisdom', n: 1 }],
    },
    s2_plan: {
      id: 's2_plan',
      title: 'Планът',
      lines: [
        L('narrator', 'Мишконтин прекара цялата нощ в обмисляне на детайлите. На зазоряване двамата седяха зад един храст до пътеката.'),
        L('iskritsa', 'Ако продължиш да стискаш лапите си така, ще направиш сок от тревата.'),
        L('mishkontin', 'Просто… ги подготвям. Дано планът ми не е глупав…'),
        L('iskritsa', 'Тогава ще измислим по-умен. Ние сме двама. Това вече удвоява мозъците ни.'),
        L('mishkontin', 'Добре… значи не съм луд?'),
        L('iskritsa', 'Не. Само си смело мишле с малко треперещи лапи. Хайде. Една крачка напред. Аз ще пазя от храста.', 'happy'),
        L('narrator', 'Всички са по местата си. Сега Мишконтин трябва да излезе на пътеката пред Зъбодробко.'),
      ],
      after: [{ a: 'quest', id: 'tyrant', title: 'Първата крачка', text: 'Излез на пътеката пред Зъбодробко (при прохода на изток). Катериците, полевките и зайците чакат в засада.' }],
    },
    s2_zub: {
      id: 's2_zub',
      title: 'Зъбодробко',
      lines: [
        L('zubodrobko', 'Какво е това? Едно мъничко мишле се е решило да застане пред мен? Да не си ми донесло закуска?'),
        L('iskritsa', 'Мишконтин, не така! Сам срещу него нямаш шанс. Трябва ни план — и всички гризачи заедно.', 'surprised', hasNot('plan_ready')),
        L('mishkontin', 'Не съм дошъл да ти нося нищо. Дошъл съм да ти кажа, че времето ти тук свърши. Няма повече да тормозиш малките животни в тази гора.', undefined, has('plan_ready')),
        L('zubodrobko', 'Ти… ти, малко нещастно мишле! Ти смееш да ми говориш така?', undefined, has('plan_ready')),
        L('mishkontin', 'Смея.', undefined, has('plan_ready')),
      ],
      choices: [
        {
          text: 'Бягай към склона — точно по плана!', virtue: 'courage', requires: has('plan_ready'), lockedHint: 'Нужни са катериците, полевките, зайците и огледан склон.',
          actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'dialogue', id: 's2_chase' }],
        },
        { text: 'Отстъпи. Още не сме готови.', requires: hasNot('plan_ready'), actions: [] },
      ],
    },
    s2_chase: {
      id: 's2_chase',
      title: 'Първата голяма победа',
      bg: 'img/bg-woods.webp',
      lines: [
        L('narrator', 'Зъбодробко се втурна право към Мишконтин. Земята се разтърси. А лапите на мишлето сякаш бяха залепнали за земята.'),
        L('iskritsa', 'Мишконтин, бягаааай!'),
        L('zubodrobko', 'Няма да ми избягаш, мишле! Ще те изям още тук и сега!'),
        L('narrator', 'Мишконтин знаеше пътеката наизуст. На първия завой от двете страни изскочиха катериците, полевките, дори зайците — и всички в един глас завикаха и захвърляха шишарки.'),
        L('oldsquirrel', 'Хей, тлъстак! Тук сме!'),
        L('vole', 'Не можеш да ни хванеш всички, грознико!'),
        L('narrator', 'Лапите на пора се подхлъзнаха на сухите листа. „Не, не, нееееее!“ — и след продължително търкаляне, което предизвика много кискане, Зъбодробко се стовари в голямата дупка.'),
        L('zubodrobko', 'Помощ… Някой да ме извади оттук… Обещавам, че ще се променя!'),
        L('fieldmum', 'Години наред ни тормозеше, Зъбодробко. Гладувахме, за да те храним. Защо сега да ти помагаме?'),
      ],
      choices: [
        {
          text: '„Може да е лъжа. Но ние не сме като него. Ще го извадим.“', virtue: 'kindness',
          actions: [{ a: 'virtue', v: 'kindness', n: 2 }, { a: 'flag', flag: 'zub_forgiven' }, { a: 'item', item: 'ladder' }, { a: 'dialogue', id: 's2_ladder' }],
        },
        { text: '„Нека си стои в дупката. Заслужи си го.“', actions: [{ a: 'virtue', v: 'kindness', n: -1 }, { a: 'flag', flag: 'zub_left' }, { a: 'dialogue', id: 's2_leave' }] },
      ],
    },
    s2_ladder: {
      id: 's2_ladder',
      title: 'Заедно сме по-силни',
      lines: [
        L('iskritsa', 'Прав е. Ако го оставим там, ще станем като него. А ние не сме такива.'),
        L('fieldmouse', 'Добре. Ще ти помогнем — не защото го заслужаваш, а защото ние избираме да бъдем по-добри.'),
        L('narrator', 'Катериците донесоха най-дългите лози. Зайците — здрави клони. Полевките и полските мишки вързаха всичко на място. „Виж само!“ — каза Искрица. — „Преди часове всички се криеха едни от други.“'),
        L('narrator', 'Зъбодробко се изкачи по въжената стълба. Видя всички животни заедно — не изплашени, а спокойни и твърди. И нещо в него се пречупи. Когато никой не се плаши от теб, ти вече не си страшен.'),
        L('fieldmum', 'Не се връщай тук! Махай се дълбоко в гората и не се показвай повече!'),
      ],
      after: [{ a: 'dialogue', id: 's2_after' }],
    },
    s2_leave: {
      id: 's2_leave',
      lines: [
        L('iskritsa', 'Мишконтин… Ако го оставим там, няма ли да станем като него?', 'surprised'),
        L('narrator', 'Дълго никой не каза нищо. Накрая полевките тихо спуснаха няколко лози в дупката и се обърнаха. На сутринта дупката беше празна.'),
      ],
      after: [{ a: 'dialogue', id: 's2_after' }],
    },
    s2_after: {
      id: 's2_after',
      lines: [
        L('narrator', 'Животните ликуваха, подскачаха и пееха.'),
        L('oldsquirrel', 'Вие ни спасихте! За вас ще пеем песни и няма да ви забравим!', 'happy'),
        L('fieldmouse', 'Миналата вечер ви чух да си говорите за пътя към Тъмните тунели. Ако наистина искате да ги откриете, трябва да стигнете до Каньона.'),
        L('fieldmouse', 'Наближавате. Вървете право през скалите, после покрай изсъхналия дъб. Успех, приятели!'),
      ],
      after: [
        { a: 'removeObj', id: 'zubodrobko' },
        { a: 'flag', flag: 'zub_done' },
        { a: 'questDone', id: 'tyrant' },
        { a: 'troops', cid: 'hare', n: 2 },
        { a: 'quest', id: 'canyon', title: 'Към Каньона', text: 'Вървете право през скалите (през прохода, където стоеше Зъбодробко), после покрай Изсъхналия дъб.' },
        { a: 'reveal', x: 27, y: 4, r: 4 },
      ],
    },
    s2_belegor: {
      id: 's2_belegor',
      title: 'Белегор',
      lines: [
        L('belegor', 'Мишлето от мелницата е минало оттук. Виждам следите му. И следите на още една мишка.'),
        L('belegor', 'Построете лагер. Сложете мрежи по дърветата. Крал Мортис не обича да чака.'),
        L('narrator', 'Белегор е разположил лагера си на югоизток. След две седмици ще тръгне на лов сам.'),
      ],
    },
    s2_camp: {
      id: 's2_camp',
      title: 'Лагерът на Белегор',
      lines: [
        L('narrator', 'В лагера има празни клетки, ръждиви капани и купчини откраднати трохи. На земята е надраскана карта: каньон, черни скали и един тунел.'),
        L('mishkontin', 'Тунелите на Мортис… Значи наистина е близо.', 'map'),
      ],
      after: [{ a: 'res', res: { acorns: 2000, cheese: 3 } }],
    },
    s2_goal: {
      id: 's2_goal',
      title: 'Изсъхналият дъб',
      lines: [
        L('narrator', 'Изсъхналият дъб стърчеше като стар пазач. Отвъд него земята ставаше каменлива, а дърветата — все по-редки.'),
        L('mishkontin', 'Първо трябва да помогнем на гризачите. Не можем да ги оставим със Зъбодробко.', undefined, hasNot('zub_done')),
      ],
    },
    s2_victory: {
      id: 's2_victory',
      title: 'Мъдростта на търпението',
      bg: 'img/bg-hills.webp',
      lines: [
        L('narrator', 'Има моменти, в които сърцето ти иска да тича. Да действа веднага. Да спасява. Но има и други — тихи и важни, в които най-смелото нещо е да останеш неподвижен. Да наблюдаваш. Да изчакаш.'),
        L('iskritsa', 'Утре ще стигнем до Каньона. Обещай ми, че няма да правиш нищо прибързано.'),
        L('mishkontin', 'Ще се опитам. Но лапите ми вече искат да тичат.', 'happy'),
        L('narrator', 'Зад тях, дълбоко в гората, един голям пор вървеше с наведена глава. Никой вече не се страхуваше от него.', undefined, has('zub_forgiven')),
      ],
    },
  },
};
