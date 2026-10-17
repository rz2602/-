import { SAVE_V } from '../core/adventure';
import type { CampaignState, GameState } from '../core/types';
import { SCENARIOS } from '../data/scenarios';

const PREFIX = 'mishkontin.heroes.';
export const SLOTS = ['auto', '1', '2', '3'] as const;
export type Slot = (typeof SLOTS)[number];

export interface SaveMeta {
  slot: Slot;
  scenario: string;
  title: string;
  day: number;
  level: number;
  savedAt: number;
}

function get(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(PREFIX + key, value);
    return true;
  } catch {
    return false;
  }
}

function remove(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function saveGame(s: GameState, slot: Slot): boolean {
  const mish = s.heroes.find((h) => h.id === 'mishkontin');
  const meta: SaveMeta = {
    slot,
    scenario: s.scenario,
    title: SCENARIOS[s.scenario]?.title ?? s.scenario,
    day: s.day,
    level: mish?.level ?? 1,
    savedAt: Date.now(),
  };
  let json: string;
  try {
    json = JSON.stringify(s);
  } catch {
    return false;
  }
  return set(`save.${slot}`, json) && set(`meta.${slot}`, JSON.stringify(meta));
}

export function loadGame(slot: Slot): GameState | null {
  const json = get(`save.${slot}`);
  if (!json) return null;
  try {
    const s = JSON.parse(json) as GameState;
    if (s.v !== SAVE_V || !SCENARIOS[s.scenario] || !Array.isArray(s.heroes) || !Array.isArray(s.objects) || typeof s.terrain !== 'string') return null;
    s.vars ??= {};
    s.dayBonus ??= {};
    s.toasts = [];
    return s;
  } catch {
    return null;
  }
}

export function listSaves(): SaveMeta[] {
  const out: SaveMeta[] = [];
  for (const slot of SLOTS) {
    const m = get(`meta.${slot}`);
    if (!m) continue;
    try {
      out.push(JSON.parse(m) as SaveMeta);
    } catch {
      // ignore broken meta
    }
  }
  return out;
}

export function latestSave(): SaveMeta | null {
  const list = listSaves();
  return list.length ? list.reduce((a, b) => (a.savedAt > b.savedAt ? a : b)) : null;
}

export function deleteSave(slot: Slot): void {
  remove(`save.${slot}`);
  remove(`meta.${slot}`);
}

/** Campaign progress between chapters (carried heroes, flags, virtues). */
export function saveCampaign(c: CampaignState, nextScenario: string | null): void {
  set('campaign', JSON.stringify({ c, next: nextScenario }));
}

export function loadCampaign(): { c: CampaignState; next: string | null } | null {
  const json = get('campaign');
  if (!json) return null;
  try {
    return JSON.parse(json) as { c: CampaignState; next: string | null };
  } catch {
    return null;
  }
}

export function getSetting(key: string, fallback: string): string {
  return get(`set.${key}`) ?? fallback;
}

export function setSetting(key: string, value: string): void {
  set(`set.${key}`, value);
}
