import { newCampaign } from '../../core/adventure';
import type { ScenarioDef } from '../../core/scenario';
import type { CampaignState, HeroCarry } from '../../core/types';
import { S1 } from './s1';

export const SCENARIOS: Record<string, ScenarioDef> = { s1: S1 };
export const SCENARIO_ORDER = ['s1'];

export function getScenario(id: string): ScenarioDef {
  const s = SCENARIOS[id];
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}

const MISH_S2: HeroCarry = {
  level: 4, xp: 4700, att: 3, def: 2, pow: 2, kno: 3,
  skills: { cartography: 2, leadership: 1, offense: 1 },
  spells: ['farsight', 'arrow', 'shield', 'heal'], artifacts: ['medallion', 'acornHelm'],
};
const MISH_S3: HeroCarry = {
  level: 7, xp: 10100, att: 5, def: 4, pow: 3, kno: 4,
  skills: { cartography: 3, leadership: 2, offense: 2, armor: 1 },
  spells: ['farsight', 'arrow', 'shield', 'heal', 'haste', 'slow'], artifacts: ['medallion', 'acornHelm', 'mossBoots'],
};
const ISK_S3: HeroCarry = {
  level: 5, xp: 5200, att: 4, def: 1, pow: 3, kno: 2,
  skills: { archery: 2, offense: 1, sorcery: 1 },
  spells: ['fireflies', 'arrow'], artifacts: ['clover'],
};

/**
 * Campaign state for starting a chapter directly. If the player's own campaign
 * already finished the previous chapter, that one is used instead.
 */
export function presetCampaign(id: string, own?: CampaignState): CampaignState {
  const idx = SCENARIO_ORDER.indexOf(id);
  if (own && (idx === 0 || own.completed.includes(SCENARIO_ORDER[idx - 1]))) return structuredClone(own);
  const c = newCampaign(own?.difficulty ?? 'normal');
  if (id === 's1') return c;
  c.completed = ['s1'];
  c.flags = { letokril_freed: true, letokril_trust: true, grizan_fed: true, troshko_helped: true, mouselings_done: true };
  c.virtues = { courage: 1, kindness: 3, wisdom: 1 };
  c.items = ['map1', 'map2', 'map3'];
  c.carry = { mishkontin: MISH_S2 };
  if (id === 's3') {
    c.completed.push('s2');
    Object.assign(c.flags, { iskritsa_joined: true, iskritsa_planned: true, letokril_friend: true, troshko_friend: true });
    c.virtues = { courage: 2, kindness: 4, wisdom: 3 };
    c.carry = { mishkontin: MISH_S3, iskritsa: ISK_S3 };
  }
  return c;
}
