# Wide background / parallax integration report (v0.1.1, final background pass)

Baseline: commit `70192be` (clean working tree). Masters are in `art/masters/backgrounds/wide/`.

## 1. Source audit (pixel level)

| Asset | Size | Mode | α = 0 | Corners | Sky in top band | Checkerboard | Class | Content |
|---|---|---|---|---|---|---|---|---|
| `bg_sky_master` | 2172×724 | RGB | — | opaque | yes (expected) | none | **B** | sky, clouds, one sun (right third) |
| `bg_mountains_master` | 2172×724 | RGBA | 59.3 % | 0,0,0,0 | none | none | **A** | snow peaks, foothills, mist; no castle |
| `bg_sirengrad_master` | 2172×724 | RGBA | 53.5 % | 0,0,252,252 (cliff base meets bottom edge, by design) | none | none | **A** | Sirengrad, cliffs, bridges, waterfalls |
| `bg_forest_distant_master` | 2171×724 | RGBA | 54.5 % | 0,0,0,0 | none | none | **A** | forested hills, rocks, mist |
| `bg_forest_mid_master` (supplied as `.png.png`) | 2172×724 | RGBA | 55.3 % | 0,0,0,0 | none | none | **A** | pines, cliffs, 4 waterfalls, mist |

- **Halos:** the share of semi-transparent pixels that are near white is 0.2–1.1 %. These are mist, not a matte, and in game no fringe is visible over the sky.
- **Black fringe:** none.
- **Width:** all masters are still **~2172 px**. "Wide" refers to the layer separation, not to pixel width.
- **Superseded:** the previous delivery of mountains / distant / mid had the sky painted in. It stays archived in `backgrounds/blocked/` and is not built.

## 2. Seam classification

| Layer | Left/right edges | Classification |
|---|---|---|
| Sky | RGB diff 33 at the wrap; opaque | NOT SEAMLESS |
| Mountains | both ends fade to transparent mist | EDGE-COMPATIBLE (overlap) |
| Distant forest | both ends fade to transparent | EDGE-COMPATIBLE (overlap) |
| Mid forest | ends partly opaque (α wrap diff 7.8), silhouette heights match (389 / 386) | EDGE-COMPATIBLE (overlap) |

## 3. Integration decision and repeat strategy

| Master | Runtime | Layer | Scroll | Repeat | @1440p | Status |
|---|---|---|---|---|---|---|
| `bg_sky_master` | `bg_sky_v2.webp` (q95) | 0 Sky | 0.05 | single copy over the whole camera travel (phase keeps the only join on the sun-free left edge, never on screen) | 120 % | INTEGRATED |
| `bg_mountains_master` | `bg_mountains_v2.webp` | 1 Mountains | 0.10 | plain copies overlapping 70 px, **no mirroring**, phase 300 | 120 % | INTEGRATED |
| `bg_sirengrad_master` | `bg_sirengrad.webp` | 1b Sirengrad | 0.10 / 0.05 | **single world object**, never repeated | 104 % | INTEGRATED |
| `bg_forest_distant_master` | `bg_forest_distant_v2.webp` | 2 Distant forest | 0.20 | plain copies overlapping 40 px | 120 % | INTEGRATED |
| `bg_forest_mid_master` | `bg_forest_mid_v2.webp` | 3 Mid forest | 0.40 | plain copies overlapping 36 px; a second, darker, cropped row of the same texture (other phase) continues the forest downward under the mist | 124 % | INTEGRATED |

Why there is no mirroring:
- Mirrored copies of the new art produced symmetric "Rorschach" peaks and doubled waterfalls.
- Plain overlapping copies join inside the faded mist at the ends. Overlap zones were checked
  for darkening (none visible: the ends are mist with low alpha).

Join test (`scratchpad/joins.mjs`, each layer shown alone):
- Distant forest: 2 joins checked (camera 3016 and 9332).
- Mid forest: 2 joins checked (camera 1628 and 3128).
- Mountains: 1 join on screen in the whole level (camera 2740).

All joins are soft. A trained eye can still notice them as a change of composition, but there is
no hard edge, no symmetry and no seam line.

The **Main Menu keeps the approved original layers** (`backgroundSet: 'approved-menu'`). It is
pixel-identical at 720p, 1440p and HiDPI.

## 4. Sirengrad

- **Asset:** `bg_sirengrad`. Shown as one image, 700 logical px wide.
- **Scroll factor:** 0.10 / 0.05, the same as the mountains, and drawn just in front of them.
- **Position:** its keep stands where the castle of the original master stood at the final
  viewpoint (−60 px so the whole city fits). Its base is hidden behind the distant forest.
- **Visibility:** it enters from the right edge around x ≈ 10 700 (ridge) and is fully framed at
  the viewpoint (12 620).
- **Duplicates:** 0. In gameplay there is 1 Sirengrad image and 0 mountain images that contain a
  castle (checked in code and in QA).

## 5. Performance (background textures only)

| | Before (`70192be`) | After |
|---|---|---|
| Background textures loaded | 6 | 9 (the menu still needs the 3 approved originals) |
| Decoded memory | 34 MB | 52 MB |
| Download | 5.9 MB | 9.1 MB |
| FPS in swiftshader (end of level) | 3.0 | 3.0 |

The second mid-forest row is cropped to its lower 45 %, which keeps fill rate at baseline. The
old mountains texture is no longer graded at load in gameplay.

## 6. Regression

| Check | Result |
|---|---|
| Mechanics 1280×720 / 1920×1080 | **18/18 / 18/18** |
| Bot playthrough | **54.7 s, 0 respawns** |
| Real-keyboard smoke | pass |
| QA 1280×720, 1920×1080, 2560×1440, 1440×900 @2× | parallax 0.05 / 0.10 / 0.20 / 0.40 exact, bounds 0…12040, feet on ground, no console errors |
| Main Menu | pixel-identical |

**Test harness note.** Two tests waited a fixed time for a scene change: the 720p "finish → Enter
returns to main menu" check (9 s) and the smoke test's menu → level wait (5 s).
- The fade advances per frame, and software GL runs at ~3 fps, so these became timing-sensitive.
  They now wait for the scene itself, as the 1080p suite already did. The game logic is
  unchanged.
- Instrumented: the transition completes in ~8 s of wall-clock time under swiftshader. The
  frame rate is the same as the baseline.

## 7. Remaining visual debt

- **Joins:** the masters are 2172 px and not wrap-seamless. Repeats are softened but not invisible.
  3300–4500 px wrap-seamless masters would remove them completely.
- **Sky:** no join is visible in gameplay (a single copy covers the camera travel), but at 4K the
  sky is drawn at 180 %.
