import type { Cost, Faction } from '../core/types';
import { FACTION_LINE } from './creatures';

export interface BuildingDef {
  id: string;
  cost: Cost;
  requires: string[];
  desc: string;
  /** Hidden from the build list (story buildings). */
  special?: boolean;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  hall: { id: 'hall', cost: {}, requires: [], desc: '+500 трохи на ден.' },
  hall2: { id: 'hall2', cost: { acorns: 2000, wood: 5, stone: 5 }, requires: ['hall', 'market'], desc: '+1000 трохи на ден (вместо 500).' },
  fort: { id: 'fort', cost: { acorns: 1200, wood: 8 }, requires: [], desc: 'Защитниците на града получават +3 защита.' },
  fort2: { id: 'fort2', cost: { acorns: 2000, stone: 10 }, requires: ['fort'], desc: 'Още +2 защита и стрелкова кула при обсада.' },
  market: { id: 'market', cost: { acorns: 500, wood: 5 }, requires: [], desc: 'Размяна на ресурси.' },
  workshop: { id: 'workshop', cost: { acorns: 800, stone: 4 }, requires: [], desc: '+1 клонка и +1 камъче на ден.' },
  library: { id: 'library', cost: { acorns: 1000, wood: 4, stone: 4 }, requires: [], desc: 'Героите научават магии от 1-во ниво.' },
  library2: { id: 'library2', cost: { acorns: 1500, wood: 4, stone: 4, cheese: 2 }, requires: ['library'], desc: 'Магии от 2-ро ниво.' },
  granary: { id: 'granary', cost: { acorns: 1500, wood: 5, stone: 5 }, requires: ['fort'], desc: '+50% седмичен прираст на всички същества.' },
  tavern: { id: 'tavern', cost: { acorns: 500, wood: 5 }, requires: [], desc: 'Наемане на герои.' },
  d1: { id: 'd1', cost: { acorns: 300, wood: 4 }, requires: [], desc: '' },
  d2: { id: 'd2', cost: { acorns: 600, wood: 5 }, requires: ['d1'], desc: '' },
  d3: { id: 'd3', cost: { acorns: 900, wood: 5, stone: 3 }, requires: ['d1'], desc: '' },
  d4: { id: 'd4', cost: { acorns: 1600, wood: 5, stone: 5 }, requires: ['d2', 'fort'], desc: '' },
  d5: { id: 'd5', cost: { acorns: 2500, stone: 10, cheese: 3 }, requires: ['d3', 'd4'], desc: '' },
  cheese: { id: 'cheese', cost: {}, requires: [], desc: '+2 сирене на ден, +1 морал на защитниците.', special: true },
};

export const BUILD_ORDER = ['hall2', 'fort', 'fort2', 'market', 'workshop', 'library', 'library2', 'granary', 'tavern', 'd1', 'd2', 'd3', 'd4', 'd5'];

export const BUILDING_NAMES: Record<'forest' | 'rats', Record<string, string>> = {
  forest: {
    hall: 'Мелничното колело', hall2: 'Големият воденичен камък', fort: 'Портата от две кори', fort2: 'Каменният праг',
    market: 'Пазарът на трохите', workshop: 'Работилницата на татко', library: 'Приказките на мама', library2: 'Картите на Картографа',
    granary: 'Чувалите с брашно', tavern: 'Странноприемницата', d1: 'Нората на полските мишки', d2: 'Ходниците на полевките',
    d3: 'Катеричият бор', d4: 'Заешката ливада', d5: 'Орловото гнездо', cheese: 'Вечната пита',
  },
  rats: {
    hall: 'Купчините плячка', hall2: 'Съкровищницата на Мортис', fort: 'Ограда от ръждиви капани', fort2: 'Черните скали',
    market: 'Черният пазар', workshop: 'Ковачницата за клетки', library: 'Свитъците на краля', library2: 'Кулата на сенките',
    granary: 'Хамбарът с ядки', tavern: 'Казармата', d1: 'Тунелите', d2: 'Залата на копиеносците',
    d3: 'Капанджийницата', d4: 'Белязаните казарми', d5: 'Тронната стража', cheese: 'Вечната пита',
  },
};

export function buildingName(faction: Faction, id: string): string {
  const f = faction === 'rats' ? 'rats' : 'forest';
  return BUILDING_NAMES[f][id] ?? id;
}

export function dwellingCreature(faction: Faction, b: string): string | null {
  if (!/^d[1-5]$/.test(b)) return null;
  const line = FACTION_LINE[faction === 'rats' ? 'rats' : 'forest'];
  return line[Number(b[1]) - 1];
}

export function buildingDesc(faction: Faction, id: string): string {
  const cid = dwellingCreature(faction, id);
  if (cid) return 'Жилище: позволява наемане на същества.';
  return BUILDINGS[id]?.desc ?? '';
}

export const TAVERN_HERO_COST = 2000;

/** Market exchange rates: how many crumbs one unit is worth when sold / bought. */
export const MARKET_RATE = { wood: { sell: 60, buy: 250 }, stone: { sell: 60, buy: 250 }, cheese: { sell: 150, buy: 600 } };
