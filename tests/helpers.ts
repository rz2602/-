import { newCampaign, newGame } from '../game/core/adventure';
import { createBattle, type SideSetup } from '../game/core/combat';
import { armyFrom } from '../game/core/hero';
import type { GameState, Hero } from '../game/core/types';

/** A fresh chapter-1 state (dialogues cleared) for rule tests. */
export function freshState(seed = 7): GameState {
  const s = newGame('s1', newCampaign('normal'), seed);
  s.pendingDialogues = [];
  s.toasts = [];
  return s;
}

export function mish(s: GameState): Hero {
  return s.heroes.find((h) => h.id === 'mishkontin')!;
}

/** Creates a battle between two plain armies (no heroes) on a fresh state. */
export function rawBattle(s: GameState, a: [string, number][], d: [string, number][], heroA: Hero | null = null) {
  const att: SideSetup = { owner: 'player', hero: heroA, human: false, name: 'A', portrait: 'x', army: armyFrom(a) };
  const def: SideSetup = { owner: null, hero: null, human: false, name: 'D', portrait: 'x', army: armyFrom(d) };
  const b = createBattle(s, 'monster', att, def, { attackerHeroId: heroA?.id ?? 'none', defenderHeroId: null, monsterObjId: null, townId: null }, 'grass');
  b.obstacles = [];
  return b;
}
