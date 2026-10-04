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
    // Forest Environment Asset Kit (production art, sized by world height in
    // logical px). Authored clusters, deterministic - no random placement here.
    // ---- A forest entrance ----
    { key: 'tree_oak_01', x: 150, y: 1100, height: 545 },
    { key: 'env_mushrooms_01', x: 50, y: 1100, height: 40 },
    { key: 'env_flowers_01', x: 270, y: 1100, height: 34 },
    { key: 'env_signpost', x: 470, y: 1100 },
    { key: 'env_grass_01', x: 540, y: 1100 },
    { key: 'env_bush_01', x: 720, y: 1100 },
    { key: 'env_rock_medium_01', x: 1010, y: 1100 },
    { key: 'env_fern_01', x: 1075, y: 1100, height: 58 },
    { key: 'env_bush_02', x: 1270, y: 1100 },
    { key: 'env_rock_small_01', x: 1390, y: 1100, height: 36 },
    { key: 'env_grass_02', x: 1440, y: 1100, height: 34 },
    { key: 'tree_pine_01', layer: 'back', x: 760, y: 1100, height: 490 },
    { key: 'tree_oak_02', layer: 'back', x: 1180, y: 1100, height: 460 },
    { key: 'env_rock_large_02', layer: 'back', x: 980, y: 1100, height: 110 },
    { key: 'env_fg_fern_left', layer: 'foreground', x: 40, y: 1100, height: 190 },
    { key: 'env_fg_branch', layer: 'foreground', x: 180, y: 1100, height: 230 },
    // ---- B first gap (stream) ----
    { key: 'env_rock_small_02', x: 1680, y: 1060, height: 40 },
    { key: 'env_flowers_02', x: 1740, y: 1060, height: 32 },
    { key: 'env_fern_02', x: 1960, y: 1060 },
    { key: 'env_mushrooms_01', x: 2090, y: 1060, height: 38 },
    { key: 'env_bush_01', x: 2340, y: 1060, height: 60, flipX: true },
    { key: 'env_grass_01', x: 2440, y: 1060 },
    { key: 'tree_oak_02', layer: 'back', x: 2150, y: 1060, height: 435, flipX: true },
    // ---- C vertical platforms ----
    { key: 'env_fern_01', x: 2730, y: 1100 },
    { key: 'env_tree_stump', x: 3320, y: 1100 },
    { key: 'env_grass_02', x: 3395, y: 1100 },
    { key: 'env_rock_cluster_01', x: 3600, y: 900, height: 72 },
    { key: 'env_mushrooms_01', x: 3900, y: 900 },
    { key: 'env_flowers_01', x: 4030, y: 900 },
    { key: 'env_vines_01', x: 4105, y: 925, hang: true },
    { key: 'tree_oak_03', layer: 'back', x: 3760, y: 900, height: 505 },
    { key: 'tree_pine_01', layer: 'back', x: 4080, y: 900, height: 450 },
    // ---- E checkpoint clearing (kept open around the waystone) ----
    { key: 'tree_oak_01', layer: 'back', x: 4200, y: 1100, height: 455 },
    { key: 'tree_oak_03', layer: 'back', x: 5120, y: 1100, height: 440, flipX: true },
    { key: 'tree_ancient_01', layer: 'back', x: 4880, y: 1100, height: 400 },
    { key: 'env_rock_medium_02', x: 4320, y: 1100, height: 62 },
    { key: 'env_flowers_02', x: 4400, y: 1100 },
    { key: 'env_flowers_01', x: 4720, y: 1100 },
    { key: 'env_grass_01', x: 4800, y: 1100 },
    { key: 'env_bush_02', x: 4990, y: 1100 },
    { key: 'env_fg_fern_right', layer: 'foreground', x: 5180, y: 1100, height: 230 },
    // ---- gap series (rock-pillar islands) ----
    { key: 'tree_pine_01', layer: 'back', x: 5500, y: 1080, height: 425 },
    { key: 'tree_oak_01', layer: 'back', x: 5900, y: 1050, height: 420, flipX: true },
    { key: 'env_grass_02', x: 5500, y: 1080, height: 32 },
    { key: 'env_flowers_02', x: 5900, y: 1050, height: 30 },
    { key: 'env_fg_fern_left', layer: 'foreground', x: 5700, y: 1050, height: 220 },
    // ---- big safe jump (a traveller's rest: the only crate and barrel) ----
    { key: 'env_wood_crate', x: 6320, y: 1050 },
    { key: 'env_barrel', x: 6392, y: 1050 },
    { key: 'env_fallen_log', x: 6620, y: 1050 },
    { key: 'env_rock_small_01', x: 6850, y: 1050, height: 38 },
    { key: 'env_rock_small_02', x: 6950, y: 1230, height: 34 },
    { key: 'env_grass_01', x: 7070, y: 1230, height: 30 },
    // ---- lookout ----
    { key: 'env_bush_01', x: 7190, y: 1070 },
    { key: 'env_bush_02', layer: 'back', x: 7020, y: 1070, height: 130 },
    { key: 'env_bush_01', layer: 'back', x: 7230, y: 1070, height: 120, flipX: true },
    { key: 'env_mushrooms_01', x: 7640, y: 765, height: 30 },
    { key: 'tree_oak_02', layer: 'back', x: 7520, y: 1070, height: 528 },
    { key: 'env_fg_flower_cluster_01', layer: 'foreground', x: 7240, y: 1070 },
    // ---- D bridge (post - rope span - post) ----
    { key: 'env_lantern_post', x: 7930, y: 1070, height: 170 },
    { key: 'env_bridge_post', x: 7978, y: 1070, height: 92 },
    { key: 'env_bridge_post', x: 8184, y: 1100, height: 100, flipX: true },
    { key: 'tree_pine_01', layer: 'back', x: 8330, y: 1100, height: 490 },
    { key: 'env_fence_02', x: 8340, y: 1100 },
    { key: 'env_flowers_01', x: 8480, y: 1100 },
    { key: 'env_mushrooms_01', x: 8620, y: 1100, height: 36 },
    // ---- log hollow ----
    { key: 'env_fern_01', x: 8830, y: 1240, height: 60 },
    { key: 'env_fallen_log', x: 9020, y: 1240, height: 66 },
    { key: 'env_mushrooms_01', x: 9240, y: 1240, height: 34 },
    { key: 'env_rock_cluster_01', x: 9450, y: 1240, height: 58 },
    // ---- ridge ----
    { key: 'env_signpost', x: 9790, y: 1080, height: 125 },
    { key: 'env_bush_02', x: 10080, y: 1080, height: 60 },
    { key: 'env_rock_small_01', x: 10330, y: 1080, height: 40 },
    { key: 'env_rock_large_01', layer: 'back', x: 10250, y: 1080, height: 120 },
    { key: 'tree_oak_03', x: 11120, y: 850, height: 477 },
    { key: 'env_rock_medium_01', x: 10570, y: 850, height: 58 },
    { key: 'env_fern_02', x: 10650, y: 850, height: 56 },
    { key: 'env_flowers_02', x: 11030, y: 700, height: 26 },
    { key: 'env_flowers_01', x: 11470, y: 930, height: 30 },
    { key: 'env_grass_02', x: 11760, y: 1010, height: 32 },
    { key: 'env_fg_grass_cluster_01', layer: 'foreground', x: 10000, y: 1080 },
    // ---- F final viewpoint (Sirengrad vista) ----
    { key: 'env_tree_stump', x: 11990, y: 1080, height: 58 },
    { key: 'tree_pine_01', layer: 'back', x: 12230, y: 1080, height: 450 },
    { key: 'env_lantern_post', x: 12440, y: 870, height: 175 },
    { key: 'env_flowers_01', x: 12530, y: 870 },
    { key: 'env_flowers_02', x: 12720, y: 870 },
    { key: 'env_fence_01', x: 12900, y: 870 },
    { key: 'env_rock_cluster_01', x: 13080, y: 870, height: 66 },
    { key: 'env_bush_01', x: 13240, y: 870, height: 62 },
    { key: 'env_fg_flower_cluster_01', layer: 'foreground', x: 13260, y: 870, height: 250 },
  ],

  waterfalls: [
    { x: 3030, y: 1100, height: 267 }, // C distant waterfall (same world width as before: ~475)
    { x: 8080, y: 1110, height: 301 }, // D behind the bridge (~535 wide, as before)
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
