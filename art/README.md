# Art sources (not shipped)

Nothing under `art/` is loaded by the game or copied to `dist/`.

| Folder | Contents |
|---|---|
| `masters/` | **Production master art** (v0.1.1 Ultra Detail pass). Never edited. `masters/MANIFEST.json` lists every file with its original supplied name, role and SHA-256. |
| `masters/environment/` | **Forest Environment Asset Kit** masters (terrain/ground, platforms, cliffs; bridges; rocks; vegetation; props; foreground). (The once-blocked ground right edge was replaced by a real-alpha re-export.) See `FOREST_ASSET_INTEGRATION_REPORT.md`. |
| `masters/backgrounds/wide/` | Final separated background set (sky, mountains, Sirengrad, distant, mid). See `WIDE_BACKGROUND_INTEGRATION_REPORT.md`. |
| `masters/branding/` | Official wordmark and emblem masters + `RUNTIME.json` (runtime copy provenance). |
| `masters/characters/mishkontin_v2/` | **Mishkontin V2 animation set** (gameplay character) + `CHARACTER_V2_MANIFEST.json`. See `MISHKONTIN_V2_INTEGRATION_REPORT.md`. |
| `masters/characters/` | High-resolution Mishkontin **key poses — reference / future animation source only**, not used in gameplay (see below). |
| `masters/backgrounds/superseded/` | Opaque panorama replaced by the independent layers; kept for provenance, unused. |
| `reference/` | Reference-only images: canonical Mishkontin design sheet, forest composition reference, forest art direction. Never runtime assets. |
| `source/` | Forest Environment Kit v1 (input of the legacy `tools/extract-forest-kit.mjs`). |

## Pipelines

- `npm run production-assets` → `tools/build-production-assets.mjs`: verifies master
  checksums, alpha cleanup on runtime copies only (alpha ≥ 240 → 255, alpha < 4 → 0), sizes
  each asset to its maximum display size × 2.4, encodes (lossless WebP for alpha art, verified
  pixel-identical on visible pixels; q95 WebP for the opaque sky; PNG for brand assets),
  measures **normalized** anchors and writes `public/assets/production-assets.json`.
- `npm run forest-kit` → legacy kit pieces (`public/assets/environments/forest/`); its manifest
  now also carries `anchorsNormalized`.
- `npm run atlas` → Mishkontin legacy gameplay atlas (unchanged).

## Mishkontin canon

`reference/mishkontin_canonical_design_reference.png` defines the character, with the
confirmed decisions: **gold "M" medallion/clasp**, **plain carved wooden staff — no glowing
orb, crystal, vines or leaves**.

The supplied key poses (`masters/characters/`) are single images, not animations, and are
**not** used in gameplay. Canon conflicts:

| Pose | Conflict |
|---|---|
| idle_01, run_01, turn_01 | glowing amber orb + leaves on the staff |
| jump_01, fall_01, land_01, hurt_01 | glowing orb staff **and** baked checkerboard background (no alpha) |

The gameplay keeps the legacy multi-frame atlas until a real high-resolution animation set
exists.

## IP note

The kit's sign/waystone/banner and the forest composition reference contain a
Mickey-Mouse-head symbol (third-party trademark). It is removed from the legacy pieces and must
never be used or reintroduced.

## Replacing art

Production art: drop a new master into `art/masters/...`, update its checksum in
`MANIFEST.json`, run `npm run production-assets`. World size is set in logical px (tree
`height`, layer scales), so a different resolution does not move or resize anything.
See `ASSET_RESOLUTION_REPORT.md` for what still needs higher-resolution art.
