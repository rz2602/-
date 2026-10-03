import type { LevelDef } from './LevelTypes';

/**
 * ForestTestScene layout - a movement/camera/art test course, not a story level.
 *
 * Design limits with the default movement values (jump ~105 px high, ~200 px
 * long at equal height): step-ups <= 80 px, normal gaps <= 140 px, and one
 * ~190 px "big jump" over a pit with a safe floor and steps back up.
 *
 * A river runs below the whole level and is visible in every gap; touching it
 * respawns Mishkontin at the last checkpoint (no swimming yet).
 *
 * Composition areas (v0.1.1 art pass):
 *   A  Forest entrance     - giant tree, lantern, sign, practice platforms
 *   B  First gap           - a stream with rocks
 *   C  Vertical platforms  - climb onto a plateau, distant waterfall
 *   E  Checkpoint clearing - waystone in a shaft of sunlight
 *      Gap series, big safe jump, optional lookout
 *   D  Bridge              - rope bridge over the river, waterfall behind
 *      Log hollow, ridge with terrace steps
 *   F  Final viewpoint     - high cliff facing distant Sirengrad
 */
export const FOREST_TEST_LEVEL: LevelDef = {
  id: 'forest-test',
  width: 13320,
  height: 1400,
  cameraBottom: 1300,
  waterSurfaceY: 1252,
  spawn: { x: 180, y: 1100 },

  terrain: [
    { x: 0, width: 1500, top: 1100 }, // 0 A entrance
    { x: 1610, width: 900, top: 1060 }, // 1 after the stream (gap 110)
    { x: 2640, width: 800, top: 1100 }, // 2 C (gap 130)
    { x: 3440, width: 700, top: 900 }, // 3 C plateau (cliff from #2)
    { x: 4140, width: 1100, top: 1100 }, // 4 E checkpoint clearing (drop 200)
    { x: 5360, width: 280, top: 1080 }, // 5 gap series
    { x: 5760, width: 280, top: 1050 }, // 6
    { x: 6170, width: 750, top: 1050 }, // 7 big-jump run-up
    { x: 6920, width: 190, top: 1230 }, // 8 big-jump pit floor (safe)
    { x: 7110, width: 900, top: 1070 }, // 9 big-jump landing + lookout
    { x: 8150, width: 600, top: 1100 }, // 10 D after the bridge
    { x: 8750, width: 960, top: 1240 }, // 11 safe hollow under the logs
    { x: 9710, width: 710, top: 1080 }, // 12 landing after the logs
    { x: 10420, width: 900, top: 850 }, // 13 high ridge (cliff from #12)
    { x: 11320, width: 300, top: 930 }, // 14 terrace step down
    { x: 11620, width: 300, top: 1010 }, // 15 terrace step down
    { x: 11920, width: 400, top: 1080 }, // 16 foot of the viewpoint cliff
    { x: 12320, width: 1000, top: 870 }, // 17 F final viewpoint
  ],

  platforms: [
    // A practice
    { x: 560, y: 1020, width: 200 },
    { x: 860, y: 950, width: 200 },
    { x: 1160, y: 1020, width: 180 },
    // C climb onto the plateau
    { x: 2900, y: 1030, width: 180 },
    { x: 3150, y: 960, width: 180 },
    // step out of the big-jump pit
    { x: 7020, y: 1150, width: 90 },
    // optional lookout
    { x: 7300, y: 990, width: 160 },
    { x: 7520, y: 915, width: 160 },
    { x: 7300, y: 840, width: 160 },
    { x: 7520, y: 765, width: 160 },
    // D rope bridge (simple flat collision)
    { x: 7990, y: 1072, width: 180, style: 'bridge' },
    // log hops + way out of the hollow
    { x: 8880, y: 1060, width: 150 },
    { x: 9130, y: 1020, width: 150 },
    { x: 9380, y: 1060, width: 150 },
    { x: 9570, y: 1160, width: 140 },
    // climb onto the ridge
    { x: 9950, y: 1000, width: 160 },
    { x: 10180, y: 925, width: 160 },
    { x: 10700, y: 770, width: 160 },
    { x: 10950, y: 700, width: 160 },
    // F climb onto the viewpoint
    { x: 12080, y: 1000, width: 160 },
    { x: 12175, y: 925, width: 140 },
  ],

  checkpoints: [{ id: 'forest-test-cp1', x: 4560, y: 1100 }],
  finish: { x: 12620, y: 870 },

  decorations: [
    // ---- A forest entrance ----
    { key: 'tree_large_01', x: 150, y: 1100, scale: 2.4 },
    { key: 'lantern_post', x: 380, y: 1100 },
    { key: 'wooden_sign', x: 470, y: 1100 },
    { key: 'mushroom_red', x: 40, y: 1100 },
    { key: 'flowers_white', x: 250, y: 1100 },
    { key: 'flowers_pink', x: 540, y: 1100 },
    { key: 'bush_01', x: 700, y: 1100 },
    { key: 'rock_large', x: 1020, y: 1100 },
    { key: 'bush_wide', x: 1280, y: 1100 },
    { key: 'pine_tree', layer: 'back', x: 760, y: 1100, scale: 2.2 },
    { key: 'tree_large_02', layer: 'back', x: 1180, y: 1100, scale: 2.1 },
    { key: 'fg_leaves_left', layer: 'foreground', x: 140, y: 1100 },
    // ---- B first gap (stream) ----
    { key: 'rocks_pair', x: 1455, y: 1100 },
    { key: 'grass_tall', x: 1405, y: 1100 },
    { key: 'rock_mossy', x: 1670, y: 1060 },
    { key: 'flowers_blue', x: 1730, y: 1060 },
    { key: 'bush_02', x: 1960, y: 1060 },
    { key: 'mushroom_orange', x: 2100, y: 1060 },
    { key: 'fern', x: 2330, y: 1060 },
    { key: 'rock_small', x: 2470, y: 1060 },
    { key: 'tree_medium', layer: 'back', x: 2150, y: 1060, scale: 2.1 },
    // ---- C vertical platforms ----
    { key: 'bush_wide', x: 2760, y: 1100 },
    { key: 'tree_stump', x: 3330, y: 1100 },
    { key: 'grass_tall', x: 3400, y: 1100 },
    { key: 'rock_large', x: 3620, y: 900 },
    { key: 'mushroom_red', x: 3900, y: 900 },
    { key: 'flowers_purple', x: 4040, y: 900 },
    { key: 'tree_large_02', layer: 'back', x: 3760, y: 900, scale: 2.3 },
    { key: 'pine_tree', layer: 'back', x: 4080, y: 900, scale: 2.0 },
    // ---- E checkpoint clearing ----
    { key: 'tree_large_01', layer: 'back', x: 4200, y: 1100, scale: 2.0 },
    { key: 'tree_large_02', layer: 'back', x: 5120, y: 1100, scale: 2.0, flipX: true },
    { key: 'rock_medium', x: 4330, y: 1100 },
    { key: 'flowers_white', x: 4440, y: 1100 },
    { key: 'flowers_blue', x: 4690, y: 1100 },
    { key: 'flowers_pink_02', x: 4780, y: 1100 },
    { key: 'bush_blue', x: 4960, y: 1100 },
    { key: 'fg_trunk_right', layer: 'foreground', x: 4950, y: 1100 },
    // ---- gap series ----
    { key: 'pine_tree', layer: 'back', x: 5500, y: 1080, scale: 1.9 },
    { key: 'tree_medium', layer: 'back', x: 5900, y: 1050, scale: 1.9 },
    { key: 'mushroom_small', x: 5520, y: 1080 },
    { key: 'grass_patch', x: 5880, y: 1050 },
    // ---- big safe jump ----
    { key: 'wooden_crate', x: 6330, y: 1050 },
    { key: 'barrel', x: 6420, y: 1050 },
    { key: 'wooden_cart', x: 6620, y: 1050 },
    { key: 'wooden_sign', x: 6850, y: 1050 },
    { key: 'rock_small', x: 6960, y: 1230 },
    { key: 'grass_tuft', x: 7060, y: 1230 },
    // ---- lookout ----
    { key: 'bush_03', x: 7200, y: 1070 },
    { key: 'mushroom_red', x: 7640, y: 765 },
    { key: 'tree_large_02', layer: 'back', x: 7520, y: 1070, scale: 2.4 },
    { key: 'fg_leaves_blur', layer: 'foreground', x: 7360, y: 1070 },
    // ---- D bridge ----
    { key: 'lantern_post', x: 7940, y: 1070 },
    { key: 'fence_post', x: 8205, y: 1100 },
    { key: 'pine_tree', layer: 'back', x: 8330, y: 1100, scale: 2.2 },
    { key: 'wooden_fence', x: 8330, y: 1100 },
    { key: 'flowers_white', x: 8470, y: 1100 },
    { key: 'mushroom_orange', x: 8640, y: 1100 },
    // ---- log hollow ----
    { key: 'fern', x: 8830, y: 1240 },
    { key: 'fallen_log', x: 9020, y: 1240 },
    { key: 'mushroom_red', x: 9230, y: 1240 },
    { key: 'rock_large', x: 9450, y: 1240 },
    // ---- ridge ----
    { key: 'wooden_sign', x: 9800, y: 1080 },
    { key: 'bush_02', x: 10080, y: 1080 },
    { key: 'wooden_crate_small', x: 10330, y: 1080 },
    { key: 'tree_large_01', x: 11120, y: 850, scale: 2.1 },
    { key: 'rock_mossy', x: 10560, y: 850 },
    { key: 'mushroom_red', x: 11010, y: 700 },
    { key: 'flowers_pink', x: 11470, y: 930 },
    { key: 'flowers_white', x: 11760, y: 1010 },
    { key: 'fg_leaves_left', layer: 'foreground', x: 10000, y: 1080, flipX: true },
    // ---- F final viewpoint ----
    { key: 'tree_stump', x: 12000, y: 1080 },
    { key: 'pine_tree', layer: 'back', x: 12230, y: 1080, scale: 2.0 },
    { key: 'lantern_post', x: 12440, y: 870 },
    { key: 'flowers_white', x: 12530, y: 870 },
    { key: 'flowers_pink', x: 12700, y: 870 },
    { key: 'wooden_fence', x: 12860, y: 870 },
    { key: 'fence_post', x: 12945, y: 870 },
    { key: 'rock_mossy', x: 13080, y: 870 },
    { key: 'bush_wide', x: 13240, y: 870 },
  ],

  waterfalls: [
    { x: 3030, y: 1100, scale: 2.4 }, // C distant waterfall
    { x: 8080, y: 1110, scale: 2.7 }, // D behind the bridge, pouring into the river
  ],

  lights: [
    { x: 4560, y: 1110, width: 260, height: 760 }, // E sunlight onto the waystone
    { x: 12640, y: 880, width: 300, height: 700 }, // F warm light on the viewpoint
  ],

  areas: [
    { id: 'A', name: 'Forest entrance', x0: 0, x1: 1450 },
    { id: 'B', name: 'First gap (stream)', x0: 1450, x1: 2640 },
    { id: 'C', name: 'Vertical platforms', x0: 2640, x1: 4140 },
    { id: 'E', name: 'Checkpoint clearing', x0: 4140, x1: 5240 },
    { id: '-', name: 'Gap series + big jump', x0: 5240, x1: 7700 },
    { id: 'D', name: 'Bridge', x0: 7700, x1: 8750 },
    { id: '-', name: 'Log hollow + ridge', x0: 8750, x1: 11920 },
    { id: 'F', name: 'Final viewpoint', x0: 11920, x1: 13320 },
  ],

  scatterOn: [0, 1, 2, 3, 4, 7, 9, 10, 12, 13, 16, 17],
};
