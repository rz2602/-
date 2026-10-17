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
    const vsBear = rawBattle(s, [['mouse', 10]], [['bear', 1]]); // def 12 vs att 3 → −22.5%
    expect(computeDamage(s, vsBear, vsBear.units[0], vsBear.units[1], { ranged: false, moved: 0, estimate: 'avg' }).dmg).toBe(16);
  });

  it('halves ranged damage against shields and for shooters in melee', () => {
    const s = freshState();
    const b = rawBattle(s, [['squirrel', 10]], [['beetle', 10], ['rat', 10]]);
    const [sq, beetle, rat] = b.units;
    place(sq, 3, 4);
    place(beetle, 6, 4);
    place(rat, 6, 2);
    const vsBeetle = computeDamage(s, b, sq, beetle, { ranged: true, moved: 0, estimate: 'max' }).dmg;
    const melee = computeDamage(s, b, sq, beetle, { ranged: false, moved: 0, estimate: 'max' }).dmg;
    expect(vsBeetle).toBe(melee); // shield halves ranged, shooter halves melee
    const vsRat = computeDamage(s, b, sq, rat, { ranged: true, moved: 0, estimate: 'max' }).dmg;
    expect(vsRat).toBeGreaterThan(vsBeetle * 1.5);
  });

  it('counts kills from damage', () => {
    const s = freshState();
    const b = rawBattle(s, [['mouse', 1]], [['hedgehog', 5]]);
    const t = b.units[1];
    expect(killsFor(t, 12)).toBe(0);
    expect(killsFor(t, 13)).toBe(1);
    expect(killsFor(t, 13 * 5)).toBe(5);
  });
});

describe('actions', () => {
  it('lets a defender retaliate once per round (bears always)', () => {
    const s = freshState();
    const b = rawBattle(s, [['wolf', 5]], [['rat', 30]]);
    const wolf = b.units[0];
    const rats = b.units[1];
    place(wolf, 5, 4);
    place(rats, 6, 4);
    b.active = wolf.uid;
    const before = wolf.n;
    expect(actMelee(s, b, rats.uid, hexIndex(5, 4))).toBe(true);
    expect(rats.retaliated).toBe(1);
    expect(wolf.n).toBeLessThan(before);
  });

  it('bats strike without retaliation', () => {
    const s = freshState();
    const b = rawBattle(s, [['bat', 5]], [['rat', 30]]);
    const [bat, rats] = b.units;
    place(bat, 5, 4);
    place(rats, 6, 4);
    b.active = bat.uid;
    actMelee(s, b, rats.uid, hexIndex(5, 4));
    expect(rats.retaliated).toBe(0);
    expect(bat.n).toBe(5);
  });

  it('hedgehog thorns hurt melee attackers', () => {
    const s = freshState();
    const b = rawBattle(s, [['bear', 3]], [['hedgehog', 2]]);
    const [bear, hog] = b.units;
    place(bear, 5, 4);
    place(hog, 6, 4);
    b.active = bear.uid;
    const hpOf = (u: BUnit) => (u.n - 1) * creature(u.cid).hp + u.hpTop;
    const before = hpOf(bear);
    actMelee(s, b, hog.uid, hexIndex(5, 4));
    expect(hog.n).toBe(0); // no retaliation from a dead stack…
    expect(hpOf(bear)).toBeLessThan(before); // …but the thorns still hurt
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
    const b = rawBattle(s, [['owl', 1], ['mouse', 1]], [['rat', 1]]);
    const owl = b.units[0];
    expect(reachable(s, b, owl).size).toBeGreaterThan(40);
    const mouse = b.units[1];
    for (const [hex, path] of reachable(s, b, mouse)) {
      expect(path.length).toBeLessThanOrEqual(5);
      expect(path[path.length - 1]).toBe(hex);
    }
  });

  it('spells deal 10 + 10 × power and cost spell points', () => {
    const s = freshState();
    const h = mish(s);
    const b = rawBattle(s, [['mouse', 5]], [['bear', 2]], h);
    const bear = b.units[1];
    const sp = h.sp;
    const dmg = spellDamage(h, 'arrow');
    expect(dmg).toBe(10 + 10 * 1);
    const before = bear.n * creature('bear').hp;
    expect(castSpell(s, b, 0, 'arrow', hexIndex(bear.q, bear.r))).toBe(true);
    expect(before - ((bear.n - 1) * creature('bear').hp + bear.hpTop)).toBe(dmg);
    expect(h.sp).toBe(sp - 5);
    expect(castSpell(s, b, 0, 'arrow', hexIndex(bear.q, bear.r))).toBe(false); // one per round
  });
});

describe('auto-combat', () => {
  it('a much bigger army wins and the battle ends', () => {
    const s = freshState(3);
    const b = rawBattle(s, [['bear', 4], ['squirrel', 20]], [['rat', 20]]);
    autoResolve(s, b);
    expect(b.over).toBe(true);
    expect(b.winner).toBe(0);
    expect(alive(b, 1)).toHaveLength(0);
    expect(activeUnit(b)).toBeNull();
  });
});
