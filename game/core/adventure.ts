/**
 * Adventure-map rules: game creation, days, hero movement, map objects,
 * battles on the map, story triggers and win/lose checks.
 */
import { creature, FACTION_LINE, stackLabel } from '../data/creatures';
import { HERO_TEMPLATES } from '../data/heroes';
import { ARTIFACTS, ITEMS, SPELLS } from '../data/magic';
import { getScenario } from '../data/scenarios';
import { TERRAIN_FOR_BATTLE } from './battleTerrain';
import { createBattle, killedHp, survivors, type SideSetup } from './combat';
import {
  addToArmy,
  armyFrom,
  armyIsEmpty,
  armyStacks,
  canAddToArmy,
  emptyArmy,
  gainXp,
  heroMaxMp,
  heroStrength,
  heroVision,
  maxSp,
  skill,
  virtueRank,
  VIRTUE_INFO,
} from './hero';
import { distances, guardingMonster, heroAt, inBounds, objectAt, pathFromDist, reveal, revealAround, stepCost, terrainDef, tileAt, townAt } from './map';
import { chance, shuffle } from './rng';
import type { Action, GameEvent, ScenarioDef } from './scenario';
import { recruitFromDwelling, weeklyGrowth } from './town';
import type { Army, CampaignState, Difficulty, GameState, Hero, HeroCarry, MapObject, PlayerId, Resources, SpellId, Town } from './types';
import { RES_KEYS } from './types';

/** v2: the campaign follows the book (new chapters, creatures and resources); v1 saves are not loaded. */
export const SAVE_V = 2;

export const RES_INFO: Record<keyof Resources, { name: string; icon: string }> = {
  acorns: { name: 'Трохи', icon: '🍞' },
  wood: { name: 'Клонки', icon: '🌲' },
  stone: { name: 'Камъчета', icon: '🪨' },
  cheese: { name: 'Сирене', icon: '🧀' },
};

export const MINE_INFO: Record<keyof Resources, { name: string; perDay: number }> = {
  acorns: { name: 'Изоставеният хамбар', perDay: 400 },
  wood: { name: 'Сечището', perDay: 2 },
  stone: { name: 'Каменоломната', perDay: 2 },
  cheese: { name: 'Мандрата в долината', perDay: 1 },
};

const DIFFICULTY: Record<Difficulty, { aiIncome: number; neutral: number; playerBonus: number }> = {
  easy: { aiIncome: 0.8, neutral: 0.75, playerBonus: 1500 },
  normal: { aiIncome: 1, neutral: 1, playerBonus: 0 },
  hard: { aiIncome: 1.3, neutral: 1.25, playerBonus: -500 },
};

export function newCampaign(difficulty: Difficulty = 'normal'): CampaignState {
  return { completed: [], carry: {}, flags: {}, virtues: { courage: 0, honesty: 0, kindness: 0, wisdom: 0 }, items: [], difficulty };
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

export function createHero(s: GameState, tplId: string, owner: PlayerId, x: number, y: number, carry?: HeroCarry, army?: [string, number][]): Hero {
  const t = HERO_TEMPLATES[tplId];
  const sameId = s.heroes.filter((h) => h.id === tplId || h.id.startsWith(`${tplId}#`)).length;
  const h: Hero = {
    id: sameId ? `${tplId}#${sameId + 1}` : tplId,
    name: t.name,
    title: t.title,
    owner,
    faction: t.faction,
    portrait: t.portrait,
    specialty: t.specialty,
    x,
    y,
    mp: 0,
    level: carry?.level ?? 1,
    xp: carry?.xp ?? 0,
    att: carry?.att ?? t.att,
    def: carry?.def ?? t.def,
    pow: carry?.pow ?? t.pow,
    kno: carry?.kno ?? t.kno,
    sp: 0,
    skills: { ...(carry?.skills ?? t.skills) },
    spells: [...(carry?.spells ?? t.spells)],
    artifacts: [...(carry?.artifacts ?? t.artifacts)],
    army: armyFrom(army ?? t.army),
    alive: true,
    story: ['mishkontin', 'iskritsa', 'mortis'].includes(tplId),
    visited: [],
    pendingLevelUps: [],
    ai: null,
    facing: 1,
  };
  h.mp = heroMaxMp(h);
  h.sp = maxSp(h, s);
  s.heroes.push(h);
  return h;
}

export function carryOf(h: Hero): HeroCarry {
  return {
    level: h.level,
    xp: h.xp,
    att: h.att,
    def: h.def,
    pow: h.pow,
    kno: h.kno,
    skills: { ...h.skills },
    spells: [...h.spells],
    artifacts: [...h.artifacts],
  };
}

export function newGame(scenarioId: string, campaign: CampaignState, seed = Date.now() % 2147483647): GameState {
  const sc = getScenario(scenarioId);
  const h = sc.map.length;
  const w = sc.map[0].length;
  const diff = DIFFICULTY[campaign.difficulty];
  const s: GameState = {
    v: SAVE_V,
    scenario: sc.id,
    day: 1,
    w,
    h,
    terrain: '',
    objects: [],
    heroes: [],
    towns: [],
    players: {
      player: {
        id: 'player', name: 'Горският съюз', human: true, faction: 'forest',
        res: { ...sc.startRes.player, acorns: sc.startRes.player.acorns + diff.playerBonus },
        explored: new Array(w * h).fill(0), heroPool: [...sc.heroPool.player], incomeBonus: 1,
      },
      enemy: {
        id: 'enemy', name: 'Плъховата орда', human: false, faction: 'rats', res: { ...sc.startRes.enemy },
        explored: new Array(w * h).fill(0), heroPool: [...sc.heroPool.enemy], incomeBonus: diff.aiIncome,
      },
    },
    rng: { seed: seed | 0 || 1 },
    flags: { ...campaign.flags },
    virtues: { ...campaign.virtues },
    items: [...campaign.items],
    quests: [],
    firedTriggers: [],
    pendingDialogues: [],
    toasts: [],
    log: [],
    battle: null,
    status: 'play',
    endReason: '',
    campaign: structuredClone(campaign),
    nextId: 1,
    dayBonus: {},
    weekName: sc.weekNames?.[0] ?? '',
    prompt: null,
    turn: 'player',
    vars: {},
  };

  for (const k of Object.keys(sc.legend)) if (k in TERRAIN_CHARS) throw new Error(`Scenario ${sc.id}: legend key '${k}' clashes with a terrain character`);
  const terr: string[] = [];
  const pendingHeroes: { x: number; y: number; hero: NonNullable<ScenarioDef['legend'][string]['hero']> }[] = [];
  for (let y = 0; y < h; y++) {
    const row = sc.map[y];
    if (row.length !== w) throw new Error(`Scenario ${sc.id}: row ${y} has length ${row.length}, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const le = sc.legend[ch];
      if (!le) {
        if (!(ch in TERRAIN_CHARS)) throw new Error(`Scenario ${sc.id}: unknown map char '${ch}' at ${x},${y}`);
        terr.push(ch);
        continue;
      }
      terr.push(le.terrain ?? (le.town ? ':' : '.'));
      if (le.town) {
        const lt = le.town;
        const town: Town = {
          id: lt.id, name: lt.name, faction: lt.faction, owner: lt.owner, x, y, built: [...lt.built], builtToday: false,
          available: {}, garrison: armyFrom(lt.garrison ?? []), spells: [], special: lt.special,
        };
        for (const b of town.built) if (/^d\d$/.test(b)) town.available[FACTION_LINE[lt.faction][Number(b[1]) - 1]] = 0;
        s.towns.push(town);
      }
      if (le.hero) pendingHeroes.push({ x, y, hero: le.hero });
      if (le.obj) {
        const o = { ...structuredClone(le.obj), x, y, id: le.obj.id ?? `o${s.nextId++}` } as MapObject;
        if (o.kind === 'monster') o.n = Math.max(1, Math.round(o.n * (o.guard ? 1 : diff.neutral)));
        s.objects.push(o);
      }
    }
  }
  s.terrain = terr.join('');

  for (const ph of pendingHeroes) {
    const carry = ph.hero.carry ? campaign.carry[ph.hero.tpl] : undefined;
    const army = ph.hero.army ?? (carry ? sc.carryArmies?.[ph.hero.tpl]?.filter(Boolean).map((st) => [st!.cid, st!.n] as [string, number]) : undefined);
    const hero = createHero(s, ph.hero.tpl, ph.hero.owner, ph.x, ph.y, carry, army);
    if (ph.hero.owner === 'enemy') {
      hero.ai = { targetId: null, tx: -1, ty: -1, role: ph.hero.role ?? 'roam', homeTownId: ph.hero.targetTown ?? null, activeFrom: ph.hero.activeFrom ?? 1 };
    }
  }
  // Initial town stock: one week of growth.
  for (const t of s.towns) weeklyGrowth(s, t, true);
  for (const t of s.towns) assignTownSpells(s, t);

  sc.setup?.(s);
  revealAround(s, 'player');
  revealAround(s, 'enemy');
  fireEvent(s, { t: 'start' });
  return s;
}

const TERRAIN_CHARS: Record<string, true> = { '.': true, ',': true, ':': true, '=': true, d: true, h: true, s: true, n: true, T: true, '^': true, '~': true, M: true };

export function assignTownSpells(s: GameState, t: Town): void {
  if (t.spells.length) return;
  const l1 = shuffle(s.rng, ['arrow', 'heal', 'haste', 'shield'] as SpellId[]);
  t.spells = [l1[0], l1[1], 'slow', 'fireflies', 'bless'];
  if (t.special === 'sirengrad') t.spells.push('lightning', l1[2]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function hero(s: GameState, id: string): Hero | undefined {
  return s.heroes.find((h) => h.id === id);
}

export function playerHeroes(s: GameState, pid: PlayerId): Hero[] {
  return s.heroes.filter((h) => h.alive && h.owner === pid);
}

export function playerTowns(s: GameState, pid: PlayerId): Town[] {
  return s.towns.filter((t) => t.owner === pid);
}

export function canAfford(r: Resources, cost: Partial<Resources>): boolean {
  return RES_KEYS.every((k) => (cost[k] ?? 0) <= r[k]);
}

export function pay(r: Resources, cost: Partial<Resources>): void {
  for (const k of RES_KEYS) r[k] -= cost[k] ?? 0;
}

export function gain(r: Resources, add: Partial<Resources>): void {
  for (const k of RES_KEYS) r[k] += add[k] ?? 0;
}

export function costText(cost: Partial<Resources>): string {
  return RES_KEYS.filter((k) => cost[k]).map((k) => `${cost[k]} ${RES_INFO[k].icon}`).join('  ') || 'безплатно';
}

export function toast(s: GameState, text: string, icon?: string): void {
  s.toasts.push({ text, icon });
  s.log.push(text);
  if (s.log.length > 60) s.log.shift();
}

export function dayLabel(day: number): string {
  const month = Math.floor((day - 1) / 28) + 1;
  const week = Math.floor(((day - 1) % 28) / 7) + 1;
  const d = ((day - 1) % 7) + 1;
  return `Месец ${month}, седмица ${week}, ден ${d}`;
}

export function townIncome(t: Town): Partial<Resources> {
  const r: Partial<Resources> = { acorns: t.built.includes('hall2') ? 1000 : t.built.includes('hall') ? 500 : 0 };
  if (t.built.includes('workshop')) {
    r.wood = 1;
    r.stone = 1;
  }
  if (t.built.includes('cheese')) r.cheese = 2;
  return r;
}

export function dailyIncome(s: GameState, pid: PlayerId): Resources {
  const r: Resources = { acorns: 0, wood: 0, stone: 0, cheese: 0 };
  for (const t of playerTowns(s, pid)) gain(r, townIncome(t));
  for (const o of s.objects) if (!o.done && o.kind === 'mine' && o.owner === pid) r[o.res] += MINE_INFO[o.res].perDay;
  for (const h of playerHeroes(s, pid)) {
    r.acorns += [0, 100, 200, 300][skill(h, 'estates')];
    if (h.specialty === 'gatherer') r.acorns += 150;
    if (h.specialty === 'king') r.cheese += 1;
  }
  const bonus = s.players[pid].incomeBonus;
  if (bonus !== 1) for (const k of RES_KEYS) r[k] = Math.round(r[k] * bonus);
  return r;
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

const WEEK_NAMES = ['на мишката', 'на полевката', 'на катерицата', 'на заека', 'на орела', 'на трохите', 'на здравеца', 'на светулката'];

/** Ends the human turn: the caller then runs the AI turn and finally `startNewDay`. */
export function endPlayerTurn(s: GameState): void {
  s.turn = 'enemy';
  for (const h of playerHeroes(s, 'enemy')) h.mp = heroMaxMp(h);
}

export function startNewDay(s: GameState): void {
  s.turn = 'player';
  s.day += 1;
  s.dayBonus = {};
  for (const pid of ['player', 'enemy'] as PlayerId[]) gain(s.players[pid].res, dailyIncome(s, pid));
  for (const h of s.heroes) {
    if (!h.alive) continue;
    h.mp = heroMaxMp(h);
    const inTown = s.towns.some((t) => t.x === h.x && t.y === h.y && t.owner === h.owner);
    h.sp = inTown ? maxSp(h, s) : Math.min(maxSp(h, s), h.sp + 2);
  }
  for (const t of s.towns) t.builtToday = false;
  if ((s.day - 1) % 7 === 0) {
    const sc = getScenario(s.scenario);
    const names = sc.weekNames ?? [];
    const wk = Math.floor((s.day - 1) / 7);
    s.weekName = names[wk] ?? `Седмица ${WEEK_NAMES[wk % WEEK_NAMES.length]}`;
    for (const t of s.towns) weeklyGrowth(s, t, false);
    for (const o of s.objects) if (!o.done && o.kind === 'dwelling') o.available += Math.ceil(creature(o.cid).growth / 2);
    // Neutral monsters grow a little each week.
    for (const o of s.objects) if (!o.done && o.kind === 'monster' && !o.guard) o.n += Math.max(1, Math.round(o.n * 0.08));
    toast(s, `Нова седмица: ${s.weekName}. Съществата в градовете се умножиха!`, '📅');
  }
  fireEvent(s, { t: 'day' });
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export type StepOutcome = 'moved' | 'blocked' | 'battle' | 'stop';

/** Objects that are interacted with from the neighbouring tile (the hero does not step on them). */
function interactsFromAdjacent(s: GameState, o: MapObject): boolean {
  if (o.kind === 'trap') return !!s.flags.traps_seen;
  return ['resource', 'chest', 'artifact', 'monster', 'npc', 'sign', 'questItem', 'gate', 'goal'].includes(o.kind);
}

export function heroCanStep(s: GameState, h: Hero, x: number, y: number): boolean {
  if (!inBounds(s, x, y) || Math.abs(x - h.x) > 1 || Math.abs(y - h.y) > 1 || (x === h.x && y === h.y)) return false;
  if (!terrainDef(tileAt(s, x, y)).passable) return false;
  return h.mp >= stepCost(s, h, x, y, x !== h.x && y !== h.y);
}

/**
 * Moves the hero one tile (or interacts with what is there). Returns 'moved'
 * when the hero can keep walking, anything else when the walk must stop.
 */
export function heroStep(s: GameState, h: Hero, x: number, y: number): StepOutcome {
  if (s.status !== 'play' || s.battle || s.prompt) return 'blocked';
  if (!heroCanStep(s, h, x, y)) return 'blocked';
  const cost = stepCost(s, h, x, y, x !== h.x && y !== h.y);
  if (x !== h.x) h.facing = x > h.x ? 1 : -1;

  const other = heroAt(s, x, y);
  if (other && other.id !== h.id) {
    if (other.owner === h.owner) {
      toast(s, `${h.name} среща ${other.name}.`, '🤝');
      return 'stop';
    }
    h.mp -= cost;
    startHeroBattle(s, h, other);
    return 'battle';
  }

  const o = objectAt(s, x, y);
  if (o && interactsFromAdjacent(s, o)) {
    h.mp = Math.max(0, h.mp - cost);
    return interactAdjacent(s, h, o);
  }

  const t = townAt(s, x, y);
  if (t && t.owner !== h.owner) {
    if (!armyIsEmpty(t.garrison)) {
      h.mp -= cost;
      startTownBattle(s, h, t);
      return 'battle';
    }
    h.mp -= cost;
    moveTo(s, h, x, y);
    captureTown(s, t, h.owner);
    return 'stop';
  }

  h.mp -= cost;
  moveTo(s, h, x, y);
  if (t) return 'stop';
  if (o) {
    interactOn(s, h, o);
    return 'stop';
  }
  fireEvent(s, { t: 'enter', x, y, heroId: h.id });
  if (s.pendingDialogues.length || s.prompt) return 'stop';
  const g = guardingMonster(s, x, y);
  if (g && g.kind === 'monster') {
    monsterEncounter(s, h, g);
    return s.battle ? 'battle' : 'stop';
  }
  return 'moved';
}

function moveTo(s: GameState, h: Hero, x: number, y: number): void {
  h.x = x;
  h.y = y;
  reveal(s, h.owner, x, y, heroVision(h));
}

/** Walks along a path until something stops the hero. Used by the AI and tests. */
export function walkPath(s: GameState, h: Hero, path: { x: number; y: number }[]): StepOutcome {
  let last: StepOutcome = 'blocked';
  for (const p of path) {
    last = heroStep(s, h, p.x, p.y);
    if (last !== 'moved') return last;
  }
  return last;
}

export function pathTo(s: GameState, h: Hero, x: number, y: number, ignoreFog = false) {
  return pathFromDist(s, distances(s, h, { ignoreFog }), x, y);
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

function interactAdjacent(s: GameState, h: Hero, o: MapObject): StepOutcome {
  const human = s.players[h.owner].human;
  switch (o.kind) {
    case 'resource':
      s.players[h.owner].res[o.res] += o.amount;
      o.done = true;
      if (human) toast(s, `+${o.amount} ${RES_INFO[o.res].icon} ${RES_INFO[o.res].name}`, RES_INFO[o.res].icon);
      fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
      return 'stop';
    case 'chest':
      if (human) s.prompt = { kind: 'chest', heroId: h.id, objId: o.id, acorns: o.acorns, xp: o.xp };
      else {
        s.players[h.owner].res.acorns += o.acorns;
        o.done = true;
      }
      return 'stop';
    case 'artifact':
      h.artifacts.push(o.art);
      o.done = true;
      if (human) s.prompt = { kind: 'info', title: ARTIFACTS[o.art].name, text: `Намери: ${ARTIFACTS[o.art].desc}`, icon: ARTIFACTS[o.art].icon };
      fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
      return 'stop';
    case 'questItem':
      if (!human) return 'stop';
      if (!s.items.includes(o.item)) s.items.push(o.item);
      o.done = true;
      if (o.dialogue) s.pendingDialogues.push(o.dialogue);
      else toast(s, `Намери: ${ITEMS[o.item]?.name ?? o.label}`, ITEMS[o.item]?.icon ?? '📜');
      fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
      return 'stop';
    case 'monster':
      monsterEncounter(s, h, o);
      return s.battle ? 'battle' : 'stop';
    case 'npc':
      if (!human) return 'stop';
      s.flags[`seen_${o.id}`] = true;
      if (o.doneFlag && s.flags[o.doneFlag] && o.repeatDialogue) s.pendingDialogues.push(o.repeatDialogue);
      else s.pendingDialogues.push(o.dialogue);
      fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
      return 'stop';
    case 'sign':
      if (human) s.prompt = { kind: 'info', title: 'Табела', text: o.text, icon: '📜' };
      return 'stop';
    case 'gate':
      if (s.flags[o.needFlag]) {
        o.done = true;
        if (human) toast(s, `${o.label} се отваря.`, '🚪');
        return 'stop';
      }
      if (human) s.prompt = { kind: 'info', title: o.label, text: o.lockedText, icon: '🔒' };
      return 'stop';
    case 'trap':
      if (human) s.prompt = { kind: 'info', title: 'Ръждясал капан', text: 'Видя го, докато наблюдаваше каньона. Заобиколи го.', icon: '🪤' };
      return 'stop';
    case 'goal':
      if (!human) return 'stop';
      if (o.needHero && h.id !== o.needHero) {
        s.prompt = { kind: 'info', title: o.label, text: o.needText ?? 'Тук трябва да дойде друг герой.', icon: '⛩️' };
        return 'stop';
      }
      s.flags[o.flag] = true;
      s.pendingDialogues.push(o.dialogue);
      fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
      return 'stop';
    default:
      return 'stop';
  }
}

function interactOn(s: GameState, h: Hero, o: MapObject): void {
  const human = s.players[h.owner].human;
  switch (o.kind) {
    case 'mine':
      if (o.owner !== h.owner) {
        o.owner = h.owner;
        if (human) toast(s, `${MINE_INFO[o.res].name} е твоя: +${MINE_INFO[o.res].perDay} ${RES_INFO[o.res].icon} на ден.`, RES_INFO[o.res].icon);
      }
      break;
    case 'dwelling':
      o.owner = h.owner;
      if (human) {
        if (o.available > 0) s.prompt = { kind: 'dwelling', heroId: h.id, objId: o.id };
      } else {
        const c = creature(o.cid);
        const can = Math.min(o.available, Math.floor(s.players[h.owner].res.acorns / (c.cost.acorns ?? 1)));
        if (can > 0 && canAddToArmy(h.army, o.cid)) {
          addToArmy(h.army, o.cid, can);
          s.players[h.owner].res.acorns -= can * (c.cost.acorns ?? 0);
          o.available -= can;
        }
      }
      break;
    case 'shrine':
      visitShrine(s, h, o);
      break;
    case 'trap':
      if (!human) break;
      o.done = true;
      for (const st of h.army) if (st) st.n = Math.max(1, st.n - Math.ceil(st.n * o.pct));
      h.mp = 0;
      toast(s, `Капан! Ръждясалите зъби щракнаха — ${h.name} губи част от отряда си.`, '🪤');
      break;
    case 'event':
      if (o.onlyHuman && !human) break;
      if (human) {
        s.pendingDialogues.push(o.dialogue);
        o.done = true;
      }
      break;
    default:
      break;
  }
  fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
}

export const SHRINE_INFO: Record<string, { name: string; icon: string }> = {
  att: { name: 'Камъкът на силата', icon: '🗿' },
  def: { name: 'Старият дъб-закрилник', icon: '🌳' },
  pow: { name: 'Кристалният извор', icon: '💎' },
  kno: { name: 'Книжното дърво', icon: '📚' },
  xp: { name: 'Камъкът на знанието', icon: '🗿' },
  spell: { name: 'Олтарът на светулките', icon: '🕯️' },
  mp: { name: 'Конюшнята на зайците', icon: '🐇' },
  sp: { name: 'Вълшебният кладенец', icon: '⛲' },
  reveal: { name: 'Кулата на картографа', icon: '🔭' },
  luckDay: { name: 'Детелиновата поляна', icon: '🍀' },
  moraleDay: { name: 'Огънят на разказвачите', icon: '🔥' },
};

function visitShrine(s: GameState, h: Hero, o: Extract<MapObject, { kind: 'shrine' }>): void {
  const human = s.players[h.owner].human;
  const info = SHRINE_INFO[o.effect];
  const say = (text: string) => {
    if (human) s.prompt = { kind: 'info', title: o.label ?? info.name, text, icon: info.icon };
  };
  const once = ['att', 'def', 'pow', 'kno', 'xp', 'spell', 'reveal'].includes(o.effect);
  if (once && h.visited.includes(o.id)) {
    say('Вече си бил тук. Мястото е тихо и спокойно.');
    return;
  }
  if (once) h.visited.push(o.id);
  switch (o.effect) {
    case 'att':
    case 'def':
    case 'pow':
    case 'kno': {
      h[o.effect] += o.value;
      const nm = { att: 'нападение', def: 'защита', pow: 'сила', kno: 'знание' }[o.effect];
      say(`+${o.value} ${nm} за ${h.name}.`);
      break;
    }
    case 'xp':
      say(`+${gainXp(s, h, o.value)} опит.`);
      break;
    case 'spell':
      if (o.spell && !h.spells.includes(o.spell)) {
        h.spells.push(o.spell);
        say(`${h.name} научава магията „${SPELLS[o.spell].name}“!`);
      } else say('Тук няма нищо ново за научаване.');
      break;
    case 'mp':
      if (s.dayBonus[`${h.id}:mp`]) {
        say('Зайците още почиват. Ела утре.');
        break;
      }
      s.dayBonus[`${h.id}:mp`] = { morale: 0, luck: 0 };
      h.mp += 400;
      say('Зайците показват пряк път: +400 движение днес.');
      break;
    case 'sp':
      h.sp = maxSp(h, s);
      say('Магическата енергия е възстановена.');
      break;
    case 'reveal':
      reveal(s, h.owner, o.x, o.y, o.value || 10);
      say('От върха на кулата се вижда далеч.');
      break;
    case 'luckDay':
    case 'moraleDay': {
      const b = (s.dayBonus[h.id] ??= { morale: 0, luck: 0 });
      if (o.effect === 'luckDay') b.luck = Math.max(b.luck, 1);
      else b.morale = Math.max(b.morale, 1);
      say(o.effect === 'luckDay' ? '+1 късмет до края на деня.' : 'Истории край огъня: +1 морал до края на деня.');
      break;
    }
  }
}

/** Resolves a chest / join / info prompt. */
export function resolvePrompt(s: GameState, choice: number): void {
  const p = s.prompt;
  if (!p) return;
  s.prompt = null;
  if (p.kind === 'chest') {
    const h = hero(s, p.heroId)!;
    const o = s.objects.find((x) => x.id === p.objId)!;
    o.done = true;
    if (choice === 0) {
      s.players[h.owner].res.acorns += p.acorns;
      toast(s, `+${p.acorns} 🍞`, '🍞');
    } else {
      const xp = gainXp(s, h, p.xp);
      toast(s, `+${xp} опит за ${h.name}`, '⭐');
    }
    fireEvent(s, { t: 'visit', objId: o.id, heroId: h.id });
  } else if (p.kind === 'dwelling') {
    const h = hero(s, p.heroId);
    if (h && choice > 0) recruitFromDwelling(s, h, p.objId, choice);
  } else if (p.kind === 'join') {
    const h = hero(s, p.heroId)!;
    const o = s.objects.find((x) => x.id === p.objId);
    if (!o || o.kind !== 'monster') return;
    if (choice === 0 && s.players[h.owner].res.acorns >= p.cost && canAddToArmy(h.army, p.cid)) {
      s.players[h.owner].res.acorns -= p.cost;
      addToArmy(h.army, p.cid, p.n);
      o.done = true;
      toast(s, `${stackLabel(p.cid, p.n)} се присъединяват към ${h.name}!`, '💚');
      fireEvent(s, { t: 'defeatMonster', objId: o.id, heroId: h.id });
    } else if (choice === 1) {
      startMonsterBattle(s, h, o);
    }
    // choice 2: walk away
  }
  checkEnd(s);
}

// ---------------------------------------------------------------------------
// Battles on the map
// ---------------------------------------------------------------------------

function monsterArmy(cid: string, n: number): Army {
  const a = emptyArmy();
  const parts = n >= 30 ? 3 : n >= 8 ? 2 : 1;
  let rest = n;
  for (let i = 0; i < parts; i++) {
    const k = i === parts - 1 ? rest : Math.floor(n / parts);
    a[i] = { cid, n: k };
    rest -= k;
  }
  return a;
}

function monsterEncounter(s: GameState, h: Hero, o: Extract<MapObject, { kind: 'monster' }>): void {
  // Kind heroes may be offered friendship by lonely creatures.
  const human = s.players[h.owner].human;
  const kind = virtueRank(s, 'kindness');
  const monsterStrength = creature(o.cid).value * o.n;
  if (human && o.joinable && !o.guard && kind > 0 && heroStrength(h) > monsterStrength * 1.5 && canAddToArmy(h.army, o.cid)) {
    const pct = kind >= 2 ? 0.5 : 1;
    const cost = Math.round((creature(o.cid).cost.acorns ?? 0) * o.n * pct);
    s.prompt = { kind: 'join', heroId: h.id, objId: o.id, cid: o.cid, n: o.n, cost };
    return;
  }
  startMonsterBattle(s, h, o);
}

function sideOf(s: GameState, h: Hero): SideSetup {
  return {
    owner: h.owner,
    hero: h,
    human: s.players[h.owner].human,
    name: h.name,
    portrait: h.portrait,
    army: h.army,
  };
}

function startMonsterBattle(s: GameState, h: Hero, o: MapObject): void {
  if (o.kind !== 'monster') return;
  const army = monsterArmy(o.cid, o.n);
  const def: SideSetup = { owner: null, hero: null, human: false, name: o.label ?? creature(o.cid).plural, portrait: `creature:${o.cid}`, army };
  s.battle = createBattle(s, 'monster', sideOf(s, h), def, { attackerHeroId: h.id, defenderHeroId: null, monsterObjId: o.id, townId: null }, battleTerrainAt(s, o.x, o.y));
}

function startHeroBattle(s: GameState, a: Hero, d: Hero): void {
  const t = townAt(s, d.x, d.y);
  const def = sideOf(s, d);
  if (t && t.owner === d.owner) {
    applyTownDefense(t, def);
    // The garrison stands on the walls next to the visiting hero.
    if (!armyIsEmpty(t.garrison)) def.extraArmy = t.garrison;
  }
  s.battle = createBattle(s, 'hero', sideOf(s, a), def, { attackerHeroId: a.id, defenderHeroId: d.id, monsterObjId: null, townId: t?.id ?? null }, battleTerrainAt(s, d.x, d.y));
}

function applyTownDefense(t: Town, side: SideSetup): void {
  side.defBonus = (t.built.includes('fort') ? 3 : 0) + (t.built.includes('fort2') ? 2 : 0);
  side.tower = t.built.includes('fort2');
  side.moraleBonus = t.built.includes('cheese') ? 1 : 0;
}

function startTownBattle(s: GameState, a: Hero, t: Town): void {
  const def: SideSetup = { owner: t.owner, hero: null, human: !!t.owner && s.players[t.owner].human, name: `Гарнизонът на ${t.name}`, portrait: `town:${t.faction}`, army: t.garrison };
  applyTownDefense(t, def);
  s.battle = createBattle(s, 'town', sideOf(s, a), def, { attackerHeroId: a.id, defenderHeroId: null, monsterObjId: null, townId: t.id }, 'town');
}

function battleTerrainAt(s: GameState, x: number, y: number): string {
  return TERRAIN_FOR_BATTLE[tileAt(s, x, y)] ?? 'grass';
}

function writeBack(army: Army, surv: Map<number, number>): void {
  for (const [slot, n] of surv) {
    const st = army[slot];
    if (!st) continue;
    if (n <= 0) army[slot] = null;
    else st.n = n;
  }
}

/** Applies the result of the finished battle in `s.battle` to the map. */
export function finishBattle(s: GameState): void {
  const b = s.battle;
  if (!b || !b.over) return;
  s.battle = null;
  const att = hero(s, b.attackerHeroId)!;
  const defHero = b.defenderHeroId ? hero(s, b.defenderHeroId)! : null;
  const town = b.townId ? s.towns.find((t) => t.id === b.townId)! : null;
  const mon = b.monsterObjId ? s.objects.find((o) => o.id === b.monsterObjId)! : null;

  writeBack(att.army, survivors(b, 0));
  const defSurv = survivors(b, 1);
  if (defHero) {
    writeBack(defHero.army, new Map([...defSurv].filter(([slot]) => slot < 5)));
    if (town) writeBack(town.garrison, new Map([...defSurv].filter(([slot]) => slot >= 5).map(([slot, n]) => [slot - 5, n])));
  } else if (town) writeBack(town.garrison, defSurv);
  else if (mon && mon.kind === 'monster') {
    let rest = 0;
    for (const [, n] of survivors(b, 1)) rest += n;
    mon.n = rest;
  }

  const winnerSide = b.winner!;
  s.log.push(`Ден ${s.day}: ${b.sides[0].name} срещу ${b.sides[1].name} — ${b.sides[winnerSide].name} побеждава${b.fled != null ? ' (бягство)' : ''}.`);
  const winHero = winnerSide === 0 ? att : defHero;
  const loseHero = winnerSide === 0 ? defHero : att;
  if (winHero) {
    let xp = killedHp(b, winnerSide);
    if (loseHero) xp += 500;
    const got = gainXp(s, winHero, xp);
    if (s.players[winHero.owner].human) toast(s, `Победа! ${winHero.name} получава ${got} опит.`, '⭐');
  }

  if (loseHero) {
    if (b.fled === (winnerSide === 0 ? 1 : 0)) retreatHero(s, loseHero);
    else defeatHero(s, loseHero, winHero?.owner ?? null);
  }

  if (winnerSide === 0) {
    if (mon && mon.kind === 'monster') {
      mon.done = true;
      if (mon.flag) s.flags[mon.flag] = true;
      if (s.players[att.owner].human && mon.afterDialogue) s.pendingDialogues.push(mon.afterDialogue);
      fireEvent(s, { t: 'defeatMonster', objId: mon.id, heroId: att.id });
    }
    if (town && town.owner !== att.owner && armyIsEmpty(town.garrison) && !(defHero && defHero.alive)) {
      moveTo(s, att, town.x, town.y);
      captureTown(s, town, att.owner);
    }
  }
  checkEnd(s);
}

function retreatHero(s: GameState, h: Hero): void {
  const towns = playerTowns(s, h.owner);
  if (!towns.length) {
    defeatHero(s, h, null);
    return;
  }
  const t = towns.reduce((best, x) => (Math.abs(x.x - h.x) + Math.abs(x.y - h.y) < Math.abs(best.x - h.x) + Math.abs(best.y - h.y) ? x : best));
  const spot = freeSpotNear(s, t.x, t.y, h);
  h.x = spot.x;
  h.y = spot.y;
  h.army = armyFrom([[FACTION_LINE[h.faction === 'rats' ? 'rats' : 'forest'][0], 5]]);
  h.mp = 0;
  toast(s, `${h.name} отстъпи към ${t.name} и събира нов отряд.`, '🏳️');
}

function freeSpotNear(s: GameState, x: number, y: number, h: Hero): { x: number; y: number } {
  if (!heroAt(s, x, y) || heroAt(s, x, y) === h) return { x, y };
  for (let r = 1; r < 4; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inBounds(s, nx, ny) || !terrainDef(tileAt(s, nx, ny)).passable) continue;
        if (heroAt(s, nx, ny) || objectAt(s, nx, ny) || townAt(s, nx, ny)) continue;
        return { x: nx, y: ny };
      }
  return { x, y };
}

function defeatHero(s: GameState, h: Hero, by: PlayerId | null): void {
  h.alive = false;
  h.army = emptyArmy();
  toast(s, `${h.name} е победен!`, '⚔️');
  fireEvent(s, { t: 'defeatHero', heroId: h.id, by: by ?? (h.owner === 'player' ? 'enemy' : 'player') });
}

export function captureTown(s: GameState, t: Town, by: PlayerId): void {
  t.owner = by;
  t.garrison = emptyArmy();
  reveal(s, by, t.x, t.y, 6);
  toast(s, `${t.name} е превзет!`, '🏰');
  fireEvent(s, { t: 'capture', townId: t.id, by });
}

/** For the AI and tests: resolve a battle in which no human takes part instantly. */
export function battleNeedsHuman(s: GameState): boolean {
  return !!s.battle && (s.battle.sides[0].human || s.battle.sides[1].human);
}

// ---------------------------------------------------------------------------
// Story: events, triggers and actions
// ---------------------------------------------------------------------------

export function fireEvent(s: GameState, e: GameEvent): void {
  const sc = getScenario(s.scenario);
  for (const t of sc.triggers) {
    if (!t.repeat && s.firedTriggers.includes(t.id)) continue;
    if (!t.when(s, e)) continue;
    if (!t.repeat) s.firedTriggers.push(t.id);
    applyActions(s, t.actions);
  }
  checkEnd(s);
}

export function applyActions(s: GameState, actions: Action[]): void {
  for (const ac of actions) applyAction(s, ac);
}

function storyHero(s: GameState, id?: string): Hero | undefined {
  const want = id ?? 'mishkontin';
  return s.heroes.find((h) => h.alive && h.id === want) ?? playerHeroes(s, 'player')[0];
}

function applyAction(s: GameState, ac: Action): void {
  switch (ac.a) {
    case 'dialogue':
      s.pendingDialogues.push(ac.id);
      break;
    case 'flag':
      s.flags[ac.flag] = ac.value ?? true;
      break;
    case 'virtue':
      s.virtues[ac.v] = (s.virtues[ac.v] ?? 0) + ac.n;
      toast(s, `${ac.n > 0 ? '+' : ''}${ac.n} ${VIRTUE_INFO[ac.v].name}`, VIRTUE_INFO[ac.v].icon);
      break;
    case 'res':
      gain(s.players[ac.who ?? 'player'].res, ac.res);
      if ((ac.who ?? 'player') === 'player') toast(s, `Получи: ${costText(ac.res)}`, '🎁');
      break;
    case 'item':
      if (!s.items.includes(ac.item)) s.items.push(ac.item);
      toast(s, `Получи: ${ITEMS[ac.item]?.name ?? ac.item}`, ITEMS[ac.item]?.icon ?? '📜');
      break;
    case 'artifact': {
      const h = storyHero(s, ac.hero);
      if (h) {
        h.artifacts.push(ac.art);
        toast(s, `${h.name} получи: ${ARTIFACTS[ac.art].name}`, ARTIFACTS[ac.art].icon);
      }
      break;
    }
    case 'troops': {
      const h = storyHero(s, ac.hero);
      if (h) {
        if (!addToArmy(h.army, ac.cid, ac.n)) {
          const t = playerTowns(s, 'player')[0];
          if (t) addToArmy(t.garrison, ac.cid, ac.n);
        }
        toast(s, `${stackLabel(ac.cid, ac.n)} се присъединяват!`, creature(ac.cid).icon);
      }
      break;
    }
    case 'quest':
      if (!s.quests.some((q) => q.id === ac.id)) {
        s.quests.push({ id: ac.id, title: ac.title, text: ac.text, done: false });
        toast(s, `Нова задача: ${ac.title}`, '📌');
      }
      break;
    case 'questDone': {
      const q = s.quests.find((x) => x.id === ac.id);
      if (q && !q.done) {
        q.done = true;
        toast(s, `Изпълнена задача: ${q.title}`, '✅');
      }
      break;
    }
    case 'reveal':
      reveal(s, 'player', ac.x, ac.y, ac.r);
      break;
    case 'spawnHero': {
      const spot = freeSpotNear(s, ac.x, ac.y, null as unknown as Hero);
      const h = createHero(s, ac.tpl, ac.owner, spot.x, spot.y, undefined, ac.army);
      if (ac.owner === 'enemy') {
        h.ai = { targetId: null, tx: -1, ty: -1, role: ac.role ?? 'raider', homeTownId: ac.targetTown ?? null, activeFrom: ac.activeFrom ?? s.day };
        if (s.turn === 'enemy') h.mp = heroMaxMp(h);
      } else {
        reveal(s, 'player', h.x, h.y, 6);
      }
      break;
    }
    case 'removeObj': {
      const o = s.objects.find((x) => x.id === ac.id);
      if (o) o.done = true;
      break;
    }
    case 'addObj':
      if (!s.objects.some((o) => o.id === ac.obj.id)) s.objects.push(structuredClone(ac.obj));
      break;
    case 'xp': {
      const h = storyHero(s, ac.hero);
      if (h) toast(s, `+${gainXp(s, h, ac.n)} опит за ${h.name}`, '⭐');
      break;
    }
    case 'spell': {
      const h = storyHero(s, ac.hero);
      if (h && !h.spells.includes(ac.spell)) {
        h.spells.push(ac.spell);
        toast(s, `${h.name} научи „${SPELLS[ac.spell].name}“`, SPELLS[ac.spell].icon);
      }
      break;
    }
    case 'win':
      endScenario(s, 'won', '');
      break;
    case 'lose':
      endScenario(s, 'lost', ac.reason);
      break;
    case 'toast':
      toast(s, ac.text, ac.icon);
      break;
    case 'call':
      ac.fn(s);
      break;
  }
}

/** Applies a dialogue choice (or closes a dialogue without choices). */
export function closeDialogue(s: GameState, id: string, choiceIndex: number | null): void {
  const sc = getScenario(s.scenario);
  const d = sc.dialogues[id];
  const qi = s.pendingDialogues.indexOf(id);
  if (qi >= 0) s.pendingDialogues.splice(qi, 1);
  if (!d) return;
  if (d.choices && d.choices.length) {
    const visible = availableChoices(s, id);
    const c = visible[choiceIndex ?? 0];
    if (c && (!c.requires || c.requires(s))) applyActions(s, c.actions);
  } else if (d.after) applyActions(s, d.after);
  fireEvent(s, { t: 'dialogueEnd', id });
}

export function availableChoices(s: GameState, id: string) {
  const d = getScenario(s.scenario).dialogues[id];
  return (d?.choices ?? []).filter((c) => !c.requires || c.requires(s) || c.lockedHint);
}

export function endScenario(s: GameState, status: 'won' | 'lost', reason: string): void {
  if (s.status !== 'play') return;
  s.status = status;
  s.endReason = reason;
  if (status === 'won') {
    const sc = getScenario(s.scenario);
    s.pendingDialogues.push(sc.victoryDialogue(s));
  }
}

export function checkEnd(s: GameState): void {
  if (s.status !== 'play') return;
  const sc = getScenario(s.scenario);
  const r = sc.checkEnd(s);
  if (r) {
    endScenario(s, r.status, r.reason);
    return;
  }
  const mish = s.heroes.find((h) => h.id === 'mishkontin');
  if (mish && !mish.alive) {
    endScenario(s, 'lost', 'Мишконтин падна в битка и плъховете го отведоха в Тъмните тунели.');
    return;
  }
  if (playerHeroes(s, 'player').length === 0 && playerTowns(s, 'player').length === 0) endScenario(s, 'lost', 'Горският съюз загуби всички свои герои и градове.');
}

/** Campaign state to carry into the next scenario after a victory. */
export function campaignAfterVictory(s: GameState): CampaignState {
  const c = structuredClone(s.campaign);
  if (!c.completed.includes(s.scenario)) c.completed.push(s.scenario);
  c.flags = { ...s.flags };
  c.virtues = { ...s.virtues };
  c.items = [...s.items];
  for (const h of s.heroes) if (h.owner === 'player' && h.alive && h.story) c.carry[h.id] = carryOf(h);
  return c;
}

/** True when this hero could reach the tile today (for the UI path preview). */
export function mpAfter(h: Hero, cost: number): number {
  return h.mp - cost;
}

export function anyResource(r: Resources): boolean {
  return RES_KEYS.some((k) => r[k] > 0);
}

export function armySummary(army: Army): string {
  return armyStacks(army).map((st) => stackLabel(st.cid, st.n)).join(', ');
}

export function randomChance(s: GameState, p: number): boolean {
  return chance(s.rng, p);
}
