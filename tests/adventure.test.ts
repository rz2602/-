import { describe, expect, it } from 'vitest';
import {
  campaignAfterVictory,
  dailyIncome,
  endPlayerTurn,
  finishBattle,
  heroStep,
  newCampaign,
  newGame,
  pathTo,
  startNewDay,
} from '../game/core/adventure';
import { runAiTurn } from '../game/core/ai';
import { botPlay } from '../game/core/bot';
import { autoResolve } from '../game/core/combat';
import { heroMaxMp } from '../game/core/hero';
import { findPath, isExplored, stepCost } from '../game/core/map';
import { build, buildBlocker, marketBuy, marketSell, maxRecruit, recruit, recruitUnitCost } from '../game/core/town';
import type { GameState } from '../game/core/types';
import { getScenario, presetCampaign, SCENARIO_ORDER, SCENARIOS } from '../game/data/scenarios';
import { freshState, mish } from './helpers';

describe('movement', () => {
  it('charges terrain costs (road cheaper, diagonals ×1.41, swamp eased by cartography)', () => {
    const s = freshState();
    const h = mish(s);
    // (6,11) is road, (5,13) grass, (5,16) swamp in chapter 1
    expect(stepCost(s, h, 6, 11, false)).toBe(70);
    expect(stepCost(s, h, 5, 13, false)).toBe(100);
    expect(stepCost(s, h, 5, 13, true)).toBe(141);
    const swamp = stepCost(s, h, 5, 16, false);
    expect(swamp).toBeLessThan(175); // Mishkontin is a cartographer
    expect(swamp).toBeGreaterThan(100);
    h.skills.cartography = 3;
    expect(stepCost(s, h, 5, 16, false)).toBe(100);
  });

  it('paths avoid water and stop next to guarding monsters', () => {
    const s = freshState();
    const h = mish(s);
    const all = s.players.player.explored;
    all.fill(1);
    const p = findPath(s, h, 20, 10)!;
    expect(p).not.toBeNull();
    for (const st of p) expect('~^TM').not.toContain(s.terrain[st.y * s.w + st.x]);
    // The mouselings (8,2) are only reachable through the wolves' zone of control.
    expect(findPath(s, h, 8, 2)).toBeNull();
    expect(findPath(s, h, 9, 3)).not.toBeNull(); // but the wolves can be attacked
  });

  it('spends movement points and stops when tired', () => {
    const s = freshState();
    const h = mish(s);
    const start = h.mp;
    expect(start).toBe(heroMaxMp(h));
    expect(heroStep(s, h, 6, 12)).toBe('moved');
    expect(h.mp).toBe(start - 70); // (6,12) is road
    expect(heroStep(s, h, 7, 11)).toBe('moved'); // diagonal onto the road
    expect(h.mp).toBe(start - 70 - 99);
    h.mp = 10;
    expect(heroStep(s, h, 8, 11)).toBe('blocked');
    expect(h.x).toBe(7);
  });

  it('reveals the fog around a moving hero', () => {
    const s = freshState();
    const h = mish(s);
    expect(isExplored(s, 'player', 20, 10)).toBe(false);
    h.x = 12;
    h.y = 11;
    expect(heroStep(s, h, 12, 10)).toBe('moved');
    expect(isExplored(s, 'player', 20, 10)).toBe(true);
  });

  it('starts a battle when walking next to a guard and resolves it', () => {
    const s = freshState();
    const h = mish(s);
    s.players.player.explored.fill(1);
    const p = pathTo(s, h, 6, 17)!; // the spiders
    let r = 'moved';
    for (const st of p) {
      r = heroStep(s, h, st.x, st.y);
      if (r !== 'moved') break;
    }
    expect(r).toBe('battle');
    expect(s.battle).not.toBeNull();
    autoResolve(s, s.battle!);
    finishBattle(s);
    expect(s.battle).toBeNull();
  });
});

describe('economy and towns', () => {
  it('pays daily income from halls, mines and skills', () => {
    const s = freshState();
    expect(dailyIncome(s, 'player').acorns).toBe(500);
    const mine = s.objects.find((o) => o.kind === 'mine' && o.res === 'wood')!;
    if (mine.kind === 'mine') mine.owner = 'player';
    expect(dailyIncome(s, 'player').wood).toBe(2);
    const before = s.players.player.res.acorns;
    endPlayerTurn(s);
    startNewDay(s);
    expect(s.players.player.res.acorns).toBe(before + 500);
    expect(s.day).toBe(2);
  });

  it('builds one building per day with requirements and costs', () => {
    const s = freshState();
    const t = s.towns.find((x) => x.id === 'mohovo')!;
    expect(buildBlocker(s, t, 'd4')).toMatch(/Нужни/);
    const acorns = s.players.player.res.acorns;
    expect(build(s, t, 'market')).toBe(true);
    expect(s.players.player.res.acorns).toBe(acorns - 500);
    expect(build(s, t, 'workshop')).toBe(false); // already built today
    startNewDay(s);
    expect(build(s, t, 'workshop')).toBe(true);
  });

  it('grows creatures weekly (granary +50%) and recruits within budget', () => {
    const s = freshState();
    const t = s.towns.find((x) => x.id === 'mohovo')!;
    expect(t.available.mouse).toBe(12);
    t.built.push('granary');
    for (let d = 0; d < 7; d++) startNewDay(s);
    expect(s.day).toBe(8);
    expect(t.available.mouse).toBe(12 + 18);
    s.players.player.res.acorns = 450;
    expect(maxRecruit(s, 'player', 'mouse', t.available.mouse)).toBe(10);
    expect(recruit(s, t, 'mouse', 11)).toBe(false);
    expect(recruit(s, t, 'mouse', 10)).toBe(true);
    expect(s.players.player.res.acorns).toBe(0);
  });

  it('gives kind players a recruiting discount', () => {
    const s = freshState();
    expect(recruitUnitCost(s, 'owl', 'player').acorns).toBe(320);
    s.virtues.kindness = 4;
    expect(recruitUnitCost(s, 'owl', 'player').acorns).toBe(288);
  });

  it('trades at the market', () => {
    const s = freshState();
    const r = s.players.player.res;
    const a = r.acorns;
    expect(marketSell(s, 'player', 'wood', 2)).toBe(true);
    expect(r.acorns).toBe(a + 120);
    expect(marketBuy(s, 'player', 'cheese', 1)).toBe(true);
    expect(r.cheese).toBe(1);
    expect(marketSell(s, 'player', 'stone', 999)).toBe(false);
  });
});

describe('story data', () => {
  it('every scenario loads and all dialogue references exist', () => {
    for (const id of SCENARIO_ORDER) {
      const sc = getScenario(id);
      const s = newGame(id, presetCampaign(id), 1);
      const known = new Set(Object.keys(sc.dialogues));
      const refs: string[] = [];
      for (const o of s.objects) {
        if (o.kind === 'npc') refs.push(o.dialogue, ...(o.repeatDialogue ? [o.repeatDialogue] : []));
        if (o.kind === 'monster' && o.afterDialogue) refs.push(o.afterDialogue);
        if (o.kind === 'event' || o.kind === 'goal') refs.push(o.dialogue);
        if (o.kind === 'questItem' && o.dialogue) refs.push(o.dialogue);
      }
      const walk = (acts: { a: string; id?: string }[]) => acts.forEach((a) => a.a === 'dialogue' && refs.push(a.id!));
      for (const t of sc.triggers) walk(t.actions as { a: string; id?: string }[]);
      for (const d of Object.values(sc.dialogues)) {
        for (const c of d.choices ?? []) walk(c.actions as { a: string; id?: string }[]);
        walk((d.after ?? []) as { a: string; id?: string }[]);
      }
      refs.push(sc.victoryDialogue(s));
      for (const r of refs) expect(known.has(r), `${id}: missing dialogue ${r}`).toBe(true);
      expect(s.pendingDialogues.length).toBeGreaterThan(0); // intro plays at once
    }
    expect(Object.keys(SCENARIOS)).toHaveLength(3);
  });

  it('carries Mishkontin, flags and virtues into the next chapter', () => {
    const s = newGame('s1', newCampaign('normal'), 4);
    botPlay(s, 60);
    expect(s.status).toBe('won');
    const c = campaignAfterVictory(s);
    expect(c.completed).toContain('s1');
    const s2 = newGame('s2', c, 4);
    const m = mish(s2);
    expect(m.level).toBe(mish(s).level);
    expect(m.artifacts).toContain('medallion');
    expect(s2.virtues).toEqual(s.virtues);
    expect(s2.items).toEqual(expect.arrayContaining(['map1', 'map2', 'map3']));
  });
});

describe('determinism and save data', () => {
  it('continues identically after a JSON save/load round trip', () => {
    const a = newGame('s1', newCampaign('normal'), 21);
    botPlay(a, 4);
    const b = JSON.parse(JSON.stringify(a)) as GameState;
    botPlay(a, 9);
    botPlay(b, 9);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
  });

  it('the rat AI takes its turn without errors', () => {
    const s = freshState();
    endPlayerTurn(s);
    runAiTurn(s, 'enemy');
    startNewDay(s);
    expect(s.status).toBe('play');
  });
});
