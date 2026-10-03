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
  'Чудовищата не са били зли. Те са били горски създания, покварени от нещо друго.',
  'Но това няма да бъде краят…',
  'Защото историята ще продължи в следващите части на играта.',
];

// Шестте семейства чудовища (спрайтовете са в assets/monsters.webp)
const MONSTERS = {
  gloomy: { name: 'Gloomy', bg: 'Мрачко', hp: 5, speed: 105, dmg: 1, r: 16, color: '#d05cff' },
  glitch: { name: 'Glitchling', bg: 'Гличко', hp: 4, speed: 95, dmg: 1, r: 15, color: '#7dff3a' },
  brute: { name: 'Brute Root', bg: 'Кореняк', hp: 22, speed: 55, dmg: 2, r: 28, color: '#a06a3a' },
  watcher: { name: 'Watcher', bg: 'Наблюдателят', hp: 8, speed: 160, dmg: 1, r: 20, color: '#ff9a2a' },
  screecher: { name: 'Screecher', bg: 'Пискун', hp: 5, speed: 110, dmg: 1, r: 16, color: '#9dff3a' },
  mimic: { name: 'Mimic', bg: 'Мимик', hp: 9, speed: 150, dmg: 1, r: 18, color: '#ff7a2a' },
};

const LEVELS = [
  {
    id: 'factory', name: 'Фабриката за играчки', icon: '🧸',
    pal: { bg: '#120d18', floor: '#3a3045', floor2: '#43374f', wall: '#5b4370', wallTop: '#2a1f35', face: '#4a3560', accent: '#ffb347', detail: '#ff6fa8' },
    dark: 0, hazard: { name: 'Искрящи кабели', color: '#ffe066', patches: 3 },
    item: { name: 'Златно зъбно колело', plural: 'Зъбни колела', count: 3, color: '#ffcc33', shape: 'gear' },
    roster: [['gloomy', 1], ['glitch', 0.8]],
    mimics: 0, roomEnemies: 2, monTint: 'none',
    boss: { id: 'doll', name: 'The Broken Doll', bg: 'Счупената кукла', hp: 80, r: 42, speed: 80, h: 130, color: '#ff5fd8', bullet: '#ff6fe0', patterns: ['swipe', 'grab', 'spin'], tip: 'Пази се от въртенето ѝ — отдалечи се, когато се завърти!' },
    intro: 'Експедицията започва от старата фабрика за играчки. Конвейерите още скърцат, а из цеховете бродят Мрачковци и Гличковци.\n\nНамери 3 златни зъбни колела, за да задвижиш главната порта и да се изправиш срещу Счупената кукла.',
    outro: 'Счупената кукла се разпадна на парчета. Покварените машини на фабриката спряха една по една.\n\nОтвори се авариен изход. Следваща спирка: Складовете.',
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
    roster: [['gloomy', 1], ['glitch', 0.9]],
    mimics: 0, roomEnemies: 3, monTint: 'sepia(0.35) saturate(1.1)',
    boss: { id: 'crane', name: 'Crane Beast', bg: 'Кранозвярът', hp: 120, r: 50, speed: 60, h: 140, color: '#ffb347', bullet: '#ffb347', patterns: ['slam', 'throw', 'cargo'], tip: 'Натисни [E] до контролния панел, за да обездвижиш Кранозвяра!' },
    intro: 'Огромните складове са лабиринт от стелажи и кашони, които сякаш дишат.\n\nСъбери 4 ключа от склада, за да отвориш товарната рампа, където те чака Кранозвярът. Използвай контролните панели в арената!',
    outro: 'Кранозвярът рухна и машините му угаснаха. Отвори се скрита товарна врата.\n\nВътре намираш стар билет за доставка… до Цирка.',
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
    roster: [['gloomy', 1], ['glitch', 1]],
    mimics: 0, roomEnemies: 3, monTint: 'hue-rotate(50deg) saturate(1.3)',
    boss: { id: 'maestro', name: 'Maestro Laugh', bg: 'Маестро Смях', hp: 150, r: 40, speed: 95, h: 150, color: '#ff5f8f', bullet: '#ffd568', patterns: ['cane', 'summon', 'carousel'], tip: 'Във втората фаза светлините угасват — следи прожекторите!' },
    intro: 'Светлините на цирка примигват, а музиката звучи, въпреки че градът е изоставен.\n\nНамери 4 циркови билета, за да влезеш в голямата шатра при Маестро Смях.',
    outro: 'Механичното представление на Маестро Смях спря, а музиката се забави и утихна.\n\nПод арената се отвори таен люк, който води надолу… към Каналите.',
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
    roster: [['gloomy', 1], ['glitch', 0.8], ['brute', 0.3], ['watcher', 0.35], ['screecher', 0.35]],
    mimics: 2, roomEnemies: 3, monTint: 'hue-rotate(-150deg) saturate(0.65) brightness(0.9)',
    boss: { id: 'leviathan', name: 'The Leviathan', bg: 'Левиатан', hp: 190, r: 52, speed: 0, h: 115, color: '#5dff9e', bullet: '#7dff6a', patterns: ['bite', 'tentacle', 'burst'], tip: 'Под водата Левиатанът е неуязвим. Завърти двата вентила [E], за да го извадиш!' },
    intro: 'Подземните канали са тъмни, влажни и пълни с токсична вода. Тук се появяват нови чудовища: Кореняк, Наблюдателят, Пискунът… и нещо, което се прави на сандък.\n\nЗавърти 4 вентила, за да стигнеш до Левиатана.',
    outro: 'Левиатанът се оттегли в дълбините и водата се успокои.\n\nОткри се служебно стълбище, което води нагоре – към Къщата на илюзиите.',
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
    roster: [['gloomy', 0.6], ['glitch', 0.6], ['brute', 0.3], ['watcher', 1], ['screecher', 0.4]],
    mimics: 5, roomEnemies: 3, monTint: 'hue-rotate(25deg) saturate(1.3)',
    boss: { id: 'queen', name: 'The Mirror Queen', bg: 'Огледалната кралица', hp: 230, r: 40, speed: 90, h: 155, color: '#b45cff', bullet: '#d6a8ff', patterns: ['shards', 'reflection', 'roomshift'], tip: 'Само истинската кралица хвърля сянка. Удари нея!' },
    intro: 'Старата къща на илюзиите. Тук нищо не е такова, каквото изглежда: Наблюдателите те дебнат, когато не ги гледаш, а сандъците понякога хапят.\n\nСъбери 5 огледални парчета, за да стигнеш до Огледалната кралица.',
    outro: 'Огледалата спряха да се въртят. За първи път едно от тях показа истината:\n\nгората се е опитвала да защити града. Изходът води право към Смъртоносната гора.',
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
    roster: [['gloomy', 1], ['glitch', 0.8], ['brute', 0.5], ['watcher', 0.5], ['screecher', 0.5]],
    mimics: 3, roomEnemies: 4, monTint: 'hue-rotate(-175deg) saturate(0.5) brightness(1.05)',
    boss: { id: 'heart', name: 'The Heart of the Forest', bg: 'Сърцето на гората', hp: 320, r: 60, speed: 0, h: 165, color: '#c04fff', bullet: '#c04fff', patterns: ['roots', 'seeds', 'storm'], tip: 'Сърцето не е истинският враг…' },
    intro: 'Последното и най-трудно изпитание. Смъртоносната гора.\n\nТук са всички чудовища в най-силната си форма. Събери 5 семена на светлината и стигни до Сърцето на гората.',
    outro: 'Покварата изчезна. Сиянието на Сърцето стана топло, златисто-зелено.\n\nКорените се оттеглиха от града, листата се върнаха и гората започна да се лекува.',
    notes: [
      { title: 'Издълбано в кората', text: '„Гората не е враг. Тя се бори с мрака в собственото си сърце.“' },
      { title: 'Значка на Организацията', text: 'Значка от първата експедиция. На гърба пише: „Агент 0. Ако четеш това – довърши мисията.“' },
      { title: 'Каменна плоча', text: 'Древни символи, които сякаш светят: „Когато сърцето на мрака угасне, гората отново ще пее. Но вратата ще остане.“' },
    ],
  },
];
