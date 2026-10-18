import { describe, expect, it } from 'vitest';
import {
  actMelee,
  actShoot,
  activeUnit,
  alive,
  autoResolve,
  computeDamage,
  hexDistance,
  hexIndex,
  hexNeighbors,
  killsFor,
  reachable,
  spellDamage,
  castSpell,
  type BUnit,
} from '../game/core/combat';
import { creature } from '../game/data/creatures';
import { freshState, mish, rawBattle } from './helpers';

function place(u: BUnit, q: number, r: number) {
  u.q = q;
  u.r = r;
}

describe('hex grid', () => {
  it('measures distances and neighbours in odd-r layout', () => {
    expect(hexDistance(0, 0, 3, 0)).toBe(3);
    expect(hexDistance(0, 0, 0, 2)).toBe(2);
    expect(hexDistance(2, 1, 3, 2)).toBe(1); // odd row shifted right
    expect(hexNeighbors(5, 4)).toHaveLength(6);
    expect(hexNeighbors(0, 0).length).toBeLessThan(6);
    for (const [q, r] of hexNeighbors(5, 3)) expect(hexDistance(5, 3, q, r)).toBe(1);
  });
});

describe('damage formula (HoMM3 style)', () => {
  it('scales with attack vs defence', () => {
    const s = freshState();
    const b = rawBattle(s, [['mouse', 10]], [['mouse', 10]]);
    const [a, t] = b.units;
    const even = computeDamage(s, b, a, t, { ranged: false, moved: 0, estimate: 'avg' }).dmg;
    expect(even).toBe(20); // 10 × avg(1..3), att 3 = def 3
    const strong = rawBattle(s, [['mouse', 10]], [['rat', 10]]); // rat def 2 → +5%
    expect(computeDamage(s, strong, strong.units[0], strong.units[1], { ranged: false, moved: 0, estimate: 'avg' }).dmg).toBe(21);
    const vsGuard = rawBattle(s, [['mouse', 10]], [['guard', 1]]); // def 12 vs att 3 → −22.5%
    expect(computeDamage(s, vsGuard, vsGuard.units[0], vsGuard.units[1], { ranged: false, moved: 0, estimate: 'avg' }).dmg).toBe(16);
  });

  it('halves ranged damage against shields and for shooters in melee', () => {
    const s = freshState();
    const b = rawBattle(s, [['squirrel', 10]], [['vole', 10], ['rat', 10]]);
    const [sq, vole, rat] = b.units;
    place(sq, 3, 4);
    place(vole, 6, 4);
    place(rat, 6, 2);
    const vsVole = computeDamage(s, b, sq, vole, { ranged: true, moved: 0, estimate: 'max' }).dmg;
    const melee = computeDamage(s, b, sq, vole, { ranged: false, moved: 0, estimate: 'max' }).dmg;
    expect(vsVole).toBe(melee); // shield halves ranged, shooter halves melee
    const vsRat = computeDamage(s, b, sq, rat, { ranged: true, moved: 0, estimate: 'max' }).dmg;
    expect(vsRat).toBeGreaterThan(vsVole * 1.5);
  });

  it('counts kills from damage', () => {
    const s = freshState();
    const b = rawBattle(s, [['mouse', 1]], [['vole', 5]]);
    const t = b.units[1];
    expect(killsFor(t, 11)).toBe(0);
    expect(killsFor(t, 12)).toBe(1);
    expect(killsFor(t, 12 * 5)).toBe(5);
  });
});

describe('actions', () => {
  it('lets a defender retaliate once per round', () => {
    const s = freshState();
    const b = rawBattle(s, [['hare', 5]], [['rat', 30]]);
    const hare = b.units[0];
    const rats = b.units[1];
    place(hare, 5, 4);
    place(rats, 6, 4);
    b.active = hare.uid;
    const hpOf = (u: BUnit) => (u.n - 1) * creature(u.cid).hp + u.hpTop;
    const before = hpOf(hare);
    expect(actMelee(s, b, rats.uid, hexIndex(5, 4))).toBe(true);
    expect(rats.retaliated).toBe(1);
    expect(hpOf(hare)).toBeLessThan(before);
  });

  it('veterans strike twice and the throne guards answer every blow', () => {
    const s = freshState();
    const b = rawBattle(s, [['veteran', 3]], [['guard', 2]]);
    const [vet, guard] = b.units;
    place(vet, 5, 4);
    place(guard, 6, 4);
    b.active = vet.uid;
    actMelee(s, b, guard.uid, hexIndex(5, 4));
    expect(guard.retaliated).toBe(2);
  });

  it("trappers' nets slow the target", () => {
    const s = freshState();
    const b = rawBattle(s, [['trapper', 6]], [['hare', 3]]);
    const [trap, hare] = b.units;
    b.active = trap.uid;
    expect(actShoot(s, b, hare.uid)).toBe(true);
    expect(hare.effects.some((e) => e.id === 'web')).toBe(true);
  });

  it('shooters use ammunition and cannot shoot when an enemy is adjacent', () => {
    const s = freshState();
    const b = rawBattle(s, [['squirrel', 6]], [['rat', 10]]);
    const [sq, rats] = b.units;
    b.active = sq.uid;
    expect(actShoot(s, b, rats.uid)).toBe(true);
    expect(sq.shots).toBe(9);
    place(sq, 5, 4);
    place(rats, 6, 4);
    b.active = sq.uid;
    expect(actShoot(s, b, rats.uid)).toBe(false);
  });

  it('flyers reach any free hex within speed, walkers path around units', () => {
    const s = freshState();
    const b = rawBattle(s, [['eagle', 1], ['mouse', 1]], [['rat', 1]]);
    const eagle = b.units[0];
    expect(reachable(s, b, eagle).size).toBeGreaterThan(40);
    const mouse = b.units[1];
    for (const [hex, path] of reachable(s, b, mouse)) {
      expect(path.length).toBeLessThanOrEqual(5);
      expect(path[path.length - 1]).toBe(hex);
    }
  });

  it('spells deal 10 + 10 × power and cost spell points', () => {
    const s = freshState();
    const h = mish(s);
    h.spells.push('arrow');
    const b = rawBattle(s, [['mouse', 5]], [['guard', 2]], h);
    const guard = b.units[1];
    const sp = h.sp;
    const dmg = spellDamage(h, 'arrow');
    expect(dmg).toBe(10 + 10 * 1);
    const before = guard.n * creature('guard').hp;
    expect(castSpell(s, b, 0, 'arrow', hexIndex(guard.q, guard.r))).toBe(true);
    expect(before - ((guard.n - 1) * creature('guard').hp + guard.hpTop)).toBe(dmg);
    expect(h.sp).toBe(sp - 5);
    expect(castSpell(s, b, 0, 'arrow', hexIndex(guard.q, guard.r))).toBe(false); // one per round
  });
});

describe('auto-combat', () => {
  it('a much bigger army wins and the battle ends', () => {
    const s = freshState(3);
    const b = rawBattle(s, [['eagle', 4], ['squirrel', 20]], [['rat', 20]]);
    autoResolve(s, b);
    expect(b.over).toBe(true);
    expect(b.winner).toBe(0);
    expect(alive(b, 1)).toHaveLength(0);
    expect(activeUnit(b)).toBeNull();
  });
});
