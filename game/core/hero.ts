import { ARTIFACTS, SKILLS } from '../data/magic';
import { creature } from '../data/creatures';
import { HERO_TEMPLATES, levelForXp } from '../data/heroes';
import { chance, pick, randInt } from './rng';
import type { Army, GameState, Hero, LevelUpOffer, SkillId, Stack, VirtueId } from './types';
import { ARMY_SLOTS } from './types';

// ---------------------------------------------------------------------------
// Virtues: the story axis that also gives small mechanical bonuses.
// ---------------------------------------------------------------------------

export const VIRTUE_INFO: Record<VirtueId, { name: string; icon: string; ranks: [string, string, string] }> = {
  courage: { name: 'Смелост', icon: '🦁', ranks: ['—', '+1 морал за всички твои герои', '+2 морал за всички твои герои'] },
  honesty: { name: 'Честност', icon: '🤝', ranks: ['—', 'Приятелите ти вярват: наемането е с 10% по-евтино', 'Наемането е с 20% по-евтино'] },
  kindness: { name: 'Доброта', icon: '💚', ranks: ['—', 'Самотни същества понякога молят да се присъединят', 'Още повече приятели — и на половин цена'] },
  wisdom: { name: 'Мъдрост и търпение', icon: '🦉', ranks: ['—', '+1 знание и +10% опит', '+2 знание и +20% опит'] },
};

/** 0 (0-1 points), 1 (2-3 points) or 2 (4+ points). */
export function virtueRank(s: GameState, v: VirtueId): number {
  const p = s.virtues[v] ?? 0;
  return p >= 4 ? 2 : p >= 2 ? 1 : 0;
}

function playerVirtue(s: GameState | null, h: Hero, v: VirtueId): number {
  return s && h.owner === 'player' ? virtueRank(s, v) : 0;
}

// ---------------------------------------------------------------------------
// Derived hero stats
// ---------------------------------------------------------------------------

function artSum(h: Hero, key: 'att' | 'def' | 'pow' | 'kno' | 'morale' | 'luck' | 'mpPct' | 'vision' | 'speed'): number {
  let n = 0;
  for (const a of h.artifacts) n += ARTIFACTS[a]?.[key] ?? 0;
  return n;
}

export function skill(h: Hero, id: SkillId): number {
  return h.skills[id] ?? 0;
}

export function heroAtt(h: Hero): number {
  return h.att + artSum(h, 'att');
}
export function heroDef(h: Hero): number {
  return h.def + artSum(h, 'def');
}
export function heroPow(h: Hero): number {
  return Math.max(1, h.pow + artSum(h, 'pow'));
}
export function heroKno(h: Hero, s: GameState | null = null): number {
  return Math.max(1, h.kno + artSum(h, 'kno') + playerVirtue(s, h, 'wisdom'));
}
export function maxSp(h: Hero, s: GameState | null = null): number {
  return heroKno(h, s) * 10;
}
export function heroSpeedBonus(h: Hero): number {
  return artSum(h, 'speed');
}

export function heroVision(h: Hero): number {
  let v = 5 + skill(h, 'cartography') + artSum(h, 'vision');
  if (h.specialty === 'pathfinder' || h.specialty === 'patrol') v += 2;
  return v;
}

/** Fraction (0..1) of rough-terrain penalty removed. */
export function terrainReduction(h: Hero): number {
  const lvl = skill(h, 'cartography');
  let r = [0, 0.25, 0.5, 1][lvl];
  if (h.specialty === 'pathfinder') r += 0.25;
  return Math.min(1, r);
}

export function heroMorale(h: Hero, s: GameState | null = null): number {
  let m = skill(h, 'leadership') + artSum(h, 'morale') + playerVirtue(s, h, 'courage');
  if (h.specialty === 'king' || h.specialty === 'brave') m += 1;
  if (s?.dayBonus[h.id]) m += s.dayBonus[h.id].morale;
  return Math.max(-3, Math.min(3, m));
}

export function heroLuck(h: Hero, s: GameState | null = null): number {
  let l = skill(h, 'luck') + artSum(h, 'luck');
  if (s?.dayBonus[h.id]) l += s.dayBonus[h.id].luck;
  return Math.max(-3, Math.min(3, l));
}

export function slowestSpeed(army: Army): number {
  let min = Infinity;
  for (const st of army) if (st) min = Math.min(min, creature(st.cid).spd);
  return isFinite(min) ? min : 5;
}

export function heroMaxMp(h: Hero): number {
  const spd = Math.max(3, Math.min(11, slowestSpeed(h.army)));
  let mp = 1000 + 60 * spd;
  let pct = [0, 10, 20, 30][skill(h, 'logistics')] + artSum(h, 'mpPct');
  if (h.specialty === 'swift') pct += 20;
  if (h.specialty === 'pathfinder') pct += 10;
  mp = Math.round((mp * (100 + pct)) / 100);
  return mp;
}

// ---------------------------------------------------------------------------
// Army helpers
// ---------------------------------------------------------------------------

export function emptyArmy(): Army {
  return Array.from({ length: ARMY_SLOTS }, () => null);
}

export function armyFrom(list: [string, number][]): Army {
  const a = emptyArmy();
  for (const [cid, n] of list) addToArmy(a, cid, n);
  return a;
}

/** Adds creatures to an army, merging into a matching stack. Returns false if no slot was free. */
export function addToArmy(army: Army, cid: string, n: number): boolean {
  if (n <= 0) return true;
  const same = army.find((s) => s && s.cid === cid);
  if (same) {
    same.n += n;
    return true;
  }
  const i = army.findIndex((s) => !s);
  if (i < 0) return false;
  army[i] = { cid, n };
  return true;
}

export function canAddToArmy(army: Army, cid: string): boolean {
  return army.some((s) => !s || s.cid === cid);
}

export function armyStacks(army: Army): Stack[] {
  return army.filter((s): s is Stack => !!s && s.n > 0);
}

export function armyIsEmpty(army: Army): boolean {
  return armyStacks(army).length === 0;
}

export function armyValue(army: Army): number {
  let v = 0;
  for (const st of armyStacks(army)) v += creature(st.cid).value * st.n;
  return v;
}

/** Fighting strength used by the AI and auto-resolve (army value scaled by hero stats). */
export function heroStrength(h: Hero): number {
  const stats = heroAtt(h) + heroDef(h);
  return armyValue(h.army) * (1 + 0.05 * stats) * (1 + 0.04 * heroPow(h));
}

// ---------------------------------------------------------------------------
// Experience and levels
// ---------------------------------------------------------------------------

const ALL_SKILLS = Object.keys(SKILLS) as SkillId[];
const MAX_SKILLS = 6;

export function makeLevelUpOffer(s: GameState, h: Hero): LevelUpOffer {
  const tpl = HERO_TEMPLATES[h.id] ?? HERO_TEMPLATES.mishkontin;
  const w = tpl.weights;
  const roll = randInt(s.rng, 1, w[0] + w[1] + w[2] + w[3]);
  const stat: LevelUpOffer['stat'] = roll <= w[0] ? 'att' : roll <= w[0] + w[1] ? 'def' : roll <= w[0] + w[1] + w[2] ? 'pow' : 'kno';
  const owned = ALL_SKILLS.filter((k) => skill(h, k) > 0 && skill(h, k) < 3);
  const fresh = Object.keys(h.skills).length < MAX_SKILLS ? ALL_SKILLS.filter((k) => skill(h, k) === 0) : [];
  const options: SkillId[] = [];
  if (owned.length) options.push(pick(s.rng, owned));
  if (fresh.length) options.push(pick(s.rng, fresh));
  if (options.length < 2) {
    const rest = [...owned, ...fresh].filter((k) => !options.includes(k));
    if (rest.length) options.push(pick(s.rng, rest));
  }
  return { stat, options };
}

export function applyLevelUp(h: Hero, offer: LevelUpOffer, choice: SkillId | null): void {
  h[offer.stat] += 1;
  if (choice && offer.options.includes(choice)) h.skills[choice] = Math.min(3, skill(h, choice) + 1);
}

/** Adds experience; human heroes get queued level-up choices, AI heroes choose immediately. */
export function gainXp(s: GameState, h: Hero, amount: number): number {
  const bonus = h.owner === 'player' ? [0, 10, 20][virtueRank(s, 'wisdom')] : 0;
  const xp = Math.round((amount * (100 + bonus)) / 100);
  const before = h.level;
  h.xp += xp;
  const after = levelForXp(h.xp);
  for (let l = before + 1; l <= after; l++) {
    h.level = l;
    const offer = makeLevelUpOffer(s, h);
    if (s.players[h.owner].human) h.pendingLevelUps.push(offer);
    else applyLevelUp(h, offer, offer.options.length ? offer.options[chance(s.rng, 0.5) ? 0 : offer.options.length - 1] : null);
  }
  return xp;
}
