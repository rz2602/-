import type { ScenarioDef } from '../../core/scenario';
import type { GameState } from '../../core/types';
import { has, hasNot, keepResting, L, placeNextToMishkontin, removeTroops, res, startRest } from './helpers';

/** Chapter 1 follows chapters 1–4 of the book: the night of the raid, baba Shushulka, the Zelendol mice, Iskritsa and Letko. */

const wonS1 = (s: GameState) =>
  !!s.flags.s1_goal && !!s.flags.iskritsa_joined && !!s.flags.letko_done && (!s.flags.letko_stay || !!s.flags.letokril_friend);

export const S1: ScenarioDef = {
  id: 's1',
  number: 1,
  title: 'По следите',
  subtitle: 'Първа глава',
  bg: 'img/bg-night.webp',
  intro: [
    'Сиренград е малко градче в старата мелница край реката. Мишките там си помагат, поздравяват се всяка сутрин и делят трохите си, без да се карат.',
    'Но една тиха нощ воините на краля плъх Мортис нахлуха в града. Водеше ги Белегор — плъхът с дългата драскотина през лицето. Отведоха всички. И мама, и татко.',
    'Само едно малко мишле остана, скрито под леглото. На сутринта то излезе пред портата от две дървесни кори и видя следите, които водеха към гората. Името му е Мишконтин.',
  ],
  goals: [
    'Тръгни по следите към гората.',
    'Намери спътник с честно сърце.',
    'Помогни на ранената птичка.',
    'Стигни до Одраните дървета на североизток.',
    'Мишконтин трябва да оцелее. Не губи Сиренград за повече от 3 дни.',
  ],
  map: [
    'TTTT~~TTTTTTTTTTTTTTTTTTTTTTTT',
    'TTTT~~.hhhhhhh.$..TTT...TTT..T',
    'TTTT~~.hh*hhhz.....Q....T::VGT',
    'TTTT~~xhhhhhhh.....P,...:....T',
    'TTTT~~..hhhhTTT..F....::.....T',
    'TTTT~~......TTT......:...u...T',
    'TTTT~~.f....TTT..y.::..L.....T',
    'TTTT~~..TTT....,..:.....,....T',
    'TTTT.~~.TTT..,..::..+.....W.KT',
    'T....~~.TTT....Z.....TT....c.T',
    'T....==......::.,..o.TT......T',
    'T.w..~~....b:..:...,.TT..TTT.T',
    'T..?.~~....:....:....TT..TTT.T',
    'T....~~...:.!...T:T...g....J.T',
    'TTTT.~~..e....r.TT:..........T',
    'TTTT..~~.:.,....TTT:::::R....T',
    'TTTT,.~~@.#..D...............T',
    'TTTT..~A:::::::::.sssss.....XT',
    'TTTT..~~.TTT......sssssj..TTTT',
    'TTTTk.~~.TTTa.TT..sssss...TTTT',
    'TTTT..~~.TTT..TTH....q....TTTT',
    'TTTTTT~~TTTTTTTTTTTTTTTTTTTTTT',
  ],
  legend: {
    A: { town: { kind: 'town', id: 'sirengrad', name: 'Сиренград', faction: 'forest', owner: 'player', built: ['hall', 'd1', 'fort'], garrison: [['mouse', 10]], special: 'sirengrad' } },
    R: { town: { kind: 'town', id: 'outpost', name: 'Плъховата застава', faction: 'rats', owner: 'enemy', built: ['fort', 'd1', 'd2', 'd3'], garrison: [['rat', 16], ['ratspear', 6], ['trapper', 4]] } },
    '@': { terrain: ':', hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true } },
    e: { terrain: ':', obj: { id: 'tracks', kind: 'event', dialogue: 's1_tracks', onlyHuman: true } },
    b: { obj: { id: 'shushulka', kind: 'npc', npc: 'shushulka', label: 'Баба Шушулка', dialogue: 's1_shushulka', repeatDialogue: 's1_shushulka_after', doneFlag: 'shushulka_done' } },
    Z: { obj: { id: 'zelendol', kind: 'npc', npc: 'zelendol', label: 'Мишките от Зелендол', dialogue: 's1_zelendol', doneFlag: 'zelendol_done' } },
    L: { obj: { id: 'letko', kind: 'npc', npc: 'letko', label: 'Ранено орле под храста', dialogue: 's1_letko', repeatDialogue: 's1_letko_after', doneFlag: 'letko_done', wantItem: 'zdravets', wantFlag: 'letko_done', readyFlag: 'has_zdravets' } },
    Q: { obj: { id: 'zdravets', kind: 'questItem', item: 'zdravets', label: 'Здравец до камъка с мъх', dialogue: 's1_zdravets' } },
    P: { obj: { kind: 'monster', cid: 'ratspear', n: 7, guard: true, label: 'Изостанал патрул на Мортис' } },
    V: { terrain: ':', obj: { kind: 'monster', cid: 'rat', n: 24, guard: true, label: 'Съгледвачите на Белегор' } },
    G: { terrain: ':', obj: { id: 'scratched', kind: 'goal', label: 'Одраните дървета', dialogue: 's1_goal', flag: 's1_goal', needHero: 'mishkontin', needText: 'Мишконтин трябва да стигне дотук сам — следите са негови.' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    c: { obj: { kind: 'mine', res: 'cheese', owner: null } },
    W: { obj: { kind: 'monster', cid: 'wildcat', n: 2, guard: true, label: 'Диви котки' } },
    K: { obj: { kind: 'artifact', art: 'compass' } },
    D: { obj: { kind: 'dwelling', cid: 'mouse', available: 6, owner: null } },
    f: { obj: { kind: 'monster', cid: 'mouse', n: 12, joinable: true, label: 'Семейство полски мишки' } },
    F: { obj: { kind: 'monster', cid: 'vole', n: 7, joinable: true } },
    j: { terrain: 's', obj: { kind: 'monster', cid: 'ferret', n: 3 } },
    g: { obj: { kind: 'monster', cid: 'rat', n: 14 } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { obj: { kind: 'shrine', effect: 'att', value: 1 } },
    '?': { obj: { kind: 'shrine', effect: 'xp', value: 600 } },
    '*': { terrain: 'h', obj: { kind: 'shrine', effect: 'reveal', value: 11, label: 'Най-високият хълм' } },
    y: { obj: { kind: 'shrine', effect: 'luckDay', value: 1 } },
    H: { obj: { kind: 'artifact', art: 'acornHelm' } },
    J: { obj: { kind: 'artifact', art: 'mossBoots' } },
    '#': { terrain: ':', obj: { kind: 'sign', text: '↗ Към гората. ↙ Към Сиренград — старата мелница край реката. (Някой е надраскал отдолу: „Тук живеят мишки. Всички са добре дошли.“)' } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 500 } },
    k: { obj: { kind: 'resource', res: 'acorns', amount: 500 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 5 } },
    z: { terrain: 'h', obj: { kind: 'resource', res: 'wood', amount: 4 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 5 } },
    u: { obj: { kind: 'resource', res: 'cheese', amount: 2 } },
    x: { obj: { kind: 'chest', acorns: 1000, xp: 750 } },
    X: { obj: { kind: 'chest', acorns: 1000, xp: 750 } },
  },
  startRes: { player: res(2500, 10, 10, 0), enemy: res(2000, 10, 10, 2) },
  heroPool: { player: ['harescout', 'oldsquirrel'], enemy: ['ostrozab', 'sivoopashko'] },
  weekNames: ['Седмица на празните улички', 'Седмица на първата крачка', 'Седмица на честните сърца', 'Седмица на здравеца', 'Седмица на дългите сенки'],
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [
        { a: 'dialogue', id: 's1_night' },
        { a: 'dialogue', id: 's1_morning' },
        { a: 'quest', id: 'trail', title: 'По следите', text: 'Следите на мама, татко и стотици мишки водят от портата на Сиренград към гората. Тръгни по тях.' },
      ],
    },
    {
      id: 'rats_return',
      when: (s, e) => e.t === 'day' && s.day === 3,
      actions: [
        { a: 'dialogue', id: 's1_rats_return' },
        { a: 'quest', id: 'defend', title: 'Пази Сиренград', text: 'Полските мишки, избягали от Мортис, се заселиха в празните къщи на Сиренград. Плъховете от Заставата ще се върнат за тях. Наемай защитници или пресрещай нападателите. Ако Сиренград падне, имаш 3 дни да си го върнеш.' },
      ],
    },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 6,
      actions: [
        { a: 'spawnHero', tpl: 'ostrozab', owner: 'enemy', x: 25, y: 14, role: 'raider', targetTown: 'outpost', army: [['rat', 12], ['ratspear', 3]] },
        { a: 'toast', text: 'Патрул на Белегор тръгна от Плъховата застава!', icon: '🐀' },
      ],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 12,
      actions: [
        { a: 'spawnHero', tpl: 'sivoopashko', owner: 'enemy', x: 23, y: 16, role: 'raider', targetTown: 'outpost', army: [['rat', 18], ['trapper', 5], ['ratspear', 4]] },
        { a: 'toast', text: 'Нов патрул търси последните мишки на Сиренград!', icon: '🐀' },
      ],
    },
    {
      id: 'shushulka_quest',
      when: (_s, e) => e.t === 'dialogueEnd' && e.id === 's1_shushulka',
      actions: [{ a: 'quest', id: 'zdravets', title: 'Здравецът', text: 'Баба Шушулка разказа за здравеца: билка с пъстри листа и лилави цветчета. От нея става мехлем, който лекува рани. „Малко е магически.“' }],
    },
    {
      id: 'zdravets_found',
      when: (_s, e) => e.t === 'visit' && e.objId === 'zdravets',
      actions: [{ a: 'flag', flag: 'has_zdravets' }, { a: 'quest', id: 'zdravets', title: 'Здравецът', text: '' }, { a: 'questDone', id: 'zdravets' }],
    },
    {
      id: 'letko_seen',
      when: (_s, e) => e.t === 'visit' && e.objId === 'letko',
      actions: [{ a: 'quest', id: 'letko', title: 'Ранената птичка', text: 'Под един храст лежи малко орле със счупено крило. Казва се Летко. Мехлем от здравец ще облекчи болката.' }],
    },
    {
      id: 'zelendol_lie_out',
      when: (s, e) => e.t === 'day' && !!s.flags.zelendol_lied && s.day >= (s.vars.lieDay ?? 99) + 2,
      actions: [{ a: 'dialogue', id: 's1_lie_out' }],
    },
    {
      id: 'rest',
      repeat: true,
      when: (s, e) => e.t === 'day' && s.day < (s.vars.restLetko ?? 0),
      actions: [{ a: 'call', fn: (s) => keepResting(s, 'restLetko') }, { a: 'toast', text: 'Мишконтин и Искрица остават при Летко. Носят му червеи и семенца, пеят му тихи песни.', icon: '🩹' }],
    },
    {
      id: 'letko_flies',
      when: (s, e) => e.t === 'day' && !!s.flags.letko_stay && s.day >= (s.vars.restLetko ?? 99),
      actions: [{ a: 'dialogue', id: 's1_letokril' }],
    },
    {
      id: 'siren_lost',
      repeat: true,
      when: (s, e) => e.t === 'capture' && e.townId === 'sirengrad' && e.by === 'enemy' && (s.vars.sirenLost ?? 0) === 0,
      actions: [
        { a: 'call', fn: (s) => (s.vars.sirenLost = s.day) },
        { a: 'toast', text: 'Плъховете превзеха Сиренград! Имаш 3 дни да си го върнеш.', icon: '⚠️' },
      ],
    },
    {
      id: 'siren_back',
      repeat: true,
      when: (_s, e) => e.t === 'capture' && e.townId === 'sirengrad' && e.by === 'player',
      actions: [{ a: 'call', fn: (s) => (s.vars.sirenLost = 0) }],
    },
    {
      id: 'outpost_taken',
      when: (_s, e) => e.t === 'capture' && e.townId === 'outpost' && e.by === 'player',
      actions: [{ a: 'dialogue', id: 's1_outpost' }, { a: 'questDone', id: 'defend' }],
    },
  ],
  checkEnd: (s) => {
    if (wonS1(s) && s.pendingDialogues.length === 0) return { status: 'won', reason: '' };
    const lost = s.vars.sirenLost ?? 0;
    if (lost && s.day >= lost + 3 && s.towns.find((t) => t.id === 'sirengrad')?.owner !== 'player') {
      return { status: 'lost', reason: 'Сиренград остана в лапите на плъховете, а с него и последните му мишки.' };
    }
    return null;
  },
  victoryDialogue: () => 's1_victory',
  dialogues: {
    s1_night: {
      id: 's1_night',
      title: 'Последната спокойна нощ',
      bg: 'img/bg-night.webp',
      lines: [
        L('narrator', 'През малкото прозорче луната рисуваше сребристи линии по пода. Мама седеше до леглото и разказваше за смелите мишоци, създали Сиренград преди много, много години.'),
        L('mishkontin', 'Мамо, а аз мога ли да бъда смел като тях?'),
        L('mama', 'Разбира се, мое малко мишле. Всеки от нас има смелост в себе си. Тя е там, дълбоко в сърцето ни. Просто понякога трябва да я открием.'),
        L('tate', 'Каквото и да се случва в живота, знай, че в теб има повече сила, отколкото си мислиш. Бъди храбър, дори когато лапичките ти треперят. Обичам те, синко.'),
        L('narrator', 'Нощта беше тиха. Даже прекалено тиха. После се чуха писукания, крясъци и тежки стъпки.'),
        L('mama', 'Плъхове! Мишконтин, стой под леглото и нито звук!'),
        L('belegor', 'По заповед на крал Мортис! Всички мишоци от това семейство трябва да дойдат с нас!'),
        L('narrator', 'Татко се хвърли срещу Белегор, но плъховете бяха повече. Отведоха и него, и мама. Мишконтин се беше свил на топче под леглото — тих като сянка. После стана тихо.'),
      ],
    },
    s1_morning: {
      id: 's1_morning',
      title: 'Празните улички',
      bg: 'img/bg-dawn.webp',
      lines: [
        L('mishkontin', 'Мамо? Тате?', 'surprised'),
        L('narrator', 'Мишконтин тичаше от врата на врата — Мишеви, Житкови, Трошкови. Никой не отвори. Плъховете бяха взели всички.'),
        L('narrator', 'За първи път той почувства какво значи да си сам. Сам-самичък в целия град. И тогава в ушите му зазвучаха думите на баща му: „Бъди храбър, дори когато лапичките ти треперят.“'),
        L('narrator', 'Пред разрушената порта — две дървесни кори в основата на мелницата — от тревата надникнаха няколко полски мишки. Плъховете на Мортис бяха разрушили и техния дом.'),
        L('fieldmouse', 'Видяхме всичко, малкия. Ще дойдем с теб до гората. А сестрите и братята ни ще пазят празните ви къщички, докато се върнете.'),
        L('narrator', 'Съвет: щракни върху поле, за да видиш пътя, и още веднъж, за да тръгнеш. В Сиренград наемаш полски мишки. Когато героите се изморят, натисни „Край на хода“.'),
      ],
      choices: [
        { text: '„Трябва да ги върна… всички!“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }] },
        { text: 'Изтрий сълзите и огледай следите внимателно.', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }] },
      ],
    },
    s1_tracks: {
      id: 's1_tracks',
      title: 'Следите',
      lines: [
        L('mishkontin', 'Тези следи са на татко — с малкото изкривяване на лявата лапичка. А тези, по-фините, са на мама.', 'map'),
        L('narrator', 'До тях — грубите следи на плъховете. И още, и още. Стотици следи от мишки и плъхове. Всички водеха към гората.'),
        L('narrator', 'Дърветата стърчаха като тъмни стражи. Всичко вътре в него крещеше: „Не ходи там! Обърни се!“ Но тихият глас от сърцето шепнеше: „Ако не направиш първата крачка, страхът ще те победи.“'),
        L('mishkontin', 'Значи са минали оттук. Ще ги последвам.'),
      ],
      after: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'reveal', x: 14, y: 10, r: 4 }],
    },
    s1_rats_return: {
      id: 's1_rats_return',
      title: 'Плъховата застава',
      lines: [
        L('narrator', 'На изток, в Плъховата застава, Белегор събра патрулите си. Драскотината през муцуната му белееше на светлината на факлите.'),
        L('belegor', 'Едно мише е останало в мелницата. И чух, че там се заселват полски мишки. Крал Мортис иска всички. До последното!'),
        L('mishkontin', 'Ще се върнат за Сиренград. Трябва да оставя защитници у дома — или да ги пресрещна по пътя.', 'surprised'),
      ],
    },
    s1_shushulka: {
      id: 's1_shushulka',
      title: 'Урокът на старата мъдра мишка',
      bg: 'img/bg-woods.webp',
      lines: [
        L('shushulka', 'Ей, малко мишле! Какво правиш тук само?'),
        L('mishkontin', 'Аз… аз търся родителите си и мишките от Сиренград.'),
        L('shushulka', 'Седни, мило мишле. Изглеждаш изтощено. Името ми е баба Шушулка. Чувала съм за краля плъх Мортис. Взимат мишоци и ги отвеждат в тъмните тунели под земята.'),
        L('mishkontin', 'Но защо? Защо правят това?'),
        L('shushulka', 'Защото кралят иска всичко да е негово. Най-много храна, най-много власт. А когато другите се страхуват, те го слушат.'),
        L('shushulka', 'Внимавай, малки мой. Омразата ще те направи като врага ти. Ще започнеш да носиш неговата тъмнина в сърцето си.'),
      ],
      choices: [
        { text: '„Ти си права. Тръгнах заради любов, не заради омраза.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'shushulka_done' }, { a: 'dialogue', id: 's1_shushulka_herb' }] },
        { text: '„Ще накарам Мортис да си плати за всичко!“', actions: [{ a: 'flag', flag: 'shushulka_done' }, { a: 'flag', flag: 'angry_heart' }, { a: 'dialogue', id: 's1_shushulka_warn' }] },
      ],
    },
    s1_shushulka_warn: {
      id: 's1_shushulka_warn',
      lines: [
        L('shushulka', 'Когато сърцето се напълни само с яд, то забравя защо е тръгнало. Запомни това, малки мой. Някой ден ще ти потрябва.'),
        L('narrator', 'Мишконтин помълча. Думите на баба Шушулка останаха да тежат в сърцето му.'),
      ],
      after: [{ a: 'dialogue', id: 's1_shushulka_herb' }],
    },
    s1_shushulka_herb: {
      id: 's1_shushulka_herb',
      lines: [
        L('mishkontin', 'А ти накъде си тръгнала, бабо Шушулке?'),
        L('shushulka', 'Отивам да набера здравец. Една прекрасна билка с пъстри листа и лилави цветчета. От нея се прави мехлем, който лекува рани.'),
        L('shushulka', '…Малко е магически.'),
      ],
    },
    s1_shushulka_after: {
      id: 's1_shushulka_after',
      lines: [L('narrator', 'Баба Шушулка е тръгнала да бере здравец. На камъка, където седяха, са останали само няколко трохи и следа от бастунче.')],
    },
    s1_zelendol: {
      id: 's1_zelendol',
      title: 'Силата на честността',
      bg: 'img/bg-woods.webp',
      lines: [
        L('narrator', 'На малка поляна се беше разположила група от седем-осем мишки с торби и пътни вързопчета.'),
        L('zelendol', 'Откъде си, малкия? Какво правиш сам в гората?'),
        L('mishkontin', 'От Сиренград. Търся родителите си… и всички миши жители. Плъховете ги отведоха.'),
        L('zelendol', 'Ние сме от Зелендол. Преди две лета плъховете на крал Мортис отведоха и нашите. Но ние не търсим тях. Търсим огромно сирене, скрито отвъд Сивите хълмове. Сирене, което никога не свършва.'),
        L('zelendol', 'А ти? Имаш ли какво да ни дадеш? Знаеш ли къде е Вечната пита?'),
        L('narrator', 'Можеше да каже „Знам“. Да им обещае нещо, само и само да тръгнат с него. Думите почти се изплъзнаха…'),
      ],
      choices: [
        { text: '„Знам… за легендата за Вечната пита, но не зная пътя.“', virtue: 'honesty', actions: [{ a: 'virtue', v: 'honesty', n: 2 }, { a: 'flag', flag: 'zelendol_done' }, { a: 'flag', flag: 'zelendol_truth' }, { a: 'removeObj', id: 'zelendol' }, { a: 'dialogue', id: 's1_iskritsa' }] },
        {
          text: '„Знам пътя! Елате с мен.“',
          actions: [
            { a: 'virtue', v: 'honesty', n: -1 }, { a: 'flag', flag: 'zelendol_done' }, { a: 'flag', flag: 'zelendol_lied' }, { a: 'removeObj', id: 'zelendol' },
            { a: 'call', fn: (s) => (s.vars.lieDay = s.day) }, { a: 'troops', cid: 'wanderer', n: 12 }, { a: 'dialogue', id: 's1_lie' },
          ],
        },
      ],
    },
    s1_iskritsa: {
      id: 's1_iskritsa',
      title: 'Искрица',
      lines: [
        L('zelendol', 'Тогава нямаме общ път. Ние търсим сиренето.'),
        L('narrator', 'Групата се отдалечи към Сивите хълмове. Мишконтин остана сам на поляната — но сърцето му беше по-леко.'),
        L('iskritsa', 'Ей! Почакай! Казвам се Искрица. Чух какво им каза. И реших да се върна.'),
        L('mishkontin', 'Защо? Аз нямам нищо, което да ви дам. Не знам пътя, нямам храна…'),
        L('iskritsa', 'Имаш нещо по-ценно. Имаш честно сърце. Приятелствата, построени върху истината, са построени върху камък, а не върху пясък.'),
        L('iskritsa', 'Аз обичам да пътувам с честни сърца. Ще търсим родителите ти и жителите на Сиренград заедно.', 'happy'),
      ],
      after: [
        { a: 'spawnHero', tpl: 'iskritsa', owner: 'player', x: 14, y: 10 },
        { a: 'call', fn: (s) => placeNextToMishkontin(s, 'iskritsa') },
        { a: 'flag', flag: 'iskritsa_joined' },
        { a: 'toast', text: 'Искрица се присъедини! Тя е втори герой — избери я от панела вдясно.', icon: '✨' },
      ],
    },
    s1_lie: {
      id: 's1_lie',
      lines: [
        L('zelendol', 'Наистина ли?! Тогава води, малкия!'),
        L('narrator', 'Мишките от Зелендол тръгнаха с него. Но всяка крачка тежеше. Ако започнеш пътя си с лъжа, ще трябва да лъжеш отново и отново…'),
      ],
    },
    s1_lie_out: {
      id: 's1_lie_out',
      title: 'Лъжата излиза наяве',
      lines: [
        L('zelendol', 'Вървим вече три дни, а ти все се озърташ. Ти изобщо не знаеш пътя, нали?'),
        L('mishkontin', '…Не знам. Знам само легендата. Излъгах ви, защото се страхувах да остана сам.', 'surprised'),
        L('zelendol', 'Тогава нямаме общ път.'),
        L('narrator', 'Мишките от Зелендол си тръгнаха. Всички — освен една.'),
        L('iskritsa', 'Казвам се Искрица. Лъжата винаги излиза наяве, приятелю. Но ти си призна сам — а това е по-трудно, отколкото изглежда. Искам да дойда с теб. Само без повече лъжи, става ли?'),
        L('mishkontin', 'Без повече лъжи. Обещавам.', 'happy'),
      ],
      after: [
        { a: 'call', fn: (s) => removeTroops(s, 'wanderer') },
        { a: 'virtue', v: 'honesty', n: 1 },
        { a: 'spawnHero', tpl: 'iskritsa', owner: 'player', x: 14, y: 10 },
        { a: 'call', fn: (s) => placeNextToMishkontin(s, 'iskritsa') },
        { a: 'flag', flag: 'iskritsa_joined' },
      ],
    },
    s1_zdravets: {
      id: 's1_zdravets',
      title: 'Здравецът',
      lines: [
        L('iskritsa', 'Намерих го! До камъка, покрит с мъх — лилави цветчета и пъстри листа!', 'happy', has('iskritsa_joined')),
        L('mishkontin', 'Лилави цветчета и пъстри листа. Точно както го описа баба Шушулка!', 'happy'),
        L('narrator', 'Мишконтин откъсна няколко листа. Вече знае как се прави мехлем от здравец.'),
      ],
      after: [{ a: 'spell', spell: 'heal' }],
    },
    s1_letko: {
      id: 's1_letko',
      title: 'Сълзите на ранената птичка',
      lines: [
        L('narrator', 'Скрито между листата на един храст лежеше малко орле с кафяво-златиста перушина. Едното му крило беше прегънато под странен ъгъл.'),
        L('letko', 'Не… не се приближавайте. Ще ме нараните.'),
        L('iskritsa', 'Няма да те нараним. Ние сме приятели. Искаме да ти помогнем.', undefined, has('iskritsa_joined')),
        L('letko', 'Защо бихте ми помагали? Вие сте мишоци. Аз съм птица. Не сме еднакви.'),
        L('mishkontin', 'Може и да не сме еднакви. Но когато някой страда, трябва да помогнеш.'),
        L('letko', 'Казвам се Летко. Паднах от гнездото. Родителите ми ги няма. И не мога да се кача обратно.'),
        L('mishkontin', 'Трябва ни здравец. Баба Шушулка каза, че от него става мехлем за рани.', 'map', hasNot('has_zdravets')),
        L('narrator', 'Мехлемът от здравец облекчи болката. Крилото беше превързано с листа от лопен, пръчка и стръкове трева. „Ще отнеме два-три дни“, каза Искрица. „Трябва да остане тук и да не го движи.“', undefined, has('has_zdravets')),
        L('letko', 'А вие… вие ще тръгнете ли? Вие имахте някъде да ходите, нали?', undefined, has('has_zdravets')),
      ],
      choices: [
        { text: '„Ще останем — докато не се възстановиш.“ (3 дни почивка)', virtue: 'kindness', requires: has('has_zdravets'), lockedHint: 'Първо намери здравец.', actions: [{ a: 'virtue', v: 'kindness', n: 2 }, { a: 'flag', flag: 'letko_stay' }, { a: 'flag', flag: 'letko_done' }, { a: 'call', fn: (s) => startRest(s, 'restLetko', 3) }, { a: 'dialogue', id: 's1_letko_stay' }] },
        { text: '„Трябва да вървим. Ще ти изпратим помощ.“', requires: has('has_zdravets'), lockedHint: 'Първо намери здравец.', actions: [{ a: 'flag', flag: 'letko_left' }, { a: 'flag', flag: 'letko_done' }, { a: 'dialogue', id: 's1_letko_left' }] },
        { text: '„Ще намерим здравец. Дръж се, Летко!“', requires: hasNot('has_zdravets'), actions: [] },
      ],
    },
    s1_letko_stay: {
      id: 's1_letko_stay',
      lines: [
        L('letko', 'Но… но вие губите време. Може да не намерите това, което търсите.'),
        L('mishkontin', 'Не губим време. Правим нещо важно. Помагаме на приятел.', 'happy'),
        L('narrator', 'Три дни и три нощи. През деня носеха храна на Летко, през нощта спяха до него, за да му е по-топло. Мишконтин разказваше истории от вкъщи, а Искрица пееше песните на майка си.'),
      ],
    },
    s1_letko_left: {
      id: 's1_letko_left',
      lines: [
        L('letko', 'Добре… Благодаря ви за мехлема.'),
        L('narrator', 'Когато се обърнаха, Летко още ги гледаше от храста. Мишконтин дълго не можа да забрави очите му.'),
      ],
    },
    s1_letko_after: {
      id: 's1_letko_after',
      lines: [
        L('letko', 'Още ме боли, но вече мога да мърдам крилото. Благодаря ви!', undefined, has('letko_stay')),
        L('narrator', 'Храстът е празен. Летко е отлетял — или някой го е намерил.', undefined, has('letko_left')),
      ],
    },
    s1_letokril: {
      id: 's1_letokril',
      title: 'Добрината намира път обратно',
      bg: 'img/bg-woods.webp',
      lines: [
        L('narrator', 'На четвъртия ден Летко разтвори крилата си. Веднъж. Два пъти. Три пъти. И после… полетя! Само на няколко педи над земята — но летеше!'),
        L('letko', 'Благодаря ви! Има нещо, което трябва да ви кажа. Не съм просто орле. Аз съм от кралския род на орлите.'),
        L('letokril', 'Истинското ми име е Летокрил. Баща ми е Златокрил — кралят на орлите в тази част на гората. Скрих името си, защото се страхувах. Но вие ми помогнахте и никога няма да забравя тази добрина!'),
        L('letokril', 'Вземи това перо. Ако някога имаш нужда от орлите — ние ще дойдем.'),
        L('mishkontin', 'Летокрил… Ще го пазя.', 'happy'),
      ],
      after: [{ a: 'flag', flag: 'letokril_friend' }, { a: 'artifact', art: 'featherQuill' }, { a: 'questDone', id: 'letko' }],
    },
    s1_outpost: {
      id: 's1_outpost',
      title: 'Плъховата застава',
      lines: [
        L('narrator', 'В Заставата мирише на ръжда и откраднати трохи. В ъгъла има празни клетки — тук плъховете са държали мишките, преди да ги отведат по-нататък.'),
        L('mishkontin', 'Следите продължават на североизток. Към гората с одраните дървета.', 'map'),
      ],
      after: [{ a: 'res', res: { acorns: 1500, cheese: 2 } }],
    },
    s1_goal: {
      id: 's1_goal',
      title: 'Одраните дървета',
      lines: [
        L('narrator', 'Дърветата тук изглеждаха, сякаш някой ги беше одрал. Кората беше надраскана с дълбоки белези. Земята — изровена и разбъркана. А въздухът миришеше на страшно.'),
        L('iskritsa', 'Хич не ми харесва това място. Нещо не е наред тук.', undefined, has('iskritsa_joined')),
        L('mishkontin', 'Не можем да продължим без спътник. Някъде в гората трябва да има мишки, които знаят пътя…', 'map', hasNot('iskritsa_joined')),
        L('mishkontin', 'А Летко? Не можем да го оставим под храста ей така.', 'surprised', hasNot('letko_done')),
      ],
    },
    s1_victory: {
      id: 's1_victory',
      title: 'Пътят продължава',
      bg: 'img/bg-woods.webp',
      lines: [
        L('narrator', 'Понякога най-големите чудовища не живеят в тъмните тунели. Понякога живеят съвсем близо — там, където някой е решил, че може да командва всички, само защото е по-голям.'),
        L('iskritsa', 'Виждаш ли как листата на дъба трептят? Гората винаги ти подсказва, ако я слушаш внимателно.'),
        L('mishkontin', 'Аз досега слушах само сърцето си.'),
        L('iskritsa', 'Тогава си на прав път. Най-добрите пътешественици слушат и двете.', 'happy'),
        L('narrator', 'Високо над дърветата прелетя орел. Направи един кръг — сякаш казваше: „Не сте сами.“', undefined, has('letokril_friend')),
        L('narrator', 'Някъде зад тях, в един храст, едно орле се учеше да лети само.', undefined, has('letko_left')),
      ],
    },
  },
};
