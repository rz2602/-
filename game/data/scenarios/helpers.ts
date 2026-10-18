import type { DialogueLine } from '../../core/scenario';
import { heroAt, inBounds, objectAt, terrainDef, tileAt, townAt } from '../../core/map';
import type { GameState, Hero, Resources } from '../../core/types';

type Mood = DialogueLine['mood'];

/** Short-hand for a dialogue line. */
export function L(who: string, text: string, mood?: Mood, requires?: (s: GameState) => boolean): DialogueLine {
  return { who, text, mood, requires };
}

export const has = (flag: string) => (s: GameState) => !!s.flags[flag];
export const hasNot = (flag: string) => (s: GameState) => !s.flags[flag];
export const hasItem = (item: string) => (s: GameState) => s.items.includes(item);
export const hasRes = (r: Partial<Resources>) => (s: GameState) =>
  (Object.keys(r) as (keyof Resources)[]).every((k) => s.players.player.res[k] >= (r[k] ?? 0));

export const res = (acorns = 0, wood = 0, stone = 0, cheese = 0): Resources => ({ acorns, wood, stone, cheese });

export const STORY_HEROES = ['mishkontin', 'iskritsa'];

export function storyHeroes(s: GameState): Hero[] {
  return s.heroes.filter((h) => h.alive && h.owner === 'player' && STORY_HEROES.includes(h.id));
}

/** Mishkontin and Iskritsa stay where they are for `days` days (caring for Letko, watching the canyon...). */
export function startRest(s: GameState, key: string, days: number): void {
  s.vars[key] = s.day + days;
  for (const h of storyHeroes(s)) h.mp = 0;
}

/** Called every morning: keeps resting story heroes in place. */
export function keepResting(s: GameState, key: string): void {
  if (s.day < (s.vars[key] ?? 0)) for (const h of storyHeroes(s)) h.mp = 0;
}

/** A free, walkable tile near (x, y). */
export function freeTileNear(s: GameState, x: number, y: number): { x: number; y: number } {
  for (let r = 1; r < 5; r++)
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

/** Moves a hero (e.g. a freshly joined Iskritsa) next to Mishkontin. */
export function placeNextToMishkontin(s: GameState, id: string): void {
  const m = s.heroes.find((h) => h.id === 'mishkontin' && h.alive);
  const h = s.heroes.find((x) => x.id === id && x.alive);
  if (!m || !h) return;
  const p = freeTileNear(s, m.x, m.y);
  h.x = p.x;
  h.y = p.y;
}

/** Removes every stack of a creature from the player's heroes. */
export function removeTroops(s: GameState, cid: string): void {
  for (const h of s.heroes) if (h.owner === 'player') h.army = h.army.map((st) => (st && st.cid === cid ? null : st));
}

/** Unlocks a dwelling in a town (the creatures there join the alliance). */
export function unlockDwelling(s: GameState, townId: string, building: string, cid: string, bonus: number): void {
  const t = s.towns.find((x) => x.id === townId);
  if (!t) return;
  if (!t.built.includes(building)) t.built.push(building);
  t.available[cid] = (t.available[cid] ?? 0) + bonus;
}
