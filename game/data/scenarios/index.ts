import { newCampaign } from '../../core/adventure';
import type { ScenarioDef } from '../../core/scenario';
import type { CampaignState, HeroCarry } from '../../core/types';
import { S1 } from './s1';
import { S2 } from './s2';
import { S3 } from './s3';

export const SCENARIOS: Record<string, ScenarioDef> = { s1: S1, s2: S2, s3: S3 };
export const SCENARIO_ORDER = ['s1', 's2', 's3'];

export function getScenario(id: string): ScenarioDef {
  const s = SCENARIOS[id];
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}

const MISH_S2: HeroCarry = {
  level: 4, xp: 4700, att: 3, def: 2, pow: 2, kno: 3,
  skills: { leadership: 1, cartography: 1, offense: 1 },
  spells: ['heal', 'shield'], artifacts: ['medallion', 'featherQuill', 'acornHelm'],
};
const ISK_S2: HeroCarry = {
  level: 3, xp: 2400, att: 2, def: 1, pow: 3, kno: 3,
  skills: { cartography: 1, archery: 1, sorcery: 1 },
  spells: ['bless', 'arrow'], artifacts: ['compass'],
};
const MISH_S3: HeroCarry = {
  level: 7, xp: 10100, att: 5, def: 4, pow: 3, kno: 4,
  skills: { leadership: 2, cartography: 2, offense: 2, armor: 1 },
  spells: ['heal', 'shield', 'haste', 'arrow'], artifacts: ['medallion', 'featherQuill', 'acornHelm', 'bellCharm'],
};
const ISK_S3: HeroCarry = {
  level: 6, xp: 6500, att: 4, def: 2, pow: 4, kno: 4,
  skills: { cartography: 2, archery: 2, sorcery: 1, luck: 1 },
  spells: ['bless', 'arrow', 'fireflies', 'slow'], artifacts: ['compass', 'owlLens'],
};

/**
 * Campaign state for starting a chapter directly (the book path: honest, kind and patient).
 * If the player's own campaign already finished the previous chapter, that one is used instead.
 */
export function presetCampaign(id: string, own?: CampaignState): CampaignState {
  const idx = SCENARIO_ORDER.indexOf(id);
  if (own && (idx === 0 || own.completed.includes(SCENARIO_ORDER[idx - 1]))) return structuredClone(own);
  const c = newCampaign(own?.difficulty ?? 'normal');
  if (id === 's1') return c;
  c.completed = ['s1'];
  c.flags = { iskritsa_joined: true, zelendol_truth: true, shushulka_done: true, has_zdravets: true, letko_stay: true, letko_done: true, letokril_friend: true };
  c.virtues = { courage: 2, honesty: 2, kindness: 2, wisdom: 1 };
  c.items = ['zdravets'];
  c.carry = { mishkontin: MISH_S2, iskritsa: ISK_S2 };
  if (id === 's3') {
    c.completed.push('s2');
    Object.assign(c.flags, { plan_ready: true, zub_done: true, zub_forgiven: true });
    c.virtues = { courage: 4, honesty: 2, kindness: 5, wisdom: 2 };
    c.items.push('ladder');
    c.carry = { mishkontin: MISH_S3, iskritsa: ISK_S3 };
  }
  return c;
}
