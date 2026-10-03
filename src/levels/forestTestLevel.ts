import type { LevelDef } from './LevelTypes';

/**
 * ForestTestScene layout - a movement/camera test course, not a story level.
 *
 * Design limits with the default movement values (jump ~105 px high, ~200 px
 * long at equal height): step-ups <= 80 px, normal gaps <= 140 px, and one
 * ~190 px "big jump" over a pit with a safe floor and steps back up.
 *
 * Sections (left -> right):
 *   1. Start meadow with practice platforms
 *   2. Two small gaps with height changes
 *   3. Platform climb onto a high plateau, then drop down
 *   4. CHECKPOINT meadow
 *   5. Series of small gaps
 *   6. The big (safe) jump
 *   7. Optional lookout climb
 *   8. Log hops over a safe hollow
 *   9. Platform climb onto a high ridge, then terrace steps down
 *  10. Finish meadow
 */
export const FOREST_TEST_LEVEL: LevelDef = {
  id: 'forest-test',
  width: 13320,
  height: 1400,
  cameraBottom: 1300,
  spawn: { x: 180, y: 1100 },

  terrain: [
    { x: 0, width: 1500, top: 1100 }, // 0 start meadow
    { x: 1610, width: 900, top: 1060 }, // 1 after small gap (110)
    { x: 2640, width: 800, top: 1100 }, // 2 after small gap (130)
    { x: 3440, width: 700, top: 900 }, // 3 high plateau (cliff from #2)
    { x: 4140, width: 1100, top: 1100 }, // 4 checkpoint meadow (drop 200)
    { x: 5360, width: 280, top: 1080 }, // 5 small gap series
    { x: 5760, width: 280, top: 1050 }, // 6
    { x: 6170, width: 750, top: 1050 }, // 7 big-jump run-up
    { x: 6920, width: 190, top: 1230 }, // 8 big-jump pit floor (safe)
    { x: 7110, width: 900, top: 1070 }, // 9 big-jump landing + lookout
    { x: 8150, width: 600, top: 1100 }, // 10 before the log hops (gap 140)
    { x: 8750, width: 960, top: 1240 }, // 11 safe hollow under the logs
    { x: 9710, width: 710, top: 1080 }, // 12 landing meadow after the logs
    { x: 10420, width: 900, top: 850 }, // 13 high ridge (cliff from #12)
    { x: 11320, width: 300, top: 930 }, // 14 terrace step down
    { x: 11620, width: 300, top: 1010 }, // 15 terrace step down
    { x: 11920, width: 1400, top: 1080 }, // 16 finish meadow
  ],

  platforms: [
    // 1. practice
    { x: 560, y: 1020, width: 200 },
    { x: 860, y: 950, width: 200 },
    { x: 1160, y: 1020, width: 180 },
    // 3. climb onto the plateau
    { x: 2900, y: 1030, width: 180 },
    { x: 3150, y: 960, width: 180 },
    // 6. step out of the big-jump pit
    { x: 7020, y: 1150, width: 90 },
    // 7. optional lookout
    { x: 7300, y: 990, width: 160 },
    { x: 7520, y: 915, width: 160 },
    { x: 7300, y: 840, width: 160 },
    { x: 7520, y: 765, width: 160 },
    // 8. log hops + way out of the hollow
    { x: 8880, y: 1060, width: 150 },
    { x: 9130, y: 1020, width: 150 },
    { x: 9380, y: 1060, width: 150 },
    { x: 9570, y: 1160, width: 140 },
    // 9. climb onto the ridge
    { x: 9950, y: 1000, width: 160 },
    { x: 10180, y: 925, width: 160 },
    { x: 10700, y: 770, width: 160 },
    { x: 10950, y: 700, width: 160 },
  ],

  checkpoints: [{ id: 'forest-test-cp1', x: 4560, y: 1100 }],
  finish: { x: 12980, y: 1080 },

  decorations: [
    { kind: 'signArrow', x: 340, y: 1100 },
    { kind: 'signArrow', x: 2780, y: 1100 },
    { kind: 'signCaution', x: 6820, y: 1050 },
    { kind: 'tree', x: 3800, y: 900, scale: 1.25 },
    { kind: 'tree', x: 7700, y: 1070, scale: 1.4 },
    { kind: 'mushroom', x: 7640, y: 765 },
    { kind: 'mushroom', x: 7680, y: 765, scale: 0.8 },
    { kind: 'mushroom', x: 9000, y: 1240 },
    { kind: 'signArrow', x: 9820, y: 1080 },
    { kind: 'tree', x: 11100, y: 850, scale: 1.2 },
    { kind: 'mushroom', x: 11000, y: 700 },
    { kind: 'mushroom', x: 11770, y: 1010, scale: 0.9 },
    { kind: 'mushroom', x: 12700, y: 1080 },
  ],
  scatterOn: [0, 1, 2, 4, 7, 9, 10, 12, 13, 16],
};
