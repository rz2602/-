# Future art requirements (after v0.1.1)

Documentation only. **Nothing here is implemented or generated.** It lists the art that still
needs a proper high-resolution master and the exact sizes, so it can be produced and dropped in
later without code changes. (Rule used everywhere: no texture drawn above ~125 % of its native
size at 2560×1440, i.e. ≥ 1.6 source px per logical px. "Target" sizes below aim at ~100 %
at 1440p = 2 source px per logical px.)

Current measurements: debug mode → `R` (asset scale audit) or click an object (art inspector).
See also `ASSET_RESOLUTION_REPORT.md`.

---

## 1. Legacy terrain and props — status after the Forest Environment Asset Kit

**Done:** grass caps, soil, floating platforms, ravine edges, bridge, fence, sign, lantern,
small props, small plants and foreground vegetation in ForestTestScene now use the
high-resolution kit (see `FOREST_ASSET_INTEGRATION_REPORT.md`).

Still wanted:

| Item | Today | Request |
|---|---|---|
| Main Menu ground (locked) | legacy `terrain_cap` / soil | Only if the menu is ever reopened for changes |
| River band (hidden) | `water_strip` 256×32 | ≥ 1130×142 seamless, only if `RIVER_VISIBLE` returns |
| Foreground leaves | supplied left/right pieces are full-height strips cut on three sides | For use as framing: pieces with natural (uncut) top edges, ~600–900 px tall |

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
| `bg_mountains_sirengrad_master.png` (castle-free part used in gameplay; Sirengrad is now the separate `v2/bg_sirengrad_master`) | 2172×724 | 1204 (0.10) | ~6 (castle-free copies joined on peaks) | **3300–4500 × 1100–1500, mountains only (no castle), transparent above the peaks**, wrap-seamless left/right. |
| `bg_forest_distant_master.png` | 2172×724 | 2408 (0.20) | ~2 | **3300–4500 × 1100–1500**, wrap-seamless left/right, transparent above the treeline. |
| `bg_forest_mid_master.png` | 2172×724 | 4816 (0.40) | ~4 | **3300–4500 × 1100–1500**, wrap-seamless left/right, transparent above the treeline. |

**v2 delivery (`wide.zip`) status:** the sky and Sirengrad are integrated. `bg_mountains`,
`bg_forest_distant` and `bg_forest_mid` were blocked: they are opaque RGB panoramas with the
sky (and mountains) painted in, so they cannot be stacked as independent layers. They are
archived in `art/masters/backgrounds/blocked/`. All five are still 2172 px wide and not
wrap-seamless, so they do not remove the mirror joins.

Keep the same composition rules: transparent PNG (except the sky), same horizon/content band
heights relative to the image (the layout reads `contentBand` from
`production-assets.json`), no baked checkerboard or white background, and no Sirengrad in any
layer: it is its own element (`bg_sirengrad`). When the masters arrive, `MirrorStrip` only needs its mirroring
switched off for wrap-seamless layers.

The forest ground strip uses the same mirror-join technique (inside its full-height slab
columns). A wrap-seamless ground master (left edge continuing into the right) would let it
repeat without mirrored joins.

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
