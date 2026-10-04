# Future art requirements (after v0.1.1)

Documentation only. **Nothing here is implemented or generated.** It lists the art that still
needs a proper high-resolution master and the exact sizes, so it can be produced and dropped in
later without code changes. (Rule used everywhere: no texture drawn above ~125 % of its native
size at 2560×1440, i.e. ≥ 1.6 source px per logical px. "Target" sizes below aim at ~100 %
at 1440p = 2 source px per logical px.)

Current measurements: debug mode → `R` (asset scale audit) or click an object (art inspector).
See also `ASSET_RESOLUTION_REPORT.md`.

---

## 1. Legacy terrain and props that need high-resolution replacements

All of these are cut from the Forest Environment Kit v1 (`tools/extract-forest-kit.mjs`) and
are drawn at roughly 230–440 % at 1440p. They are visibly softer than the production trees,
backgrounds and waterfall. Keys are the texture keys in
`public/assets/environments/forest/forest-assets.json`; world sizes stay the same.

| Group | Keys (in use) | Native px | Drawn at (logical) | Target master (≈2× logical) | Notes |
|---|---|---|---|---|---|
| **Grass caps** (ground walk line) | `terrain_cap` | 256×64 | ×1.35 | **≥ 704×176**, horizontally seamless | Walk line must stay at the same normalized height (`anchorsNormalized.walkY`). |
| Grass cap ends | `terrain_cap_left`, `terrain_cap_right` | 40×60 | ×1.35 | ≥ 110×165 | Must join the cap tile seamlessly. |
| **Soil** (terrain fill) | `fx-soil` (synthesised at load from the kit soil sample) | 256×256 tile | ×1.35 | **1024×1024** painted seamless tile (tiles in x and y) | Replaces the synthesised texture; tint `FILL_TINT` can then go to white. |
| **Floating / one-way platforms** | drawn with `terrain_cap` at ×1.0 | 256×64 | ×1.0 | ≥ 512×128 seamless + underside piece ~512×160 | Currently a cap strip only; an underside (roots/stone) would read better. |
| **Ravine edges** (walls inside gaps) | `fx-soil` tinted `RAVINE_TINT` + `fx-shade-down` | 256×256 | ×1.35 | 1024×1024 darker cliff-face tile + left/right lip pieces ~160×512 | Today a tinted soil wall with a straight top; a proper cliff lip would soften the top edge. |
| **Bridge** | `rope_bridge` (one image scaled to the bridge span) | 198×83 | ×~1.35 | **≥ 540×225** | Collision is a flat platform; keep the deck anchors (`deckLeft`/`deckRight`) on the walk line. |
| **Fence** | `wooden_fence`, `fence_post` | 72×48, 42×35 | ×~1.5 | ≥ 216×144, ≥ 126×105 | |
| **Sign** | `wooden_sign` | 95×110 | ×~1.2 | ≥ 230×265 | No third-party symbols (see `README.md` IP note). |
| Lantern | `lantern_post` | 84×117 | ×~1.6 | ≥ 270×375 | |
| Checkpoint waystone | `waystone` (via `WaystoneVisual`) | 163×161 | ×~1.15 | ≥ 375×370 | Keep the clean, symbol-free face (the glyph is drawn by code). |
| **Small props** | `wooden_crate`, `wooden_crate_small`, `barrel`, `wooden_cart`, `rock_large`, `rock_medium`, `rock_small`, `rock_mossy`, `rocks_pair`, `fallen_log`, `tree_stump` | 39–121 px | ×1.2–1.4 | ~2.6–2.8× native each | |
| Small plants | `bush_01/02/03`, `bush_blue`, `bush_wide`, `grass_tall`, `grass_patch`, `grass_tuft`, `fern`, `mushroom_red/orange/small`, `flowers_white/blue/pink/pink_02/purple` | 25–139 px | ×1.2–1.4 | ~2.6–2.8× native each | One sheet of separate transparent PNGs is fine. |
| **Foreground vegetation** | `fg_leaves_left`, `fg_leaves_blur`, `fg_trunk_right` | 150–192×104 | ×~1.6 | **≥ 615×333** | Foreground layer (scroll 1.12). |
| River band (hidden in v0.1.1) | `water_strip` | 256×32 | ×1.7 | ≥ 1130×142 seamless | Only needed if `RIVER_VISIBLE` is turned back on. |

The slender legacy tree `tree_medium` is **no longer placed** (v0.1.1 polish replaced both
instances with production oaks). It stays in the kit manifest and is not needed again.

---

## 2. Mirror joins: source assets that need wider, seamless masters

Repeating background layers are drawn as rows of the master at 1:1 sampling, alternating
normal and mirrored copies (`MirrorStrip` in `src/levels/forest/ForestBackdrop.ts`). The
mirror joins show as symmetric shapes (clouds, pine groups). No blur, warp or code trick
is used to hide them; the real fix is wider masters whose **right edge continues into
their left edge** (horizontally wrap-seamless), so copies can repeat without mirroring.

| Master (`art/masters/backgrounds/`) | Now | Layer travel over the level (logical px) | Joins in a playthrough | Requested master |
|---|---|---|---|---|
| `bg_sky_master.png` (opaque) | 2172×724 | 602 (scroll 0.05) | 1, kept on the sun-free left edge | **3300–3600 × 1100–1200**, wrap-seamless left/right, sun not at an edge. ≥ 3011 px covers the whole level without any join. |
| `bg_mountains_sirengrad_master.png` | 2172×724 | 1204 (0.10) | 4 (castle-free filler copies joined on peaks) | **≥ 4000 × 1300**, Sirengrad once near the right third, the castle-free range continuing compatibly to both edges (or: one wrap-seamless castle-free range 3300–4500 px + a separate Sirengrad landmark piece). |
| `bg_forest_distant_master.png` | 2172×724 | 2408 (0.20) | ~2 | **3300–4500 × 1100–1500**, wrap-seamless left/right, transparent above the treeline. |
| `bg_forest_mid_master.png` | 2172×724 | 4816 (0.40) | ~4 | **3300–4500 × 1100–1500**, wrap-seamless left/right, transparent above the treeline. |

Keep the same composition rules: transparent PNG (except the sky), same horizon/content band
heights relative to the image (the layout reads `contentBand` from
`production-assets.json`), no baked checkerboard or white background, and no Sirengrad in any
layer except the mountains. When the masters arrive, `MirrorStrip` only needs its mirroring
switched off for wrap-seamless layers.

Legacy repeating textures with the same issue (tile edges rather than mirrors): `terrain_cap`
and `fx-soil` (see section 1, both must be seamless).

---

## 3. Mishkontin high-resolution animation set (future milestone)

Not part of v0.1.1. The legacy gameplay atlas (213×195 frames, drawn at 170 % at
1440p) is **unchanged** and must not be replaced with single poses or interpolated frames.

Milestone deliverable: a complete multi-frame animation set, drawn to the canonical design
(`art/reference/mishkontin_canonical_design_reference.png`: **gold "M" medallion**, **plain
carved wooden staff, no orb, crystal, vines or leaves**), transparent background, consistent
foot line and scale across all frames.

| Animation | Frames (current atlas) | Notes |
|---|---|---|
| IDLE | loop + blink/wink variants | |
| RUN | full cycle | footstep sync points welcome |
| JUMP, FALL, LAND | as now | dedicated apex / fall-to-land frames optional |
| CROUCH | as now | |
| HURT | as now | |
| TURN | as now | fix the two-hands staff frame (TURN 4) |

Frame size: **~363×332 px** per frame for ≤ 100 % at 1440p (2× current), ~545×500 for 4K.
The body/foot anchor must stay at the same normalized position, so the collision body and
`MISHKONTIN` constants keep working unchanged. The existing key poses in
`art/masters/characters/` are reference only (they conflict with the canon staff and some
have baked backgrounds).
