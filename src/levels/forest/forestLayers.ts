/**
 * Visual layer stack of the forest, back to front. Single source of truth for
 * draw order (depth) and parallax (scroll factors); also listed by the debug
 * overlay so layers can be identified while tuning.
 *
 * Scroll factor 1 = moves with the gameplay world. Lower = further away.
 */
export interface VisualLayer {
  id: string;
  label: string;
  depth: number;
  scrollX: number;
  scrollY: number;
}

export const ForestLayers = {
  sky: { id: 'sky', label: '0 Sky', depth: -100, scrollX: 0.05, scrollY: 0.02 },
  mountains: { id: 'mountains', label: '1 Mountains + Sirengrad', depth: -90, scrollX: 0.1, scrollY: 0.05 },
  distantForest: { id: 'distantForest', label: '2 Distant forest', depth: -80, scrollX: 0.2, scrollY: 0.1 },
  midForest: { id: 'midForest', label: '3 Mid forest', depth: -70, scrollX: 0.4, scrollY: 0.2 },
  backDecor: { id: 'backDecor', label: '4b Back trees/waterfalls', depth: -40, scrollX: 0.85, scrollY: 0.85 },
  terrain: { id: 'terrain', label: '4 Gameplay terrain', depth: 0, scrollX: 1, scrollY: 1 },
  gameplay: { id: 'gameplay', label: '4 Mishkontin + objects', depth: 5, scrollX: 1, scrollY: 1 },
  foreground: { id: 'foreground', label: '5 Foreground', depth: 20, scrollX: 1.12, scrollY: 1 },
} as const satisfies Record<string, VisualLayer>;

export const FOREST_LAYER_LIST: readonly VisualLayer[] = Object.values(ForestLayers);

/** Depths between named layers, for effects that sit in between. */
export const ForestDepth = {
  haze: -86,
  /**
   * Ravine back walls: in front of the back decoration (trees, waterfall
   * pools) and behind the terrain, so nothing's flat-cut bottom edge shows
   * inside a gap - the art disappears behind the ravine wall instead.
   */
  ravine: -30,
  lightShafts: -75,
  water: -20,
  waterSurface: -19,
  terrainFill: 0,
  terrainShade: 1,
  terrainCap: 2,
  platform: 3,
  groundDecorBack: 4,
  groundDecor: 5,
  effects: 8,
  sunWash: 30,
} as const;
