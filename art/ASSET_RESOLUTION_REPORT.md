# Asset resolution report (v0.1.1 high-resolution pass)

Generated from the in-game **asset scale audit** (debug mode, `R`), which measures how much
every raster texture is magnified on screen. Rule: **no environment asset above ~125% of its
native size** at the target displays. Upscaling low-resolution art is not an acceptable fix;
these assets must be **replaced** with higher-resolution source art.

## Rendering status (fixed in code)

| Check | Before | Now |
|---|---|---|
| Canvas backbuffer vs display | fixed 1280x720, stretched by CSS (1.5x at 1080p, 2x at 1440p) | sized to the real device pixels: 1920x1080 at 1080p, 2560x1440 at 1440p, 2880x1620 on a 1440x900 @2x laptop (max 3x) |
| Texture filtering | LINEAR (`antialias: true`, `pixelArt: false`, `roundPixels: false`) | unchanged, verified; no NEAREST anywhere |
| Text | rasterised at 1x | rasterised at the render scale |
| Tiled textures | non-power-of-two tiles were stretched to POT by Phaser (extra resampling) | tiles are exact POT sizes; wide strips are drawn 1:1 as image rows |
| UI button texture | 1x | drawn at 3x, displayed at 1/3 |

After these fixes the art is sampled exactly once, from its source texture to the screen. The
remaining softness comes only from the **source resolution** listed below.

## How to read the table

- **Drawn at (logical)**: texture pixels to logical (1280x720) pixels.
- **On screen @1080p / @1440p**: real magnification at render scale 1.5 / 2. Anything above
  125% is soft and needs replacement.
- **Min. source for 1440p**: pixel size at which the largest use is shown at <= 100% on a
  2560x1440 display.
- **Preferred source (4K)**: the same for 3840x2160, in line with the art brief's "about 2x the
  maximum display size".
- **Priority**: P1 >= 400% (most visible), P2 250-399%, P3 < 250%.

## Replacement list (all 54 measured textures exceed the limit)

| Priority | Asset | Folder | Native px | Drawn at (logical) | On screen @1080p | On screen @1440p | Min. source for 1440p | Preferred source (4K) |
|---|---|---|---|---|---|---|---|---|
| P1 | `bg_mountains` | background | 418×77 | 3.2× | 480% | 640% | 2676×493 | 4013×740 |
| P1 | `bg_forest_mid` | background | 906×91 | 3.2× | 480% | 640% | 5799×583 | 8698×874 |
| P1 | `bg_sky` | background | 886×48 | 3× | 450% | 600% | 5316×288 | 7974×432 |
| P1 | `bg_forest_distant` | background | 866×88 | 3× | 450% | 600% | 5196×528 | 7794×792 |
| P1 | `waterfall_large` | water | 198×113 | 2.7× | 405% | 540% | 1070×611 | 1604×916 |
| P1 | `water_fall_band` | water | 32×32 | 2.7× | 405% | 540% | 173×173 | 260×260 |
| P1 | `tree_large_02` | trees | 181×220 | 2.4× | 360% | 480% | 869×1056 | 1304×1584 |
| P1 | `tree_large_01` | trees | 266×227 | 2.4× | 360% | 480% | 1277×1090 | 1916×1635 |
| P1 | `water_strip` | water | 256×32 | 2.21× | 332% | 442% | 1132×142 | 1698×213 |
| P1 | `pine_tree` | trees | 99×224 | 2.2× | 330% | 440% | 436×986 | 654×1479 |
| P1 | `tree_medium` | trees | 101×207 | 2.1× | 315% | 420% | 425×870 | 637×1305 |
| P2 | `lantern_post` | props | 84×117 | 1.6× | 240% | 320% | 269×375 | 404×562 |
| P2 | `fg_leaves_left` | foreground | 192×104 | 1.6× | 240% | 320% | 615×333 | 922×500 |
| P2 | `fg_trunk_right` | foreground | 192×104 | 1.6× | 240% | 320% | 615×333 | 922×500 |
| P2 | `fg_leaves_blur` | foreground | 150×104 | 1.6× | 240% | 320% | 480×333 | 720×500 |
| P2 | `fence_post` | props | 42×35 | 1.5× | 225% | 300% | 126×105 | 189×158 |
| P2 | `wooden_fence` | props | 72×48 | 1.5× | 225% | 300% | 216×144 | 324×216 |
| P2 | `rock_large` | rocks | 113×75 | 1.4× | 210% | 280% | 317×210 | 475×315 |
| P2 | `fallen_log` | rocks | 121×55 | 1.4× | 210% | 280% | 339×154 | 509×231 |
| P2 | `terrain_cap` | terrain | 256×64 | 1.35× | 203% | 270% | 692×173 | 1037×260 |
| P2 | `terrain_cap_left` | terrain | 40×60 | 1.35× | 203% | 270% | 108×162 | 162×243 |
| P2 | `terrain_cap_right` | terrain | 40×60 | 1.35× | 203% | 270% | 108×162 | 162×243 |
| P2 | `flowers_purple` | plants | 32×38 | 1.35× | 203% | 270% | 87×103 | 130×154 |
| P2 | `grass_patch` | plants | 57×28 | 1.35× | 203% | 270% | 154×76 | 231×114 |
| P2 | `rope_bridge` | props | 198×83 | 1.34× | 201% | 268% | 532×223 | 797×334 |
| P2 | `plant_small` | plants | 43×27 | 1.34× | 201% | 268% | 116×73 | 174×109 |
| P2 | `flowers_pink_02` | plants | 31×42 | 1.33× | 200% | 266% | 83×112 | 124×168 |
| P2 | `flowers_blue` | plants | 27×36 | 1.33× | 200% | 265% | 72×96 | 108×144 |
| P2 | `grass_tuft_02` | plants | 50×29 | 1.32× | 198% | 264% | 133×77 | 199×115 |
| P2 | `tree_stump` | rocks | 67×45 | 1.3× | 195% | 260% | 175×117 | 262×176 |
| P2 | `mushroom_red` | plants | 52×47 | 1.3× | 195% | 260% | 136×123 | 203×184 |
| P2 | `flowers_white` | plants | 45×41 | 1.3× | 195% | 260% | 117×107 | 176×160 |
| P2 | `flowers_pink` | plants | 42×43 | 1.3× | 195% | 260% | 110×112 | 164×168 |
| P2 | `bush_01` | plants | 83×35 | 1.3× | 195% | 260% | 216×91 | 324×137 |
| P2 | `bush_wide` | plants | 139×53 | 1.3× | 195% | 260% | 362×138 | 543×207 |
| P2 | `rocks_pair` | rocks | 70×41 | 1.3× | 195% | 260% | 182×107 | 273×160 |
| P2 | `grass_tall` | plants | 46×40 | 1.3× | 195% | 260% | 120×104 | 180×156 |
| P2 | `rock_mossy` | rocks | 80×44 | 1.3× | 195% | 260% | 208×115 | 312×172 |
| P2 | `bush_02` | plants | 72×47 | 1.3× | 195% | 260% | 188×123 | 281×184 |
| P2 | `mushroom_orange` | plants | 34×40 | 1.3× | 195% | 260% | 89×104 | 133×156 |
| P2 | `fern` | plants | 61×42 | 1.3× | 195% | 260% | 159×110 | 238×164 |
| P2 | `rock_small` | rocks | 50×41 | 1.3× | 195% | 260% | 130×107 | 195×160 |
| P2 | `rock_medium` | rocks | 62×42 | 1.3× | 195% | 260% | 162×110 | 242×164 |
| P2 | `bush_blue` | plants | 55×44 | 1.3× | 195% | 260% | 143×115 | 215×172 |
| P2 | `mushroom_small` | plants | 25×30 | 1.3× | 195% | 260% | 65×78 | 98×117 |
| P2 | `barrel` | props | 46×50 | 1.3× | 195% | 260% | 120×130 | 180×195 |
| P2 | `wooden_cart` | props | 121×53 | 1.3× | 195% | 260% | 315×138 | 472×207 |
| P2 | `grass_tuft` | plants | 47×31 | 1.3× | 195% | 260% | 123×81 | 184×121 |
| P2 | `bush_03` | plants | 72×59 | 1.3× | 195% | 260% | 188×154 | 281×231 |
| P2 | `wooden_crate` | props | 78×62 | 1.25× | 188% | 250% | 195×155 | 293×233 |
| P2 | `wooden_crate_small` | props | 39×40 | 1.25× | 188% | 250% | 98×100 | 147×150 |
| P3 | `wooden_sign` | props | 95×110 | 1.15× | 173% | 230% | 219×253 | 328×380 |
| P3 | `waystone` | props | 163×161 | 1.15× | 173% | 230% | 375×371 | 563×556 |
| P3 | `mishkontin` | characters | 213×195 | 0.85× | 128% | 170% | 363×332 | 544×498 |
Also replace:

- `fx-soil` is generated at load by stamping patches of the 110x40 kit soil sample into a 256x256
  tile, drawn at 1.35x (270% at 1440p). Needed: a painted, seamless **512x512** (1440p) or
  **1024x1024** (4K) soil/rock tile with stones, roots and pebbles.
- **Terrain caps** (`terrain_cap*`) should come as a seamless grass edge with individual blades,
  clover and small flowers, and its **walk line** marked (currently `walkY` anchor).

## Mishkontin

The character frames are 213x195 cells (the mouse itself is about 150 px tall) drawn at
0.85x: **128% at 1080p, 170% at 1440p, 255% at 4K**. He is therefore visibly soft at 1440p and
above. Following the brief, the atlas was **not** artificially sharpened. For a crisp result,
supply a master sprite set with frames about **2x the current size** (cells about 430x390, mouse
about 300 px tall) for 1440p, or about 3x for 4K. `tools/build-mishkontin-atlas.mjs` accepts a
new sheet, but a production sheet should be a clean grid or separate frames.

## Production guidance

- Paint at the "preferred source (4K)" size, then export a 1440p-target version, or ship both and
  choose by render scale.
- Large background layers: wide **seamless** strips about 4096-5120 px wide (sky, distant forest,
  mid forest), plus a mountains + Sirengrad panorama at about 3840x800.
- Hero trees: 1000-1400 px tall. Props: 300-500 px. Small flowers/tufts: 100-200 px.
- Keep the anchors in `public/assets/environments/forest/forest-assets.json` correct (scale them
  with the image).
- Distant layers may be softer and lower-contrast **by design**, but must still be clean
  illustrations, not enlarged pixels.
- Keep tiled textures at power-of-two sizes (256, 512, 1024, ...).
- Reproduce this report: run the game with `?debug`, press `R` in the forest level (console
  table), or see the `runAssetAudit()` method of `DebugOverlay`.
