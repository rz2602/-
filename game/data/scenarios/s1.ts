import { addToArmy } from '../../core/hero';
import type { ScenarioDef } from '../../core/scenario';
import type { GameState } from '../../core/types';
import { has, hasNot, hasRes, L, res } from './helpers';

const MAPS = ['map1', 'map2', 'map3'];

function weakenBarn(s: GameState): void {
  const t = s.towns.find((x) => x.id === 'barn');
  if (!t || t.owner !== 'enemy') return;
  for (const st of t.garrison) if (st) st.n = Math.max(1, Math.round(st.n * 0.65));
}

export const S1: ScenarioDef = {
  id: 's1',
  number: 1,
  title: 'Откраднатата карта',
  subtitle: 'Първа глава',
  bg: 'img/bg-forest.webp',
  intro: [
    'Приказната гора се простира от бистрата река до Сребърните планини. Там, високо в скалите, стои Сиренград — градът на мишките, прочут с Вечната пита: вълшебно сирене, което никога не свършва и всяка зима храни цялата гора.',
    'Но под стария воденичен камък живее Мортис, Кралят плъх. Носи капачка от бутилка вместо корона и обида, по-стара от самия него. Тази есен неговите плъхове откраднаха Картата на пътищата от село Мъхово.',
    'Картата е скъсана на три парчета. Който ги събере, ще намери тайната пътека до Сиренград. Мишконтин, внукът на последния мишок-картограф, тръгва да ги върне — с дървена тояга, зелено наметало и златния медальон „М“.',
  ],
  goals: ['Намери трите парчета от картата (Север, Изток, Юг).', 'Мишконтин трябва да оцелее.', 'Не губи Мъхово за повече от 3 дни.'],
  map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TTT....T...TT$~~.TT...^^^.TTTT',
    'TTT..x.T1..TT.~~.....a...hTTTT',
    'T..,..rT.W...~~~.....E..r....T',
    'T...........V.~~....,..x...ZHT',
    'T..w..:::.2...~~...TT........T',
    'T..:::...:::.:==e:.TT.....hh.T',
    'T...:.,.....:.~~..:TT.....hh.T',
    'T.o.:...TT..:.~~..:::...u....T',
    'T..!:...TT.D:.~~~.TT.:.,....xT',
    'T...:,.....:..~~.oTT$.::.....T',
    'T...A::::::..#~~...+....:B...T',
    'T....@:...TT..~~h....h.:G....T',
    'T.$....:..TT..~~h*...h:......T',
    'T.......:..r..~~....::.....TTT',
    'T^^.....q:,...~~..::..TT.o.TTT',
    'T..sssssss::::==::U...TT..RTTT',
    'T..sssSssu....~~.,.......,...T',
    'T.KssLssssss.~~~.....F.....$.T',
    'T..sssssssss?.~~~...Y.c.TTTTTT',
    'TTTTT....xQ...~~...J....TTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  legend: {
    A: { town: { kind: 'town', id: 'mohovo', name: 'Мъхово', faction: 'forest', owner: 'player', built: ['hall', 'd1', 'd2', 'tavern'], garrison: [['mouse', 8]] } },
    B: { town: { kind: 'town', id: 'barn', name: 'Гнилият хамбар', faction: 'rats', owner: 'enemy', built: ['fort', 'd1', 'd2'], garrison: [['rat', 16], ['beetle', 5], ['ratbow', 4]] } },
    '@': { terrain: ':', hero: { kind: 'hero', tpl: 'mishkontin', owner: 'player', carry: true } },
    G: { terrain: ':', hero: { kind: 'hero', tpl: 'grizan', owner: 'enemy', role: 'boss', activeFrom: 15, targetTown: 'barn', army: [['rat', 18], ['beetle', 5], ['ratbow', 4]] } },
    '1': { obj: { id: 'mouselings', kind: 'npc', npc: 'mouselings', label: 'Изгубените мишлета', dialogue: 's1_mouselings', repeatDialogue: 's1_mouselings_after', doneFlag: 'mouselings_done' } },
    W: { obj: { kind: 'monster', cid: 'wolf', n: 7, guard: true, label: 'Вълците от Сивия гъсталак' } },
    '2': { terrain: ':', obj: { id: 'troshko', kind: 'npc', npc: 'troshko', label: 'Каруцата на Трошко', dialogue: 's1_troshko', repeatDialogue: 's1_troshko_after', doneFlag: 'troshko_done' } },
    L: { terrain: 's', obj: { id: 'letokril', kind: 'npc', npc: 'letokril', label: 'Заплетеният прилеп', dialogue: 's1_letokril_help' } },
    S: { terrain: 's', obj: { id: 'spiders', kind: 'monster', cid: 'spider', n: 9, guard: true, label: 'Паяците от Паяжинната падина', afterDialogue: 's1_letokril_web', flag: 'spiders_beaten' } },
    w: { obj: { kind: 'mine', res: 'wood', owner: null } },
    q: { obj: { kind: 'mine', res: 'stone', owner: null } },
    a: { obj: { kind: 'mine', res: 'acorns', owner: null } },
    E: { obj: { kind: 'monster', cid: 'boar', n: 3, guard: true, label: 'Глигани-пазачи' } },
    c: { obj: { kind: 'mine', res: 'cheese', owner: null } },
    F: { obj: { kind: 'monster', cid: 'frog', n: 10, joinable: true } },
    D: { obj: { kind: 'dwelling', cid: 'squirrel', available: 5, owner: null } },
    '!': { obj: { kind: 'shrine', effect: 'moraleDay', value: 1 } },
    '+': { obj: { kind: 'shrine', effect: 'att', value: 1 } },
    '?': { obj: { kind: 'shrine', effect: 'xp', value: 600 } },
    '*': { obj: { kind: 'shrine', effect: 'reveal', value: 11, label: 'Кулата на картографа' } },
    H: { obj: { kind: 'artifact', art: 'acornHelm' } },
    Z: { obj: { kind: 'monster', cid: 'wasp', n: 12, joinable: true } },
    K: { terrain: 's', obj: { kind: 'artifact', art: 'clover' } },
    J: { obj: { kind: 'artifact', art: 'mossBoots' } },
    Y: { obj: { kind: 'monster', cid: 'mushroom', n: 10, joinable: true } },
    '#': { obj: { kind: 'sign', text: 'На изток: Гнилият хамбар (опасно!). На запад: Мъхово (уютно!). Пазете си сиренето.' } },
    e: { terrain: ':', obj: { id: 'tracks', kind: 'event', dialogue: 's1_tracks', onlyHuman: true } },
    U: { terrain: ':', obj: { kind: 'monster', cid: 'mushroom', n: 8, joinable: true } },
    V: { obj: { kind: 'monster', cid: 'wolf', n: 5, joinable: true } },
    R: { obj: { kind: 'monster', cid: 'rat', n: 14 } },
    Q: { obj: { kind: 'monster', cid: 'wasp', n: 9, joinable: true } },
    $: { obj: { kind: 'resource', res: 'acorns', amount: 500 } },
    r: { obj: { kind: 'resource', res: 'wood', amount: 5 } },
    o: { obj: { kind: 'resource', res: 'stone', amount: 5 } },
    u: { obj: { kind: 'resource', res: 'cheese', amount: 2 } },
    x: { obj: { kind: 'chest', acorns: 1000, xp: 750 } },
  },
  startRes: { player: res(2500, 10, 10, 0), enemy: res(2000, 10, 10, 2) },
  heroPool: { player: ['barzonog', 'borko'], enemy: ['muhlyo', 'opashcho'] },
  weekNames: ['Седмица на първия мраз', 'Седмица на падащите листа', 'Седмица на дългите сенки', 'Седмица на гладните опашки', 'Седмица на шепота'],
  triggers: [
    {
      id: 'intro',
      when: (_s, e) => e.t === 'start',
      actions: [
        { a: 'dialogue', id: 's1_intro' },
        { a: 'quest', id: 'maps', title: 'Трите парчета', text: 'Намери трите парчета от Картата на пътищата: Север (някъде на север от Мъхово), Изток (казват, че един таралеж-търговец е намерил нещо) и Юг (у капитан Гризан в Гнилия хамбар).' },
      ],
    },
    {
      id: 'grizan_taunt',
      when: (s, e) => e.t === 'day' && s.day === 3,
      actions: [
        { a: 'dialogue', id: 's1_grizan_taunt' },
        { a: 'quest', id: 'defend', title: 'Пази Мъхово', text: 'Плъховете ще нападат селото. Наемай защитници за гарнизона или пресрещай нападателите. Ако Мъхово падне, имаш 3 дни да си го върнеш.' },
      ],
    },
    {
      id: 'raid1',
      when: (s, e) => e.t === 'day' && s.day === 5,
      actions: [
        { a: 'spawnHero', tpl: 'muhlyo', owner: 'enemy', x: 26, y: 12, role: 'raider', targetTown: 'barn', army: [['rat', 14], ['beetle', 3]] },
        { a: 'toast', text: 'Плъхове-нападатели тръгнаха от Гнилия хамбар!', icon: '🐀' },
      ],
    },
    {
      id: 'raid2',
      when: (s, e) => e.t === 'day' && s.day === 12,
      actions: [
        { a: 'spawnHero', tpl: 'opashcho', owner: 'enemy', x: 26, y: 10, role: 'raider', targetTown: 'barn', army: [['rat', 20], ['ratbow', 5], ['beetle', 4]] },
        { a: 'toast', text: 'Нова банда плъхове се насочва към Мъхово!', icon: '🐀' },
      ],
    },
    {
      id: 'grizan_beaten',
      when: (_s, e) => e.t === 'defeatHero' && e.heroId === 'grizan',
      actions: [{ a: 'dialogue', id: 's1_grizan_caught' }],
    },
    {
      id: 'barn_taken',
      when: (_s, e) => e.t === 'capture' && e.townId === 'barn' && e.by === 'player',
      actions: [{ a: 'dialogue', id: 's1_barn' }, { a: 'questDone', id: 'defend' }],
    },
    {
      id: 'mohovo_lost',
      repeat: true,
      when: (s, e) => e.t === 'capture' && e.townId === 'mohovo' && e.by === 'enemy' && (s.vars.mohovoLost ?? 0) === 0,
      actions: [
        { a: 'call', fn: (s) => (s.vars.mohovoLost = s.day) },
        { a: 'toast', text: 'Мъхово падна! Имаш 3 дни да си го върнеш.', icon: '⚠️' },
      ],
    },
    {
      id: 'mohovo_back',
      repeat: true,
      when: (_s, e) => e.t === 'capture' && e.townId === 'mohovo' && e.by === 'player',
      actions: [{ a: 'call', fn: (s) => (s.vars.mohovoLost = 0) }],
    },
    {
      id: 'maps_done',
      when: (s) => MAPS.every((m) => s.items.includes(m)),
      actions: [{ a: 'questDone', id: 'maps' }],
    },
  ],
  checkEnd: (s) => {
    if (MAPS.every((m) => s.items.includes(m)) && s.pendingDialogues.length === 0) return { status: 'won', reason: '' };
    const lost = s.vars.mohovoLost ?? 0;
    if (lost && s.day >= lost + 3 && s.towns.find((t) => t.id === 'mohovo')?.owner !== 'player') {
      return { status: 'lost', reason: 'Мъхово остана в лапите на плъховете. Без дом и запаси походът свърши.' };
    }
    return null;
  },
  victoryDialogue: () => 's1_victory',
  dialogues: {
    s1_intro: {
      id: 's1_intro',
      title: 'Празният хамбар',
      bg: 'img/bg-forest.webp',
      lines: [
        L('narrator', 'Приказната гора спеше под първия есенен мраз. В Мъхово, между корените на стария дъб, всички пазеха зимните запаси: жълъди, семенца и по едно парче сирене от Сиренград.'),
        L('narrator', 'Но тази сутрин хамбарът беше празен. Само следи от опашки и мирис на ръжда.'),
        L('ruzha', 'Мишконтине, момчето ми! Плъховете на Мортис са отнесли всичко. И… сандъчето на дядо ти.'),
        L('mishkontin', 'Сандъчето с картата?! Бабо, там беше Картата на пътищата — единствената, която показва тайната пътека до Сиренград!', 'surprised'),
        L('ruzha', 'Намерих и това, пъхнато под прага. Печатът е същият като на твоя медальон.'),
        L('belagor', '„Млади Пазителю. Ако четеш това, значи Мортис е тръгнал. Плъховете откраднаха Картата, но тя е стара и в бързината се е скъсала на три парчета.“'),
        L('belagor', '„Не позволявай на Мортис да ги събере. С цялата карта той ще намери Старата порта на Сиренград и ще отнесе Вечната пита. Тогава цялата гора ще гладува тази зима. — Белагор, последният Пазител на картите.“'),
        L('mishkontin', 'Три парчета. Север, Изток и Юг. Ще ги намеря, бабо. Обещавам.', 'map'),
        L('ruzha', 'Вземи тоягата на дядо си и опълчението. И запомни: смелият не е този, който не се страхува. Смелият е този, който тръгва въпреки страха.'),
        L('narrator', 'Съвет: щракни върху поле, за да видиш пътя, и още веднъж, за да тръгнеш. В града (Мъхово) строиш и наемаш войска. Когато героите се изморят, натисни „Край на хода“. Десният бутон показва какво има на картата.'),
      ],
      choices: [
        { text: '„Не се страхувам от никакви плъхове!“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }] },
        { text: '„Ще внимавам. Първо ще мисля, после ще скачам.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }] },
        { text: '„Ще върна запасите на всички. Никой няма да гладува.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }] },
      ],
    },
    s1_grizan_taunt: {
      id: 's1_grizan_taunt',
      title: 'Глас от хамбара',
      lines: [
        L('grizan', 'Ха! Чух, че някакво мишле с тояжка ме търси! Аз съм капитан Гризан! Гризах вериги, гризах врати — ще изгриза и Мъхово!'),
        L('grizan', 'Момчета! След два дни тръгваме към селото. Който донесе най-много сирене, получава… ъъъ… повече сирене!'),
        L('mishkontin', 'Ще нападат Мъхово. Трябва да оставя защитници у дома — или да ги пресрещна по пътя.', 'surprised'),
      ],
    },
    s1_tracks: {
      id: 's1_tracks',
      title: 'Следи на моста',
      lines: [
        L('mishkontin', 'Следи от опашки… водят на изток, към Гнилия хамбар. А това? Изпуснато писмо с печата на Мортис!', 'map'),
        L('mortis', '„Гризане! Донеси ми парчетата от картата до пълнолуние. Иначе — без сирене цял месец! — Мортис, Крал на всичко под земята и на малко над нея.“'),
        L('mishkontin', 'Значи и Мортис още няма картата! Има време. Хамбарът трябва да е там, зад хълмовете.', 'happy'),
      ],
      after: [{ a: 'reveal', x: 25, y: 11, r: 4 }],
    },
    s1_troshko: {
      id: 's1_troshko',
      title: 'Трошко и трошките',
      lines: [
        L('troshko', 'Ох-ох-ох! Клиент! Добре дошъл в най-подвижния магазин на гората — „Трошко и трошките“! Е, днес не е много подвижен. Колелото ми затъна.'),
        L('troshko', 'Какво търсиш? Копчета? Половин лъжица? Изключително рядко перо от врабче, леко употребявано?'),
        L('mishkontin', 'Търся парче от стара карта. Източната му част.'),
        L('troshko', 'А-ха… това ли? Намерих го в един храст. Много ценна находка. Много. Ужасно ценна. 1000 жълъда — и е твое.'),
      ],
      choices: [
        { text: 'Плати 1000 жълъда.', requires: hasRes({ acorns: 1000 }), lockedHint: 'Нямаш 1000 жълъда.', actions: [{ a: 'res', res: { acorns: -1000 } }, { a: 'item', item: 'map2' }, { a: 'flag', flag: 'troshko_paid' }, { a: 'flag', flag: 'troshko_done' }, { a: 'dialogue', id: 's1_troshko_paid' }] },
        { text: '„Нека ти поправя колелото. Ето 5 дърва.“', virtue: 'kindness', requires: hasRes({ wood: 5 }), lockedHint: 'Нужни са 5 дърва.', actions: [{ a: 'res', res: { wood: -5 } }, { a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'troshko_helped' }, { a: 'flag', flag: 'troshko_done' }, { a: 'item', item: 'map2' }, { a: 'dialogue', id: 's1_troshko_helped' }] },
        { text: 'Разгледай парчето „само за миг“ и го запомни наизуст.', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'map2_memorized' }, { a: 'flag', flag: 'troshko_done' }, { a: 'item', item: 'map2' }, { a: 'dialogue', id: 's1_troshko_memo' }] },
        { text: 'Грабни парчето и бягай!', actions: [{ a: 'virtue', v: 'kindness', n: -1 }, { a: 'flag', flag: 'troshko_robbed' }, { a: 'flag', flag: 'troshko_done' }, { a: 'item', item: 'map2' }, { a: 'dialogue', id: 's1_troshko_robbed' }] },
        { text: '„Ще се върна по-късно.“', actions: [] },
      ],
    },
    s1_troshko_paid: {
      id: 's1_troshko_paid',
      lines: [L('troshko', 'Пазарлък! Честна сделка за честна мишка. Ако някога ти трябва нещо — каквото и да е — знаеш къде да ме намериш. Е, приблизително къде.')],
    },
    s1_troshko_helped: {
      id: 's1_troshko_helped',
      lines: [
        L('troshko', 'Ти… ти ми поправи колелото? Без да пазариш? Никой досега не е правил това за стария Трошко.'),
        L('troshko', 'Вземи картата. Не, не, никакви жълъди! И… ето ти една торбичка трошки за из път. Най-хубавите.'),
        L('mishkontin', 'Благодаря, Трошко! Ще се видим пак.', 'happy'),
      ],
      after: [{ a: 'res', res: { acorns: 300 } }],
    },
    s1_troshko_memo: {
      id: 's1_troshko_memo',
      lines: [
        L('mishkontin', 'Хм… река, три хълма, пътека като опашка на гущер… Готово! Запомних я.', 'map'),
        L('troshko', 'Ей! Това не е честно! Е… всъщност е. Гледането е безплатно. Но парчето оставам аз — може някой друг да плати добре за него.'),
        L('narrator', 'Мишконтин начерта копие от паметта си. Но оригиналът остана в каруцата на Трошко…'),
      ],
    },
    s1_troshko_robbed: {
      id: 's1_troshko_robbed',
      lines: [
        L('troshko', 'Крадец! Помощ! Ограбиха ме! Ще запомня това, Мишконтине! Таралежите никога не забравят!'),
        L('mishkontin', 'Аз… трябваше да бързам. Нали?', 'surprised'),
      ],
    },
    s1_troshko_after: {
      id: 's1_troshko_after',
      lines: [
        L('troshko', 'Пак ли ти? Половин лъжица? Не? Перо от врабче? Е, ела пак, когато имаш жълъди.', undefined, hasNot('troshko_robbed')),
        L('troshko', 'Ти! Махай се от каруцата ми, крадецо!', undefined, has('troshko_robbed')),
      ],
    },
    s1_mouselings: {
      id: 's1_mouselings',
      title: 'Старата хралупа',
      lines: [
        L('mouselings', 'Мишконтин! Мишконтин дойде! Казах ти, че ще дойде!'),
        L('mishkontin', 'Пипчо? Сънчо? Какво правите чак тук? Цялото Мъхово ви търси!', 'surprised'),
        L('mouselings', 'Гонехме една хартийка, дето летеше с вятъра. После дойдоха вълците и се скрихме в хралупата… три дни!'),
        L('mouselings', 'Ето я хартийката. Има планини и голяма буква „С“.'),
        L('mishkontin', 'Северното парче! „С“ като Сиренград! Вие сте истински герои!', 'happy'),
        L('mouselings', 'Може ли да дойдем с теб? Ние сме смели! Почти.'),
      ],
      choices: [
        { text: '„Елате! Но стойте зад таралежите.“', virtue: 'courage', actions: [{ a: 'item', item: 'map1' }, { a: 'virtue', v: 'courage', n: 1 }, { a: 'troops', cid: 'mouse', n: 10 }, { a: 'flag', flag: 'mouselings_done' }, { a: 'removeObj', id: 'mouselings' }] },
        {
          text: '„Най-смелото сега е да се приберете у дома и да пазите Мъхово.“', virtue: 'kindness',
          actions: [
            { a: 'item', item: 'map1' }, { a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'mouselings_done' }, { a: 'removeObj', id: 'mouselings' },
            { a: 'call', fn: (s) => { const t = s.towns.find((x) => x.id === 'mohovo'); if (t && t.owner === 'player') addToArmy(t.garrison, 'mouse', 14); } },
            { a: 'toast', text: 'Мишлетата и семействата им пазят Мъхово (+14 опълченци в гарнизона).', icon: '🐭' },
          ],
        },
      ],
    },
    s1_mouselings_after: { id: 's1_mouselings_after', lines: [L('narrator', 'Хралупата е празна. Само няколко трошици показват, че тук са живели три смели мишлета.')] },
    s1_letokril_help: {
      id: 's1_letokril_help',
      title: 'Някой в мрежата',
      lines: [
        L('letokril', 'Ей, ти! Да, ти, с медальона! Паяците ме оплетоха. Не, не съм шпионин. Добре де, малко съм. Но сега съм просто заплетен!'),
        L('mishkontin', 'Първо трябва да се справя с паяците. Дръж се!'),
      ],
    },
    s1_letokril_web: {
      id: 's1_letokril_web',
      title: 'Прилепът в мрежата',
      lines: [
        L('narrator', 'Паяците избягаха в тръстиките. В лепкавата мрежа виси прилеп с чанта, пълна с писма.'),
        L('letokril', 'Аз съм Летокрил, вестоносецът на Негово Величество Мортис. Ще ме пуснеш ли? Крилото ме боли.'),
        L('mishkontin', 'Носиш писмата на Мортис?'),
        L('letokril', 'Нося ги, защото никой друг не иска да говори с мен. За горските съм „твърде страшен“, а за плъховете — „твърде малко плъх“.'),
      ],
      choices: [
        { text: 'Освободи го без условия. „Всеки заслужава помощ.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'letokril_freed' }, { a: 'flag', flag: 'letokril_trust' }, { a: 'removeObj', id: 'letokril' }, { a: 'dialogue', id: 's1_letokril_free' }] },
        { text: '„Ще те пусна, ако ми кажеш как да вляза в Гнилия хамбар.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'letokril_freed' }, { a: 'removeObj', id: 'letokril' }, { a: 'call', fn: weakenBarn }, { a: 'reveal', x: 25, y: 11, r: 5 }, { a: 'dialogue', id: 's1_letokril_deal' }] },
        { text: '„Не вярвам на шпиони на Мортис. Ще почакаш тук.“', actions: [{ a: 'flag', flag: 'letokril_left' }, { a: 'removeObj', id: 'letokril' }, { a: 'dialogue', id: 's1_letokril_left' }] },
      ],
    },
    s1_letokril_free: {
      id: 's1_letokril_free',
      lines: [
        L('letokril', 'Просто… така? Без нищо? Странна мишка си ти.'),
        L('letokril', 'Няма да забравя това, Мишконтине. Прилепите имат дълга памет. И големи уши.'),
      ],
    },
    s1_letokril_deal: {
      id: 's1_letokril_deal',
      lines: [
        L('letokril', 'Добре, добре! Задната стена на хамбара е гнила, а половината стражи спят следобед. Доволен ли си?'),
        L('mishkontin', 'Благодаря. Свободен си.', 'map'),
        L('letokril', 'Пф. „Благодаря“. Всички искат нещо от Летокрил…'),
        L('narrator', 'Знаейки слабите места, горските ще срещнат по-малко защитници в Гнилия хамбар.'),
      ],
    },
    s1_letokril_left: {
      id: 's1_letokril_left',
      lines: [
        L('letokril', 'Ще почакам?! Ти… ти си същият като всички останали!'),
        L('narrator', 'Когато Мишконтин се обърна, мрежата беше празна. Прилепът се беше освободил сам — и беше отлетял към Мрачната нора.'),
      ],
    },
    s1_grizan_caught: {
      id: 's1_grizan_caught',
      title: 'Капитанът в калта',
      lines: [
        L('narrator', 'Капитан Гризан седи в калта, без шлем, и за първи път не крещи.'),
        L('grizan', 'Добре де, добре! Победи ме. Сега какво — ще ме изгризеш ли?'),
        L('mishkontin', 'Мишките не гризат плъхове. Къде е южното парче от картата?'),
        L('grizan', 'В хамбара. В сандъка под сеното. Ох, Мортис ще ме остави без сирене до пролетта…'),
      ],
      choices: [
        { text: '„Върви при Мортис и му кажи: горските не се страхуват.“', virtue: 'courage', actions: [{ a: 'virtue', v: 'courage', n: 1 }, { a: 'flag', flag: 'grizan_released' }] },
        { text: 'Дай му хляб и го пусни. „Изглеждаш гладен, капитане.“', virtue: 'kindness', actions: [{ a: 'virtue', v: 'kindness', n: 1 }, { a: 'flag', flag: 'grizan_fed' }, { a: 'dialogue', id: 's1_grizan_fed' }] },
        { text: '„Ще останеш в Мъхово, докато не ми разкажеш всичко за Мортис.“', virtue: 'wisdom', actions: [{ a: 'virtue', v: 'wisdom', n: 1 }, { a: 'flag', flag: 'grizan_prisoner' }, { a: 'dialogue', id: 's1_grizan_prisoner' }] },
      ],
    },
    s1_grizan_fed: {
      id: 's1_grizan_fed',
      lines: [
        L('grizan', 'Хляб? За мен? …Мортис никога не ни дава хляб. Казва, че гладният плъх е по-зъл.'),
        L('grizan', 'Аз… ще запомня това, мишле.'),
      ],
    },
    s1_grizan_prisoner: {
      id: 's1_grizan_prisoner',
      lines: [
        L('grizan', 'Пленник? Добре. Поне в Мъхово хранят по-добре.'),
        L('grizan', 'Ще ти кажа едно безплатно: Мортис не иска само сиренето. Иска всички в Сиренград да му се поклонят. Заради нещо старо. Нещо, което никога не разказва.'),
      ],
    },
    s1_barn: {
      id: 's1_barn',
      title: 'Гнилият хамбар',
      lines: [
        L('narrator', 'В Гнилия хамбар мирише на стари обувки и откраднато сирене. Под сеното има сандък.'),
        L('mishkontin', 'Южното парче! И… запасите на Мъхово! Жълъдите, сиренето — всичко е тук!', 'happy'),
      ],
      after: [{ a: 'item', item: 'map3' }, { a: 'res', res: { acorns: 1500, cheese: 3 } }],
    },
    s1_victory: {
      id: 's1_victory',
      title: 'Картата на пътищата',
      bg: 'img/bg-mount.webp',
      lines: [
        L('mishkontin', 'Север… Изток… Юг. Ето я — Картата на пътищата! Виждате ли тази тънка линия през планините? Пътеката на Картографа.', 'map'),
        L('narrator', 'Когато трите парчета се допряха, медальонът „М“ засия топло. По картата изгряха букви, които никой не беше виждал: „Само Пазител може да отвори Старата порта.“'),
        L('mishkontin', 'Пазител… Аз ли?', 'surprised'),
        L('ruzha', 'Дядо ти щеше да се гордее. Сега върви. Сиренград трябва да научи, че Мортис идва.'),
        L('narrator', 'Високо над дъба прелетя прилеп. Направи един кръг — сякаш махаше за довиждане.', undefined, has('letokril_trust')),
        L('narrator', 'Някъде далеч, в Мрачната нора, Гризан разказваше на краля за мишлето, което не се страхува.', undefined, has('grizan_released')),
        L('narrator', 'Някъде далеч Гризан дъвчеше последната коричка хляб и мислеше. Плъховете не мислят често. Но този път мислеше.', undefined, has('grizan_fed')),
        L('narrator', 'А в Мрачната нора Кралят плъх разгърна свое собствено копие на картата — и се усмихна.', undefined, has('map2_memorized')),
      ],
    },
  },
};
