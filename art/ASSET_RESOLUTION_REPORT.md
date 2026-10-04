# Asset resolution report (v0.1.1 — after the Ultra Detail production integration)

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

## Still above 125 % at 1440p (legacy art, no replacement supplied)

| Asset | Native | @1440p | Needed for ≤100 % @1440p |
|---|---|---|---|
| Mishkontin atlas frames | 213×195 | **170 %** | ~363×332 per frame (master sprite set) |
| `water_strip` (river band) | 256×32 | 442 % | ~1132×142 seamless |
| `tree_medium` (slender legacy tree) | 101×207 | 420 % | ~425×870 |
| `lantern_post` | 84×117 | 320 % | ~269×375 |
| foreground leaves/trunk (3) | ~190×104 | 320 % | ~615×333 |
| `wooden_fence`, `fence_post` | 72×48, 42×35 | 300 % | ~216×144 |
| `rock_large`, `fallen_log` | 113×75, 121×55 | 280 % | ~316×210 |
| terrain caps (`terrain_cap*`) | 256×64 | 270 % | 512×128 seamless (+ end caps) |
| `rope_bridge` | 198×83 | 268 % | ~531×222 |
| small plants, flowers, rocks, props (~25) | 25–140 px | 250–270 % | ~2.6× current |
| `wooden_sign`, `waystone` | 95×110, 163×161 | 230 % | ~219×253, ~375×370 |
| `fx-soil` (synthesised soil tile) | 256×256 | 270 % | 512×512 / 1024×1024 painted tile |

Total at 2560×1440: **45 of 55 measured textures** are still over 125 %; all are legacy
kit art or the Mishkontin atlas. None are upscaled or sharpened — they are flagged.

## Reproduce

Run the game with `?debug`, enter the forest, press `R` (console table) or click any object
(art inspector: texture, native/rendered size, scale %, anchor, world position, scroll
factor, physics body).
