/**
 * Turn-based tactical combat on a hex grid (HoMM3-like, simplified).
 *
 * Grid: COLS x ROWS hexes in "odd-r" offset layout (odd rows are shifted half a
 * hex to the right). Every function here is pure game logic; the UI only reads
 * the battle and calls the action functions.
 */
import { ABILITY_TEXT, creature, hasAbility, stackLabel } from '../data/creatures';
import { SPELLS } from '../data/magic';
import { heroAtt, heroDef, heroLuck, heroMorale, heroPow, heroSpeedBonus, skill } from './hero';
import { chance, nextFloat, randInt } from './rng';
import type { Army, GameState, Hero, Owner, SpellId } from './types';

export const COLS = 12;
export const ROWS = 9;

export type EffectId = 'haste' | 'shield' | 'slow' | 'bless' | 'web';

export interface BUnit {
  uid: number;
  side: 0 | 1;
  cid: string;
  n: number;
  startN: number;
  hpTop: number;
  shots: number;
  q: number;
  r: number;
  retaliated: number;
  defending: boolean;
  waited: boolean;
  effects: { id: EffectId; rounds: number }[];
  /** Index into the owning army (-1 for summoned/tower units). */
  slot: number;
}

export interface BattleSide {
  owner: Owner;
  heroId: string | null;
  human: boolean;
  name: string;
  portrait: string;
  castThisRound: boolean;
  /** Extra defence from town walls etc. */
  defBonus: number;
  moraleBonus: number;
}

export type BattleEvent =
  | { t: 'move'; uid: number; from: number; path: number[] }
  | { t: 'hit'; uid: number; target: number; dmg: number; killed: number; ranged: boolean; lucky: boolean; retaliation: boolean }
  | { t: 'spell'; spell: SpellId; side: 0 | 1; targets: number[]; dmg: number }
  | { t: 'morale'; uid: number; good: boolean }
  | { t: 'text'; text: string };

export interface Battle {
  kind: 'monster' | 'hero' | 'town';
  attackerHeroId: string;
  defenderHeroId: string | null;
  monsterObjId: string | null;
  townId: string | null;
  sides: [BattleSide, BattleSide];
  units: BUnit[];
  obstacles: number[];
  round: number;
  queue: number[];
  waitQueue: number[];
  active: number | null;
  log: string[];
  over: boolean;
  winner: 0 | 1 | null;
  fled: 0 | 1 | null;
  terrain: string;
  events: BattleEvent[];
  /** Whether the active unit already got its bonus morale turn this round. */
  moraleUsed: number[];
  nextUid: number;
}

// ---------------------------------------------------------------------------
// Hex geometry
// ---------------------------------------------------------------------------

export function hexIndex(q: number, r: number): number {
  return r * COLS + q;
}
export function hexQ(i: number): number {
  return i % COLS;
}
export function hexR(i: number): number {
  return Math.floor(i / COLS);
}
export function hexInside(q: number, r: number): boolean {
  return q >= 0 && r >= 0 && q < COLS && r < ROWS;
}

const EVEN_N = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
const ODD_N = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];

export function hexNeighbors(q: number, r: number): [number, number][] {
  const d = r & 1 ? ODD_N : EVEN_N;
  const out: [number, number][] = [];
  for (const [dq, dr] of d) {
    const nq = q + dq;
    const nr = r + dr;
    if (hexInside(nq, nr)) out.push([nq, nr]);
  }
  return out;
}

function toCube(q: number, r: number): [number, number, number] {
  const x = q - (r - (r & 1)) / 2;
  const z = r;
  return [x, -x - z, z];
}

export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const a = toCube(q1, r1);
  const b = toCube(q2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const ROW_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [1, 4, 7],
  4: [0, 3, 5, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export interface SideSetup {
  owner: Owner;
  hero: Hero | null;
  human: boolean;
  name: string;
  portrait: string;
  /** Army slots (kept index-aligned so casualties can be written back). */
  army: Army;
  /** A town garrison fighting next to a defending hero (slots 5..9). */
  extraArmy?: Army;
  defBonus?: number;
  moraleBonus?: number;
  tower?: boolean;
}

export function createBattle(
  s: GameState,
  kind: Battle['kind'],
  att: SideSetup,
  def: SideSetup,
  ids: { attackerHeroId: string; defenderHeroId: string | null; monsterObjId: string | null; townId: string | null },
  terrain: string,
): Battle {
  const b: Battle = {
    kind,
    ...ids,
    sides: [mkSide(att), mkSide(def)],
    units: [],
    obstacles: [],
    round: 0,
    queue: [],
    waitQueue: [],
    active: null,
    log: [],
    over: false,
    winner: null,
    fled: null,
    terrain,
    events: [],
    moraleUsed: [],
    nextUid: 1,
  };
  placeArmy(b, 0, att.army, 0, 0);
  placeArmy(b, 1, def.army, 0, 0);
  if (def.extraArmy) placeArmy(b, 1, def.extraArmy, 5, 1);
  if (def.tower) {
    const spot = [3, 5, 1, 7].map((r) => [COLS - 1, r]).concat([3, 5, 1, 7].map((r) => [COLS - 2, r])).find(([q, r]) => !unitAt(b, q, r));
    if (spot) b.units.push(mkUnit(b, 1, 'tower', 1, spot[0], spot[1], -1));
  }
  // A few obstacles in the middle of the field.
  const count = randInt(s.rng, 2, 5);
  let guard = 0;
  while (b.obstacles.length < count && guard++ < 100) {
    const q = randInt(s.rng, 3, COLS - 4);
    const r = randInt(s.rng, 0, ROWS - 1);
    const i = hexIndex(q, r);
    if (!b.obstacles.includes(i) && !unitAt(b, q, r)) b.obstacles.push(i);
  }
  startRound(s, b);
  return b;
}

function mkSide(su: SideSetup): BattleSide {
  return {
    owner: su.owner,
    heroId: su.hero?.id ?? null,
    human: su.human,
    name: su.name,
    portrait: su.portrait,
    castThisRound: false,
    defBonus: su.defBonus ?? 0,
    moraleBonus: su.moraleBonus ?? 0,
  };
}

function mkUnit(b: Battle, side: 0 | 1, cid: string, n: number, q: number, r: number, slot: number): BUnit {
  const c = creature(cid);
  return {
    uid: b.nextUid++,
    side,
    cid,
    n,
    startN: n,
    hpTop: c.hp,
    shots: c.shots ?? 0,
    q,
    r,
    retaliated: 0,
    defending: false,
    waited: false,
    effects: [],
    slot,
  };
}

function placeArmy(b: Battle, side: 0 | 1, army: Army, slotOffset: number, column: number): void {
  const slots: number[] = [];
  army.forEach((st, i) => {
    if (st && st.n > 0) slots.push(i);
  });
  const rows = ROW_LAYOUT[Math.min(6, slots.length)] ?? ROW_LAYOUT[5];
  slots.forEach((slot, k) => {
    const st = army[slot]!;
    const r = rows[k % rows.length];
    const q = side === 0 ? column : COLS - 1 - column;
    b.units.push(mkUnit(b, side, st.cid, st.n, q, r, slot + slotOffset));
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function unitAt(b: Battle, q: number, r: number): BUnit | undefined {
  return b.units.find((u) => u.n > 0 && u.q === q && u.r === r);
}

export function unitById(b: Battle, uid: number): BUnit | undefined {
  return b.units.find((u) => u.uid === uid);
}

export function activeUnit(b: Battle): BUnit | null {
  return b.active == null ? null : unitById(b, b.active) ?? null;
}

export function alive(b: Battle, side: 0 | 1): BUnit[] {
  return b.units.filter((u) => u.side === side && u.n > 0);
}

function sideHero(s: GameState, b: Battle, side: 0 | 1): Hero | null {
  const id = b.sides[side].heroId;
  return id ? s.heroes.find((h) => h.id === id) ?? null : null;
}

export function battleHero(s: GameState, b: Battle, side: 0 | 1): Hero | null {
  return sideHero(s, b, side);
}

function hasEffect(u: BUnit, id: EffectId): boolean {
  return u.effects.some((e) => e.id === id);
}

export function unitSpeed(s: GameState, b: Battle, u: BUnit): number {
  const c = creature(u.cid);
  let spd = c.spd;
  const h = sideHero(s, b, u.side);
  if (h) {
    spd += heroSpeedBonus(h);
  }
  if (hasEffect(u, 'haste')) spd += 3;
  if (hasEffect(u, 'slow')) spd = Math.floor(spd / 2);
  if (hasEffect(u, 'web')) spd = Math.floor(spd / 2);
  return Math.max(1, spd);
}

function specialtyBonus(h: Hero | null, cid: string): { att: number; def: number } {
  if (!h) return { att: 0, def: 0 };
  const faction = creature(cid).faction;
  const none = { att: 0, def: 0 };
  switch (h.specialty) {
    case 'brave':
      return cid === 'mouse' ? { att: 1, def: 1 } : none;
    case 'pathfinder':
      return cid === 'squirrel' ? { att: 2, def: 0 } : none;
    case 'gatherer':
      return cid === 'squirrel' ? { att: 1, def: 1 } : none;
    case 'captain':
      if (cid === 'veteran') return { att: 3, def: 1 };
      return faction === 'rats' ? { att: 1, def: 1 } : none;
    case 'patrol':
      return cid === 'rat' ? { att: 2, def: 1 } : none;
    case 'king':
      if (cid === 'guard') return { att: 1, def: 3 };
      return faction === 'rats' ? { att: 1, def: 1 } : none;
    default:
      return none;
  }
}

export function unitAttack(s: GameState, b: Battle, u: BUnit): number {
  const h = sideHero(s, b, u.side);
  return creature(u.cid).att + (h ? heroAtt(h) : 0) + specialtyBonus(h, u.cid).att;
}

export function unitDefense(s: GameState, b: Battle, u: BUnit): number {
  const h = sideHero(s, b, u.side);
  let d = creature(u.cid).def + (h ? heroDef(h) : 0) + specialtyBonus(h, u.cid).def + b.sides[u.side].defBonus;
  if (hasEffect(u, 'shield')) d += 5;
  if (u.defending) d += Math.max(1, Math.round(d * 0.2));
  return d;
}

export function unitMorale(s: GameState, b: Battle, u: BUnit): number {
  if (hasAbility(u.cid, 'fearless')) return 0;
  const h = sideHero(s, b, u.side);
  let m = (h ? heroMorale(h, s) : 0) + b.sides[u.side].moraleBonus;
  if (hasEffect(u, 'bless')) m += 1;
  if (h) {
    // Mixed armies: creatures from a foreign faction lower morale.
    const factions = new Set<string>(alive(b, u.side).map((x) => creature(x.cid).faction).filter((f) => f !== 'neutral'));
    factions.delete(h.faction);
    if (factions.size > 0) m -= 1;
  }
  return Math.max(-3, Math.min(3, m));
}

function totalHp(u: BUnit): number {
  const hp = creature(u.cid).hp;
  return u.n > 0 ? (u.n - 1) * hp + u.hpTop : 0;
}

function setTotalHp(u: BUnit, total: number): void {
  const hp = creature(u.cid).hp;
  if (total <= 0) {
    u.n = 0;
    u.hpTop = 0;
    return;
  }
  u.n = Math.ceil(total / hp);
  u.hpTop = total - (u.n - 1) * hp;
}

function enemyAdjacent(b: Battle, u: BUnit): boolean {
  return hexNeighbors(u.q, u.r).some(([q, r]) => {
    const o = unitAt(b, q, r);
    return !!o && o.side !== u.side;
  });
}

export function canShoot(b: Battle, u: BUnit): boolean {
  return hasAbility(u.cid, 'ranged') && u.shots > 0 && !enemyAdjacent(b, u);
}

function blocked(b: Battle, q: number, r: number, self: BUnit | null): boolean {
  if (b.obstacles.includes(hexIndex(q, r))) return true;
  const o = unitAt(b, q, r);
  return !!o && o !== self;
}

/** Map hex index -> path (list of hex indices) for every hex the unit can move to this turn. */
export function reachable(s: GameState, b: Battle, u: BUnit): Map<number, number[]> {
  const out = new Map<number, number[]>();
  if (hasAbility(u.cid, 'immobile')) return out;
  const spd = unitSpeed(s, b, u);
  if (hasAbility(u.cid, 'flyer')) {
    for (let r = 0; r < ROWS; r++)
      for (let q = 0; q < COLS; q++) {
        if (blocked(b, q, r, u)) continue;
        if (hexDistance(u.q, u.r, q, r) <= spd && !(q === u.q && r === u.r)) out.set(hexIndex(q, r), [hexIndex(q, r)]);
      }
    return out;
  }
  const start = hexIndex(u.q, u.r);
  const prev = new Map<number, number>();
  const dist = new Map<number, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    const d = dist.get(cur)!;
    if (d >= spd) continue;
    for (const [nq, nr] of hexNeighbors(hexQ(cur), hexR(cur))) {
      const ni = hexIndex(nq, nr);
      if (dist.has(ni) || blocked(b, nq, nr, u)) continue;
      dist.set(ni, d + 1);
      prev.set(ni, cur);
      queue.push(ni);
    }
  }
  for (const [i] of dist) {
    if (i === start) continue;
    const path: number[] = [];
    let c: number | undefined = i;
    while (c !== undefined && c !== start) {
      path.unshift(c);
      c = prev.get(c);
    }
    out.set(i, path);
  }
  return out;
}

/** Hexes from which `u` could melee `target` this turn (including where it stands). */
export function attackHexes(s: GameState, b: Battle, u: BUnit, target: BUnit, reach?: Map<number, number[]>): number[] {
  const r = reach ?? reachable(s, b, u);
  const out: number[] = [];
  for (const [q, rr] of hexNeighbors(target.q, target.r)) {
    const i = hexIndex(q, rr);
    if (q === u.q && rr === u.r) out.push(i);
    else if (r.has(i)) out.push(i);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Damage
// ---------------------------------------------------------------------------

export interface DamageOpts {
  ranged: boolean;
  /** Hexes moved before the attack (charge). */
  moved: number;
  /** Deterministic estimate: use average roll, no luck. */
  estimate?: 'min' | 'max' | 'avg';
}

export function computeDamage(s: GameState, b: Battle, a: BUnit, t: BUnit, o: DamageOpts): { dmg: number; lucky: boolean } {
  const c = creature(a.cid);
  let base: number;
  if (o.estimate === 'min') base = c.dmin * a.n;
  else if (o.estimate === 'max' || hasEffect(a, 'bless')) base = c.dmax * a.n;
  else if (o.estimate === 'avg') base = ((c.dmin + c.dmax) / 2) * a.n;
  else {
    const rolls = Math.min(a.n, 10);
    let sum = 0;
    for (let i = 0; i < rolls; i++) sum += randInt(s.rng, c.dmin, c.dmax);
    base = (sum * a.n) / rolls;
  }
  const A = unitAttack(s, b, a);
  const D = unitDefense(s, b, t);
  let mult = A >= D ? 1 + Math.min(3, 0.05 * (A - D)) : 1 - Math.min(0.7, 0.025 * (D - A));
  const ah = sideHero(s, b, a.side);
  const th = sideHero(s, b, t.side);
  if (ah) mult *= 1 + (o.ranged ? [0, 0.1, 0.25, 0.5][skill(ah, 'archery')] : [0, 0.1, 0.2, 0.3][skill(ah, 'offense')]);
  if (th) mult *= 1 - [0, 0.05, 0.1, 0.15][skill(th, 'armor')];
  if (o.ranged && hasAbility(t.cid, 'shielded')) mult *= 0.5;
  if (o.ranged && hexDistance(a.q, a.r, t.q, t.r) > 6) mult *= 0.5;
  if (!o.ranged && hasAbility(a.cid, 'ranged')) mult *= 0.5;
  if (!o.ranged && hasAbility(a.cid, 'charge')) mult *= 1 + 0.05 * o.moved;
  let lucky = false;
  if (!o.estimate) {
    const luck = ah ? heroLuck(ah, s) : 0;
    if (luck > 0 && chance(s.rng, luck * 0.1)) {
      mult *= 2;
      lucky = true;
    }
  }
  return { dmg: Math.max(1, Math.round(base * mult)), lucky };
}

/** Expected creatures killed for a hit of `dmg` hp. */
export function killsFor(t: BUnit, dmg: number): number {
  const hp = creature(t.cid).hp;
  const total = totalHp(t);
  if (dmg >= total) return t.n;
  const rest = total - dmg;
  return t.n - Math.ceil(rest / hp);
}

function applyDamage(t: BUnit, dmg: number): number {
  const before = t.n;
  setTotalHp(t, totalHp(t) - dmg);
  return before - t.n;
}

// ---------------------------------------------------------------------------
// Rounds and turn order
// ---------------------------------------------------------------------------

function startRound(s: GameState, b: Battle): void {
  b.round += 1;
  for (const u of b.units) {
    u.retaliated = 0;
    u.waited = false;
  }
  b.sides[0].castThisRound = false;
  b.sides[1].castThisRound = false;
  b.moraleUsed = [];
  const order = b.units
    .filter((u) => u.n > 0)
    .sort((x, y) => unitSpeed(s, b, y) - unitSpeed(s, b, x) || x.side - y.side || x.uid - y.uid);
  b.queue = order.map((u) => u.uid);
  b.waitQueue = [];
  b.log.push(`— Рунд ${b.round} —`);
  advance(s, b);
}

function endRoundEffects(b: Battle): void {
  for (const u of b.units) {
    for (const e of u.effects) e.rounds -= 1;
    u.effects = u.effects.filter((e) => e.rounds > 0);
  }
}

/** Picks the next active unit, applying negative morale; starts new rounds as needed. */
function advance(s: GameState, b: Battle): void {
  checkEnd(b);
  if (b.over) {
    b.active = null;
    return;
  }
  for (;;) {
    let next = b.queue.shift();
    if (next === undefined) next = b.waitQueue.shift();
    if (next === undefined) {
      endRoundEffects(b);
      startRound(s, b);
      return;
    }
    const u = unitById(b, next);
    if (!u || u.n <= 0) continue;
    u.defending = false;
    const m = unitMorale(s, b, u);
    if (m < 0 && chance(s.rng, -m * 0.08)) {
      b.events.push({ t: 'morale', uid: u.uid, good: false });
      b.log.push(`${stackLabel(u.cid, u.n)} се уплашиха и пропускат хода.`);
      continue;
    }
    b.active = u.uid;
    return;
  }
}

function afterAction(s: GameState, b: Battle, u: BUnit): void {
  checkEnd(b);
  if (b.over) {
    b.active = null;
    return;
  }
  if (u.n > 0 && !b.moraleUsed.includes(u.uid)) {
    const m = unitMorale(s, b, u);
    if (m > 0 && chance(s.rng, m * 0.08)) {
      b.moraleUsed.push(u.uid);
      b.events.push({ t: 'morale', uid: u.uid, good: true });
      b.log.push(`Висок морал! ${stackLabel(u.cid, u.n)} действат отново.`);
      b.active = u.uid;
      return;
    }
  }
  advance(s, b);
}

function checkEnd(b: Battle): void {
  if (b.over) return;
  const a0 = alive(b, 0).filter((u) => !hasAbility(u.cid, 'immobile')).length;
  const a1 = alive(b, 1).filter((u) => !hasAbility(u.cid, 'immobile')).length;
  if (a0 === 0 || a1 === 0) {
    b.over = true;
    b.winner = a1 === 0 ? 0 : 1;
    b.log.push(b.winner === 0 ? `${b.sides[0].name} печели битката!` : `${b.sides[1].name} печели битката!`);
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function strike(s: GameState, b: Battle, a: BUnit, t: BUnit, ranged: boolean, moved: number, retaliation: boolean): void {
  const { dmg, lucky } = computeDamage(s, b, a, t, { ranged, moved });
  const killed = applyDamage(t, dmg);
  b.events.push({ t: 'hit', uid: a.uid, target: t.uid, dmg, killed, ranged, lucky, retaliation });
  const who = stackLabel(a.cid, a.n);
  b.log.push(
    `${lucky ? 'Късмет! ' : ''}${who} ${retaliation ? 'отвръщат' : ranged ? 'стрелят' : 'нападат'}: ${dmg} щети, ` +
      (killed > 0 ? `падат ${killed} ${killed === 1 ? creature(t.cid).name : creature(t.cid).plural}.` : 'никой не пада.'),
  );
  if (!ranged && hasAbility(t.cid, 'thorns') && a.n > 0) {
    const back = Math.max(1, Math.round(dmg * 0.25));
    const k = applyDamage(a, back);
    b.log.push(`Бодли! ${back} щети обратно${k ? `, падат ${k}` : ''}.`);
  }
  if (hasAbility(a.cid, 'web') && t.n > 0 && !hasEffect(t, 'web')) {
    t.effects.push({ id: 'web', rounds: 2 });
    b.log.push(`${creature(t.cid).plural} са оплетени в паяжина.`);
  }
}

function canRetaliate(t: BUnit): boolean {
  if (t.n <= 0) return false;
  if (hasAbility(t.cid, 'immobile')) return false;
  return hasAbility(t.cid, 'unlimitedRetaliation') || t.retaliated === 0;
}

function meleeExchange(s: GameState, b: Battle, a: BUnit, t: BUnit, moved: number): void {
  const strikes = hasAbility(a.cid, 'doubleStrike') ? 2 : 1;
  for (let i = 0; i < strikes; i++) {
    if (a.n <= 0 || t.n <= 0) break;
    strike(s, b, a, t, false, i === 0 ? moved : 0, false);
    if (!hasAbility(a.cid, 'noRetaliation') && canRetaliate(t) && a.n > 0) {
      t.retaliated += 1;
      strike(s, b, t, a, false, 0, true);
    }
  }
}

export function canAct(b: Battle, side: 0 | 1): boolean {
  const u = activeUnit(b);
  return !b.over && !!u && u.side === side;
}

export function actMove(s: GameState, b: Battle, hex: number): boolean {
  const u = activeUnit(b);
  if (!u) return false;
  const reach = reachable(s, b, u);
  const path = reach.get(hex);
  if (!path) return false;
  const from = hexIndex(u.q, u.r);
  u.q = hexQ(hex);
  u.r = hexR(hex);
  b.events.push({ t: 'move', uid: u.uid, from, path });
  afterAction(s, b, u);
  return true;
}

export function actMelee(s: GameState, b: Battle, targetUid: number, fromHex: number): boolean {
  const u = activeUnit(b);
  const t = unitById(b, targetUid);
  if (!u || !t || t.side === u.side || t.n <= 0) return false;
  const from = attackHexes(s, b, u, t);
  if (!from.includes(fromHex)) return false;
  let moved = 0;
  if (fromHex !== hexIndex(u.q, u.r)) {
    const path = reachable(s, b, u).get(fromHex)!;
    moved = path.length;
    const start = hexIndex(u.q, u.r);
    u.q = hexQ(fromHex);
    u.r = hexR(fromHex);
    b.events.push({ t: 'move', uid: u.uid, from: start, path });
  }
  meleeExchange(s, b, u, t, moved);
  afterAction(s, b, u);
  return true;
}

export function actShoot(s: GameState, b: Battle, targetUid: number): boolean {
  const u = activeUnit(b);
  const t = unitById(b, targetUid);
  if (!u || !t || t.side === u.side || t.n <= 0 || !canShoot(b, u)) return false;
  u.shots -= 1;
  strike(s, b, u, t, true, 0, false);
  if (hasAbility(u.cid, 'doubleStrike') && t.n > 0 && u.shots > 0) {
    u.shots -= 1;
    strike(s, b, u, t, true, 0, false);
  }
  afterAction(s, b, u);
  return true;
}

export function actWait(s: GameState, b: Battle): boolean {
  const u = activeUnit(b);
  if (!u || u.waited) return false;
  u.waited = true;
  b.waitQueue.push(u.uid);
  b.log.push(`${stackLabel(u.cid, u.n)} изчакват.`);
  advance(s, b);
  return true;
}

export function actDefend(s: GameState, b: Battle): boolean {
  const u = activeUnit(b);
  if (!u) return false;
  u.defending = true;
  b.log.push(`${stackLabel(u.cid, u.n)} се отбраняват.`);
  advance(s, b);
  u.defending = true;
  return true;
}

export function canFlee(b: Battle, side: 0 | 1): boolean {
  return !b.over && !!b.sides[side].heroId;
}

export function actFlee(b: Battle, side: 0 | 1): void {
  b.over = true;
  b.fled = side;
  b.winner = side === 0 ? 1 : 0;
  b.active = null;
  b.log.push(`${b.sides[side].name} отстъпва!`);
}

// ---------------------------------------------------------------------------
// Spells
// ---------------------------------------------------------------------------

export function spellPowerMult(h: Hero, _spell: SpellId): number {
  let m = 1 + [0, 0.15, 0.3, 0.5][skill(h, 'sorcery')];
  return m;
}

export function spellDamage(h: Hero, spell: SpellId): number {
  const p = heroPow(h);
  const base = spell === 'arrow' ? 10 + 10 * p : spell === 'lightning' ? 25 + 20 * p : spell === 'fireflies' ? 12 + 8 * p : 0;
  return Math.round(base * spellPowerMult(h, spell));
}

export function canCast(s: GameState, b: Battle, side: 0 | 1, spell: SpellId): boolean {
  const h = sideHero(s, b, side);
  if (!h || b.over || b.sides[side].castThisRound || !h.spells.includes(spell)) return false;
  const def = SPELLS[spell];
  if (def.target === 'adventure') return false;
  return h.sp >= def.cost;
}

export function validSpellTarget(b: Battle, side: 0 | 1, spell: SpellId, hex: number): boolean {
  const def = SPELLS[spell];
  const u = unitAt(b, hexQ(hex), hexR(hex));
  if (def.target === 'area') return true;
  if (!u || hasAbility(u.cid, 'immobile')) return false;
  if (def.target === 'enemy') return u.side !== side;
  if (spell === 'heal') return u.side === side;
  return u.side === side;
}

export function castSpell(s: GameState, b: Battle, side: 0 | 1, spell: SpellId, hex: number): boolean {
  if (!canCast(s, b, side, spell) || !validSpellTarget(b, side, spell, hex)) return false;
  const h = sideHero(s, b, side)!;
  const def = SPELLS[spell];
  h.sp -= def.cost;
  b.sides[side].castThisRound = true;
  const q = hexQ(hex);
  const r = hexR(hex);
  const target = unitAt(b, q, r);
  const hitList: number[] = [];
  let dmgDone = 0;
  const duration = 3;
  switch (spell) {
    case 'arrow':
    case 'lightning': {
      const dmg = spellDamage(h, spell);
      const k = applyDamage(target!, dmg);
      hitList.push(target!.uid);
      dmgDone = dmg;
      b.log.push(`${h.name} използва „${def.name}“: ${dmg} щети${k ? `, падат ${k}` : ''}.`);
      break;
    }
    case 'fireflies': {
      const dmg = spellDamage(h, spell);
      const cells: [number, number][] = [[q, r], ...hexNeighbors(q, r)];
      for (const [cq, cr] of cells) {
        const t = unitAt(b, cq, cr);
        if (!t || hasAbility(t.cid, 'immobile')) continue;
        const k = applyDamage(t, dmg);
        hitList.push(t.uid);
        b.log.push(`Светулките изгарят ${creature(t.cid).plural}: ${dmg} щети${k ? `, падат ${k}` : ''}.`);
      }
      dmgDone = dmg;
      break;
    }
    case 'heal': {
      const t = target!;
      const amount = 15 + 10 * heroPow(h);
      const max = t.startN * creature(t.cid).hp;
      setTotalHp(t, Math.min(max, totalHp(t) + amount));
      hitList.push(t.uid);
      b.log.push(`${h.name} лекува ${creature(t.cid).plural} (+${amount} живот).`);
      break;
    }
    case 'haste':
    case 'shield':
    case 'slow':
    case 'bless': {
      const t = target!;
      t.effects = t.effects.filter((e) => e.id !== spell);
      t.effects.push({ id: spell, rounds: duration });
      hitList.push(t.uid);
      b.log.push(`${h.name} използва „${def.name}“ върху ${creature(t.cid).plural}.`);
      break;
    }
    default:
      return false;
  }
  b.events.push({ t: 'spell', spell, side, targets: hitList, dmg: dmgDone });
  checkEnd(b);
  if (b.over) b.active = null;
  else {
    // A spell may have killed the active unit.
    const a = activeUnit(b);
    if (!a || a.n <= 0) advance(s, b);
  }
  return true;
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

function killValue(s: GameState, b: Battle, a: BUnit, t: BUnit, ranged: boolean, moved: number): number {
  const { dmg } = computeDamage(s, b, a, t, { ranged, moved, estimate: 'avg' });
  const kills = Math.min(t.n, dmg / creature(t.cid).hp);
  let v = kills * creature(t.cid).value;
  // Prefer finishing off dangerous stacks; shooters are juicy targets.
  if (hasAbility(t.cid, 'ranged')) v *= 1.3;
  if (kills >= t.n) v *= 1.2;
  return v;
}

function retaliationCost(s: GameState, b: Battle, a: BUnit, t: BUnit, kills: number): number {
  if (hasAbility(a.cid, 'noRetaliation') || !canRetaliate(t)) return 0;
  const rest = { ...t, n: Math.max(0, t.n - kills) };
  if (rest.n <= 0) return 0;
  const { dmg } = computeDamage(s, b, rest as BUnit, a, { ranged: false, moved: 0, estimate: 'avg' });
  return Math.min(a.n, dmg / creature(a.cid).hp) * creature(a.cid).value;
}

/** Performs one AI action for the active unit (and maybe a hero spell first). */
export function aiAct(s: GameState, b: Battle): void {
  const u = activeUnit(b);
  if (!u) return;
  const side = u.side;
  if (aiCast(s, b, side)) {
    if (b.over || b.active !== u.uid) return;
  }
  const enemies = alive(b, side === 0 ? 1 : 0);
  if (!enemies.length) return;

  if (canShoot(b, u)) {
    let best = enemies[0];
    let bestV = -1;
    for (const e of enemies) {
      if (hasAbility(e.cid, 'immobile')) continue;
      const v = killValue(s, b, u, e, true, 0);
      if (v > bestV) {
        bestV = v;
        best = e;
      }
    }
    if (bestV >= 0) {
      actShoot(s, b, best.uid);
      return;
    }
  }
  if (hasAbility(u.cid, 'immobile')) {
    actDefend(s, b);
    return;
  }

  const reach = reachable(s, b, u);
  let bestAct: { t: BUnit; from: number; v: number } | null = null;
  for (const e of enemies) {
    if (hasAbility(e.cid, 'immobile')) continue;
    for (const from of attackHexes(s, b, u, e, reach)) {
      const moved = from === hexIndex(u.q, u.r) ? 0 : (reach.get(from)?.length ?? 0);
      const kv = killValue(s, b, u, e, false, moved);
      const kills = kv / creature(e.cid).value;
      const v = kv - 0.5 * retaliationCost(s, b, u, e, kills);
      if (!bestAct || v > bestAct.v) bestAct = { t: e, from, v };
    }
  }
  if (bestAct) {
    actMelee(s, b, bestAct.t.uid, bestAct.from);
    return;
  }
  // Ranged units without targets in reach and nothing adjacent: hold position.
  if (hasAbility(u.cid, 'ranged') && u.shots > 0) {
    actDefend(s, b);
    return;
  }
  // Move toward the most attractive enemy.
  const targets = enemies.filter((e) => !hasAbility(e.cid, 'immobile'));
  const goalList = targets.length ? targets : enemies;
  let bestHex = -1;
  let bestScore = Infinity;
  for (const [hex] of reach) {
    const q = hexQ(hex);
    const r = hexR(hex);
    for (const e of goalList) {
      const d = hexDistance(q, r, e.q, e.r) - creature(e.cid).value * e.n * 0.00002;
      if (d < bestScore) {
        bestScore = d;
        bestHex = hex;
      }
    }
  }
  if (bestHex >= 0) actMove(s, b, bestHex);
  else actDefend(s, b);
}

function aiCast(s: GameState, b: Battle, side: 0 | 1): boolean {
  const h = sideHero(s, b, side);
  if (!h || b.sides[side].castThisRound) return false;
  const enemies = alive(b, side === 0 ? 1 : 0).filter((e) => !hasAbility(e.cid, 'immobile'));
  const friends = alive(b, side).filter((e) => !hasAbility(e.cid, 'immobile'));
  let best: { spell: SpellId; hex: number; v: number } | null = null;
  const consider = (spell: SpellId, hex: number, v: number) => {
    if (canCast(s, b, side, spell) && (!best || v > best.v)) best = { spell, hex, v };
  };
  for (const spell of h.spells) {
    if (!canCast(s, b, side, spell)) continue;
    if (spell === 'arrow' || spell === 'lightning') {
      const dmg = spellDamage(h, spell);
      for (const e of enemies) consider(spell, hexIndex(e.q, e.r), Math.min(e.n, dmg / creature(e.cid).hp) * creature(e.cid).value);
    } else if (spell === 'fireflies') {
      const dmg = spellDamage(h, spell);
      for (const e of enemies) {
        let v = 0;
        for (const [cq, cr] of [[e.q, e.r] as [number, number], ...hexNeighbors(e.q, e.r)]) {
          const t = unitAt(b, cq, cr);
          if (!t || hasAbility(t.cid, 'immobile')) continue;
          const val = Math.min(t.n, dmg / creature(t.cid).hp) * creature(t.cid).value;
          v += t.side === side ? -val * 1.5 : val;
        }
        consider(spell, hexIndex(e.q, e.r), v);
      }
    } else if (spell === 'heal') {
      for (const f of friends) {
        const lost = f.startN * creature(f.cid).hp - totalHp(f);
        if (lost > creature(f.cid).hp) consider(spell, hexIndex(f.q, f.r), Math.min(lost, 15 + 10 * heroPow(h)) / creature(f.cid).hp * creature(f.cid).value * 0.8);
      }
    } else if ((spell === 'shield' || spell === 'haste' || spell === 'bless') && b.round <= 2) {
      for (const f of friends) {
        if (hasEffect(f, spell)) continue;
        consider(spell, hexIndex(f.q, f.r), creature(f.cid).value * f.n * 0.12);
      }
    } else if (spell === 'slow' && b.round <= 2) {
      for (const e of enemies) if (!hasEffect(e, 'slow')) consider(spell, hexIndex(e.q, e.r), creature(e.cid).value * e.n * 0.12);
    }
  }
  const chosen = best as { spell: SpellId; hex: number; v: number } | null;
  if (chosen && chosen.v > 40) return castSpell(s, b, side, chosen.spell, chosen.hex);
  return false;
}

/** Runs the battle to completion with AI on both sides (auto-combat / tests). */
export function autoResolve(s: GameState, b: Battle, maxSteps = 2000): void {
  let steps = 0;
  while (!b.over && steps++ < maxSteps) {
    if (b.active == null) advance(s, b);
    else aiAct(s, b);
    if (b.round > 60) {
      // Stalemate guard: defender holds.
      b.over = true;
      b.winner = 1;
    }
  }
  b.active = null;
}

/** Describes the attack the active unit would make on `target` (for hover tooltips). */
export function previewAttack(s: GameState, b: Battle, target: BUnit, ranged: boolean, moved: number): string {
  const u = activeUnit(b);
  if (!u) return '';
  const lo = computeDamage(s, b, u, target, { ranged, moved, estimate: 'min' }).dmg;
  const hi = computeDamage(s, b, u, target, { ranged, moved, estimate: 'max' }).dmg;
  const k1 = killsFor(target, lo);
  const k2 = killsFor(target, hi);
  const verb = ranged ? 'Стрелба' : 'Атака';
  return `${verb}: ${lo}–${hi} щети (падат ${k1 === k2 ? k1 : `${k1}–${k2}`})`;
}

export function abilityLines(cid: string): string[] {
  return creature(cid).abilities.filter((a) => a !== 'immobile').map((a) => ABILITY_TEXT[a]);
}

/** Survivors per army slot, after the battle (index-aligned with the original army). */
export function survivors(b: Battle, side: 0 | 1): Map<number, number> {
  const m = new Map<number, number>();
  for (const u of b.units) if (u.side === side && u.slot >= 0) m.set(u.slot, Math.max(0, u.n));
  return m;
}

/** HP of enemy creatures killed by `side` (experience). */
export function killedHp(b: Battle, side: 0 | 1): number {
  let hp = 0;
  for (const u of b.units) {
    if (u.side === side || u.slot < 0) continue;
    hp += Math.max(0, u.startN - u.n) * creature(u.cid).hp;
  }
  return hp;
}

export function randomFloat(s: GameState): number {
  return nextFloat(s.rng);
}
