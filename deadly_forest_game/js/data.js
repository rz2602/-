'use strict';
// ===================== Данни: герои, нива, история =====================

const TILE = 40;
const CELL_W = 256, CELL_H = 128, ANCHOR_X = 72; // атлас assets/heroes.png

const HEROES = [
  {
    id: 'bear', name: 'Robot Bear', en: 'Робот мечок', row: 0,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5, 6], attack: [7, 8, 9] },
    hp: 8, speed: 190, color: '#5fd4ff',
    desc: 'Бронирана мечка-робот с енергиен бластер. Издръжлив и надежден.',
    attack: { type: 'shot', name: 'Енергиен бластер', dmg: 2, cd: 0.32, speed: 640, size: 7, life: 0.9, color: '#5fd4ff' },
    ability: { id: 'shield', name: 'Енергиен щит', cd: 10, desc: '3 сек. неуязвимост и отразяване на изстрели' },
    stats: { 'Живот': 5, 'Сила': 3, 'Скорост': 2 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Тропически', filter: 'hue-rotate(150deg) saturate(1.5)', tint: '#3dff9a' },
      { name: 'Ръждив', filter: 'sepia(0.8) saturate(2.2) hue-rotate(-15deg)', tint: '#c46a2b' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
  {
    id: 'snow', name: 'Snow woman', en: 'Снежната жена', row: 1,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5], attack: [6, 7, 8] },
    hp: 6, speed: 210, color: '#9fe8ff',
    desc: 'Повелителка на леда. Ледените ѝ кристали забавят чудовищата.',
    attack: { type: 'shot', name: 'Леден кристал', dmg: 1.5, cd: 0.28, speed: 560, size: 7, life: 0.9, color: '#bff4ff', slow: 2 },
    ability: { id: 'freeze', name: 'Ледена буря', cd: 9, desc: 'Замразява всички наоколо за 2.5 сек.' },
    stats: { 'Живот': 3, 'Сила': 3, 'Скорост': 3 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Розов скреж', filter: 'hue-rotate(110deg) saturate(1.6)', tint: '#ff7bd5' },
      { name: 'Полярна нощ', filter: 'brightness(0.75) saturate(1.8) hue-rotate(20deg)', tint: '#3048a0' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
  {
    id: 'hen', name: 'Robotic Hand', en: 'Роботската ръка', row: 2,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5], attack: [6, 7, 8] },
    hp: 6, speed: 205, color: '#ff9a3c',
    desc: 'Малък, но смел робот. Изстрелва огнени кълба, които избухват.',
    attack: { type: 'shot', name: 'Огнено кълбо', dmg: 2, cd: 0.45, speed: 480, size: 9, life: 1, color: '#ffa53a', splash: 55 },
    ability: { id: 'repair', name: 'Ремонт', cd: 14, desc: 'Възстановява 2 живота' },
    stats: { 'Живот': 3, 'Сила': 4, 'Скорост': 3 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Мента', filter: 'hue-rotate(120deg) saturate(1.3)', tint: '#4dffc0' },
      { name: 'Хромиран', filter: 'grayscale(1) brightness(1.15) contrast(1.2)', tint: '#cfd8dc' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
  {
    id: 'hand', name: 'Crazy Killer', en: 'Лудият убиец', row: 3,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5], attack: [6, 7, 8] },
    hp: 7, speed: 200, color: '#ff5a36',
    desc: 'Безразсъден боец с огромен механичен юмрук. Удря от близо – и много силно.',
    attack: { type: 'melee', name: 'Механичен юмрук', dmg: 4, cd: 0.42, range: 78, arc: 1.9, color: '#ff6a2c', knock: 260 },
    ability: { id: 'dash', name: 'Ракетен юмрук', cd: 6, desc: 'Рязък устрем напред, който поразява всичко по пътя' },
    stats: { 'Живот': 4, 'Сила': 5, 'Скорост': 2 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Синя стомана', filter: 'hue-rotate(200deg) saturate(1.4)', tint: '#3d7bff' },
      { name: 'Сянка', filter: 'grayscale(0.7) brightness(0.8) contrast(1.3)', tint: '#444' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
  {
    id: 'archey', name: 'Rh.Exe', en: 'Хакнатият робот', row: 4,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5], attack: [6, 7, 8] },
    hp: 5, speed: 215, color: '#b45cff',
    desc: 'Хакнат робот от неизвестен произход. Енергийните му лъчи пронизват всичко.',
    attack: { type: 'shot', name: 'Глич лъч', dmg: 1.6, cd: 0.36, speed: 760, size: 6, life: 0.85, color: '#c77dff', pierce: true },
    ability: { id: 'blink', name: 'Глич телепорт', cd: 5, desc: 'Телепорт напред и електромагнитен взрив' },
    stats: { 'Живот': 2, 'Сила': 4, 'Скорост': 4 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Матрица', filter: 'hue-rotate(-150deg) saturate(1.6)', tint: '#36ff6a' },
      { name: 'Червен код', filter: 'hue-rotate(70deg) saturate(1.8)', tint: '#ff2a4a' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
  {
    id: 'tiny', name: 'Tiny man', en: 'Мъничкият човек', row: 5,
    frames: { idle: [0], walk: [1, 2, 3, 4, 5], attack: [6, 7, 8] },
    hp: 5, speed: 255, color: '#ffb13b',
    desc: 'Мъничък и мистериозен герой, за когото почти нищо не се знае. Бърз като сянка.',
    attack: { type: 'melee', name: 'Огнено острие', dmg: 2.2, cd: 0.22, range: 66, arc: 2.2, color: '#ffb13b', knock: 120 },
    ability: { id: 'shadow', name: 'Сянка', cd: 9, desc: '3 сек. невидимост и двойни щети' },
    stats: { 'Живот': 2, 'Сила': 3, 'Скорост': 5 },
    skins: [
      { name: 'Оригинал', filter: 'none' },
      { name: 'Призрачен', filter: 'hue-rotate(170deg) saturate(1.5) brightness(1.15)', tint: '#4fd8ff' },
      { name: 'Кървава луна', filter: 'hue-rotate(-35deg) saturate(2)', tint: '#ff3030' },
      { name: 'Легендарен', filter: 'sepia(1) saturate(4) hue-rotate(5deg) brightness(1.1)', tint: '#ffd700', legendary: true },
    ],
  },
];

const DIFFICULTIES = [
  { name: 'Лесно', enemyHp: 0.75, dmg: 0.5, count: 0.75 },
  { name: 'Нормално', enemyHp: 1, dmg: 1, count: 1 },
  { name: 'Трудно', enemyHp: 1.35, dmg: 1.5, count: 1.3 },
];

const INTRO_PAGES = [
  { title: 'Имало едно време…', text: 'Имало едно време един голям и красив град. В него имало всичко – фабрика за играчки, огромни складове, цирк, подземни канали, стара забавна къща на илюзиите и голяма гора.\n\nХората живеели спокойно и градът бил пълен с живот.' },
  { title: 'Но един ден всичко се променило.', text: 'От неизвестно място се появили страшни чудовища, които нападнали града.\n\nПостепенно те превзели фабриката, складовете, цирка, каналите и останалите места.' },
  { title: 'Последна се изправила гората', text: 'Тя сякаш била жива и събрала цялата си природна сила, за да защити града.\n\nБитката била огромна, но дори гората не успяла да спре чудовищата.' },
  { title: '🌲 СМЪРТОНОСНАТА ГОРА', text: 'Хората избягали и градът останал напълно изоставен. Оттогава никой не смеел да се приближи до гората.\n\nВсички започнали да я наричат… Смъртоносната гора.' },
  { title: 'Експедицията', text: 'Минали години.\n\nТогава специална организация, която изследва паранормални явления, чудовища и необясними събития, изпратила експедиция в изоставения град.\n\nНо това не била обикновена експедиция…' },
];

const ENDING_LINES = [
  'Градът най-накрая е свободен.',
  'Малко по малко животът започва да се връща.',
  'Светлините отново светват.',
  'Фабриката заработва.',
  'Циркът отново е пълен със смях.',
  'А гората вече не се нарича Смъртоносната гора.',
  'Но това няма да бъде краят…',
  'Защото историята ще продължи в следващите части на играта.',
];

// Типове врагове (kind = поведение, look = как изглежда)
// kind: chaser | shooter | charger | ghost | tank
const LEVELS = [
  {
    id: 'factory', name: 'Фабриката за играчки', icon: '🧸',
    pal: { bg: '#120d18', floor: '#3a3045', floor2: '#43374f', wall: '#5b4370', wallTop: '#2a1f35', face: '#4a3560', accent: '#ffb347', detail: '#ff6fa8' },
    dark: 0, hazard: { name: 'Искрящи кабели', color: '#ffe066', patches: 3 },
    item: { name: 'Златно зъбно колело', plural: 'Зъбни колела', count: 3, color: '#ffcc33', shape: 'gear' },
    enemies: [
      { name: 'Навита играчка', kind: 'chaser', look: 'toy', hp: 4, speed: 95, dmg: 1, r: 15, color: '#d8433f' },
      { name: 'Злото плюшено мече', kind: 'charger', look: 'plush', hp: 6, speed: 80, dmg: 1, r: 17, color: '#8a5a3c' },
    ],
    roomEnemies: 2,
    boss: { name: 'Кукловодът', look: 'puppet', hp: 70, r: 44, speed: 70, color: '#c0392b', patterns: ['aim', 'burst', 'summon'], bullet: '#ffb347' },
    intro: 'Експедицията започва от старата фабрика за играчки. Конвейерите още скърцат, а навитите играчки бродят из цеховете сами.\n\nНамери 3 златни зъбни колела, за да задвижиш главната порта и да се изправиш срещу Кукловода.',
    outro: 'Кукловодът падна, а конците му се разпаднаха на прах. Фабриката утихна.\n\nВ дървената ръка на марионетката намираш ключ с надпис „Склад 13“.',
    notes: [
      { title: 'Дневник на нощния пазач', text: '„03:17. Конвейерът тръгна сам. Играчките на лентата се обърнаха към мен. Всички едновременно.“' },
      { title: 'Поръчка №666', text: '„Доставка от гората: 40 тона дърво за новата серия играчки. Дървото е топло на пипане. Работниците казват, че шепне.“' },
      { title: 'Писмо на собственика', text: '„Кукловодът беше най-хубавата ни марионетка. Направен от сърцевината на най-старото дърво в гората. Сега конците му се движат без ръце.“' },
    ],
  },
  {
    id: 'warehouse', name: 'Складовете', icon: '📦',
    pal: { bg: '#100f0b', floor: '#46443c', floor2: '#4d4a41', wall: '#6b5636', wallTop: '#2b2418', face: '#5a4628', accent: '#e8c35a', detail: '#9c8a5c' },
    dark: 0.25, hazard: { name: 'Счупено стъкло', color: '#bfe9ff', patches: 4 },
    item: { name: 'Ключ от склада', plural: 'Ключове', count: 4, color: '#e8c35a', shape: 'key' },
    enemies: [
      { name: 'Сенчест плъх', kind: 'chaser', look: 'rat', hp: 3, speed: 135, dmg: 1, r: 13, color: '#3a3240' },
      { name: 'Кашон-мимик', kind: 'charger', look: 'crate', hp: 8, speed: 75, dmg: 1, r: 18, color: '#a07840' },
      { name: 'Плюещ кашон', kind: 'shooter', look: 'crate', hp: 5, speed: 60, dmg: 1, r: 17, color: '#7f6a3c' },
    ],
    roomEnemies: 3,
    boss: { name: 'Товарният голем', look: 'golem', hp: 110, r: 50, speed: 60, color: '#9c7440', patterns: ['charge', 'burst', 'aim'], bullet: '#e8c35a' },
    intro: 'Огромните складове са лабиринт от стелажи и кашони, които сякаш дишат.\n\nСъбери 4 ключа от склада, за да отвориш товарната рампа, където те чака Товарният голем.',
    outro: 'Големът се разпадна на купчина кашони. Между тях откриваш скъсан цирков билет.\n\nОтдалеч се чува музика… от цирка.',
    notes: [
      { title: 'Товарителница', text: '„Всички пратки към гората – върнати. Печат: ПОЛУЧАТЕЛЯТ НЕ СЪЩЕСТВУВА.“' },
      { title: 'Бележка на склададжия', text: '„Кашоните растат. Вчера бяха 300. Днес са 412. Никой не ги е докарвал.“' },
      { title: 'Стара снимка', text: 'На снимката – тъмна фигура между стелажите. На гърба пише: „Първата експедиция. Не се върнаха.“' },
    ],
  },
  {
    id: 'circus', name: 'Циркът', icon: '🎪',
    pal: { bg: '#170a17', floor: '#3b1f33', floor2: '#45243c', wall: '#8d2240', wallTop: '#2a0f1d', face: '#7a1d37', accent: '#ffd568', detail: '#f4f0e8' },
    dark: 0.3, hazard: { name: 'Огнени кръгове', color: '#ff7a2c', patches: 4 },
    item: { name: 'Цирков билет', plural: 'Билети', count: 4, color: '#ffd968', shape: 'ticket' },
    enemies: [
      { name: 'Зловещ клоун', kind: 'chaser', look: 'clown', hp: 6, speed: 110, dmg: 1, r: 16, color: '#e64f69' },
      { name: 'Жонгльорска топка', kind: 'shooter', look: 'ball', hp: 5, speed: 70, dmg: 1, r: 14, color: '#4fb3ff' },
      { name: 'Акробат', kind: 'charger', look: 'clown', hp: 7, speed: 95, dmg: 1, r: 16, color: '#9b59ff' },
    ],
    roomEnemies: 3,
    boss: { name: 'Маестро Смях', look: 'ringmaster', hp: 150, r: 46, speed: 85, color: '#9b2e66', patterns: ['spiral', 'aim', 'summon', 'charge'], bullet: '#ff5f8f' },
    intro: 'Светлините на цирка примигват, а музиката звучи, въпреки че градът е изоставен. Въртележката се движи сама.\n\nНамери 4 циркови билета, за да влезеш в голямата шатра при Маестро Смях.',
    outro: 'Смехът утихна. Под арената откриваш таен люк, който води надолу…\n\n…към каналите.',
    notes: [
      { title: 'Скъсан плакат', text: '„Последното представление беше отменено. Животните отказаха да доближат гората.“' },
      { title: 'Детска рисунка', text: 'На рисунката клоун държи черен корен. Отдолу пише: „Той не беше такъв преди.“' },
      { title: 'Страница от дневник', text: '„Музиката идва отдолу. Под арената има тунел, който не е на плановете.“' },
    ],
  },
  {
    id: 'canals', name: 'Каналите', icon: '🌊',
    pal: { bg: '#060d0d', floor: '#2a3b3a', floor2: '#2f4341', wall: '#2f4a44', wallTop: '#101c1b', face: '#243a36', accent: '#6dff9e', detail: '#4f7a5a' },
    dark: 0.6, hazard: { name: 'Токсична вода', color: '#5dff6a', patches: 6 },
    item: { name: 'Вентил', plural: 'Вентили', count: 4, color: '#ff6b5a', shape: 'valve' },
    enemies: [
      { name: 'Канална слуз', kind: 'chaser', look: 'slime', hp: 6, speed: 85, dmg: 1, r: 17, color: '#5dd65a' },
      { name: 'Пипало', kind: 'shooter', look: 'tentacle', hp: 7, speed: 0, dmg: 1, r: 16, color: '#8a4fbf' },
      { name: 'Сенчест плъх', kind: 'chaser', look: 'rat', hp: 4, speed: 150, dmg: 1, r: 13, color: '#2e3a30' },
      { name: 'Блатен звяр', kind: 'tank', look: 'slime', hp: 16, speed: 55, dmg: 2, r: 24, color: '#2f8f4a' },
    ],
    roomEnemies: 3,
    boss: { name: 'Каналният цар', look: 'slimeking', hp: 190, r: 56, speed: 70, color: '#3fbf5a', patterns: ['burst', 'summon', 'spiral', 'aim'], bullet: '#7dff6a' },
    intro: 'Подземните канали са тъмни, влажни и пълни с токсична вода. Не стъпвай в нея!\n\nЗавърти 4 вентила, за да източиш главния шлюз, където живее Каналният цар.',
    outro: 'Каналният цар се стопи в зелена локва. Водата се оттича…\n\nТунелът води нагоре – към старата къща на илюзиите.',
    notes: [
      { title: 'Ръждясала табела', text: '„ВНИМАНИЕ: Разкопки на ниво −3. Шлюз 7 да НЕ се отваря.“' },
      { title: 'Доклад на инженера', text: '„При копаенето на новия канал засегнахме корен. Огромен. Черен. Той пулсираше като сърце.“' },
      { title: 'Надраскано на стената', text: '„Каналите водят право под гората. Те идват ОТТАМ.“' },
    ],
  },
  {
    id: 'house', name: 'Обитаваната къща', icon: '🏚️',
    pal: { bg: '#0b0710', floor: '#3a2a22', floor2: '#33251e', wall: '#3c2a48', wallTop: '#140d1a', face: '#2c1f36', accent: '#c9a0ff', detail: '#6e4a3a' },
    dark: 0.8, hazard: { name: 'Проклети плочки', color: '#c34fff', patches: 5 },
    item: { name: 'Огледално парче', plural: 'Парчета', count: 5, color: '#bfeaff', shape: 'shard' },
    enemies: [
      { name: 'Призрак', kind: 'ghost', look: 'ghost', hp: 6, speed: 80, dmg: 1, r: 16, color: '#dfe8ff' },
      { name: 'Порцеланова кукла', kind: 'charger', look: 'doll', hp: 8, speed: 105, dmg: 1, r: 15, color: '#f2d6c9' },
      { name: 'Огледален двойник', kind: 'shooter', look: 'mirror', hp: 7, speed: 80, dmg: 1, r: 16, color: '#9fc4ff' },
    ],
    roomEnemies: 4,
    boss: { name: 'Господарят на илюзиите', look: 'mask', hp: 230, r: 48, speed: 90, color: '#7d3cff', patterns: ['teleport', 'spiral', 'aim', 'summon', 'burst'], bullet: '#c9a0ff' },
    intro: 'Старата забавна къща на илюзиите. Тук нищо не е такова, каквото изглежда, а тъмнината е почти пълна.\n\nСъбери 5 огледални парчета и сглоби огледалото, което показва пътя до Господаря на илюзиите.',
    outro: 'Маската се пръсна на светлина. За миг огледалата показват истината: пътека, която води право в сърцето на гората.',
    notes: [
      { title: 'Стар афиш', text: '„Къщата на илюзиите – вижте най-страшния си кошмар!“ Някой е задраскал „илюзиите“ и е написал отгоре „истината“.' },
      { title: 'Счупено огледало', text: 'В отражението за миг виждаш града – светъл и пълен с живот. После образът изчезва.' },
      { title: 'Дневник на илюзиониста', text: '„Корените ми показаха врата в сърцето на гората. Зад нея има друг свят. Чудовищата не дойдоха да завладеят града… те бягаха от нещо.“' },
    ],
  },
  {
    id: 'forest', name: 'Смъртоносната гора', icon: '🌲',
    pal: { bg: '#050a06', floor: '#1d2b19', floor2: '#22321d', wall: '#0f1f12', wallTop: '#07110a', face: '#132816', accent: '#a6ff5c', detail: '#3f5a2a' },
    dark: 0.82, hazard: { name: 'Отровни тръни', color: '#b04fff', patches: 8 },
    item: { name: 'Семе на светлината', plural: 'Семена', count: 5, color: '#c8ff6a', shape: 'seed' },
    enemies: [
      { name: 'Жив корен', kind: 'chaser', look: 'root', hp: 8, speed: 105, dmg: 1, r: 17, color: '#5a3a22' },
      { name: 'Сенчест вълк', kind: 'charger', look: 'wolf', hp: 9, speed: 140, dmg: 2, r: 18, color: '#141a22' },
      { name: 'Спорова гъба', kind: 'shooter', look: 'spore', hp: 8, speed: 0, dmg: 1, r: 16, color: '#b04fff' },
      { name: 'Горски дух', kind: 'ghost', look: 'ghost', hp: 7, speed: 95, dmg: 1, r: 16, color: '#a6ff5c' },
      { name: 'Древен пън', kind: 'tank', look: 'root', hp: 22, speed: 50, dmg: 2, r: 26, color: '#3a2614' },
    ],
    roomEnemies: 4,
    boss: { name: 'Сърцето на мрака', look: 'heart', hp: 320, r: 62, speed: 40, color: '#ff2a55', patterns: ['spiral', 'burst', 'summon', 'aim', 'roots'], bullet: '#ff4f7a' },
    intro: 'Последното и най-трудно изпитание. Смъртоносната гора.\n\nКорените се движат, сенките имат очи, а тръните са отровни. Събери 5 семена на светлината и стигни до Сърцето на мрака.',
    outro: 'Сърцето на мрака угасна. За първи път от години слънчевите лъчи пробиха през клоните.\n\nГората въздъхна… и запя.',
    notes: [
      { title: 'Издълбано в кората', text: '„Гората не е враг. Тя се бори с мрака в собственото си сърце.“' },
      { title: 'Значка на Организацията', text: 'Значка от първата експедиция. На гърба пише: „Агент 0. Ако четеш това – довърши мисията.“' },
      { title: 'Каменна плоча', text: 'Древни символи, които сякаш светят: „Когато сърцето на мрака угасне, гората отново ще пее. Но вратата ще остане.“' },
    ],
  },
];
