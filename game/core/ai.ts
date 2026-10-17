/**
 * Adventure-map AI for the rat horde (and for the test bot playing the forest).
 * Deliberately simple: score visible goals by value / travel time, walk there,
 * fight what it can beat, keep towns building and recruiting.
 */
import { creature } from '../data/creatures';
import { dwellingCreature } from '../data/towns';
import { battleNeedsHuman, finishBattle, heroStep, playerHeroes, playerTowns, type StepOutcome } from './adventure';
import { actFlee, autoResolve, canFlee } from './combat';
import { addToArmy, armyValue, heroMaxMp, heroStrength } from './hero';
import { distances, pathFromDist, townAt, type PathStep } from './map';
import { build, buildBlocker, canHire, hireCandidates, hireHero, maxRecruit, recruit, visitingHero, visitTown } from './town';
import type { GameState, Hero, PlayerId, Town } from './types';

export interface AiCursor {
  pid: PlayerId;
  started: boolean;
  heroIds: string[];
  idx: number;
  path: PathStep[] | null;
  retargets: number;
  /** Targets this hero gave up on this turn. */
  skip: Set<string>;
}

export function newAiCursor(pid: PlayerId = 'enemy'): AiCursor {
  return { pid, started: false, heroIds: [], idx: 0, path: null, retargets: 0, skip: new Set() };
}

const AI_BUILD_PRIORITY = ['d1', 'd2', 'fort', 'd3', 'workshop', 'market', 'hall2', 'd4', 'tavern', 'granary', 'library', 'fort2', 'd5', 'library2'];

export function townDefense(s: GameState, t: Town): number {
  let v = armyValue(t.garrison);
  const h = visitingHero(s, t);
  if (h) v += heroStrength(h);
  if (t.built.includes('fort')) v *= 1.25;
  if (t.built.includes('fort2')) v = v * 1.15 + 600;
  return v;
}

export function manageTowns(s: GameState, pid: PlayerId): void {
  for (const t of playerTowns(s, pid)) {
    for (const b of AI_BUILD_PRIORITY) {
      if (!buildBlocker(s, t, b)) {
        build(s, t, b);
        break;
      }
    }
    // Recruit from best to worst.
    const dwellings = t.built.filter((b) => /^d\d$/.test(b)).sort().reverse();
    for (const b of dwellings) {
      const cid = dwellingCreature(t.faction, b)!;
      const n = maxRecruit(s, pid, cid, t.available[cid] ?? 0);
      if (n > 0) recruit(s, t, cid, n, t.garrison.some((st) => !st || st.cid === cid) ? t.garrison : undefined);
    }
    if (!s.players[pid].human && !canHire(s, t) && playerHeroes(s, pid).length < 2 && s.players[pid].res.acorns > 4000) {
      const c = hireCandidates(s, pid);
      if (c.length) hireHero(s, t, c[0]);
    }
  }
}

/** A 'boss' guards its home until its active day, then hunts like a raider. */
export function effectiveRole(s: GameState, h: Hero): 'roam' | 'raider' | 'guard' {
  const r = h.ai?.role ?? 'roam';
  if (r === 'boss') return s.day >= (h.ai?.activeFrom ?? 1) ? 'raider' : 'guard';
  return r;
}

function pickupGarrison(s: GameState, h: Hero): void {
  const t = townAt(s, h.x, h.y);
  if (!t || t.owner !== h.owner) return;
  visitTown(s, h, t);
  if (effectiveRole(s, h) === 'guard' || h.ai?.role === 'raider') return;
  // The bot (forest side) leaves the weakest troops at home as a garrison;
  // the rat AI keeps about half of the garrison's value to defend the town.
  const human = s.players[h.owner].human;
  const keep = human ? 0 : armyValue(t.garrison) * 0.5;
  const order = t.garrison
    .map((st, i) => ({ st, i }))
    .filter((x) => x.st)
    .sort((a, b) => creature(b.st!.cid).value * b.st!.n - creature(a.st!.cid).value * a.st!.n);
  for (const { st, i } of order) {
    if (!st || (human && creature(st.cid).tier <= 1)) continue;
    if (!human && armyValue(t.garrison) - creature(st.cid).value * st.n < keep) continue;
    if (addToArmy(h.army, st.cid, st.n)) t.garrison[i] = null;
  }
}

interface Goal {
  key: string;
  x: number;
  y: number;
  value: number;
}

function goals(s: GameState, h: Hero): Goal[] {
  const out: Goal[] = [];
  const me = heroStrength(h);
  const enemyPid: PlayerId = h.owner === 'player' ? 'enemy' : 'player';
  const role = effectiveRole(s, h);
  const hunting = role === 'raider';
  const home = h.ai?.homeTownId ? s.towns.find((t) => t.id === h.ai!.homeTownId) : undefined;
  const near = (x: number, y: number, r: number) => !home || Math.max(Math.abs(home.x - x), Math.abs(home.y - y)) <= r;

  for (const e of playerHeroes(s, enemyPid)) {
    const t = townAt(s, e.x, e.y);
    const their = t && t.owner === e.owner ? townDefense(s, t) : heroStrength(e);
    if (role === 'guard' && !near(e.x, e.y, 7)) continue;
    if (me > their * (hunting ? 0.9 : 1.3)) out.push({ key: `h:${e.id}`, x: e.x, y: e.y, value: (hunting ? 9000 : 4000) + their * 0.3 });
  }
  for (const t of s.towns) {
    if (t.owner === h.owner) {
      // Rush home when an enemy hero threatens a weakly defended town.
      const danger = playerHeroes(s, enemyPid).filter((e) => Math.max(Math.abs(e.x - t.x), Math.abs(e.y - t.y)) <= 12 && heroStrength(e) > townDefense(s, t));
      if (danger.length && (h.x !== t.x || h.y !== t.y) && role !== 'raider') out.push({ key: `t:${t.id}`, x: t.x, y: t.y, value: 12000 });
      // Return home to pick up fresh recruits.
      const human = s.players[h.owner].human;
      const gv = armyValue(t.garrison.map((st) => (st && (!human || creature(st.cid).tier > 1) ? st : null)));
      if (gv > 0 && (h.x !== t.x || h.y !== t.y) && role !== 'guard') out.push({ key: `t:${t.id}`, x: t.x, y: t.y, value: gv * 0.8 });
      continue;
    }
    const def = townDefense(s, t);
    if (role === 'guard') continue;
    // An active boss goes all in against enemy towns.
    const allIn = hunting && h.ai?.role === 'boss' && t.owner != null;
    if (allIn || me > (hunting ? def * 0.9 : def * 1.25 + 150)) out.push({ key: `t:${t.id}`, x: t.x, y: t.y, value: hunting ? 15000 : 6000 });
  }
  const greedy = role !== 'raider';
  for (const o of s.objects) {
    if (o.done) continue;
    let v = 0;
    switch (o.kind) {
      case 'mine':
        if (o.owner !== h.owner) v = o.res === 'acorns' ? 1600 : o.res === 'cheese' ? 1300 : 900;
        break;
      case 'resource':
        v = o.res === 'acorns' ? o.amount * 0.8 : o.res === 'cheese' ? o.amount * 250 : o.amount * 90;
        break;
      case 'chest':
        v = o.acorns * 0.8;
        break;
      case 'artifact':
        v = 1200;
        break;
      case 'monster': {
        const mv = creature(o.cid).value * o.n;
        if (me > mv * 1.8) v = 300 + mv * 0.25;
        break;
      }
      case 'dwelling':
        if (o.owner !== h.owner || (o.available > 0 && maxRecruit(s, h.owner, o.cid, o.available) > 0)) v = 500 + Math.min(o.available, 10) * creature(o.cid).value * 0.3;
        break;
      case 'shrine':
        if (['att', 'def', 'pow', 'kno', 'xp'].includes(o.effect) && !h.visited.includes(o.id)) v = 700;
        break;
      // Story objects matter only to the forest (bot) side.
      case 'npc':
        if (h.owner === 'player' && (!s.flags[`seen_${o.id}`] || (o.doneFlag && !s.flags[o.doneFlag]))) v = 5000;
        if (h.owner === 'player' && o.wantItem && s.items.includes(o.wantItem) && !s.flags[o.wantFlag ?? '']) v = 6000;
        break;
      case 'questItem':
      case 'goal':
        if (h.owner === 'player') {
          v = 8000;
          // Clear the guards that stand in the way of a story goal.
          for (const m of s.objects) {
            if (m.done || m.kind !== 'monster' || Math.max(Math.abs(m.x - o.x), Math.abs(m.y - o.y)) > 2) continue;
            if (me > creature(m.cid).value * m.n * 1.3) out.push({ key: `o:${m.id}`, x: m.x, y: m.y, value: 7000 });
          }
        }
        break;
      case 'event':
        if (h.owner === 'player') v = 1500;
        break;
      case 'gate':
        if (h.owner === 'player' && s.flags[o.needFlag]) v = 3000;
        break;
      default:
        break;
    }
    if (!v) continue;
    if (!greedy) v *= 0.25;
    if (role === 'guard' && !near(o.x, o.y, 7)) continue;
    out.push({ key: `o:${o.id}`, x: o.x, y: o.y, value: v });
  }
  if (role === 'guard' && home && (h.x !== home.x || h.y !== home.y)) out.push({ key: `t:${home.id}`, x: home.x, y: home.y, value: 400 });
  // Stay out of reach of enemy heroes that would win a fight (except when going home).
  const threats = playerHeroes(s, enemyPid)
    .filter((e) => heroStrength(e) > me * 0.9)
    .map((e) => ({ x: e.x, y: e.y, r: Math.ceil(heroMaxMp(e) / 85) }));
  if (!threats.length || (hunting && h.ai?.role === 'boss')) return out;
  return out.filter((g) => g.key.startsWith('t:') && s.towns.find((t) => `t:${t.id}` === g.key)?.owner === h.owner
    ? true
    : !threats.some((t) => Math.max(Math.abs(t.x - g.x), Math.abs(t.y - g.y)) <= t.r));
}

function chooseTarget(s: GameState, h: Hero, cur: AiCursor): PathStep[] | null {
  const dm = distances(s, h, { ignoreFog: !s.players[h.owner].human });
  const mp = heroMaxMp(h);
  let best: { path: PathStep[]; score: number; key: string } | null = null;
  for (const g of goals(s, h)) {
    if (cur.skip.has(g.key)) continue;
    const d = dm.dist[g.y * s.w + g.x];
    if (!isFinite(d)) continue;
    const days = d / mp;
    const score = g.value / (1 + days * 1.3);
    if (!best || score > best.score) {
      const path = pathFromDist(s, dm, g.x, g.y);
      if (path) best = { path, score, key: g.key };
    }
  }
  if (!best) return null;
  if (AI_DEBUG.on) console.log(`[ai] day ${s.day} ${h.id}@${h.x},${h.y} -> ${best.key} (${Math.round(best.score)})`);
  cur.skip.add(best.key);
  return best.path;
}

export const AI_DEBUG = { on: false };

export type AiStepResult = 'step' | 'battle' | 'done';

/** Performs one small AI action. Call repeatedly until it returns 'done'. */
export function aiStep(s: GameState, cur: AiCursor): AiStepResult {
  if (s.status !== 'play') return 'done';
  if (s.battle) {
    if (battleNeedsHuman(s)) return 'battle';
    autoResolve(s, s.battle);
    finishBattle(s);
    cur.path = null;
    return 'step';
  }
  if (!cur.started) {
    cur.started = true;
    manageTowns(s, cur.pid);
    cur.heroIds = playerHeroes(s, cur.pid).map((h) => h.id);
    cur.idx = 0;
  }
  // Discard prompts/dialogues the AI cannot answer.
  if (s.prompt && !s.players[cur.pid].human) s.prompt = null;
  for (;;) {
    const id = cur.heroIds[cur.idx];
    if (!id) return 'done';
    const h = s.heroes.find((x) => x.id === id);
    if (!h || !h.alive || h.mp <= 0 || cur.retargets > 12 || (h.ai && h.ai.activeFrom > s.day && h.ai.role !== 'boss')) {
      nextHero(cur);
      continue;
    }
    if (!cur.path || !cur.path.length) {
      cur.retargets += 1;
      cur.path = chooseTarget(s, h, cur);
      if (!cur.path) {
        nextHero(cur);
        continue;
      }
    }
    const p = cur.path[0];
    const res: StepOutcome = heroStep(s, h, p.x, p.y);
    if (res === 'moved') {
      cur.path.shift();
      if (!cur.path.length) {
        pickupGarrison(s, h);
        cur.path = null;
      }
      return 'step';
    }
    cur.path = null;
    if (res === 'battle') {
      if (battleNeedsHuman(s)) return 'battle';
      autoResolve(s, s.battle!);
      finishBattle(s);
      return 'step';
    }
    if (res === 'stop') {
      pickupGarrison(s, h);
      return 'step';
    }
    // Blocked (out of movement for the next step): done with this hero.
    nextHero(cur);
  }
}

function nextHero(cur: AiCursor): void {
  cur.idx += 1;
  cur.path = null;
  cur.retargets = 0;
  cur.skip = new Set();
}

/** Runs a whole AI turn without UI (battles with humans are auto-resolved). */
export function runAiTurn(s: GameState, pid: PlayerId = 'enemy', maxSteps = 5000): void {
  const cur = newAiCursor(pid);
  for (let i = 0; i < maxSteps; i++) {
    const r = aiStep(s, cur);
    if (r === 'done') return;
    if (r === 'battle') resolveBattleAsBot(s);
  }
}

/**
 * Resolves the current battle automatically. A human side (played by the test
 * bot) retreats from hopeless fights instead of losing its hero, like a
 * sensible player would.
 */
export function resolveBattleAsBot(s: GameState): void {
  const b = s.battle;
  if (!b) return;
  const humanSide = b.sides[0].human ? 0 : b.sides[1].human ? 1 : null;
  if (humanSide != null && canFlee(b, humanSide)) {
    // Peek at the outcome on a copy; retreat if it would be lost.
    const probe = structuredClone(s);
    autoResolve(probe, probe.battle!);
    if (probe.battle!.winner !== humanSide) actFlee(b, humanSide);
  }
  if (!b.over) autoResolve(s, b);
  finishBattle(s);
}
