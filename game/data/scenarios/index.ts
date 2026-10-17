import type { ScenarioDef } from '../../core/scenario';
import { S1 } from './s1';

export const SCENARIOS: Record<string, ScenarioDef> = { s1: S1 };
export const SCENARIO_ORDER = ['s1'];

export function getScenario(id: string): ScenarioDef {
  const s = SCENARIOS[id];
  if (!s) throw new Error(`Unknown scenario ${id}`);
  return s;
}
