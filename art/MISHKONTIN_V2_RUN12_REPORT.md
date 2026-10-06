# Mishkontin V2: 12-frame run master integration

## 1. Source
`art/masters/characters/mishkontin_v2/run/mishkontin_run_v2_12frames_master.webp` is
byte-identical to the supplied file. Its SHA-256 is in `art/masters/MANIFEST.json`. A wrongly
supplied first image was never committed; this master replaced it.

| Property | Value |
|---|---|
| Size | 2000 × 667 px, 183 KB |
| Format | **Lossy WebP, RGB, no alpha** |
| Background | Opaque black |
| Labels | Numbered circles 1–12 |
| Layout | 2 rows × 6 frames, in the supplied order 01 → 12 |

**Resolution.** The ear-size scale (the same rule as every other sheet) is 0.866, so the frames
are downsampled with Lanczos. No upscaling.

The old 8-frame master stays in the masters folder, unchanged; the build no longer uses it.

## 2. Extraction (`tools/build-mishkontin-v2.mjs`, deterministic)

**Labels.** The character rows are the bands y 52–338 and 380–667. The labels (y 12–51 and
340–379) lie outside them, so no character pixel is touched.

**Background (`matteBlackBackground`)** is removed in five steps:
1. **Border-connected black.** Near-black pixels (max channel ≤ 14, which covers the compression
   noise) connected to the border are background.
2. **Enclosed dark areas.** Each one is classified by measurement:
   - **Gaps** between staff, arm and legs become background: pure black, mean ≤ 6.5, inside lit
     edges with a ring median ≥ 30, at least 100 px.
   - **Cloak and satchel shadow** is kept: mean 8–11, in a dark shading gradient.
   - **Pupils** are kept.
3. **Specks.** Small dark specks that touch the background are removed.
4. **Edge alpha.** Edge pixels within 2 px get alpha = brightness relative to the solid colour 3–4 px
   inside, and their colour is un-blended. There is no dark fringe.
5. **Thin structures** with no solid core nearby (whiskers drawn dark over the black) are
   un-blended by their own brightness. They read as faint whiskers instead of black scribbles.

**Frames.** Each row is cut into 6 frames by minimum-cost seams, with 0 opaque pixels crossed.

## 3. Alignment

### Horizontal
- **What it locks on.** The anchor is the upper-body centre: the midpoint of the head (pupil) and
  the torso (gold medallion on the chest).
- **How the points are found.** Automatically by template matching, first against idle frame 0,
  then against the run sheet's own best match. Scores: eye 0.94–1.00, medallion 0.80–1.00. All 12
  frames were found.
- **Not used.** Legs, tail, cloak flaps, staff and ears.
- **No per-frame manual offsets.**
- **Centred on the anchor.** The upper-body centre IS the anchor. That point is the mirror axis
  for flipX and the centre of the collision body, so head and torso stay over the physics body
  facing either way.

### Vertical
- **Row ground line.** Each master row was drawn on one ground line, and the flight poses (frames
  02, 04, 07, 08, 10, 11) lift both feet 3–5 px above it. All frames of a row share that line
  (`ground: 'band'`).
- **Why not each frame's own lowest foot.** That would pull the flight poses down and add head bob.

### Facing
Atlas frames carry a pivot at the anchor, so Phaser mirrors around it. The 25.5 px facing-left
offset is gone. The collision body is unchanged.

## 4. The run cycle in the art
- **The legs step.** Front-foot reaches (02, 04, 07, 08, 10, 11) alternate with touchdowns (01, 03,
  09, 12), and there is a passing pose with the feet together (05–06).
- **The front foot touches down at almost the same place each time** (10–18 px behind the anchor)
  and does not sweep back during stance. The drawn stride, rear to front foot, is about 80 logical
  px.
- **Foot slip.** At 230 px/s the feet slip at any frame rate; the art's stance is too short for this
  speed. It is much less visible than in a still pose, because the legs keep moving.

## 5. Cadence (12 / 15 / 18 fps at 230 px/s)

| fps | Distance per step (2 steps per cycle) | Display frames per pose at 120 Hz |
|---|---|---|
| 12 | 115 px: overstrides the ~80 px drawn stride, feet slide visibly | 10 |
| **15** | **92 px: closest to the drawn stride** | **8, even (4 at 60 Hz)** |
| 18 | 77 px: also close | 6.67, uneven (6/7), and the steps turn into a frantic patter |

**Chosen: 15 fps** (`runCycleMs = 12000 / 15`).
- Velocity-aware cadence is unchanged (rate = speed ratio, minimum 0.6).
- The animation phase is kept while running and is never restarted on update.

**Entry frames** (as fractions of the cycle):
- 4/12, frame 05: the closest silhouette to idle.
- 3/12, frame 04: the closest to the landing recovery pose.

## 6. Measurements (120 Hz, real renderer, landmarks measured in rendered pixels, logical px)

| C: world position frozen, run playing | Old 8-frame (before alignment) | New 12-frame |
|---|---|---|
| Head, max horizontal / vertical jump per pose change | 8.6 / 16.9 | **0.8 / 3.0** |
| Head RMS horizontal / vertical | 5.9 / – | 0.4 / 1.4 |
| Torso, max horizontal / vertical | 9.0 / 13.2 | **0.6 / 2.3** |
| Hips (body centre 22–37 px below the medallion, includes the thighs), max horizontal / vertical | – | 12.4 / 1.7 (moves with the stride) |
| Foot baseline, max change | 0.7 | 4.7 (flight poses, by design) |
| Loop seam 12 → 01 | head +8 / −4 (8 → 1) | head −0.4 / −3.0, torso −0.1 / −1.2 |

The predicted positions match the rendered ones within 0.82 screen px.

**B — moving at 230 px/s with the frame frozen:** 1.92 px per display frame, standard deviation
0.00.

**A — normal running:** inside a pose the head moves 1.92 px per frame (standard deviation 0.03).
At pose changes it moves 1.1–2.8 px; before, it was −6.8 to +9.7 px with backward jumps.

**Turning while running (right → left → right)** was measured on the real player every 120 Hz
frame:
- The whole-outline centre is −29.8 px from the body running right and +30.0 px running left, an
  exact mirror. There is no 25.5 px teleport.
- At a turn the head moves 4.6 px and the torso 11.4 px relative to the physics body, including its
  existing 1.7 px nudge towards the facing side. The trailing tail, cloak and rear leg mirror to the
  other side.

**Transitions into and out of the run** (logical px). The other animations keep their current,
unmodified placement:

| Transition | Head | Torso |
|---|---|---|
| idle ↔ run | 8 | 18.5 |
| jump ↔ run | about 14.5 | — |
| land ↔ run | 28 | 26.5 |

Applying the same body anchor to idle, jump, fall and land in their pass removes these offsets.

## 7. Files changed

| File | Change |
|---|---|
| `art/masters/characters/mishkontin_v2/run/mishkontin_run_v2_12frames_master.webp` | new master (copy) |
| `art/masters/MANIFEST.json` | its checksum |
| `tools/build-mishkontin-v2.mjs` | black-background matte, character bands, row ground line, multi-row sheets, `maxUpscale` guard, eye and medallion found with the sheet's own templates, upper body centred on the anchor |
| `public/assets/characters/mishkontin/v2/mishkontin-v2.{webp,json}`, `mishkontin-v2-manifest.json` | rebuilt: 81 frames, cell 383×368, anchor 221,351 |
| `art/masters/characters/mishkontin_v2/CHARACTER_V2_MANIFEST.json` | build record |
| `src/config/constants.ts` | `runCycleMs` 12000/15, entry phases 4/12 and 3/12 |

All other frames keep exactly the same placement relative to the anchor. Physics, collision,
camera, level, menu and adaptive resolution are untouched.

## 8. Performance

| | Before | After |
|---|---|---|
| Atlas | 4044×1674, 6.40 MB | 3988×1666, 6.54 MB WebP |
| Frames | 77 | 81 |
| Texture pages | 1 | 1 |

There is no extra per-frame work.

## 9. Remaining visual issues
1. **Foot slip at 230 px/s.** The art's planted foot does not sweep back (§4).
2. **Frame 11 has a purple tint on the head and ears** in the master itself.
3. **Placement pops** into and out of the run until idle, jump, fall and land use the same anchor
   (§6).
4. **Staff head.** The run's staff has a spiral-carved head; the other sheets have a plain knob.
5. **Lossy source.** WebP compression noise, and the whiskers next to the staff are drawn dark.
