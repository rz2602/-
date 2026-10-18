import { addToArmy, armyFrom } from '../../core/hero';
import type { ScenarioDef } from '../../core/scenario';
import type { GameEvent } from '../../core/scenario';
import type { GameState } from '../../core/types';
import { has, hasNot, keepResting, L, res, startRest } from './helpers';

/** Chapter 3 follows chapters 7–9 of the book: the canyon, the Dark Tunnels, the fire rings, old Mortis and forgiveness. */

const throne = (s: GameState) => s.towns.find((t) => t.id === 'throne');

/** The rats lose heart when the eagles come (or when the freed mice stand together). */
function scatterRats(s: GameState, keep: number): void {
  const t = throne(s);
  const cut = (st: { n: number } | null) => {
    if (st) st.n = Math.max(1, Math.round(st.n * keep));
  };
  if (t) t.garrison.forEach(cut);
  for (const h of s.heroes) if (h.alive && h.owner === 'enemy' && (h.id === 'mortis' || h.id === 'belegor')) h.army.forEach(cut);
}

/** Golden-wing's eagles come for Letokril's friend; otherwise the freed mice stand together. */
function helpArrives(s: GameState): void {
  const m = s.heroes.find((h) => h.id === 'mishkontin' && h.alive);
  if (s.flags.letokril_friend) {
    scatterRats(s, 0.6);
    s.flags.eagles_came = true;
    if (m && addToArmy(m.army, 'eagle', 4)) s.toasts.push({ text: '4 орли на крал Златокрил се присъединяват!', icon: '🦅' });
  } else {
    scatterRats(s, 0.85);
    if (m && addToArmy(m.army, 'mouse', 15)) s.toasts.push({ text: 'Още 15 освободени мишки застават до Мишконтин!', icon: '🐭' });
  }
}

const mortisCaught = (s: GameState, e: GameEvent) =>
  (e.t === 'defeatHero' && e.heroId === 'mortis') ||
  (e.t === 'capture' && e.townId === 'throne' && e.by === 'player' && !s.heroes.some((h) => h.id === 'mortis' && h.alive && h.x === throne(s)?.x && h.y === throne(s)?.y));

export const S3: ScenarioDef = {
  id: 's3',
  number: 3,
  title: 'Тъмните тунели',
  subtitle: 'Трета глава',
  bg: 'img/bg-hills.webp',
  intro: [
    'Отвъд изсъхналия дъб земята се отваря в дълбок каньон. Скалите там са черни и остри като зъби. Долу пазят десетки плъхове, а навсякъде има капани с ръждясали метални зъби.',
    'Под каньона са Тъмните тунели на крал Мортис. Там, в стотици клетки, са всички мишки на Сиренград. И мама, и татко.',
    'Сърцето на Мишконтин казва: „Сега!“ Но Искрица знае, че понякога най-смелото нещо е да изчакаш.',
  ],
  goals: [
    'Наблюдавай Каньона от Големия камък на ръба.',
    'Промъкни се в Тъмните тунели.',
    'Намери начин да освободиш всички мишки наведнъж.',
    'Изправи се пред крал Мортис.',
    'Мишконтин трябва да оцелее. Не губи лагера за повече от 3 дни.',
  ],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'T..........*.TTT....q.,..TTTxT',
    'T....::::::::::::::::....TTT.T',
    'T..A:..hhh.......H.,.::+::...T',
    'T..I@:.hOh^^^^^^^^^^^^^^^.:.aT',
    'T..,..:hhh^^^^^^^^^^^^^^^.h:hT',
    'T.?..e.:..^^ddddddddddd^^.h:hT',
    'T.......::dddmddddddddd^^.h:hT',
    'TTTT......^^:dddvddddid^^..:.T',
    'TTTT..!...^^dtddddddkdd^^o.:.T',
    'TTTT.....g^^dddudlydddd^^..:,T',
    'TTTT......^^ddbddddzddd^p..:cT',
    'TTTT.w..r.^^dddYEdFdddd^^.W:.T',
    'T.........^^^^^^^d^^^^^^^...KT',
    'T.j..,^^^^^^^^^^^d^^^^^^^^^^^T',
    'T.,...^^dddddd^dddddd^dddddd^T',
    'TJ....$^dddCdd^ddddddfddddNd^T',
    'T...TT^^dddddd^dddddd^ddddRd^T',
    'TTTTTT^^ddXddPddddddd^dddBdd^T',
    'TTTTTT^^ddddddddddddd^dddddd^T',
    'TTTTTT^^^^^^^^^^^^^^^^^^^^^^^T',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  legend: {
    A: { town: { kind: 'town', id: 'drycamp', name: 'Лагерът при изсъхналия дъб', faction: 'forest', owner: 'player', built: ['hall', 'd1', 'd2', 'd3', 'tavern', 'library'], garrison: [['mouse', 10], ['vole', 4]], special: 'camp' } },
    R: { town: { kind: 'town', id: 'throne', name: 'Тронната зала', faction: 'rats', owner: 'enemy', built: ['fort', 'fort2', 'd1', 'd2', 'd3', 'd4', 'd5'], garrison: [['guard', 3], ['veteran', 5], ['rat', 26]], special: 'tunnels' } },
    '@': { terrain: ':', hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true } },
    I: { hero: { kind: 'hero', tpl: 'iskritsa', owner: 'player', carry: true } },
    N: { terrain: 'd', hero: { kind: 'hero', tpl: 'mortis', owner: 'enemy', role: 'guard', targetTown: 'throne', army: [['guard', 3], ['veteran', 6], ['ratspear', 12]] } },
    B: { terrain: 'd', hero: { kind: 'hero', tpl: 'belegor', owner: 'enemy', role: 'guard', targetTown: 'throne', army: [['rat', 30], ['ratspear', 12], ['trapper', 10], ['veteran', 4]] } },
    e: { obj: { id: 'tracks', kind: 'event', dialogue: 's3_tracks', onlyHuman: true } },
    O: { terrain: 'h', obj: { id: 'lookout', kind: 'goal', label: 'Големият камък на ръба', dialogue: 's3_lookout', flag: 'lookout_visited', needHero: 'mishkontin', needText: 'Мишконтин трябва да види каньона със собствените си очи.' } },
    t: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    u: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    v: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    y: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    z: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    b: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    k: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    l: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    i: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    m: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    Y: { terrain: 'd', obj: { kind: 'trap', pct: 0.2 } },
    E: { terrain: 'd', obj: { id: 'guardW', kind: 'monster', cid: 'veteran', n: 6, guard: true, label: 'Стражата при входа' } },
    F: { terrain: 'd', obj: { id: 'guardE', kind: 'monster', cid: 'ratspear', n: 14, guard: true, label: 'Стражата при входа' } },
    C: { terrain: 'd', obj: { id: 'cells', kind: 'npc', npc: 'cells', label: 'Стотици клетки', dialogue: 's3_cells', repeatDialogue: 's3_cells_after', doneFlag: 'cells_seen' } },
    P: { terrain: 'd', obj: { id: 'parents', kind: 'npc', npc: 'mama', label: 'Последната клетка', dialogue: 's3_parents', repeatDialogue: 's3_parents_after', doneFlag: 'parents_done' } },
    f: { terrain: 'd', obj: { id: 'fire', kind: 'npc', npc: 'fire', label: 'Огнените обръчи', dialogue: 's3_fire', doneFlag: 'lever_pulled', readyFlag: 'parents_done' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    c: { obj: { kind: 'mine', res: 'cheese', owner: null } },
    W: { obj: { kind: 'monster', cid: 'wildcat', n: 2, guard: true, label: 'Диви котки' } },
    K: { obj: { kind: 'artifact', art: 'clover' } },
    j: { obj: { kind: 'monster', cid: 'hare', n: 4, joinable: true } },
    g: { obj: { kind: 'monster', cid: 'trapper', n: 9 } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { obj: { kind: 'shrine', effect: 'def', value: 1 } },
    '?': { obj: { kind: 'shrine', effect: 'pow', value: 1 } },
    '*': { obj: { kind: 'shrine', effect: 'xp', value: 1000 } },
    H: { obj: { kind: 'artifact', art: 'thornSword' } },
    J: { obj: { kind: 'artifact', art: 'honeyCup' } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 800 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 6 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 6 } },
    p: { obj: { kind: 'resource', res: 'cheese', amount: 3 } },
    x: { obj: { kind: 'chest', acorns: 1500, xp: 1200 } },
    X: { terrain: 'd', obj: { kind: 'chest', acorns: 1500, xp: 1200 } },
  },
  carryArmies: {
    mishkontin: armyFrom([['mouse', 30], ['vole', 10], ['squirrel', 8], ['hare', 3]]),
    iskritsa: armyFrom([['mouse', 14], ['squirrel', 6], ['wanderer', 6]]),
  },
  startRes: { player: res(4000, 15, 15, 4), enemy: res(5000, 20, 20, 6) },
  heroPool: { player: ['harescout', 'oldsquirrel'], enemy: ['ostrozab', 'sivoopashko'] },
  weekNames: ['Седмица на черните скали', 'Седмица на смяната в зори', 'Седмица на огнените обръчи', 'Седмица на прошката'],
  setup: (s) => {
    // Old Mortis sits on his throne.
    const t = throne(s);
    const m = s.heroes.find((h) => h.id === 'mortis');
    if (t && m) {
      m.x = t.x;
      m.y = t.y;
    }
  },
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [
        { a: 'dialogue', id: 's3_intro' },
        { a: 'quest', id: 'watch', title: 'Наблюдавай', text: 'Иди с Мишконтин до Големия камък на ръба на Каньона (северозапад от каньона) и огледай стражите и капаните.' },
      ],
    },
    {
      id: 'rest',
      repeat: true,
      when: (s, e) => e.t === 'day' && s.day < (s.vars.restWatch ?? 0),
      actions: [{ a: 'call', fn: (s) => keepResting(s, 'restWatch') }, { a: 'toast', text: 'Мишконтин и Искрица наблюдават каньона зад големия камък. Броят стражите. Чакат.', icon: '👀' }],
    },
    {
      id: 'dawn',
      when: (s, e) => e.t === 'day' && !!s.flags.watching && s.day >= (s.vars.restWatch ?? 99),
      actions: [{ a: 'dialogue', id: 's3_dawn' }],
    },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 5,
      actions: [
        { a: 'spawnHero', tpl: 'ostrozab', owner: 'enemy', x: 17, y: 9, role: 'raider', targetTown: 'throne', army: [['rat', 22], ['ratspear', 6], ['trapper', 4]] },
        { a: 'toast', text: 'Плъхове излязоха от каньона и тръгнаха към лагера!', icon: '🐀' },
      ],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 13,
      actions: [
        { a: 'spawnHero', tpl: 'sivoopashko', owner: 'enemy', x: 15, y: 8, role: 'raider', targetTown: 'throne', army: [['rat', 26], ['trapper', 8], ['veteran', 3]] },
        { a: 'toast', text: 'Нов патрул търси мишлето, което шпионира каньона!', icon: '🐀' },
      ],
    },
    {
      id: 'tunnels_entered',
      when: (s, e) => e.t === 'enter' && e.y >= 15 && e.x >= 8 && s.heroes.find((h) => h.id === e.heroId)?.owner === 'player',
      actions: [{ a: 'dialogue', id: 's3_inside' }, { a: 'questDone', id: 'watch' }],
    },
    {
      id: 'throne_door',
      when: (s, e) => {
        if (e.t !== 'enter' || !s.flags.lever_pulled) return false;
        const t = throne(s);
        const h = s.heroes.find((x) => x.id === e.heroId);
        return !!t && !!h && h.owner === 'player' && Math.max(Math.abs(e.x - t.x), Math.abs(e.y - t.y)) <= 3;
      },
      actions: [{ a: 'dialogue', id: 's3_throne' }],
    },
    {
      id: 'mercy',
      when: mortisCaught,
      actions: [{ a: 'dialogue', id: 's3_mercy' }],
    },
    {
      id: 'camp_lost',
      repeat: true,
      when: (s, e) => e.t === 'capture' && e.townId === 'drycamp' && e.by === 'enemy' && (s.vars.campLost ?? 0) === 0,
      actions: [
        { a: 'call', fn: (s) => (s.vars.campLost = s.day) },
        { a: 'toast', text: 'Плъховете превзеха лагера! Имаш 3 дни да си го върнеш.', icon: '⚠️' },
      ],
    },
    {
      id: 'camp_back',
      repeat: true,
      when: (_s, e) => e.t === 'capture' && e.townId === 'drycamp' && e.by === 'player',
      actions: [{ a: 'call', fn: (s) => (s.vars.campLost = 0) }],
    },
  ],
  checkEnd: (s) => {
    if (s.flags.mercy_done && s.pendingDialogues.length === 0) return { status: 'won', reason: '' };
    const lost = s.vars.campLost ?? 0;
    if (lost && s.day >= lost + 3 && s.towns.find((t) => t.id === 'drycamp')?.owner !== 'player') {
      return { status: 'lost', reason: 'Лагерът при изсъхналия дъб падна. Без подслон и запаси походът свърши.' };
    }
    return null;
  },
  victoryDialogue: () => 's3_victory',
  dialogues: {
    s3_intro: {
      id: 's3_intro',
      title: 'Следите, които водят към опасност',
      bg: 'img/bg-hills.webp',
      lines: [
        L('iskritsa', 'Мишконтин! Намерих нещо! Следи. Много следи — и всички са от плъхове. От снощи са. Водят към каньона.'),
        L('mishkontin', 'Каньонът! Трябва да тръгнем веднага! Докато следите са пресни!', 'surprised'),
        L('iskritsa', 'Стой! Какво точно искаш да направиш? Просто да нахълташ вътре, без да знаеш къде отиваш?'),
        L('mishkontin', 'Мишките може би са точно зад следващия завой и имат нужда от нас сега!'),
        L('iskritsa', 'Следвай ме. Но тихо. И обещай ми, че няма да правиш нищо прибързано. Първо — до Големия камък на ръба.'),
      ],
    },
    s3_tracks: {
      id: 's3_tracks',
      lines: [L('narrator', 'Врязани в сухата пръст, следите на плъховете водят надолу — към място, където земята се отваря в дълбок каньон.')],
      after: [{ a: 'reveal', x: 8, y: 4, r: 3 }],
    },
    s3_lookout: {
      id: 's3_lookout',
      title: 'Ръбът на каньона',
      bg: 'img/bg-hills.webp',
      lines: [
        L('narrator', 'Долу, в дълбините, се виждаха десетки плъхове — едри, мускулести, със зли очи. Те пазеха входа към тунелите. А навсякъде наоколо — капани. С ръждясали метални зъби, скрити под листа, окачени на клони, заровени в земята.'),
        L('iskritsa', 'Видя ли? Това е крепост. Не можеш просто така да влезеш.'),
        L('mishkontin', 'Можем да го направим сега! Чакаме залеза и ще се промъкнем оттатък…', 'surprised'),
        L('iskritsa', 'Не! Мишконтин, слушай ме добре! Ако нахълтаме сега, ще ни видят и ще ни хванат. И двамата. А после кой ще спаси всички?'),
      ],
      choices: [
        {
          text: '„Права си. Ще наблюдаваме. Ще изучаваме.“ (2 дни зад камъка)', virtue: 'wisdom',
          actions: [{ a: 'virtue', v: 'wisdom', n: 2 }, { a: 'flag', flag: 'watching' }, { a: 'call', fn: (s) => startRest(s, 'restWatch', 2) }, { a: 'dialogue', id: 's3_watch' }],
        },
        { text: '„Нямам търпение. Тръгваме веднага!“', actions: [{ a: 'flag', flag: 'rushed' }, { a: 'dialogue', id: 's3_rush' }] },
      ],
    },
    s3_watch: {
      id: 's3_watch',
      title: 'Изкуството да наблюдаваш',
      lines: [
        L('narrator', 'Първият ден беше най-труден. Мишконтин броеше стражите. Проследяваше движението им. Честно казано, беше отегчително.'),
        L('mishkontin', 'Колко още трябва да седим тук?'),
        L('iskritsa', 'Колкото трябва.'),
      ],
    },
    s3_rush: {
      id: 's3_rush',
      lines: [
        L('iskritsa', 'Мишконтин! …Добре. Но внимавай къде стъпваш. Не знаем къде са капаните.', 'surprised'),
        L('narrator', 'Капаните остават скрити, а стражата при входа — будна.'),
      ],
      after: [
        { a: 'quest', id: 'tunnels', title: 'Тъмните тунели', text: 'Слез в каньона и влез в тунелите през входа на юг. Пази се от капаните!' },
        { a: 'reveal', x: 17, y: 10, r: 5 },
        { a: 'reveal', x: 15, y: 16, r: 5 },
      ],
    },
    s3_dawn: {
      id: 's3_dawn',
      title: 'Смяната в зори',
      lines: [
        L('mishkontin', 'Виж! Този плъх там, с шарената козина и без мустаци — минава покрай черния камък точно на всеки пет минути.', 'map'),
        L('narrator', 'В зори, точно когато слънцето започваше да изгрява, старите стражи се прибираха в тунелите. Новите излизаха да ги заменят. И за няколко минути нямаше никой навън.'),
        L('mishkontin', 'Това е! В зори има празнина в охраната!', 'happy'),
        L('iskritsa', 'Виждаш ли? Ето защо стояхме тук като две статуи.'),
        L('mishkontin', 'Аз не бях статуя! Само веднъж ми изтръпна лапата… добре, два пъти.'),
        L('iskritsa', 'А ако някоя стража ни види, правим най-героичното нещо на света: бягаме с всички сили!', 'happy'),
        L('narrator', 'Искрица нарисува с клечка карта върху земята: всеки капан, всеки камък. Сега Мишконтин вижда капаните — а стражата при входа е празна в зори.'),
      ],
      after: [
        { a: 'flag', flag: 'traps_seen' },
        { a: 'flag', flag: 'watching', value: false },
        { a: 'removeObj', id: 'guardW' },
        { a: 'removeObj', id: 'guardE' },
        { a: 'questDone', id: 'watch' },
        { a: 'quest', id: 'tunnels', title: 'Тъмните тунели', text: 'Слез в каньона, заобиколи капаните и влез в тунелите през входа на юг.' },
        { a: 'reveal', x: 17, y: 10, r: 5 },
        { a: 'reveal', x: 15, y: 16, r: 5 },
      ],
    },
    s3_inside: {
      id: 's3_inside',
      title: 'Тунелите',
      bg: 'img/bg-night.webp',
      lines: [
        L('narrator', 'Тунелът миришеше на влага, мухъл и нещо още по-лошо. На мишки, които отдавна не се смеят. На място, където никой не играе и никой не пее.'),
        L('iskritsa', 'Внимавай къде стъпваш. Подът е хлъзгав.'),
      ],
      after: [{ a: 'reveal', x: 11, y: 17, r: 3 }, { a: 'quest', id: 'cells', title: 'Голямото сърце', text: 'Намери клетките на мишките от Сиренград (на запад в тунелите) и родителите си.' }],
    },
    s3_cells: {
      id: 's3_cells',
      title: 'Стотици клетки',
      lines: [
        L('narrator', 'Коридорът се разшири — и пред тях се откриха стотици клетки. Една до друга. Безкрайна редица. Вътре имаше мишки.'),
        L('mishkontin', 'Житкови… Трошкови… Мишеви… Моите съседи. Моите приятели.', 'surprised'),
        L('narrator', 'Искаше да извика: „Тук съм! Дойдох!“ Но се спря. Ако вдигнеше шум, стражите щяха да чуят. Не и преди да има план. Не и преди да намери родителите си.'),
        L('mishkontin', 'Ще се върна за вас.'),
      ],
      after: [{ a: 'flag', flag: 'cells_seen' }],
    },
    s3_cells_after: {
      id: 's3_cells_after',
      lines: [L('narrator', 'Очите в клетките светят в тъмното. Мишките са забелязали Мишконтин и тихо го наблюдават, притаили дъх.')],
    },
    s3_parents: {
      id: 's3_parents',
      title: 'Когато сърцето решава',
      lines: [
        L('mama', 'Мишконтин! Ти си тук! Но как? Опасно е!'),
        L('mishkontin', 'Дойдох да ви спася.', 'happy'),
        L('tate', 'Гордея се с теб.'),
        L('narrator', 'Ключалката беше стара и прогнила. Можеше да я счупи — бързо и не много шумно. Но клетките бяха стотици. Да разбие всички брави щеше да отнеме цяла вечност и да доведе стражите.'),
        L('mama', 'Сине, спаси себе си. Достатъчно е, че те видяхме. Няма време!'),
      ],
      choices: [
        {
          text: '„Не мога да избягам и да ви оставя тук. Ако ще си тръгна… ще си тръгнем всички заедно.“', virtue: 'kindness',
          actions: [{ a: 'virtue', v: 'kindness', n: 2 }, { a: 'flag', flag: 'parents_done' }, { a: 'flag', flag: 'all_together' }, { a: 'dialogue', id: 's3_lever_found' }],
        },
        {
          text: 'Счупи ключалката на мама и тате — бързо!',
          actions: [{ a: 'flag', flag: 'parents_done' }, { a: 'flag', flag: 'parents_first' }, { a: 'dialogue', id: 's3_noise' }],
        },
      ],
    },
    s3_noise: {
      id: 's3_noise',
      lines: [
        L('narrator', 'Ключалката изпука. Шумът отекна по тунела — и някъде далеч изскърцаха врати.'),
        L('tate', 'Сине… А другите? Житкови? Малките мишлета?'),
        L('mishkontin', '…Прав си, тате. Няма да ги оставя. Ще намерим начин да отворим всички.'),
        L('narrator', 'Мама и тате тръгнаха към лагера, а към тунела вече тичаше стража.'),
      ],
      after: [
        { a: 'spawnHero', tpl: 'sivoopashko', owner: 'enemy', x: 17, y: 15, role: 'raider', targetTown: 'throne', army: [['veteran', 4], ['ratspear', 10]] },
        { a: 'dialogue', id: 's3_lever_found' },
      ],
    },
    s3_lever_found: {
      id: 's3_lever_found',
      title: 'Или всички, или никой',
      lines: [
        L('iskritsa', 'Трябва да намерим начин да освободим всички наведнъж.'),
        L('narrator', 'В най-дълбоката част на тунела се издигаше каменна стена с десетки въжета, които водеха към всички клетки. В центъра — голям железен лост. Но пред него горяха огнени обръчи.'),
      ],
      after: [
        { a: 'questDone', id: 'cells' },
        { a: 'quest', id: 'fire', title: 'Огнените обръчи', text: 'Лостът, който отваря всички клетки, е зад огнените обръчи на изток в тунелите.' },
        { a: 'reveal', x: 21, y: 16, r: 3 },
      ],
    },
    s3_parents_after: {
      id: 's3_parents_after',
      lines: [
        L('mama', 'Ние сме тук, сине. Чакаме те.', undefined, has('all_together')),
        L('narrator', 'Клетката е празна. Мама и тате са на път към лагера.', undefined, has('parents_first')),
      ],
    },
    s3_fire: {
      id: 's3_fire',
      title: 'Огнените обръчи',
      lines: [
        L('narrator', 'Пламъците танцуваха по краищата на обръчите. Жегата трептеше като невидима стена.'),
        L('mishkontin', 'Първо трябва да намеря мама и тате.', undefined, hasNot('parents_done')),
        L('iskritsa', 'Никой не може да мине оттам. Ще се изгориш.', undefined, has('parents_done')),
        L('narrator', 'Мишконтин се обърна към клетките и видя очите, които блестяха. Лапички, стиснати в очакване. Надежда, която чакаше искра.', undefined, has('parents_done')),
      ],
      choices: [
        {
          text: '„Аз ще премина. Може малко да си опърля козинката… но ще се върна.“', virtue: 'courage', requires: has('parents_done'), lockedHint: 'Първо намери родителите си.',
          actions: [{ a: 'virtue', v: 'courage', n: 2 }, { a: 'dialogue', id: 's3_lever' }],
        },
        { text: 'Отдръпни се.', actions: [] },
      ],
    },
    s3_lever: {
      id: 's3_lever',
      title: 'Цената на благородството',
      bg: 'img/bg-night.webp',
      lines: [
        L('narrator', 'Той затвори очи. Всичко, което беше преживял, мина пред тях като бърз сън. После пое дълбоко въздух — и се затича.'),
        L('narrator', 'Пламъците пукаха около него. Козинката му се нагряваше, димът щипеше очите. Но той не спираше. И внезапно беше от другата страна — задъхан, опърлен, но успял.'),
        L('narrator', 'Мишконтин увисна с две лапички на лоста. Клик! Огънят угасна, а вратите се отвориха една след друга.'),
        L('townsfolk', 'Свободни сме! Навън! Бързо!'),
        L('mishkontin', 'Мамо! Тате! Обичам ви!', 'happy'),
        L('mama', 'И ние те обичаме, смел наш Мишконтин! Хайде, навън!'),
        L('mishkontin', 'Мамо… бягайте. Аз не мога да дойда още. Трябва да сложа край на това.'),
        L('mishkontin', 'Крал Плъх! Идвам за теб!', 'surprised'),
      ],
      after: [
        { a: 'flag', flag: 'lever_pulled' },
        { a: 'removeObj', id: 'fire' },
        { a: 'removeObj', id: 'cells' },
        { a: 'removeObj', id: 'parents' },
        { a: 'questDone', id: 'fire' },
        { a: 'troops', cid: 'mouse', n: 30 },
        { a: 'xp', n: 1500 },
        { a: 'quest', id: 'mortis', title: 'Силата на прошката', text: 'Тронната зала на Мортис е в дъното на тунелите, на изток. Изправи се пред краля.' },
      ],
    },
    s3_throne: {
      id: 's3_throne',
      title: 'Лице в лице с мрака',
      bg: 'img/bg-night.webp',
      lines: [
        L('narrator', 'Тронната зала беше огромна. Купчини сирене, ядки и сладки плодове. В дъното, върху каменен трон, седеше крал Мортис.'),
        L('narrator', 'Мишконтин очакваше чудовище. Но кралят беше стар. Много стар. Козината му бе побеляла, гърбът — огънат, дишането — тежко и пресекливо.'),
        L('mortis', 'Значи ти си този, който освободи всички работници. Само след няколко дни отново всички ще са при мен.'),
        L('mishkontin', 'Ти ми отне родителите! Приятелите ми и семействата им! Заради теб Сиренград остана празен!'),
        L('mortis', 'Знаеш ли какво е да си плъх? Когато бях колкото теб, нямах нищо! Знаеш ли какво е да се страхуваш, че няма да ти стигне? Затова събирах. И още. И още.'),
        L('narrator', 'Един от големите плъхове до трона се размърда. Дълга драскотина през лицето — от окото до края на муцуната. Белегор.'),
        L('mortis', 'Дръжте ги!'),
      ],
      after: [{ a: 'dialogue', id: 's3_help' }],
    },
    s3_help: {
      id: 's3_help',
      lines: [
        L('narrator', 'И тогава небето над каньона притъмня. Голяма сянка профуча като гръм. После още една. После цял рояк. Орли! Начело летеше Летокрил, а до него — самият крал Златокрил.', undefined, has('letokril_friend')),
        L('letokril', 'Казах ти, че ще дойдем, Мишконтин!', 'happy', has('letokril_friend')),
        L('narrator', 'Плъховете изпищяха и се разбягаха. Някои се шмугнаха в тунелите, други се свиха на кълбо и затвориха очи.', undefined, has('letokril_friend')),
        L('narrator', 'Мишконтин се обърна. Зад него стояха освободените мишки на Сиренград — Житкови, Трошкови, Сиренкова с бастунчето си. Никой вече не трепереше.', undefined, hasNot('letokril_friend')),
        L('townsfolk', 'Не си сам, Мишконтин!', undefined, hasNot('letokril_friend')),
      ],
      after: [{ a: 'call', fn: helpArrives }],
    },
    s3_mercy: {
      id: 's3_mercy',
      title: 'Изборът между отмъщението и милосърдието',
      bg: 'img/bg-dawn.webp',
      lines: [
        L('narrator', 'Крал Златокрил сграбчи Мортис с мощните си нокти и го вдигна от земята. Старият плъх висеше безпомощно — лапите му се мятаха, сякаш плуваше в невидимо езеро.', undefined, has('letokril_friend')),
        L('mortis', 'Пуснете ме!', 'surprised'),
        L('iskritsa', 'Май величието му леко се е разклатило.', 'happy', has('letokril_friend')),
        L('narrator', 'Освободените мишки обградиха стария крал. Той стоеше сред тях — малък, разтреперан, без трон и без стража.', undefined, hasNot('letokril_friend')),
        L('zlatokril', 'Мишконтин. Ти помогна на сина ми. Днес аз съм тук за теб. Ти решаваш какво да стане с този плъх.', undefined, has('letokril_friend')),
        L('townsfolk', 'Мишконтин, ти ни освободи. Ти решаваш какво да стане с него.', undefined, hasNot('letokril_friend')),
        L('narrator', 'Мишконтин имаше власт. Можеше да поиска наказание. Можеше да поиска всичко. Но когато погледна Мортис, не видя чудовище. Видя уплашено, старо същество, което цял живот беше бягало от своя страх.'),
        L('narrator', 'И тогава си спомни думите на баба Шушулка: „Омразата ще те направи като врага ти.“'),
      ],
      choices: [
        { text: '„Пусни го.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 2 }, { a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'forgave' }, { a: 'dialogue', id: 's3_forgive' }] },
        { text: '„Нека си отиде далеч от гората и никога да не се връща.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'exiled' }, { a: 'dialogue', id: 's3_exile' }] },
        { text: '„Затворете го в собствената му клетка!“', actions: [{ a: 'flag', flag: 'punished' }, { a: 'dialogue', id: 's3_punish' }] },
      ],
    },
    s3_forgive: {
      id: 's3_forgive',
      lines: [
        L('zlatokril', 'Сигурен ли си?', undefined, has('letokril_friend')),
        L('mishkontin', 'Пусни го.'),
        L('townsfolk', 'Той заслужава наказание! Не можеш просто да го пуснеш!'),
        L('mishkontin', 'Знам, че ви нарани. Знам, че направи много лоши неща. Но ако отвърнем със същото… ще станем като него. А ние не сме такива.'),
        L('mortis', 'Благодаря…'),
        L('mishkontin', 'Ти остана сам. Нека това бъде твоят урок.'),
        L('iskritsa', 'Знаеш ли какво направи? Пусна гнева да си тръгне. А когато пуснеш тежкото от сърцето си… то става леко. И може да лети.', 'happy'),
      ],
      after: [{ a: 'flag', flag: 'mercy_done' }],
    },
    s3_exile: {
      id: 's3_exile',
      lines: [
        L('mishkontin', 'Върви си, Мортис. Далеч от гората. И никога повече не взимай ничие семейство.'),
        L('narrator', 'Старият плъх се отдалечи бавно, прегърбен, без да се обърне. Сиренград никога повече не го видя.'),
      ],
      after: [{ a: 'flag', flag: 'mercy_done' }],
    },
    s3_punish: {
      id: 's3_punish',
      lines: [
        L('narrator', 'Мишките заключиха стария крал в клетката, в която беше държал мама и тате. Някои ликуваха. Но Мишконтин не чувстваше радост — само тежест.'),
        L('iskritsa', 'Помниш ли какво каза баба Шушулка? Омразата ще те направи като врага ти…', 'surprised'),
        L('mishkontin', '…Отворете клетката. Нека си отиде. Не искам да нося неговата тъмнина в сърцето си.'),
        L('narrator', 'И когато вратата се отвори, нещо тежко се откъсна от гърдите на Мишконтин.'),
      ],
      after: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'mercy_done' }],
    },
    s3_victory: {
      id: 's3_victory',
      title: 'Добро утро, Сиренград!',
      bg: 'img/bg-dawn.webp',
      lines: [
        L('tate', 'Гордея се с теб, сине.'),
        L('mama', 'Днес ти показа най-голямата сила. Не силата на лапите. Не силата на зъбите. А силата на сърцето.'),
        L('narrator', 'И така, в Сиренград изгря ново утро. Златната светлина огря старата мелница. По уличките отново се чуваха миши смехове. Някой носеше трохи хляб, друг поправяше врата, трети разказваше за огнените обръчи с толкова размах, че всички ахваха.'),
        L('narrator', 'Високо над мелницата кръжаха два орела. Летокрил идваше да види приятеля си всяка седмица.', undefined, has('letokril_friend')),
        L('narrator', 'Мишконтин вече знаеше, че смелостта не означава да не те е страх. Че добротата не е слабост. Че сърцето може да бъде по-силно от всяка корона.'),
        L('narrator', 'Не размерът прави героя, а изборът. Героите не се раждат големи — те избират да бъдат такива.'),
      ],
    },
  },
};
