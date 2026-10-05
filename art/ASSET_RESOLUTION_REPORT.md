# Asset resolution report (v0.1.1 — after the Forest Environment Asset Kit integration)

Measured in-game with the asset scale audit (debug mode, `R`; console table). Rule: no
raster asset above **~125 %** of its native size at **2560×1440** (render scale 2).
`On screen @1080p` = render scale 1.5, `@1440p` = render scale 2, `@4K` = render scale 3.

## Rendering (unchanged, verified)

- Backbuffer = real device pixels (1280×720 / 1920×1080 / 2560×1440 / 2880×1620 on a
  1440×900 @2× display), cameras zoom the logical 1280×720 view (`src/systems/RenderScale.ts`).
- `antialias: true`, `antialiasGL: true`, `pixelArt: false`, `roundPixels: false`; LINEAR filtering.
- Parallax backgrounds are drawn as rows of plain images sampled 1:1 (no TileSprite
  power-of-two resampling). Production art is pre-sized by the pipeline, so it is sampled once.

## Production assets (new) — all within the rule at 1440p

| Asset | Runtime px | Drawn at (logical) | @1080p | @1440p | @4K | Status |
|---|---|---|---|---|---|---|
| `bg_layer_sky` | 2172×724 | 0.60 | 90 % | **120 %** | 180 % | ✅ (4K soft: master limit) |
| `bg_layer_mountains` | 2172×724 | 0.60 | 90 % | **120 %** | 180 % | ✅ (4K soft) |
| `bg_layer_forest_distant` | 2172×724 | 0.60 | 90 % | **120 %** | 180 % | ✅ (4K soft) |
| `bg_layer_forest_mid` | 2172×724 | 0.62 | 93 % | **124 %** | 186 % | ✅ (4K soft) |
| `tree_oak_01` | 897×1344 | 0.41 | 61 % | **81 %** | 122 % | ✅ |
| `tree_oak_02` | 896×1344 | 0.39 | 59 % | **79 %** | 118 % | ✅ |
| `tree_oak_03` | 896×1344 | 0.38 | 56 % | **75 %** | 113 % | ✅ |
| `tree_pine_01` | 833×1248 | 0.39 | 59 % | **79 %** | 118 % | ✅ |
| `tree_ancient_01` | 1536×1024 | 0.39 | 59 % | **78 %** | 117 % | ✅ |
| `waterfall_01` | 1344×756 | 0.40 | 60 % | **80 %** | 120 % | ✅ |
| wordmark (UI) | 1632×526 | 0.42 | 63 % | **83 %** | 125 % | ✅ |
| emblem (UI) | 672×674 | 0.45 | 67 % | **89 %** | 134 % | ✅ |

The four background masters are 2172×724. To stay ≤125 % at 1440p a layer can be at most
~1357 logical px per copy, so long levels need repeated (mirrored) copies — see
"Known limitations". For 4K-native backgrounds the masters would need to be ~3260×1090.

## Wide background set (gameplay)

Sky v2 120 %, mountains v2 120 %, Sirengrad 104 %, distant v2 120 %, mid v2 124 % at 1440p
(all ≤ 125 %). See [WIDE_BACKGROUND_INTEGRATION_REPORT.md](WIDE_BACKGROUND_INTEGRATION_REPORT.md).

## Forest Environment Asset Kit (final integration)

All 40 integrated kit textures are **≤ 108 % at 1440p** (ground strip 90 %, cliffs 84 %,
platforms 66–75 %, bridge 65 %, props/rocks/plants 40–108 %, foreground 64–72 %). The full table
is in **[FOREST_ASSET_INTEGRATION_REPORT.md](FOREST_ASSET_INTEGRATION_REPORT.md)**.

## Still above 125 % at 1440p in gameplay

| Asset | Native | @1440p | Needed for ≤100 % @1440p |
|---|---|---|---|
| ~~Mishkontin atlas frames~~ | 213×195 | 170 % | replaced in gameplay by **Mishkontin V2** (100 % at 1440p); the legacy atlas is used only by the locked Main Menu |

Nothing else in ForestTestScene exceeds 125 % (the new waystone is 77 %, the ground ends and
underground fill 90 %). The legacy kit pieces still drawn by the
**locked Main Menu** (`terrain_cap`, soil, `lantern_post`, `flowers_white`, `mushroom_red`) are
unchanged. The hidden river band (`water_strip`) is not drawn. Specs for the rest:
**[FUTURE_ART_REQUIREMENTS.md](FUTURE_ART_REQUIREMENTS.md)**.

The gameplay background layers (mountains, distant and mid forest) are drawn from colour-graded
copies (`#graded` texture keys, same pixel size, per-pixel colour only); their scale figures
are identical to the originals.

## Reproduce

Run the game with `?debug`, enter the forest, press `R` (console table) or click any object
(art inspector: texture, native/rendered size, scale %, anchor, world position, scroll
factor, physics body).
