import type { GameState, Hero, MapObject, PlayerId, Town } from './types';
import { heroVision, terrainReduction } from './hero';

export interface TerrainDef {
  name: string;
  cost: number;
  passable: boolean;
}

export const TERRAIN: Record<string, TerrainDef> = {
  '.': { name: 'Поляна', cost: 100, passable: true },
  ',': { name: 'Цветна ливада', cost: 100, passable: true },
  ':': { name: 'Път', cost: 70, passable: true },
  '=': { name: 'Мост', cost: 70, passable: true },
  d: { name: 'Пръст', cost: 100, passable: true },
  h: { name: 'Хълмове', cost: 150, passable: true },
  s: { name: 'Блато', cost: 175, passable: true },
  n: { name: 'Сняг', cost: 150, passable: true },
  T: { name: 'Гъста гора', cost: 0, passable: false },
  '^': { name: 'Скали', cost: 0, passable: false },
  '~': { name: 'Вода', cost: 0, passable: false },
  M: { name: 'Планина', cost: 0, passable: false },
};

export const DIRS: readonly [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

export function inBounds(s: GameState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < s.w && y < s.h;
}

export function tileAt(s: GameState, x: number, y: number): string {
  return s.terrain[y * s.w + x];
}

export function terrainDef(ch: string): TerrainDef {
  return TERRAIN[ch] ?? TERRAIN['.'];
}

export function objectAt(s: GameState, x: number, y: number): MapObject | undefined {
  return s.objects.find((o) => !o.done && o.x === x && o.y === y);
}

export function townAt(s: GameState, x: number, y: number): Town | undefined {
  return s.towns.find((t) => t.x === x && t.y === y);
}

export function heroAt(s: GameState, x: number, y: number): Hero | undefined {
  return s.heroes.find((h) => h.alive && h.x === x && h.y === y);
}

/** The monster whose zone of control covers (x, y), if any (not the monster tile itself). */
export function guardingMonster(s: GameState, x: number, y: number): MapObject | undefined {
  for (const o of s.objects) {
    if (o.done || o.kind !== 'monster') continue;
    if (o.x === x && o.y === y) continue;
    if (Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1) return o;
  }
  return undefined;
}

/** Tiles you can step onto but not walk through (objects, towns, heroes). */
export function isStopTile(s: GameState, x: number, y: number, hero: Hero): boolean {
  const o = objectAt(s, x, y);
  if (o && o.kind !== 'event') return true;
  if (townAt(s, x, y)) return true;
  const h = heroAt(s, x, y);
  return !!h && h.id !== hero.id;
}

export function stepCost(s: GameState, hero: Hero, x: number, y: number, diagonal: boolean): number {
  const def = terrainDef(tileAt(s, x, y));
  let cost = def.cost;
  if (cost > 100) cost = 100 + Math.round((cost - 100) * (1 - terrainReduction(hero)));
  return diagonal ? Math.round(cost * 1.414) : cost;
}

export interface PathStep {
  x: number;
  y: number;
  /** Total cost from the start up to and including this step. */
  cost: number;
}

export interface DistMap {
  dist: Float64Array;
  prev: Int32Array;
}

/** Dijkstra over the whole map from the hero position. */
export function distances(s: GameState, hero: Hero, opts: { ignoreFog?: boolean } = {}): DistMap {
  const n = s.w * s.h;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const start = hero.y * s.w + hero.x;
  dist[start] = 0;
  const explored = opts.ignoreFog ? null : s.players[hero.owner].explored;
  // Small binary heap of [cost, index].
  const heap: number[][] = [[0, start]];
  const push = (item: number[]) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const pop = (): number[] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;
        [heap[m], heap[i]] = [heap[i], heap[m]];
        i = m;
      }
    }
    return top;
  };
  while (heap.length) {
    const [d, idx] = pop();
    if (d > dist[idx]) continue;
    const x = idx % s.w;
    const y = (idx - x) / s.w;
    // A guarded tile ends the walk, except that the guard itself can be attacked from it.
    let guard: MapObject | undefined;
    if (idx !== start) {
      if (isStopTile(s, x, y, hero)) continue;
      guard = guardingMonster(s, x, y);
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (guard && (nx !== guard.x || ny !== guard.y)) continue;
      if (!inBounds(s, nx, ny)) continue;
      const ni = ny * s.w + nx;
      if (explored && !explored[ni]) continue;
      if (!terrainDef(tileAt(s, nx, ny)).passable) continue;
      const nd = d + stepCost(s, hero, nx, ny, dx !== 0 && dy !== 0);
      if (nd < dist[ni]) {
        dist[ni] = nd;
        prev[ni] = idx;
        push([nd, ni]);
      }
    }
  }
  return { dist, prev };
}

export function pathFromDist(s: GameState, dm: DistMap, tx: number, ty: number): PathStep[] | null {
  const ti = ty * s.w + tx;
  if (!isFinite(dm.dist[ti])) return null;
  const out: PathStep[] = [];
  let i = ti;
  while (dm.prev[i] !== -1) {
    const x = i % s.w;
    out.push({ x, y: (i - x) / s.w, cost: dm.dist[i] });
    i = dm.prev[i];
  }
  out.reverse();
  return out.length ? out : null;
}

export function findPath(s: GameState, hero: Hero, tx: number, ty: number): PathStep[] | null {
  if (!inBounds(s, tx, ty)) return null;
  return pathFromDist(s, distances(s, hero), tx, ty);
}

export function reveal(s: GameState, pid: PlayerId, cx: number, cy: number, r: number): void {
  const ex = s.players[pid].explored;
  for (let y = Math.max(0, cy - r); y <= Math.min(s.h - 1, cy + r); y++) {
    for (let x = Math.max(0, cx - r); x <= Math.min(s.w - 1, cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r + r) ex[y * s.w + x] = 1;
    }
  }
}

export function revealAround(s: GameState, pid: PlayerId): void {
  for (const h of s.heroes) if (h.alive && h.owner === pid) reveal(s, pid, h.x, h.y, heroVision(h));
  for (const t of s.towns) if (t.owner === pid) reveal(s, pid, t.x, t.y, 6);
  for (const o of s.objects) if (!o.done && o.kind === 'mine' && o.owner === pid) reveal(s, pid, o.x, o.y, 2);
}

export function isExplored(s: GameState, pid: PlayerId, x: number, y: number): boolean {
  return !!s.players[pid].explored[y * s.w + x];
}
