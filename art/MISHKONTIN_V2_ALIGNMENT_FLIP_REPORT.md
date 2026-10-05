# Mishkontin V2: run alignment and facing-flip fix

This pass is a technical fix only. No art, physics, collision body, movement, camera or gameplay
changes. Jump, fall and land are not touched (they come after the new run cycle).

## 1. Background (diagnostic)

The run looked choppy at a stable 120 FPS. A browser test settled where it comes from:
- **Frame frozen, moving at 230 px/s:** perfectly smooth. Every display frame moves 1.92 px
  (standard deviation 0.00).
- **Position frozen, run playing:** the head and torso jump at every pose change.

Two causes are technical and fixed here. The rest is in the run artwork, waits for the new run
cycle, and is **not** compensated.

1. **Horizontal anchor.** The build placed every frame by the centre of its fur-coloured pixels.
   Swinging legs and arms are fur too, so each leg swing pushed the whole body the other way.
2. **Facing left.** Without a pivot, Phaser mirrors a flipped frame around the centre of the
   frame image (375 / 2 runtime px), not around the anchor (213 px). Facing left, Mishkontin was
   drawn **25.5 logical px** away from his anchor and collision body, and every turn jumped by
   that much.

## 2. Changes

### `tools/build-mishkontin-v2.mjs` (`BODY_ANCHOR`)
- **Run frames only** are anchored horizontally on the **upper-body centre**: the midpoint of the
  head (pupil) and the torso (gold medallion).
- **Both points are found automatically.** Template matching uses one character reference, idle
  frame 0. The medallion is then searched again with the sheet's own best match, and only in
  the chest area below the head (belt and satchel buckles are gold too).
- **One constant per sheet** (−56.62 runtime px for the run) keeps the run's average placement
  on the physics anchor unchanged.
- **No per-frame manual offsets.** If a frame's head or torso isn't found, it keeps the fur
  centroid and the build prints a warning. All 8 current run frames were found:

  | | Score | Error against hand-measured landmarks |
  |---|---|---|
  | Head | 0.74–0.86 | ≤ 0.7 logical px |
  | Torso | 0.55–1.0 | ≤ 0.8 logical px |
- **Why the midpoint.** The head of the current run art nods about 8 px relative to the chest.
  Locking the torso alone would leave the head jumping up to 6.8 px; the midpoint halves both.
  The weight is `BODY_ANCHOR.headWeight`.
- **Vertical anchoring is unchanged** (feet on the ground, lowest covered row).
- **Idle, crouch, hurt, turn, the personality sheets, jump, fall and land keep their exact
  previous placement.** Atlas JSON frame entries are identical except for the added pivot.
- **Every atlas frame now carries a `pivot` at the shared anchor** (0.568, 0.9538, the same value
  as the origin). Phaser then mirrors around the pivot. This fixes facing left for all V2
  animations at once and changes nothing when facing right.
- **The image is untouched.** `mishkontin-v2.webp` is byte-identical. Only the run frames'
  `spriteSourceSize.x` changed: 68→62, 58→65, 56→48, 63→70, 82→83, 68→63, 60→62, 60→64.
- The source manifest records the policy and every run frame's landmarks, scores and method.

### Runtime: ready for a 12-frame run (`src/entities/mishkontinAnimations.ts`, `Mishkontin.ts`, `constants.ts`)
- **The run animation uses every run frame in the atlas**, whatever their number.
- **`runFps: 14` became `runCycleMs: 8000/14`.** The frame rate is frame count ÷ cycle, so 8 frames
  still play at 14 fps (identical) and 12 frames would play at 21 fps with the same stride timing.
- **`runEntryFrame: 2` / `runAfterLandFrame: 7` became `runEntryPhase: 0.25` / `runAfterLandPhase: 0.875`**
  (fractions of the cycle). They give exactly frames 2 and 7 now. Re-check them with the new art.
- **To integrate a 12-frame run:** replace the `run` entry in `SHEETS` (file, `frames: 12`) and run
  `npm run mishkontin-v2`. The body anchor, pivot, animation and cadence follow automatically.

## 3. Measured result

This is the frozen-position test in the real renderer at 120 Hz, with landmarks measured in the
rendered pixels. Values are in logical px; multiply by 1.5 for 1080p screen px and by 2 for 1440p.

| | Before | After |
|---|---|---|
| Head horizontal jitter, max per pose change | 8.6 | **3.1** |
| Head horizontal jitter, RMS | 5.9 | **2.2** |
| Torso horizontal jitter, max | 9.0 | **4.1** |
| Torso horizontal jitter, RMS | 5.2 | **2.6** |
| Facing-left offset from a true mirror | 25.5–26.0 | **0.7** (pixel-edge measurement) |
| Head / torso vertical jumps (art, not changed) | 16.9 / 13.2 | 17.0 / 13.0 |
| Moving at 230 px/s | 1.92 px per frame, standard deviation 0.00 | unchanged |
| Run timing at 120 Hz | 8/9 display frames per pose | unchanged |

Per transition, head x:
- Before: −7.4, +5.4, −8.6, +6.0, +1.4, −1.1, −3.8, +8.1
- After: −0.7, −2.2, −1.0, +2.8, −1.6, +2.3, −2.7, +3.1

Torso x:
- Before: −5.7, +9.0, −6.2, −0.1, +5.0, −5.6, +2.4, +1.2
- After: +1.1, +1.5, +1.4, −3.2, +1.9, −2.1, +3.5, −4.1

**Transitions into and out of the run:**
- Land → run: head and torso within 3.3 px both before and after.
- Idle → run and run → idle: about 20 px head and about 10 px torso both before and after (on
  average). That is the run's forward lean against the upright idle; it is part of the art.

**Tradeoff.** The feet are now what moves relative to the body. The worst ground-contact slip per
transition goes from 82.8 to 90.3 px. The contact foot already jumped 33–66 px per frame in the
art, which is uneven foot placement and needs the new run cycle.

## 4. Not changed / still open (artwork)
- **Run vertical jumps** (frame 03→04: head drops 17 px), staff discontinuities (03 nearly hidden,
  a second staff end in 04/06), tail shape changes and the irregular step rhythm. These need the
  new 12-frame run cycle.
- **Jump, fall and land** are unchanged. Landing from the fall pose (jump 4) to the squash (land 3)
  drops the head 79 px in one frame.
- **The legacy atlas** (Main Menu, `USE_MISHKONTIN_V2 = false`) is unchanged and has no pivot.
