# v0.1.1 Ultra Detail production integration — report

## A. Masters integrated (`art/masters/`, byte-identical, SHA-256 in `MANIFEST.json`)

| Master | Supplied as | Size | Alpha |
|---|---|---|---|
| backgrounds/bg_sky_master.png | BACKGROUNDS/bg_sky_master.png | 2172×724 | opaque (by design) |
| backgrounds/bg_mountains_sirengrad_master.png | bg_mountains_sirengrad.png (final transparent re-export) | 2172×724 | **true alpha** (58 % transparent, soft mist) |
| backgrounds/bg_forest_distant_master.png | BACKGROUNDS/bg_forest_distant_master.png | 2172×724 | **true alpha** |
| backgrounds/bg_forest_mid_master.png | bg_forest_mid_master.png (final transparent re-export) | 2172×724 | **true alpha** |
| trees/tree_oak_01_master.png | Majestic Sunlit Enchanted Tree.png | 1024×1535 | true alpha |
| trees/tree_oak_02_master.png | tree_large_03_master.png | 1024×1536 | true alpha |
| trees/tree_oak_03_master.png | tree_medium_master.png (approved: 3rd large oak) | 1024×1536 | true alpha |
| trees/tree_pine_01_master.png | Golden-Lit Evergreen Tree Asset.png | 1024×1535 | true alpha |
| trees/tree_ancient_01_master.png | tree_ancient_platform_master.png | 1536×1024 | true alpha |
| water/waterfall_large_master.png | waterfall_large_master.png | 1672×941 | true alpha |
| branding/mishkontin-wordmark-master.png | (same) | 2159×728 | true alpha |
| branding/mishkontin-emblem-master.png | (same) | 1254×1254 | true alpha |
| characters/*.png (7 key poses) | MISHKONTIN/* | 1254–1536 px | 3 true alpha, 4 **baked checkerboard** |
| backgrounds/superseded/bg_mountains_forest_distant_master.png | (same) | 2172×724 | opaque — unused |

## B. Runtime assets created (`npm run production-assets`)

| Key | Runtime file | Runtime px | Size | Encoding |
|---|---|---|---|---|
| bg_layer_sky | assets/backgrounds/bg_sky.webp | 2172×724 | 397 KB | WebP q95 (PSNR 39.4 dB, opaque) |
| bg_layer_mountains | assets/backgrounds/bg_mountains_sirengrad.webp | 2172×724 | 1089 KB | lossless WebP |
| bg_layer_forest_distant | assets/backgrounds/bg_forest_distant.webp | 2172×724 | 1403 KB | lossless WebP |
| bg_layer_forest_mid | assets/backgrounds/bg_forest_mid.webp | 2172×724 | 1724 KB | lossless WebP |
| tree_oak_01/02/03 | assets/trees/tree_oak_0N.webp | ~896×1344 | 1.6–1.8 MB | lossless WebP |
| tree_pine_01 | assets/trees/tree_pine_01.webp | 833×1248 | 1172 KB | lossless WebP |
| tree_ancient_01 | assets/trees/tree_ancient_01.webp | 1536×1024 | 2133 KB | lossless WebP |
| waterfall_01 | assets/water/waterfall_01.webp | 1344×756 | 1513 KB | lossless WebP |
| brand wordmark | assets/ui/branding/mishkontin-wordmark.png | 1632×526 | 678 KB | PNG |
| brand emblem | assets/ui/branding/mishkontin-emblem.png | 672×674 | 575 KB | PNG |

Runtime copies only: alpha ≥ 240 → 255, alpha < 4 → 0; brand assets trimmed to their content
(+1 % margin), never otherwise altered.

## C. Legacy assets replaced (no longer loaded)

`bg_sky`, `bg_mountains`, `bg_forest_distant`, `bg_forest_mid` → the four production layers ·
`tree_large_01` → tree_oak_01 · `tree_large_02` → tree_oak_02/03 · `pine_tree` → tree_pine_01 ·
`waterfall_large` + `water_fall_band` (scrolling overlay) → waterfall_01 (static) · typed menu
title "МИШКОНТИН" → official wordmark · text loading bar → emblem boot screen. Legacy files stay
in the repo (not deleted), only unloaded.

## D. Legacy assets still used (no replacement supplied)

Terrain caps / soil / ravines, one-way platforms, rope bridge, river band, small plants,
flowers, rocks, props (sign, lantern, fence, crate, barrel, cart), waystone, foreground leaves,
slender `tree_medium` (kept as instructed), menu button, Mishkontin gameplay atlas. Collision
and behaviour unchanged.

## E. Mishkontin animation status

| State | Source | Frames | Source res | Runtime | Status |
|---|---|---|---|---|---|
| idle (+blink/wink variants) | legacy atlas | 4 (+3, +4) | 213×195 cells | 0.85× | LEGACY |
| run | legacy atlas | 9 | 213×195 | 0.85× | LEGACY |
| jump / fall / land | legacy atlas | 3 / 4 / 5 | 213×195 | 0.85× | LEGACY |
| crouch | legacy atlas | 2 + 4 hold | 213×195 | 0.85× | LEGACY |
| hurt | legacy atlas | 5 | 213×195 | 0.85× | LEGACY |
| turn | legacy atlas (registered, unused in gameplay) | 6 | 213×195 | — | LEGACY |
| blink | legacy idle variant | 3 | 213×195 | 0.85× | LEGACY |
| wave, read_map, sit, sleep, surprised | — | 0 | — | — | not available (no art) |

No state is HIGH-RES READY or PARTIAL. The key-pose masters are single images and conflict with
canon (see `art/README.md`). Atlas renders at 128 % (1080p) / 170 % (1440p).

## F. Parallax

| Layer | Asset | Scroll X / Y | Rendered (logical) | Native | @1440p |
|---|---|---|---|---|---|
| 0 Sky | bg_layer_sky | 0.05 / 0.02 | 1303×434 per copy | 2172×724 | 120 % |
| 1 Mountains + Sirengrad | bg_layer_mountains | 0.10 / 0.05 | 1187×434 (+466-wide castle-free copies) | 2172×724 | 120 % |
| 2 Distant forest | bg_layer_forest_distant | 0.20 / 0.10 | 1303×434 per copy | 2172×724 | 120 % |
| 3 Mid forest | bg_layer_forest_mid | 0.40 / 0.20 | 1347×449 per copy | 2172×724 | 124 % |
| 4 Gameplay (+4b back trees 0.85) | terrain, trees, Mishkontin | 1.00 | — | — | — |
| 5 Foreground | legacy leaves | 1.12 | — | — | 320 % (legacy) |

Measured over a 600 px camera move: sky 0.050, mountains 0.100, distant 0.200, mid 0.400. ✅
Repeating layers alternate normal/mirrored copies so every join matches pixel-for-pixel.

**Sirengrad appears exactly once:** one `full` mountain image (with the castle) is placed so the
city is in view at the final viewpoint; leftwards, only the castle-free part (source columns
194–970, joined on mountain peaks) is repeated. Verified in-scene: 1 castle image, 4 castle-free
copies, 0 other uses.

## G. Anchors

| Asset | Old (legacy) | New (measured on new art) | Normalized | Alignment |
|---|---|---|---|---|
| tree_oak_01 (was tree_large_01) | bottom-centre + 3 px sink, scale 2.4 | ground contact (437, 1322) of 897×1344 | (0.4872, 0.9836) | mound base on terrain top ✅ |
| tree_oak_02 (was tree_large_02) | bottom-centre + sink | (463, 1317) of 896×1344 | (0.5162, 0.9799) | ✅ |
| tree_oak_03 | — (new) | (527, 1334) of 896×1344 | (0.5887, 0.9926) | ✅ |
| tree_pine_01 (was pine_tree) | bottom-centre + sink | (436, 1229) of 833×1248 | (0.5234, 0.9848) | ✅ |
| tree_ancient_01 | — (new, decorative) | (748, 999) of 1536×1024 | (0.4873, 0.9756) | ✅ |
| waterfall_01 (was waterfall_large) | `fallA/fallB/pool` px anchors of the old art | pool ground contact (773, 751) of 1344×756 | (0.5751, 0.9934) | same world position and width (~475 / ~535 px) ✅ |
| background layers | screen y offsets | content-band top measured per layer | e.g. mid 0.4392 | layer bands placed by logical y ✅ |

- World size is defined in **logical px** (tree `height`, layer scale), not texture px, so it is
  independent of resolution. Old tree world heights were preserved (e.g. tree_large_01 at
  scale 2.4 ≈ 545 px → tree_oak_01 height 545).
- Legacy kit anchors (terrain walk line, bridge deck, lantern light, waystone glyph) are
  unchanged and now also stored as `anchorsNormalized` (kit PNGs verified byte-identical).
- Collision geometry untouched. Mishkontin foot contact: feet y = ground top y at 720p,
  1080p, 1440p and HiDPI; body bottom = 1100 = terrain top. ✅

## H. Transparency

- True alpha: mountains+Sirengrad (final), forest distant, forest mid (final), 5 trees,
  waterfall, wordmark, emblem, idle/run/turn poses. No grey/checker fringe (≤ 3 % neutral
  edge pixels; mountains' 33 % neutral edge = intentional white mist).
- Opaque by design: sky.
- **Baked checkerboard (not used):** jump_01, fall_01, land_01, hurt_01 poses.
- Superseded earlier versions of the mountains and mid forest had baked checkerboard /
  opaque white backgrounds; they were never integrated.

## I. Resolution — see `ASSET_RESOLUTION_REPORT.md`

All production assets ≤ 125 % at 1440p. Still above: legacy kit art and the Mishkontin atlas.

## J. Branding

| | Wordmark | Emblem |
|---|---|---|
| Master | 2159×728, true alpha | 1254×1254, true alpha |
| Runtime | 1632×526 PNG (trimmed to content) | 672×674 PNG (trimmed) |
| Display | 680×219 logical (max 680×220 box) | 300×300 logical |
| Max rendered | 1360×438 device px @1440p (83 %) | 600×600 @1440p (89 %) |
| Where | Main Menu title, screen-space, scroll 0 | Boot/Loading, screen-space |

Main Menu: wordmark → "И КРАЛЯТ ПЛЪХ МОРТИС" → ИГРАЙ → НАСТРОЙКИ over the forest; no typed
"Мишконтин" anywhere (checked); 300 px side margins, 34 px top, no overlap with buttons;
aspect ratio 3.1027 at every resolution. Boot: #0b140e, emblem fades in (450 ms), thin
progress line only if loading > 600 ms, minimum ~1.3 s, any key/click skips once loaded,
fade to menu. Not in `forest-assets.json` or `production-assets.json`.

## K. Performance

- Texture memory (all textures, uncompressed RGBA): **~104 MB** (production art ~62 MB,
  Mishkontin atlas 7 MB). Acceptable on desktop GPUs; candidate for later reduction (atlasing,
  half-resolution set for render scale ≤ 1.5).
- Download: production art ~17 MB (lossless WebP), `dist/` 21 MB; single-file HTML 25 MB.
- Draw: ~4–5 quads per background layer; no per-frame allocations added.
- FPS could not be measured meaningfully (headless software renderer); needs a check on real
  hardware.

## L. Regression

18/18 gameplay checks at 1280×720 and 1920×1080 (coyote time, jump buffer, variable jump,
one-way platforms, walls, pit/water respawn, checkpoint + save + resume, all animation states,
no animation restarts, idle variants, debug toggle, finish + return to menu), bot
playthrough finishes with **0 respawns in 54.7 s (identical to before)**, real-keyboard smoke
test (run, jump, crouch, hurt, pause/resume), settings round trip, camera bounds (0 … 12040),
single-file build from disk. No console errors at any resolution.

## Known limitations / visual review

1. **Mirror joins are visible** in repeating layers: symmetric clouds in the sky (one join,
   placed on the sun-free edge so there is never a second sun) and symmetric pine groups in the
   distant/mid forest. Not hidden by blur or distortion; wider wrap-seamless masters are
   specified in `FUTURE_ART_REQUIREMENTS.md` §2.
2. Legacy art next to the new art is clearly softer: terrain caps, soil, ravine walls, bridge,
   fence, sign, small props, foreground leaves (`FUTURE_ART_REQUIREMENTS.md` §1).
3. ~~The river band at the bottom of gaps shows as a small blue rectangle~~ (fixed in the
   final polish pass: river hidden, ravine walls run below the screen).
4. Mishkontin is soft at 1440p+ (atlas at 170 %); future animation set:
   `FUTURE_ART_REQUIREMENTS.md` §3.
5. ~~Sun shafts too strong in gameplay~~ (final polish: 0.22 in gameplay, 0.55 in the menu,
   `SUN_SHAFTS` in `src/config/constants.ts`).

## Final visual polish pass

Visual only. Gameplay, physics, collision, camera, checkpoints and respawn are unchanged
(18/18 checks at 1280×720 and 1920×1080; bot 54.7 s, 0 respawns, identical; real-keyboard
smoke test; 1440p QA: parallax factors, single Sirengrad, camera bounds unchanged; Main Menu
pixel-identical to the approved capture).

| # | Change | Where |
|---|---|---|
| 1 | River band, deep-water plane and splash particles hidden (`RIVER_VISIBLE = false`; code kept). Ravine walls now run below the world bottom and sit in front of the back decoration, so waterfall pools end behind the wall top instead of showing a flat-cut image edge. The water kill line (`RespawnController.killYFor`), `WaterSplash` event and respawn are untouched. | `constants.ts`, `ForestWater.ts`, `TerrainRenderer.ts`, `forestLayers.ts` (`ForestDepth.ravine` −45 → −30) |
| 2 | Both slender legacy `tree_medium` instances replaced: x 2150 → `tree_oak_02` (height 435, flipped), x 5900 → `tree_oak_01` (height 420, flipped). Decorative, no collision. | `forestTestLevel.ts` |
| 3 | Per-layer grading (no blur): sky unchanged; mountains + Sirengrad saturation −10 %, contrast −8 %, brightness +2 %; distant forest −16 % / −12 % / +3 %; mid forest −5 % / −4 %; gameplay and Mishkontin untouched. A graded copy of each layer texture is made once at load (same size, per-pixel colour only, identical sampling). Gameplay only; the menu passes `grading: false`. | `BACKGROUND_GRADING` in `constants.ts`, `ForestBackdrop.ts` |
| 4 | Gameplay sun shafts 0.55 → 0.22 (40 %); menu keeps 0.55. | `SUN_SHAFTS` in `constants.ts`, `menuBackdrop.ts` |
| 5–7 | Documented: legacy terrain/prop replacements, mirror-join source masters (3300–4500 px, wrap-seamless), Mishkontin high-res animation milestone. No art generated. | `art/FUTURE_ART_REQUIREMENTS.md` |
| 8–9 | End-screen Sirengrad composition and Main Menu left as approved. | — |
