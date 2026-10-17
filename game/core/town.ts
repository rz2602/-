import { creature } from '../data/creatures';
import { HERO_TEMPLATES } from '../data/heroes';
import { SPELLS } from '../data/magic';
import { BUILDINGS, dwellingCreature, MARKET_RATE, TAVERN_HERO_COST } from '../data/towns';
import { canAfford, createHero, gain, pay, toast } from './adventure';
import { armyStacks, maxSp, skill, virtueRank } from './hero';
import { heroAt } from './map';
import type { Army, Cost, GameState, Hero, PlayerId, ResKey, SpellId, Town } from './types';

export function weeklyGrowth(s: GameState, t: Town, initial: boolean): void {
  const mult = t.built.includes('granary') ? 1.5 : 1;
  for (const b of t.built) {
    const cid = dwellingCreature(t.faction, b);
    if (!cid) continue;
    const g = Math.floor(creature(cid).growth * mult);
    t.available[cid] = initial ? g : (t.available[cid] ?? 0) + g;
  }
  void s;
}

export function buildBlocker(s: GameState, t: Town, b: string): string | null {
  const def = BUILDINGS[b];
  if (!def || def.special) return 'Не може да се строи.';
  if (t.built.includes(b)) return 'Вече е построено.';
  const missing = def.requires.filter((r) => !t.built.includes(r));
  if (missing.length) return 'Нужни са други сгради първо.';
  if (t.builtToday) return 'Днес вече се строи в този град.';
  if (!t.owner || !canAfford(s.players[t.owner].res, def.cost)) return 'Не стигат ресурсите.';
  return null;
}

export function build(s: GameState, t: Town, b: string): boolean {
  if (buildBlocker(s, t, b)) return false;
  pay(s.players[t.owner!].res, BUILDINGS[b].cost);
  t.built.push(b);
  t.builtToday = true;
  const cid = dwellingCreature(t.faction, b);
  if (cid) t.available[cid] = creature(cid).growth;
  return true;
}

export function recruitUnitCost(s: GameState, cid: string, owner: PlayerId): Cost {
  const base = creature(cid).cost;
  const discount = owner === 'player' && virtueRank(s, 'kindness') >= 2 ? 0.9 : 1;
  const out: Cost = {};
  for (const k of Object.keys(base) as ResKey[]) out[k] = k === 'acorns' ? Math.round((base[k] ?? 0) * discount) : base[k];
  return out;
}

export function maxRecruit(s: GameState, owner: PlayerId, cid: string, available: number): number {
  const cost = recruitUnitCost(s, cid, owner);
  const r = s.players[owner].res;
  let n = available;
  for (const k of Object.keys(cost) as ResKey[]) {
    const c = cost[k] ?? 0;
    if (c > 0) n = Math.min(n, Math.floor(r[k] / c));
  }
  return Math.max(0, n);
}

/** Where recruits go: the visiting hero (if any and has room) or the garrison. */
export function recruitTarget(s: GameState, t: Town, cid: string): Army | null {
  const h = visitingHero(s, t);
  if (h && canTake(h.army, cid)) return h.army;
  if (canTake(t.garrison, cid)) return t.garrison;
  return null;
}

function canTake(army: Army, cid: string): boolean {
  return army.some((st) => !st || st.cid === cid);
}

export function recruit(s: GameState, t: Town, cid: string, n: number, into?: Army): boolean {
  if (!t.owner || n <= 0) return false;
  const avail = t.available[cid] ?? 0;
  if (n > avail || n > maxRecruit(s, t.owner, cid, avail)) return false;
  const target = into ?? recruitTarget(s, t, cid);
  if (!target || !canTake(target, cid)) return false;
  const unit = recruitUnitCost(s, cid, t.owner);
  const total: Cost = {};
  for (const k of Object.keys(unit) as ResKey[]) total[k] = (unit[k] ?? 0) * n;
  pay(s.players[t.owner].res, total);
  t.available[cid] = avail - n;
  const same = target.find((st) => st && st.cid === cid);
  if (same) same.n += n;
  else target[target.findIndex((st) => !st)] = { cid, n };
  return true;
}

export function recruitFromDwelling(s: GameState, h: Hero, objId: string, n: number): boolean {
  const o = s.objects.find((x) => x.id === objId);
  if (!o || o.kind !== 'dwelling' || n <= 0 || n > o.available) return false;
  const max = maxRecruit(s, h.owner, o.cid, o.available);
  if (n > max || !canTake(h.army, o.cid)) return false;
  const unit = recruitUnitCost(s, o.cid, h.owner);
  const total: Cost = {};
  for (const k of Object.keys(unit) as ResKey[]) total[k] = (unit[k] ?? 0) * n;
  pay(s.players[h.owner].res, total);
  o.available -= n;
  const same = h.army.find((st) => st && st.cid === o.cid);
  if (same) same.n += n;
  else h.army[h.army.findIndex((st) => !st)] = { cid: o.cid, n };
  return true;
}

export function visitingHero(s: GameState, t: Town): Hero | undefined {
  const h = heroAt(s, t.x, t.y);
  return h && h.owner === t.owner ? h : undefined;
}

/** Spells this hero can learn in this town's library. */
export function learnableSpells(t: Town, h: Hero): SpellId[] {
  const maxLevel = t.built.includes('library2') ? 2 : t.built.includes('library') ? 1 : 0;
  return t.spells.filter((sp) => {
    const lvl = SPELLS[sp].level;
    if (lvl === 3) return t.built.includes('library2') && skill(h, 'sorcery') >= 1;
    return lvl <= maxLevel;
  });
}

/** Called when a hero enters / is in an own town: learn spells and refill spell points. */
export function visitTown(s: GameState, h: Hero, t: Town): SpellId[] {
  const learned: SpellId[] = [];
  for (const sp of learnableSpells(t, h)) {
    if (!h.spells.includes(sp)) {
      h.spells.push(sp);
      learned.push(sp);
    }
  }
  h.sp = maxSp(h, s);
  if (learned.length && s.players[h.owner].human) toast(s, `${h.name} научи: ${learned.map((x) => SPELLS[x].name).join(', ')}`, '📖');
  return learned;
}

export function marketSell(s: GameState, pid: PlayerId, res: Exclude<ResKey, 'acorns'>, n: number): boolean {
  const r = s.players[pid].res;
  if (n <= 0 || r[res] < n) return false;
  r[res] -= n;
  r.acorns += MARKET_RATE[res].sell * n;
  return true;
}

export function marketBuy(s: GameState, pid: PlayerId, res: Exclude<ResKey, 'acorns'>, n: number): boolean {
  const r = s.players[pid].res;
  const price = MARKET_RATE[res].buy * n;
  if (n <= 0 || r.acorns < price) return false;
  r.acorns -= price;
  r[res] += n;
  return true;
}

export function canHire(s: GameState, t: Town): string | null {
  if (!t.owner) return 'Няма собственик.';
  if (!t.built.includes('tavern')) return 'Нужна е странноприемница.';
  if (visitingHero(s, t) || heroAt(s, t.x, t.y)) return 'В града вече има герой.';
  if (s.players[t.owner].res.acorns < TAVERN_HERO_COST) return 'Не стигат жълъдите.';
  if (s.heroes.filter((h) => h.alive && h.owner === t.owner).length >= 4) return 'Можеш да водиш най-много 4 героя.';
  if (!hireCandidates(s, t.owner).length) return 'Няма свободни герои.';
  return null;
}

export function hireCandidates(s: GameState, pid: PlayerId): string[] {
  return s.players[pid].heroPool.filter((id) => !s.heroes.some((h) => h.alive && h.id === id) && HERO_TEMPLATES[id]);
}

export function hireHero(s: GameState, t: Town, tplId: string): Hero | null {
  if (canHire(s, t) || !hireCandidates(s, t.owner!).includes(tplId)) return null;
  s.players[t.owner!].res.acorns -= TAVERN_HERO_COST;
  // Hired heroes with the same id as a fallen one come back with a new body (a new id).
  const h = createHero(s, tplId, t.owner!, t.x, t.y);
  if (t.owner === 'enemy') h.ai = { targetId: null, tx: -1, ty: -1, role: 'roam', homeTownId: t.id, activeFrom: s.day };
  return h;
}

/**
 * Moves (part of) a stack between two armies (hero/garrison) or within one.
 * Merges same creatures, swaps otherwise. A hero army can never become empty.
 */
export function moveStack(from: Army, fromSlot: number, to: Army, toSlot: number, n: number | null, fromIsHero: boolean): boolean {
  const src = from[fromSlot];
  if (!src) return false;
  const amount = n == null ? src.n : Math.max(1, Math.min(src.n, n));
  if (from === to && fromSlot === toSlot) return false;
  const dst = to[toSlot];
  if (dst && dst.cid !== src.cid) {
    if (amount !== src.n) return false;
    // Swap whole stacks.
    from[fromSlot] = dst;
    to[toSlot] = src;
    return true;
  }
  const removeAll = amount === src.n;
  if (fromIsHero && from !== to && removeAll && armyStacks(from).length <= 1) return false;
  if (dst) dst.n += amount;
  else to[toSlot] = { cid: src.cid, n: amount };
  src.n -= amount;
  if (src.n <= 0) from[fromSlot] = null;
  return true;
}

export function giveResources(s: GameState, pid: PlayerId, cost: Cost): void {
  gain(s.players[pid].res, cost);
}
