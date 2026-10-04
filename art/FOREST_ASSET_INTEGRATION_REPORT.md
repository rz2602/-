# Forest Environment Asset Kit — integration report (v0.1.1)

The supplied high-resolution Forest Environment Asset Kit replaces the low-resolution kit art in
ForestTestScene. This is visual only: collision, camera, checkpoints, respawn, Mishkontin, the
Main Menu and the end screen are unchanged.

## 1. Supplied files and transparency audit

There are 8 ZIPs (ground, platform, cliffs, bridge, rocks, vegetation, props, foreground).
Together they hold **52 PNGs**; `__MACOSX` / `.DS_Store` files were ignored. Every PNG was
inspected at pixel level for:
- mode and the alpha channel
- min/max alpha and the share of alpha < 255 and = 0
- 16×16 corner alpha
- opaque border pixels checked for white, black, green or checkerboard backgrounds

| Class | Count | Files |
|---|---|---|
| A — true transparent | 48 | all except the four below |
| A after inspection (audit flagged D) | 3 | `foreground_branch`, `foreground_leaves_left`, `foreground_leaves_right`: real alpha (~50 % fully transparent), opaque corners only because the foliage deliberately runs off the canvas edge (edge-framing pieces) |
| B — opaque but valid | 0 | — |
| **C — baked background (BLOCKED)** | **1** | **`terrain_ground_right_edge_master.png`**: RGB mode, no alpha channel, checkerboard baked into the pixels (95.6 % of border pixels are light grey checker squares) |
| Reference only | 1 | `terrain_sheet.png`: low-resolution overview sheet of the ground kit, stored as `art/reference/terrain_sheet_reference.png` and not used as a runtime source |

No background was removed, keyed or "cleaned". `tools/build-production-assets.mjs` re-checks
every environment master at build time (`verifyRealAlpha`): no alpha channel, almost no
transparent pixels, or opaque corners on a non-edge piece stops the build.

**Blocked:** `terrain_ground_right_edge_master.png` is stored in
`art/masters/environment/blocked/` and is not integrated. Integration did not depend on it: the
ground strip ends on the natural rounded ends of `terrain_ground_long_master` (see below).

## 2. Organisation and integrity

- **Masters** (byte-identical copies, never modified) live under
  `art/masters/environment/{terrain/{ground,platforms,cliffs},bridges,rocks,vegetation,props,foreground,blocked}`.
  Each has a SHA-256, original ZIP path, size, mode and audit class in `art/masters/MANIFEST.json`.
- **Renames** (cleanup of supplied names only):
  - trailing spaces removed: `terrain_cliff_right_master .png`, `bridge_rope_long_master .png`, `foreground_fern_right_master .png`
  - `..png` → `.png`: `rock_medium_02_master..png`, `prop_fallen_log_master..png`
  - `foreground_leaves_right_master.png.png` → `.png`
  - `Floating Fantasy Grass Platform.png` → `terrain_platform_long_master.png` (it is the long platform)
  - `bridge_post_master.png` was correctly named.
- **Runtime** copies are in `public/assets/environment/...`. They are lossless WebP, checked to be
  pixel-identical on visible pixels, and sized to max display × 2.4. Masters are never
  overwritten.

## 3. Integrated assets

`@1440p` is the largest on-screen magnification at 2560×1440, measured in game. The limit is
125 %. Anchors are normalized (0..1). Geometry values were read off gridded inspections of the
masters and are stored normalized in `production-assets.json`. None of these assets has
collision.

| Runtime key | Source master | Master | Runtime | @1440p | Size | Anchor / geometry |
|---|---|---|---|---|---|---|
| `env_ground_long` | `terrain_ground_long_master.png` | 2172×724 | 2172×724 | 90 % | 1400 KB | walkY (grass surface) 0.463, mirror-tile columns 0.078–0.925, slab extent |
| `env_cliff_left` | `terrain_cliff_left_master.png` | 1024×1536 | 1024×1536 | 84 % | 1298 KB | walkY, rock face x |
| `env_cliff_right` | `terrain_cliff_right_master.png` | 1024×1536 | 1024×1536 | 84 % | 1236 KB | walkY, rock face x |
| `env_cliff_wall` | `terrain_cliff_wall_master.png` | 1024×1536 | 1024×1536 | 84 % | 1290 KB | full-width row |
| `env_platform_long` | `terrain_platform_long_master.png` | 2172×724 | 600×200 | 75 % | 166 KB | walkY, slab |
| `env_platform_medium` | `terrain_platform_medium_master.png` | 1774×887 | 576×288 | 73 % | 232 KB | walkY, slab |
| `env_platform_small` | `terrain_platform_small_master.png` | 1536×1024 | 528×352 | 69 % | 250 KB | walkY, slab |
| `env_platform_tiny` | `terrain_platform_tiny_master.png` | 1536×1024 | 360×240 | 66 % | 130 KB | walkY, slab |
| `env_bridge_rope_medium` | `bridge_rope_medium_master.png` | 1942×809 | 768×320 | 65 % | 255 KB | deck at posts / centre, post x |
| `env_bridge_post` | `bridge_post_master.png` | 1024×1536 | 208×312 | 64 % | 102 KB | ground contact |
| `env_rock_large_01/02` | `rock_large_0x_master.png` | 1317×1194 | 397×360 | 67 / 61 % | 211 / 233 KB | ground contact |
| `env_rock_medium_01/02` | `rock_medium_0x_master.png` | 1317×1194 | 265×240 | 58 / 52 % | ~100 KB | ground contact |
| `env_rock_small_01/02` | `rock_small_0x_master.png` | 1317×1194 | 185×168 | 48 % | ~54 KB | ground contact |
| `env_rock_cluster_01` | `rock_cluster_01_master.png` | 1536×1024 | 396×264 | 55 % | 159 KB | ground contact |
| `env_bush_01/02` | `vegetation_bush_0x_master.png` | 1317×1194 / 1536×1024 | 265×240 / 360×240 | 100 / 108 % | ~110 KB | ground contact |
| `env_fern_01/02` | `vegetation_fern_0x_master.png` | 1317×1194 | 265×240 | 55 % | ~90 KB | ground contact |
| `env_grass_01/02` | `vegetation_grass_0x_master.png` | 1536×1024 | 252×168 | 43 % | ~68 KB | ground contact |
| `env_flowers_01/02` | `vegetation_flowers_0x_master.png` | 1536×1024 | 252×168 | 40 % | 77 KB | ground contact |
| `env_mushrooms_01` | `vegetation_mushrooms_01_master.png` | 1536×1024 | 252×168 | 48 % | 73 KB | ground contact |
| `env_vines_01` | `vegetation_vines_01_master.png` | 1536×1024 | 576×384 | 47 % | 281 KB | hangs from a ledge (top edge) |
| `env_signpost` | `prop_signpost_master.png` | 1222×1287 | 387×408 | 66 % | 161 KB | ground contact, lantern light point (glow) |
| `env_lantern_post` | `prop_lantern_post_master.png` | 1024×1536 | 336×504 | 69 % | 177 KB | ground contact, lantern light point (glow) |
| `env_fence_01/02` | `prop_wood_fence_0x_master.png` | 1774×887 | 432×216 | 59 % | ~140 KB | ground contact |
| `env_tree_stump` | `prop_tree_stump_master.png` | 1536×1024 | 324×216 | 59 % | 105 KB | ground contact |
| `env_fallen_log` | `prop_fallen_log_master.png` | 1774×887 | 480×240 | 58 % | 171 KB | ground contact |
| `env_wood_crate` | `prop_wood_crate_master.png` | 1536×1024 | 288×192 | 65 % | 80 KB | ground contact |
| `env_barrel` | `prop_barrel_master.png` | 1312×1199 | 210×192 | 62 % | 68 KB | ground contact |
| `env_fg_fern_left/right` | `foreground_fern_*_master.png` | 1536×1024 | 972×648 | 72 / 64 % | ~700 KB | bottom contact, foreground 1.12 |
| `env_fg_grass_cluster_01` | `foreground_grass_cluster_01_master.png` | 1536×1024 | 720×480 | 72 % | 411 KB | bottom contact, foreground |
| `env_fg_flower_cluster_01` | `foreground_flower_cluster_01_master.png` | 1536×1024 | 720×480 | 72 % | 470 KB | bottom contact, foreground |
| `env_fg_branch` | `foreground_branch_master.png` | 1774×887 | 1488×744 | 68 % | 923 KB | top-left corner, pinned to the screen top |

Every asset is ≤ 125 % at 2560×1440, and most are well below 100 %. Nothing was upscaled or
sharpened.

### Masters archived but not placed in this level

These are not built for runtime and add no download. They are kept for later levels.

| Master | Why not placed |
|---|---|
| `terrain_ground_left_edge_master` | Its matching right edge is BLOCKED. A one-sided edge would be inconsistent, so the long strip's natural rounded ends are used on both sides. |
| `terrain_cliff_bottom_left/right_master` | Cliff bases are below the camera's lowest view (`cameraBottom`) everywhere in this level. |
| `bridge_rope_long_master` | The level's one bridge gap is 140 px. The medium span fits it with no stretching. |
| `bridge_entrance_left/right_master` | At bridge scale they would stand over the banks' walking surface right where Mishkontin steps onto the bridge (readability rule). Posts + rope span are used. |
| `bridge_broken_master` | No broken-bridge location exists in the level, and none was invented. |
| `foreground_leaves_left/right_master` | Full-height frame strips cut on **three** canvas edges (top, bottom, screen side). At full screen height they cover ~70 % of the view. At any smaller size their straight cut edge shows. |

## 4. How the art meets the (unchanged) collision

`src/levels/forest/TerrainRenderer.ts` positions every piece **from** the collision rectangles.
Physics was never moved to fit the art.

- **Ground strip:** `terrain_ground_long`, with its measured grass surface (walkY) exactly on
  each block's collision top.
  - Longer blocks are drawn as a "tape" that runs forward and back through the slab's
    full-height columns, so every direction change is a mirror join. The joins are
    pixel-continuous, with no seam and no stretching.
  - The tape always starts and ends on the artwork's natural rounded ends.
  - It is deterministic, with no random placement.
- **Cliff columns:** at every exposed block edge (beside a gap, or higher than the
  neighbouring block), the rock column of `terrain_cliff_left/right` is drawn with its rock
  face on the collision edge. Its grass cap is cropped away and tucked under the ground strip,
  so the grass lip marks the gameplay edge exactly.
- **Rock pillars:** narrow islands (both edges exposed, < 470 px) stand on a single
  `terrain_cliff_wall` pillar.
- **Ravines and pits:** every gap and every enclosed pit has a darker, cooler far
  `terrain_cliff_wall` behind the terrain. Wide hollows get an overlapping row of walls,
  alternately mirrored. This replaces the old flat soil walls and the flat backdrop band.
- **Earth below the strip:** a smooth warm-to-deep earth gradient. It has no texture, so
  nothing is magnified.
- **Platforms:** art is chosen by collision width:
  - long ≥ 190 px
  - medium ≥ 170 px
  - small ≥ 130 px
  - tiny below that

  Each is scaled so its slab matches the width (+8 px overhang), with the grass surface on the
  collision top. Neighbouring platforms alternate orientation.
- **Bridge:** two `bridge_post` props on the banks, plus the medium rope span between them. The
  artwork's deck sags while the collision is flat, so the deck is balanced around the collision
  line (ends slightly above it, centre slightly below).

Measured: Mishkontin's feet sit at the collision top at every resolution (QA `feetY ==
groundTopY`).

## 5. Composition

The decoration list in `src/levels/forestTestLevel.ts` was re-authored with the kit:
- clusters (rock + fern + grass + flowers) rather than single repeated bushes
- the signpost at the start, a lantern post at the bridge and at the viewpoint
- the only crate and barrel together at the "traveller's rest" before the big jump
- fences at the bridge exit and the viewpoint
- logs and stumps as landmarks
- the checkpoint clearing kept open around the waystone

Scattered small plants now use the kit grass, flowers and mushrooms, deterministic and
sparser. Production lanterns get a soft warm glow at their measured light point.

Foreground (scroll 1.12) is used sparingly:
- start: branch from the top-left corner (pinned to the screen top) and a fern bottom-left
- checkpoint exit: fern right
- gap series: fern left
- lookout: flower cluster
- ridge: grass cluster
- viewpoint: flower cluster bottom-right

Edge-cut pieces are only placed where the camera cannot scroll past them, so their cut edge
never enters the screen. Nothing covers Mishkontin at any of the 33 sweep positions, nor
Sirengrad.

## 6. Legacy forest assets still in use

| Key | Where | Why it remains |
|---|---|---|
| `waystone` | checkpoint | No replacement was supplied. The glyph is code-drawn. |
| `terrain_cap`, `terrain_fill` (→ `fx-soil`), `lantern_post`, `flowers_white`, `mushroom_red` | Main Menu ground and props | The Main Menu is locked (pixel-identical requirement). |
| `water_strip` | code path behind `RIVER_VISIBLE = false` | Hidden. Kept so the river can return later. |
| Mishkontin atlas | player | Locked (separate future milestone). |

All other legacy kit textures are superseded and no longer loaded. Their files stay on disk:
nothing was deleted (cleanup rule).

## 7. Performance

| | Before | After |
|---|---|---|
| Textures loaded | 67 | 57 |
| Decoded texture memory (approx.) | 53 MB | 99 MB |
| Runtime image download | 15.1 MB | 26.7 MB |
| Single-file HTML | 25.2 MB | ~41 MB |

The increase is the high-resolution terrain (ground strip and three cliff textures ≈ 4 × 4–6 MB
decoded), sized for ≤ 100 % at 1440p. Small props are only ~0.2 MB each. Browser JS heap
measured in QA: 145 MB. FPS under swiftshader is not meaningful, and the deterministic bot
timing is unchanged.

## 8. Regression

| Check | Result |
|---|---|
| Mechanics 1280×720 | **18/18** |
| Mechanics 1920×1080 | **18/18** |
| Bot playthrough | finished, **54.7 s, 0 respawns** (identical to before) |
| Real-keyboard smoke (run, jump, crouch, pause/resume) | pass |
| QA 1280×720 / 1920×1080 / 2560×1440 / 1440×900 @2× | backbuffer = device px, parallax 0.05 / 0.10 / 0.20 / 0.40 exact, Sirengrad once, camera bounds 0…12040, feet on ground, no console errors |
| Main Menu | pixel-identical to the approved capture (720p, 1440p, HiDPI) |
| End screen | unchanged ("Приключението тепърва започва...", "Мишконтин — v0.1.1") |
| Single-file build from disk | runs, no errors |

Collision geometry, checkpoints, respawn lines, end trigger and level bounds were not edited:
`terrain`, `platforms`, `checkpoints`, `finish`, `width/height/cameraBottom/waterSurfaceY` in
the level data are untouched.
